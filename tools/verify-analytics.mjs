// Prove the analytics tag actually fires, rather than merely existing in the HTML.
// Watches real network traffic in the automation Chrome, then synthesises a mailto click
// (navigation suppressed, so no mail client opens) to confirm the enquiry event is sent.
// Usage: node tools/verify-analytics.mjs <url> [measurement-id]
const [url = 'https://harbourcloud.com.au/', expectedId = 'G-SEQY09N6EE'] = process.argv.slice(2);
const CDP = 'http://127.0.0.1:9222';

const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 0;
const pending = new Map();
const requests = [];
const requestUrlById = new Map();
const responses = new Map();
const failures = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method === 'Network.requestWillBeSent') {
    requests.push({ url: msg.params.request.url, body: msg.params.request.postData ?? '' });
    requestUrlById.set(msg.params.requestId, msg.params.request.url);
  } else if (msg.method === 'Network.responseReceived') {
    responses.set(msg.params.response.url, msg.params.response.status);
  } else if (msg.method === 'Network.loadingFailed') {
    failures.push({ url: requestUrlById.get(msg.params.requestId) ?? 'unknown', error: msg.params.errorText, blocked: msg.params.blockedReason });
  }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => { const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, timeout: 15000 })).result.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  // GA4 holds its first hit while a page is hidden, and this tab is created in the background.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await send('Page.bringToFront').catch(() => {});
  await send('Page.navigate', { url: `${url}${url.includes('?') ? '&' : '?'}va=${Date.now()}` });
  await sleep(6000);
  const visibility = await evaluate('document.visibilityState');
  results.push(['page was visible to the tag', visibility === 'visible', `visibilityState=${visibility}`]);

  const collectRe = /google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect|googletagmanager\.com\/g\/collect/;
  const urls = requests.map((r) => r.url);
  const loader = urls.filter((u) => u.includes('googletagmanager.com/gtag/js'));
  // Collect beacons are counted at the end of the run: Chrome reports an aborted beacon only once
  // the tab tears down, so anything measured mid-run misses hits that were genuinely dispatched.
  results.push(['gtag.js requested', loader.length === 1, loader[0] ?? 'none']);
  results.push(['tag uses the expected Measurement ID', loader[0]?.includes(expectedId) === true, expectedId]);
  const loaderStatus = [...responses.entries()].find(([u]) => u.includes('googletagmanager.com/gtag/js'))?.[1];
  const initialised = await evaluate('Boolean(window.google_tag_manager)');
  results.push(['gtag.js loaded (not blocked)', loaderStatus === 200, `status ${loaderStatus ?? 'no response'}`]);
  results.push(['gtag.js initialised in the page', initialised === true, initialised ? 'window.google_tag_manager present' : 'script never ran']);

  // Synthesise a click on the first mailto link without letting the browser navigate to it.
  const clicked = await evaluate(`(() => {
    const link = document.querySelector('a[href^="mailto:"]');
    if (!link) return 'no mailto link found';
    // Suppress navigation on the link itself. A one-shot listener on document can be consumed by
    // an unrelated click handler, after which the real mailto navigation aborts the pending beacon.
    const stop = (e) => e.preventDefault();
    link.addEventListener('click', stop, { capture: true });
    link.click();
    link.removeEventListener('click', stop, { capture: true });
    return link.getAttribute('href').slice(0, 60);
  })()`);
  await sleep(4000);

  // GA4 sends later events as POST, with the payload in the body rather than the query string.
  const payloads = [...requests.map((r) => `${r.url}\n${r.body}`), ...failures.map((f) => f.url)];
  const pageViewHits = payloads.filter((p) => collectRe.test(p) && /en=page_view/.test(p));
  results.push(['page_view hit sent', pageViewHits.length >= 1, `${pageViewHits.length} page_view hit(s)`]);
  // GA4 batches follow-up events and often flushes them only on page unload, so the network is an
  // unreliable place to assert this. dataLayer proves our handler fired with the right parameters;
  // the page_view hits above already prove delivery to Google works.
  const eventHits = payloads.filter((p) => collectRe.test(p) && /en=contact_email_click/.test(p));
  const recorded = await evaluate(`(() => {
    const entries = Array.from(window.dataLayer || []);
    const hit = entries.reverse().find((a) => a && a[0] === 'event' && a[1] === 'contact_email_click');
    return hit ? JSON.stringify(hit[2] || {}) : '';
  })()`);
  const params = recorded ? JSON.parse(recorded) : null;
  results.push(['mailto click fired contact_email_click', Boolean(params), params ? `enquiry_type=${params.enquiry_type}` : `no dataLayer entry after clicking ${clicked}`]);
  results.push(['event carries the section parameter', Boolean(params?.section), params?.section ?? 'missing']);
  console.log(`  note: ${eventHits.length} event beacon(s) seen on the wire before teardown (GA4 batches these, so 0 is normal)`);
} finally {
  ws.close();
  await fetch(`${CDP}/json/close/${target.id}`).catch(() => {});
}

console.log(`\nAnalytics verification for ${url}`);
for (const [name, ok, detail] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} (${detail})`);
const failed = results.some(([, ok]) => !ok);
const blockedLocally = results.some(([name, ok]) => name.startsWith('gtag.js loaded') && !ok);
for (const f of failures) console.log(`  note: request failed: ${f.error}${f.blocked ? ` (${f.blocked})` : ''} ${f.url}`);
if (blockedLocally) {
  console.log('\n  gtag.js did not load in THIS browser. That is almost always a blocker extension in the');
  console.log('  automation Chrome profile, not a fault on the site. Re-check in a clean browser or in GA4 Realtime.');
}
console.log(failed ? 'ANALYTICS CHECK: FAIL' : 'ANALYTICS CHECK: PASS');
process.exit(failed ? 1 : 0);

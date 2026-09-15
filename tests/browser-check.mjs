// Real-browser smoke test against a deployed URL, via the automation Chrome's CDP port.
// Opens its own tab and closes only that tab; never touches the rest of the browser.
// Usage: node tests/browser-check.mjs <url> <screenshot-dir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [url = 'https://dev123.harbourcloud.com.au/', outDir = '.browser-check'] = process.argv.slice(2);
const CDP = 'http://127.0.0.1:9222';
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method) listeners.forEach((fn) => fn(msg));
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++nextId;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, timeout: 15000 })).result.value;

const errors = [];
listeners.push((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(`exception: ${m.params.exceptionDetails.text} ${m.params.exceptionDetails.exception?.description ?? ''}`);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`log: ${m.params.entry.text} ${m.params.entry.url ?? ''}`);
  if (m.method === 'Network.loadingFailed' && !m.params.canceled) errors.push(`network: ${m.params.errorText} (${m.params.type})`);
});

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];
const report = { url, viewports: [] };

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  for (const vp of VIEWPORTS) {
    errors.length = 0;
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    const loaded = new Promise((res) => listeners.push((m) => m.method === 'Page.loadEventFired' && res()));
    await send('Page.navigate', { url: `${url}${url.includes('?') ? '&' : '?'}bc=${Date.now()}` });
    await Promise.race([loaded, sleep(20000)]);
    await sleep(1500);

    await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }).then((s) =>
      writeFileSync(join(outDir, `${vp.name}-hero.jpg`), Buffer.from(s.data, 'base64')));

    // Bring each fade-up into view and give it time to reveal. The check runs in a background
    // tab where Chrome throttles rendering, so a quick scroll-through can miss sections.
    await evaluate(`(async () => {
      for (const el of document.querySelectorAll('.fade-up')) {
        el.scrollIntoView({ block: 'center' });
        for (let t = 0; t < 30 && !el.classList.contains('visible'); t++) await new Promise(r => setTimeout(r, 100));
      }
      scrollTo(0, 0);
    })()`);
    await sleep(800);

    const checks = await evaluate(`(() => {
      const text = document.body.innerText;
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText.replace(/\\s+/g, ' '),
        h1Count: document.querySelectorAll('h1').length,
        hasAiSection: !!document.getElementById('ai'),
        forbiddenText: (text.match(/AI Tokens?|Qwen|\\$\\d|discount|wholesale|pricing/gi) || []),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        scrollWidth: document.documentElement.scrollWidth,
        brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
        hiddenFadeUps: [...document.querySelectorAll('.fade-up')].filter(e => !e.classList.contains('visible'))
          .map(e => (e.closest('section')?.id ?? '?') + ' .' + [...e.classList].join('.') + ' top=' + Math.round(e.getBoundingClientRect().top + scrollY) + ' h=' + Math.round(e.getBoundingClientRect().height)),
        jsonLdValid: [...document.querySelectorAll('script[type="application/ld+json"]')].every(s => { try { JSON.parse(s.textContent); return true; } catch { return false; } }),
        navVisible: getComputedStyle(document.querySelector('.nav-links')).display !== 'none',
        hamburgerVisible: getComputedStyle(document.getElementById('hamburger')).display !== 'none',
      };
    })()`);

    if (vp.mobile) {
      checks.mobileMenuOpens = await evaluate(`(async () => {
        document.getElementById('hamburger').click();
        await new Promise(r => setTimeout(r, 400));
        const open = getComputedStyle(document.getElementById('mobileMenu')).display !== 'none';
        closeMobileMenu();
        return open;
      })()`);
    }

    const { contentSize } = await send('Page.getLayoutMetrics');
    const shot = await send('Page.captureScreenshot', {
      format: 'jpeg', quality: 55, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: vp.width, height: Math.min(contentSize.height, 16000), scale: vp.mobile ? 0.6 : 0.4 },
    });
    writeFileSync(join(outDir, `${vp.name}-full.jpg`), Buffer.from(shot.data, 'base64'));

    const failures = [];
    if (checks.h1Count !== 1) failures.push('h1 count');
    if (!checks.hasAiSection) failures.push('no #ai section');
    if (checks.forbiddenText.length) failures.push(`forbidden text: ${checks.forbiddenText.join(', ')}`);
    if (checks.horizontalOverflow) failures.push(`horizontal overflow (${checks.scrollWidth}px)`);
    if (checks.brokenImages.length) failures.push(`broken images: ${checks.brokenImages.join(', ')}`);
    if (checks.hiddenFadeUps.length) failures.push(`never became visible: ${checks.hiddenFadeUps.join('; ')}`);
    if (!checks.jsonLdValid) failures.push('invalid JSON-LD');
    if (vp.mobile && (checks.navVisible || !checks.hamburgerVisible || !checks.mobileMenuOpens)) failures.push('mobile nav broken');
    if (!vp.mobile && (!checks.navVisible || checks.hamburgerVisible)) failures.push('desktop nav broken');
    if (errors.length) failures.push(...errors);

    report.viewports.push({ ...vp, checks, failures });
  }
} finally {
  await send('Emulation.clearDeviceMetricsOverride').catch(() => {});
  ws.close();
  await fetch(`${CDP}/json/close/${target.id}`).catch(() => {});
}

console.log(JSON.stringify(report, null, 2));
const failed = report.viewports.some((v) => v.failures.length);
console.log(failed ? 'BROWSER CHECK: FAIL' : 'BROWSER CHECK: PASS');
process.exit(failed ? 1 : 0);

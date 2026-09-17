// Render the 1200x630 social share image with the automation Chrome (CDP), no design tools needed.
// Usage: node tools/make-og-image.mjs [outfile]
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(ROOT, 'assets/og-image.png');
const CDP = 'http://127.0.0.1:9222';
const logo = readFileSync(join(ROOT, 'assets/harbourcloud-logo.png')).toString('base64');

const page = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0A1628;color:#fff;font-family:'DM Sans',sans-serif;
       padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
  .glow{position:absolute;width:760px;height:760px;border-radius:50%;right:-220px;top:-260px;
        background:radial-gradient(circle,rgba(0,87,255,0.35),rgba(0,87,255,0) 70%)}
  .brand{display:flex;align-items:center;gap:16px;position:relative}
  .brand img{height:64px;width:64px;filter:brightness(0) invert(1)}
  .brand span{font-family:'Sora',sans-serif;font-weight:800;font-size:30px;letter-spacing:-0.5px}
  h1{font-family:'Sora',sans-serif;font-weight:800;font-size:62px;line-height:1.12;letter-spacing:-1.8px;position:relative;max-width:980px}
  h1 em{font-style:normal;color:#3D7BFF}
  .row{display:flex;gap:12px;flex-wrap:wrap;position:relative}
  .chip{border:1px solid rgba(255,255,255,0.22);border-radius:999px;padding:10px 20px;font-size:21px;font-weight:500;color:rgba(255,255,255,0.88)}
  .foot{display:flex;justify-content:space-between;align-items:flex-end;position:relative}
  .foot p{font-size:22px;color:rgba(255,255,255,0.62)}
</style></head><body>
  <div class="glow"></div>
  <div class="brand"><img src="data:image/png;base64,${logo}" alt=""><span>Harbour Cloud</span></div>
  <h1>AI projects, designed, built and run on <em>Azure and AWS.</em></h1>
  <div class="row">
    <span class="chip">Azure AI</span><span class="chip">AI agents</span><span class="chip">Private AI</span>
    <span class="chip">AWS accounts &amp; billing</span><span class="chip">Microsoft 365 licensing</span>
  </div>
  <div class="foot"><p>Microsoft CSP partner and AWS reseller, Sydney</p><p>harbourcloud.com.au</p></div>
</body></html>`;

const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => { const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });

try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(page) });
  await new Promise((r) => setTimeout(r, 3000));
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`wrote ${out}`);
} finally {
  await send('Emulation.clearDeviceMetricsOverride').catch(() => {});
  ws.close();
  await fetch(`${CDP}/json/close/${target.id}`).catch(() => {});
}

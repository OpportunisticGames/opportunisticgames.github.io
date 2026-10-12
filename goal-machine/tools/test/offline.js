// The app opens with no signal: once installed, the service worker serves the cached game when the network fails
// (offline) or just hangs (a phone showing 4G with no data).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
let hang = false;
const srv = http.createServer((q, r) => {
  if (hang) return;   // accepts the request and never answers, like a phone with 4G but no data
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
});
(async () => {
  await new Promise(r => srv.listen(8791, r));
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(() => { localStorage.setItem('gm:welcomed', '1'); });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const URL = 'http://localhost:8791/goal-machine/';
  await pg.goto(URL);
  await pg.evaluate(() => navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready));   // (the app itself only registers on https)
  await pg.reload(); await pg.waitForTimeout(3000);   // let the shell cache fill
  let fail = 0;
  const check = async (name) => {
    const t = Date.now();
    await pg.goto(URL, { timeout: 30000 }).catch(e => console.log(name, 'goto error', e.message));
    await pg.waitForSelector('#app *', { timeout: 20000 }).catch(() => { });
    const ok = await pg.evaluate(() => !!(window.GM && document.querySelector('#app') && document.querySelector('#app').children.length));
    console.log(name, ok ? 'OK' : 'FAIL', (Date.now() - t) + 'ms');
    if (!ok) fail++;
  };
  await ctx.setOffline(true);
  await check('offline');
  await ctx.setOffline(false); hang = true;
  await check('hanging network');
  await b.close(); srv.close();
  if (errs.length) console.log('page errors', errs.slice(0, 3));
  process.exit(fail ? 1 : 0);
})();

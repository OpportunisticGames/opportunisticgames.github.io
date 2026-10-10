// 5.25: the app's extras, with a pretend Android app (window.AndroidApp): haptics go to the app, Play updates offer a
// download then a restart, links that don't open in the app get a nudge and a Settings row, the review card waits
// for a happy moment, and an old app build (no features()) changes nothing.
//   node app525.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
const fake = (feat, links) => `window._calls = []; window.AndroidApp = new Proxy({}, { get: (t, k) => (...a) => { window._calls.push([k, ...a]);
  if (k === 'features') return ${JSON.stringify(feat)}; if (k === 'linksStatus') return ${JSON.stringify(links)}; if (k === 'channel') return 'play'; if (k === 'version') return 57;
  if (k === 'checkUpdate' && !a[0]) setTimeout(() => GM.appEvent('update', 'available:58'), 50); if (k === 'checkUpdate' && a[0]) setTimeout(() => GM.appEvent('update', 'downloaded'), 50);
  if (k === 'pgsPlayer') setTimeout(() => GM.appEvent('pgsPlayer', 'g123'), 10); return undefined; } });`;
async function phone(b, feat, links, errs, store = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  await ctx.addInitScript(fake(feat, links));
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(st => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); ['updChecked', 'linksNag'].forEach(k => localStorage.removeItem('gm:' + k)); Object.entries(st).forEach(([k, v]) => localStorage.setItem('gm:' + k, JSON.stringify(v))); }, store);
  await pg.reload(); await pg.waitForTimeout(1500);
  return pg;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const A = await phone(b, 'review,update,pgsPlayer,pgsAuth,buzz,links,shortcuts,events', 'off', errs);
  const calls = await A.evaluate(() => window._calls.map(c => c[0]));
  ok(calls.includes('checkUpdate') && calls.includes('pgsPlayer') && calls.includes('linksStatus'), 'at start the page asks the app about updates, Play Games and links');
  ok(await A.evaluate(() => GM.store.get('pgsPlayer')) === 'g123', 'the Play Games player id is kept for later');
  const up = await A.evaluate(() => (document.querySelector('.notice') || {}).textContent || '');
  ok(/new version of the app/.test(up), `an update on Play: "${up.trim()}"`);
  await A.click('.notice'); await A.waitForTimeout(300);
  ok(await A.evaluate(() => window._calls.some(c => c[0] === 'checkUpdate' && c[1] === true)), 'tap it: the download starts');
  ok(/Update downloaded/.test(await A.evaluate(() => (document.querySelector('.notice') || {}).textContent || '')), 'then: tap to restart');
  await A.click('.notice'); await A.waitForTimeout(200);
  ok(await A.evaluate(() => window._calls.some(c => c[0] === 'completeUpdate')), 'which installs it');
  await A.waitForTimeout(4200);
  const ln = await A.evaluate(() => (document.querySelector('.notice') || {}).textContent || '');
  ok(/links open in Chrome/.test(ln), `links that don't open in the app: a nudge ("${ln.trim()}")`);
  await A.click('.notice'); await A.waitForTimeout(200);
  ok(await A.evaluate(() => window._calls.some(c => c[0] === 'openLinkSettings')), "tap it: Android's Open by default page");
  await A.goto(U + '#/settings'); await A.waitForTimeout(600);
  const row = await A.evaluate(() => (document.getElementById('s-links') || {}).textContent || '');
  ok(/Off – tap to fix/.test(row), `and a row in Settings ("${row.trim()}")`);
  // haptics
  const bz = await A.evaluate(() => { window._calls = []; GM.buzz(); GM.buzz(40); GM.buzz(120); GM.buzz('win'); return window._calls.filter(c => c[0] === 'buzz').map(c => c[1]).join(); });
  ok(bz === 'tick,confirm,heavy,win', `haptics go to the app: ${bz}`);
  ok(await A.evaluate(() => { window._calls = []; GM.store.set('buzz', false); GM.buzz('win'); GM.store.set('buzz', true); return !window._calls.length; }), 'and stay off with Vibration off in Settings');
  // the review card
  const rv = await A.evaluate(() => { window._calls = []; GM.native.happy('pb'); return window._calls.some(c => c[0] === 'askReview'); });
  ok(!rv, 'no review card for a brand-new player');
  await A.evaluate(() => { GM.store.set('firstSeen', Date.now() - 5 * 864e5); GM.store.set('gamesDone', 12); GM.store.set('reviewAsk', 0); GM.native.happy('pb'); });
  await A.waitForTimeout(2200);
  ok(await A.evaluate(() => window._calls.some(c => c[0] === 'askReview')), 'after a few days and a dozen games, a new best asks for the review card');
  await A.evaluate(() => { window._calls = []; GM.native.happy('pb'); }); await A.waitForTimeout(2200);
  ok(!(await A.evaluate(() => window._calls.some(c => c[0] === 'askReview'))), 'and not again for two months');
  // an old app build: nothing new happens
  const O = await phone(b, null, null, errs);
  const oc = await O.evaluate(() => window._calls.map(c => c[0]).filter(k => !['features', 'channel', 'version', 'nightMode', 'setBars', 'pushToken', 'notifyStatus', 'pgsAvailable', 'pgsStatus', 'notificationsAllowed', 'setInbox', 'watchGames', 'pgsUpdate', 'pgsStats'].includes(k)));
  ok(!oc.length, `an older app build: none of the new calls (${oc.join() || 'none'})`);
  ok(await O.evaluate(() => { window._calls = []; GM.buzz(40); return !window._calls.some(c => c[0] === 'buzz'); }), 'and haptics stay with the browser');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

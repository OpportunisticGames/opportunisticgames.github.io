// 5.31: fresher backups (a newer cloud backup is offered, saves on leaving the app) and offline notices
// (the strip, go-online cards, scores kept and sent later).   node offline531.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/', KEY = 'a'.repeat(28);
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 } }); await server.attach(ctx);
  let down = false;
  await ctx.route(/supabase\.co/, r => down ? r.abort('internetdisconnected') : r.request().url().includes('/rest/v1/') ? r.fallback() : r.fulfill({ status: 200, body: '' }));
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U);
  await pg.evaluate(k => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:account', JSON.stringify({ name: 'Alice', key: k })); localStorage.setItem('gm:name', JSON.stringify('Alice')); }, KEY);
  await pg.reload(); await pg.waitForTimeout(800);

  // --- a newer cloud backup than this phone's: offered once
  await pg.evaluate(() => { GM.store.set('best:ultimate', 111); return GM.backup.save(false); });   // cloud: 111
  await pg.evaluate(() => { GM.store.set('best:ultimate', 5); GM.store.set('backupAt', Date.now() - 3 * 864e5); localStorage.removeItem('gm:backupDirty'); });   // an old copy on the phone
  await pg.goto(U + '#/today'); await pg.reload(); await pg.waitForSelector('.modal-wrap', { timeout: 9000 }).catch(() => { });
  const txt = await pg.evaluate(() => (document.querySelector('.modal-wrap') || {}).textContent || '');
  ok(/newer backup of your game/.test(txt), `an old phone is offered the newer backup (${txt.trim().slice(0, 60)})`);
  await pg.screenshot({ path: 'lay/off_restore.png' });
  await pg.click('.modal-wrap button:text-is("Not now")');
  await pg.reload(); await pg.waitForTimeout(5000);
  ok(!(await pg.$('.modal-wrap')), 'after "Not now" it isn’t asked again for that backup');
  await pg.evaluate(() => GM.store.set('backupAsked', 0)); await pg.reload();
  await pg.waitForSelector('.modal-wrap', { timeout: 9000 });
  await Promise.all([pg.waitForNavigation().catch(() => { }), pg.click('.modal-wrap button:text-is("Restore")')]); await pg.waitForTimeout(1200);
  const got = await pg.evaluate(() => GM.store.get('best:ultimate', 0)); ok(got === 111, 'Restore brings the newer data back (got ' + got + ')');
  await pg.reload(); await pg.waitForTimeout(5000);
  ok(!(await pg.$('.modal-wrap')), 'and once restored there’s nothing more to offer');

  // --- leaving the app saves what changed
  await pg.evaluate(() => { GM.store.set('best:ultimate', 222); GM.store.set('backupAt', Date.now() - 120e3); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await pg.waitForTimeout(800);
  const cloud = await pg.evaluate(() => GM.backup.fetch());
  ok(cloud && cloud.data && cloud.data['gm:best:ultimate'] === '222', 'going to the home screen backs up the change straight away');
  await pg.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));

  // --- offline: 4G showing, nothing getting through
  await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  down = true;
  ok(await pg.evaluate(() => GM.net.ping()) === false, 'the game notices the server can’t be reached');
  await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('net-bar')).display !== 'none' && /Offline/.test(document.getElementById('net-bar').textContent)), 'the 📶 Offline note shows on the menu pages');
  await pg.screenshot({ path: 'lay/off_home.png' });
  await pg.goto(U + '#/leaderboard'); await pg.waitForTimeout(1500);
  ok(await pg.$('.offline-card'), 'the leaderboard says go online instead of a bare "couldn’t load"');
  await pg.screenshot({ path: 'lay/off_board.png' });
  // a score made offline is kept...
  const q = await pg.evaluate(async () => { let e; try { await GM.lb.submit('ultimate', 777, 'Alice'); } catch (x) { e = x; } return { queued: !!(e && e.queued), n: (GM.store.get('lbQueue', []) || []).length }; });
  ok(q.queued && q.n === 1, 'a score from an offline game is kept to send later');
  // ...and sent when the signal is back
  down = false;
  await pg.evaluate(() => GM.net.ping()); await pg.waitForTimeout(1200);
  ok(await pg.evaluate(() => (GM.store.get('lbQueue', []) || []).length) === 0, 'back online, it’s sent and the queue is empty');
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('net-bar')).display === 'none' || !document.getElementById('net-bar').classList.contains('on')), 'the Offline note goes away');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(process.exitCode || 0);
})();

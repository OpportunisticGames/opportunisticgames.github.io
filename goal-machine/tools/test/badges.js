// Badges: 100 of them (each one a Google Play Games achievement), the new progress ones unlock, retired ones vanish,
// and the Play app is told about each unlock by name.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase|fonts/, r => r.abort());
  await pg.addInitScript(() => { window.__pgs = []; window.AndroidApp = { pgsAvailable: () => true, pgsUpdate: j => window.__pgs.push(JSON.parse(j)), pgsShow: () => { window.__shown = 1; }, channel: () => 'play', version: () => 99, nightMode: () => false, pushToken: () => '' }; });
  await pg.goto(U);
  await pg.evaluate(() => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v));
    set('seenVersion', 999); set('welcomed', 1); set('sfx', false);
    // a retired badge, an old save, and enough games and XP for the progress badges
    set('album', { players: {}, days: [], by: { goals: {}, assists: {}, apps: {} }, ach: { hard: '2026-09-01', mystery: '2026-09-01', first: '2026-09-01' } });
    set('played', 120); set('xp', 20000);
  });
  await pg.reload(); await pg.waitForTimeout(800);
  const s = await pg.evaluate(() => GM.albumSummary());
  ok(s.totalBadges === 100, 'there are 100 badges: ' + s.totalBadges);
  ok(s.badges === 1, 'retired badges (No Clues, Mystery Solved) no longer count: ' + s.badges);
  await pg.evaluate(() => GM.checkGame('hopper', 1, {}));
  await pg.waitForTimeout(300);
  const got = await pg.evaluate(() => Object.keys(GM.store.get('album').ach));
  ok(['g25', 'g100'].every(k => got.includes(k)) && !got.includes('g500'), 'Getting Going and Centurion unlock at 120 games, Part of the Furniture does not: ' + got);
  ok(got.includes('lv10') && got.includes('lv30') && !got.includes('lv50'), 'level badges follow the level (20,000 XP is about level 30)');
  await pg.waitForTimeout(1800);   // the report goes out a moment after the album is saved
  const sent = Object.assign({}, ...(await pg.evaluate(() => window.__pgs)));
  ok(sent['Getting Going'] === 25 && sent['Centurion'] === 100, 'the Play app is told by name, earned counters at their full steps: ' + JSON.stringify(sent));
  ok(sent['Part of the Furniture'] === 120 - 0 && sent['Part of the Furniture'] <= 500, 'a counter you are part-way through reports its progress (Part of the Furniture: ' + sent['Part of the Furniture'] + '/500)');
  ok(sent['Top Flight'] === 30 && sent['Ballon d’Or'] > 0 && sent['Ballon d’Or'] < 50, 'levels count as steps (Top Flight done, Ballon d’Or ' + sent['Ballon d’Or'] + '/50)');
  await pg.evaluate(() => { window.__pgs.length = 0; GM.pgsSync(); });
  ok((await pg.evaluate(() => window.__pgs.length)) === 0, 'nothing is re-sent while nothing has changed');
  ok(await pg.evaluate(() => { const st = GM.pgsState(GM.store.get('album')), want = Object.keys(GM.PGS_STEPS).length; return Object.keys(GM.PGS_STEPS).every(k => typeof GM.PGS_STEPS[k] === 'number') && want === 16 && st['First XI'] === 1; }), '16 counters are incremental, plain badges send 1');
  // extreme and pack badges
  await pg.evaluate(() => { GM.checkGame('pack', 50, {}); });
  ok((await pg.evaluate(() => Object.keys(GM.store.get('album').ach))).includes('pk50'), 'Pack Mentality at 50 packs opened');
  // the Album shows the Google Play Games button inside the app
  await pg.goto(U + '#/album?v=badges'); await pg.waitForTimeout(600);
  ok(!!(await pg.$('#pgs-show')), 'the badges page has the Google Play Games button in the Play app');
  await pg.click('#pgs-show');
  ok(await pg.evaluate(() => window.__shown === 1), 'and it opens the Play Games screen');
  ok(await pg.evaluate(() => [...document.querySelectorAll('.ach-cats a')].some(a => /Progress/.test(a.textContent))), 'a Progress category');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close();
})();

// Play Games leaderboards and Game Stats: scores go to the right named board, every game, pack, badge and online game
// sends its stats event, and level is the progress stat. Uses a stub of the Android bridge.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase|fonts/, r => r.abort());
  await pg.addInitScript(() => {
    window.__scores = []; window.__stats = [];
    window.AndroidApp = { pgsAvailable: () => true, pgsUpdate: () => { }, pgsScore: (n, s) => window.__scores.push([n, s]), pgsStats: j => JSON.parse(j).forEach(e => window.__stats.push(e)), channel: () => 'play', version: () => 99, nightMode: () => false, pushToken: () => '' };
  });
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('sfx', false); set('account', { name: 'Tester', key: 'k' }); });
  await pg.reload(); await pg.waitForTimeout(800);
  const rec = (m, s, o) => pg.evaluate(([m, s, o]) => GM.recordScore(m, s, {}, o || {}), [m, s, o]);
  await rec('ultimateh', 410); await rec('chaosx', 900); await rec('ultimatepure', 330); await rec('purist', 280); await rec('hilo', 12); await rec('ultimateast', 90); await rec('packedxi', 300, { quiet: true });
  const sc = await pg.evaluate(() => window.__scores);
  ok(JSON.stringify(sc) === JSON.stringify([['Ultimate Wildcard (Hard)', 410], ['CHAOS (Extreme)', 900], ['Purist (Normal)', 330], ['Purist (Extreme)', 280]]), 'scores go to the right boards, and only the goals boards: ' + JSON.stringify(sc));
  const st = await pg.evaluate(() => window.__stats.filter(e => e.name === 'gameCompleted').map(e => e.props));
  ok(st.length === 6 && st[0].gameType === 'draft' && st[0].board === 'ultimateh' && st[0].score === 410 && st[0].isDaily === false, 'every finished game sends gameCompleted (6; the quiet Packed XI post is not a game): ' + JSON.stringify(st[0]));
  ok(st[4].board === 'hilo' && st[4].gameType === 'game', 'a quick game is gameType game');
  await rec('daily:2026-10-02', 480);
  ok(await pg.evaluate(() => { const e = window.__stats.filter(x => x.name === 'gameCompleted').pop().props; return e.board === 'daily' && e.isDaily === true && e.gameType === 'draft'; }), 'a daily game: board daily, isDaily true');
  await pg.evaluate(() => { GM.checkGame('pack', 3, { type: 'standard', finished: ['b', 'g'] }); GM.checkOnline({ code: 'R9', kind: 'duel', host: 'Alice', guest: 'Bob', result: { winner: 'host' } }, 'host'); });
  await pg.waitForTimeout(300);
  const names = await pg.evaluate(() => window.__stats.map(e => e.name));
  ok(names.includes('packOpened') && names.filter(n => n === 'cardFinished').length === 2 && names.includes('onlineGameFinished') && names.includes('badgeUnlocked'), 'packs, finished cards, online games and badges all send events: ' + [...new Set(names)].join(', '));
  await pg.waitForTimeout(1900);   // the album report goes out a moment after it is saved
  await pg.evaluate(() => { window.__stats.length = 0; GM.pgsSync(); });
  await pg.waitForTimeout(100);
  ok(await pg.evaluate(() => window.__stats.length === 0), 'level is sent once, not every time');
  await pg.evaluate(() => { GM.store.set('xp', 5000); GM.pgsSync(); });
  const pr = await pg.evaluate(() => window.__stats.filter(e => e.name === 'progressUpdate'));
  ok(pr.length === 1 && pr[0].props.currentProgress > 5, 'a level-up sends progressUpdate with the level: ' + JSON.stringify(pr));
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close();
})();

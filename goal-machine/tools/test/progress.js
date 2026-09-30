// The first game (welcome → coached draft → full time), levels and XP, This month / All time boards with level tags,
// club v club, and your club and level going to the server. Supabase is faked here.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [], calls = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt/, r => r.abort());
  await pg.route(/supabase\.co/, r => {
    const u = r.request().url(); calls.push(u.replace(/^.*\/rest\/v1\//, '') + ' ' + (r.request().postData() || ''));
    const json = v => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) });
    if (/rpc\/club_table/.test(u)) return json([{ club: 'Liverpool', fans: 4, games: 12, avg: 431, ranked: true }, { club: 'Everton', fans: 3, games: 9, avg: 402, ranked: true }, { club: 'Hull City', fans: 1, games: 1, avg: 610, ranked: false }]);
    if (/rpc\/set_profile|rpc\/submit_score/.test(u)) return json('ok');
    if (/month_scores|best_scores/.test(u)) return json([{ name: 'Top Bin', score: 612, level: 23, created_at: '2026-09-29' }, { name: 'SuperSub', score: 540, level: null, created_at: '2026-09-28' }]);
    return json([]);
  });
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('gm:sfx', 'false'); });
  await pg.reload(); await pg.waitForTimeout(1400);

  // the first game
  ok(!!(await pg.$('#wlgo')), 'first launch offers “Play my first XI”');
  ok(!!(await pg.$('.first-xi')), 'and Home has a “New here?” card');
  await pg.click('#wlgo'); await pg.waitForTimeout(1300);
  const bub = () => pg.evaluate(() => (document.querySelector('.coach') || {}).textContent || '');
  ok(/Spin the reels/.test(await bub()) && /tut=1/.test(await pg.evaluate(() => location.hash)), 'a coach bubble points at SPIN');
  await pg.click('#spin'); await pg.waitForTimeout(1800);
  ok(/Sign one/.test(await bub()), 'then at the three players');
  await pg.evaluate(() => [...document.querySelectorAll('.stage .reel[data-reel]')][0].click()); await pg.waitForTimeout(900);
  ok(/Put him in your XI/.test(await bub()) && !!(await pg.$('.slot.target.coach-lit')), 'then at a glowing slot');
  for (let k = 0; k < 200 && (await pg.evaluate(() => GM.draft.state().phase !== 'done')); k++) {
    await pg.evaluate(() => { const sp = document.getElementById('spin'); if (sp && !sp.disabled) return sp.click(); const t = document.querySelector('.slot.target'); if (t) return t.click();
      const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (rs.length) rs[0].click(); });
    if (k === 20) ok(!(await bub()), 'the bubbles stop once you’ve got the hang of it');
    await pg.waitForTimeout(700);
  }
  await pg.waitForTimeout(3200);
  ok(await pg.evaluate(() => [...document.querySelectorAll('.modal-wrap')].filter(m => /Claim your leaderboard name/.test(m.textContent)).length) === 1, 'the name box asks once, not twice');
  await pg.evaluate(() => { const nm = [...document.querySelectorAll('.modal-wrap')].find(m => !/Your first XI/.test(m.textContent)); if (nm) nm.remove(); });
  await pg.waitForTimeout(4000);
  ok(/Your first XI/.test(await pg.evaluate(() => [...document.querySelectorAll('.modal-wrap')].map(m => m.textContent).join(' '))) && await pg.evaluate(() => !!GM.store.get('firstXI')), 'full time: “Your first XI” and where to go next');
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  ok(!(await pg.$('.first-xi')), 'the “New here?” card goes once you’ve played');

  // levels
  const lv = await pg.evaluate(() => ({ xp: GM.xp(), chip: (document.querySelector('.lvl-chip') || {}).textContent }));
  ok(lv.xp >= 25 && /Lv \d/.test(lv.chip), `a draft earns XP (${lv.xp}) and Home shows your level (${lv.chip.trim()})`);
  const p0 = await pg.evaluate(() => GM.packsWaiting());
  const n = await pg.evaluate(() => { GM.addXP(500); return GM.myLevel().n; });
  await pg.waitForTimeout(2000);
  const up = { n, packs: await pg.evaluate(() => GM.packsWaiting()) - p0 };
  ok(up.n >= 4 && up.packs >= 1, `levelling up (to ${up.n}) gives a pack`);
  ok(await pg.evaluate(() => { const s = [0, 100, 225, 375, 550]; return s.every((x, i) => GM.levelOf(x).n === i + 1) && GM.levelOf(99).n === 1 && GM.levelOf(40000).rank === 'Ballon d’Or'; }), 'the ladder: 100 XP for level 2, a bit more each level, Ballon d’Or at the top');
  await pg.goto(U + '#/level'); await pg.waitForTimeout(400);
  ok((await pg.$$('.lvl-ladder > div')).length === 8 && /Earn a badge/.test(await pg.textContent('.lvl-earn')), 'the level page: the ladder and how to earn XP');
  ok(await pg.evaluate(() => { localStorage.removeItem('gm:xp'); localStorage.setItem('gm:played', '10'); localStorage.setItem('gm:dlog', JSON.stringify({ '2026-09-01': { daily: 1, footle: 2 } })); localStorage.setItem('gm:album', JSON.stringify({ players: {}, ach: { a: 1, b: 1 }, days: [] })); return GM.xp() === 10 * 15 + 2 * 50 + 2 * 20; }), 'existing players start with XP for what they’ve already done');

  // boards: This month by default, All time a tap away, levels shown
  calls.length = 0;
  await pg.goto(U + '#/leaderboard?m=ultimate'); await pg.waitForTimeout(900);
  ok(calls.some(c => /^month_scores\?/.test(c)) && await pg.$eval('#lbp', e => e.value) === '1', 'boards open on This month');
  const lay = await pg.evaluate(() => { const g = document.querySelector('.lbx-games'), r = [...g.children].map(a => a.getBoundingClientRect().top);
    return { oneRow: r.every(t => Math.abs(t - r[0]) < 2), games: g.children.length, selects: document.querySelectorAll('.lbx-filters select').length, you: document.querySelector('#lbbody').firstElementChild.id }; });
  ok(lay.oneRow && lay.games >= 8 && lay.selects === 4, `simple layout: ${lay.games} games in one row, then 4 drop-downs (version, stat, Normal/Hard, month)`);
  ok(lay.you === 'lbyou', 'your own position comes first, above the board');
  await pg.selectOption('#lbs', 'assists'); await pg.waitForTimeout(600);
  ok(/m=ultimateast/.test(await pg.evaluate(() => location.hash)), 'choosing Assists switches board');
  await pg.selectOption('#lbv', 'classic'); await pg.waitForTimeout(600);
  ok(/m=classicast/.test(await pg.evaluate(() => location.hash)), 'choosing Classic keeps the stat');
  await pg.goto(U + '#/leaderboard?m=packedxi'); await pg.waitForTimeout(600);
  ok(await pg.$$eval('.lbx-filters select', l => l.length) === 1, 'a board with nothing to choose shows just the month');
  await pg.goto(U + '#/leaderboard?m=ultimate'); await pg.waitForTimeout(700);
  ok(/Lv 23/.test(await pg.textContent('#global')), 'players’ levels show next to their names');
  calls.length = 0;
  await pg.selectOption('#lbp', '0'); await pg.waitForTimeout(900);
  ok(calls.some(c => /^best_scores\?/.test(c)) && await pg.$eval('#lbp', e => e.value) === '0', 'All time switches to the all-time boards');
  await pg.evaluate(() => GM.store.set('lbMonth', true));
  await pg.goto(U + '#/leaderboard?m=' + encodeURIComponent('daily:2026-09-30')); await pg.waitForTimeout(700);
  ok(!(await pg.$('#lbp')), 'a day’s board has no month switch');

  // club v club, and your club and level with your account
  await pg.evaluate(() => { GM.store.set('account', { name: 'SuperSub', key: 'k' }); GM.store.set('club', 'Everton'); GM.store.set('profileSent', ''); });
  calls.length = 0;
  await pg.goto(U + '#/clubs'); await pg.waitForTimeout(900);
  ok(await pg.$eval('.lbx-games a.on', e => /Your club/.test(e.textContent)) && await pg.$eval('#lbv', e => e.value) === 'clubs', 'Club v club lives in the Leaderboards, under Your club');
  const rows = await pg.$$eval('#clubs .lb-row', l => l.map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  ok(rows.length === 3 && /^🥇.*Liverpool/.test(rows[0]) && /^–/.test(rows[2]) && await pg.$eval('#clubs .lb-row.me', r => /Everton/.test(r.textContent)), 'the club table: ranked clubs, the unranked one below, yours highlighted');
  const prof = calls.find(c => /rpc\/set_profile/.test(c));
  ok(prof && /"p_club":"Everton"/.test(prof) && /"p_level":\d+/.test(prof), 'your club and level go to the server with your account');
  calls.length = 0;
  await pg.goto(U + '#/'); await pg.waitForTimeout(500);
  ok(!calls.some(c => /set_profile/.test(c)), '…only when they change');
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

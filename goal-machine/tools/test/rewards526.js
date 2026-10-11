// 5.26: the Locker, the season track, weekly missions and login rewards. Unlocks from what you've already done, wearing
// a pitch style / card back / frame / title (others see your frame and title), XP filling the season track, missions
// counting, the login card, the new Dodgy Owner owners locked until unlocked, and extra challenge reactions.
//   node rewards526.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
async function phone(b, name, key, errs, store = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U); await pg.evaluate(([n, k, st]) => { localStorage.clear(); localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k }));
    Object.entries(st).forEach(([a, v]) => localStorage.setItem('gm:' + a, JSON.stringify(v))); }, [name, key, store]);
  await pg.reload(); await pg.waitForTimeout(1500);
  return pg;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  // a player at level ~13 with some badges, coming to the Locker for the first time
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs, { xp: 3200, club: 'Arsenal', album: { players: {}, days: [], ach: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['b' + i, '2026-10-01'])) }, dlog: { '2026-10-01': { daily: 1 }, '2026-10-02': { daily: 1 }, '2026-10-03': { daily: 1 }, '2026-10-04': { daily: 1 } } });
  const lv = await A.evaluate(() => GM.myLevel().n);
  const got = await A.evaluate(() => Object.keys(GM.LOCKER).filter(GM.lockerHas));
  ok(got.includes('pitch-night') && got.includes('title-gaffer') && got.includes('horn-cheer') && got.includes('pitch-club') && !got.includes('pitch-gold'), `level ${lv}, 12 badges, 4 club dailies: unlocked already (${got.length}: pitch-night, title-gaffer, horn-cheer, pitch-club…), not the level-30 golden turf`);
  await A.waitForTimeout(1500);
  ok(/Locker is open/.test(await A.evaluate(() => (document.querySelector('.notice') || {}).textContent || '')), 'the first time: “Your Locker is open”, with what you’ve unlocked already');
  ok(await A.evaluate(() => !!document.querySelector('.season-chip')), 'Home shows the season chip');
  // the Locker page: wear things
  await A.goto(U + '#/locker?k=pitch'); await A.waitForTimeout(500);
  ok((await A.$$('.lk-item')).length === 10 && (await A.$$('.lk-item.locked')).length > 0, 'the Locker lists pitch styles, some locked with how to get them');
  await A.screenshot({ path: 'lay/locker.png' });
  await A.click('.lk-item[data-id="pitch-night"]'); await A.waitForTimeout(200);
  ok(await A.evaluate(() => document.body.classList.contains('pk-night')), 'wearing Under the lights: the pitch changes');
  await A.click('.lk-item[data-id="pitch-gold"]'); await A.waitForTimeout(200);
  ok(await A.evaluate(() => document.body.classList.contains('pk-night') && !document.body.classList.contains('pk-gold')), 'a locked one says how to get it and changes nothing');
  await A.goto(U + '#/draft?m=classic&s=goals&seed=lk1'); await A.waitForTimeout(1200);
  const bg = await A.evaluate(() => getComputedStyle(document.querySelector('.pitch')).backgroundImage);
  ok(/radial-gradient/.test(bg), 'the draft pitch is floodlit');
  await A.screenshot({ path: 'lay/locker_pitch.png' });
  await A.goto(U + '#/locker?k=back'); await A.waitForTimeout(300); await A.click('.lk-item[data-id="back-carbon"]'); await A.waitForTimeout(100);
  ok(await A.evaluate(() => document.body.classList.contains('cbk-carbon')), 'a carbon card back');
  // frame and title: sent to the server, seen by Bob
  await A.goto(U + '#/locker?k=frame'); await A.waitForTimeout(300); await A.click('.lk-item[data-id="frame-silver"]'); await A.waitForTimeout(200);
  await A.goto(U + '#/locker?k=title'); await A.waitForTimeout(300); await A.click('.lk-item[data-id="title-gaffer"]'); await A.waitForTimeout(500);
  ok(await A.evaluate(() => /The Gaffer/.test(document.querySelector('.lk-me').textContent)), 'your title under your name');
  const B = await phone(b, 'Bob', 'b'.repeat(28), errs);
  await B.evaluate(() => GM.lb.rpc('online_add_friend', { p_user: 'Bob', p_key: 'b'.repeat(28), p_friend: 'Alice' }));
  await B.goto(U + '#/online?tab=friends'); await B.waitForTimeout(1500);
  const seen = await B.evaluate(() => { const r = document.querySelector('.friend'); return r ? { title: (r.querySelector('.utitle') || {}).textContent, frame: r.querySelector('.avatar').className } : null; });
  ok(seen && seen.title === 'The Gaffer' && /fr-silver/.test(seen.frame), `Bob sees Alice's frame and title on his Friends tab (${JSON.stringify(seen)})`);
  // the season track: XP fills tiers, tiers give things
  const s0 = await A.evaluate(() => GM.seasonInfo().tier);
  await A.evaluate(() => GM.addXP(260 * 3));
  await A.waitForTimeout(2200);
  const s1 = await A.evaluate(() => ({ t: GM.seasonInfo().tier, title: GM.lockerHas('title-tinkerman'), react: GM.lockerHas('react-cap') }));
  ok(s1.t >= s0 + 3 && s1.title && s1.react, `XP fills the season track (tier ${s0} → ${s1.t}): tier 1 gave the Tinkerman title, tier 3 a reaction`);
  // missions
  const ms = await A.evaluate(() => GM.missions());
  ok(ms.length === 3 && new Set(ms.map(m => m.ev)).size === 3, `three missions this week: ${ms.map(m => m.text).join(' · ')}`);
  const before = await A.evaluate(() => GM.seasonInfo().xp);
  await A.evaluate(ms => { const m = ms[0]; for (let i = 0; i < m.need; i++) GM.track(m.ev); }, ms); await A.waitForTimeout(400);
  const after = await A.evaluate(() => ({ xp: GM.seasonInfo().xp, done: GM.missions().filter(m => m.done).length, n: GM.store.get('missionsDone') }));
  ok(after.done === 1 && after.xp >= before + 300 && after.n === 1, `a mission done: +300 season XP (${before} → ${after.xp})`);
  await A.goto(U + '#/season'); await A.waitForTimeout(500);
  ok((await A.$$('.st-tier')).length === 30 && (await A.$$('.st-m')).length === 3 && (await A.$$('.st-login > div')).length === 7, 'the season page: 30 tiers, 3 missions, the 7-day login card');
  await A.screenshot({ path: 'lay/season.png', fullPage: true });
  // login rewards: a new day claims the next day
  const lg = await A.evaluate(() => { GM.store.set('login', { last: '2000-01-01', n: 6 }); const d = GM.loginCheck(); return { d: d && d.text, own: GM.lockerHas('pitch-snow') }; });
  ok(lg.d === 'A Locker item' && lg.own, 'login day 7: a Locker item (Snow day)');
  ok(await A.evaluate(() => GM.loginCheck() === null), 'and only once a day');
  // Dodgy Owner: the new owners are locked until unlocked
  await A.goto(U + '#/owner'); await A.waitForTimeout(800);
  const ow = await A.evaluate(() => ({ locked: [...document.querySelectorAll('.cb-mgr.locked')].map(x => x.textContent), celeb: !!document.querySelector('[data-owner="celeb"]') }));
  ok(ow.locked.length >= 1 && ow.celeb, `Dodgy Owner: the Celebrity (level 9) is there, the Supporters' Trust shows locked (${ow.locked.length} locked)`);
  // extra reactions in challenges
  ok(await A.evaluate(() => GM.extraReactions().includes('🎺 Vuvuzela!') && GM.extraReactions().includes('🧢 Cap doffed')), 'unlocked reactions join the challenge reactions');
  // celebrations don't break anything
  await A.evaluate(() => { GM.LOCKER && ['celeb-fireworks', 'celeb-money', 'celeb-lightning', 'celeb-pigeon', 'celeb-trophy', 'celeb-club', 'celeb-confetti'].forEach(id => { GM.store.set('locker', { ...GM.store.get('locker'), own: { ...GM.store.get('locker').own, [id]: 1 }, eq: { ...GM.store.get('locker').eq, celeb: id } }); GM.celebrate(); }); });
  await A.waitForTimeout(1200);
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

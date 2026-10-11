// 5.27: the new layout. The top bar on the tabs' pages (level, season, 🎁 to open), the 🎒 Locker tab (Season, My XI,
// Cards, Badges, Kit) and the old addresses that now land in it, missions on Today, Challenges on the Online tab.
//   node layout527.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  for (const W of [390, 360]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 800 } }); await server.attach(ctx);
    await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message));
    await A.goto(U); await A.evaluate(() => { localStorage.clear(); localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1');
      localStorage.setItem('gm:account', JSON.stringify({ name: 'Alice', key: 'a'.repeat(28) })); localStorage.setItem('gm:xp', '3200'); localStorage.setItem('gm:spins', '2'); });
    await A.reload(); await A.waitForTimeout(2000);
    const tag = `(${W}px)`;
    // the top bar
    const top = await A.evaluate(() => { const s = document.querySelector('.gm-status'); return s && !s.hidden && { lvl: !!s.querySelector('.lvl-chip[href="#/level"]'), sz: !!s.querySelector('.season-chip[href="#/season"]'), n: +s.querySelector('.gs-open b').textContent, h: s.getBoundingClientRect().height }; });
    const want = await A.evaluate(() => GM.packsWaiting() + 2);
    ok(top && top.lvl && top.sz && top.n === want && top.h < 80, `Home: the top bar with your level, the season and 🎁 ${top && top.n} (packs + 2 spins) ${tag}`);
    ok(await A.evaluate(() => !document.querySelector('#app .pack-bar') && !document.querySelector('#app .lvl-chip') && !document.querySelector('#app .album-tile')), `Home: no pack bar, chips or album tile in the page any more ${tag}`);
    await A.click('.gs-open'); await A.waitForTimeout(300);
    const rows = await A.evaluate(() => [...document.querySelectorAll('.to-row')].map(r => r.dataset.to));
    ok(rows.includes('packs') && rows.includes('spin'), `🎁 opens one sheet: ${rows.join(', ')} ${tag}`);
    await A.click('.to-row[data-to="spin"]'); await A.waitForTimeout(500);
    ok(/#\/spin/.test(A.url()) && await A.evaluate(() => document.querySelector('.gm-status').hidden), `…a tap goes to the wheel (no top bar there) ${tag}`);
    // the Locker tab and its views
    for (const [h, v] of [['#/locker?v=season', 'season'], ['#/album', 'xi'], ['#/album?v=badges', 'badges'], ['#/packs', 'cards'], ['#/album?v=signed', 'cards'], ['#/season', 'season'], ['#/locker?k=owner', 'kit']]) {
      await A.goto(U + '#/'); await A.goto(U + h); await A.waitForTimeout(500);
      const st = await A.evaluate(() => ({ v: (document.querySelector('.lk-views a.on') || {}).dataset?.v, tab: (document.querySelector('.tabbar a.on') || {}).dataset?.tab, top: !document.querySelector('.gm-status').hidden, over: document.documentElement.scrollWidth > innerWidth }));
      ok(st.v === v && st.tab === 'locker' && st.top && !st.over, `${h} → the Locker tab, ${v} ${tag}`);
    }
    await A.goto(U + '#/locker?k=owner'); await A.waitForTimeout(300);
    ok(await A.evaluate(() => !!document.querySelector('.lk-tabs [data-k="owner"].on') && document.querySelectorAll('.lk-item').length > 0), `Dodgy Owner's link opens Kit → Owners ${tag}`);
    await A.goto(U + '#/album?v=signed'); await A.waitForTimeout(300);
    ok(await A.evaluate(() => !!document.querySelector('.alb-sub a.on[href="#/album?v=signed"]') && !!document.querySelector('.sets')), `Signed players sit with the cards ${tag}`);
    await A.goto(U + '#/album?b=purist'); await A.waitForTimeout(1500);
    ok(await A.evaluate(() => !!document.querySelector('.alb-sub a.on[href="#/album?b=purist"]') && document.querySelector('.topbar .back').getAttribute('href') === '#/locker?v=cards'), `the Purist collection: back to the cards ${tag}`);
    await A.goto(U + '#/locker?v=xi'); await A.waitForTimeout(300);
    ok(await A.evaluate(() => !!document.querySelector('#lk-body .pitch, #lk-body .packed-pitch, #lk-body [class*="pitch"]')), `My XI: the Packed XI pitch ${tag}`);
    await A.screenshot({ path: `lay/l527_xi_${W}.png` });
    // Today: missions and login; the Online tab: Challenges
    await A.goto(U + '#/today'); await A.waitForTimeout(400);
    ok((await A.$$('.st-m')).length === 3 && (await A.$$('.st-login > div')).length === 7 && !(await A.$('#app .pack-bar')), `Today: missions and login rewards, no pack bar ${tag}`);
    await A.goto(U + '#/challenges'); await A.waitForTimeout(1200);
    ok(/tab=challenges/.test(A.url()) && await A.evaluate(() => !document.querySelector('[data-panel="challenges"]').hidden && document.querySelector('#otabs').scrollWidth <= document.querySelector('#otabs').clientWidth + 1), `#/challenges → Online’s ⚔️ Challenges sub-tab (the five sub-tabs fit) ${tag}`);
    await A.screenshot({ path: `lay/l527_online_${W}.png` });
    // the top bar stays out of games
    await A.goto(U + '#/draft?m=classic&s=goals&seed=l527'); await A.waitForTimeout(1200);
    ok(await A.evaluate(() => document.querySelector('.gm-status').hidden), `no top bar in a game ${tag}`);
    await ctx.close();
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); process.exit();
})();

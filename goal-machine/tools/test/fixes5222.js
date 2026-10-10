// 5.22.2: the weather clears at once when it stops (no clouds left behind), and a shared link opened in an Android
// browser offers to open in the app (an intent with the link as ?go=), which the app turns back into the page.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.goto(U + '#/today'); await pg.waitForTimeout(800);
  // rain over an element for a while, then stop it
  const n = await pg.evaluate(async () => {
    await GM.FX.ready(); const el = document.querySelector('#app');
    await GM.FX.weather('rain', () => el); await new Promise(r => setTimeout(r, 2500));
    const before = GM.FX._alive(); GM.FX.weather(null); await new Promise(r => setTimeout(r, 1500));
    return [before, GM.FX._alive()];
  });
  ok(n[0] > 5 && n[1] === 0, `rain and clouds clear within a second when the weather stops (${n[0]} → ${n[1]})`);
  ok(!(await pg.$('.app-bar')), 'no "open in the app" bar on a desktop browser');
  // an Android phone's browser
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
  await ctx2.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.goto(U); await p2.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await p2.goto(U + '#/online?join=ABCD'); await p2.reload(); await p2.waitForTimeout(800);
  const href = await p2.evaluate(() => { const a = document.querySelector('.app-bar a'); return a && a.getAttribute('href'); });
  ok(href && href.startsWith('intent://opportunisticgames.github.io/goal-machine/?go=%23%2Fonline%3Fjoin%3DABCD#Intent;scheme=https;package=goal.machine;'), 'a shared link on Android offers "Open in the app" with the link handed over: ' + href);
  await p2.screenshot({ path: 'lay/appbar.png' });
  // a friend's draft challenge ("beat my score") gets the bar too, saying whose challenge it is
  await p2.goto(U + '#/draft?m=classic&s=goals&seed=abc123&vs=Joel&vss=512'); await p2.reload(); await p2.waitForTimeout(1500);
  const ch = await p2.evaluate(() => { const b = document.querySelector('.app-bar'); return b && { t: b.textContent, h: b.querySelector('a').getAttribute('href') }; });
  ok(ch && /Joel’s challenge/.test(ch.t) && ch.h.includes(encodeURIComponent('#/draft?m=classic&s=goals&seed=abc123&vs=Joel&vss=512')), 'a draft challenge link offers to open in the app: ' + (ch && ch.t));
  await p2.screenshot({ path: 'lay/appbar_challenge.png' });
  await p2.click('.app-bar button'); ok(!(await p2.$('.app-bar')), '…and it can be closed');
  // the app receives /goal-machine/?go=%23%2F… and opens that page
  await p2.goto(U + '?go=' + encodeURIComponent('#/today')); await p2.waitForTimeout(800);
  ok(await p2.evaluate(() => location.hash === '#/today' && !location.search), 'the handed-over link opens the right page (?go= becomes the #)');
  // 5.22.3: van Gaal's reels bring players for the positions you still need (strikers for the strikers' spots), and he
  // can still put anyone anywhere outfield
  await pg.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('gm:draftp')).forEach(k => localStorage.removeItem(k)); GM._forceMgr = 'vangaal'; location.hash = '#/draft?m=chaos&seed=vg1'; });
  await pg.waitForSelector('.cm-pick [data-mgr="vangaal"]', { timeout: 8000 }); await pg.click('.cm-pick [data-mgr="vangaal"]'); await pg.waitForTimeout(800);
  const vg = [];
  for (let k = 0; k < 6; k++) {
    await pg.evaluate(() => {  // everything filled but the strikers
      const S = GM.draft.state();
      S.xi.forEach((x, i) => { if (x.p == null && x.pos !== 'ST') { const id = GM.players.findIndex((p, j) => p.poss.includes(x.pos) && !S.xi.some(y => y.p === j)); x.p = id; x.g = 1; x.base = 1; x.v = { goals: 1, assists: 0, apps: 1 }; } });
      S.phase = 'spin'; S.reels = []; S.pending = null; S.inv = []; S.forceEv = null; S.momentSpin = S.spin; S.chaosDue = false; S.meter = 0; S.spin++; GM.draft.render();
    });
    await pg.evaluate(() => { document.querySelectorAll('.cm').forEach(x => x.remove()); const b = document.getElementById('spin'); if (b) b.click(); });
    await pg.waitForTimeout(1600);
    vg.push(...await pg.evaluate(() => GM.draft.state().reels.filter(x => !x.wild && x.id != null).map(x => GM.players[x.id].poss.includes('ST'))));
  }
  ok(vg.length >= 6 && vg.every(Boolean), `van Gaal: with only the strikers' spots left, the reels bring strikers (${vg.filter(Boolean).length}/${vg.length})`);
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

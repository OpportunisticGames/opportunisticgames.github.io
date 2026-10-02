// 🌪️ CHAOS 5.17: keepers' clean sheets, the new wildcards (Physio Room, Joker, Hat-Trick Hero), the new events
// (streaker, VAR overturns it all, the pigeon's revenge), leftovers on the pitch, the tornado and the black hole,
// and a few managers' tweaks (van Gaal's positions, Conte's back three, Fergie time).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.goto(U);

  // keepers: real clean sheets in the data
  const gk = await pg.evaluate(() => { const c = GM.players.find(p => p.name === 'Petr Cech'), all = GM.players.filter(p => p.pos === 'G'); return { cech: c && c.cs, n: all.length, with: all.filter(p => p.cs > 0).length }; });
  ok(gk.cech === 202, `Petr Čech has 202 clean sheets (${gk.cech})`);
  ok(gk.with >= gk.n - 2, `${gk.with} of ${gk.n} keepers have clean sheets`);

  // a CHAOS game with a chosen manager; bring in a keeper by hand to check his number
  const game = async (mgr, seed) => {
    await pg.evaluate(() => Object.keys(localStorage).filter(x => x.startsWith('gm:draftp')).forEach(x => localStorage.removeItem(x)));
    await pg.evaluate(m => { GM._forceMgr = m; }, mgr);
    await pg.evaluate(s => { location.hash = '#/draft?m=chaos&seed=' + s; }, seed);
    await pg.waitForSelector('.cm-pick [data-mgr]');
    await pg.click(`.cm-pick [data-mgr="${mgr}"]`); await pg.waitForTimeout(500);
    return pg.evaluate(() => GM.draft.state().manager);
  };
  ok(await game('conte', 'newchaos1') === 'conte', 'Conte appointed');
  ok(await pg.evaluate(() => GM.draft.state().form.join(',')) === 'GK,CB,CB,CB,LM,CM,CM,RM,ST,ST,ST', 'Conte switches you to 3-4-3');

  // sign Čech straight into goal and check his CHAOS number (202 / 3 = 67)
  const placeKeeper = await pg.evaluate(() => {
    const S = GM.draft.state(), id = GM.players.findIndex(p => p.name === 'Petr Cech');
    S.reels = [{ id }]; S.phase = 'pick'; S.pending = 0; GM.draft.render();
    return id;
  });
  await pg.click('.slot.target'); await pg.waitForTimeout(2600);
  const keeper = await pg.evaluate(() => { const S = GM.draft.state(); const x = S.xi.find(s => s.pos === 'GK'); return x && x.g; });
  ok(keeper === 67, `Čech counts 67 goals in CHAOS (got ${keeper})`);

  // force every new event and the big moments with new animations; check leftovers stay on the pitch
  for (const ev of ['streaker', 'pigeon', 'splat', 'amnesty', 'tornado', 'blackhole', 'pies']) {
    // give him a few players so the moments have someone to hit
    await pg.evaluate(() => {
      const S = GM.draft.state();
      S.xi.forEach((x, i) => { if (x.p == null && i > 0 && i < 6) { const id = GM.players.findIndex((p, k) => p.poss.includes(x.pos) && !S.xi.some(y => y.p === k) && p.goals > 5); x.p = id; x.v = { goals: GM.players[id].goals, assists: GM.players[id].ast, apps: GM.players[id].apps }; x.g = x.v.goals; } });
      S.forceEv = null; S.phase = 'spin'; S.pending = null; S.reels = []; S.spin = Math.max(2, S.spin + 1); S.momentSpin = -1; S.spinRespins = 0; S.lastBig = -5; GM.draft.render();
    });
    await pg.evaluate(e => { GM.draft.state().forceEv = e; }, ev);
    await pg.click('#spin');
    await pg.waitForSelector('.cm', { timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(ev === 'tornado' || ev === 'blackhole' ? 1700 : 900);
    if (ev === 'tornado') { await pg.click('.cm'); await pg.waitForTimeout(1300); ok(!!(await pg.$('.cm-tornado')), 'the tornado is a real spinning funnel'); await pg.screenshot({ path: 'lay/chaos_tornado.png' }); }
    if (ev === 'blackhole') { await pg.click('.cm'); await pg.waitForTimeout(800); ok(!!(await pg.$('.cm-hole')), 'the black hole opens on the pitch'); await pg.screenshot({ path: 'lay/chaos_hole.png' }); }
    for (let k = 0; k < 40 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(250); }
    await pg.waitForTimeout(400);
    // wait out the spin and drop the reels so the next event can go
    for (let k = 0; k < 30; k++) { const ph = await pg.evaluate(() => GM.draft.state().phase); if (ph === 'pick') break; await pg.waitForTimeout(200); }
  }
  const st = await pg.evaluate(() => { const S = GM.draft.state(); return { mess: (S.mess || []).map(m => m.i).join(''), splat: (S.splat || []).length, shown: document.querySelectorAll('.mess i').length, hidden: document.querySelectorAll('.slot-goals.splatted').length, healed: S.xi.filter(x => x.mod === 'healed').length, moments: (S.moments || []).map(m => m.name) }; });
  console.log('  moments:', st.moments.join(' · '));
  ok(st.mess.includes('🩲') && st.mess.includes('🐦'), `leftovers stay on the pitch (${st.mess})`);
  ok(st.shown === [...st.mess].length || st.shown >= 5, `${st.shown} leftovers drawn on the pitch`);
  ok(st.splat >= 1 && st.hidden === st.splat, `the pigeon’s revenge covers ${st.splat} number(s)`);
  await pg.screenshot({ path: 'lay/chaos_mess.png' });

  // wildcards: the Physio Room heals the most-hurt player; the Joker becomes another card; Hat-Trick Hero
  const wild = await pg.evaluate(() => {
    const S = GM.draft.state(), i = S.xi.findIndex(x => x.p != null && x.pos !== 'GK');
    S.xi.forEach(x => { if (x.mod !== 'healed') x.mod = null; });  // only one hurt player
    const full = S.xi[i].v.goals; S.xi[i].g = 1; S.xi[i].v.goals = 1; S.xi[i].mod = 'injured';
    S.inv = ['physio', 'joker']; S.phase = 'spin'; GM.draft.render();
    return { i, full };
  });
  await pg.click('.wild-btn[data-w="0"]'); await pg.waitForTimeout(600);
  for (let k = 0; k < 30 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(250); }
  const healed = await pg.evaluate(i => GM.draft.state().xi[i], wild.i);
  ok(healed.mod === 'healed' && healed.g > 1, `🏥 Physio Room: back to ${healed.g} (was 1, injured)`);
  await pg.click('.wild-btn[data-w="0"]'); await pg.waitForTimeout(400);
  const jok = await pg.evaluate(() => GM.draft.state().inv[0]);
  ok(jok && jok !== 'joker', `🃏 the Joker turned into ${jok}`);

  const hero = await pg.evaluate(() => {
    const S = GM.draft.state(), big = GM.players.findIndex((p, k) => p.goals >= 80 && p.poss.includes('ST') && !S.xi.some(y => y.p === k));
    S.modifier = 'hero'; S.reels = [{ id: big }]; S.phase = 'pick'; S.pending = 0; GM.draft.render(); return GM.players[big];
  });
  await pg.click('.slot.target'); await pg.waitForTimeout(2600);
  const hs = await pg.evaluate(n => GM.draft.state().xi.find(x => x.p != null && GM.players[x.p].name === n), hero.name);
  ok(hs && hs.g === hero.goals * 3, `🎩 Hat-Trick Hero: ${hero.name} (${hero.goals}) counts ${hs && hs.g}`);

  // van Gaal: a striker can go in defence, at 80%
  await game('vangaal', 'newchaos2');
  const vg = await pg.evaluate(() => {
    const S = GM.draft.state(), id = GM.players.findIndex(p => p.poss.join() === 'ST' && p.goals >= 40);
    S.reels = [{ id }]; S.phase = 'pick'; S.pending = 0; GM.draft.render();
    return { id, g: GM.players[id].goals, cb: [...document.querySelectorAll('.slot.target')].map(e => S.xi[e.dataset.slot].pos) };
  });
  ok(vg.cb.includes('CB') && vg.cb.includes('ST'), `van Gaal: a striker can go anywhere outfield (${[...new Set(vg.cb)].join(' ')})`);
  await pg.evaluate(() => { const S = GM.draft.state(), i = S.xi.findIndex(x => x.pos === 'CB'); document.querySelector(`.slot[data-slot="${i}"]`).click(); });
  await pg.waitForTimeout(2600);
  const vgs = await pg.evaluate(id => GM.draft.state().xi.find(x => x.p === id), vg.id);
  ok(vgs && vgs.pos === 'CB' && vgs.g === Math.floor(vg.g * 0.8), `out of position at centre-back he counts 80% (${vgs && vgs.g} of ${vg.g})`);

  // the manager sheet and the help mention keepers
  await pg.click('#dugout'); await pg.waitForTimeout(300);
  ok((await pg.textContent('.modal')).includes('Philosophy'), 'the dugout shows van Gaal’s perk');
  await pg.screenshot({ path: 'lay/chaos_vangaal.png' });
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
})();

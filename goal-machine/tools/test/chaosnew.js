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
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.text().startsWith('{') && console.log('  page:', m.text()));
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
  let parkedAfterInjury = null;
  for (const ev of ['streaker', 'pigeon', 'splat', 'amnesty', 'tornado', 'blackhole', 'pies', 'injury', 'arrest', 'aliens', 'gamble', 'conscript', 'quake', 'fraud', 'breakup', 'wedding', 'stoke']) {
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
    if (ev === 'gamble') { await pg.waitForSelector('.fruit'); await pg.click('.fruit'); await pg.waitForTimeout(2600); ok(await pg.$$eval('.fruit-strip.stop', e => e.length) === 3, '🎰 the fruit machine spins and stops on three symbols'); }
    if (ev === 'quake') { await pg.click('.cm'); await pg.waitForTimeout(900); ok(!!(await pg.$('.crack.tearing')), '🌍 the earthquake tears a crack across the pitch'); }
    for (let k = 0; k < 40 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(250); }
    await pg.waitForTimeout(400);
    if (ev === 'injury') parkedAfterInjury = await pg.evaluate(() => ({ n: Object.values(GM.draft.state().parked || {}).filter(k => k === 'ambulance').length, drawn: document.querySelectorAll('.slot .parked svg').length }));
    // wait out the spin and drop the reels so the next event can go
    for (let k = 0; k < 30; k++) { const ph = await pg.evaluate(() => GM.draft.state().phase); if (ph === 'pick') break; await pg.waitForTimeout(200); }
  }
  const st = await pg.evaluate(() => { const S = GM.draft.state(); return { mess: (S.mess || []).map(m => m.i).join(''), splat: (S.splat || []).length, shown: document.querySelectorAll('.mess i').length, hidden: document.querySelectorAll('.slot-goals.splatted').length, healed: S.xi.filter(x => x.mod === 'healed').length, moments: (S.moments || []).map(m => m.name) }; });
  console.log('  moments:', st.moments.join(' · '));
  const veh = await pg.evaluate(() => { const S = GM.draft.state(); return { parked: Object.values(S.parked || {}), drawn: document.querySelectorAll('.slot .parked svg').length, ghost: S.ghost, filled: S.xi.filter(x => x.p != null).length }; });
  ok(parkedAfterInjury && parkedAfterInjury.n >= 1 && parkedAfterInjury.drawn >= 1, `🚑 the ambulance stays parked by the injured player (${parkedAfterInjury && parkedAfterInjury.drawn} drawn)`);
  ok(veh.ghost == null && st.moments.includes('Arrested!'), `🚔 arrested: his place is empty again (${veh.filled} signed)`);
  ok(st.mess.includes('#pants') && st.mess.includes('#pigeon') && st.mess.includes('#crack'), `leftovers stay on the pitch (${st.mess})`);
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

  // Hat-Trick: a spin of three players for one position, all signed as one with their numbers added up
  const trio = await pg.evaluate(() => {
    const S = GM.draft.state(); S.inv = ['hero']; S.phase = 'spin'; S.modifier = null; GM.draft.render(); return true;
  });
  await pg.click('.wild-btn[data-w="0"]');
  for (let k = 0; k < 40; k++) { if (await pg.evaluate(() => GM.draft.state().phase === 'pick')) break; await pg.waitForTimeout(150); }
  const t3 = await pg.evaluate(() => { const S = GM.draft.state(); return { pos: [...new Set(S.reels.filter(x => !x.wild).map(x => GM.players[x.id].poss.join('/')))], ids: S.reels.filter(x => !x.wild).map(x => x.id), special: S.special }; });
  await pg.click('.stage .reel[data-reel="0"]'); await pg.waitForTimeout(300);
  await pg.click('.slot.target'); await pg.waitForTimeout(2800);
  const ts = await pg.evaluate(ids => { const S = GM.draft.state(), x = S.xi.find(s => s.trio && s.trio.length === 3); const sum = ids.reduce((a, id) => a + GM.players[id].goals + (GM.players[id].pos === 'G' && GM.players[id].cs ? Math.floor(GM.players[id].cs / 3) : 0), 0); return x && { g: x.g, sum, mod: x.mod, used: ids.every(id => S.used.includes(id)) }; }, t3.ids);
  ok(t3.special === 'hero' && ts && ts.used, `🎩 Hat-Trick: three players signed as one (${t3.pos.join(', ')})`);
  ok(ts && ts.g === (ts.sum < 50 ? Math.floor(ts.sum * 0.5) : ts.sum), `…their goals added up: ${ts && ts.sum}${ts && ts.sum < 50 ? ', under 50 so half' : ''} → ${ts && ts.g}`);

  // the armband passes down in CHAOS: ×2, then ×1.5, then ×1.25
  const caps = [];
  for (let n = 0; n < 3; n++) {
    const r = await pg.evaluate(() => {
      const S = GM.draft.state(), id = GM.players.findIndex((p, k) => p.goals >= 20 && p.goals <= 300 && p.poss.some(x => S.xi.some(y => y.p == null && y.pos === x)) && !S.used.includes(k) && !S.xi.some(y => y.p === k));
      S.inv = ['captain']; S.modifier = null; S.phase = 'spin'; GM.draft.render(); return id;
    });
    await pg.click('.wild-btn[data-w="0"]'); await pg.waitForTimeout(200);
    await pg.evaluate(id => { const S = GM.draft.state(); S.reels = [{ id }]; S.phase = 'pick'; S.pending = 0; GM.draft.render(); }, r);
    await pg.click('.slot.target'); await pg.waitForTimeout(2700);
    caps.push(await pg.evaluate(id => { const x = GM.draft.state().xi.find(s => s.p === id); return +(x.g / GM.players[id].goals).toFixed(2); }, r));
  }
  ok(caps[0] >= 1.95 && caps[1] >= 1.45 && caps[1] < 1.55 && caps[2] >= 1.2 && caps[2] < 1.3, `©️ the armband passes down: ×${caps.join(', ×')}`);

  // van Gaal: a striker can go in defence, at 80%
  await game('vangaal', 'newchaos2');
  const vg = await pg.evaluate(() => {
    const S = GM.draft.state(), id = GM.players.findIndex(p => p.poss.join() === 'ST' && p.goals >= 40);
    S.reels = [{ id }]; S.phase = 'pick'; S.pending = 0; GM.draft.render();
    return { id, g: GM.players[id].goals, cb: [...document.querySelectorAll('.slot.target')].map(e => S.xi[e.dataset.slot].pos) };
  });
  ok(vg.cb.includes('CB') && vg.cb.includes('ST'), `van Gaal: a striker can go anywhere outfield (${[...new Set(vg.cb)].join(' ')})`);
  const themed = await pg.evaluate(id => {
    const S = GM.draft.state(); S.special = 'centurion'; GM.draft.render();
    const t = [...document.querySelectorAll('.slot.target')].map(e => S.xi[e.dataset.slot].pos); S.special = null; GM.draft.render(); return t;
  }, vg.id);
  ok(themed.length && themed.every(p => p === 'ST'), `…but not on a Centurion Throw: only up front (${[...new Set(themed)].join(' ')})`);
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

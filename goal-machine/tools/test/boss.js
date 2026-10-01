// 📋 Club Boss: the intro and managers, the XI and the market, swaps (who makes way, the budget, two a week), a
// matchweek (score, scorers, ratings, values, the table), the save, sacking, the final table and board, Hard and
// Extreme, and a balance check (a smart chairman finishes well above one who does nothing).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const fresh = async (extra = {}) => {
    await pg.goto(U);
    await pg.evaluate(x => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false); set('club', 'Everton');
      Object.entries(x).forEach(([k, v]) => set(k, v)); }, extra);
    await pg.reload(); await pg.waitForTimeout(400);
  };
  await fresh({ homeTab: 'market' });
  ok(!!(await pg.$('a.tile[href="#/boss"]')) && /NEW/.test(await pg.textContent('a.tile[href="#/boss"]')), 'Club Boss is on the Market tab, tagged NEW');

  await pg.goto(U + '#/boss'); await pg.waitForTimeout(400);
  ok(/Take over a club/.test(await pg.textContent('#app')) && (await pg.$$('[data-mgr]')).length === 3, 'it starts with the idea and a choice of three managers');
  await pg.evaluate(() => { const b = [...document.querySelectorAll('[data-mgr]')].find(x => x.dataset.mgr !== 'scout') || document.querySelector('[data-mgr]'); b.click(); });
  await pg.waitForTimeout(400);
  const st = await pg.evaluate(() => { const S = GM.store.get('boss:save:boss'); return { xi: S.xi.length, shape: ['G', 'D', 'M', 'F'].map(g => S.xi.filter(x => x.g === g).length).join(''), club: S.club, ovr: GM.bossCore.teamOvr(S), men: document.querySelectorAll('.cb-man').length, cash: S.cash, mgr: S.mgr }; });
  ok(st.xi === 11 && st.shape === '1442' && st.men === 11 && st.club === 'Everton', `your club (${st.club}), a full XI in a 4-4-2 on the pitch (team OVR ${st.ovr})`);
  ok(st.ovr >= 63 && st.ovr <= 73 && st.cash === 40 && /50|\d\d% win/.test(await pg.textContent('.cb-odds')), 'a mid-table team, £40m, and the next match with the odds');
  ok(/–/.test(await pg.textContent('.cb-stats')), 'no league position before a ball’s kicked');

  // a swap: tap a player, then a market player in his position
  const fi = await pg.evaluate(() => GM.store.get('boss:save:boss').xi.findIndex(x => x.g === 'F'));
  await pg.click(`[data-man="${fi}"]`); await pg.waitForTimeout(250);
  ok(!!(await pg.$('.cb-man.pick')) && await pg.$eval('.cb-tabs .on', e => e.dataset.tab) === 'F' && /Replacing/.test(await pg.textContent('.cb-picking')), 'tapping a player picks him and opens the market at his position');
  const sw = await pg.evaluate(fi => {
    const S = GM.store.get('boss:save:boss'), x = S.xi[fi], sale = x.value * (S.mgr === 'dealer' ? 1 : 0.9);
    const mi = S.market.F.findIndex(o => o.ask <= S.cash + sale);
    const o = S.market.F[mi]; document.querySelector(`[data-buy="${mi}"]`).click();
    const T = GM.store.get('boss:save:boss');
    return { ok: T.xi[fi].k === o.k && Math.abs(T.cash - (S.cash + sale - o.ask)) < 0.11, swaps: T.swaps, outBack: T.market.F.some(m => m.k === x.k) };
  }, fi);
  await pg.waitForTimeout(300);
  ok(sw.ok && sw.swaps === 1, 'signing him swaps him in, sells the old one and settles the budget');
  ok(sw.outBack, 'the player you sold turns up on the market');
  // a swap from the market first: the "who makes way?" box
  await pg.click('[data-tab="M"]'); await pg.waitForTimeout(200);
  const cheap = await pg.evaluate(() => { const S = GM.store.get('boss:save:boss'); let k = 0; S.market.M.forEach((o, i) => { if (o.ask < S.market.M[k].ask) k = i; }); return k; });
  await pg.click(`[data-buy="${cheap}"]`); await pg.waitForTimeout(300);
  ok((await pg.$$('.modal-wrap [data-out]')).length === 4, 'signing from the market asks which of your four midfielders makes way');
  const pick = await pg.evaluate(() => { const b = [...document.querySelectorAll('.modal-wrap [data-out]')].find(x => !x.disabled); if (b) b.click(); else document.querySelector('.modal-wrap [data-close]').click(); return !!b; });
  await pg.waitForTimeout(300);
  ok(pick, 'you can afford the cheapest midfielder by selling one of yours');
  if (pick) {
    await pg.click('[data-tab="D"]'); await pg.waitForTimeout(200);
    await pg.click('[data-buy="0"]'); await pg.waitForTimeout(300);
    ok(!(await pg.$('.modal-wrap [data-out]')) && /No transfers left/.test(await pg.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join())), 'two transfers a week, then the window’s shut till next week');
  }
  // a matchweek
  await pg.click('#cbplay'); await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => { const S = GM.store.get('boss:save:boss'), res = S.results[0], t = S.teams[0];
    return { phase: S.phase, sl: !!document.querySelector('.cb-sl'), rates: document.querySelectorAll('.cb-rate').length, pts: t.p, res: res.res, gf: res.gf, scorers: res.goals.length, table: document.querySelectorAll('.cb-table .cb-tr:not(.head)').length, played: S.teams.every(x => x.w + x.d + x.l === 1), hist: S.xi.filter(x => x.hist.length === 1).length }; });
  ok(r.phase === 'result' && r.sl && r.rates === 11 && r.table === 10, `the matchweek: a score, every player rated, the table (${r.res}, ${r.gf} scored)`);
  ok(r.played && r.pts === { W: 3, D: 1, L: 0 }[r.res] && r.scorers === r.gf && r.hist === 11, 'everyone’s played once, points are right, every goal has a scorer, ratings saved');
  // leaving and coming back
  await pg.goto(U + '#/'); await pg.goto(U + '#/boss'); await pg.waitForTimeout(400);
  ok(!!(await pg.$('#cbnext')), 'leaving and coming back carries on where you were');
  await pg.click('#cbnext'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => GM.store.get('boss:save:boss').week === 2 && GM.store.get('boss:save:boss').swaps === 0) && !!(await pg.$('#cbsack')), 'week 2: transfers reset, and you can sack the manager');
  // sacking
  await pg.click('#cbsack'); await pg.waitForTimeout(250);
  await pg.evaluate(() => [...document.querySelectorAll('.modal-wrap button')].find(b => /Sack/.test(b.textContent)).click()); await pg.waitForTimeout(250);
  const before = await pg.evaluate(() => GM.store.get('boss:save:boss'));
  await pg.evaluate(() => document.querySelector('.modal-wrap [data-mgr]').click()); await pg.waitForTimeout(300);
  const after = await pg.evaluate(() => GM.store.get('boss:save:boss'));
  ok(after.mgr !== before.mgr && Math.abs(before.cash - after.cash - 4) < 0.01 && after.bounce === 1 && /bounce/.test(await pg.textContent('.cb-next')), 'sacking the manager costs £4m, brings in a new one and a bounce (+4 next game)');
  // play out the season
  for (let w = 2; w <= 9; w++) { await pg.click('#cbplay'); await pg.waitForTimeout(250); await pg.click('#cbnext'); await pg.waitForTimeout(250); }
  await pg.waitForTimeout(800);
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  const fin = await pg.evaluate(() => { const S = GM.store.get('boss:save:boss'), t = S.teams[0]; return { over: S.phase === 'over', verdict: (document.querySelector('.cb-verdict b') || {}).textContent, best: GM.best('boss'), pts: t.p, gd: t.gf - t.ga, played: S.teams.every(x => x.w + x.d + x.l === 9), shown: GM.scoreText('boss', GM.best('boss')) }; });
  ok(fin.over && fin.played && !!fin.verdict, `full time: everyone’s played 9, the final table and the board’s verdict (“${fin.verdict}”)`);
  ok(fin.best === fin.pts * 100 + Math.max(0, Math.min(99, fin.gd + 50)) && fin.shown === fin.pts + (fin.pts === 1 ? ' pt' : ' pts'), `the score is your points (${fin.shown}), with goal difference breaking ties`);
  await pg.goto(U + '#/'); await pg.goto(U + '#/boss'); await pg.waitForTimeout(400);
  ok(!!(await pg.$('.cb-verdict')) && !!(await pg.$('a[href="#/boss?new=1"]')), 'coming back shows the final table, with New season');
  await pg.click('a[href="#/boss?new=1"]'); await pg.waitForTimeout(400);
  ok((await pg.$$('[data-mgr]')).length === 3, 'New season starts afresh');

  // Hard and Extreme
  await fresh({ level: 'hard' });
  await pg.goto(U + '#/boss'); await pg.waitForTimeout(400); await pg.click('[data-mgr]'); await pg.waitForTimeout(400);
  ok(/Hard/.test(await pg.textContent('.topbar h2')) && await pg.$eval('.lb-btn', e => e.dataset.lb) === 'bossh' && (await pg.$$('.cb-market .cb-ovr.q')).length > 0 && !(await pg.$('.cb-market .flag')), 'Hard: its own board, the market hides OVR (judge by form) and clubs');
  await fresh({ level: 'extreme' });
  await pg.goto(U + '#/boss'); await pg.waitForTimeout(2200); await pg.click('[data-mgr]'); await pg.waitForTimeout(400);
  const ex = await pg.evaluate(() => { const S = GM.store.get('boss:save:bossx'); return S.xi.concat(Object.values(S.market).flat()).filter(x => !GM.byPk.has(x.k)).length; });
  ok(/Extreme/.test(await pg.textContent('.topbar h2')) && ex > 0, `Extreme: every PL player (${ex} in the squad and market from outside the 50+ list)`);

  // balance: doing nothing vs upgrading what you can afford
  const sim = await pg.evaluate(() => {
    const C = GM.bossCore;
    function season(seed, smart) {
      const S = C.newSeason(seed, 'normal', 'prof');
      for (let w = 1; w <= C.WEEKS; w++) {
        if (smart) for (let t = 0; t < 2; t++) {
          let best = null;
          for (const g of ['G', 'D', 'M', 'F']) S.market[g].forEach((o, mi) => S.xi.forEach((x, i) => {
            if (x.g !== g) return; const gain = C.ovr(GM.anyByPk(o.k)) - C.ovr(GM.anyByPk(x.k));
            if (S.cash + x.value * 0.9 >= o.ask && gain > 0 && (!best || gain > best.gain)) best = { i, g, mi, gain };
          }));
          if (best) C.swap(S, best.i, best.g, best.mi);
        }
        C.playWeek(S); C.nextWeek(S);
      }
      return C.position(S);
    }
    const avg = smart => { let t = 0; for (let i = 0; i < 80; i++) t += season('bal' + i, smart); return Math.round(t / 8) / 10; };
    return { none: avg(false), smart: avg(true) };
  });
  ok(sim.none >= 6.5 && sim.smart <= sim.none - 2, `balance: doing nothing finishes ~${sim.none}th, upgrading what you can afford ~${sim.smart}th`);
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

// 🎃 5.27.1: a themed CHAOS for every season. For each season: the kick-off says so, the screen takes its colours, each of
// its three moments plays on the pitch, both its wildcards play, and other seasons' cards and moments never turn up.
//   node chaosseasons.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:calm', 'false'); });
  await pg.goto(U); await pg.waitForTimeout(800);
  const themes = await pg.evaluate(() => Object.keys(GM.SZ_CHAOS));
  ok(themes.length === 9, `nine seasons have their own CHAOS: ${themes.join(', ')}`);
  for (const th of themes) {
    await pg.evaluate(() => Object.keys(localStorage).filter(x => x.startsWith('gm:draftp')).forEach(x => localStorage.removeItem(x)));
    await pg.evaluate(t => { GM._forceSz = t; GM._forceMgr = 'klopp'; location.hash = '#/'; }, th);
    await pg.evaluate(t => { location.hash = '#/draft?m=chaos&seed=sz' + t; }, th);
    await pg.waitForSelector('.cm-pick [data-mgr]');
    const kick = await pg.evaluate(t => ({ text: document.querySelector('.cm').textContent, cz: document.body.dataset.cz, name: GM.SZ_CHAOS[t].name }), th);
    ok(kick.text.includes(kick.name.replace(/^\S+ /, '')) && kick.cz === th, `${kick.name}: the kick-off says so and the screen takes its colours`);
    if (th === 'halloween' || th === 'christmas') await pg.screenshot({ path: `lay/sz_${th}_kickoff.png` });
    await pg.click('.cm-pick [data-mgr="klopp"]'); await pg.waitForTimeout(500);
    // others' never show; its own do
    const pool = await pg.evaluate(t => { const W = GM.draft.WILDCARDS, mine = Object.keys(W).filter(k => W[k].sz === t), others = Object.keys(W).filter(k => W[k].sz && W[k].sz !== t);
      return { mine: mine.every(GM.szInSeason), others: !others.some(GM.szInSeason), n: mine.length }; }, th);
    ok(pool.mine && pool.others && pool.n === 2, `${th}: its 2 wildcards are in the bag, no other season's`);
    const evs = await pg.evaluate(t => GM.draft.events().filter(k => k.startsWith('sz_') && GM.szInSeason(k)), th);
    for (const ev of evs) {
      await pg.evaluate(() => {
        const S = GM.draft.state();
        S.xi.forEach((x, i) => { if (x.p == null && i < 7) { const id = GM.players.findIndex((p, k) => p.poss.includes(x.pos) && !S.xi.some(y => y.p === k) && (p.goals > 3 || x.pos === 'GK')); if (id < 0) return; x.p = id; x.v = { goals: GM.players[id].goals, assists: GM.players[id].ast, apps: GM.players[id].apps }; x.g = x.v.goals; S.last = id; } });
        S.forceEv = null; S.phase = 'spin'; S.pending = null; S.reels = []; S.spin = Math.max(2, S.spin + 1); S.momentSpin = -1; S.spinRespins = 0; S.lastBig = -5; GM.draft.render();
      });
      await pg.evaluate(e => { GM.draft.state().forceEv = e; }, ev);
      await pg.click('#spin');
      await pg.waitForSelector('.cm', { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(700);
      const card = await pg.evaluate(() => (document.querySelector('.cm') || {}).textContent || '');
      if (ev === 'sz_witch') await pg.screenshot({ path: 'lay/sz_witch.png' });
      for (let k = 0; k < 40 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(250); }
      for (let k = 0; k < 30; k++) { const ph = await pg.evaluate(() => GM.draft.state().phase); if (ph === 'pick') break; await pg.waitForTimeout(200); }
      const name = await pg.evaluate(e => { const x = GM.draft.state(); return (x.moments || []).length; }, ev);
      ok(card.length > 20 && !/undefined|NaN/.test(card), `${th} · ${ev.slice(3)}: “${card.replace(/\s+/g, ' ').trim().slice(0, 90)}…”`);
    }
    // both wildcards play
    for (const w of await pg.evaluate(t => Object.keys(GM.draft.WILDCARDS).filter(k => GM.draft.WILDCARDS[k].sz === t), th)) {
      const r = await pg.evaluate(async w => {
        const S = GM.draft.state(); S.inv = [w]; S.modifier = null; S.phase = 'spin'; S.pending = null; S.reels = []; GM.draft.render();
        const before = { spin: S.spin, mod: S.modifier, hot: S.hot || 0 };
        document.querySelector('.wild-btn[data-w="0"]').click();
        await new Promise(res => setTimeout(res, 2200));
        const W = GM.draft.WILDCARDS[w];
        return { kind: W.kind, played: !S.inv.includes(w), mod: S.modifier, as: W.as, hot: S.hot || 0, before, reels: (S.reels || []).length, filterOk: !W.filter || (S.reels || []).filter(x => x.id != null).every(x => W.filter(GM.players[x.id] || (GM.allPlayers || [])[x.id] || {}, S.st)) };
      }, w);
      const good = r.played && (r.kind === 'modifier' ? r.mod === (r.as || w) : r.kind === 'hot' ? r.hot >= r.before.hot + 3 : r.reels > 0 && r.filterOk);
      ok(good, `${th} · ${await pg.evaluate(w => GM.draft.WILDCARDS[w].icon + ' ' + GM.draft.WILDCARDS[w].name, w)} plays (${r.kind}${r.as ? ' as ' + r.as : ''}${r.reels ? ', ' + r.reels + ' on the reels' : ''})`);
      await pg.evaluate(() => { const S = GM.draft.state(); S.modifier = null; S.hot = 0; });
      for (let k = 0; k < 20 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(250); }
    }
  }
  // the season goes with a challenge
  ok(await pg.evaluate(() => GM.draft.game().sz === 'summer'), 'a challenge carries its season, so a friend gets the same chaos');
  await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => !document.body.dataset.cz), 'leaving CHAOS takes the season’s colours with it');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''));
  await b.close();
})();

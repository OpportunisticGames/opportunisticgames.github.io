// 🎃 5.27.1: a themed CHAOS for every season. For each season: the kick-off says so, the screen takes its colours, each of
// its three moments plays on the pitch, both its wildcards play, and other seasons' cards and moments never turn up.
//   node chaosseasons.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const U = 'http://localhost:8765/goal-machine/';
const { fast, idle } = require('./helpers');  // Calm on and the game's timers 10× faster: this checks the rules, not the look
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await fast(ctx);
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.goto(U); await pg.waitForTimeout(800);
  // normal CHAOS stays normal: no season, the usual managers
  await pg.evaluate(() => { GM._forceSz = 'halloween'; location.hash = '#/draft?m=chaos&seed=plain1'; });
  await pg.waitForSelector('.cm-pick [data-mgr]');
  const plain = await pg.evaluate(() => ({ cz: document.body.dataset.cz || '', mgrs: [...document.querySelectorAll('.cm-pick [data-mgr]')].map(b => b.dataset.mgr), sz: GM.draft.state().sz, mode: GM.draft.state().mode }));
  ok(!plain.cz && !plain.sz && plain.mgrs.every(k => !k.startsWith('szm_')), `normal CHAOS stays normal: the usual managers (${plain.mgrs.join(', ')}), no seasonal cards`);
  await pg.evaluate(() => { location.hash = '#/'; GM._forceSz = null; }); await pg.waitForTimeout(300);
  const themes = await pg.evaluate(() => Object.keys(GM.SZ_CHAOS));
  const bases = await pg.evaluate(() => Object.fromEntries(Object.entries(GM.draft.MANAGERS()).filter(([, m]) => m.base).map(([k, m]) => [k, m.base])));
  const GM_base = k => bases[k];
  ok(Object.keys(bases).length === 54, `54 seasonal characters, six a season (three offered each game)`);
  ok(themes.length === 9, `nine seasons have their own CHAOS: ${themes.join(', ')}`);
  for (const th of themes) {
    await pg.evaluate(() => Object.keys(localStorage).filter(x => x.startsWith('gm:draftp')).forEach(x => localStorage.removeItem(x)));
    await pg.evaluate(t => { GM._forceSz = t; GM._forceMgr = null; location.hash = '#/'; }, th);
    await pg.evaluate(t => { location.hash = '#/draft?m=szchaos&seed=sz' + t; }, th);
    await pg.waitForSelector('.cm-pick [data-mgr]');
    const kick = await pg.evaluate(t => ({ text: document.querySelector('.cm').textContent, cz: document.body.dataset.cz, name: GM.SZ_CHAOS[t].name }), th);
    ok(kick.text.includes(kick.name.replace(/^\S+ /, '')) && kick.cz === th, `${kick.name}: the kick-off says so and the screen takes its colours`);
    if (th === 'halloween' || th === 'christmas') await pg.screenshot({ path: `lay/sz_${th}_kickoff.png` });
    // the dugout is the season's characters, each playing by a real manager's rules
    const offer = await pg.evaluate(() => [...document.querySelectorAll('.cm-pick [data-mgr]')].map(b => b.dataset.mgr));
    const names = await pg.evaluate(o => o.map(k => GM.draft.MANAGERS()[k].name), offer);
    ok(offer.length === 3 && offer.every(k => k.startsWith('szm_')), `${th}: the managers are the season's characters (${names.join(', ')})`);
    // the one based on Redknapp / Conte proves the rules come with him
    const pickK = offer.find(k => ['redknapp', 'conte'].includes(GM_base(k))) || offer[0];
    await pg.click(`.cm-pick [data-mgr="${pickK}"]`); await idle(pg);
    const ap = await pg.evaluate(() => { const S = GM.draft.state(), m = GM.draft.MANAGERS()[S.manager]; return { base: m.base, inv: S.inv.length, form: S.form.filter(p => p === 'CB').length }; });
    if (ap.base === 'redknapp') ok(ap.inv === 3, `${th}: ${names[offer.indexOf(pickK)]} hands out Redknapp's three wildcards at kick-off`);
    if (ap.base === 'conte') ok(ap.form === 3, `${th}: ${names[offer.indexOf(pickK)]} switches to a back three, like Conte`);
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
      await pg.waitForSelector('.cm .cm-text', { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(120);
      const card = await pg.evaluate(() => (document.querySelector('.cm') || {}).textContent || '');
      if (ev === 'sz_witch') await pg.screenshot({ path: 'lay/sz_witch.png' });
      await idle(pg);
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
      await idle(pg);
    }
  }
  ok(await pg.evaluate(() => GM.draft.game().sz === 'summer'), 'a challenge carries its season, so a friend gets the same chaos');
  // its own leaderboard, and turned up
  const op = await pg.evaluate(() => { const S = GM.draft.state(), M = GM.draft.MANAGERS(); return { key: GM.draft.modeKey('szchaos', 'goals', false), hard: GM.draft.modeKey('szchaos', 'goals', false), sz: S.sz, perk: Object.values(M).filter(m => m.sz).every(m => true) }; });
  ok(op.key === 'szchaos', 'Seasonal CHAOS scores go on their own board (szchaos), not the CHAOS one');
  // the rewards: season XP, the mission, the title (5 games this month), the Season page card, the Home card
  await pg.evaluate(() => { GM._forceSz = null; location.hash = '#/'; }); await pg.waitForTimeout(400);
  const rw = await pg.evaluate(() => { const z = GM.gmSeason(), xp0 = GM.seasonInfo().xp; const m0 = GM.missions().find(m => m.ev === 'szchaos');
    for (let k = 0; k < 5; k++) GM.szChaosDone(z.theme); GM.lockerCheck(true);
    const m1 = GM.missions().find(m => m.ev === 'szchaos');
    return { theme: z.theme, xp: GM.seasonInfo().xp - xp0, mission: !!m0, mdone: m1 && m1.done, title: GM.lockerHas('title-witch'), later: GM.lockerHas('title-boxing'), count: GM.szChaosCount() }; });
  ok(rw.mission && rw.mdone, 'a weekly mission is always this season’s CHAOS (done after 3 games)');
  ok(rw.xp >= 300 && rw.count === 5, `each game of it gives season XP (+${rw.xp} for 5, the mission included)`);
  ok(rw.theme !== 'halloween' || (rw.title && !rw.later), '5 games of Halloween CHAOS earn the “Witch Hunter” title (Christmas’s stays hidden)');
  await pg.goto(U + '#/locker?v=season'); await pg.waitForTimeout(600);
  ok(/Halloween CHAOS/.test(await pg.textContent('.szc-card')), 'the Season page has this month’s CHAOS: XP, the title, a way in');
  await pg.screenshot({ path: 'lay/sz_seasoncard.png' });
  await pg.goto(U + '#/locker?v=kit&k=title'); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => { const t = [...document.querySelectorAll('.lk-item')].map(b => b.dataset.id); return t.includes('title-witch') && !t.includes('title-boxing'); }), 'the Locker shows this season’s CHAOS title, not next season’s');
  await pg.goto(U + '#/'); await pg.waitForTimeout(500);
  ok(/Headline event/.test(await pg.textContent('.chaos-card .kicker')) && /Halloween CHAOS/.test(await pg.textContent('.sz-chaos-card')) && !!(await pg.$('.sz-chaos-card a[href*="m=szchaos"]')), 'Home keeps normal CHAOS and has Seasonal CHAOS as its own card');
  await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => !document.body.dataset.cz), 'leaving CHAOS takes the season’s colours with it');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''));
  await b.close();
})();

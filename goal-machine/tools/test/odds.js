// The odds on the reels, measured with the game's own dealing code: for every draft mode and difficulty, thousands of
// first spins, then who turned up compared with what the game tells players ("all equally likely", "the better known
// turn up more", "Hard: big names less often", "every one of the 5,000+", wildcard and storm rates).
//   node odds.js [spins per mode, default 4000]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const N = +process.argv[2] || 4000, ONLY = process.argv[3];
const U = 'http://localhost:8765/goal-machine/';
const CONFIGS = [
  // [label, mode, hard, extreme]
  ['Ultimate · Normal', 'ultimate', false, false], ['Ultimate · Hard', 'ultimate', true, false],
  ['Ultimate (no wildcards)', 'ultimatepure', false, false],
  ['Classic · Normal', 'classicwild', false, false], ['Classic · Hard', 'classicwild', true, false],
  ['Extreme', 'extreme', false, true], ['Purist', 'purist', false, true],
  ['CHAOS · Normal', 'chaos', false, false], ['CHAOS · Hard', 'chaos', true, false], ['CHAOS · Extreme', 'chaosx', false, true],
  ['Seasonal CHAOS', 'szchaos', false, false],
  ['Target · Normal', 'target', false, false], ['Target · Hard', 'target', true, false], ['Target · Extreme', 'target', false, true],
];
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext();
  await ctx.route(/supabase|transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:calm', 'true'); });
  const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('page error', e.message));
  await pg.goto(U); await pg.waitForTimeout(800);
  // a copy of the draft engine with makeReels reachable (the page's own copy is left alone)
  await pg.evaluate(async () => {
    const src = await (await fetch('js/draft.js')).text();
    const hooked = src.replace('GM.draft = {', 'GM.draft = { makeReels: sp => makeReels(sp), ');
    if (hooked === src) throw new Error('hook not found');
    (0, eval)(hooked);
    await GM.loadAll();
  });
  const rows = [];
  for (const [label, mode, hard, extreme] of CONFIGS.filter(c => !ONLY || ONLY.split(',').includes(c[1]))) {
    const r = await pg.evaluate(async ([mode, hard, extreme, N]) => {
      const root = document.getElementById('app');
      GM.draft.start(root, mode, { seed: 'odds', stat: mode === 'target' ? 'goals' : undefined, hard, extreme });
      await new Promise(f => setTimeout(f, 300));
      const S = GM.draft.state(), pool = S.rules.all ? GM.allPlayers : GM.players;
      const seen = new Map(); let reels = 0, wildSpins = 0, wildReels = 0, storms = 0, stormTries = 0, fifty = 0;
      S.manager = null; S.momentSpin = -1;
      if (S.rules.sz) S.sz = GM.gmSeason().theme;   // (set at kick-off in a real game)
      for (let i = 0; i < N; i++) {  // first spins: players only
        S.seed = 'odds' + i; S.spin = 0; S.spinRespins = 0; S.special = null;
        for (const x of GM.draft.makeReels()) if (x.id != null) { reels++; seen.set(x.id, (seen.get(x.id) || 0) + 1); if (pool[x.id].apps >= 50) fifty++; }
        // later spins: wildcards (spin 1+) and storms (CHAOS, spin 2+)
        S.spin = 1 + (i % 9);
        const w = GM.draft.makeReels(); const nw = w.filter(x => x.wild).length;
        if (S.storm) { storms++; } else { if (nw) wildSpins++; wildReels += nw; }
        if (S.spin >= 2) stormTries++;
      }
      S.seed = 'odds'; S.spin = 0;
      // stars v the average: how often the 20 best-known players turn up, per player, compared with a typical player
      const byFame = pool.slice().sort((a, b) => b.fame - a.fame), top = byFame.slice(0, 20), perPlayer = reels / pool.length;
      const topRate = top.reduce((t, p) => t + (seen.get(p.id) || 0), 0) / top.length / perPlayer;
      const bottom = byFame.slice(-Math.floor(pool.length / 2));   // the less-known half
      const bottomShare = bottom.reduce((t, p) => t + (seen.get(p.id) || 0), 0) / reels;
      // evenness: compare each tenth of the pool (by fame) with its fair share
      const dec = []; for (let d = 0; d < 10; d++) { const part = byFame.slice(Math.floor(d * pool.length / 10), Math.floor((d + 1) * pool.length / 10)); dec.push(part.reduce((t, p) => t + (seen.get(p.id) || 0), 0) / reels / (part.length / pool.length)); }
      const shearer = pool.find(p => p.name === 'Alan Shearer');
      return { pool: pool.length, poolMin: Math.min(...pool.map(p => p.apps)), distinct: seen.size, topRate, bottomShare, dec, fifty: fifty / reels,
        shearer: shearer ? (seen.get(shearer.id) || 0) / perPlayer : null, wildSpins: wildSpins / (N - storms), wildReels: wildReels / (N - storms), storms: storms / stormTries, wildOn: S.rules.wild !== false, chaos: !!S.rules.chaos };
    }, [mode, hard, extreme, N]);
    rows.push([label, r]);
    console.log(`${label.padEnd(24)} pool ${String(r.pool).padStart(5)} (min ${r.poolMin} apps)  top-20 stars ×${r.topRate.toFixed(1)}  Shearer ×${r.shearer == null ? '–' : r.shearer.toFixed(1)}  lesser-known half ${(r.bottomShare * 100).toFixed(0)}%  50+ apps ${(r.fifty * 100).toFixed(0)}%  ` +
      `tenths ${r.dec.map(x => x.toFixed(1)).join(' ')}` + (r.wildOn ? `  wildcard on ${(r.wildSpins * 100).toFixed(0)}% of spins` : '  no wildcards') + (r.chaos ? `  storms ${(r.storms * 100).toFixed(1)}%` : ''));
  }
  require('fs').writeFileSync('lay/odds.json', JSON.stringify(rows, null, 1));
  await b.close();
})();

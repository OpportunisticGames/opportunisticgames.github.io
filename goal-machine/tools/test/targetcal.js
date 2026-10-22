// Tune the Target games' TARGET_W (draft.js): for each level and stat, play whole games with the real dealing code at a
// range of fame exponents and report how often a sensible bot lands within 5% of the target.
//   node targetcal.js [games, default 200] [levels, e.g. easy,normal] [stats] [exponents, e.g. 0.5,1,1.5]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const N = +process.argv[2] || 200;
const LV = (process.argv[3] || 'easy,normal,hard,extreme').split(','), ST = (process.argv[4] || 'goals,assists,apps').split(',');
const EX = (process.argv[5] || '0.25,0.5,0.75,1,1.25,1.5,2').split(',').map(Number);
const NOISE = { easy: 0.08, normal: 0.35, hard: 0.6, extreme: 0.6 };  // how well you can judge a number on that level
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext();
  await ctx.route(/supabase|transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:calm', 'true'); });
  const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('http://localhost:8765/goal-machine/'); await pg.waitForTimeout(800);
  await pg.evaluate(async () => {
    const src = await (await fetch('js/draft.js')).text();
    (0, eval)(src.replace('GM.draft = {', 'GM.draft = { makeReels: sp => makeReels(sp), pvOf: p => pv(p), '));
    await GM.loadAll();
    window.playT = (level, stat, e, N, noise) => {
      GM._tw = { [level]: { [stat]: e } };
      const opts = { easy: level === 'easy', hard: level === 'hard', extreme: level === 'extreme' };
      const root = document.getElementById('app'), PA = {}, res = [];
      const gauss = rnd => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
      for (let g = -40; g < N; g++) {   // (the first 40 only teach the bot what each position brings)
        GM.draft.start(root, 'target', { seed: (opts.easy ? 'e~' : '') + 'tc' + g, stat, ...opts });
        const S = GM.draft.state(), pool = S.rules.all ? GM.allPlayers : GM.players, T = S.target; S.momentSpin = -1;
        const rnd = GM.rng('cal' + g); let total = 0, guard = 0;
        while (S.xi.some(x => x.p == null) && guard++ < 60) {
          S.spin++; S.spinRespins = 0; S.special = null;
          const reels = GM.draft.makeReels().filter(x => x.id != null); if (!reels.length) continue;
          let best = null, bd = 1e9;
          for (const x of reels) {
            const p = pool[x.id], v = GM.draft.pvOf(p)[stat], est = v * Math.exp(noise * gauss(rnd));
            const slot = S.xi.find(s => s.p == null && p.poss.includes(s.pos)) || S.xi.find(s => s.p == null);
            const rest = S.xi.filter(s => s.p == null && s !== slot).reduce((t, s) => t + (PA[s.pos] ? PA[s.pos][0] / PA[s.pos][1] : T / 11), 0);
            const d = Math.abs(T - total - est - rest);
            if (d < bd) { bd = d; best = { x, v, slot }; }
          }
          for (const x of reels) { const p = pool[x.id]; const pos = p.poss[0]; PA[pos] = PA[pos] || [0, 0]; PA[pos][0] += GM.draft.pvOf(p)[stat]; PA[pos][1]++; }
          best.slot.p = best.x.id; best.slot.g = best.v; S.used.push(best.x.id); total += best.v;
        }
        if (g >= 0) res.push(Math.abs(total - T) / T);
      }
      GM._tw = null;
      return Math.round(res.filter(x => x <= 0.05).length / res.length * 100);
    };
  });
  for (const lv of LV) for (const st of ST) {
    const row = [];
    for (const e of EX) row.push(`${e}: ${await pg.evaluate(([l, s, e, n, z]) => window.playT(l, s, e, n, z), [lv, st, e, N, NOISE[lv]])}%`);
    console.log(`${lv.padEnd(8)} ${st.padEnd(8)} ${row.join('  ')}`);
  }
  await b.close();
})();

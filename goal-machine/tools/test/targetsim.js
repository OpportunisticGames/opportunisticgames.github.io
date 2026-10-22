// node targetsim.js [games per level, default 300] [goals|assists|apps]: how reachable each level’s target is (22 Oct 2026)
// Target games: how reachable is the target on each level? Whole games with the real dealing code and a bot that guesses
// each player's number as well as a player could on that level, then signs whoever best keeps it on pace.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const N = +process.argv[2] || 300, STAT = process.argv[3] || 'goals';
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext();
  await ctx.route(/supabase|transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:calm', 'true'); });
  const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('http://localhost:8765/goal-machine/'); await pg.waitForTimeout(800);
  await pg.evaluate(async () => {
    const src = await (await fetch('js/draft.js')).text();
    const hooked = src.replace('GM.draft = {', 'GM.draft = { makeReels: sp => makeReels(sp), pvOf: p => pv(p), ');
    (0, eval)(hooked); await GM.loadAll();
  });
  const XS = (process.argv[4] || '').split(',').filter(Boolean).map(Number);
  const LEVELS = [['Easy', { easy: true }, 0.08], ['Normal', {}, 0.35], ['Hard', { hard: true }, 0.6], ['Extreme', { extreme: true }, 0.6]].concat(XS.map(x => ['Extreme ^' + x, { extreme: true, x }, 0.6]));
  console.log(`Target (${STAT}), ${N} games a level. "guess" = how well you can judge a player's number on that level`);
  for (const [name, opts, noise] of LEVELS) {
    const r = await pg.evaluate(async ([opts, noise, N, STAT]) => {
      GM._xTarget = opts.x != null ? opts.x : null; const PA = {}; const root = document.getElementById('app'), out = { over: 0, perfect: [], real: [], dealt: [], big: 0, reels: 0, target: 0 };
      const gauss = rnd => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      for (const bot of ['perfect', 'real']) for (let g = 0; g < N; g++) {
        GM.draft.start(root, 'target', { seed: (opts.easy ? 'e~' : '') + 'ts' + g, stat: STAT, hard: !!opts.hard, extreme: !!opts.extreme, easy: !!opts.easy });
        const S = GM.draft.state(), pool = S.rules.all ? GM.allPlayers : GM.players, T = S.target; out.target = T;
        S.momentSpin = -1; const rnd = GM.rng('bot' + g + bot);
        let total = 0, guard = 0;
        while (S.xi.some(x => x.p == null) && guard++ < 60) {
          S.spin++; S.spinRespins = 0; S.special = null;
          const reels = GM.draft.makeReels().filter(x => x.id != null);
          if (!reels.length) continue;
          let best = null, bd = 1e9;
          for (const x of reels) {
            const p = pool[x.id], v = GM.draft.pvOf(p)[STAT];
            if (bot === 'real') { out.reels++; out.dealt.push(v); if (v > 2 * (T / 11)) out.big++; }
            // what a sensible player expects from each position still open (what turns up there, on average, at this level)
            const est = bot === 'perfect' ? v : v * Math.exp(noise * gauss(rnd));
            const slot = S.xi.find(s => s.p == null && p.poss.includes(s.pos)) || S.xi.find(s => s.p == null);
            const rest = S.xi.filter(s => s.p == null && s !== slot).reduce((t, s) => t + (PA[s.pos] ? PA[s.pos][0] / PA[s.pos][1] : 30), 0);
            const d = Math.abs(T - total - est - rest);
            if (d < bd) { bd = d; best = { x, p, v, slot }; }
          }
          for (const x of reels) { const p = pool[x.id], pos = p.poss[0], v = GM.draft.pvOf(p)[STAT]; PA[pos] = PA[pos] || [0, 0]; PA[pos][0] += v; PA[pos][1]++; }
          const slot = best.slot;
          slot.p = best.x.id; slot.g = best.v; S.used.push(best.x.id); total += best.v;
        }
        out[bot].push(Math.abs(total - T) / T * 100); if (bot === 'real' && total > T) out.over++;
      }
      const q = a => { const s = a.slice().sort((x, y) => x - y); return { med: +s[Math.floor(s.length / 2)].toFixed(1), within5: Math.round(s.filter(x => x <= 5).length / s.length * 100), within2: Math.round(s.filter(x => x <= 2).length / s.length * 100) }; };
      const avg = out.dealt.reduce((a, b) => a + b, 0) / out.dealt.length;
      return { target: out.target, avgDealt: Math.round(avg), pace: Math.round(out.target / 11), bigShare: Math.round(out.big / out.reels * 100), perfect: q(out.perfect), real: q(out.real), over: Math.round(out.over / N * 100) };
    }, [opts, noise, N, STAT]);
    console.log(`${name.padEnd(8)} target ${r.target}, pace ${r.pace}/player · dealt avg ${r.avgDealt}, ${r.bigShare}% over 2× pace · perfect bot: median ${r.perfect.med}% off, ${r.perfect.within2}% within 2% · real-ish bot: median ${r.real.med}% off, ${r.real.within5}% within 5%, ${r.over}% over`);
  }
  await b.close();
})();

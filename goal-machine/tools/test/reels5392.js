// 5.39.2: the full player list (Extreme, Purist) has a few players twice. Thousands of spins dealt with the game's own code:
// never the same player on two reels of a spin, never a stray no-club copy, never a player you've already signed.
//   node reels5392.js [spins per mode, default 6000]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const N = +process.argv[2] || 6000;
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext();
  await ctx.route(/supabase|transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:calm', 'true'); });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.waitForTimeout(800);
  await pg.evaluate(async () => {
    const src = await (await fetch('js/draft.js')).text();
    const hooked = src.replace('GM.draft = {', 'GM.draft = { makeReels: sp => makeReels(sp), ');
    if (hooked === src) throw new Error('hook not found');
    (0, eval)(hooked);
    await GM.loadAll();
  });
  const marked = await pg.evaluate(() => GM.allPlayers.filter(p => p.dupe).length);
  ok(marked > 20 && marked < 60, `the stray second copies in the full list are marked (${marked})`);
  for (const [mode, extreme] of [['purist', true], ['extreme', true], ['chaos', true], ['ultimate', false]]) {
    const r = await pg.evaluate(async ([mode, extreme, N]) => {
      GM.draft.start(document.getElementById('app'), mode, { seed: 'dup', extreme });
      await new Promise(f => setTimeout(f, 300));
      const S = GM.draft.state(), pool = S.rules.all ? GM.allPlayers : GM.players;
      S.manager = null; S.momentSpin = -1;
      let twice = 0, dupe = 0, again = 0, spins = 0;
      // a signed Berghuis (his first record): the other one must never come up after
      const berg = pool.filter(p => p.name === 'Steven Berghuis').map(p => p.id);
      for (let i = 0; i < N; i++) {
        S.seed = 'dup' + i; S.spin = 0; S.spinRespins = 0; S.special = null;
        if (berg.length > 1) S.used = [berg[0]];
        const pks = GM.draft.makeReels().filter(x => x.id != null).map(x => pool[x.id]);
        spins++;
        if (new Set(pks.map(p => p.pk)).size < pks.length) twice++;
        if (pks.some(p => p.dupe)) dupe++;
        if (berg.length > 1 && pks.some(p => p.pk === pool[berg[0]].pk)) again++;
      }
      S.used = [];
      return { spins, twice, dupe, again, berg: berg.length };
    }, [mode, extreme, N]);
    ok(r.twice === 0 && r.dupe === 0 && r.again === 0, `${mode}${extreme ? ' (Extreme)' : ''}: ${r.spins} spins, the same player twice on a spin ${r.twice}×, a stray copy ${r.dupe}×, a signed player again ${r.again}×`);
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close();
})();

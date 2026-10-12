// 5.34: the Easy level. More big names on the reels, its own boards, carried by the seed, four levels on Home, the main
// event is Ultimate (wildcards on or Pure) and Classic has gone from the menus.   node new534.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:calm', 'true'); });
  await pg.reload(); await pg.waitForTimeout(700);
  // Home: four levels, no Classic switch, the main event's names
  await pg.evaluate(() => GM.setLevel('easy')); await pg.evaluate(() => { location.hash = '#/x'; location.hash = '#/'; }); await pg.waitForTimeout(600);
  const home = await pg.evaluate(() => ({ levels: [...document.querySelectorAll('[data-level]')].map(b => b.dataset.level), pool: !!document.querySelector('[data-pool]'), main: (document.querySelector('.mode-card.ultimate b') || {}).textContent, pure: /Pure/.test((document.querySelector('.wild-switch') || {}).textContent || '') }));
  ok(home.levels.join() === 'easy,normal,hard,extreme' && !home.pool && home.main === 'Ultimate' && home.pure, `Home: four levels, the main event is Ultimate with a Pure switch, no Classic (${JSON.stringify(home)})`);
  await pg.screenshot({ path: 'lay/easy_home.png' });
  // an Easy game: the seed says so, the board is ultimatee, the reels lean to big names
  await pg.evaluate(() => { location.hash = '#/draft?m=ultimate&s=goals'; }); await pg.waitForTimeout(900);
  const st = await pg.evaluate(() => { const S = GM.draft.state(); return { easy: S.easy, seed: S.seed, key: GM.draft.modeKey(S.mode, S.stat, S.hard, null, S.extreme, S.easy), pill: !!document.querySelector('.easy-pill') }; });
  ok(st.easy && /^e~/.test(st.seed) && st.key === 'ultimatee' && st.pill, `an Easy game: seed ${st.seed}, board ${st.key}, the Easy pill`);
  // the same seed elsewhere (a challenge, a race) is Easy too, whatever the other phone's level
  await pg.evaluate(() => GM.setLevel('hard'));
  await pg.evaluate(s => { location.hash = '#/'; location.hash = '#/draft?m=ultimate&s=goals&seed=' + encodeURIComponent(s); }, st.seed); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => GM.draft.state().easy === true && GM.draft.state().hard === false), 'a shared Easy seed plays Easy on a Hard phone');
  // more big names: average fame on the first spin, Easy v Normal, over 400 seeds
  const fame = await pg.evaluate(async () => {
    const out = {};
    for (const [lbl, seedP] of [['easy', 'e~f'], ['normal', 'f']]) {
      let t = 0, n = 0;
      for (let i = 0; i < 150; i++) {
        location.hash = '#/'; location.hash = `#/draft?m=ultimatepure&s=goals&seed=${seedP}${i}`;
        await new Promise(r => setTimeout(r, 30));
        document.getElementById('spin') && document.getElementById('spin').click();
        await new Promise(r => setTimeout(r, 60));
        const S = GM.draft.state(); (S.reels || []).filter(x => x.id != null).forEach(x => { t += GM.players[x.id].fame; n++; });
      }
      out[lbl] = Math.round(t / Math.max(1, n));
    }
    return out;
  });
  ok(fame.easy > fame.normal * 1.4, `Easy deals better-known players (average fame ${fame.easy} v ${fame.normal})`);
  // names, the board filter, Best Players
  const names = await pg.evaluate(() => [GM.MODES.ultimate.name, GM.MODES.ultimatepure.name, GM.MODES.ultimatee.name, GM.MODES.chaos.name, GM.MODES.purist.name]);
  ok(names.join('|') === 'Ultimate|Ultimate · Pure|Ultimate (Easy)|CHAOS|Ultimate · Pure (Extreme)', 'clearer names: ' + names.join(', '));
  await pg.evaluate(() => { location.hash = '#/leaderboard?m=ultimatee'; }); await pg.waitForTimeout(900);
  const lb = await pg.evaluate(() => ({ lv: (document.querySelector('#lbh') || {}).value, opts: [...document.querySelectorAll('#lbh option')].map(o => o.value), classic: [...document.querySelectorAll('#lbv option')].some(o => /Classic/.test(o.textContent)) }));
  ok(lb.lv === 'easy' && lb.opts.join() === 'easy,normal,hard,extreme' && !lb.classic, `the board filter has Easy, and no Classic (${JSON.stringify(lb)})`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(process.exitCode || 0);
})();

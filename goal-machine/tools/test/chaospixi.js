// ✨ CHAOS on the effects layer (js/fx.js): PixiJS particles and LottieFiles animations play in the moments, the
// parked ambulance is the animated one, Calm mode turns it all off, and nothing throws. Screenshots: lay/px_*.png
//   node chaospixi.js [moments, e.g. "injury,arrest"]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.goto(U);
  await pg.evaluate(() => { GM._forceMgr = 'moyes'; location.hash = '#/draft?m=chaos&seed=pixi1'; });
  await pg.waitForSelector('.cm-pick [data-mgr]');
  await pg.click('.cm-pick [data-mgr="moyes"]');
  await pg.waitForFunction(() => GM.FX && GM.FX.on, null, { timeout: 15000 }).catch(() => {});
  ok(await pg.evaluate(() => GM.FX.on), 'the effects layer is up (PixiJS on WebGL)');
  await pg.waitForFunction(() => GM.FX.still('ambulance'), null, { timeout: 10000 }).catch(() => {});
  ok(await pg.evaluate(() => !!GM.FX.still('ambulance')), 'a still of the animated ambulance is ready for parking');
  const fill = () => pg.evaluate(() => {
    const S = GM.draft.state();
    S.xi.forEach((x, i) => { if (x.p == null && i > 0 && i < 9) { const id = GM.players.findIndex((p, k) => p.poss.includes(x.pos) && !S.xi.some(y => y.p === k) && p.goals > 10); x.p = id; x.v = { goals: GM.players[id].goals, assists: GM.players[id].ast, apps: GM.players[id].apps }; x.g = x.v.goals; x.base = x.g; x.at = S.spin; } });
    S.inv = []; S.modifier = null; S.forceEv = null; S.phase = 'spin'; S.pending = null; S.reels = []; S.spin = Math.max(2, S.spin + 1); S.momentSpin = -1; S.spinRespins = 0; S.lastBig = -5; GM.draft.render();
  });
  // what should be on screen (Lottie animations or PixiJS particles) part-way through each moment
  const MOM = { injury: 'lot', arrest: 'lot', aliens: 'lot', helicopter: 'lot', conscript: 'lot', fraud: 'lot', breakup: 'lot', splat: 'lot', dog: 'lot', title: 'lot',
    taxman: 'swap', box: 'swap', windfall: 'swap', loanarmy: 'swap',
    tornado: 'px', blackhole: 'px', lightning: 'px', quake: 'px', stoke: 'px', unleash: 'px', derby: 'px', windfall: 'px', lastminute: 'px', wedding: 'px' };
  for (const ev of Object.keys(MOM).filter(k => !ONLY.length || ONLY.includes(k))) {
    await fill();
    await pg.evaluate(e => { const S = GM.draft.state(); S.forceEv = e; if (e === 'taxman') S.inv = ['captain']; }, ev);
    await pg.click('#spin');
    await pg.waitForSelector('.cm', { timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(400); await pg.click('.cm').catch(() => {});  // into act 2
    await pg.waitForTimeout(ev === 'blackhole' || ev === 'tornado' ? 1500 : 1300);
    const st = await pg.evaluate(() => ({ lot: document.querySelectorAll('.fx-lot svg').length, swap: document.querySelectorAll('.wfx .lot .fx-lot svg').length }));
    const live = await pg.evaluate(() => GM.FX._alive ? GM.FX._alive() : -1);
    ok(MOM[ev] === 'lot' ? st.lot > 0 : MOM[ev] === 'swap' ? st.swap > 0 : live > 0, `${ev}: ${MOM[ev] === 'lot' ? `${st.lot} Lottie animation(s)` : MOM[ev] === 'swap' ? `the drawing swapped for its animation (${st.swap})` : `${live} particles`} on screen`);
    await pg.screenshot({ path: `lay/px_${ev}.png` });
    for (let k = 0; k < 40 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(250); }
    for (let k = 0; k < 30; k++) { const ph = await pg.evaluate(() => GM.draft.state().phase); if (ph === 'pick') break; await pg.waitForTimeout(200); }
  }
  if (!ONLY.length || ONLY.includes('weather')) {
    // the weather all game long, and the dog and the pigeon that stay, on their own layer
    for (const w of ['rain', 'snow', 'fog', 'wind', 'sun']) {
      await pg.evaluate(w => { const S = GM.draft.state(); S.weather = w; S.roam = ['dog']; S.mess = (S.mess || []).filter(m => m.i !== '#pigeon').concat([{ i: '#pigeon', x: 20, y: 70, r: 0, t: 0 }]); GM.draft.render(); }, w);
      await pg.waitForTimeout(1800);
      const n = await pg.evaluate(() => GM.FX._alive());
      ok(n > (w === 'fog' ? 1 : 4), `weather ${w}: ${n} particles over the pitch`);
      await pg.screenshot({ path: `lay/px_wx_${w}.png` });
    }
    const roam = await pg.evaluate(() => ({ dog: document.querySelectorAll('#roam-fx .rmx-dog .fx-lot svg').length, pigeon: document.querySelectorAll('#roam-fx .rmp .fx-lot svg').length, svgDog: document.querySelectorAll('.pitch .roam .rm-dog').length }));
    ok(roam.dog === 1 && roam.pigeon === 1 && roam.svgDog === 0, `the dog and the pigeon that stay are animated (${JSON.stringify(roam)})`);
    // they don't start again when the pitch is redrawn
    const same = await pg.evaluate(async () => { const a = document.querySelector('#roam-fx .rmx-dog'); GM.draft.render(); await new Promise(r => setTimeout(r, 100)); return a === document.querySelector('#roam-fx .rmx-dog'); });
    ok(same, 'redrawing the pitch keeps the same dog');
  }
  if (!ONLY.length) {
    const parked = await pg.evaluate(() => { GM.draft.render(); return document.querySelectorAll('.slot .parked .lot-still').length; });
    ok(parked >= 1, `the parked ambulance is the animated one (${parked})`);
    await pg.screenshot({ path: 'lay/px_parked.png' });
    // Calm mode: no canvas work at all
    await pg.evaluate(() => { GM.store.set('calm', true); });
    ok(await pg.evaluate(() => !GM.FX.on), 'Calm mode turns the effects layer off');
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

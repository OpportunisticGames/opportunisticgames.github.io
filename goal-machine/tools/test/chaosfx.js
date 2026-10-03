// 🎬 CHAOS 5.20: every match-day event and wildcard has a drawn scene; the weather, the worn pitch, the parked bus,
// the sacking, Mayhem building with the meter, the full-time replay and the CHAOS picture.
//   node chaosfx.js            (screenshots of each scene mid-animation land in lay/fx_*.png)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.goto(U);
  await pg.evaluate(() => { GM._forceMgr = 'moyes'; location.hash = '#/draft?m=chaos&seed=fx520'; });
  await pg.waitForSelector('.cm-pick [data-mgr]');
  const kick = await pg.$eval('.cm-pick .cm-text', e => e.textContent);
  const wx = await pg.evaluate(() => GM.draft.state().weather);
  ok(!!wx && kick.includes(wx === 'sun' ? 'Sunshine' : wx === 'rain' ? 'Rain' : wx === 'wind' ? 'Gale' : wx === 'snow' ? 'Snow' : 'Fog'), `kick-off forecast: ${wx} (“${kick.slice(0, 90)}…”)`);
  await pg.click('.cm-pick [data-mgr="moyes"]'); await pg.waitForTimeout(700);
  ok(!!(await pg.$('.scn-hired')), '👔 the new manager walks on');
  ok(!!(await pg.$(`.pitch .wx.wx-${wx}`)) && !!(await pg.$('.wx-pill')), `the weather is on the pitch and in the CHAOS bar`);

  const fill = () => pg.evaluate(() => {
    const S = GM.draft.state();
    S.xi.forEach((x, i) => { if (x.p == null && i > 0 && i < 7) { const id = GM.players.findIndex((p, k) => p.poss.includes(x.pos) && !S.xi.some(y => y.p === k) && p.goals > 5); x.p = id; x.v = { goals: GM.players[id].goals, assists: GM.players[id].ast, apps: GM.players[id].apps }; x.g = x.v.goals; x.base = x.g; x.at = S.spin; } });
    S.inv = ['captain', 'bus', 'hot']; S.modifier = null;
    S.forceEv = null; S.phase = 'spin'; S.pending = null; S.reels = []; S.spin = Math.max(2, S.spin + 1); S.momentSpin = -1; S.spinRespins = 0; S.lastBig = -5; GM.draft.render();
  });
  const SCENE = { redcard: '.sc-ref', derby: '.sc-flares', taxman: '.sc-tax', windfall: '.sc-van', golden: '.sc-gold', box: '.sc-crate', masked: '.sc-mask', chant: '.sc-scarves',
    vuvuzela: '.sc-vuvu', interview: '.sc-press', retro: '.sc-vhs', testimonial: '.sc-guard', loanarmy: '.sc-coach', streaker: '.sc-streak', parade: '.sc-coach.parade', relegation: '.sc-rain', title: '.sc-rain', sacked: '.sc-p45' };
  for (const ev of Object.keys(SCENE)) {
    await fill();
    await pg.evaluate(e => { const S = GM.draft.state(); S.forceEv = e; if (e === 'box') S.inv = []; }, ev);
    await pg.click('#spin');
    if (ev === 'sacked') await pg.waitForSelector('.sc-p45', { timeout: 4000 }).catch(() => {});
    else await pg.waitForSelector('.cm', { timeout: 5000 }).catch(() => {});
    if (ev === 'sacked') { await pg.waitForTimeout(500); ok(!!(await pg.$(SCENE[ev])), `📰 sacked: the P45 and the walk off`); await pg.screenshot({ path: 'lay/fx_sacked.png' }); await pg.waitForSelector('.cm-pick [data-mgr]', { timeout: 6000 }); await pg.click('.cm-pick [data-mgr]'); await pg.waitForTimeout(600); ok(!!(await pg.$('.scn-hired')), '👔 …and the new one walks on'); }
    else {
      await pg.waitForTimeout(500); await pg.click('.cm').catch(() => {}); await pg.waitForTimeout(1500);
      const there = await pg.$(`.wfx ${SCENE[ev]}, .wfx${SCENE[ev]}`);
      ok(!!there, `${ev}: drawn scene over the pitch`);
      await pg.screenshot({ path: `lay/fx_${ev}.png` });
    }
    for (let k = 0; k < 40 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(250); }
    for (let k = 0; k < 30; k++) { const ph = await pg.evaluate(() => GM.draft.state().phase); if (ph === 'pick') break; await pg.waitForTimeout(200); }
  }
  // wildcards: a flourish for each; the bus stays parked
  await fill();
  for (const [w, sel] of [['captain', '.wc-band'], ['bus', '.wc-bus'], ['hot', '.wc-flames']]) {
    await pg.evaluate(() => document.querySelectorAll('.wfx').forEach(e => e.remove()));
    await pg.evaluate(w => { const S = GM.draft.state(); S.modifier = null; const k = S.inv.indexOf(w); document.querySelector(`.wild-btn[data-w="${k}"]`).click(); }, w);
    await pg.waitForTimeout(500);
    ok(!!(await pg.$(sel)), `wildcard ${w}: drawn flourish`);
    await pg.screenshot({ path: `lay/fx_w_${w}.png` });
  }
  await pg.waitForTimeout(2000);
  ok(!!(await pg.$('.pitch .bus-parked svg')), '🚌 the bus stays parked in front of goal');
  ok(!!(await pg.$('.pitch .wear')), 'the pitch wears as the game goes on');
  // Mayhem builds with the meter
  const heat = await pg.evaluate(() => { const S = GM.draft.state(); S.meter = 3; GM.draft.render(); return !!document.querySelector('.flood'); });
  ok(heat, 'the floodlights flicker when the meter is nearly full');
  // finish the game: the chart, the replay and the picture
  await pg.evaluate(() => { const S = GM.draft.state(); S.xi.forEach((x, i) => { if (x.p == null) { const id = GM.players.findIndex((p, k) => p.poss.includes(x.pos) && !S.xi.some(y => y.p === k)); x.p = id; x.v = { goals: GM.players[id].goals, assists: GM.players[id].ast, apps: GM.players[id].apps }; x.g = x.v.goals; x.at = S.spin; } }); S.reels = [{ id: 0 }]; });
  await pg.evaluate(() => { const S = GM.draft.state(); const i = S.xi.length - 1, pos = S.xi[i].pos; S.xi[i].p = null; S.xi[i].g = 0; S.xi[i].v = null; const id = GM.players.findIndex((p, k) => p.poss.includes(pos) && !S.xi.some(y => y.p === k) && p.goals > 20); S.reels = [{ id }]; S.phase = 'pick'; S.pending = 0; GM.draft.render(); });
  await pg.click('.slot.target'); await pg.waitForSelector('.result-total', { timeout: 15000 });
  for (let k = 0; k < 10 && await pg.$('.cm:not(.out)'); k++) { await pg.click('.cm:not(.out)').catch(() => {}); await pg.waitForTimeout(300); }
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  ok(!!(await pg.$('.pc-replay')), 'full time: a replay button under the chart');
  await pg.click('.pc-replay'); await pg.waitForTimeout(3500);
  const rp = await pg.evaluate(() => ({ bar: !!document.querySelector('.replay-bar'), later: document.querySelectorAll('.pitch.replay .later').length, cap: (document.querySelector('.rb-cap') || {}).textContent }));
  ok(rp.bar && rp.later >= 0, `the replay plays (${rp.later} things still to come; “${rp.cap}”)`);
  await pg.screenshot({ path: 'lay/fx_replay.png' });
  await pg.click('.replay-bar'); await pg.waitForTimeout(300);
  ok(!(await pg.$('.replay-bar')) && !(await pg.$('.pitch.replay')), 'tap the bar to stop the replay');
  const png = await pg.evaluate(async () => { let out = null; GM.shareImage = p => { out = p; }; document.getElementById('sharepic').click(); for (let k = 0; k < 40 && !out; k++) await new Promise(r => setTimeout(r, 100)); return out; });
  ok(png && png.startsWith('data:image/png'), 'the CHAOS picture is made');
  if (png) require('fs').writeFileSync('lay/fx_picture.png', Buffer.from(png.split(',')[1], 'base64'));
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

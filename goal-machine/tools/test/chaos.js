// 🌪️ CHAOS moments: appoint a manager at kick-off, a full CHAOS draft where every moment plays one at a time (and
// finishes by itself), forced big moments, a real coin toss for All In, and the story at full time.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const U = 'http://localhost:8765/goal-machine/';
// CHAOS_PART runs one part so the suite can run them side by side (tools/test/run.sh): 'draft' (the full game) or
// 'ev:1/3' (every third event, from the second). Unset runs everything.
const PART = process.env.CHAOS_PART || '';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '99'); localStorage.setItem('gm:welcomed', '1'); });
  if (!PART || PART === 'draft') {
  await pg.goto(U + '#/draft?m=chaos&seed=chaostest1'); await pg.waitForTimeout(1200);
  ok((await pg.$$('.cm-pick [data-mgr]')).length === 3, 'kick-off: three managers to choose from');
  await pg.screenshot({ path: 'lay/chaos_mgr.png' });
  await pg.click('.cm-pick [data-mgr]'); await pg.waitForTimeout(500);
  const mgr = await pg.evaluate(() => GM.draft.state().manager);
  ok(!!mgr && !!(await pg.$('#dugout')), `appointed ${mgr}; he sits in the dugout by the meter`);
  // play it through: take every wildcard (fills the meter), play them, and let moments finish on their own
  const seen = [], maxAtOnce = [];
  let forced = 0, allin = false; const shots = new Set();
  for (let step = 0; step < 400; step++) {
    const st = await pg.evaluate(() => {
      document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
      const cms = document.querySelectorAll('.cm:not(.out)');
      if (cms.length) { const n = cms[0].querySelector('.cm-name').textContent; const pick = cms[0].querySelector('[data-mgr]'); if (pick) pick.click(); const coin = cms[0].querySelector('.coin-wrap'); if (coin && !cms[0].classList.contains('flipping')) coin.click(); return 'moment:' + n + ':' + cms.length; }
      if (document.querySelector('.result-total')) return 'done';
      const S = GM.draft.state();
      const sub = document.querySelector('.pitch.subbing .slot.filled'); if (sub) { sub.click(); return 'sub'; }
      const sp = document.getElementById('spin'); if (sp && !sp.disabled) { sp.click(); return 'spin'; }
      const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
      const w = document.querySelector('.wild-btn'); if (w && S.phase === 'pick' && Math.random() < 0.5) { w.click(); return 'wild'; }
      const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
      (rs.find(r => r.classList.contains('is-wild') && S.inv.length < 3) || rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
    }).catch(e => 'err ' + e.message);
    if (st.startsWith('moment:')) {
      const [, name, n] = st.split(':'); if (seen[seen.length - 1] !== name) seen.push(name); maxAtOnce.push(+n);
      if (['Tornado!', 'Lightning strike', 'Open-top bus parade', 'CHAOS UNLEASHED'].includes(name) && !shots.has(name)) shots.add(name), await pg.screenshot({ path: `lay/chaos_${name.replace(/\W/g, '')}.png` });
      await pg.waitForTimeout(400); continue;
    }
    if (st === 'done') break;
    // force a couple of big moments and an All In along the way
    if (st === 'spin' && forced < 3) {
      const s = await pg.evaluate(() => GM.draft.state().spin);
      if (s >= 4 && s % 2 === 0) { forced++; await pg.evaluate(() => { GM.draft.state().chaosDue = true; }); }
    }
    if (!allin && await pg.evaluate(() => { const S = GM.draft.state(); return S.phase === 'pick' && !document.querySelector('.cm') && S.xi.filter(x => x.p != null).length >= 5; })) {
      allin = true;
      await pg.evaluate(() => { const S = GM.draft.state(); S.inv = S.inv.slice(0, 2).concat(['allin']); GM.draft.render(); });
      await pg.click('.wild-btn:last-child'); await pg.waitForTimeout(1500);
      ok(!!(await pg.$('.cm .coin')) && !(await pg.$('.cm.flipping')), 'All In brings out a coin, and waits for you to flip it');
      await pg.screenshot({ path: 'lay/chaos_coin.png' });
      await pg.click('.coin-wrap'); await pg.waitForTimeout(1900);
      ok(!!(await pg.$('.cm.landed')), 'tap it: it flips and lands');
      await pg.screenshot({ path: 'lay/chaos_coin_landed.png' });
      await pg.waitForTimeout(2600); await pg.screenshot({ path: 'lay/chaos_coin_act.png' });
    }
    await pg.waitForTimeout(st === 'spin' ? 1500 : 450);
  }
  ok(await pg.$('.result-total'), 'the CHAOS draft reaches full time');
  ok(Math.max(0, ...maxAtOnce) === 1, `only ever one moment at a time (${seen.length} moments: ${seen.join(', ')})`);
  ok(seen.filter(n => n !== 'Kick-off').length >= 3, 'moments happen: kick-off, forced big ones and the meter');
  const story = await pg.$$eval('.chaos-story li', l => l.length);
  ok(story >= 3, `full time tells the story (${story} moments)`);
  const lines = await pg.$$eval('.breakdown td', t => t.map(x => x.textContent).join(' | '));
  ok(/Manager/.test(await pg.textContent('.result')) , 'full time names your manager');
  console.log('  breakdown:', lines.slice(0, 400));
  await pg.screenshot({ path: 'lay/chaos_done.png', fullPage: true });
  }
  if (!PART || PART.startsWith('ev:')) {
  // every event and moment, forced one per spin across a few games (tapping through each)
  const [pi, pn] = PART ? PART.slice(3).split('/').map(Number) : [0, 1];
  const keys = (await pg.evaluate(() => GM.draft.events())).filter((k, i) => i % pn === pi), shown = [];
  let ki = 0;
  for (let game = 0; game < 8 && ki < keys.length; game++) {
    await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=chaos&seed=every' + (PART ? pi + 'p' : '') + game); await pg.waitForTimeout(900);
    for (let step = 0; step < 300; step++) {
      const st = await pg.evaluate(() => {
        const cm = document.querySelector('.cm:not(.out)');
        if (cm) { const mg = cm.querySelector('[data-mgr]'); if (mg) { const n = cm.querySelector('.cm-name').textContent; mg.click(); return n === 'Kick-off' ? 'mgr' : 'moment:' + n + ':Uncommon'; } const coin = cm.querySelector('.coin-wrap'); if (coin && !cm.classList.contains('flipping')) { coin.click(); return 'coin'; } cm.click(); return 'moment:' + cm.querySelector('.cm-name').textContent + ':' + ((cm.querySelector('.cm-rar') || {}).textContent || 'Common').replace(/✨/g, '').trim(); }
        if (document.querySelector('.result-total')) return 'done';
        const S = GM.draft.state();
        const sp = document.getElementById('spin'); if (sp && !sp.disabled) return 'spin';
        const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
        const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
        (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
      }).catch(e => 'err ' + e.message);
      if (st === 'done') break;
      if (st.startsWith('moment:')) { const n = st.slice(7); if (shown[shown.length - 1] !== n) shown.push(n); await pg.waitForTimeout(300); continue; }
      if (st === 'spin') {
        const ready = await pg.evaluate(() => GM.draft.state().spin >= 2);
        if (ready && ki < keys.length) { const k = keys[ki++]; await pg.evaluate(k => { GM.draft.state().forceEv = k; }, k); }
        await pg.click('#spin'); await pg.waitForTimeout(1500); continue;
      }
      await pg.waitForTimeout(st === 'place' ? 500 : 300);
    }
  }
  const byRar = shown.reduce((a, x) => { const r = x.slice(x.lastIndexOf(':') + 1); a[r] = (a[r] || 0) + 1; return a; }, {});
  ok(ki === keys.length && shown.length >= keys.length, `every one of the ${keys.length} events and moments plays (${JSON.stringify(byRar)})`);
  console.log('  ' + shown.map(x => x.slice(0, x.lastIndexOf(':'))).join(' · '));
  }
  console.log(errs.join('\n') || 'no page errors'); if (errs.length) process.exitCode = 1; await b.close();
})();

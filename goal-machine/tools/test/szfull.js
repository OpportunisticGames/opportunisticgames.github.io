// ✨ Seasonal CHAOS played right through: a bot plays three whole Halloween CHAOS games with the wild moments forced in
// (players stolen, merged, magicked, the formation flipped) and each one still reaches full time with a proper score.
//   node szfull.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { fast } = require('./helpers');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await fast(ctx);
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.goto(U); await pg.waitForTimeout(500);
  const wild = await pg.evaluate(() => { GM._forceSz = 'halloween'; return Object.keys(GM.SZ_CHAOS.halloween.xev).map(k => 'sz_' + k); });
  for (let g = 0; g < 3; g++) {
    await pg.evaluate(() => Object.keys(localStorage).filter(x => x.startsWith('gm:draftp')).forEach(x => localStorage.removeItem(x)));
    await pg.evaluate(() => { location.hash = '#/'; }); await pg.evaluate(s => { location.hash = '#/draft?m=szchaos&s=goals&seed=szfull' + s; }, g);
    let k = 0, forced = 0, done = false;
    for (let step = 0; step < 700 && !done; step++) {
      const st = await pg.evaluate(() => {
        document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
        if (document.querySelector('.result-total')) return 'done';
        const cm = document.querySelector('.cm:not(.out)');
        if (cm) { const mg = cm.querySelector('[data-mgr]'); if (mg) { mg.click(); return 'mgr'; } const coin = cm.querySelector('.coin-wrap'); if (coin && !cm.classList.contains('flipping')) { coin.click(); return 'coin'; } const pick = cm.querySelector('.cm-pick button'); if (pick) { pick.click(); return 'pick'; } if (!cm.classList.contains('act')) cm.click(); return 'card'; }
        const sp = document.getElementById('spin'); if (sp && !sp.disabled) return 'spin';
        const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
        const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
        (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
      }).catch(() => 'err');
      if (st === 'done') { done = true; break; }
      if (st === 'spin') {
        const ready = await pg.evaluate(() => GM.draft.state().spin >= 2);
        if (ready && k % 2 === 0) { await pg.evaluate(e => { GM.draft.state().forceEv = e; }, wild[(g * 7 + forced) % wild.length]); forced++; }
        k++; await pg.click('#spin').catch(() => {});
      }
      await pg.waitForTimeout(40);
    }
    const r = await pg.evaluate(() => { const S = GM.draft.state(); return { total: GM.draft.total(S), filled: S.xi.filter(x => x.p != null).length, slots: S.xi.length, mode: S.mode }; });
    ok(done && Number.isFinite(r.total) && r.filled === r.slots && r.mode === 'szchaos', `game ${g + 1}: full time with ${forced} wild moments forced in, ${r.filled}/${r.slots} signed, ${r.total} pts`);
    // 5.32.2: nothing from the game carries on over the result (a witch mid-flight), and the story lists the kick-off once, briefly
    const end = await pg.evaluate(() => ({ lot: [...document.querySelectorAll('.fx-lottie')].filter(e => !e.closest('.result')).length, ko: (GM.draft.state().moments || []).filter(m => m.name === 'Kick-off').map(m => m.text) }));
    ok(end.lot === 0, `game ${g + 1}: no flyers or moment animations left over the result (${end.lot})`);
    ok(end.ko.length <= 1 && end.ko.every(t => t.length < 90), `game ${g + 1}: "What happened" has the kick-off once, in one short line (${JSON.stringify(end.ko)})`);
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''));
  await b.close();
})();

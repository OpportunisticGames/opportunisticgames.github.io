// 5.22.1 fixes: Extreme hides the clues, a full wildcard bag asks what to do, the share picture is the pitch on screen,
// CHAOS asks "carry on?" before the manager, the weather stops at full time, bonus notes when you sign someone,
// the Dodgy Owner PB, and badges counting on every level.   node fixes5221.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  const act = f => pg.evaluate(f).catch(() => null);
  // play a draft to full time through the screen
  async function playOut(maxSteps = 200) {
    for (let step = 0; step < maxSteps; step++) {
      if (await act(() => !!document.querySelector('.result-total'))) return true;
      await act(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
      if (await act(() => { const mg = document.querySelector('.cm [data-mgr]'); if (mg) { mg.click(); return true; } const cm = document.querySelector('.cm:not(.out)'); if (cm) { cm.click(); return true; } return false; })) { await pg.waitForTimeout(300); continue; }
      if (await act(() => { const b = document.getElementById('spin'); if (b && !b.disabled) { b.click(); return true; } return false; })) { await pg.waitForTimeout(1300); continue; }
      const did = await act(() => {
        const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
        const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return null;
        (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
      });
      await pg.waitForTimeout(did === 'place' ? 700 : 300);
    }
    return false;
  }

  // 1. Extreme: every player, and only names and positions on the reels
  await pg.evaluate(() => { localStorage.setItem('gm:level', '"extreme"'); });
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=extreme'); await pg.waitForTimeout(2500);
  await pg.click('#spin'); await pg.waitForTimeout(1600);
  const xr = await pg.evaluate(() => ({ reels: document.querySelectorAll('.stage .reel[data-reel]:not(.is-wild)').length, chips: document.querySelectorAll('.stage .reel .chips').length, hard: document.querySelectorAll('.stage .reel.hard').length }));
  ok(xr.reels > 0 && xr.chips === 0 && xr.hard >= xr.reels, `Extreme reels show names and positions only (${JSON.stringify(xr)})`);
  await pg.screenshot({ path: 'lay/fx_extreme.png' });
  await pg.evaluate(() => { localStorage.setItem('gm:level', '"normal"'); Object.keys(localStorage).filter(k => k.startsWith('gm:draftp')).forEach(k => localStorage.removeItem(k)); });

  // 2. A full wildcard bag: the choice comes up every time (storm or not)
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=ultimate&seed=bag1'); await pg.waitForTimeout(1500);
  await pg.click('#spin'); await pg.waitForTimeout(1600);
  const setBag = (inv, wild, storm) => pg.evaluate(([inv, wild, storm]) => { const S = GM.draft.state(); S.inv = inv; S.storm = storm; S.reels[0] = { wild }; S.phase = 'pick'; S.pending = null; GM.draft.render(); }, [inv, wild, storm]);
  const spinIfNeeded = async () => { await pg.waitForTimeout(400); if (await pg.$('#spin')) { await pg.click('#spin'); await pg.waitForTimeout(1600); } };
  for (const storm of [false, true]) {
    await spinIfNeeded();
    await setBag(['captain', 'rotation', 'coin'], 'deadline', storm);
    await pg.click('.stage .reel[data-reel="0"]'); await pg.waitForTimeout(300);
    ok(!!await pg.$('.modal .bag-full'), `bag full${storm ? ' in a storm' : ''}: you're asked what to do (nothing's thrown away)`);
    const inv0 = await pg.evaluate(() => GM.draft.state().inv.join());
    ok(inv0 === 'captain,rotation,coin', `…and the bag is untouched until you choose (${inv0})`);
    await pg.click('.modal [data-swap="1"]'); await pg.waitForTimeout(1600);
    const inv1 = await pg.evaluate(() => GM.draft.state().inv.join());
    ok(inv1 === 'captain,coin,deadline', `Swap: Rotation Risk out, Deadline Day in (${inv1})`);
  }
  // play the new one straight away
  await spinIfNeeded();
  await setBag(['captain', 'rotation', 'coin'], 'rotation', false);
  await pg.click('.stage .reel[data-reel="0"]'); await pg.waitForTimeout(300);
  await pg.click('.modal [data-now]'); await pg.waitForTimeout(2200);
  const now = await pg.evaluate(() => { const S = GM.draft.state(); return { inv: S.inv.join(), mod: S.modifier }; });
  ok(now.inv === 'captain,rotation,coin' && now.mod === 'rotation', `Play it now: Rotation Risk is in play and the bag keeps its three (${JSON.stringify(now)})`);
  // play one of yours first, then the new one drops in
  await pg.evaluate(() => { const S = GM.draft.state(); S.modifier = null; });
  await spinIfNeeded();
  await setBag(['captain', 'rotation', 'coin'], 'deadline', false);
  await pg.click('.stage .reel[data-reel="0"]'); await pg.waitForTimeout(300);
  await pg.click('.modal [data-first="0"]'); await pg.waitForTimeout(2600);
  const first = await pg.evaluate(() => { const S = GM.draft.state(); return { inv: S.inv.join(), mod: S.modifier }; });
  ok(first.mod === 'captain' && first.inv === 'rotation,coin,deadline', `Play yours first: Captain in play, Deadline Day in the bag (${JSON.stringify(first)})`);

  // 3. The share picture is the pitch on screen
  await pg.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('gm:draftp')).forEach(k => localStorage.removeItem(k)));
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=classic&seed=pic1'); await pg.waitForTimeout(1500);
  ok(await playOut(), 'a Classic draft played to full time');
  await pg.evaluate(() => { window._shot = null; GM.shareImage = (png) => { window._shot = png; }; });
  await pg.waitForTimeout(1500); await act(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));  // (badge / level pop-ups)
  await pg.evaluate(() => document.getElementById('sharepic').click());
  await pg.waitForFunction(() => window._shot, null, { timeout: 15000 }).catch(() => {});
  const shot = await pg.evaluate(async () => { const s = window._shot; if (!s) return null; const im = new Image(); im.src = s; await im.decode(); return { w: im.width, h: im.height, len: s.length }; });
  ok(shot && shot.w === 1080 && shot.h > 1000, `the picture is made from the pitch on screen (${JSON.stringify(shot)})`);
  if (shot) require('fs').writeFileSync('lay/fx_share.png', Buffer.from((await pg.evaluate(() => window._shot)).split(',')[1], 'base64'));

  // 4. CHAOS: carry on? comes before the manager
  await pg.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('gm:draftp')).forEach(k => localStorage.removeItem(k)));
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=chaos'); await pg.waitForTimeout(1500);
  // a manager, then a couple of signings, then leave
  for (let k = 0; k < 40; k++) { const n = await pg.evaluate(() => GM.draft.state().xi.filter(x => x.p != null).length); if (n >= 2) break;
    if (await act(() => { const mg = document.querySelector('.cm [data-mgr]'); if (mg) { mg.click(); return true; } const cm = document.querySelector('.cm:not(.out)'); if (cm) { cm.click(); return true; } return false; })) { await pg.waitForTimeout(300); continue; }
    if (await act(() => { const b = document.getElementById('spin'); if (b && !b.disabled) { b.click(); return true; } return false; })) { await pg.waitForTimeout(1300); continue; }
    await act(() => { const t = document.querySelector('.slot.target'); if (t) return t.click(); const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; (rs.find(r => !r.classList.contains('is-wild')) || rs[0] || { click() {} }).click(); });
    await pg.waitForTimeout(800); }
  // (and the bonus notes showed up when he signed)
  // (and the bonus notes showed up when he signed: sign one more and look)
  await pg.evaluate(() => { const S = GM.draft.state(); S.phase = 'spin'; GM.draft.render(); });
  for (let k = 0; k < 12 && !(await pg.$('#bonus-notes .bn')); k++) {
    if (await act(() => { const cm = document.querySelector('.cm:not(.out)'); if (cm) { cm.click(); return true; } const b = document.getElementById('spin'); if (b && !b.disabled) { b.click(); return true; } return false; })) { await pg.waitForTimeout(1300); continue; }
    await act(() => { const t = document.querySelector('.slot.target'); if (t) return t.click(); const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; (rs.find(r => !r.classList.contains('is-wild')) || { click() {} }).click(); });
    await pg.waitForTimeout(700);
  }
  await pg.screenshot({ path: 'lay/fx_bonusnotes.png' });
  ok(await pg.evaluate(() => !!document.getElementById('bonus-notes')), 'signing in CHAOS shows why the bonus moved, in the corner');
  await pg.goto(U + '#/'); await pg.waitForTimeout(400); await pg.goto(U + '#/draft?m=chaos'); await pg.waitForTimeout(1200);
  const ask = await pg.evaluate(() => ({ confirm: !!document.querySelector('.modal-wrap [data-yes]'), mgr: !!document.querySelector('.cm [data-mgr]') }));
  ok(ask.confirm && !ask.mgr, `a saved CHAOS game asks "carry on?" first, with no manager pick behind it (${JSON.stringify(ask)})`);
  await pg.evaluate(() => [...document.querySelectorAll('.modal-wrap')].find(m => m.querySelector('[data-yes]')).querySelector('[data-close]').click()); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => !!document.querySelector('.cm [data-mgr]')), '…and a new game then asks for the manager');

  // 5. The weather stops at full time
  await pg.evaluate(() => { window._wx = []; const f = GM.FX.weather; GM.FX.weather = (k, g) => { window._wx.push(k); return f(k, g); }; GM.draft.state().weather = 'rain'; });
  ok(await playOut(), 'a CHAOS game played to full time');
  const wx = await pg.evaluate(() => window._wx.slice(-3));
  ok(wx.length && wx[wx.length - 1] === null, `the weather is switched off at full time (${JSON.stringify(wx)})`);

  // 6. Dodgy Owner's PB on Home
  await pg.evaluate(() => { localStorage.setItem('gm:best:owner', '87'); });
  await pg.goto(U + '#/'); await pg.waitForTimeout(400); await pg.goto(U + '#/?t=quick').catch(() => {}); await pg.waitForTimeout(600);
  const ownerPb = await pg.evaluate(() => { const t = [...document.querySelectorAll('a.tile')].find(a => a.getAttribute('href') === '#/owner'); return t ? (t.querySelector('.tile-pb') || {}).textContent : 'no tile'; });
  ok(/87 pts/.test(ownerPb || ''), `Dodgy Owner PB shows its points (${ownerPb})`);

  // 7. Badges count on every level (Extreme quick games, the Extreme draft)
  const bd = await pg.evaluate(() => { localStorage.setItem('gm:best:purist', '210'); GM.checkGame('hilox', 12); const a = GM.store.get('album'); return { hilo10: !!(a && a.ach && a.ach.hilo10), extreme: !!(a && a.ach && a.ach.extreme) }; });
  ok(bd.hilo10, 'Higher or Lower on Extreme (hilox) counts for its badge');
  ok(bd.extreme, 'an Extreme draft already on your board earns Extreme Measures');

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); server.close && server.close();
})();

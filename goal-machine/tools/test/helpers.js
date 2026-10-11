// Shared bits for the browser tests.
//   const { fast, idle } = require('./helpers');
//   await fast(ctx)        before opening pages: Calm on (no scenes or effects) and the game's own timers run 10× faster.
//                          For tests of the rules, not the look: chaosfx/chaospixi and anything checking animations
//                          should leave it off (or pass { calm: false }).
//   await idle(pg)         wait until the game is ready for the next tap: taps through any CHAOS moment cards and waits
//                          for the spin to land, instead of sleeping a fixed time.
exports.fast = (ctx, { calm = true, speed = 10 } = {}) => ctx.addInitScript(([calm, speed]) => {
  if (calm) { try { localStorage.setItem('gm:calm', 'true'); } catch (e) { /* no storage */ } }
  if (speed > 1) {
    const st = window.setTimeout.bind(window), pn = performance.now.bind(performance), t0 = pn();
    window.setTimeout = (f, ms, ...a) => st(f, (+ms || 0) / speed, ...a);
    performance.now = () => t0 + (pn() - t0) * speed;  // count-ups and coin flips finish sooner too
  }
}, [calm, speed]);

exports.idle = async (pg, ms = 10000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const st = await pg.evaluate(() => {
      const card = document.querySelector('.cm:not(.out)'), S = window.GM && GM.draft && GM.draft.state && GM.draft.state();
      return { card: !!card, phase: S ? S.phase : null };
    }).catch(() => ({ card: false, phase: null }));
    // (a card that's playing out its action can't be tapped and leaves by itself, so tap it in the page, never wait on it)
    if (st.card) { await pg.evaluate(() => { const c = document.querySelector('.cm:not(.out)'); if (c && !c.classList.contains('act')) c.click(); }).catch(() => {}); await pg.waitForTimeout(60); continue; }
    if (st.phase !== 'spinning' && st.phase !== 'reveal') return true;
    await pg.waitForTimeout(60);
  }
  return false;
};

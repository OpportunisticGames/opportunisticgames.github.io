/* Goal Machine – the first game: on first launch a new player is offered "Play your first XI", a normal Ultimate
   draft (no wildcards) with a coach bubble for each step (spin, pick, place) until they've got it, and a full-time
   card that points them at what to try next. The three "how it works" cards are still under Settings. */
'use strict';

(function () {
  GM.FIRST_XI = '#/draft?m=ultimatepure&s=goals&tut=1';
  GM.firstXIDone = () => !!GM.store.get('firstXI') || GM.store.get('played', 0) > 0;
  GM.firstXICard = () => (GM.firstXIDone() ? '' : `<a class="first-xi" href="${GM.FIRST_XI}"><span>👋</span><span><b>New here? Play your first XI</b>
    <small>Two minutes. We’ll show you how it works as you go</small></span><span>▶</span></a>`);
  GM.firstWelcome = function () {
    GM.store.set('welcomed', 1);
    GM.store.set('seenVersion', GM.UPDATES[0].v);
    const m = GM.modal(`<div class="welcome"><div class="wl-icon">⚽</div><h3>Welcome to Goal Machine</h3>
      <p>Spin the reels, sign real Premier League players and build the XI with the most PL goals. Let’s do your first one together.</p>
      <div class="row"><button class="btn ghost" data-close>Look around first</button><button class="btn big" id="wlgo">▶ Play my first XI</button></div></div>`);
    GM.$('#wlgo', m.el).onclick = () => { m.close(); location.hash = GM.FIRST_XI; };
  };

  // the coach: one bubble at a time, pointing at what to tap next
  let timer = null, bubble = null, lit = null, shown = {};
  const clear = () => { if (bubble) bubble.remove(); bubble = null; if (lit) lit.classList.remove('coach-lit'); lit = null; };
  function point(el, key, html) {
    if (!el) return clear();
    if (bubble && bubble.dataset.key === key && lit === el) return place(el);
    clear();
    bubble = document.createElement('div');
    bubble.className = 'coach'; bubble.dataset.key = key; bubble.innerHTML = html;
    document.body.appendChild(bubble);
    lit = el; el.classList.add('coach-lit');
    place(el);
  }
  function place(el) {
    const r = el.getBoundingClientRect(), bw = Math.min(300, innerWidth - 24), below = r.top < 190;
    bubble.style.width = bw + 'px';
    bubble.style.left = Math.max(12, Math.min(innerWidth - bw - 12, r.left + r.width / 2 - bw / 2)) + 'px';
    bubble.style.top = (below ? r.bottom + 12 : r.top - bubble.offsetHeight - 12) + 'px';
    bubble.classList.toggle('below', below);
    bubble.style.setProperty('--ax', (r.left + r.width / 2 - parseFloat(bubble.style.left)) + 'px');
  }
  function tick() {
    if (!/tut=1/.test(location.hash) || !/^#\/draft/.test(location.hash)) { stop(); return; }
    const S = GM.draft.state();
    if (!S) return clear();
    if (S.phase === 'done') { clear(); if (!shown.done) { shown.done = true; fullTime(S); } return; }
    if (document.querySelector('.modal-wrap')) return clear();
    const signed = S.xi.filter(x => x.p != null).length;
    if (signed >= 3) {
      if (!shown.got) { shown.got = true; clear(); GM.toast('👍 <b>You’ve got it!</b> Fill all 11 places. Biggest total wins', 3200); }
      return clear();
    }
    const spin = document.getElementById('spin'), target = document.querySelector('.slot.target'), reels = document.querySelector('.stage .reel[data-reel]');
    if (target) point(target, 'place', '<b>3️⃣ Put him in your XI</b>Tap a glowing slot. He can play any position that lights up.');
    else if (spin && !spin.disabled && !reels) point(spin, 'spin', `<b>${signed ? 'Next signing' : '1️⃣ Spin the reels'}</b>${signed ? 'Spin again for three more players.' : 'Tap SPIN to see three real Premier League players.'}`);
    else if (reels && S.phase === 'pick') point(document.querySelector('.stage'), 'pick', '<b>2️⃣ Sign one</b>Their goals stay hidden until you pick, so go on what you know: strikers usually score more than keepers.');
    else clear();
  }
  function fullTime(S) {
    GM.store.set('firstXI', 1);
    const sc = GM.draft.total(S);
    // after the full-time sounds, and after the leaderboard name box if that's up (first score)
    const show = (tries = 0) => (document.querySelector('.modal-wrap') && tries < 120 ? setTimeout(() => show(tries + 1), 500) : card());
    setTimeout(show, 2600);
    function card() {
      const m = GM.modal(`<div class="welcome"><div class="wl-icon">🎉</div><h3>Your first XI: ${sc.toLocaleString()} goals</h3>
        <p>That’s the game. Now try <b>🌪️ CHAOS</b> for managers, storms and bonus points, the <b>📅 daily games</b> for your streak, or open your free <b>🎁 pack</b>.</p>
        <div class="row"><a class="btn ghost" href="#/packs" data-close>🎁 My pack</a><a class="btn big" href="#/draft?m=chaos&s=goals" data-close>🌪️ Try CHAOS</a></div></div>`);
      GM.$$('a[data-close]', m.el).forEach(a => a.addEventListener('click', () => m.close()));
    }
  }
  function stop() { clearInterval(timer); timer = null; clear(); }
  GM.coachStart = function () { if (timer) return; shown = {}; timer = setInterval(tick, 350); };
  window.addEventListener('hashchange', () => { if (/tut=1/.test(location.hash)) GM.coachStart(); });
  window.addEventListener('resize', () => { if (bubble && lit) place(lit); });
  if (/tut=1/.test(location.hash)) GM.coachStart();
})();

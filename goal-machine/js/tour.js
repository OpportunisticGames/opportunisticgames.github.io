/* Goal Machine – the tour and the first-time tips (5.36).
   The tour: after your first XI (and once for players who were here before it), a 30-second walk round the real screen,
   one bubble at a time over a spotlight: the top bar, the levels, the Home tabs and the five tabs at the bottom. Tap
   anywhere to go on, Skip any time; it's under Settings → Take the tour as well.
   The tips: the first time you open one of the deeper games (CHAOS, the Targets, Hat-Trick, Dodgy Owner), up to three
   short cards on what you wouldn't work out straight away. Settings → Show the game tips again brings them back. */
'use strict';

(function () {
  const STEPS = [
    ['.gs-me', '👤 That’s you', 'Claim a name and you’re on the leaderboards, your mates can find and challenge you, and your game is backed up.', () => !GM.account()],
    ['.lvl-chip', '⭐ Your level', 'Every game you play earns XP. Each level brings a reward: packs, prize spins and new kit.'],
    ['.season-chip', '🗓️ This month’s season', 'A new season every month, with its own look and a 30-tier track of rewards. Tap it to see what’s coming.'],
    ['.gs-open', '🎁 Things to open', 'Packs, prize spins and picks you’ve earned wait here. Tap to open them.'],
    ['.gs-bell', '🔔 What’s been happening', 'Who beat your score, whose top spot you took, and games waiting for you.'],
    ['.hard-toggle.four', '🎚️ Your level of difficulty', 'Easy brings more big names (and rough numbers in the Targets). Hard and Extreme hide the clues. Each level has its own leaderboards.'],
    ['#htabs', '🎮 More ways to play', 'CHAOS and the main event, the Targets, the transfer market and quick games: all on these tabs.'],
    ['[data-tab="today"]', '📅 Today', 'Daily games to keep your streak going, and three weekly missions with rewards.'],
    ['[data-tab="online"]', '🌐 Online', 'Claim a name to race and duel your mates, send challenges, or Quick match someone new.'],
    ['[data-tab="leaderboard"]', '🏆 Ranks', 'Every leaderboard, and Best Players across them all. Tap any name to see their profile.'],
    ['[data-tab="locker"]', '🎒 Locker', 'Your card album: finish each card piece by piece, from 🟫 Bronze (1 piece) to 💎 Icon (7). Plus your season track and the kit you wear.'],
  ];
  let layer = null;
  // (the browser tests run with navigator.webdriver: they'd trip over pop-ups they don't expect, so these only appear
  // by themselves for real players, or when a test asks with gm:tourTest)
  const auto = () => !navigator.webdriver || !!GM.store.get('tourTest');
  const end = () => { if (layer) { layer.remove(); layer = null; } GM.store.set('tourSeen', 1); };

  GM.tour = function () {
    if (layer) return;
    if (location.hash.replace(/^#\/?/, '')) { location.hash = '#/'; setTimeout(GM.tour, 700); return; }
    GM.$$('.modal-wrap').forEach(m => m.remove());
    window.scrollTo(0, 0);
    const steps = STEPS.filter(([sel, , , when]) => { const e = document.querySelector(sel); return e && e.offsetParent !== null && (!when || when()); });
    let i = 0;
    layer = document.createElement('div');
    layer.className = 'tour';
    layer.innerHTML = '<div class="tour-ring"></div><div class="tour-bubble"></div>';
    document.body.appendChild(layer);
    const ring = layer.firstChild, bub = layer.lastChild;
    const show = () => {
      if (!layer) return;
      if (i >= steps.length) { end(); return done(); }
      const [sel, title, text] = steps[i], el = document.querySelector(sel);
      if (!el) { i++; return show(); }
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      bub.innerHTML = `<b>${title}</b><span>${text}</span><div class="tour-row"><small>${i + 1} of ${steps.length}</small><button class="btn ghost small" data-skip>Skip</button><button class="btn small" data-next>${i === steps.length - 1 ? 'Done' : 'Next ›'}</button></div>`;
      const bw = Math.min(320, innerWidth - 24), below = r.top + r.height / 2 < innerHeight / 2;
      bub.style.width = bw + 'px';
      bub.style.left = Math.max(12, Math.min(innerWidth - bw - 12, r.left + r.width / 2 - bw / 2)) + 'px';
      bub.style.top = below ? r.bottom + 14 + 'px' : '';
      bub.style.bottom = below ? '' : innerHeight - r.top + 14 + 'px';
      bub.classList.toggle('below', below);
      bub.style.setProperty('--ax', (r.left + r.width / 2 - parseFloat(bub.style.left)) + 'px');
      GM.$('[data-skip]', bub).onclick = e => { e.stopPropagation(); end(); };
    };
    layer.onclick = () => { GM.sound.play('tap'); i++; show(); };  // a tap anywhere (or Next) goes on
    layer.again = show;  // (the screen changed size: the same step, moved to where its part is now)
    show();
  };
  // the end: what to do next (and, on an Android phone's browser, the app)
  function done() {
    const web = !window.AndroidApp && /Android/i.test(navigator.userAgent);
    if (!GM.account() && GM.lb.enabled) {  // no name yet: that's the one thing left to do
      const m = GM.modal(`<div class="welcome"><div class="wl-icon">🔒</div><h3>One last thing: your name</h3>
        <p>${GM.esc(GM.NAME_WHY)}</p>
        <div class="row"><button class="btn ghost" data-close>Later</button><button class="btn big" id="tourname">🔒 Claim my name</button></div></div>`);
      GM.$('#tourname', m.el).onclick = async () => { m.close(); await GM.accountModal(GM.NAME_WHY); GM.statusBar(); };
      return;
    }
    const m = GM.modal(`<div class="welcome"><div class="wl-icon">🧭</div><h3>That’s the tour</h3>
      <p>Try <b>🌪️ CHAOS</b> next: managers, storms and bonus points. The tour’s in <b>Settings</b> if you want it again.</p>
      ${web ? `<p class="muted small">Your scores and cards come with you into the app.</p>` : ''}
      <div class="row">${web ? `<a class="btn ghost" href="${GM.PLAY_URL}" target="_blank" rel="noopener">🤖 Get the app</a>` : '<button class="btn ghost" data-close>Look around</button>'}<a class="btn big" href="#/draft?m=chaos&s=goals" data-close>🌪️ Try CHAOS</a></div></div>`);
    GM.$$('a[data-close]', m.el).forEach(a => a.addEventListener('click', () => m.close()));
  }
  addEventListener('resize', () => { if (layer && layer.again) layer.again(); });
  addEventListener('hashchange', () => { if (layer) end(); });

  // players who were here before the tour: offered once, on Home, when nothing else is showing
  GM.tourOffer = function () {
    if (!auto() || GM.store.get('tourSeen') || GM.store.get('tourOffered') || !GM.firstXIDone() || location.hash.replace(/^#\/?/, '')) return;
    setTimeout(() => {
      if (document.querySelector('.modal-wrap, .tour') || location.hash.replace(/^#\/?/, '')) return;
      GM.store.set('tourOffered', 1);
      const m = GM.modal(`<div class="welcome"><div class="wl-icon">🧭</div><h3>A lot’s new round here</h3>
        <p>Levels, seasons, cards, the Locker, Ranks… Want a 30-second tour?</p>
        <div class="row"><button class="btn ghost" data-close>No thanks</button><button class="btn big" id="tourgo">🧭 Show me round</button></div></div>`);
      GM.$('#tourgo', m.el).onclick = () => { m.close(); setTimeout(GM.tour, 250); };
    }, 2500);
  };

  /* ---------------------------------------------------------------- the first-time tips */
  const TIPS = {
    chaos: ['🌪️ CHAOS', [
      ['👔', 'Your manager', 'Each one has a perk and a catch. Tap him in the dugout (under the score) any time to check his.'],
      ['📈', 'The CHAOS meter', 'Taking and playing wildcards fills it. When it’s full, a CHAOS moment hits your XI on the next spin: good, bad or ridiculous.'],
      ['🏆', 'Points, not goals', 'Your score is your XI’s total plus every bonus. Tap a player on your pitch to see what’s happened to him.'],
    ]],
    target: ['🎯 The Targets', [
      ['🎯', 'Get close, don’t go big', 'The aim is to land as close to the target as you can. Going over counts against you just like falling short.'],
      ['👀', 'Numbers stay hidden', 'You only see a player’s number once he’s signed, so think about who you know well (Easy gives you a rough number).'],
    ]],
    hattrick: ['🃏 Hat-Trick', [
      ['🤝', 'Football Spades', 'You and a computer partner against two computer rivals. Bid how many tricks your team will win.'],
      ['⭐', 'Who wins a trick', 'Follow the suit led if you can; the highest card wins, and ⭐ Legends are trumps. The two jokers can turn a trick.'],
      ['🟨', 'Scoring', 'Hit your bid for points. Extra tricks are bags 🟨, and ten bags cost 100. First to 250 wins.'],
    ]],
    owner: ['🕴️ Dodgy Owner', [
      ['🏟️', 'Your club, your season', 'You hire and sack the coach, run the money and the transfers, and can even pick the team yourself (proud coaches hate that).'],
      ['▶️', 'One big button', 'It moves the season on until something needs you: an offer, the transfer window, your inbox.'],
      ['📜', 'Your legacy', 'Points, the cup, your owner’s ambition, the fans and profit all count. Too much heat and the league investigates.'],
    ]],
  };
  const tipKey = (path, q) => (path === 'draft' ? (/^(sz)?chaos/.test(q.m || '') ? 'chaos' : ['target', 'treble', 'mystery'].includes(q.m) ? 'target' : null)
    : path === 'hattrick' || path === 'owner' ? path : null);
  GM.firstTimeTips = function (path, q) {
    const k = tipKey(path, q || {});
    if (!k || !auto() || (q && q.tut) || GM.store.get('tip:' + k) || layer) return;
    const [name, cards] = TIPS[k];
    const hash = location.hash;
    // (after whatever's showing first, like CHAOS's kick-off and manager cards; gone if you leave)
    const go = (n = 0) => {
      if (location.hash !== hash || GM.store.get('tip:' + k)) return;  // (left before it showed: it shows next time instead)
      if (document.querySelector('.modal-wrap, .cm')) return n < 240 ? setTimeout(() => go(n + 1), 500) : null;
      GM.store.set('tip:' + k, 1);
      GM.modal(`<div class="welcome tips"><div class="wl-kicker">First time in ${name}</div>
        ${cards.map(([i, t, x]) => `<div class="tip-row"><span>${i}</span><p><b>${t}</b>${x}</p></div>`).join('')}
        <div class="row"><button class="btn big" data-close>Got it ⚽</button></div></div>`);
    };
    setTimeout(go, 450);
  };
  GM.resetTips = () => { Object.keys(TIPS).forEach(k => GM.store.set('tip:' + k, 0)); };
})();

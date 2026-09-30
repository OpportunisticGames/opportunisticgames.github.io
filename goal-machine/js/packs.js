/* Goal Machine – packs: player cards you finish piece by piece, and the Packed XI you build from finished cards.
   Every player with 50+ PL apps is a card: 🟫 Bronze (1 piece), ⚪ Silver (2), 🟡 Gold (3) or 🟣 Legend (5), by how
   well known he is (Hall of Famers are always Legends). Pieces come from packs (a free one every day, a bonus for three
   dailies in a day or a new badge) and from signing him in a draft, once a day per player, so the stars that turn up
   all the time still take a while. The Packed XI is the best XI of finished cards, with its own leaderboard.
   Stored on this device ('cards'). */
'use strict';

(function () {
  const TIERS = {
    b: { name: 'Bronze', icon: '🟫', need: 1, odds: 55 },
    s: { name: 'Silver', icon: '⚪', need: 2, odds: 30 },
    g: { name: 'Gold', icon: '🟡', need: 3, odds: 12 },
    l: { name: 'Legend', icon: '🟣', need: 5, odds: 3 },
  };
  const ORDER = ['b', 's', 'g', 'l'];
  // by fame: Hall of Famers and the 25 best known are Legends, then the next 200 Gold and the next 500 Silver
  const TIER = new Map(), POOL = { b: [], s: [], g: [], l: [] };
  GM.players.slice().sort((a, b) => b.fame - a.fame).forEach((p, i) => {
    const t = p.hon.H || i < 25 ? 'l' : i < 225 ? 'g' : i < 725 ? 's' : 'b';
    TIER.set(p.pk, t); POOL[t].push(p);
  });
  GM.TIERS = TIERS;
  GM.cardTier = p => TIER.get(p.pk) || 'b';
  GM.tierCounts = () => Object.fromEntries(ORDER.map(t => [t, POOL[t].length]));

  const load = () => {
    const c = GM.store.get('cards', null) || { p: {}, packs: 0, daily: '', seen: {}, seenDay: '', opened: 0, best: 0 };
    if (c.seenDay !== GM.today()) { c.seen = {}; c.seenDay = GM.today(); }
    return c;
  };
  const save = c => GM.store.set('cards', c);
  const need = p => TIERS[GM.cardTier(p)].need;
  const done = (c, p) => (c.p[p.pk] || 0) >= need(p);
  GM.cardPieces = p => load().p[p.pk] || 0;
  GM.cardsDone = t => { const c = load(); return POOL[t].filter(p => done(c, p)).length; };

  // packs: the free daily one, plus any earned
  GM.packsWaiting = () => { const c = load(); return c.packs + (c.daily !== GM.today() ? 1 : 0); };
  GM.givePack = function (n, why) {
    const c = load(); c.packs += n; save(c);
    if (why) setTimeout(() => GM.toast(`🎁 <b>+${n} pack${n > 1 ? 's' : ''}</b> · ${why}`, 2600), 900);
    GM.packDots();
  };
  GM.packDots = () => GM.$$('.pack-count').forEach(el => { const n = GM.packsWaiting(); el.textContent = n; el.hidden = !n; });

  // a piece for each player you sign (once a day each); called when a draft finishes
  GM.cardsFromDraft = function (xi) {
    const c = load(), finished = [];
    xi.forEach(p => {
      if (!p || !TIER.has(p.pk) || c.seen[p.pk]) return;
      c.seen[p.pk] = 1;
      const was = done(c, p);
      c.p[p.pk] = Math.min(need(p), (c.p[p.pk] || 0) + 1);
      if (!was && done(c, p)) finished.push(p);
    });
    save(c);
    finished.filter(p => GM.cardTier(p) !== 'b').slice(0, 2).forEach((p, i) =>
      setTimeout(() => GM.toast(`🧩 ${TIERS[GM.cardTier(p)].icon} <b>${GM.esc(p.name)}</b> card complete!`, 2600), 3400 + i * 2800));
    updateXI();
    return finished;
  };

  /* ---------------------------------------------------------------- the Packed XI */
  GM.packedXI = function (stat = 'goals') {
    const c = load(), key = GM.STATS[stat].key;
    const xi = GM.dreamXI(GM.players.filter(p => done(c, p)), key);
    return { xi, total: xi.reduce((t, s) => t + (s.player ? s.player[key] : 0), 0), n: xi.filter(s => s.player).length };
  };
  // a better Packed XI goes on the board (goals)
  function updateXI() {
    const px = GM.packedXI(), c = load();
    if (px.total > (c.best || 0)) {
      c.best = px.total; save(c);
      GM.recordScore('packedxi', px.total, { t: px.total, n: px.n }, { quiet: true });
    }
    return px;
  }

  /* ---------------------------------------------------------------- opening a pack */
  // five pieces: the tier by the odds (the last is Silver or better), then someone whose card isn't finished
  function draw(c, r) {
    const out = [];
    for (let i = 0; i < 5; i++) {
      let t = r.weighted(ORDER, k => TIERS[k].odds);
      if (i === 4 && t === 'b') t = r.weighted(['s', 'g', 'l'], k => TIERS[k].odds);
      let p = null;
      for (let k = 0; k < 40 && !p; k++) { const q = r.pick(POOL[t]); if (!done(c, q) && !out.some(o => o.p === q)) p = q; }
      if (!p) p = r.pick(POOL[t]);  // every card in the tier is finished: a spare
      out.push({ p, t });
    }
    // the best one last, for the reveal
    return out.sort((a, b) => ORDER.indexOf(a.t) - ORDER.indexOf(b.t));
  }
  GM.openPack = function () {
    const c = load();
    if (c.daily !== GM.today()) c.daily = GM.today();
    else if (c.packs > 0) c.packs--;
    else return null;
    const before = GM.packedXI().total;
    const cards = draw(c, GM.rng(GM.newSeed()));
    cards.forEach(x => {
      const was = done(c, x.p);
      if (was) { x.spare = true; return; }
      c.p[x.p.pk] = (c.p[x.p.pk] || 0) + 1;
      x.have = c.p[x.p.pk]; x.need = need(x.p); x.finished = x.have >= x.need;
    });
    c.opened = (c.opened || 0) + 1;
    save(c);
    const px = updateXI();
    GM.checkGame('pack', c.opened, { legend: cards.some(x => x.t === 'l'), finished: cards.filter(x => x.finished).map(x => x.t),
      xi: px.n, legends: GM.players.filter(p => GM.cardTier(p) === 'l' && done(c, p)).length });
    GM.packDots();
    return { cards, better: px.total > before ? px.total : 0 };
  };

  const cardHtml = (x, back = true) => {
    const p = x.p, t = TIERS[x.t];
    const prog = x.spare ? '<span class="pc-prog">✓ already complete</span>'
      : x.finished ? '<span class="pc-prog done">✅ COMPLETE</span>'
      : `<span class="pc-prog">🧩 ${x.have}/${x.need}</span>`;
    return `<div class="pcard tier-${x.t}${x.finished ? ' finished' : ''}"><div class="pc-inner">
      ${back ? '<div class="pc-back"><b>GOAL</b><span>MACHINE</span></div>' : ''}
      <div class="pc-front"><span class="pc-tier">${t.icon} ${t.name}</span>${GM.avatar(p, 'lg')}
        <b class="pc-name">${GM.esc(p.name)}</b><span class="pc-meta">${p.poss[0]} ${GM.flag(p.nat)}</span>
        <span class="pc-stat">${p.goals} goals · ${p.apps} apps</span>${prog}</div></div></div>`;
  };

  // the full-screen opening: tap the pack, it bursts, the cards flip one by one (best last), a Legend walks out
  GM.packOpening = function (onClose) {
    if (!GM.packsWaiting()) return;
    const el = document.createElement('div');
    el.className = 'pack-open';
    el.innerHTML = `<div class="po-pack" role="button" aria-label="Open the pack"><div class="po-foil"><b>GOAL</b><span>MACHINE</span><i>5 PLAYER PIECES</i></div></div>
      <p class="po-hint">👆 Tap to open</p><div class="po-cards"></div><div class="po-walk"></div><div class="po-actions"></div>`;
    document.body.appendChild(el);
    GM.sound.play('drumroll');
    const pack = el.querySelector('.po-pack');
    const later = (ms, f) => setTimeout(() => { if (el.isConnected) f(); }, ms);
    let opened = false;
    pack.onclick = () => {
      if (opened) return; opened = true;
      const res = GM.openPack();
      if (!res) { el.remove(); return; }
      el.classList.add('burst'); GM.sound.play('wild'); GM.buzz(40);
      later(650, () => {
        el.classList.add('dealt');
        const box = el.querySelector('.po-cards');
        box.innerHTML = res.cards.map(x => cardHtml(x)).join('');
        const cards = [...box.children];
        const flip = i => {
          if (i >= cards.length) return finish(res);
          const x = res.cards[i], go = () => {
            cards[i].classList.add('flipped');
            GM.sound.play(x.t === 'l' ? 'cheer' : x.t === 'g' ? 'jackpot' : x.finished ? 'good' : 'place');
            later(x.t === 'l' ? 1400 : x.t === 'g' ? 900 : 550, () => flip(i + 1));
          };
          if (x.t === 'l') walkout(x.p, go); else go();
        };
        later(500, () => flip(0));
      });
    };
    // a Legend: the lights go down, then his flag, his position, his club… then the card
    function walkout(p, then) {
      const w = el.querySelector('.po-walk');
      el.classList.add('walking'); GM.sound.play('drumroll');
      const steps = [`<span class="pw-big">${GM.flag(p.nat)}</span><small>${GM.esc(p.nat || '')}</small>`, `<span class="pw-big">${p.poss[0]}</span><small>${GM.POS_NAME[p.poss[0]] || ''}</small>`,
        `<span class="pw-club">${GM.clubChip(p.clubs[0], true)}</span>`, '<span class="pw-big">🟣</span><small>LEGEND</small>'];
      steps.forEach((s, i) => later(i * 900, () => { w.innerHTML = `<div class="pw-step">${s}</div>`; GM.sound.play('place'); }));
      later(steps.length * 900, () => { el.classList.remove('walking'); w.innerHTML = ''; then(); });
    }
    function finish(res) {
      const left = GM.packsWaiting();
      el.querySelector('.po-actions').innerHTML = `${res.better ? `<p class="po-better">🃏 Packed XI up to <b>${res.better.toLocaleString()}</b> goals</p>` : ''}
        ${left ? `<button class="btn big" data-again>🎁 Open another (${left} left)</button>` : ''}<button class="btn ${left ? 'ghost' : 'big'}" data-done>Done</button>`;
      el.querySelector('[data-done]').onclick = () => { el.remove(); if (onClose) onClose(); };
      const again = el.querySelector('[data-again]');
      if (again) again.onclick = () => { el.remove(); GM.packOpening(onClose); };
    }
  };

  /* ---------------------------------------------------------------- the Packs page */
  GM.packedPitch = function (px) {
    const rows = [['ST'], ['LM', 'CM', 'RM'], ['LB', 'CB', 'RB'], ['GK']];
    const slot = s => s.player
      ? `<div class="slot filled tier-${GM.cardTier(s.player)}" title="${GM.esc(s.player.name)}">${GM.avatar(s.player)}<span class="slot-name">${GM.esc(s.player.name.split(' ').slice(-1)[0])}</span><span class="slot-goals">${s.player.goals}</span><span class="slot-pos">${s.pos}</span></div>`
      : `<div class="slot empty"><span class="pos pos-${GM.GROUP[s.pos]}">${s.pos}</span></div>`;
    return `<div class="pitch packed"><div class="pitch-lines"></div><div class="shape">${px.total.toLocaleString()} goals · ${px.n}/11</div>
      ${rows.map(r => `<div class="pitch-row">${px.xi.filter(s => r.includes(s.pos)).map(slot).join('')}</div>`).join('')}</div>`;
  };
  GM.packsPage = function (root, view = 'xi', tier = '') {
    const c = load(), n = GM.packsWaiting(), px = GM.packedXI();
    const counts = ORDER.map(t => [t, POOL[t].filter(p => done(c, p)).length, POOL[t].length]);
    const started = GM.players.filter(p => c.p[p.pk] && (!tier || GM.cardTier(p) === tier))
      .sort((a, b) => ORDER.indexOf(GM.cardTier(b)) - ORDER.indexOf(GM.cardTier(a)) || (done(c, b) - done(c, a)) || b.fame - a.fame);
    const mid = new Date(); mid.setHours(24, 0, 0, 0);
    const hrs = Math.ceil((mid - Date.now()) / 36e5);
    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🎁 Packs</h2><span class="top-btns">${GM.lbButton('packedxi')}</span></div>
      <div class="pack-hero${n ? ' ready' : ''}">
        <div class="po-foil small"><b>GOAL</b><span>MACHINE</span></div>
        <div><b>${n ? `${n} pack${n > 1 ? 's' : ''} to open` : 'No packs right now'}</b>
          <small>${n ? 'Five player pieces in each. The last one’s Silver or better.' : `A free pack in ${hrs}h. Play three dailies in a day, or earn a badge, for a bonus pack.`}</small>
          ${n ? '<button class="btn big" id="openpack">🎁 Open a pack</button>' : ''}</div></div>
      <div class="tier-row">${counts.map(([t, have, all]) => `<a class="${tier === t ? 'on' : ''}" href="#/packs?v=cards${tier === t ? '' : '&t=' + t}"><span>${TIERS[t].icon}</span><b>${have}/${all}</b><small>${TIERS[t].name} · ${TIERS[t].need} piece${TIERS[t].need > 1 ? 's' : ''}</small></a>`).join('')}</div>
      <div class="seg album-views"><a class="${view === 'xi' ? 'on' : ''}" href="#/packs">🃏 Packed XI</a><a class="${view === 'cards' ? 'on' : ''}" href="#/packs?v=cards">🧩 Cards</a><a class="${view === 'how' ? 'on' : ''}" href="#/packs?v=how">❓ How</a></div>
      ${view === 'xi' ? `<p class="muted">Your best XI from <b>finished</b> cards only. It gets better as you finish cards, and a better one goes on the leaderboard.</p>${GM.packedPitch(px)}` : ''}
      ${view === 'cards' ? (started.length ? `<div class="card-grid">${started.slice(0, 120).map(p => cardHtml({ p, t: GM.cardTier(p), have: c.p[p.pk], need: need(p), finished: done(c, p) }, false)).join('')}</div>${started.length > 120 ? `<p class="muted center">…and ${started.length - 120} more</p>` : ''}`
        : '<p class="muted center">No pieces yet. Open a pack, or sign players in any draft.</p>') : ''}
      ${view === 'how' ? `<div class="setting"><ul class="how-list">
        <li>Every player with 50+ PL apps is a card: 🟫 Bronze needs 1 piece, ⚪ Silver 2, 🟡 Gold 3 and 🟣 Legend 5.</li>
        <li>🎁 A free pack every day. A bonus pack when you play three daily games in a day, and for every new badge.</li>
        <li>✍️ Signing a player in any draft gives you a piece of his card, once a day per player.</li>
        <li>🃏 Your Packed XI is the best team you can make from finished cards. Legends walk out.</li></ul></div>` : ''}`;
    const b = GM.$('#openpack', root);
    if (b) b.onclick = () => GM.packOpening(() => GM.packsPage(root, view, tier));
  };
})();

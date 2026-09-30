/* Goal Machine – packs: player cards you finish piece by piece, and the Packed XI you build from finished cards.
   Every player with 50+ PL apps is a card: 🟫 Bronze (1 piece), ⚪ Silver (2), 🟡 Gold (3) or 🟣 Legend (5), by how
   well known he is (Hall of Famers are always Legends). Pieces come from packs and from signing him in a draft, once a
   day per player, so the stars that turn up all the time still take a while. The Packed XI is the best XI of
   finished cards, with its own leaderboard.
   Packs: a free one every day (a 🌍 Nations pack in an international break, a 🏟️ Matchday pack on your club's
   matchday), a bonus one for three dailies in a day or a new badge, and a 🟣 Legends pack for moving up a rank.
   Sometimes a card is a 🃏 wildcard and you choose: Pick one (1 of 3 Silver/Gold), Scout's tip (a piece for one of
   your nearly-finished cards) or Legend's choice (1 of 3 Legends).
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
    if (!c.extra) c.extra = [];  // special packs earned (Legends)
    if (c.seenDay !== GM.today()) { c.seen = {}; c.seenDay = GM.today(); }
    return c;
  };
  const save = c => GM.store.set('cards', c);
  const need = p => TIERS[GM.cardTier(p)].need;
  const done = (c, p) => (c.p[p.pk] || 0) >= need(p);
  GM.cardPieces = p => load().p[p.pk] || 0;
  GM.cardsDone = t => { const c = load(); return POOL[t].filter(p => done(c, p)).length; };

  /* ---------------------------------------------------------------- pack types */
  const clubCol = c => (GM.CLUB[c] || [0, '#444', '#fff']);
  const PACKS = {
    standard: { name: 'Player Pack', sub: () => '5 player pieces', pool: () => null },
    nations: {
      name: 'Nations Pack', nat: () => { const n = GM.nations(); return n[GM.rng('natpack:' + GM.today()).int(Math.min(12, n.length))]; },
      sub: () => `Every piece from ${PACKS.nations.nat()}`, pool: () => { const n = PACKS.nations.nat(); return GM.players.filter(p => p.nat === n); },
    },
    matchday: {
      name: 'Matchday Pack', fx: () => GM.matchToday && GM.matchToday(),
      sub: () => { const f = PACKS.matchday.fx(); return f ? `${GM.clubShort(f.home)} v ${GM.clubShort(f.away)} players` : 'Matchday players'; },
      pool: () => { const f = PACKS.matchday.fx(); return f ? GM.players.filter(p => p.clubs.includes(f.home) || p.clubs.includes(f.away)) : null; },
    },
    legends: { name: 'Legends Pack', sub: () => 'Choose a Legend, plus four Silver or better', pool: () => null },
  };
  GM.PACKS = PACKS;
  // today's free pack is themed when something's on
  const dailyType = () => (GM.intlBreak && GM.intlBreak() ? 'nations' : GM.matchToday && GM.matchToday() ? 'matchday' : 'standard');
  const nextType = c => (c.daily !== GM.today() ? dailyType() : c.extra.length ? c.extra[0] : c.packs > 0 ? 'standard' : null);
  GM.nextPackType = () => nextType(load());
  const packFace = (type, big) => {
    const P = PACKS[type], f = type === 'matchday' && P.fx(), [, bg, fg] = f ? clubCol(GM.favClub() || f.home) : [];
    const badge = type === 'nations' ? `<span class="pf-badge">${GM.flag(P.nat())}</span>` : type === 'matchday' ? '<span class="pf-badge">🏟️</span>' : type === 'legends' ? '<span class="pf-badge">🟣</span>' : '';
    return `<div class="po-foil pk-${type}${big ? '' : ' small'}"${f ? ` style="--pk1:${bg};--pk2:${fg}"` : ''}>${badge}<b>GOAL</b><span>MACHINE</span><i>${P.name.toUpperCase()}</i></div>`;
  };

  // packs waiting: the free daily one, specials and earned ones
  GM.packsWaiting = () => { const c = load(); return c.packs + c.extra.length + (c.daily !== GM.today() ? 1 : 0); };
  GM.givePack = function (n, why, type = 'standard') {
    const c = load();
    if (type === 'standard') c.packs += n; else for (let i = 0; i < n; i++) c.extra.push(type);
    save(c);
    if (why) setTimeout(() => GM.toast(`🎁 <b>+${n} ${type === 'standard' ? 'pack' : PACKS[type].name}${n > 1 ? 's' : ''}</b> · ${why}`, 2600), 900);
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

  /* ---------------------------------------------------------------- drawing a pack */
  // someone from the tier (within the pack's theme if it has one, dropping a tier if the theme has nobody there),
  // preferring cards you haven't finished and nobody already in this pack
  function pickFrom(c, r, t, theme, taken) {
    const tiers = ORDER.slice(0, ORDER.indexOf(t) + 1).reverse();
    for (const k of tiers) {
      const list = theme ? theme.filter(p => GM.cardTier(p) === k) : POOL[k];
      if (!list.length) continue;
      for (let i = 0; i < 40; i++) { const q = r.pick(list); if (!done(c, q) && !taken.has(q.pk)) return q; }
      const q = r.pick(list); if (!taken.has(q.pk)) return q;
    }
    return r.pick(theme && theme.length ? theme : POOL.b);
  }
  const WILDS = {
    pick: { icon: '🤝', name: 'Pick one', text: 'Choose one of these three', w: 60 },
    scout: { icon: '🔭', name: 'Scout’s tip', text: 'A piece for one of your cards that’s nearly there', w: 30 },
    legend: { icon: '🟣', name: 'Legend’s choice', text: 'Choose one of these three Legends', w: 10 },
  };
  GM.PACK_WILDS = WILDS;
  // the three options for a wildcard: { kind, options } (a Scout's tip with nothing started becomes a Pick one)
  function wildOptions(c, r, kind, theme, taken) {
    const out = [], seen = new Set(taken);
    const add = p => { if (p && !seen.has(p.pk)) { seen.add(p.pk); out.push(p); } };
    if (kind === 'scout') {
      GM.players.filter(p => c.p[p.pk] && !done(c, p) && GM.cardTier(p) !== 'b' && !seen.has(p.pk))
        .sort((a, b) => c.p[b.pk] / need(b) - c.p[a.pk] / need(a) || b.fame - a.fame).slice(0, 3).forEach(add);
      if (out.length) return { kind, options: out };
      kind = 'pick';
    }
    for (let i = 0; i < 30 && out.length < 3; i++) add(pickFrom(c, r, kind === 'legend' ? 'l' : r() < 0.35 ? 'g' : 's', kind === 'legend' ? null : theme, seen));
    return { kind, options: out };
  }
  function draw(c, r, type) {
    const theme = PACKS[type].pool(), taken = new Set(), out = [];
    for (let i = 0; i < 5; i++) {
      let t = r.weighted(ORDER, k => TIERS[k].odds);
      if ((i === 4 || type === 'legends') && t === 'b') t = r.weighted(['s', 'g', 'l'], k => TIERS[k].odds);
      const p = pickFrom(c, r, t, theme, taken);
      taken.add(p.pk);
      out.push({ p, t: GM.cardTier(p) });
    }
    // a wildcard: in 3 packs out of 10 (the Legends pack always has Legend's choice)
    const force = GM.packForce || {};
    const kind = type === 'legends' ? 'legend' : force.wild || (r() < 0.3 ? r.weighted(Object.keys(WILDS), k => WILDS[k].w) : null);
    if (kind && (force.wild !== 'none' || type === 'legends')) {
      const w = wildOptions(c, r, kind, theme, taken);
      if (w.options.length) out[type === 'legends' ? 4 : r.int(4)] = { wild: w };
    }
    // the best one last, for the reveal (a wildcard just before the best, a Legend's choice last)
    const rank = x => (x.wild ? (x.wild.kind === 'legend' ? 9 : 2.5) : ORDER.indexOf(x.t));
    return out.sort((a, b) => rank(a) - rank(b));
  }
  function apply(c, x) {
    if (done(c, x.p)) { x.spare = true; return; }
    c.p[x.p.pk] = (c.p[x.p.pk] || 0) + 1;
    x.have = c.p[x.p.pk]; x.need = need(x.p); x.finished = x.have >= x.need;
  }
  GM.openPack = function () {
    const c = load(), type = nextType(c);
    if (!type) return null;
    if (c.daily !== GM.today()) c.daily = GM.today();
    else if (c.extra.length) c.extra.shift();
    else c.packs--;
    const before = GM.packedXI().total;
    const cards = draw(c, GM.rng(GM.newSeed()), type);
    cards.forEach(x => { if (!x.wild) apply(c, x); });
    c.opened = (c.opened || 0) + 1;
    save(c);
    const res = { type, cards, before };
    finishPack(res);
    return res;
  };
  // a wildcard's choice: its piece goes on the chosen card
  GM.chooseWild = function (res, x, p) {
    const c = load();
    x.p = p; x.t = GM.cardTier(p); x.chose = x.wild.kind; x.wild = null;
    apply(c, x); save(c);
    finishPack(res);
  };
  function finishPack(res) {
    const c = load(), px = updateXI();
    res.better = px.total > res.before ? px.total : 0;
    if (res.cards.some(x => x.wild)) return;  // wait for the choice
    if (res.checked) return; res.checked = true;
    GM.checkGame('pack', c.opened, { legend: res.cards.some(x => x.t === 'l'), finished: res.cards.filter(x => x.finished).map(x => x.t),
      xi: px.n, type: res.type, wild: res.cards.some(x => x.chose) });
    GM.packDots();
  }

  /* ---------------------------------------------------------------- the cards */
  const short = n => (n.length <= 13 ? n : n.split(' ').slice(-1)[0]);
  GM.cardHtml = function (x, opts = {}) {
    const back = opts.back !== false;
    const backHtml = back ? `<div class="pc-back"><span class="pcb-ring"><b>GM</b></span></div>` : '';
    if (x.wild) {
      const W = WILDS[x.wild.kind];
      return `<div class="pcard tier-w"><div class="pc-inner">${backHtml}<div class="pc-front pc-wild"><span class="pw-joker">🃏</span><b>WILDCARD</b><span class="pw-kind">${W.icon} ${W.name}</span></div></div></div>`;
    }
    const p = x.p, t = x.t || GM.cardTier(p), n = TIERS[t].need, have = x.have != null ? x.have : (x.spare ? n : 0);
    const pips = Array.from({ length: n }, (_, i) => `<i class="${i < have ? 'on' : ''}${i === have - 1 && x.fresh !== false && !x.spare && opts.fresh ? ' new' : ''}"></i>`).join('');
    return `<div class="pcard tier-${t}${x.finished ? ' finished' : ''}${opts.cls ? ' ' + opts.cls : ''}"${opts.attr || ''}><div class="pc-inner">${backHtml}
      <div class="pc-front"><span class="pc-sheen"></span>
        <div class="pc-top"><b class="pc-num">${p.goals}</b><small>GLS</small><span class="pc-pos">${p.poss[0]}</span><span class="pc-flag">${GM.flag(p.nat)}</span></div>
        <div class="pc-photo">${GM.avatar(p, 'lg')}</div>
        <div class="pc-name${short(p.name).length > 9 ? ' long' : ''}">${GM.esc(short(p.name))}</div>
        <div class="pc-stats"><span><b>${p.ast}</b>AST</span><span><b>${p.apps}</b>APP</span><span><b>${p.first}</b>DEB</span></div>
        <div class="pc-foot"><span class="pc-club">${GM.esc(GM.clubShort(p.clubs[0]))}</span><span class="pc-pips">${x.spare ? '<em>spare</em>' : pips}</span></div>
        ${x.finished ? '<span class="pc-done">COMPLETE</span>' : ''}${x.chose ? `<span class="pc-chose">${WILDS[x.chose].icon}</span>` : ''}</div></div></div>`;
  };

  /* ---------------------------------------------------------------- opening */
  // light rays; tap the pack, it charges up and the top tears off; the cards rise out and fan into a hand, face down
  // (Gold and Legend backs glow); they flip one by one, best last; a wildcard asks you to choose; a Legend walks out.
  // Tap during the reveal to speed it up.
  GM.packOpening = function (onClose) {
    const type = GM.nextPackType();
    if (!type) return;
    const P = PACKS[type];
    const el = document.createElement('div');
    el.className = 'pack-open pko-' + type;
    el.innerHTML = `<div class="po-rays"></div><div class="po-flash"></div>
      <div class="po-stage"><div class="po-pack" role="button" aria-label="Open the pack"><div class="po-strip"></div>${packFace(type, true)}</div>
        <p class="po-name">${P.name}<small>${GM.esc(P.sub())}</small></p><p class="po-hint">👆 Tap to open</p></div>
      <div class="po-cards"></div><div class="po-walk"></div><div class="po-choice"></div><div class="po-fx"></div><div class="po-actions"></div>`;
    document.body.appendChild(el);
    GM.sound.play('drumroll');
    const later = (ms, f) => setTimeout(() => { if (el.isConnected) f(); }, ms);
    let opened = false, fast = false, res = null;
    el.querySelector('.po-pack').onclick = () => {
      if (opened) return; opened = true;
      el.classList.add('charging'); GM.sound.play('charge', 1); later(300, () => GM.sound.play('charge', 2)); later(600, () => GM.sound.play('charge', 3));
      later(900, () => {
        res = GM.openPack();
        if (!res) { el.remove(); return; }
        el.classList.remove('charging'); el.classList.add('torn'); GM.sound.play('crack'); GM.buzz(60);
        later(700, deal);
      });
    };
    el.addEventListener('click', e => { if (el.classList.contains('dealt') && !e.target.closest('.po-choice, .po-actions')) fast = true; });
    function deal() {
      el.classList.add('dealt');
      const box = el.querySelector('.po-cards');
      box.innerHTML = res.cards.map((x, i) => GM.cardHtml(x, { fresh: true, attr: ` style="--i:${i}"` })).join('');
      const cards = [...box.children];
      GM.sound.play('card');
      // the backs of the good ones glow before they turn
      later(700, () => res.cards.forEach((x, i) => { if (x.wild) cards[i].classList.add('hint-w'); else if (x.t === 'g' || x.t === 'l') cards[i].classList.add('hint-' + x.t); }));
      later(1300, () => flip(0));
      function flip(i) {
        if (i >= cards.length) return finish();
        const x = res.cards[i];
        const go = () => {
          cards[i].classList.add('flipped');
          GM.sound.play(x.wild ? 'wild' : x.t === 'l' ? 'cheer' : x.t === 'g' ? 'jackpot' : x.finished ? 'good' : 'card');
          if (x.t === 'g' || x.t === 'l') burst(cards[i], x.t);
          if (x.wild) return later(700, () => choose(x, i, () => later(500, () => flip(i + 1))));
          later(fast ? 180 : x.t === 'l' ? 1500 : x.t === 'g' ? 1000 : 600, () => flip(i + 1));
        };
        if (x.t === 'l' && !x.wild) walkout(x.p, go); else go();
      }
      // a wildcard: three cards face up, tap one
      function choose(x, i, then) {
        const W = WILDS[x.wild.kind], box2 = el.querySelector('.po-choice'), c = load();
        box2.innerHTML = `<div class="pch-head"><span>${W.icon}</span><b>${W.name}</b><small>${W.text}</small></div>
          <div class="pch-cards">${x.wild.options.map((p, k) => GM.cardHtml({ p, t: GM.cardTier(p), have: c.p[p.pk] || 0 }, { back: false, attr: ` data-pick="${k}"` })).join('')}</div>`;
        el.classList.add('choosing');
        GM.$$('[data-pick]', box2).forEach(b => b.onclick = () => {
          const p = x.wild.options[+b.dataset.pick];
          b.classList.add('picked'); GM.sound.play('good');
          later(450, () => {
            el.classList.remove('choosing'); box2.innerHTML = '';
            GM.chooseWild(res, x, p);
            const card = document.createElement('div');
            card.innerHTML = GM.cardHtml(x, { fresh: true });
            const nc = card.firstElementChild; nc.classList.add('flipped', 'from-wild');
            cards[i].replaceWith(nc); cards[i] = nc;
            if (x.t === 'g' || x.t === 'l') burst(nc, x.t);
            then();
          });
        });
      }
    }
    // a Legend: the lights go down, then his flag, his position, his club… then the card
    function walkout(p, then) {
      const w = el.querySelector('.po-walk'), step = fast ? 450 : 900;
      el.classList.add('walking'); GM.sound.play('drumroll');
      const steps = [`<span class="pw-big">${GM.flag(p.nat)}</span><small>${GM.esc(p.nat || '')}</small>`, `<span class="pw-big">${p.poss[0]}</span><small>${GM.POS_NAME[p.poss[0]] || ''}</small>`,
        `<span class="pw-club">${GM.clubChip(p.clubs[0], true)}</span>`, '<span class="pw-big">🟣</span><small>LEGEND</small>'];
      steps.forEach((s, i) => later(i * step, () => { w.innerHTML = `<div class="pw-step">${s}</div>`; GM.sound.play('place'); }));
      later(steps.length * step, () => { el.classList.remove('walking'); w.innerHTML = ''; then(); });
    }
    // sparks for Gold, confetti for a Legend
    function burst(card, t) {
      const fx = el.querySelector('.po-fx'), r = card.getBoundingClientRect(), n = t === 'l' ? 36 : 18;
      const cols = t === 'l' ? ['#f0abfc', '#a855f7', '#fde047', '#fff'] : ['#fde047', '#facc15', '#fff'];
      for (let k = 0; k < n; k++) {
        const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * (t === 'l' ? 160 : 90);
        s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${cols[k % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
        fx.appendChild(s); setTimeout(() => s.remove(), 1100);
      }
    }
    function finish() {
      const left = GM.packsWaiting(), fin = res.cards.filter(x => x.finished).length;
      el.classList.add('over');
      el.querySelector('.po-actions').innerHTML = `<p class="po-better">${fin ? `🧩 ${fin} card${fin > 1 ? 's' : ''} finished` : '🧩 Pieces added'}${res.better ? ` · 🃏 Packed XI up to <b>${res.better.toLocaleString()}</b> goals` : ''}</p>
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
  // the Album's pack box: the next pack, how many are waiting, and Open
  GM.packBox = function () {
    const c = load(), n = GM.packsWaiting(), type = nextType(c);
    const mid = new Date(); mid.setHours(24, 0, 0, 0);
    const hrs = Math.ceil((mid - Date.now()) / 36e5);
    return `<div class="pack-box${n ? ' ready' : ''}">${packFace(type || 'standard', false)}
      <div><b>${n ? `${n} pack${n > 1 ? 's' : ''}` : 'No packs'}</b><small>${n ? `Next: ${PACKS[type].name}` : `Free one in ${hrs}h`}</small>
        ${n ? '<button class="btn small" id="openpack">🎁 Open</button>' : ''}</div></div>`;
  };
  GM.cardsFinished = () => { const c = load(); return GM.players.filter(p => done(c, p)).length; };
  // the Album's Cards section: how many of each tier you've finished, the cards you've started, and how it works
  GM.cardsSection = function (tier = '') {
    const c = load();
    const counts = ORDER.map(t => [t, POOL[t].filter(p => done(c, p)).length, POOL[t].length]);
    const started = GM.players.filter(p => c.p[p.pk] && (!tier || GM.cardTier(p) === tier))
      .sort((a, b) => ORDER.indexOf(GM.cardTier(b)) - ORDER.indexOf(GM.cardTier(a)) || (done(c, b) - done(c, a)) || b.fame - a.fame);
    return `<div class="tier-row">${counts.map(([t, have, all]) => `<a class="${tier === t ? 'on' : ''}" href="#/album?v=cards${tier === t ? '' : '&t=' + t}"><span>${TIERS[t].icon}</span><b>${have}/${all}</b><small>${TIERS[t].name} · ${TIERS[t].need} piece${TIERS[t].need > 1 ? 's' : ''}</small></a>`).join('')}</div>
      <details class="set how-cards"><summary><span>❓ How cards work</span></summary><ul class="how-list">
        <li>Every player with 50+ PL apps is a card: 🟫 Bronze needs 1 piece, ⚪ Silver 2, 🟡 Gold 3 and 🟣 Legend 5. Finished cards go into your 🃏 XI.</li>
        <li>🎁 A free pack every day: a 🌍 Nations pack in an international break, a 🏟️ Matchday pack when your club plays. A bonus pack for three daily games in a day, for every new badge and every level, and a 🟣 Legends pack when you go up a rank.</li>
        <li>🃏 Some packs hold a wildcard: pick one of three, a scout’s tip for a card that’s nearly there, or (rarely) a Legend of your choice.</li>
        <li>✍️ Signing a player in any draft gives you a piece of his card, once a day per player.</li></ul></details>
      ${started.length ? `<div class="card-grid">${started.slice(0, 120).map(p => GM.cardHtml({ p, t: GM.cardTier(p), have: c.p[p.pk], finished: done(c, p) }, { back: false })).join('')}</div>${started.length > 120 ? `<p class="muted center">…and ${started.length - 120} more</p>` : ''}`
        : '<p class="muted center">No pieces yet. Open a pack, or sign players in any draft.</p>'}`;
  };
})();

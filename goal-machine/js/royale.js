/* Goal Machine – ⚔️ Goal Royale (a secret game: collect a Legend card to unlock it). Clash Royale, with the players you've
   packed, and goals instead of towers.
   A portrait pitch: your goal at the bottom, theirs at the top. Stamina fills over time (twice as fast in the last
   minute); four cards in your hand from a deck of eight. Tap a card, tap your half: he runs on. Forwards run at goal and
   shoot, midfielders scrap and support (and shoot, badly), defenders hold your half and tackle anyone coming through,
   and keeper cards boost your keeper for a while. First to three goals, or the most after three minutes.
   Every bronze card is the same basic unit (his OVR nudges the numbers); silver adds a perk; gold a real ability; Legends
   are special, powerful and expensive. Win trophies to climb the arenas (the opponents get better); every 5 wins
   earns a pack. Board: royale (your best trophies). The engine is pure (GM.royaleCore) so the tests can play it. */
'use strict';

(function () {
  const LEN = 150, GOALS = 3, MAXST = 10, REGEN = 1 / 2.6;
  const TIER = { b: { name: 'Bronze', col: '#b07a43' }, s: { name: 'Silver', col: '#c0c6cc' }, g: { name: 'Gold', col: '#f5c542' }, l: { name: 'Legend', col: '#a855f7' } };
  const BASE = { F: { hp: 100, atk: 14, spd: 0.085, shot: 55, aggro: 0.07 }, M: { hp: 135, atk: 16, spd: 0.075, shot: 32, aggro: 0.17 }, D: { hp: 210, atk: 22, spd: 0.06, shot: 0, aggro: 0.26 } };
  const COST = { b: { F: 3, M: 3, D: 3, G: 2 }, s: { F: 3, M: 3, D: 3, G: 2 }, g: { F: 4, M: 4, D: 4, G: 3 }, l: { F: 6, M: 6, D: 6, G: 4 } };
  // what each tier adds, by position
  const ABIL = {
    s: { F: ['Composed', '+10 shooting'], M: ['Engine', '20% quicker'], D: ['Tough', '25% more stamina'], G: ['Safe Hands', 'Keeper +15 for 12s'] },
    g: { F: ['Long Shot', 'Shoots from much further out'], M: ['Playmaker', 'Teammates nearby run and tackle harder'], D: ['Last-Ditch', 'His tackles stun attackers'], G: ['Penalty Saver', 'Keeper +20 for 15s, and saves the next shot'] },
    l: { F: ['Talisman', 'Keepers save half as often against him'], M: ['Maestro', 'Arrives with two runners'], D: ['Colossus', 'Double stamina, and he flattens attackers'], G: ['The Wall', 'Blocks the next three shots'] },
  };
  const ARENAS = [[0, '🌧️ Sunday League'], [200, '🏟️ Non-League'], [500, '⚽ The Championship'], [900, '🦁 The Premier League'], [1400, '⭐ The Champions League']];
  const arenaOf = t => ARENAS.reduce((a, x, i) => (t >= x[0] ? i : a), 0);

  /* ---------------------------------------------------------------- cards */
  const tierOf = p => (p.youth ? 'b' : GM.cardTier(p));
  const posOf = p => p.pos;  // G / D / M / F
  const ovrOf = p => (GM.owner ? GM.owner.ovr(p) : 70);
  function card(p) {
    const t = tierOf(p), g = posOf(p), ab = t === 'b' ? null : ABIL[t][g];
    return { k: p.pk, name: p.name, short: p.name.split(' ').slice(-1)[0], t, g, cost: COST[t][g], ab: ab && ab[0], abText: ab && ab[1], o: p.youth ? 62 : ovrOf(p) };
  }
  // academy players fill a deck when you haven't finished eight cards yet
  const ACADEMY = ['F', 'F', 'M', 'M', 'M', 'D', 'D', 'G'].map((g, i) => ({ pk: '__academy' + i, name: `Academy ${({ F: 'Striker', M: 'Midfielder', D: 'Defender', G: 'Keeper' })[g]}`, pos: g, youth: true, goals: 0, ast: 0, apps: 1, poss: [{ F: 'ST', M: 'CM', D: 'CB', G: 'GK' }[g]], clubs: [], hon: {}, first: 2024, last: 2024 }));
  const pk2p = k => (String(k).startsWith('__academy') ? ACADEMY[+String(k).slice(9)] : GM.anyByPk(k));

  /* ---------------------------------------------------------------- the match engine */
  function newMatch(myDeck, aiDeck, opts = {}) {
    const seed = opts.seed || GM.newSeed(), r = GM.rng(seed);
    const side = deck => { const d = r.shuffle(deck.slice()); return { deck: d, hand: d.slice(0, 4), next: 4, st: 5, score: 0, gk: 0, gkT: 0, wall: 0, saveNext: false }; };
    return { t: 0, seed, r, sides: [side(myDeck), side(aiDeck)], units: [], fx: [], uid: 0, over: null, ai: { level: opts.level || 0, think: 0 }, pause: 0 };
  }
  const statsOf = (c) => {
    const B = BASE[c.g], k = 0.85 + 0.3 * Math.max(0, Math.min(1, (c.o - 55) / 40));
    const u = { hp: B.hp * k, atk: B.atk * k, spd: B.spd * (0.95 + 0.1 * k), shot: B.shot * k, aggro: B.aggro };
    if (c.ab === 'Composed') u.shot += 10; if (c.ab === 'Engine') u.spd *= 1.2; if (c.ab === 'Tough') u.hp *= 1.25;
    if (c.t === 'g') { u.hp *= 1.15; u.atk *= 1.15; } if (c.t === 'l') { u.hp *= 1.35; u.atk *= 1.3; u.shot += 12; }
    if (c.ab === 'Colossus') u.hp *= 2;
    return u;
  };
  function spawn(M, s, c, x, y, extra = {}) {
    const st = statsOf(c), u = { id: ++M.uid, s, c, x, y, hp: st.hp, max: st.hp, atk: st.atk, spd: st.spd, shot: st.shot, aggro: st.aggro, cd: 0.6, stun: 0, hit: {}, ...extra };
    M.units.push(u);
    return u;
  }
  // play a card from your hand at (x, y): costs stamina, cycles the hand
  function play(M, s, hi, x, y) {
    const S = M.sides[s], c = S.hand[hi];
    if (!c || M.over || S.st < c.cost) return false;
    if (s === 0 ? y > 0.48 : y < 0.52) return false;
    S.st -= c.cost;
    if (c.g === 'G') {
      const boost = { b: [10, 10], s: [15, 12], g: [20, 15], l: [25, 20] }[c.t];
      S.gk = boost[0]; S.gkT = boost[1];
      if (c.ab === 'Penalty Saver') S.saveNext = true;
      if (c.ab === 'The Wall') S.wall = 3;
      M.fx.push({ k: 'gk', s, t: M.t, c });
    } else {
      spawn(M, s, c, x, y);
      if (c.ab === 'Maestro') [-0.08, 0.08].forEach(dx => spawn(M, s, { ...c, t: 'b', g: 'F', ab: null, name: 'Runner', short: 'Runner' }, Math.max(0.05, Math.min(0.95, x + dx)), y));
      M.fx.push({ k: 'play', s, t: M.t, c });
    }
    S.hand[hi] = S.deck[S.next % S.deck.length]; S.next++;
    // the next card to come is the one after: deck cycles like Clash (the played card goes to the back)
    return true;
  }
  const dist = (a, b) => Math.hypot((a.x - b.x) * 0.62, a.y - b.y);  // the pitch is taller than it is wide
  function step(M, dt) {
    if (M.over) return;
    if (M.pause > 0) { M.pause -= dt; return; }
    M.t += dt;
    const last = M.t > LEN - 60;
    M.sides.forEach(S => { S.st = Math.min(MAXST, S.st + REGEN * dt * (last ? 2 : 1)); if (S.gkT > 0) { S.gkT -= dt; if (S.gkT <= 0) S.gk = 0; } });
    const aura = u => M.units.some(v => v.s === u.s && v !== u && v.c.ab === 'Playmaker' && dist(u, v) < 0.16) ? 1.2 : 1;
    for (const u of M.units) {
      if (u.hp <= 0) continue;
      if (u.stun > 0) { u.stun -= dt; continue; }
      u.cd -= dt;
      const dir = u.s === 0 ? 1 : -1, goalY = u.s === 0 ? 1 : 0, boost = aura(u);
      // nearest opponent worth chasing
      let tgt = null, best = 9;
      for (const v of M.units) { if (v.s === u.s || v.hp <= 0) continue; const d = dist(u, v); if (d < best) { best = d; tgt = v; } }
      const ahead = tgt && (tgt.y - u.y) * dir > -0.03;
      if (tgt && (best <= u.aggro || (u.c.g === 'F' && best <= 0.05 && ahead))) {
        if (best <= 0.045) {
          tgt.hp -= u.atk * boost * dt;
          if (u.c.ab === 'Last-Ditch' && !u.hit[tgt.id]) { u.hit[tgt.id] = 1; tgt.stun = 1.5; }
          if (u.c.ab === 'Colossus' && u.cd <= 0) { tgt.stun = 1; tgt.y -= dir * -0.03; u.cd = 3; }
        } else { const a = Math.atan2(tgt.y - u.y, (tgt.x - u.x) * 0.62); u.x += Math.cos(a) * u.spd * boost * dt / 0.62; u.y += Math.sin(a) * u.spd * boost * dt; }
        continue;
      }
      if (u.c.g === 'D') {  // defenders hold their own half
        const hold = u.s === 0 ? 0.42 : 0.58;
        if ((hold - u.y) * dir > 0.01) u.y += dir * u.spd * dt;
        continue;
      }
      // run at goal; shoot from the edge of the box (much further for a Long Shot)
      const zone = u.c.ab === 'Long Shot' ? 0.66 : 0.82, inZone = u.s === 0 ? u.y >= zone : u.y <= 1 - zone;
      if (inZone && u.cd <= 0) { shoot(M, u); u.cd = 1.6; continue; }
      if (!inZone) { u.y += dir * u.spd * boost * dt; u.x += (0.5 - u.x) * 0.15 * dt; }
    }
    M.units = M.units.filter(u => u.hp > 0 && u.y > -0.05 && u.y < 1.05);
    // the AI
    aiThink(M, dt);
    if (M.t >= LEN) {
      const [a, b] = [M.sides[0].score, M.sides[1].score];
      if (a !== b || M.t >= LEN + 60) M.over = a > b ? 'win' : a < b ? 'loss' : 'draw';  // level: a minute of sudden death
    }
  }
  function shoot(M, u) {
    const D = M.sides[1 - u.s], A = M.sides[u.s];
    let save = 52 + D.gk;
    if (u.c.ab === 'Talisman') save /= 2;
    const blocked = D.wall > 0 || D.saveNext;
    if (D.wall > 0) D.wall--; else if (D.saveNext) D.saveNext = false;
    const p = Math.max(0.08, Math.min(0.85, 0.32 + (u.shot - save) / 90));
    const goal = !blocked && M.r() < p;
    M.fx.push({ k: goal ? 'goal' : blocked ? 'block' : 'save', s: u.s, t: M.t, c: u.c });
    if (!goal) return;
    A.score++;
    u.hp = 0;  // he wheels away to celebrate
    D.st = Math.min(MAXST, D.st + 2);  // the kick-off: a bit of stamina back
    M.pause = 1.2;
    if (A.score >= GOALS) M.over = u.s === 0 ? 'win' : 'loss';
    else if (M.t >= LEN) M.over = u.s === 0 ? 'win' : 'loss';  // a golden goal in sudden death
  }
  // the opponent: defends what's coming, attacks when it has the stamina; better arenas think faster and hold on for combos
  function aiThink(M, dt) {
    const A = M.ai, S = M.sides[1];
    A.think -= dt;
    if (A.think > 0) return;
    A.think = Math.max(0.35, 1.4 - A.level * 0.22) + M.r() * 0.6;
    const threats = M.units.filter(u => u.s === 0 && u.y > 0.5 && u.c.g !== 'D').sort((a, b) => b.y - a.y);
    const affordable = S.hand.map((c, i) => [c, i]).filter(([c]) => c.cost <= S.st);
    if (!affordable.length) return;
    if (threats.length) {
      const th = threats[0];
      const keeperCard = affordable.find(([c]) => c.g === 'G');
      if (th.y > 0.8 && keeperCard && S.gkT <= 0) return play(M, 1, keeperCard[1], 0.5, 0.9);
      const def = affordable.filter(([c]) => c.g === 'D' || c.g === 'M').sort((a, b) => b[0].cost - a[0].cost)[0];
      if (def) return play(M, 1, def[1], Math.max(0.1, Math.min(0.9, th.x)), Math.max(0.55, Math.min(0.92, th.y + 0.1)));
    }
    const wait = A.level >= 2 && S.st < 7 && M.r() < 0.6;  // save up for a push
    if (wait) return;
    const atk = affordable.filter(([c]) => c.g === 'F' || c.g === 'M').sort((a, b) => b[0].cost - a[0].cost)[0];
    if (atk && (S.st >= 6 || M.r() < 0.35)) return play(M, 1, atk[1], M.r() < 0.5 ? 0.28 : 0.72, 0.6 + M.r() * 0.1);
  }
  // an opponent's deck for an arena: better tiers higher up
  function aiDeck(arena, seed) {
    const r = GM.rng(seed + '|ai'), pool = { b: [], s: [], g: [], l: [] };
    GM.players.forEach(p => pool[GM.cardTier(p)].push(p));
    const mix = [['b', 'b', 'b', 'b', 'b', 'b', 'b', 'b'], ['b', 's', 'b', 's', 'g', 'b', 's', 'b'], ['s', 's', 'g', 'g', 's', 's', 'g', 'b'], ['s', 'g', 'g', 'g', 'l', 's', 'g', 's'], ['g', 'g', 'g', 'l', 'l', 'g', 's', 'g']][arena];
    const want = ['F', 'F', 'M', 'M', 'M', 'D', 'D', 'G'];
    return want.map((g, i) => { let c = pool[mix[i]].filter(p => p.pos === g); if (arena === 0) c = c.filter(p => ovrOf(p) <= 70); return card(c.length ? r.pick(c) : r.pick(pool[mix[i]])); });
  }

  /* ---------------------------------------------------------------- the screens */
  GM.goalRoyale = function (root) {
    const key = 'royale', top = () => `<div class="topbar"><a href="#/" class="back">‹</a><h2>⚔️ Goal Royale</h2>${GM.lbButton(key)}</div>`;
    const esc = GM.esc, save = st => GM.store.set('royale', st);
    const st = Object.assign({ trophies: 0, wins: 0, played: 0, deck: null, streak: 0 }, GM.store.get('royale', {}));
    const owned = () => GM.cardsOwned().concat(ACADEMY);
    // your deck: what you picked, or your best eight (two forwards, three midfielders, two defenders, a keeper)
    function deck() {
      const have = owned(), ok = (st.deck || []).map(pk2p).filter(Boolean);
      if (ok.length === 8) return ok.map(card);
      const rank = p => ({ l: 4, g: 3, s: 2, b: 1 })[tierOf(p)] * 100 + ovrOf(p) - (p.youth ? 500 : 0);
      const pick = [];
      [['F', 2], ['M', 3], ['D', 2], ['G', 1]].forEach(([g, n]) => pick.push(...have.filter(p => p.pos === g).sort((a, b) => rank(b) - rank(a)).slice(0, n)));
      return pick.map(card);
    }
    const cardHtml = (c, extra = '', cls = '') => `<div class="gr-card t-${c.t}${cls}" ${extra}><span class="gr-cost">${c.cost}</span><b${c.short.length > 9 ? ' class="long"' : ''}>${esc(c.short)}</b><small>${c.g}${c.ab ? ' · ' + esc(c.ab) : ''}</small></div>`;

    function hub() {
      const ar = arenaOf(st.trophies), next = ARENAS[ar + 1];
      root.innerHTML = `${top()}<div class="gr-hub">
        <div class="gr-arena"><span>${ARENAS[ar][1].split(' ')[0]}</span><b>${ARENAS[ar][1].slice(ARENAS[ar][1].indexOf(' ') + 1)}</b><small>🏆 ${st.trophies}${next ? ` · next arena at ${next[0]}` : ' · the top!'}</small></div>
        <button class="btn big gr-battle" id="grgo">⚔️ Battle</button>
        <p class="muted center">${st.wins} wins · a pack every 5 wins (${5 - (st.wins % 5)} to go)</p>
        <h3 class="section-title">Your deck <small>tap to change</small></h3>
        <div class="gr-deck" id="grdeck">${deck().map(c => cardHtml(c)).join('')}</div>
        <h3 class="section-title">How it works</h3>
        <ul class="how-list"><li>⚡ Stamina fills over time (twice as fast in the last minute). Tap a card, then tap your half of the pitch.</li>
          <li>⚽ Forwards run at goal and shoot. Midfielders scrap and support. Defenders hold your half. Keeper cards boost your keeper.</li>
          <li>🟫 Bronze cards are the basic player. ⚪ Silver adds a perk, 🟡 Gold a real ability, 🟣 Legends are special, powerful and expensive.</li>
          <li>🏆 First to three goals, or the most after three minutes. Win trophies to climb the arenas.</li></ul></div>`;
      GM.$('#grgo', root).onclick = battle;
      GM.$('#grdeck', root).onclick = deckEditor;
    }
    function deckEditor() {
      let cur = deck().map(c => c.k);
      const have = owned().map(card).sort((a, b) => ({ l: 4, g: 3, s: 2, b: 1 })[b.t] - ({ l: 4, g: 3, s: 2, b: 1 })[a.t] || b.o - a.o);
      const draw = () => {
        root.innerHTML = `${top()}<div class="gr-hub"><h3 class="section-title">Your deck (${cur.length}/8)</h3>
          <div class="gr-deck">${cur.map(k => cardHtml(card(pk2p(k)), `data-out="${esc(k)}"`)).join('')}</div>
          <h3 class="section-title">Your cards <small>finished pack cards (and the academy)</small></h3>
          <div class="gr-deck all">${have.filter(c => !cur.includes(c.k)).map(c => cardHtml(c, `data-in="${esc(c.k)}"`)).join('')}</div>
          <div class="actions col"><button class="btn big" id="grsave" ${cur.length === 8 ? '' : 'disabled'}>✅ Save deck</button><button class="btn ghost" id="grback">Cancel</button></div></div>`;
        GM.$$('[data-out]', root).forEach(b => b.onclick = () => { cur = cur.filter(k => k !== b.dataset.out); draw(); });
        GM.$$('[data-in]', root).forEach(b => b.onclick = () => { if (cur.length < 8) { cur.push(b.dataset.in); draw(); } else GM.toast('Take one out first'); });
        GM.$('#grsave', root).onclick = () => { st.deck = cur; save(st); hub(); };
        GM.$('#grback', root).onclick = hub;
      };
      draw();
    }

    let M = null, sel = null, raf = null, lastT = 0, seenFx = 0;
    function battle() {
      const ar = arenaOf(st.trophies);
      M = newMatch(deck(), aiDeck(ar, GM.newSeed()), { level: ar });
      GM.goalRoyale.live = M;  // (a handle for the tests)
      sel = null; seenFx = 0;
      root.innerHTML = `${top()}<div class="gr-match">
        <div class="gr-score"><span class="you" id="grs0">0</span><span id="grclock">3:00</span><span class="them" id="grs1">0</span></div>
        <div class="gr-pitch" id="grpitch"><div class="gr-goal top"></div><div class="gr-goal bottom"></div><div class="gr-half"></div><div class="gr-zone"></div><div id="grunits"></div><div id="grfx"></div></div>
        <div class="gr-st"><i id="grstbar"></i><span id="grstn">5</span></div>
        <div class="gr-hand" id="grhand"></div></div>`;
      GM.$('#grpitch', root).addEventListener('pointerdown', e => {
        if (sel == null) return;
        const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
        if (y > 0.48) return GM.toast('Your half only');
        if (play(M, 0, sel, x, y)) { GM.sound.play('place'); sel = null; drawHand(); } else GM.toast('Not enough stamina');
      });
      GM.sound.play('whistle');
      drawHand(); lastT = performance.now();
      const mine = M;
      const loop = now => {
        if (!root.isConnected || !location.hash.startsWith('#/royale') || GM.goalRoyale.live !== mine || !GM.$('#grpitch', root)) return;  // left, or a new battle
        const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
        step(M, dt); drawUnits(); drawHud();
        if (M.over) return finish();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    function drawHand() {
      const S = M.sides[0], h = GM.$('#grhand', root); if (!h) return;
      h.innerHTML = S.hand.map((c, i) => cardHtml(c, `data-hand="${i}"`, `${sel === i ? ' sel' : ''}${c.cost > S.st ? ' dim' : ''}`)).join('') + `<div class="gr-next"><small>Next</small>${esc(S.deck[S.next % S.deck.length].short)}</div>`;
      GM.$$('[data-hand]', h).forEach(b => b.onclick = () => { sel = +b.dataset.hand === sel ? null : +b.dataset.hand; drawHand(); });
    }
    let lastSt = -1;
    function drawHud() {
      const S = M.sides[0], left = Math.max(0, Math.ceil(LEN - M.t));
      GM.$('#grs0', root).textContent = S.score; GM.$('#grs1', root).textContent = M.sides[1].score;
      GM.$('#grclock', root).textContent = M.t >= LEN ? 'SUDDEN DEATH' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}${M.t > LEN - 60 ? ' ⚡×2' : ''}`;
      GM.$('#grstbar', root).style.width = (S.st * 10) + '%'; GM.$('#grstn', root).textContent = Math.floor(S.st);
      if (Math.floor(S.st) !== lastSt) { lastSt = Math.floor(S.st); drawHand(); }
      // goals, saves and keeper calls
      for (; seenFx < M.fx.length; seenFx++) {
        const f = M.fx[seenFx];
        if (f.k === 'goal') { GM.sound.play(f.s === 0 ? 'cheer' : 'bad'); GM.buzz(60); flash(f.s === 0 ? 'GOAL!' : `${esc(f.c.short)} scores`, f.s === 0 ? 'you' : 'them'); }
        else if (f.k === 'block' || (f.k === 'save' && M.r() < 0.5)) { GM.sound.play('tap'); flash(f.k === 'block' ? '🧤 Blocked!' : 'Saved!', 'save'); }
        else if (f.k === 'gk' && f.s === 1) flash(`🧤 Their keeper: ${esc(f.c.short)}`, 'save');
      }
    }
    function flash(t, cls) {
      const box = GM.$('#grfx', root); if (!box) return;
      const el = document.createElement('div'); el.className = 'gr-flash ' + cls; el.innerHTML = t; box.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
    function drawUnits() {
      const box = GM.$('#grunits', root); if (!box) return;
      box.innerHTML = M.units.map(u => `<div class="gr-u s${u.s} t-${u.c.t}${u.stun > 0 ? ' stun' : ''}" style="left:${(u.x * 100).toFixed(1)}%;bottom:${(u.y * 100).toFixed(1)}%"><span>${esc(u.c.short.slice(0, 3))}</span><i style="width:${Math.max(0, 100 * u.hp / u.max)}%"></i></div>`).join('');
    }
    function finish() {
      cancelAnimationFrame(raf);
      const res = M.over, d = res === 'win' ? 30 : res === 'loss' ? -20 : 5, before = st.trophies;
      st.trophies = Math.max(0, st.trophies + d); st.played++;
      if (res === 'win') { st.wins++; st.streak++; } else st.streak = 0;
      const pack = res === 'win' && st.wins % 5 === 0;
      if (pack && GM.givePack) GM.givePack(1, 'Goal Royale: 5 more wins', 'royale');
      save(st);
      const up = arenaOf(st.trophies) > arenaOf(before);
      GM.sound.play(res === 'win' ? 'fanfare' : res === 'loss' ? 'boo' : 'whistle');
      root.innerHTML = `${top()}<div class="gr-hub"><div class="gr-result ${res}"><b>${res === 'win' ? '🏆 VICTORY' : res === 'loss' ? '💔 DEFEAT' : '🤝 DRAW'}</b>
          <span>${M.sides[0].score} – ${M.sides[1].score}</span><small>${d > 0 ? '+' : ''}${d} trophies · 🏆 ${st.trophies}</small></div>
        ${up ? `<div class="banner">🎉 New arena: ${ARENAS[arenaOf(st.trophies)][1]}</div>` : ''}${pack ? '<div class="banner">🎁 5 more wins: a pack!</div>' : ''}
        <div class="actions col"><button class="btn big" id="gragain">⚔️ Battle again</button><button class="btn ghost" id="grhub">Back</button></div></div>`;
      GM.$('#gragain', root).onclick = battle; GM.$('#grhub', root).onclick = hub;
      GM.checkGame('royale', st.trophies, { res, arena: arenaOf(st.trophies) });
      if (st.trophies > GM.best(key)) GM.recordScore(key, st.trophies, { t: st.trophies });
    }
    hub();
  };
  GM.royaleCore = { newMatch, play, step, aiDeck, card, statsOf, ARENAS, arenaOf, ACADEMY, LEN, GOALS };
})();

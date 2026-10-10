/* Goal Machine – friend challenges ("beat my score").
   Finish a draft and send a challenge: your game goes on the server (challenge_create) with its seed, so a friend gets
   the same spins. While they play, their progress goes up after each signing (challenge_progress): you can watch along,
   and they see where they stand against you after the same number of signings (the ghost bar). At full time: both XIs
   side by side, both lines on one chart, the signings that differed, reactions, a rematch (new spins, sent back), best
   of three along a rematch chain, a picture of it all, and on your account a tally and a rivalry page per friend.
   Tables challenges / challenge_plays; RPCs challenge_create, _get, _start, _progress, _react, _history. */
'use strict';

(function () {
  const rpc = (f, a) => GM.lb.rpc(f, a);
  const auth = () => { const a = GM.account(); return a ? { p_user: a.name, p_key: a.key } : { p_user: null, p_key: null }; };
  const me = () => (GM.account() || {}).name || '';
  const esc = s => GM.esc(String(s == null ? '' : s));
  const fmt = n => Math.round(Number(n) || 0).toLocaleString();
  const enc = encodeURIComponent;
  const REACTS = ['😏 Easy.', '🙈 Robbed!', '👏 Fair play', '🔥 Rematch?', '😂 Jammy!', '🫡 Respect'];
  const link = code => `${GM.baseUrl()}#/c?id=${code}`;
  const local = code => GM.store.get('ch:' + code, null);
  const top = (t, back = '#/') => `<div class="topbar"><a href="${back}" class="back">‹</a><h2>${t}</h2><span></span></div>`;
  const modeName = ch => { const k = GM.draft.modeKey(ch.mode, ch.stat, ch.hard, ch.club || ch.nat, ch.extreme); return ((GM.MODES || {})[k] || (GM.MODES || {})[ch.mode] || { name: 'Draft' }).name + (ch.hard ? ' · Hard' : ''); };
  const unitOf = p => (p && p.game && p.game.unit) || 'pts';
  const draftUrl = (ch, extra = '') => `#/draft?m=${ch.mode}&s=${ch.stat}&seed=${enc(ch.seed)}${ch.hard ? '&h=1' : ''}${ch.extreme ? '&x=1' : ''}${ch.club ? '&c=' + enc(ch.club) : ''}${ch.nat ? '&n=' + enc(ch.nat) : ''}${extra}`;
  // a line: [[players signed, total], …]; the total after n signings
  const at = (prog, n) => { let v = 0; (prog || []).forEach(([x, y]) => { if (x <= n) v = y; }); return v; };

  GM.challenge = {
    link,
    // the challenge you're taking on, for the draft (draft.js keeps it on the game as S.ch)
    ctx(code) { const c = local(code); return c && c.play ? { code, play: c.play, token: c.token, name: c.oppName, score: c.oppScore, prog: c.oppProg || [], picks: c.oppPicks || [], unit: c.unit, mgrOffer: c.mgrOffer || null } : null; },

    // CHALLENGE MODE: a versus card and a countdown before the first spin
    intro(S) {
      const c = S.ch, el = document.createElement('div');
      el.className = 'ch-intro';
      el.innerHTML = `<div class="chi-card"><div class="chi-tag">⚔️ CHALLENGE MODE</div>
        <div class="chi-vs"><span>${GM.userPic ? GM.userPic(GM.getName() || 'You', 'xl') : ''}<b>You</b></span><i>V</i><span>${GM.userPic ? GM.userPic(c.name, 'xl') : ''}<b>${esc(c.name)}</b></span></div>
        <div class="chi-goal">Beat <b>${fmt(c.score)}</b> ${esc(c.unit || '')}</div><div class="chi-count">3</div><small>Same spins they had · tap to skip</small></div>`;
      document.body.appendChild(el);
      GM.sound.play('drumroll'); GM.buzz(40);
      const n = el.querySelector('.chi-count'), timers = [];
      const go = () => { timers.forEach(clearTimeout); if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 400); };
      [2, 1].forEach((k, i) => timers.push(setTimeout(() => { n.textContent = k; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); GM.sound.play('tick'); }, 800 * (i + 1))));
      timers.push(setTimeout(() => { n.textContent = 'GO!'; n.classList.add('go'); GM.sound.play('whistle'); GM.buzz(80); }, 2400));
      timers.push(setTimeout(go, 3200));
      el.onclick = go;
      window.addEventListener('hashchange', go, { once: true });
    },
    // the lead changing hands as you sign: a cheer when you go ahead, a groan when they're back in front
    leadCheck(S, n) {
      const c = S.ch, d = at(S.prog, n) - at(c.prog, n), was = S.chLead || 0, now = Math.sign(d);
      if (now && now !== was) {
        if (was) {
          GM.toast(now > 0 ? `📈 <b>You’ve gone ahead</b> of ${esc(c.name)}!` : `📉 <b>${esc(c.name)}’s back in front</b>`, 2200);
          GM.sound.play(now > 0 ? 'cheer' : 'groan'); GM.buzz(now > 0 ? 60 : 120);
          S.chFlash = Date.now();
        }
        S.chLead = now;
      }
    },

    /** Send a challenge from a finished game (parent: the challenge this is a rematch of). Resolves the code, or null. */
    async create(S, sc, parent) {
      if (!GM.lb.enabled) return null;
      const name = GM.account() ? GM.account().name : (GM.getName() || await GM.askName() || '');
      try {
        const r = await rpc('challenge_create', { ...auth(), p_name: name, p_mode: S.mode === 'daily' ? 'ultimate' : S.mode, p_stat: S.stat, p_seed: S.seed,
          p_hard: !!S.hard, p_extreme: !!S.extreme, p_club: S.club || null, p_nat: S.nat || null, p_parent: parent || null,
          p_score: Math.round(sc.total), p_total: Math.round(sc.t), p_game: GM.draft.game(S) });
        if (!r || r.error || !r.code) return null;
        GM.store.set('ch:' + r.code, { play: r.play, token: r.token, own: true });
        GM.store.set('chmine', [r.code].concat(GM.store.get('chmine', [])).slice(0, 40));
        return r.code;
      } catch (e) { return null; }
    },

    // ⚔️ Challenge a friend: pick friends from the app (they get a notification) and/or send the link anywhere.
    // Returns false when the challenge couldn't be saved (the draft then falls back to a plain link).
    async send(S, sc, txt) {
      const code = S.chCode || (S.chCode = await this.create(S, sc));
      if (!code) return false;
      let fr = [];
      if (GM.account() && GM.lb.enabled) { try { fr = (await rpc('online_friends', auth())) || []; } catch (e) { fr = []; } }
      if (!fr.length) { GM.share(txt, link(code)); return true; }
      const sent = S.chSentTo || (S.chSentTo = []);
      const m = GM.modal(`<h3 class="center">⚔️ Challenge a friend</h3><p class="muted center">Same spins, your score to beat: <b>${fmt(sc.total)}</b></p>
        <div class="ch-pick">${fr.map(f => `<button class="${sent.includes(f.name) ? 'done' : ''}" data-f="${esc(f.name)}" ${sent.includes(f.name) ? 'disabled' : ''}>${GM.userPic(f.name)}<span>${esc(f.name)}</span><i>${sent.includes(f.name) ? '✓ sent' : ''}</i></button>`).join('')}</div>
        <div class="actions col"><button class="btn" id="chp-send" disabled>⚔️ Send in the app</button><button class="btn ghost" id="chp-link">📤 Send a link instead</button><button class="btn ghost" data-close>Close</button></div>`);
      const pick = new Set(), go = GM.$('#chp-send', m.el);
      const label = () => { go.disabled = !pick.size; go.textContent = pick.size ? `⚔️ Send to ${pick.size === 1 ? [...pick][0] : pick.size + ' friends'}` : '⚔️ Send in the app'; };
      GM.$$('[data-f]', m.el).forEach(b => b.onclick = () => { const n = b.dataset.f; if (pick.has(n)) pick.delete(n); else pick.add(n); b.classList.toggle('on', pick.has(n)); GM.buzz(15); label(); });
      GM.$('#chp-link', m.el).onclick = () => { m.close(); GM.share(txt, link(code)); };
      go.onclick = async () => {
        go.disabled = true; go.textContent = 'Sending…';
        let r = null; try { r = await rpc('challenge_send', { ...auth(), p_code: code, p_to: [...pick] }); } catch (e) { r = null; }
        if (!r || r.error) { GM.toast('Couldn’t send it – check your connection, or send a link'); label(); return; }
        sent.push(...pick); m.close();
        GM.toast(`⚔️ Sent to <b>${esc([...pick].join(', '))}</b> – they’ll get a notification`, 2800); GM.sound.play('whistle');
      };
      return true;
    },

    // after each signing (and at full time): your progress, for the challenger watching along and for the result
    progress(S, sc, done) {
      const c = S.ch; if (!c || !c.play || !GM.lb.enabled) return;
      clearTimeout(this._pt);
      const send = () => rpc('challenge_progress', { p_play: c.play, p_token: c.token, p_score: Math.round(sc.total), p_total: Math.round(sc.t), p_game: GM.draft.game(S), p_done: !!done })
        .then(() => { if (done) { const l = local(c.code) || {}; GM.store.set('ch:' + c.code, { ...l, done: true }); } }).catch(() => {});
      if (done) this._done = send(); else this._pt = setTimeout(send, 500);
    },

    // the ghost bar while you play: where you stand against them after the same number of signings
    ghostHtml(S) {
      const c = S.ch, n = S.xi.filter(x => x.p != null).length, mine = at(S.prog, n), theirs = at(c.prog, n), d = mine - theirs;
      const spoil = GM.store.get('chspoil', false), next = (c.picks || [])[n];
      const left = S.xi.filter(x => x.p == null).length, need = c.score - mine;
      const last = left === 1 && S.phase !== 'done' && (S.rules.max || S.rules.chaos) ? `<span class="chg-last">${need > 0 ? `🎯 Last signing: you need <b>${fmt(need + 1)}</b> to win` : '🛡️ Last signing: you’re ahead – hold on!'}</span>` : '';
      return `<div class="banner ch-ghost ${S.chFlash && Date.now() - S.chFlash < 1500 ? 'flash' : ''} ${d < 0 ? 'behind' : ''}">⚔️ <b>${esc(c.name)}</b> scored <b>${fmt(c.score)}</b>${last}
        ${n ? `<span class="chg-line">After ${n} signing${n > 1 ? 's' : ''}: you <b>${fmt(mine)}</b> · ${esc(c.name)} <b>${fmt(theirs)}</b> <i class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}</i></span>` : ''}
        ${next ? `<button class="chg-spoil" onclick="GM.challenge.toggleSpoil()">${spoil ? `👀 They signed <b>${esc(next[2])}</b> next (${esc(next[3])}, ${fmt(next[4])})` : '👀 What did they sign next?'}</button>` : ''}</div>`;
    },
    toggleSpoil() { GM.store.set('chspoil', !GM.store.get('chspoil', false)); GM.draft.render(); },

    /* ------------------------------------------------------------ pages */
    async page(app, q) {
      const code = String(q.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      app.innerHTML = top('⚔️ Challenge') + '<p class="center muted">Loading…</p>';
      let ch = null;
      try { ch = code && await rpc('challenge_get', { p_code: code }); } catch (e) { ch = null; }
      if (!ch) { app.innerHTML = top('⚔️ Challenge') + '<p class="center muted">That challenge can’t be found. Check the link, or ask for a new one.</p>'; return; }
      if (q.watch) return watch(app, ch, +q.watch);
      if (q.p) return result(app, ch, +q.p);
      landing(app, ch);
    },
    rival: (app, name) => rival(app, name),
    list: app => listPage(app),
    // the ⚔️ tally next to each friend on the Online tab
    // your challenges (sent and taken on), for the Online tab, the Challenges page and the in-app alerts
    async mine(fresh) {
      if (!GM.account() || !GM.lb.enabled) return [];
      if (!fresh && mineCache && Date.now() - mineCache.t < 20000) return mineCache.rows;
      let rows; try { rows = await rpc('challenge_mine', auth()); } catch (e) { return mineCache ? mineCache.rows : null; }
      mineCache = { t: Date.now(), rows: rows || [] }; return mineCache.rows;
    },
    rowHtml,
    // the Online tab: live and recent challenges on Games, finished ones on Finished
    async fillOnline(gamesEl, doneEl) {
      const rows = await this.mine(true);
      if (!rows || !rows.length) return;
      const day = 864e5, recent = rows.filter(r => r.status !== 'done' ? Date.now() - Date.parse(r.at) < 7 * day : Date.now() - Date.parse(r.at) < 2 * day).slice(0, 4);
      const more = `<a class="more-link" href="#/challenges">All your challenges ›</a>`;
      const qm = gamesEl && gamesEl.querySelector('#oqm');
      if (gamesEl && gamesEl.isConnected && recent.length) (qm || gamesEl.lastElementChild || gamesEl).insertAdjacentHTML(qm ? 'afterend' : 'beforeend', `<h3 class="section-title">⚔️ Challenges</h3><div class="ch-table">${recent.map(rowHtml).join('')}</div>${more}`);
      const done = rows.filter(r => r.status === 'done').slice(0, 10);
      if (doneEl && doneEl.isConnected && done.length) doneEl.insertAdjacentHTML('afterbegin', `<h3 class="section-title">⚔️ Challenges</h3><div class="ch-table">${done.map(rowHtml).join('')}</div>${more}<h3 class="section-title">🌐 Online games</h3>`);
    },
    // a card at the top of the screen when someone takes on your challenge, finishes it, or you're sent one
    async checkNew() {
      const rows = await this.mine(true);
      if (!rows) return;
      const tag = r => `${r.code}:${r.pid || 0}:${r.status}`, seen = GM.store.get('chSeen', null);
      if (!seen) { GM.store.set('chSeen', rows.map(tag).slice(0, 150)); return; }  // first look: nothing old pops up
      const fresh = rows.filter(r => ((r.sent && r.pid) || r.status === 'invited') && !seen.includes(tag(r)) && Date.now() - Date.parse(r.at) < 3 * 864e5);
      GM.store.set('chSeen', [...rows.map(tag), ...seen].filter((x, i, a) => a.indexOf(x) === i).slice(0, 150));
      // the newest challenge waiting for you goes on the Home banner too
      const w = rows.find(x => x.status === 'invited');
      GM.store.set('chInvited', w ? { code: w.code, from: w.opp, score: fmt(w.theirs), at: w.at } : null);
      const r = fresh[0];
      if (!r || location.hash.includes('id=' + r.code)) return;
      const won = r.mine > r.theirs, mn = esc(modeName(r));
      GM.notice(r.status === 'invited'
        ? { pic: GM.userPic(r.opp || '?'), title: `⚔️ ${esc(r.opp)} challenged you`, sub: `${mn} · beat ${fmt(r.theirs)} · tap to take it on`, href: rowHref(r), ms: 8000 }
        : r.status === 'done'
        ? { pic: GM.userPic(r.opp || '?'), title: won ? `🛡️ You held off ${esc(r.opp)}` : r.mine < r.theirs ? `😱 ${esc(r.opp)} beat your score` : `🤝 ${esc(r.opp)} matched your score`, sub: `${fmt(r.theirs)} v your ${fmt(r.mine)} · ${mn} · tap to see how`, href: rowHref(r), ms: 8000 }
        : { pic: GM.userPic(r.opp || '?'), title: `👀 ${esc(r.opp)}’s taking on your challenge`, sub: `${mn} · tap to watch along`, href: rowHref(r), ms: 8000 });
    },
    async decorateFriends(box) {
      if (!box || !GM.account() || !GM.lb.enabled) return;
      let h = []; try { h = await rpc('challenge_history', auth()); } catch (e) { return; }
      const by = tally(h || []);
      GM.$$('.friend', box).forEach(row => {
        const b = row.querySelector('[data-challenge]'), n = b && b.dataset.challenge, t = n && by[n.toLowerCase()];
        if (!t || row.querySelector('.ch-tally')) return;
        const a = document.createElement('a'); a.className = 'ch-tally'; a.href = '#/rival?name=' + enc(n);
        a.innerHTML = `⚔️ ${t.w}–${t.l}${t.d ? ` <small>(${t.d}d)</small>` : ''}`; a.title = 'Challenges: you v ' + n;
        row.querySelector('.f-main').appendChild(a);
      });
    },
    // a rematch you've just played: sent off as a challenge of its own, back to them
    async sendRematch(S, sc, el) {
      if (S.rematchSent) return show(S.rematchSent);
      el.innerHTML = '<p class="muted center">🔁 Sending your rematch…</p>';
      const code = await this.create(S, sc, S.rematch);
      if (!code) { el.innerHTML = '<p class="muted center">Couldn’t send the rematch (are you online?). You can still challenge a friend below.</p>'; return; }
      S.rematchSent = code; show(code);
      function show(c) {
        el.innerHTML = `<div class="ch-sent"><b>🔁 Rematch ready</b><small>If they have an account they’ve been told. Send the link too:</small>
          <button class="btn" id="rm-share">📤 Send the rematch</button></div>`;
        GM.$('#rm-share', el).onclick = () => GM.share(`⚽ Goal Machine – rematch! New spins: I got ${fmt(sc.total)}. Your go.`, link(c));
      }
    },
    // the head-to-head on the full-time screen of a challenge you've just played
    async fill(el, code, playId) {
      if (!el) return;
      el.innerHTML = '<p class="muted center">⚔️ Lining up the head-to-head…</p>';
      await (this._done || Promise.resolve()).catch(() => {});  // your full-time score first
      let ch = null; try { ch = await rpc('challenge_get', { p_code: code }); } catch (e) { /* offline */ }
      if (!ch) { el.innerHTML = '<p class="muted center">The head-to-head will be here when you’re back online.</p>'; return; }
      h2h(el, ch, playId, true);
    },
  };

  /* ---------------------------------------------------------------- the landing page of a challenge link */
  function landing(app, ch) {
    const owner = ch.plays.find(p => p.owner), l = local(ch.code), mine = ch.plays.find(p => !p.owner && ((l && p.id === l.play) || (me() && p.username === me())));
    const iOwn = (l && l.own) || (me() && owner.username === me());
    const done = ch.plays.filter(p => p.status === 'done').sort((a, b) => b.score - a.score), live = ch.plays.filter(p => p.status === 'playing');
    const table = `<div class="ch-table">${done.map((p, i) => `<a class="ch-row ${p.owner ? 'owner' : ''}" href="#/c?id=${ch.code}&p=${p.id}"><span class="ch-rank">${i + 1}</span><b>${esc(p.name)}</b>${p.owner ? '<small>set it</small>' : ''}<span class="ch-score">${fmt(p.score)}</span></a>`).join('')}
      ${live.map(p => `<a class="ch-row live" href="#/c?id=${ch.code}&watch=${p.id}"><span class="ch-rank">👀</span><b>${esc(p.name)}</b><small>playing now – watch</small><span class="ch-score">${fmt(p.score)}</span></a>`).join('')}</div>`;
    if (iOwn) {
      app.innerHTML = top('⚔️ Your challenge') + `<div class="ch-hero"><b>${esc(modeName(ch))}</b><span>You scored <b>${fmt(owner.score)}</b> ${esc(unitOf(owner))}</span></div>
        <h3 class="section-title">Who’s had a go</h3>${done.length > 1 || live.length ? table : '<p class="muted center">Nobody yet. Send it round!</p>'}
        <div class="actions col"><button class="btn big" id="ch-send">📤 Send to more friends</button></div>`;
      GM.$('#ch-send').onclick = () => GM.share(`⚽ Goal Machine – I scored ${fmt(owner.score)} in ${modeName(ch)}. Same spins, can you beat me?`, link(ch.code));
      return;
    }
    if (mine && mine.status === 'done') return result(app, ch, mine.id);
    app.innerHTML = top('⚔️ Challenge') + `<div class="ch-hero">${GM.userPic ? GM.userPic(owner.name, 'xl') : ''}<b>${esc(owner.name)} challenges you</b>
        <span>${esc(modeName(ch))}: beat <b>${fmt(owner.score)}</b> ${esc(unitOf(owner))}</span><small>Same spins as they had. Their line shows as you go.</small></div>
      <div class="actions col"><button class="btn big" id="ch-go">${mine ? '▶ Carry on' : '⚔️ Take it on'}</button></div>
      ${done.length > 1 || live.length ? `<h3 class="section-title">The table</h3>${table}` : ''}`;
    GM.$('#ch-go').onclick = () => start(ch, owner);
  }

  async function start(ch, owner) {
    const btn = GM.$('#ch-go'); if (btn) btn.disabled = true;
    const name = GM.account() ? GM.account().name : (GM.getName() || await GM.askName() || '');
    let r = null; try { r = await rpc('challenge_start', { p_code: ch.code, ...auth(), p_name: name }); } catch (e) { r = null; }
    if (btn) btn.disabled = false;
    if (!r) return GM.toast('Couldn’t start the challenge – check your connection');
    if (r.error === 'own') return GM.toast('That’s your own challenge – send it to a friend!');
    if (r.error === 'played') { location.hash = `#/c?id=${ch.code}&p=${r.play}`; return; }
    if (r.error) return GM.toast(r.error === 'full' ? 'That challenge is full' : 'Couldn’t start the challenge');
    GM.store.set('ch:' + ch.code, { play: r.play, token: r.token, oppName: owner.name, oppScore: owner.score, oppProg: owner.game.prog || [], oppPicks: owner.game.picks || [], unit: unitOf(owner), mgrOffer: owner.game.mgrOffer || null });
    location.hash = draftUrl(ch, `&ch=${ch.code}&vs=${enc(owner.name)}&vss=${owner.score}`);
  }

  /* ---------------------------------------------------------------- the head-to-head */
  function result(app, ch, playId) {
    app.innerHTML = top('⚔️ Head to head', '#/c?id=' + ch.code) + '<div id="ch-h2h" class="ch-h2h"></div>';
    h2h(GM.$('#ch-h2h'), ch, playId);
  }
  // who's "you" on this result: the player whose play it is, or the challenger looking at a friend's go
  function sides(ch, playId) {
    const owner = ch.plays.find(p => p.owner), p = ch.plays.find(x => x.id === playId) || ch.plays.find(x => !x.owner && x.status === 'done') || owner, l = local(ch.code);
    const iAmP = (l && l.play === p.id && !p.owner) || (me() && p.username === me() && !p.owner), iAmOwner = (l && l.own) || (me() && owner.username === me());
    if (iAmP) return { a: p, b: owner, you: 'a', token: l && l.play === p.id ? l.token : null, target: p.id };
    if (iAmOwner) return { a: owner, b: p, you: 'a', token: l && l.own ? l.token : null, target: p.id, owner: true };
    return { a: p, b: owner, you: null, token: null, target: p.id };
  }
  // 🧮 where the points came from: not just who you signed. In CHAOS: the players' own numbers, what wildcards and
  // moments did to them, team bonuses, moments and bonus spins, the manager (older games: the XI and the bonuses)
  function pointsFrom(A, B, an, bn) {
    if (A.score == null || B.score == null || A.total == null || B.total == null || A.score === A.total && B.score === B.total) return '';
    const pa = (A.game || {}).pts, pb = (B.game || {}).pts;
    const rows = pa && pb
      ? [['⚽ Their own PL numbers', pa.raw, pb.raw, 'what your players scored in real life'], ['🃏 Wildcards & moments on players', pa.on, pb.on, 'captains, doubles, injuries, halvings…'],
         ['⭐ Team bonuses', pa.team, pb.team, 'chemistry, rating, titles, legends…'], ['🎲 Moments & bonus spins', pa.ev, pb.ev, 'TV money, VAR, the streaker…'], ['👔 The manager', pa.mgr, pb.mgr, '']]
      : [['⚽ Your XI', A.total, B.total, 'the players’ numbers after everything'], ['⭐ Bonus points', A.score - A.total, B.score - B.total, 'team bonuses, moments, the manager']];
    const big = rows.slice().sort((x, y) => Math.abs(y[1] - y[2]) - Math.abs(x[1] - x[2]))[0];
    const d = big[1] - big[2], who = d > 0 ? an : bn;
    const luck = (p, name) => p && (p.hits.length || p.bon.length) ? `<div class="ch-luck"><small>${esc(name)}</small>${p.hits.slice(0, 2).map(h => `<span>${esc(h[1])}: ${esc(h[0])} <b class="${h[2] < 0 ? 'neg' : 'pos'}">${h[2] > 0 ? '+' : '−'}${fmt(Math.abs(h[2]))}</b></span>`).join('')}${p.bon.slice(0, 2).map(b => `<span>${esc(b[0])} <b class="${b[1] < 0 ? 'neg' : 'pos'}">${b[1] > 0 ? '+' : '−'}${fmt(Math.abs(b[1]))}</b></span>`).join('')}</div>` : '';
    return `<h3 class="section-title">🧮 Where the points came from</h3>
      <table class="ch-xis ch-from"><tr><th></th><th>${esc(an)}</th><th>${esc(bn)}</th></tr>
      ${rows.map(r => `<tr><td>${r[0]}${r[3] ? `<small>${r[3]}</small>` : ''}</td><td class="${r[1] > r[2] ? 'win' : ''}">${r[1] > r[2] ? '<b>' + fmt(r[1]) + '</b>' : fmt(r[1])}</td><td class="${r[2] > r[1] ? 'win' : ''}">${r[2] > r[1] ? '<b>' + fmt(r[2]) + '</b>' : fmt(r[2])}</td></tr>`).join('')}
      <tr class="tot"><td>Total</td><td>${fmt(A.score)}</td><td>${fmt(B.score)}</td></tr></table>
      ${d ? `<p class="muted small center">The biggest gap: <b>${big[0].replace(/^\S+\s/, '').toLowerCase()}</b>, ${fmt(Math.abs(d))} to ${esc(who)}.</p>` : ''}
      ${luck(pa, an) || luck(pb, bn) ? `<div class="ch-lucks"><small class="muted">🍀 The luck of the draw</small>${luck(pa, an)}${luck(pb, bn)}</div>` : ''}`;
  }
  function h2h(el, ch, playId, fresh) {
    const sd = sides(ch, playId), A = sd.a, B = sd.b, unit = unitOf(A);
    if (!B || A === B) { el.innerHTML = '<p class="muted center">Nobody’s taken this one on yet.</p>'; return; }
    const an = sd.you ? 'You' : A.name, bn = B.name, ga = A.game || {}, gb = B.game || {};
    const v = A.score - B.score, live = A.status !== 'done' || B.status !== 'done';
    const verdict = live ? `⏳ ${esc(A.status !== 'done' ? an : bn)} ${A.status !== 'done' && sd.you ? 'are' : 'is'} still playing`
      : v > 0 ? (sd.you ? `🎉 You beat ${esc(bn)}` : `🏆 ${esc(an)} beat ${esc(bn)}`) : v < 0 ? (sd.you ? `😬 ${esc(bn)} beat you` : `🏆 ${esc(bn)} beat ${esc(an)}`) : `🤝 Dead level`;
    const reactIn = sd.owner ? B.reaction : sd.you ? A.owner_reaction : null;  // what they said to you
    el.innerHTML = `<div class="ch-verdict"><b>${verdict}</b><div class="ch-scores"><span class="a">${esc(an)} <b>${fmt(A.score)}</b></span><i>v</i><span class="b"><b>${fmt(B.score)}</b> ${esc(bn)}</span></div><small>${esc(modeName(ch))} · ${esc(unit)}</small></div>
      <div id="ch-bo3"></div>
      ${reactIn ? `<div class="ch-bubble">💬 <b>${esc(bn)}</b>: ${esc(reactIn)}</div>` : ''}
      <h3 class="section-title">📈 How it went</h3>${chartSvg(ga.prog, gb.prog, an, bn)}<p class="muted small center">${story(ga.prog, gb.prog, an, bn)}</p>
      ${pointsFrom(A, B, an, bn)}
      ${diffs(ga.picks, gb.picks, an, bn, ga.mgr !== gb.mgr && (ga.mgr || gb.mgr) ? [ga.mgr, gb.mgr] : null)}
      <h3 class="section-title">🆚 The XIs</h3>${xis(ga, gb, an, bn)}
      ${(ga.wild || []).length || (gb.wild || []).length ? `<p class="ch-wild"><span>${esc(an)}: ${(ga.wild || []).join(' ') || 'no wildcards'}</span><span>${esc(bn)}: ${(gb.wild || []).join(' ') || 'no wildcards'}</span></p>` : ''}
      ${ga.mgr && ga.mgr === gb.mgr ? `<p class="ch-wild"><span>👔 Both went with ${esc(ga.mgr)}</span></p>` : ''}
      ${groupTable(ch)}
      ${sd.token ? `<h3 class="section-title">💬 Say something</h3><div class="ch-reacts">${REACTS.map(r => `<button class="btn small ghost" data-react="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : ''}
      <div class="actions col">
        ${sd.you ? `<button class="btn big" id="ch-rematch">🔁 Rematch (new spins)</button>` : `<a class="btn big" href="#/c?id=${ch.code}">⚔️ Take it on yourself</a>`}
        <button class="btn ghost" id="ch-pic">🖼️ Share the head-to-head</button>
        ${me() && sd.you ? `<a class="btn ghost" href="#/rival?name=${enc(bn)}">📜 Your record v ${esc(bn)}</a>` : ''}
      </div>`;
    GM.$$('[data-react]', el).forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await rpc('challenge_react', { p_play: sd.target, p_token: sd.token, p_reaction: b.dataset.react }); GM.toast(`Sent: ${esc(b.dataset.react)}`); GM.sound.play('good'); }
      catch (e) { GM.toast('Couldn’t send that – are you online?'); }
      b.disabled = false;
    });
    const rm = GM.$('#ch-rematch', el);
    if (rm) rm.onclick = () => { location.hash = draftUrl({ ...ch, seed: 'rm' + Date.now().toString(36) }, `&rm=${ch.code}`); };
    GM.$('#ch-pic', el).onclick = () => GM.shareImage(picture(ch, A, B, an, bn), `⚽ Goal Machine – ${an === 'You' ? (GM.getName() || 'Me') : an} ${fmt(A.score)} v ${fmt(B.score)} ${bn}`);
    bestOf(GM.$('#ch-bo3', el), ch, A.name, B.name, sd.you);
    if (fresh && !live) reveal(el, A.score, B.score, v);
  }
  // the final whistle on your own result: both scores count up, then the verdict lands (confetti if you won)
  function reveal(el, a, b, v) {
    const box = GM.$('.ch-verdict', el); if (!box) return;
    const [na, nb] = [GM.$('.ch-scores .a b', box), GM.$('.ch-scores .b b', box)], head = box.querySelector(':scope > b');
    box.classList.add('revealing'); head.style.visibility = 'hidden';
    const t0 = performance.now(), dur = 1400;
    GM.sound.play('drumroll');
    const tick = t => {
      const f = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - f, 3);
      na.textContent = fmt(a * e); nb.textContent = fmt(b * e);
      if (f < 1) return requestAnimationFrame(tick);
      head.style.visibility = ''; box.classList.remove('revealing'); box.classList.add(v > 0 ? 'won' : v < 0 ? 'lost' : 'drew');
      GM.sound.play(v > 0 ? 'fanfare' : v < 0 ? 'boo' : 'good'); GM.buzz(v > 0 ? 120 : 60);
      if (v > 0 && GM.FX) GM.FX.confetti(box, 120);
    };
    requestAnimationFrame(tick);
  }

  // the two lines on one chart: x = players signed (0 to 11), y = the running total; where they cross, the lead changed
  function chartSvg(pa, pb, an, bn) {
    const W = 320, H = 150, L = 34, R = 10, T = 10, Bm = 22, n = 11;
    const max = Math.max(10, ...[...(pa || []), ...(pb || [])].map(e => e[1]));
    const X = x => L + (W - L - R) * x / n, Y = y => T + (H - T - Bm) * (1 - y / max);
    const last = p => Math.max(0, ...(p || [[0]]).map(e => e[0]));  // (a game still being played stops where it's got to)
    const pts = p => Array.from({ length: Math.min(n, last(p)) + 1 }, (_, x) => `${X(x).toFixed(1)},${Y(at(p, x)).toFixed(1)}`).join(' ');
    // the crossings: between two signings where the leader changes
    const cross = [];
    for (let x = 1; x <= Math.min(last(pa), last(pb)); x++) {
      const d0 = at(pa, x - 1) - at(pb, x - 1), d1 = at(pa, x) - at(pb, x);
      if (d0 * d1 < 0 || (d0 === 0 && d1 !== 0 && x > 1)) cross.push(x);
    }
    const ticks = [0, 0.5, 1].map(f => Math.round(max * f));
    return `<div class="ch-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(an)} and ${esc(bn)}: running totals after each signing">
      ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${L - 4}" y="${Y(t) + 3}" class="ax" text-anchor="end">${fmt(t)}</text>`).join('')}
      ${[0, 3, 6, 9, 11].map(x => `<text x="${X(x)}" y="${H - 6}" class="ax" text-anchor="middle">${x}</text>`).join('')}
      <polyline points="${pts(pb)}" class="lb"/><polyline points="${pts(pa)}" class="la"/>
      ${cross.map(x => `<circle cx="${X(x)}" cy="${Y(at(pa, x))}" r="4" class="cx"/>`).join('')}
    </svg><div class="ch-legend"><span class="a">${esc(an)}</span><span class="b">${esc(bn)}</span>${cross.length ? `<span class="c">lead changed hands ${cross.length === 1 ? 'once' : cross.length + ' times'}</span>` : ''}</div></div>`;
  }
  function story(pa, pb, an, bn) {
    let lead = null, swing = 0, sx = 0;
    for (let x = 1; x <= 11; x++) {
      const d = at(pa, x) - at(pb, x), g = Math.abs((at(pa, x) - at(pa, x - 1)) - (at(pb, x) - at(pb, x - 1)));
      if (g > swing) { swing = g; sx = x; }
      if (d) lead = { who: d > 0 ? an : bn, x: lead && lead.who === (d > 0 ? an : bn) ? lead.x : x };
    }
    return `${lead ? `${esc(lead.who)} led from signing ${lead.x} to the end. ` : ''}${swing ? `Biggest swing: signing ${sx} (${fmt(swing)}).` : ''}`;
  }
  // the signings that differed most (same order of signing, different player)
  function diffs(a, b, an, bn, mgrs) {
    const rows = [];
    const mgrRow = mgrs ? `<div class="ch-diff"><small>👔 The manager</small><span>${esc(an)}: <b>${esc(mgrs[0] || '–')}</b></span><span>${esc(bn)}: <b>${esc(mgrs[1] || '–')}</b></span></div>` : '';
    for (let k = 0; k < Math.min((a || []).length, (b || []).length); k++) {
      const x = a[k], y = b[k];
      if (x[1] !== y[1]) rows.push({ k, x, y, d: x[4] - y[4] });
    }
    if (!rows.length && !mgrRow) return '';
    return `<h3 class="section-title">🔀 Where you went different ways</h3><div class="ch-diffs">${mgrRow}${rows.sort((p, q) => Math.abs(q.d) - Math.abs(p.d)).slice(0, 4).sort((p, q) => p.k - q.k).map(r =>
      `<div class="ch-diff"><small>Signing ${r.k + 1}</small><span class="${r.d > 0 ? 'win' : ''}">${esc(an)}: <b>${esc(r.x[2])}</b> ${esc(r.x[3])} · ${fmt(r.x[4])}</span><span class="${r.d < 0 ? 'win' : ''}">${esc(bn)}: <b>${esc(r.y[2])}</b> ${esc(r.y[3])} · ${fmt(r.y[4])}</span></div>`).join('')}</div>`;
  }
  // the two XIs, slot by slot
  function xis(ga, gb, an, bn) {
    const a = ga.xi || [], b = gb.xi || [], n = Math.max(a.length, b.length);
    const cell = (s, other) => (s && s[1] ? `<td class="${other && other[1] && s[3] > other[3] ? 'win' : ''}"><b>${esc(String(s[2]).split(' ').slice(-1)[0])}</b> ${fmt(s[3])}</td>` : '<td class="muted">–</td>');
    return `<table class="ch-xis"><tr><th></th><th>${esc(an)}</th><th>${esc(bn)}</th></tr>${Array.from({ length: n }, (_, i) =>
      `<tr><td class="pos">${esc((a[i] || b[i] || [''])[0])}</td>${cell(a[i], b[i])}${cell(b[i], a[i])}</tr>`).join('')}</table>`;
  }
  // everyone who's had a go at this challenge, best first (a group challenge)
  function groupTable(ch) {
    const done = ch.plays.filter(p => p.status === 'done');
    if (done.length < 3) return '';
    return `<h3 class="section-title">🏟️ The table</h3><div class="ch-table">${done.sort((a, b) => b.score - a.score).map((p, i) =>
      `<a class="ch-row ${p.owner ? 'owner' : ''}" href="#/c?id=${ch.code}&p=${p.id}"><span class="ch-rank">${i + 1}</span><b>${esc(p.name)}</b>${p.owner ? '<small>set it</small>' : ''}<span class="ch-score">${fmt(p.score)}</span></a>`).join('')}</div>`;
  }
  // a rematch chain between the same two: best of three (and on from there)
  async function bestOf(el, ch, an, bn, you) {
    const chain = (ch.chain || []).filter(Boolean);
    if (!el || chain.length < 2) return;
    const games = await Promise.all(chain.map(c => (c === ch.code ? Promise.resolve(ch) : rpc('challenge_get', { p_code: c }).catch(() => null))));
    let wa = 0, wb = 0;
    games.forEach(g => {
      if (!g) return;
      const pa = g.plays.find(p => p.status === 'done' && p.name === an), pb = g.plays.find(p => p.status === 'done' && p.name === bn);
      if (pa && pb) { if (pa.score > pb.score) wa++; else if (pb.score > pa.score) wb++; }
    });
    const a = you ? 'You' : an, n = chain.length;
    el.innerHTML = `<div class="ch-bo3"><b>${n <= 3 ? (wa >= 2 || wb >= 2 ? `🏆 Best of three to ${esc(wa > wb ? a : bn)}` : `Best of three · game ${n}`) : `Rematch run · ${n} games`}</b><span>${esc(a)} ${wa} – ${wb} ${esc(bn)}</span></div>`;
  }

  // the head-to-head as a picture: both scores, both lines, the big differences
  function picture(ch, A, B, an, bn) {
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b3d2e'); g.addColorStop(1, '#07261d');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.textAlign = 'center';
    c.fillStyle = '#c8ff3d'; c.font = '700 64px Oswald, Impact, sans-serif'; c.fillText('GOAL MACHINE', W / 2, 92);
    c.fillStyle = '#fff'; c.font = '800 40px Inter, Arial, sans-serif'; c.fillText('⚔️ Head to head · ' + modeName(ch), W / 2, 160);
    const nameA = an === 'You' ? (GM.getName() || 'Me') : an;
    c.font = '700 120px Oswald, Impact, sans-serif'; c.fillStyle = '#7cc0ff'; c.fillText(fmt(A.score), W * 0.28, 330); c.fillStyle = '#ffb36b'; c.fillText(fmt(B.score), W * 0.72, 330);
    c.font = '800 40px Inter, Arial, sans-serif'; c.fillStyle = '#fff'; c.fillText(nameA, W * 0.28, 390); c.fillText(bn, W * 0.72, 390); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('v', W / 2, 320);
    // the chart
    const L = 120, R = 80, T = 470, Hc = 520, pa = A.game.prog || [], pb = B.game.prog || [], max = Math.max(10, ...[...pa, ...pb].map(e => e[1]));
    const X = x => L + (W - L - R) * x / 11, Y = y => T + Hc * (1 - y / max);
    c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 2; [0, 0.5, 1].forEach(f => { c.beginPath(); c.moveTo(L, Y(max * f)); c.lineTo(W - R, Y(max * f)); c.stroke(); });
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 26px Inter, Arial, sans-serif'; c.textAlign = 'right'; [0, 0.5, 1].forEach(f => c.fillText(fmt(max * f), L - 14, Y(max * f) + 9));
    c.textAlign = 'center'; [0, 3, 6, 9, 11].forEach(x => c.fillText(x, X(x), T + Hc + 44));
    const draw = (p, col) => { c.strokeStyle = col; c.lineWidth = 8; c.lineJoin = 'round'; c.beginPath(); for (let x = 0; x <= 11; x++) { const yy = Y(at(p, x)); if (x) c.lineTo(X(x), yy); else c.moveTo(X(x), yy); } c.stroke(); };
    draw(pb, '#ffb36b'); draw(pa, '#7cc0ff');
    c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '600 28px Inter, Arial, sans-serif'; c.fillText('Running total after each signing', W / 2, T + Hc + 92);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 26px Inter, Arial, sans-serif'; c.fillText('opportunisticgames.github.io/goal-machine', W / 2, H - 40);
    return cv.toDataURL('image/png');
  }

  /* ---------------------------------------------------------------- watch along */
  let wtimer = null;
  window.addEventListener('hashchange', () => { if (!/[?&]watch=/.test(location.hash)) { clearInterval(wtimer); wtimer = null; } });
  function watch(app, ch, playId) {
    clearInterval(wtimer);
    const draw = c => {
      const owner = c.plays.find(p => p.owner), p = c.plays.find(x => x.id === playId);
      if (!p) { app.innerHTML = top('👀 Watch along', '#/c?id=' + c.code) + '<p class="center muted">Can’t find that player.</p>'; return; }
      const g = p.game || {}, n = (g.xi || []).filter(s => s[1]).length, last = (g.picks || []).slice(-1)[0], d = at(g.prog, n) - at(owner.game.prog, n);
      app.innerHTML = top('👀 Watch along', '#/c?id=' + c.code) + `<div class="ch-verdict"><b>${p.status === 'done' ? '⏱️ Full time' : `<i class="live-dot"></i> ${esc(p.name)} is playing`}</b>
          <div class="ch-scores"><span class="a">${esc(p.name)} <b>${fmt(p.score)}</b></span><i>v</i><span class="b"><b>${fmt(owner.score)}</b> ${esc(owner.name)}</span></div>
          <small>${n}/11 signed${n ? ` · ${d >= 0 ? `${fmt(d)} ahead of` : `${fmt(-d)} behind`} ${esc(owner.name)} at the same point` : ''}</small></div>
        ${last ? `<div class="ch-bubble">✍️ Just signed <b>${esc(last[2])}</b> (${esc(last[3])}) · ${fmt(last[4])}</div>` : ''}
        ${chartSvg(g.prog, owner.game.prog, p.name, owner.name)}
        <h3 class="section-title">🆚 The XIs so far</h3>${xis(g, owner.game || {}, p.name, owner.name)}
        ${p.status === 'done' ? `<div class="actions col"><a class="btn big" href="#/c?id=${c.code}&p=${p.id}">See the head-to-head</a></div>` : '<p class="muted small center">Updates as they sign each player</p>'}`;
      if (p.status === 'done') { clearInterval(wtimer); wtimer = null; }
    };
    draw(ch);
    let lastAt = '';
    wtimer = setInterval(async () => {
      if (!location.hash.includes('watch=')) { clearInterval(wtimer); return; }
      let c = null; try { c = await rpc('challenge_get', { p_code: ch.code }); } catch (e) { return; }
      const p = c && c.plays.find(x => x.id === playId);
      if (p && p.updated !== lastAt) { lastAt = p.updated; draw(c); GM.sound.play('tap'); }
    }, 3500);
  }

  /* ---------------------------------------------------------------- your record against a friend */
  function tally(h) {
    const by = {};
    h.forEach(g => {
      if (!g.opp) return;
      const k = g.opp.toLowerCase(), t = by[k] || (by[k] = { name: g.opp, w: 0, d: 0, l: 0, games: [] });
      if (g.mine > g.theirs) t.w++; else if (g.mine < g.theirs) t.l++; else t.d++;
      t.games.push(g);
    });
    return by;
  }
  // a row in a list of your challenges: who, what, the score, and where it takes you
  let mineCache = null;
  const rowHref = r => `#/c?id=${r.code}${r.pid ? (r.status === 'playing' && r.sent ? '&watch=' : '&p=') + r.pid : ''}`;
  function rowHtml(r) {
    const d = (r.mine || 0) - (r.theirs || 0), done = r.status === 'done';
    const inv = r.status === 'invited';
    const icon = inv ? '⚔️' : !r.pid ? '📤' : !done ? '👀' : d > 0 ? '✅' : d < 0 ? '❌' : '🤝';
    const who = inv ? esc(r.opp) : !r.pid ? ((r.sent_to || []).length ? 'Sent to ' + esc(r.sent_to.join(', ')) : 'Waiting for a taker') : esc(r.opp);
    const when = new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const sub = `${inv ? '<b class="live">Challenged you – take it on</b>' : !r.pid ? 'You sent it' : r.sent ? 'Took on yours' : 'You took on theirs'} · ${!inv && !done && r.pid ? (r.sent ? '<b class="live">playing now – watch</b>' : 'not finished') : when}<br>${esc(modeName(r))}`;
    const score = inv ? `beat ${fmt(r.theirs)}` : !r.pid ? fmt(r.mine) : done ? `${fmt(r.mine)}–${fmt(r.theirs)}` : `${fmt(r.theirs || 0)}…`;
    return `<a class="ch-row ch-mine ${done ? '' : 'live'}" href="${rowHref(r)}"><span class="ch-rank">${icon}</span><span class="ch-who">${r.opp ? GM.userPic(r.opp) : ''}<span><b>${who}</b><small>${sub}</small></span></span><span class="ch-score">${score}</span></a>`;
  }
  async function listPage(app) {
    app.innerHTML = top('⚔️ Your challenges', '#/online') + '<p class="center muted">Loading…</p>';
    if (!GM.account()) { app.innerHTML = top('⚔️ Your challenges', '#/online') + '<p class="center muted">Claim a name on the Online tab to keep your challenges.</p>'; return; }
    const rows = await GM.challenge.mine(true);
    if (!rows) { app.innerHTML = top('⚔️ Your challenges', '#/online') + '<p class="center muted">Couldn’t load your challenges – are you online?</p>'; return; }
    const by = tally(rows.filter(r => r.status === 'done' && r.pid).map(r => ({ opp: r.opp, mine: r.mine, theirs: r.theirs })));
    const recs = Object.values(by).sort((a, b) => (b.w + b.l + b.d) - (a.w + a.l + a.d));
    app.innerHTML = top('⚔️ Your challenges', '#/online') + (rows.length ? `
      ${recs.length ? `<div class="ch-recs">${recs.map(t => `<a href="#/rival?name=${enc(t.name)}">${GM.userPic(t.name)}<b>${esc(t.name)}</b><small>⚔️ ${t.w}–${t.l}${t.d ? ` (${t.d}d)` : ''}</small></a>`).join('')}</div>` : ''}
      <div class="ch-table">${rows.map(rowHtml).join('')}</div>`
      : '<p class="center muted">No challenges yet. Finish a draft and tap ⚔️ Challenge a friend.</p>');
  }
  async function rival(app, name) {
    app.innerHTML = top('📜 ' + esc(name), '#/online') + '<p class="center muted">Loading…</p>';
    if (!GM.account()) { app.innerHTML = top('📜 ' + esc(name), '#/online') + '<p class="center muted">Claim a name on the Online tab to keep a record of your challenges.</p>'; return; }
    let h = []; try { h = await rpc('challenge_history', auth()); } catch (e) { h = null; }
    if (!h) { app.innerHTML = top('📜 ' + esc(name), '#/online') + '<p class="center muted">Couldn’t load your record – are you online?</p>'; return; }
    const t = tally(h)[name.toLowerCase()];
    if (!t) { app.innerHTML = top('📜 ' + esc(name), '#/online') + `<p class="center muted">No challenges with ${esc(name)} yet. Finish a draft and tap ⚔️ Challenge a friend.</p>`; return; }
    const games = t.games;  // newest first
    let streak = 0, sw = null;
    for (const g of games) { const r = Math.sign(g.mine - g.theirs); if (sw === null) sw = r; if (r !== sw || r === 0) break; streak++; }
    // the biggest comeback: the most you (or they) were behind at the same point and still won
    const behind = (g, mineSide) => { let worst = 0; for (let x = 1; x <= 11; x++) { const d = mineSide ? at(g.their_hist, x) - at(g.my_hist, x) : at(g.my_hist, x) - at(g.their_hist, x); if (d > worst) worst = d; } return worst; };
    const myBack = games.filter(g => g.mine > g.theirs).map(g => [behind(g, true), g]).sort((a, b) => b[0] - a[0])[0];
    const theirBack = games.filter(g => g.theirs > g.mine).map(g => [behind(g, false), g]).sort((a, b) => b[0] - a[0])[0];
    const close = games.slice().sort((a, b) => Math.abs(a.mine - a.theirs) - Math.abs(b.mine - b.theirs))[0];
    const mn = m => ((GM.MODES || {})[m] || { name: m }).name;
    app.innerHTML = top('📜 You v ' + esc(t.name), '#/online') + `<div class="ch-hero">${GM.userPic ? GM.userPic(t.name, 'xl') : ''}<b class="ch-rec">You ${t.w} – ${t.l} ${esc(t.name)}</b>${t.d ? `<small>${t.d} draw${t.d > 1 ? 's' : ''}</small>` : ''}
        ${streak > 1 && sw ? `<span>${sw > 0 ? `🔥 You’ve won the last ${streak}` : `🥶 ${esc(t.name)} has won the last ${streak}`}</span>` : ''}</div>
      <div class="ch-facts">
        ${myBack && myBack[0] > 0 ? `<a href="#/c?id=${myBack[1].code}"><b>💪 Your best comeback</b><span>${fmt(myBack[0])} behind, won ${fmt(myBack[1].mine)}–${fmt(myBack[1].theirs)}</span></a>` : ''}
        ${theirBack && theirBack[0] > 0 ? `<a href="#/c?id=${theirBack[1].code}"><b>😤 Their best comeback</b><span>${fmt(theirBack[0])} behind, won ${fmt(theirBack[1].theirs)}–${fmt(theirBack[1].mine)}</span></a>` : ''}
        ${close ? `<a href="#/c?id=${close.code}"><b>📏 Closest game</b><span>${fmt(close.mine)}–${fmt(close.theirs)} in ${esc(mn(close.mode))}</span></a>` : ''}
      </div>
      <h3 class="section-title">Every challenge</h3><div class="ch-table">${games.map(g => `<a class="ch-row" href="#/c?id=${g.code}"><span class="ch-rank">${g.mine > g.theirs ? '✅' : g.mine < g.theirs ? '❌' : '🤝'}</span><b>${esc(mn(g.mode))}</b><small>${new Date(g.at).toLocaleDateString()}</small><span class="ch-score">${fmt(g.mine)}–${fmt(g.theirs)}</span></a>`).join('')}</div>`;
  }
})();

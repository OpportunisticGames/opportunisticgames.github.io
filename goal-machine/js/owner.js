/* Goal Machine – 🕴️ Dodgy Owner: the screens (the rules are in owner-engine.js).
   Tabs: 🏠 Club (next match, the inbox, the news) · 👥 Squad · 📋 Team (the coach, meddling, formation, the XI) ·
   🔁 Transfers (search, offers, free agents, shortlist) · 💷 Money · 📊 League. One big button moves the season on:
   deal with the inbox, play this week's games (live or simulated), then the next week; or sim to the next decision.
   Boards: owner, ownerh, ownerx (league points). */
'use strict';

(function () {
  const O = () => GM.owner, esc = GM.esc, byPk = k => GM.anyByPk(k);
  const money = m => (m < 0 ? '−' : '') + '£' + (Math.round(Math.abs(m) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'm';
  const k$ = k => '£' + Math.round(k) + 'k';
  const shortName = p => { const w = p.name.split(' '); return w.length > 1 ? w.slice(-1)[0] : p.name; };
  const moodIcon = m => (m >= 85 ? '😁' : m >= 70 ? '🙂' : m >= 55 ? '😐' : m >= 35 ? '😟' : '😡');
  const bar = (v, cls = '') => `<span class="ow-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
  const fitCls = f => (f >= 85 ? 'ok' : f >= 70 ? 'mid' : 'low');

  GM.dodgyOwner = function (root, q = {}) {
    const lv = GM.level();
    if (lv === 'extreme' && !GM.allPlayers) {
      root.innerHTML = `<div class="loading-all"><div class="splash-bar"><i></i></div><p class="muted">Loading every Premier League player…</p></div>`;
      GM.loadAll().then(() => GM.dodgyOwner(root, q)).catch(() => { root.innerHTML += '<p class="center">Couldn’t load the player list.</p>'; });
      return;
    }
    const runId = GM.dodgyOwner.run = (GM.dodgyOwner.run || 0) + 1;  // only the latest screen's live match keeps ticking
    const E = O(), key = lv === 'hard' ? 'ownerh' : lv === 'extreme' ? 'ownerx' : 'owner', SAVE = 'owner:save:' + key, L = E.LEVELS[lv];
    const title = 'Dodgy Owner' + (lv === 'hard' ? ' · Hard' : lv === 'extreme' ? ' · Extreme' : '');
    const top = () => `<div class="topbar"><a href="#/" class="back">‹</a><h2>🕴️ ${title}</h2>${GM.lbButton(key)}</div>`;
    const plain = lv === 'hard';
    let S = GM.store.get(SAVE, null);
    const save = () => GM.store.set(SAVE, S);
    let tab = 'home', mtab = 'search', mf = { g: '', sort: 'value', max: -1 }, timer = null;  // the market opens on bargains you can afford
    const P = x => byPk(x.k);
    const ovrOf = p => E.ovr(p);
    const seesOvr = p => lv === 'normal' || S.coach === 'nerd' || S.scouted[p.pk] || S.squad.some(x => x.k === p.pk);
    const ovrBadge = (o, cls = '') => `<span class="cb-ovr ${o >= 80 ? 'hi' : o >= 70 ? 'mid' : 'lo'} ${cls}">${o}</span>`;
    const ovrShown = p => { if (seesOvr(p)) return ovrBadge(ovrOf(p)); const o = ovrOf(p), r = GM.rng(S.seed + '|scout|' + p.pk)(), lo = o - 3 - Math.floor(r * 4); return `<span class="cb-ovr q">${lo}–${lo + 8}</span>`; };

    /* ---------------------------------------------------------------- the pitch */
    function intro() {
      const seed = GM.newSeed(), offer = GM.rng(seed + '|first').shuffle(Object.keys(E.COACHES)).slice(0, 3);
      root.innerHTML = `${top()}<div class="ow-intro">
        <div class="ow-hero">🕴️</div><h3>You’ve bought a football club</h3>
        <p>Congratulations! You’re now the proud, <i>extremely</i> hands-on owner of a mid-table Premier League club. Nobody asked where the money came from.</p>
        <ul class="how-list">
          <li>🧢 <b>Hire and sack head coaches</b>. Or meddle and pick the team yourself (proud coaches hate it).</li>
          <li>👥 A squad of 20: <b>fitness, injuries, bans and morale</b>. Rotate or they’ll break.</li>
          <li>💷 Money comes in every week (TV, tickets, your sponsor) and <b>wages go out</b>. Two windows to buy, sell, loan and haggle.</li>
          <li>🕵️ Dodgy deals bring cash or an edge, but raise the <b>🔥 Heat</b>. Too much and the league comes knocking: fines, points deductions, embargoes.</li>
          <li>📣 Keep the <b>fans</b> on side. If they turn completely, they force you to sell.</li>
          <li>🏆 38 games and a cup. Your score is your <b>league points</b>. The fans expect ${L.target === 10 ? 'a top-half finish' : 'you to stay up'}.</li></ul>
        ${lv === 'hard' ? '<p class="muted">🥵 Hard: a weaker squad, less money, names and positions only, and the market only shows OVR ranges until you scout.</p>' : lv === 'extreme' ? '<p class="muted">⚡ Extreme: every PL player, a squad of unknowns, OVR ranges until you scout.</p>' : ''}
        <h3 class="section-title">Hire your first head coach</h3>
        <div class="cb-mgrs">${offer.map(c => coachCard(c)).join('')}</div>
        ${GM.store.get(SAVE, null) ? '<p class="muted center">Starting again replaces the season you’re in.</p>' : ''}</div>`;
      GM.$$('[data-coach]', root).forEach(b => b.onclick = () => {
        S = E.create(seed, lv, b.dataset.coach); save();
        GM.sound.play('whistle'); GM.buzz(30);
        if (q.new) history.replaceState(null, '', '#/owner');
        tab = 'home'; hub();
      });
    }
    function coachCard(id, extra = '') {
      const C = E.COACHES[id];
      return `<button class="cb-mgr" data-coach="${id}"><span>${C.icon}</span><b>${C.name}</b><small>${C.perk} · ${k$(C.wage)} a week${C.ego >= 10 ? ' · 😤 big ego' : C.ego === 0 ? ' · no ego' : ''}</small>${extra}</button>`;
    }

    /* ---------------------------------------------------------------- the hub */
    // what the big button does next
    function nextStep() {
      if (S.over) return { k: 'over', label: '🏁 The final table' };
      if (!S.coach) return { k: 'block', label: '🧢 Hire a head coach first', tab: 'home' };
      const need = S.inbox.filter(m => m.need);
      if (need.length) return { k: 'block', label: `📨 Answer your inbox (${need.length})`, tab: 'home' };
      if (S.week === 0) return { k: 'week', label: '▶ Kick off the season' };
      const tie = E.cupTie(S);
      if (tie && S.playedCup !== S.week) return { k: 'match', fx: tie, label: `🏆 ${E.CUP.names[tie.round]}: v ${GM.clubShort(tie.oppName)} (${tie.home ? 'H' : 'A'})` };
      const fx = E.fixture(S);
      if (fx && S.playedLeague !== S.week) return { k: 'match', fx, label: `⚽ Week ${S.week}: v ${GM.clubShort(S.teams[fx.opp].name)} (${fx.home ? 'H' : 'A'})` };
      return { k: 'week', label: `▶ On to week ${S.week + 1}` };
    }
    function hub() {
      stopTimer();
      const pos = E.position(S), t = S.teams[0], st = nextStep(), win = E.windowOpen(S), dl = E.deadlineDay(S);
      const tabs = [['home', '🏠 Club'], ['squad', '👥 Squad'], ['team', '📋 Team'], ['transfers', '🔁 Transfers'], ['money', '💷 Money'], ['league', '📊 League']];
      root.innerHTML = `${top()}
        <div class="ow-hud"><div class="ow-hud-top"><span class="cb-club">${GM.clubChip(S.club, true)}</span><span class="ow-week">${S.week === 0 ? 'Pre-season' : `Week ${S.week}/38`}${win ? (dl ? ' · ⏰ DEADLINE DAY' : ' · 🪟 window open') : ''}</span></div>
          <div class="cb-stats"><div><small>Position</small><b>${S.week > 1 || S.results.length ? E.ord(pos) : '–'}</b></div><div><small>Points</small><b>${t.p - t.ded}${t.ded ? '<sup>−' + t.ded + '</sup>' : ''}</b></div><div><small>💷 Cash</small><b class="${S.cash < 0 ? 'neg' : ''}">${money(S.cash)}</b></div><div><small>Wages</small><b>${k$(E.wageBill(S))}</b></div></div>
          <div class="ow-meters"><span>📣 Fans ${bar(S.fans, S.fans < 30 ? 'low' : S.fans < 55 ? 'mid' : 'ok')}</span><span>🔥 Heat ${bar(S.heat, S.heat >= 65 ? 'low' : S.heat >= 40 ? 'mid' : 'ok')}</span></div></div>
        <div class="seg ow-tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}${k === 'home' && S.inbox.some(m => m.need) ? '<i class="new-dot"></i>' : k === 'transfers' && S.offers.length ? '<i class="new-dot"></i>' : ''}</button>`).join('')}</div>
        <div class="ow-body">${({ home: homeTab, squad: squadTab, team: teamTab, transfers: transfersTab, money: moneyTab, league: leagueTab })[tab]()}</div>
        <div class="ow-go"><button class="btn big" id="owgo">${st.label}</button>${st.k !== 'over' && S.week > 0 ? '<button class="btn ghost" id="owsim" title="Simulate until something needs you">⏩ Sim to next decision</button>' : ''}</div>`;
      GM.$$('[data-tab]', root).forEach(b => b.onclick = () => { tab = b.dataset.tab; hub(); window.scrollTo(0, 0); });
      GM.$('#owgo', root).onclick = go;
      const sim = GM.$('#owsim', root); if (sim) sim.onclick = simAhead;
      wire[tab] && wire[tab]();
    }
    function go() {
      const st = nextStep();
      if (st.k === 'over') return end();
      if (st.k === 'block') { tab = st.tab; hub(); GM.toast(st.label); return; }
      if (st.k === 'week') return advance();
      if (st.k === 'match') return preMatch(st.fx);
    }
    function preMatch(fx) {
      const opp = fx.comp === 'league' ? S.teams[fx.opp] : { name: fx.oppName, str: fx.oppStr };
      const tired = E.readyXI(S).filter(s => s.i != null && S.squad[s.i].fit < 70).length;
      const m = GM.modal(`<h3>${fx.comp === 'cup' ? '🏆 ' + E.CUP.names[fx.round] : '⚽ Matchweek ' + fx.week}: v ${esc(opp.name)}</h3>
        <p class="muted">${fx.home ? 'At home' : 'Away'} · their strength ${Math.round(opp.str)} · yours ${Math.round(E.strength(S))}${tired ? ` · <b>${tired} tired player${tired > 1 ? 's' : ''} in the XI</b>` : ''}</p>
        <div class="row"><button class="btn" data-live>📺 Watch it live</button><button class="btn ghost" data-sim>⚡ Quick result</button></div>
        <button class="btn ghost" data-close>Not yet</button>`);
      GM.$('[data-live]', m.el).onclick = () => { m.close(); E.startMatch(S, fx); markPlayed(fx); save(); speed = 1; match(); };
      GM.$('[data-sim]', m.el).onclick = () => { m.close(); markPlayed(fx); const res = E.simMatch(S, fx); save(); resultModal(res); };
    }
    const markPlayed = fx => { if (fx.comp === 'cup') S.playedCup = S.week; else S.playedLeague = S.week; };
    function advance() {
      const notes = E.endWeek(S); save();
      GM.sound.play('tap');
      if (S.over) return end();
      hub();
      if (notes.length) GM.toast(notes.slice(0, 2).join('<br>'), 3600);
    }
    // keep going until something needs you: an inbox choice, an offer, the window, the end
    function simAhead() {
      let n = 0;
      const start = S.week;
      while (!S.over && n++ < 40) {
        const st = nextStep();
        if (st.k === 'block' || st.k === 'over') break;
        if (st.k === 'match') { markPlayed(st.fx); E.simMatch(S, st.fx); continue; }
        const offers = S.offers.length, notes = E.endWeek(S);
        if (S.over) break;
        if (S.offers.length > offers || notes.some(t => /DEADLINE|window is open|investigation|fines you|embargo|walked out|forced/i.test(t))) break;
      }
      save();
      if (S.over) return end();
      tab = 'home'; hub();
      GM.toast(`⏩ Simmed to week ${S.week}${S.week > start ? ` (${S.week - start} week${S.week - start > 1 ? 's' : ''})` : ''}`, 2200);
    }
    function resultModal(res) {
      const m = GM.modal(`<div class="cb-score ${res.res}"><span class="kicker">${res.comp === 'cup' ? '🏆 ' + E.CUP.names[res.round] : 'Week ' + res.week} · full time</span>
          <div class="cb-sl"><b>${esc(GM.clubShort(res.home ? S.club : res.opp))}</b><span>${res.home ? res.gf : res.ga} – ${res.home ? res.ga : res.gf}</span><b>${esc(GM.clubShort(res.home ? res.opp : S.club))}</b></div>
          ${res.pens !== undefined ? `<small>${res.pens ? 'Won' : 'Lost'} on penalties</small>` : ''}
          <div class="cb-goals">${res.ev.filter(e => e.k === 'goal' || e.k === 'conc' || e.k === 'red' || e.k === 'inj').map(e => `<span>${e.m}' ${esc(e.t)}</span>`).join('')}</div></div>
        ${ratingsHtml(res)}<button class="btn big" data-close>OK</button>`, { onClose: hub });
      GM.sound.play(res.res === 'W' ? 'cheer' : res.res === 'L' ? 'bad' : 'good');
    }
    const ratingsHtml = res => `<div class="cb-rates">${res.rows.slice(0, 14).map(x => { const pl = S.squad[x.i] ? P(S.squad[x.i]) : null; return pl ? `<div class="cb-rate">${pill(x.rt)}<span>${esc(shortName(pl))}${x.gl ? ' ⚽'.repeat(x.gl) : ''}${x.as ? ' 🅰️'.repeat(x.as) : ''}${x.card === 1 ? ' 🟨' : x.card >= 2 ? ' 🟥' : ''}</span></div>` : ''; }).join('')}</div>`;
    const pill = v => (v == null ? '<i class="cb-f na">–</i>' : `<i class="cb-f ${v >= 7.5 ? 'hot' : v >= 6.5 ? 'ok' : 'cold'}">${v.toFixed(1)}</i>`);

    /* ---- 🏠 the club: next games, the inbox, the news */
    function homeTab() {
      const fx = E.fixture(S), tie = E.cupTie(S), next = [tie && S.playedCup !== S.week ? tie : null, fx && S.playedLeague !== S.week ? fx : null].filter(Boolean);
      const last = S.results.slice(-5);
      return `${next.map(f => { const o = f.comp === 'league' ? S.teams[f.opp] : { name: f.oppName, str: f.oppStr }; return `<div class="ow-next"><span class="kicker">${f.comp === 'cup' ? '🏆 ' + E.CUP.names[f.round] : 'Next up · week ' + f.week}</span>
          <div class="cb-vs"><div><b>${esc(GM.clubShort(S.club))}</b>${ovrBadge(Math.round(E.strength(S)))}</div><span>v</span><div><b>${esc(GM.clubShort(o.name))}</b>${ovrBadge(Math.round(o.str))}</div></div><small class="muted">${esc(o.name)} · ${f.home ? 'home' : 'away'}</small></div>`; }).join('')}
        ${S.inbox.length ? `<h3 class="section-title">📨 Inbox</h3>${S.inbox.map((m, n) => inboxCard(m, n)).join('')}` : ''}
        ${!S.coach ? `<h3 class="section-title">🧢 You need a head coach</h3><div class="cb-mgrs">${E.coachOffer(S).map(c => coachCard(c)).join('')}</div>` : ''}
        ${last.length ? `<h3 class="section-title">Recent results</h3><div class="ow-form">${last.map(r => `<span class="ow-res ${r.res}" title="${esc(r.opp)}">${r.res}<small>${r.gf}–${r.ga}</small></span>`).join('')}</div>` : ''}
        <h3 class="section-title">📰 News</h3><ul class="ow-news">${S.news.slice(-10).reverse().map(n => `<li>${esc(n)}</li>`).join('') || '<li class="muted">Nothing yet. Pre-season friendlies, mainly.</li>'}</ul>`;
    }
    function inboxCard(m, n) {
      const ch = E.choicesFor(S, m);
      return `<div class="ow-mail${m.need ? ' need' : ''}"><b>${esc(m.title)}</b><p>${esc(m.body)}</p>
        <div class="ow-choices">${ch.map((c, k) => `<button class="btn small${k ? ' ghost' : ''}" data-mail="${n}" data-ch="${k}">${esc(c.label)}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</button>`).join('')}</div></div>`;
    }
    const wire = {
      home() {
        GM.$$('[data-mail]', root).forEach(b => b.onclick = () => {
          const m = S.inbox[+b.dataset.mail]; if (!m) return;
          const note = E.answer(S, m.id, +b.dataset.ch); save();
          GM.sound.play('place'); if (note) GM.toast(esc(note), 2600); hub();
        });
        GM.$$('[data-coach]', root).forEach(b => b.onclick = () => { E.hire(S, b.dataset.coach, false); save(); GM.sound.play('whistle'); hub(); });
      },
      squad() {
        GM.$$('[data-pl]', root).forEach(b => b.onclick = () => playerSheet(+b.dataset.pl));
      },
      team() {
        GM.$$('[data-meddle]', root).forEach(b => b.onclick = () => { S.meddle = b.dataset.meddle === '1'; if (S.meddle) S.xi = E.readyXI(S).map(s => ({ ...s })); save(); hub(); });
        GM.$$('[data-form]', root).forEach(b => b.onclick = () => { S.form = b.dataset.form; E.pickXI(S, S.form); save(); hub(); });
        GM.$$('[data-ment]', root).forEach(b => b.onclick = () => { S.ment = b.dataset.ment; save(); hub(); });
        GM.$$('[data-slot]', root).forEach(b => b.onclick = () => slotPicker(+b.dataset.slot));
        const ap = GM.$('#owauto', root); if (ap) ap.onclick = () => { E.pickXI(S, S.form); save(); hub(); GM.toast('Fittest XI picked'); };
        const sk = GM.$('#owsack', root); if (sk) sk.onclick = sackCoach;
      },
      transfers() {
        GM.$$('[data-mtab]', root).forEach(b => b.onclick = () => { mtab = b.dataset.mtab; hub(); });
        GM.$$('[data-fg]', root).forEach(b => b.onclick = () => { mf.g = b.dataset.fg; hub(); });
        GM.$$('[data-fs]', root).forEach(b => b.onclick = () => { mf.sort = b.dataset.fs; hub(); });
        GM.$$('[data-fm]', root).forEach(b => b.onclick = () => { mf.max = +b.dataset.fm; hub(); });
        GM.$$('[data-mk]', root).forEach(b => b.onclick = () => marketSheet(b.dataset.mk, b.dataset.free === '1'));
        GM.$$('[data-offer]', root).forEach(b => b.onclick = () => offerAction(+b.dataset.offer, b.dataset.act));
      },
    };

    /* ---- 👥 the squad */
    function squadTab() {
      const G = { G: '🧤 Goalkeepers', D: '🛡️ Defenders', M: '⚙️ Midfielders', F: '🎯 Forwards' }, xi = new Set(E.readyXI(S).map(s => s.i));
      return `<p class="cb-hint">${S.squad.length} players · tap one for his details, to list him, or let him go. <b>Fitness</b> drops when they play and comes back with rest.</p>
        ${['G', 'D', 'M', 'F'].map(g => `<h3 class="section-title">${G[g]}</h3><div class="ow-squad">${S.squad.map((x, i) => [x, i]).filter(([x]) => x.g === g).sort((a, b) => ovrOf(P(b[0])) - ovrOf(P(a[0]))).map(([x, i]) => {
          const p = P(x), form = x.rt.slice(-3), fa = form.length ? form.reduce((a, b) => a + b, 0) / form.length : null;
          return `<button class="ow-pl${xi.has(i) ? ' xi' : ''}" data-pl="${i}">${GM.avatar(p, '', plain)}<span class="ow-pl-who"><b>${esc(p.name)}</b>
            <span>${x.inj ? `🚑 ${x.inj}w ` : ''}${x.ban ? `🟥 ${x.ban} ` : ''}${x.yc ? `🟨${x.yc} ` : ''}${x.listed ? '🏷️ ' : ''}${x.loan ? '🔁 loan ' : ''}${x.nephew ? '👦 ' : ''}${moodIcon(x.mor)} ${pill(fa)} <small>${x.apps} apps${x.gl ? ` · ${x.gl}⚽` : ''}</small></span>
            ${bar(x.fit, fitCls(x.fit))}</span>${ovrBadge(ovrOf(p))}<span class="ow-wage">${k$(x.wage)}</span></button>`; }).join('')}</div>`).join('')}`;
    }
    function playerSheet(i) {
      const x = S.squad[i]; if (!x) return;
      const p = P(x), avg = x.rt.length ? (x.rt.reduce((a, b) => a + b, 0) / x.rt.length).toFixed(1) : '–';
      const m = GM.modal(`<div class="ow-sheet">${GM.avatar(p, 'lg', plain)}<h3>${esc(p.name)}</h3><p>${GM.posBadges(p)} ${plain ? '' : `${GM.flag(p.nat)} <small class="muted">${GM.era(p)} · ${p.apps} PL apps</small>`}</p>
          <div class="ow-facts"><div><small>OVR</small>${ovrBadge(ovrOf(p))}</div><div><small>Fitness</small><b>${Math.round(x.fit)}%</b></div><div><small>Morale</small><b>${moodIcon(x.mor)} ${Math.round(x.mor)}</b></div>
            <div><small>Value</small><b>${money(x.value)}</b></div><div><small>Wage</small><b>${k$(x.wage)}</b></div><div><small>This season</small><b>${x.apps} apps · ${x.gl} ⚽ · ${x.as} 🅰️ · avg ${avg}</b></div></div>
          ${x.inj ? `<p>🚑 Injured for ${x.inj} week${x.inj > 1 ? 's' : ''}.</p>` : ''}${x.ban ? `<p>🟥 Banned for ${x.ban} match${x.ban > 1 ? 'es' : ''}.</p>` : ''}${x.loan ? '<p>🔁 On loan: he can’t be sold.</p>' : ''}
          <div class="actions col">${x.loan ? '' : `<button class="btn" data-list>${x.listed ? '🏷️ Take him off the list' : '🏷️ Transfer-list him (offers come in)'}</button>
            <button class="btn ghost" data-release>📄 Release him (pay-off ${money(E.releaseCost(S, x))})</button>`}<button class="btn ghost" data-close>Close</button></div></div>`);
      const li = GM.$('[data-list]', m.el); if (li) li.onclick = () => { x.listed = !x.listed; save(); m.close(); hub(); GM.toast(x.listed ? `${esc(p.name)} is on the transfer list` : 'Taken off the list'); };
      const rl = GM.$('[data-release]', m.el); if (rl) rl.onclick = async () => { m.close(); if (await GM.confirm(`Release ${esc(p.name)}? You pay him off: ${money(E.releaseCost(S, x))}.`, 'Release', 'Keep')) { if (E.release(S, i)) { save(); hub(); } else GM.toast(`You need at least ${E.SQUAD_MIN} players`); } };
    }

    /* ---- 📋 the team: the coach, meddling, the XI */
    function teamTab() {
      const C = E.COACHES[S.coach], xi = E.readyXI(S), form = S.meddle ? S.form : (xi.length ? null : S.form);
      const rows = [['F'], ['M'], ['D'], ['G']];
      return `${C ? `<div class="ow-coach"><span>${C.icon}</span><span><b>${C.name}</b><small>${C.perk}</small>
            <span class="ow-rel">Your relationship ${bar(S.rel, S.rel < 30 ? 'low' : S.rel < 55 ? 'mid' : 'ok')}</span></span>
            <button class="btn small ghost" id="owsack">Sack (${money(E.sackCost(S))})</button></div>` : `<p class="cb-hint">No head coach! Hire one on the Club tab.</p>`}
        <div class="seg ow-meddle"><button data-meddle="0" class="${S.meddle ? '' : 'on'}">🧢 Coach picks</button><button data-meddle="1" class="${S.meddle ? 'on' : ''}">🕴️ I’ll pick it</button></div>
        <p class="cb-hint">${S.meddle ? `You’re picking the team. ${C && C.ego ? `${C.name} isn’t happy: <b>−${C.ego} relationship</b> each game you meddle, and his perk’s halved. Push him too far and he walks.` : 'The Yes-Man doesn’t mind at all.'}` : `${C ? C.name : 'The coach'} picks the fittest XI${C && ['busparker', 'zealot', 'philosopher'].includes(S.coach) ? ' in his favourite shape' : ''}, with his full perk. Tired players get rested.`}</p>
        ${S.meddle ? `<div class="seg ow-forms">${Object.keys(E.FORMATIONS).map(f => `<button data-form="${f}" class="${f === S.form ? 'on' : ''}">${f}</button>`).join('')}</div>` : ''}
        <div class="seg ow-ment">${[['defend', '🛡️ Defend'], ['balanced', '⚖️ Balanced'], ['attack', '⚔️ Attack']].map(([k, l]) => `<button data-ment="${k}" class="${S.ment === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="cb-pitch">${rows.map(([g]) => `<div class="cb-line">${xi.map((s, n) => [s, n]).filter(([s]) => s.g === g).map(([s, n]) => {
          const x = s.i != null ? S.squad[s.i] : null, p = x && P(x), off = x && x.g !== s.g;
          return `<button class="cb-man${off ? ' hurt' : ''}" data-slot="${n}" ${S.meddle ? '' : 'disabled'}>${p ? GM.avatar(p, '', plain) : '<span class="avatar">?</span>'}${p ? ovrBadge(ovrOf(p)) : ''}<b>${p ? esc(shortName(p)) : 'Empty'}</b><small>${x ? `${Math.round(x.fit)}%${off ? ' · out of position' : ''}` : ''}</small></button>`; }).join('')}</div>`).join('')}</div>
        <div class="cb-ovrline">Team strength <b>${Math.round(E.strength(S))}</b> · OVR <b>${E.teamOvr(S)}</b>${S.meddle ? ' · <button class="link" id="owauto">pick the fittest XI</button>' : ''}</div>
        <h3 class="section-title">Bench & the rest</h3><div class="ow-benchlist">${S.squad.map((x, i) => [x, i]).filter(([, i]) => !xi.some(s => s.i === i)).map(([x]) => { const p = P(x); return `<span class="ow-chip ${E.available(x) ? '' : 'out'}">${esc(shortName(p))} ${ovrOf(p)} · ${Math.round(x.fit)}%${x.inj ? ' 🚑' : x.ban ? ' 🟥' : ''}</span>`; }).join('')}</div>`;
    }
    function slotPicker(n) {
      const s = S.xi[n], cur = s.i;
      const cands = S.squad.map((x, i) => [x, i]).filter(([x]) => E.available(x)).sort((a, b) => (b[0].g === s.g) - (a[0].g === s.g) || E.eff(S, b[0]) - E.eff(S, a[0]));
      const m = GM.modal(`<h3>Who plays ${({ G: 'in goal', D: 'in defence', M: 'in midfield', F: 'up front' })[s.g]}?</h3>
        <div class="cb-outs">${cands.map(([x, i]) => { const p = P(x), inXI = S.xi.some(t => t.i === i); return `<button class="cb-out" data-pick="${i}">${GM.avatar(p, '', plain)}<span><b>${esc(p.name)}${i === cur ? ' ✓' : ''}</b><small>${x.g !== s.g ? '⚠️ out of position · ' : ''}${Math.round(x.fit)}% fit ${moodIcon(x.mor)}${inXI && i !== cur ? ' · in the XI (they’ll swap)' : ''}</small></span>${ovrBadge(ovrOf(p))}</button>`; }).join('')}</div>
        <button class="btn ghost" data-close>Cancel</button>`);
      GM.$$('[data-pick]', m.el).forEach(b => b.onclick = () => {
        const i = +b.dataset.pick, other = S.xi.findIndex(t => t.i === i);
        if (other >= 0) S.xi[other].i = cur;
        s.i = i; save(); m.close(); hub();
      });
    }
    async function sackCoach() {
      const c = E.sackCost(S);
      if (!await GM.confirm(`Sack ${E.COACHES[S.coach].name}? His compensation is ${money(c)}. The new coach gets a bounce for two games, and the fans love a sacking.`, '🧢 Sack him', 'Keep him')) return;
      const offer = E.coachOffer(S);
      const m = GM.modal(`<h3>Who’s next?</h3><div class="cb-mgrs">${offer.map(id => coachCard(id)).join('')}</div><button class="btn ghost" data-close>Actually, keep him</button>`);
      GM.$$('[data-coach]', m.el).forEach(b => b.onclick = () => { E.hire(S, b.dataset.coach, true); save(); m.close(); GM.sound.play('sacked'); GM.buzz(60); hub(); });
    }

    /* ---- 🔁 transfers */
    function transfersTab() {
      const win = E.windowOpen(S), nw = E.nextWindow(S);
      const banner = S.embargo && S.week >= 19 ? '<div class="ow-window shut">⚖️ Transfer embargo: no signings this window</div>'
        : win ? `<div class="ow-window ${E.deadlineDay(S) ? 'dl' : 'open'}">${E.deadlineDay(S) ? '⏰ DEADLINE DAY: prices down 15%, the window shuts tonight' : `🪟 The window’s open until week ${E.WINDOWS.find(([a, b]) => S.week >= a && S.week <= b)[1]}`}</div>`
          : `<div class="ow-window shut">🪟 The window’s shut${nw ? ` until week ${nw[0]}` : ''}. Free agents can still sign.</div>`;
      const tabs = [['search', '🔎 Search'], ['offers', `📨 Offers${S.offers.length ? ` (${S.offers.length})` : ''}`], ['free', '🆓 Free agents'], ['short', `⭐ Shortlist${S.shortlist.length ? ` (${S.shortlist.length})` : ''}`]];
      let body = '';
      if (mtab === 'search') body = searchHtml();
      else if (mtab === 'offers') body = S.offers.length ? S.offers.map((o, n) => { const x = S.squad.find(y => y.k === o.k); if (!x) return ''; const p = P(x); return `<div class="ow-offer">${GM.avatar(p, '', plain)}<span><b>${esc(o.club)} bid ${money(o.fee)}</b><small>for ${esc(p.name)} (worth ${money(x.value)}${x.listed ? ', listed' : ''})</small></span>
          <span class="ow-choices"><button class="btn small" data-offer="${n}" data-act="yes">Accept</button><button class="btn small ghost" data-offer="${n}" data-act="more">Ask for more</button><button class="btn small ghost" data-offer="${n}" data-act="no">Reject</button></span></div>`; }).join('') : '<p class="muted center">No offers. Transfer-list a player (Squad tab) and clubs will come in during a window.</p>';
      else if (mtab === 'free') body = `<p class="cb-hint">Free agents sign any time, for wages only. New ones every few weeks.</p>${rowsHtml(S.free.map(byPk).filter(Boolean), true)}`;
      else body = S.shortlist.length ? rowsHtml(S.shortlist.map(byPk).filter(Boolean)) : '<p class="muted center">Star players in the market to keep an eye on them.</p>';
      return `${banner}<div class="seg ow-mtabs">${tabs.map(([k, l]) => `<button data-mtab="${k}" class="${mtab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
    }
    let poolCache = null;
    function searchHtml() {
      const mine = new Set(S.squad.map(x => x.k));
      if (!poolCache) poolCache = (lv === 'extreme' ? GM.allPlayers : GM.players);
      let list = poolCache.filter(p => !mine.has(p.pk) && (!mf.g || p.pos === mf.g));
      const withAsk = list.map(p => ({ p, o: ovrOf(p) })).filter(r => r.o >= 58);
      const cap = mf.max === -1 ? Math.max(0.5, S.cash) : mf.max;
      let rows = withAsk.map(r => ({ ...r, ask: E.askPrice(S, r.p) })).filter(r => !cap || r.ask <= cap);
      // what you think he's worth: exact if you can see his OVR, roughly if not (Hard and Extreme, unscouted)
      const seen = r => (seesOvr(r.p) ? r.o : r.o + GM.rng(S.seed + '|scout|' + r.p.pk)() * 6 - 3);
      rows.sort(mf.sort === 'price' ? (a, b) => a.ask - b.ask : mf.sort === 'value' ? (a, b) => E.fairValue(seen(b)) / b.ask - E.fairValue(seen(a)) / a.ask : (a, b) => seen(b) - seen(a));
      return `<div class="ow-filters"><div class="seg">${[['', 'All'], ['G', 'GK'], ['D', 'DEF'], ['M', 'MID'], ['F', 'FWD']].map(([k, l]) => `<button data-fg="${k}" class="${mf.g === k ? 'on' : ''}">${l}</button>`).join('')}</div>
          <div class="seg">${[['ovr', 'Best'], ['value', '💎 Bargains'], ['price', 'Cheapest']].map(([k, l]) => `<button data-fs="${k}" class="${mf.sort === k ? 'on' : ''}">${l}</button>`).join('')}</div>
          <div class="seg">${[[-1, 'Can afford'], [10, '≤ £10m'], [20, '≤ £20m'], [0, 'Any price']].map(([k, l]) => `<button data-fm="${k}" class="${mf.max === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        ${rowsHtml(rows.slice(0, 25).map(r => r.p))}`;
    }
    function rowsHtml(list, free) {
      return `<div class="cb-market">${list.map(p => { const own = S.teams[E.ownerOf(S, p)]; return `<button class="cb-row" data-mk="${p.pk}" ${free ? 'data-free="1"' : ''}>${GM.avatar(p, '', plain)}<span class="cb-who"><b>${esc(p.name)}${S.shortlist.includes(p.pk) ? ' ⭐' : ''}</b>
          <span>${GM.posBadges(p)} ${free ? '🆓 free agent' : esc(own ? own.name : '')}</span></span>${ovrShown(p)}<span class="cb-price">${free ? k$(E.demand(S, p)) : money(E.askPrice(S, p))}</span></button>`; }).join('') || '<p class="muted center">Nobody matches.</p>'}</div>`;
    }
    // a market player: scout him, shortlist him, bid, loan
    function marketSheet(k, free) {
      const p = byPk(k), o = ovrOf(p), ask = E.askPrice(S, p), own = S.teams[E.ownerOf(S, p)], d = E.demand(S, p), win = E.windowOpen(S);
      const m = GM.modal(`<div class="ow-sheet">${GM.avatar(p, 'lg', plain)}<h3>${esc(p.name)}</h3><p>${GM.posBadges(p)} ${plain ? '' : `${GM.flag(p.nat)} <small class="muted">${GM.era(p)} · ${p.apps} PL apps · ${p.goals} goals</small>`}</p>
          <div class="ow-facts"><div><small>OVR</small>${ovrShown(p)}</div><div><small>${free ? 'Free agent' : esc(own.name) + ' want'}</small><b>${free ? '£0' : money(ask)}</b></div><div><small>He wants</small><b>${k$(d)} a week</b></div><div><small>Your cash</small><b>${money(S.cash)}</b></div><div><small>Wage bill</small><b>${k$(E.wageBill(S))} / ${k$(L.cap * 1000)}</b></div></div>
          ${seesOvr(p) ? '' : `<button class="btn ghost" data-scout>🔍 Scout him (£0.2m): see his exact OVR</button>`}
          <div class="actions col">${free ? `<button class="btn" data-sign>✍️ Offer him a contract</button>` : win ? `<button class="btn" data-bid>💷 Make a bid</button>${E.canLoan(S, p) ? `<button class="btn ghost" data-loan>🔁 Loan him (${money(E.loanFee(p))} fee + his wages)</button>` : ''}` : '<p class="muted">The window’s shut. Shortlist him for later.</p>'}
            <button class="btn ghost" data-star>${S.shortlist.includes(k) ? '⭐ Remove from shortlist' : '⭐ Shortlist'}</button><button class="btn ghost" data-close>Close</button></div></div>`);
      const sc = GM.$('[data-scout]', m.el); if (sc) sc.onclick = () => { if (S.cash < 0.2) return GM.toast('No money for scouting'); S.cash = Math.round((S.cash - 0.2) * 10) / 10; E.book(S, 'Scouting', -0.2); S.scouted[k] = 1; save(); m.close(); marketSheet(k, free); };
      GM.$('[data-star]', m.el).onclick = () => { S.shortlist = S.shortlist.includes(k) ? S.shortlist.filter(x => x !== k) : S.shortlist.concat(k); save(); m.close(); hub(); };
      const bd = GM.$('[data-bid]', m.el); if (bd) bd.onclick = () => { m.close(); bidFlow(p, Math.max(0.5, Math.round(ask * 0.9 * 2) / 2)); };
      const ln = GM.$('[data-loan]', m.el); if (ln) ln.onclick = () => { m.close(); termsFlow(p, E.loanFee(p), true); };
      const fr = GM.$('[data-sign]', m.el); if (fr) fr.onclick = () => { m.close(); termsFlow(p, 0, false, true); };
    }
    const stepper = (id, v, step, fmt) => `<div class="ow-stepper"><button data-dn="${id}">−</button><b id="${id}">${fmt(v)}</b><button data-up="${id}">+</button></div>`;
    function bidFlow(p, fee) {
      const own = S.teams[E.ownerOf(S, p)];
      const m = GM.modal(`<h3>Bid for ${esc(p.name)}</h3><p class="muted">${esc(own.name)} want around ${money(E.askPrice(S, p))}. You have ${money(S.cash)}.</p>
        ${stepper('owfee', fee, 0.5, money)}<div class="actions col"><button class="btn" data-go>Send the bid</button><button class="btn ghost" data-close>Cancel</button></div>`);
      const show = () => { GM.$('#owfee', m.el).textContent = money(fee); };
      GM.$('[data-dn="owfee"]', m.el).onclick = () => { fee = Math.max(0.5, Math.round((fee - (fee > 20 ? 1 : 0.5)) * 2) / 2); show(); };
      GM.$('[data-up="owfee"]', m.el).onclick = () => { fee = Math.round((fee + (fee >= 20 ? 1 : 0.5)) * 2) / 2; show(); };
      GM.$('[data-go]', m.el).onclick = () => {
        const r = E.bid(S, p.pk, fee); m.close();
        if (r.res === 'accept') { GM.sound.play('good'); GM.toast(`✅ ${esc(own.name)} accept ${money(fee)}`); termsFlow(p, fee, false); }
        else if (r.res === 'counter') counterFlow(p, r.counter);
        else if (r.res === 'reject') { GM.sound.play('bad'); GM.toast(`❌ ${esc(own.name)} laughed at ${money(fee)}`, 2600); }
        else GM.toast(r.res === 'embargo' ? '⚖️ You’re under a transfer embargo' : 'The window’s shut');
      };
    }
    function counterFlow(p, counter) {
      const own = S.teams[E.ownerOf(S, p)];
      const m = GM.modal(`<h3>${esc(own.name)} come back with ${money(counter)}</h3><p class="muted">Take it, or walk away.</p><div class="row"><button class="btn ghost" data-close>Walk away</button><button class="btn" data-yes>Pay ${money(counter)}</button></div>`);
      GM.$('[data-yes]', m.el).onclick = () => { m.close(); termsFlow(p, counter, false); };
    }
    // personal terms: offer him a wage
    function termsFlow(p, fee, loan, free) {
      let wage = E.demand(S, p);
      const m = GM.modal(`<h3>${esc(p.name)}: personal terms</h3><p class="muted">His agent wants ${k$(E.demand(S, p))} a week. Offer less and he might walk.${fee ? ` Fee: ${money(fee)}${loan ? ' (loan)' : ''}.` : ''}</p>
        ${stepper('owwage', wage, 1, k$)}<p class="muted center">Wage bill after: <b id="owbill"></b> (cap ${k$(L.cap * 1000)})</p>
        <div class="actions col"><button class="btn" data-go>Offer the contract</button><button class="btn ghost" data-close>Walk away</button></div>`);
      const show = () => { GM.$('#owwage', m.el).textContent = k$(wage); GM.$('#owbill', m.el).textContent = k$(E.wageBill(S) + wage); };
      show();
      GM.$('[data-dn="owwage"]', m.el).onclick = () => { wage = Math.max(1, wage - Math.max(1, Math.round(wage * 0.05))); show(); };
      GM.$('[data-up="owwage"]', m.el).onclick = () => { wage += Math.max(1, Math.round(wage * 0.05)); show(); };
      GM.$('[data-go]', m.el).onclick = () => {
        if (!E.terms(S, p, wage)) { m.close(); GM.sound.play('bad'); return GM.toast(`😤 ${esc(p.name)}’s agent walked out. Too cheap.`, 2600); }
        const r = E.sign(S, p.pk, fee, wage, loan);
        if (r === 'cap') { m.close(); return capFlow(p, fee, wage, loan); }
        if (r !== true) { m.close(); return GM.toast(r, 2600); }
        m.close(); save(); GM.sound.play('cash'); GM.buzz(40); GM.toast(`✍️ <b>${esc(p.name)}</b> signs!`, 2400); tab = 'squad'; hub();
      };
    }
    function capFlow(p, fee, wage, loan) {
      const m = GM.modal(`<h3>That breaks the wage cap</h3><p>The board’s wage cap is ${k$(L.cap * 1000)} a week. You could… ignore it. The league might notice.</p>
        <div class="actions col"><button class="btn" data-dodgy>🕵️ What wage cap? (+heat)</button><button class="btn ghost" data-close>Fine, I’ll sell someone</button></div>`);
      GM.$('[data-dodgy]', m.el).onclick = () => { S.ignoredCap = true; S.heat = Math.min(100, S.heat + 15); const r = E.sign(S, p.pk, fee, wage, loan); m.close(); save(); if (r === true) { GM.sound.play('cash'); GM.toast(`✍️ <b>${esc(p.name)}</b> signs. Shh.`); tab = 'squad'; } else GM.toast(r); hub(); };
    }
    function offerAction(n, act) {
      const o = S.offers[n]; if (!o) return;
      const i = S.squad.findIndex(x => x.k === o.k);
      if (act === 'no') { S.offers.splice(n, 1); const x = S.squad[i]; if (x && x.listed) x.mor = Math.max(0, x.mor - 5); save(); return hub(); }
      if (act === 'more') {
        const r = GM.rng(`${S.seed}|more|${o.k}|${S.week}`)();
        if (r < 0.5) { o.fee = Math.round(o.fee * 1.2 * 10) / 10; GM.toast(`${esc(o.club)} go up to ${money(o.fee)}`); } else { S.offers.splice(n, 1); GM.toast(`${esc(o.club)} walk away`); }
        save(); return hub();
      }
      if (E.sell(S, i, o.fee, o.club)) { GM.sound.play('cash'); save(); hub(); } else GM.toast(`You need at least ${E.SQUAD_MIN} players`);
    }

    /* ---- 💷 money */
    function moneyTab() {
      const led = Object.entries(S.ledger).sort((a, b) => b[1] - a[1]), sp = S.sponsor && E.SPONSORS[S.sponsor.id];
      const pts = S.cashLog, mx = Math.max(...pts, 1), mn = Math.min(...pts, 0), h = 70, w = 320, y = v => (h - 6 - (h - 12) * (v - mn) / Math.max(1, mx - mn)).toFixed(1);
      return `<div class="ow-cash"><small>Cash</small><b class="${S.cash < 0 ? 'neg' : ''}">${money(S.cash)}</b>
          ${pts.length > 1 ? `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="ow-chart"><path d="${pts.map((v, i) => (i ? 'L' : 'M') + (i * w / (pts.length - 1)).toFixed(1) + ' ' + y(v)).join(' ')}"/></svg>` : ''}</div>
        <div class="ow-facts"><div><small>Wage bill</small><b>${k$(E.wageBill(S))} a week</b>${bar(100 * E.wageBill(S) / (L.cap * 1000), E.wageBill(S) > L.cap * 1000 ? 'low' : 'ok')}<small>cap ${k$(L.cap * 1000)}${S.ignoredCap ? ' (ignored 🕵️)' : ''}</small></div>
          <div><small>TV money</small><b>${money(L.tv)} a week</b></div><div><small>Sponsor</small><b>${sp ? sp.icon + ' ' + esc(sp.name) : 'none yet'}</b></div></div>
        <h3 class="section-title">This season’s books</h3><div class="ow-ledger">${led.map(([k, v]) => `<div><span>${esc(k)}</span><b class="${v < 0 ? 'neg' : 'pos'}">${v < 0 ? '−' : '+'}${money(Math.abs(v)).slice(0)}</b></div>`).join('') || '<p class="muted">Nothing yet.</p>'}</div>
        <h3 class="section-title">🔥 Heat ${Math.round(S.heat)}/100</h3><p class="cb-hint">How closely the league is watching you. It cools a little every week. Above 50, investigations start: fines, then transfer embargoes, then points deductions (80+).</p>
        <h3 class="section-title">📣 Fans ${Math.round(S.fans)}/100</h3><p class="cb-hint">Wins, big signings and stunts please them; defeats, selling stars and greed don’t. Happy fans fill the ground (more gate money). At zero, they force you to sell.</p>`;
    }

    /* ---- 📊 the league */
    function leagueTab() {
      const T = E.table(S);
      return `<div class="cb-table ow-table"><div class="cb-tr head"><span>#</span><span>Club</span><span>P</span><span>GD</span><span>Pts</span></div>${T.map((t, i) => `<div class="cb-tr${t.you ? ' you' : ''}${i < 4 ? ' cb-top' : i >= 17 ? ' cb-drop' : ''}">
          <span>${i + 1}</span><span>${GM.clubChip(t.name)} ${esc(t.name)}</span><span>${t.w + t.d + t.l}</span><span>${t.gd > 0 ? '+' : ''}${t.gd}</span><b>${t.pts}${t.ded ? '*' : ''}</b></div>`).join('')}</div>
        <p class="cb-hint">Top four: Europe · bottom three: relegated${S.teams[0].ded ? ' · * points deducted' : ''}</p>
        <h3 class="section-title">🏆 The Cup</h3><div class="ow-cup">${E.CUP.names.map((n, r) => { const t = S.cup.ties.find(x => x.round === r); return `<div class="${t ? (t.through ? 'win' : 'lose') : r === S.cup.round && !S.cup.out ? 'next' : ''}"><small>${n} · wk ${E.CUP.weeks[r]}</small><b>${t ? `${esc(GM.clubShort(t.opp))} ${t.gf}–${t.ga}${t.pens !== undefined ? ` (${t.pens ? 'won' : 'lost'} pens)` : ''}` : r === S.cup.round && !S.cup.out && !S.cup.won ? 'Next' : '–'}</b></div>`; }).join('')}</div>
        <h3 class="section-title">Your results</h3><div class="ow-form wrap">${S.results.map(r => `<span class="ow-res ${r.res}" title="${esc(r.opp)}">${r.comp === 'cup' ? '🏆' : r.res}<small>${r.home ? 'v' : '@'} ${esc(GM.clubShort(r.opp))} ${r.gf}–${r.ga}</small></span>`).join('') || '<span class="muted">No games yet</span>'}</div>`;
    }

    /* ---------------------------------------------------------------- the match, live */
    let speed = 1, paused = false;
    const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
    function match() {
      const M = S.live;
      stopTimer();
      const draw = () => {
        if (!root.isConnected || !S.live || GM.dodgyOwner.run !== runId || !location.hash.startsWith('#/owner')) return stopTimer();
        const pos = Math.round(100 * M.poss[0] / Math.max(1, M.poss[0] + M.poss[1]));
        root.innerHTML = `${top()}
          <div class="ow-live"><div class="ow-board"><b>${esc(GM.clubShort(M.fx.home ? S.club : M.oppName))}</b><span>${M.fx.home ? M.gf : M.ga} – ${M.fx.home ? M.ga : M.gf}</span><b>${esc(GM.clubShort(M.fx.home ? M.oppName : S.club))}</b></div>
            <div class="ow-clock"><i class="rec"></i>${M.min}'${M.fx.comp === 'cup' ? ' · 🏆 ' + E.CUP.names[M.fx.round] : ''}</div>
            <div class="ow-poss"><i style="width:${pos}%"></i><span>${pos}% possession · shots ${M.shots[0]}–${M.shots[1]}</span></div>
            <div class="ow-feed">${M.ev.slice(-12).reverse().map(e => `<div class="ow-ev ${e.k}"><span>${e.m}'</span>${esc(e.t)}</div>`).join('') || '<div class="ow-ev"><span>0\'</span>Kick-off!</div>'}</div>
            <div class="ow-pitchmini">${M.xi.map((s, n) => { const x = s.i != null ? S.squad[s.i] : null; return x ? `<span class="${x.fit < 60 ? 'low' : x.fit < 75 ? 'mid' : ''}">${esc(shortName(P(x)))} ${Math.round(x.fit)}%${M.cards[s.i] === 1 ? ' 🟨' : ''}</span>` : '<span class="gone">—</span>'; }).join('')}</div>
            <div class="row ow-ctl"><button class="btn ghost" id="owpause">⏸ Changes</button><button class="btn ghost" id="owfast">${speed > 1 ? '▶ Normal' : '⏩ Faster'}</button><button class="btn ghost" id="owskip">⏭ Skip</button></div></div>`;
        GM.$('#owpause', root).onclick = () => { paused = true; changes(false); };
        GM.$('#owfast', root).onclick = () => { speed = speed > 1 ? 1 : 4; run(); draw(); };
        GM.$('#owskip', root).onclick = () => { stopTimer(); if (!M.htDone) { E.stepMatch(S, M, 45); draw(); return changes(true); } E.stepMatch(S, M, 90); finish(); };  // skip to half-time, then to the end
      };
      const tick = () => {
        if (GM.dodgyOwner.run !== runId || !location.hash.startsWith('#/owner')) return stopTimer();  // you've left: it carries on when you're back
        if (paused) return;
        const before = M.ev.length;
        E.stepMatch(S, M, M.min + 1);
        const fresh = M.ev.slice(before);
        fresh.forEach(e => GM.sound.play(e.k === 'goal' ? 'cheer' : e.k === 'conc' ? 'bad' : e.k === 'red' || e.k === 'card' ? 'whistle' : e.k === 'inj' ? 'ambulance' : e.k === 'chance' ? 'tap' : ''));
        if (fresh.some(e => e.k === 'goal')) GM.buzz(60);
        if (M.min % 10 === 0) save();
        draw();
        if (M.min === 45 && !M.htDone) { stopTimer(); save(); return changes(true); }
        if (M.done) { stopTimer(); setTimeout(finish, 800); }
      };
      const run = () => { stopTimer(); timer = setInterval(tick, 260 / speed); };
      draw();
      if (M.min === 45 && !M.htDone) return changes(true);
      if (M.done) return finish();
      GM.sound.play('whistle');
      run();
      // the half-time team talk, and subs and tactics at any time
      function changes(ht) {
        stopTimer();
        const bench = M.bench.filter(i => E.available(S.squad[i]) && !M.subbed.includes(i));
        let off = null;
        const m = GM.modal(`<h3>${ht ? `Half-time: ${M.gf}–${M.ga}` : `${M.min}': changes`}</h3>
          ${ht ? `<p class="muted">Your team talk (as the owner, obviously):</p><div class="ow-talks">${Object.entries(E.TALKS).map(([k, t]) => `<button class="btn small ghost" data-talk="${k}">${t.icon} ${t.name}</button>`).join('')}</div>` : ''}
          <p class="muted">Subs left: ${M.subs}. Tap a player to take off, then one to bring on.</p>
          <div class="ow-subs"><div>${M.xi.map((s, n) => s.i != null ? `<button class="ow-chip" data-off="${n}">${esc(shortName(P(S.squad[s.i])))} ${Math.round(S.squad[s.i].fit)}%</button>` : '').join('')}</div>
            <div>${bench.map(i => `<button class="ow-chip on" data-on="${i}">${esc(shortName(P(S.squad[i])))} ${E.ovr(P(S.squad[i]))}</button>`).join('') || '<span class="muted">Nobody left on the bench</span>'}</div></div>
          <div class="seg">${[['defend', '🛡️ Defend'], ['balanced', '⚖️ Balanced'], ['attack', '⚔️ Attack']].map(([k, l]) => `<button data-mm="${k}" class="${M.ment === k ? 'on' : ''}">${l}</button>`).join('')}</div>
          <button class="btn big" data-resume>${ht ? '▶ Second half' : '▶ Back to the game'}</button>`);
        const talks = GM.$$('[data-talk]', m.el);
        talks.forEach(b => b.onclick = () => { const v = E.halfTime(S, M, b.dataset.talk); talks.forEach(t => { t.disabled = true; }); b.classList.add('on'); GM.sound.play(v >= 2 ? 'cheer' : v < 0 ? 'bad' : 'tap'); GM.toast(esc(M.ev[M.ev.length - 1].t)); });
        GM.$$('[data-off]', m.el).forEach(b => b.onclick = () => { off = +b.dataset.off; GM.$$('[data-off]', m.el).forEach(x => x.classList.toggle('pick', x === b)); });
        GM.$$('[data-on]', m.el).forEach(b => b.onclick = () => {
          if (off == null) return GM.toast('Pick who comes off first');
          if (!M.subs) return GM.toast('No subs left');
          E.sub(S, M, M.xi[off], +b.dataset.on); m.close(); changes(ht);
        });
        GM.$$('[data-mm]', m.el).forEach(b => b.onclick = () => { M.ment = b.dataset.mm; GM.$$('[data-mm]', m.el).forEach(x => x.classList.toggle('on', x === b)); });
        GM.$('[data-resume]', m.el).onclick = () => {
          if (ht && !M.talkName) E.halfTime(S, M, 'coach');
          if (ht) M.htDone = true;
          paused = false; m.close(); save(); draw(); run();
        };
      }
      function finish() {
        stopTimer();
        const res = E.endMatch(S, M); save();
        GM.sound.play('fulltime');
        setTimeout(() => GM.sound.play(res.res === 'W' ? 'cheer' : res.res === 'L' ? 'boo' : 'good'), 900);
        root.innerHTML = `${top()}<div class="cb-score ${res.res}"><span class="kicker">Full time${res.comp === 'cup' ? ' · 🏆 ' + E.CUP.names[res.round] : ''}</span>
            <div class="cb-sl"><b>${esc(GM.clubShort(res.home ? S.club : res.opp))}</b><span>${res.home ? res.gf : res.ga} – ${res.home ? res.ga : res.gf}</span><b>${esc(GM.clubShort(res.home ? res.opp : S.club))}</b></div>
            ${res.pens !== undefined ? `<small>${res.pens ? 'Through on penalties!' : 'Out on penalties'}</small>` : ''}
            <b class="cb-res">${res.res === 'W' ? '✅ WIN' : res.res === 'D' ? '🤝 DRAW' : '❌ DEFEAT'}${res.money ? ` · +${money(res.money)}` : ''}</b></div>
          <p class="center muted">${res.poss}% possession · shots ${res.shots[0]}–${res.shots[1]}</p>
          <h3 class="section-title">Ratings</h3>${ratingsHtml(res)}
          <div class="actions col"><button class="btn big" id="owback">Back to the club</button></div>`;
        GM.$('#owback', root).onclick = () => { tab = 'home'; hub(); window.scrollTo(0, 0); };
      }
    }

    /* ---------------------------------------------------------------- the end */
    async function end() {
      if (S.recorded) return fullTime(true);
      S.recorded = true; save();  // once only, however the season ended
      const score = E.scoreOf(S), pos = E.position(S), isBest = score > GM.best(key);
      GM.sound.play('fulltime');
      if (S.over === 'fans') setTimeout(() => GM.sound.play('boo'), 1200);
      else if (pos === 1) setTimeout(() => GM.sound.play('fanfare'), 1200);
      else if (pos <= L.target) setTimeout(() => GM.sound.play('cheer'), 1200);
      fullTime(false, isBest);
      GM.checkGame('owner', score, { pos, unbeaten: !S.teams[0].l && S.over === 'done', cup: S.cup.won, heat: S.heat, ded: S.teams[0].ded, sacked: S.over === 'fans', lv });
      await GM.recordScore(key, score, { t: S.teams[0].p - S.teams[0].ded, pos });
    }
    function fullTime(seen, isBest) {
      stopTimer();
      const pos = E.position(S), t = S.teams[0], ok = pos <= L.target, pts = t.p - t.ded;
      const V = S.over === 'fans' ? ['📣', 'Forced out', 'The supporters’ trust has bought the club off you. They’re singing in the streets.']
        : pos === 1 ? ['🏆', 'CHAMPIONS!', 'Nobody saw it coming. Least of all the league’s investigators.'] : pos <= 4 ? ['🌟', 'Into Europe', 'Next season: Tuesday nights in faraway places.']
        : ok ? ['👍', 'Job done', `The fans wanted ${L.target === 10 ? 'the top half' : 'survival'}, and got it.`] : pos >= 18 ? ['💀', 'Relegated', 'Down you go. At least the car park’s yours.'] : ['😐', 'Mid-table mediocrity', 'Not quite what the fans had in mind.'];
      const scorers = S.squad.filter(x => x.gl).sort((a, b) => b.gl - a.gl), best = S.squad.filter(x => x.rt.length >= 5).map(x => ({ x, a: x.rt.reduce((s, v) => s + v, 0) / x.rt.length })).sort((a, b) => b.a - a.a)[0];
      const txt = `🕴️ Goal Machine – ${title}: ${GM.clubShort(S.club)} finished ${E.ord(pos)} with ${pts} points${S.cup.won ? ' and won the Cup 🏆' : ''}. Heat ${Math.round(S.heat)} 🔥 ${V[0]}`;
      root.innerHTML = `${top()}<div class="cb-final ${ok ? 'ok' : 'bad'}">
        <span class="kicker">The end of the season · ${esc(S.club)}</span>
        <div class="cb-verdict"><span>${V[0]}</span><b>${V[1]}</b><small>${V[2]}</small></div>
        <div class="result"><div class="result-score"><span>${E.ord(pos)}</span><small>${pts} point${pts === 1 ? '' : 's'} · W${t.w} D${t.d} L${t.l}${t.ded ? ` · −${t.ded} deducted` : ''}</small></div>
          ${isBest ? '<div class="banner">🏆 New personal best!</div>' : ''}
          <div class="ow-facts"><div><small>🏆 Cup</small><b>${S.cup.won ? 'WINNERS' : S.cup.ties.length ? E.CUP.names[Math.min(4, S.cup.ties.length - 1)] : '–'}</b></div><div><small>💷 Cash</small><b>${money(S.cash)}</b></div><div><small>🔥 Heat</small><b>${Math.round(S.heat)}</b></div><div><small>📣 Fans</small><b>${Math.round(S.fans)}</b></div></div>
          ${scorers[0] ? `<div class="mb-deal good">${GM.avatar(P(scorers[0]), '', plain)}<span><small>⚽ Top scorer</small><b>${esc(P(scorers[0]).name)}</b><i>${scorers[0].gl} goals</i></span></div>` : ''}
          ${best ? `<div class="mb-deal good">${GM.avatar(P(best.x), '', plain)}<span><small>⭐ Player of the season</small><b>${esc(P(best.x).name)}</b><i>average rating ${best.a.toFixed(1)}</i></span></div>` : ''}
          <details class="set cb-tablebox"><summary><span>📊 The final table</span></summary>${leagueTab()}</details>
          <div class="actions col"><a class="btn big" href="#/owner?new=1">🔁 Buy another club</a>
            <button class="btn ghost" id="owshare">📤 Share</button><a class="btn ghost" href="#/leaderboard?m=${encodeURIComponent(key)}">🏆 Leaderboard</a></div></div></div>`;
      window.scrollTo(0, 0);
      GM.$('#owshare', root).onclick = () => GM.share(txt, GM.baseUrl() + '#/owner');
    }

    // start here (at the bottom, so everything above is declared before any screen draws)
    if (!S || q.new) return intro();
    if (S.live) return match();
    if (S.over) return S.recorded ? fullTime(true) : end();
    return hub();
  };
})();

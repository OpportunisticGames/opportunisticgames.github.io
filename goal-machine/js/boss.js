/* Goal Machine – 📋 Club Boss: take over a club for a season and turn a mid-table XI into a winning one.
   You get a full XI (4-4-2), a budget and a manager. A 10-club league, 9 matchweeks; your score is your points.
   Every player has an OVR (out of 100, from what he really did in the PL: the same "worth" Moneyball uses, as a
   percentile of the 50+ app players). Results come mostly from team strength (the XI's average OVR, plus the
   manager), so a better team wins more. Each match rates every player; good games push his value up, bad ones down.
   Transfers are swaps in the same position (sell one, buy one) from a market that changes every week, so you always
   have 11 and selling pays for buying. A bargain is a player who's better than his price: show-and-tell on Normal (OVR
   and price side by side), form only on Hard. Managers have perks; sack one (it costs compensation) for a bounce.
   🙂 Normal: a mid-table squad, aim for the top half · 🥵 Hard: a weaker squad, names and positions only, market OVR
   hidden (judge by form) · ⚡ Extreme: every PL player, an obscure squad. Boards: boss, bossh, bossx (points). */
'use strict';

(function () {
  const WEEKS = 9, SWAPS = 2, FEE = 0.1, YOUTH = 50;
  const SHAPE = [['F', 2], ['M', 4], ['D', 4], ['G', 1]];  // 4-4-2, top to bottom
  const GROUP_NAME = { G: 'Goalkeepers', D: 'Defenders', M: 'Midfielders', F: 'Forwards' };
  const AI = [85, 82, 79, 77, 75, 73, 71, 69, 66];  // the other nine clubs' strengths
  const LEVEL = {
    normal: { band: [63, 73], cash: 40, target: 5, sack: 4 },
    hard: { band: [60, 68], cash: 32, target: 7, sack: 6 },
    extreme: { band: [56, 66], cash: 38, target: 7, sack: 6, ai: -5 },  // a league of lesser-known players too
  };
  const BIG = ['Manchester City', 'Arsenal', 'Liverpool', 'Chelsea', 'Manchester United', 'Tottenham Hotspur'];
  const esc = GM.esc, byPk = k => GM.anyByPk(k);
  const money = m => (m < 0 ? '−' : '') + '£' + (Math.round(Math.abs(m) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'm';
  const r1 = x => Math.round(x * 10) / 10;
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const shortName = p => { const w = p.name.split(' '); return w.length > 1 ? w.slice(-1)[0] : p.name; };

  /* ---------------------------------------------------------------- ratings and prices */
  // OVR: where his worth sits among the 50+ app players, 55–92; players below them all (Extreme) go down to 45
  let W = null;
  function ovr(p) {
    if (!W) W = GM.players.map(GM.mbWorth).sort((a, b) => a - b);
    const w = GM.mbWorth(p);
    if (w <= W[0]) return Math.max(45, Math.round(45 + 10 * w / W[0]));
    let lo = 0, hi = W.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (W[mid] <= w) lo = mid; else hi = mid - 1; }
    return Math.round(55 + 37 * Math.pow(lo / (W.length - 1), 1.15));
  }
  // what the market thinks an OVR is worth; values drift towards it as people notice
  const fair = o => 11 * Math.exp((o - 60) / 21);
  // the asking price: his reputation (GM.market.price, seeded by the week), so the ones better than their name are cheap
  const ask = (p, seed, week, perks) => r1(Math.max(1, GM.market.price(p, `${seed}|w${week}`)) * (perks.dealer ? 0.85 : 1));

  /* ---------------------------------------------------------------- managers */
  const MANAGERS = {
    prof: { icon: '🧠', name: 'The Professor', perk: 'Tactics: your team plays 3 OVR better' },
    dealer: { icon: '🤝', name: 'The Wheeler-Dealer', perk: 'Signings 15% cheaper, and no agent’s fee when you sell' },
    youth: { icon: '🌱', name: 'The Youth Guru', perk: 'Players who debuted in 2015 or later play 4 better, and their values rise faster' },
    motivator: { icon: '📣', name: 'The Motivator', perk: 'After a game you didn’t win, the team plays 6 better' },
    bus: { icon: '🚌', name: 'The Bus Driver', perk: 'Parks the bus: you concede a third fewer, but score a bit less' },
    gambler: { icon: '🎲', name: 'The Gambler', perk: 'All-out attack: you score a third more, and concede more too' },
    scout: { icon: '🔍', name: 'The Super Scout', perk: 'Nine players a position on the market, and a third transfer every week' },
  };

  /* ---------------------------------------------------------------- the league */
  function poisson(r, l) { let k = 0, p = Math.exp(-l), s = p; const u = r(); while (u > s && k < 9) { k++; p *= l / k; s += p; } return k; }
  // expected goals for a side of strength a against b (with home advantage)
  const xg = (a, b) => 1.35 * Math.exp((a - b) / 16);
  // a round robin: 10 clubs, 9 rounds (circle method); club 0 is you
  function schedule(n) {
    const ids = [...Array(n).keys()], rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const ps = [];
      for (let i = 0; i < n / 2; i++) { const a = ids[i], b = ids[n - 1 - i]; ps.push((r + i) % 2 ? [b, a] : [a, b]); }
      rounds.push(ps);
      ids.splice(1, 0, ids.pop());
    }
    return rounds;
  }
  function winChance(a, b) {
    const pa = [], pb = [], f = (l, k) => Math.exp(-l) * Math.pow(l, k) / [1, 1, 2, 6, 24, 120, 720, 5040, 40320][k];
    for (let k = 0; k < 9; k++) { pa.push(f(xg(a, b), k)); pb.push(f(xg(b, a), k)); }
    let w = 0, d = 0;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { if (i > j) w += pa[i] * pb[j]; else if (i === j) d += pa[i] * pb[j]; }
    return { w, d, l: Math.max(0, 1 - w - d) };
  }

  /* ---------------------------------------------------------------- a season (pure: no DOM, so the tests can play it) */
  function newSeason(seed, lv, mgr) {
    const L = LEVEL[lv], pool = lv === 'extreme' ? (GM.allPlayers || GM.players) : GM.players, r = GM.rng(seed + '|start');
    const clubsNow = [...new Set((GM.fixtures ? GM.fixtures() : []).flatMap(f => [f.home, f.away]))];
    const names = (clubsNow.length >= 12 ? clubsNow : GM.clubs).slice();
    const mine = GM.favClub() && names.includes(GM.favClub()) ? GM.favClub() : r.pick(names.filter(c => !BIG.includes(c)));
    const rivals = r.shuffle(names.filter(c => c !== mine)).slice(0, 9).sort((a, b) => (BIG.indexOf(b) >= 0) - (BIG.indexOf(a) >= 0));
    const used = new Set(), xi = [];
    SHAPE.slice().reverse().forEach(([g, n]) => {
      const cands = r.shuffle(pool.filter(p => p.pos === g && !used.has(p.pk) && ovr(p) >= L.band[0] && ovr(p) <= L.band[1]));
      for (let i = 0; i < n; i++) { const p = cands[i]; used.add(p.pk); xi.push({ k: p.pk, g, paid: 0, value: r1(fair(ovr(p)) * (0.85 + 0.3 * r())), hist: [], out: 0 }); }
    });
    const S = { seed, lv, week: 1, cash: L.cash, club: mine, mgr, swaps: 0, bounce: 0, lost: false, phase: 'market', sacked: 0,
      teams: [{ name: mine, you: true }].concat(rivals.map((c, i) => ({ name: c, str: AI[i] + (L.ai || 0) }))).map(t => Object.assign(t, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 })),
      xi, signed: [], results: [] };
    S.market = makeMarket(S);
    return S;
  }
  const perksOf = S => ({ [S.mgr]: true });
  const playerOvr = (S, x) => { const p = byPk(x.k); return ovr(p) + (S.mgr === 'youth' && p.first >= 2015 ? 4 : 0); };
  // your strength: the XI's average OVR (an injured player's place goes to a youth-teamer), plus the manager
  function strength(S) {
    const avg = S.xi.reduce((t, x) => t + (x.out ? YOUTH : playerOvr(S, x)), 0) / S.xi.length;
    return avg + (S.mgr === 'prof' ? 3 : 0) + (S.mgr === 'motivator' && S.lost ? 6 : 0) + (S.bounce ? 4 : 0);
  }
  const teamOvr = S => Math.round(S.xi.reduce((t, x) => t + playerOvr(S, x), 0) / S.xi.length);
  function makeMarket(S) {
    const pool = S.lv === 'extreme' ? (GM.allPlayers || GM.players) : GM.players, r = GM.rng(`${S.seed}|mk${S.week}`), owned = new Set(S.xi.map(x => x.k));
    const n = S.mgr === 'scout' ? 9 : 6, base = teamOvr(S), out = {};
    SHAPE.forEach(([g]) => {
      const c = r.shuffle(pool.filter(p => p.pos === g && !owned.has(p.pk) && Math.abs(ovr(p) - base - 6) <= 14)).slice(0, n);
      out[g] = c.map(p => ({ k: p.pk, ask: ask(p, S.seed, S.week, perksOf(S)) })).sort((a, b) => b.ask - a.ask);
    });
    return out;
  }
  // a player's form: his last three match ratings (yours are real; the market's are how he's doing elsewhere)
  function rating(p, o, seed, week, extra = 0) {
    const r = GM.rng(`${seed}|rt${week}|${p.pk}`);
    return Math.max(3, Math.min(10, r1(6.3 + (o - 72) / 12 + extra + (r() - 0.5) * 1.4)));
  }
  const formOf = (S, p) => [3, 2, 1].map(k => rating(p, ovr(p), S.seed + '|away', S.week - k));
  function swap(S, outI, g, mi) {
    const o = S.market[g][mi], x = S.xi[outI], got = r1(x.value * (S.mgr === 'dealer' ? 1 : 1 - FEE) * (x.out ? 0.8 : 1));
    if (!o || x.g !== g || S.swaps >= swapsAllowed(S) || S.cash + got < o.ask) return false;
    const p = byPk(o.k);
    S.cash = r1(S.cash + got - o.ask);
    S.signed.push({ k: o.k, paid: o.ask, out: x.k, outGot: got, week: S.week });
    S.xi[outI] = { k: o.k, g, paid: o.ask, value: o.ask, hist: [], out: 0, new: true };
    S.market[g].splice(mi, 1);
    S.market[g].push({ k: x.k, ask: r1(ask(byPk(x.k), S.seed, S.week, perksOf(S)) * 1.1) });  // your old player turns up on the market
    S.swaps++;
    return p;
  }
  const swapsAllowed = S => SWAPS + (S.mgr === 'scout' ? 1 : 0);
  // play the matchweek: your match (with who scored and every rating), and the rest of the league's
  function playWeek(S) {
    const rounds = schedule(10), rnd = rounds[S.week - 1], r = GM.rng(`${S.seed}|m${S.week}`), me = strength(S);
    const str = i => (i === 0 ? me : S.teams[i].str);
    let mine = null;
    rnd.forEach(([h, a]) => {
      let lh = xg(str(h) + 2, str(a)), la = xg(str(a), str(h) + 2);
      const youH = h === 0, youA = a === 0;
      if (youH || youA) {
        const k = S.mgr === 'bus' ? [0.85, 0.67] : S.mgr === 'gambler' ? [1.33, 1.2] : [1, 1];  // [yours, theirs]
        if (youH) { lh *= k[0]; la *= k[1]; } else { la *= k[0]; lh *= k[1]; }
      }
      const gh = poisson(r, lh), ga = poisson(r, la), H = S.teams[h], A = S.teams[a];
      H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
      if (gh > ga) { H.w++; H.p += 3; A.l++; } else if (gh < ga) { A.w++; A.p += 3; H.l++; } else { H.d++; A.d++; H.p++; A.p++; }
      if (youH || youA) mine = { home: youH, opp: youH ? a : h, gf: youH ? gh : ga, ga: youH ? ga : gh };
    });
    // who scored, who set it up, and every rating
    const res = mine.gf > mine.ga ? 'W' : mine.gf < mine.ga ? 'L' : 'D', pr = GM.rng(`${S.seed}|ev${S.week}`), ev = S.xi.map(() => ({ g: 0, a: 0 }));
    const fit = S.xi.map((x, i) => i).filter(i => !S.xi[i].out);
    const gw = i => { const p = byPk(S.xi[i].k); return { F: 3, M: 1.4, D: 0.5, G: 0 }[S.xi[i].g] * (p.goals / Math.max(1, p.apps)) + { F: 0.06, M: 0.03, D: 0.012, G: 0 }[S.xi[i].g]; };
    const aw = i => { const p = byPk(S.xi[i].k); return p.ast / Math.max(1, p.apps) + 0.01; };
    const goals = [];
    for (let k = 0; k < mine.gf; k++) {
      if (!fit.length) break;
      const s = pr.weighted(fit, gw); ev[s].g++;
      const as = pr() < 0.72 ? pr.weighted(fit.filter(i => i !== s), aw) : null; if (as != null) ev[as].a++;
      goals.push({ m: 1 + pr.int(90), s, a: as });
    }
    goals.sort((a, b) => a.m - b.m);
    const rows = S.xi.map((x, i) => {
      const p = byPk(x.k);
      if (x.out) { x.out--; x.hist.push(null); return { i, out: true }; }
      const cs = mine.ga === 0 && (x.g === 'D' || x.g === 'G');
      const extra = (res === 'W' ? 0.5 : res === 'L' ? -0.5 : 0) + ev[i].g * 1.2 + ev[i].a * 0.8 + (cs ? 1 : 0) - ((x.g === 'D' || x.g === 'G') ? 0.25 * mine.ga : 0);
      const rt = rating(p, playerOvr(S, x), S.seed, S.week, extra), was = x.value;
      x.value = r1(Math.max(0.5, x.value * (1 + (rt - 6.5) * 0.035 * (S.mgr === 'youth' && p.first >= 2015 ? 1.5 : 1))));
      x.value = r1(x.value + (fair(ovr(p)) - x.value) * 0.08);
      x.hist.push(rt); x.new = false;
      let inj = 0; if (pr() < 0.04) { inj = 1 + pr.int(3); x.out = inj; }
      return { i, rt, g: ev[i].g, a: ev[i].a, cs, inj, dv: x.value - was };
    });
    S.lost = res !== 'W'; S.bounce = 0;
    const out = { week: S.week, ...mine, res, goals, rows };
    S.results.push(out);
    S.phase = 'result';
    return out;
  }
  function nextWeek(S) {
    if (S.week >= WEEKS) { S.phase = 'over'; return; }
    S.week++; S.swaps = 0; S.phase = 'market';
    S.market = makeMarket(S);
  }
  const table = S => S.teams.map((t, i) => ({ ...t, i, gd: t.gf - t.ga })).sort((a, b) => b.p - a.p || b.gd - a.gd || b.gf - a.gf);
  const position = S => table(S).findIndex(t => t.you) + 1;
  const scoreOf = S => { const t = S.teams[0]; return t.p * 100 + Math.max(0, Math.min(99, t.gf - t.ga + 50)); };
  GM.bossCore = { newSeason, playWeek, nextWeek, swap, strength, teamOvr, ovr, table, position, scoreOf, winChance, MANAGERS, LEVEL, WEEKS, schedule };

  /* ---------------------------------------------------------------- the screens */
  GM.clubBoss = function (root, q = {}) {
    const lv = GM.level();
    if (lv === 'extreme' && !GM.allPlayers) {
      root.innerHTML = `<div class="loading-all"><div class="splash-bar"><i></i></div><p class="muted">Loading every Premier League player…</p></div>`;
      GM.loadAll().then(() => GM.clubBoss(root, q)).catch(() => { root.innerHTML += '<p class="center">Couldn’t load the player list.</p>'; });
      return;
    }
    const key = lv === 'hard' ? 'bossh' : lv === 'extreme' ? 'bossx' : 'boss', L = LEVEL[lv], SAVE = 'boss:save:' + key;
    const title = 'Club Boss' + (lv === 'hard' ? ' · Hard' : lv === 'extreme' ? ' · Extreme' : '');
    const top = () => `<div class="topbar"><a href="#/" class="back">‹</a><h2>📋 ${title}</h2>${GM.lbButton(key)}</div>`;
    let S = GM.store.get(SAVE, null);
    const save = () => GM.store.set(SAVE, S);
    const hideOvr = lv === 'hard';  // Hard: the market shows form, not OVR
    const ovrBadge = o => `<span class="cb-ovr ${o >= 80 ? 'hi' : o >= 70 ? 'mid' : 'lo'}">${o}</span>`;
    const pill = v => (v == null ? '<i class="cb-f na">–</i>' : `<i class="cb-f ${v >= 7.5 ? 'hot' : v >= 6.5 ? 'ok' : 'cold'}">${v.toFixed(1)}</i>`);
    const info = p => lv === 'hard' ? GM.posBadges(p) : `${GM.posBadges(p)} ${GM.flag(p.nat)} <small>${GM.era(p)}</small>`;

    const sale = x => r1(x.value * (S.mgr === 'dealer' ? 1 : 1 - FEE) * (x.out ? 0.8 : 1));
    let tab = null, picking = null;  // the market's position tab; the player you're replacing (declared before the screens draw)
    if (!S || q.new) return intro();
    if (S.phase === 'over') return fullTime(true);
    if (S.phase === 'result') return result(S.results[S.results.length - 1]);
    return board();

    function intro() {
      const seed = GM.newSeed(), offer = GM.rng(seed + '|mgr').shuffle(Object.keys(MANAGERS)).slice(0, 3);
      root.innerHTML = `${top()}<div class="cb-intro">
        <div class="cb-hero">📋</div><h3>Take over a club for a season</h3>
        <p>You’ve got a <b>mid-table XI</b>, <b>${money(L.cash)}</b> to spend and a 10-club league. Nine matchweeks. Your score is your <b>points</b>.</p>
        <ul class="how-list"><li>⭐ Every player has an <b>OVR</b> from what he really did in the PL. Your team’s strength is its average.</li>
          <li>🔁 <b>${SWAPS} transfers a week</b>: swap a player for one in the same position. Selling pays for buying.</li>
          <li>💎 Bargains are players <b>better than their price</b>. Good games push values up, so you can sell high.</li>
          <li>🎯 The board wants <b>${L.target === 5 ? 'a top-half finish' : 'you to stay out of the bottom three'}</b>.</li></ul>
        ${lv === 'hard' ? '<p class="muted">🥵 Hard: a weaker squad, names and positions only, and the market shows form, not OVR.</p>' : lv === 'extreme' ? '<p class="muted">⚡ Extreme: every PL player, and a squad of unknowns.</p>' : ''}
        <h3 class="section-title">Pick your manager</h3>
        <div class="cb-mgrs">${offer.map(m => `<button class="cb-mgr" data-mgr="${m}"><span>${MANAGERS[m].icon}</span><b>${MANAGERS[m].name}</b><small>${MANAGERS[m].perk}</small></button>`).join('')}</div>
        ${GM.store.get(SAVE, null) ? '<p class="muted center">Starting again replaces the season you’re in.</p>' : ''}</div>`;
      GM.$$('[data-mgr]', root).forEach(b => b.onclick = () => {
        S = newSeason(seed, lv, b.dataset.mgr); save();
        GM.sound.play('whistle'); GM.buzz(30);
        if (q.new) history.replaceState(null, '', '#/boss');
        board();
      });
    }

    /* ---- the club: next match, the XI on a pitch, the market */
    function board() {
      const pos = position(S), me = strength(S), nx = schedule(10)[S.week - 1].find(m => m.includes(0)), oppI = nx[0] === 0 ? nx[1] : nx[0], home = nx[0] === 0;
      const opp = S.teams[oppI], ch = winChance(me + (home ? 2 : 0), opp.str + (home ? 0 : 2)), M = MANAGERS[S.mgr];
      const left = swapsAllowed(S) - S.swaps;
      tab = tab || (picking != null ? S.xi[picking].g : 'F');
      root.innerHTML = `${top()}
        <div class="cb-hud"><span class="cb-club">${GM.clubChip(S.club, true)}</span>
          <div class="cb-stats"><div><small>Week</small><b>${S.week}/${WEEKS}</b></div><div><small>Position</small><b>${S.results.length ? ord(pos) : '–'}</b></div><div><small>Points</small><b>${S.teams[0].p}</b></div><div><small>💷 Budget</small><b>${money(S.cash)}</b></div></div></div>
        <div class="cb-next"><span class="kicker">Matchweek ${S.week} · ${home ? 'home' : 'away'}</span>
          <div class="cb-vs"><div><b>${esc(GM.clubShort(S.club))}</b>${ovrBadge(Math.round(me))}</div><span>v</span><div><b>${esc(GM.clubShort(opp.name))}</b>${ovrBadge(opp.str)}</div></div>
          <div class="cb-odds"><i class="w" style="width:${ch.w * 100}%">${Math.round(ch.w * 100)}% win</i><i class="d" style="width:${ch.d * 100}%">${ch.d > 0.15 ? Math.round(ch.d * 100) + '%' : ''}</i><i class="l" style="width:${ch.l * 100}%">${ch.l > 0.12 ? Math.round(ch.l * 100) + '%' : ''}</i></div>
          <small class="muted">${esc(opp.name)}, ${ord(table(S).findIndex(t => t.i === oppI) + 1)}${S.bounce ? ' · 📈 new manager bounce (+4)' : S.mgr === 'motivator' && S.lost ? ' · 📣 fired up (+6)' : ''}</small></div>
        <div class="cb-mgrbar"><span>${M.icon}</span><span><b>${M.name}</b><small>${M.perk}</small></span>${S.week > 1 ? `<button class="btn small ghost" id="cbsack">Sack (${money(L.sack)})</button>` : ''}</div>
        <h3 class="section-title">Your XI</h3><p class="cb-hint">Tap a player to replace him · <b>${left} transfer${left === 1 ? '' : 's'} left</b> this week</p>
        <div class="cb-pitch">${SHAPE.map(([g]) => `<div class="cb-line">${S.xi.map((x, i) => [x, i]).filter(([x]) => x.g === g).map(([x, i]) => {
          const p = byPk(x.k), last = x.hist.filter(v => v != null).slice(-1)[0];
          return `<button class="cb-man${picking === i ? ' pick' : ''}${x.out ? ' hurt' : ''}${x.new ? ' new' : ''}" data-man="${i}">${GM.avatar(p, '', lv === 'hard')}${ovrBadge(playerOvr(S, x))}
            <b>${esc(shortName(p))}</b><small>${x.out ? `🚑 ${x.out}w` : last != null ? '⭐ ' + last.toFixed(1) : money(x.value)}</small></button>`; }).join('')}</div>`).join('')}</div>
        <div class="cb-ovrline">Team OVR <b>${teamOvr(S)}</b> · squad value <b>${money(S.xi.reduce((t, x) => t + x.value, 0))}</b></div>
        <h3 class="section-title">🛒 Transfer market</h3>
        <div class="seg cb-tabs">${SHAPE.slice().reverse().map(([g]) => `<button data-tab="${g}" class="${g === tab ? 'on' : ''}">${GROUP_NAME[g]}</button>`).join('')}</div>
        ${picking != null ? `<div class="cb-picking">Replacing <b>${esc(byPk(S.xi[picking].k).name)}</b> (sells for ${money(sale(S.xi[picking]))}) <button class="link" id="cbunpick">cancel</button></div>` : ''}
        <div class="cb-market">${S.market[tab].map((o, mi) => {
          const p = byPk(o.k), o2 = ovr(p), form = formOf(S, p);
          return `<button class="cb-row" data-buy="${mi}">${GM.avatar(p, '', lv === 'hard')}<span class="cb-who"><b>${esc(p.name)}</b><span>${info(p)}</span><span class="cb-form">${form.map(pill).join('')}</span></span>
            ${hideOvr ? '<span class="cb-ovr q">?</span>' : ovrBadge(o2)}<span class="cb-price">${money(o.ask)}</span></button>`; }).join('')}</div>
        <div class="actions col"><button class="btn big" id="cbplay">⚽ Play matchweek ${S.week}</button></div>
        <details class="set cb-tablebox"><summary><span>📊 The table</span></summary>${tableHtml()}</details>`;
      GM.$$('[data-man]', root).forEach(b => b.onclick = () => { const i = +b.dataset.man; picking = picking === i ? null : i; tab = S.xi[i].g; board(); GM.sound.play('tap'); });
      GM.$$('[data-tab]', root).forEach(b => b.onclick = () => { tab = b.dataset.tab; if (picking != null && S.xi[picking].g !== tab) picking = null; board(); });
      const un = GM.$('#cbunpick', root); if (un) un.onclick = () => { picking = null; board(); };
      GM.$$('[data-buy]', root).forEach(b => b.onclick = () => buy(+b.dataset.buy));
      const sk = GM.$('#cbsack', root); if (sk) sk.onclick = sack;
      GM.$('#cbplay', root).onclick = play;
    }

    // signing someone: who makes way? (the player you tapped, or choose from that position)
    function buy(mi) {
      const o = S.market[tab][mi], p = byPk(o.k);
      if (S.swaps >= swapsAllowed(S)) return GM.toast('No transfers left this week');
      const outs = S.xi.map((x, i) => [x, i]).filter(([x]) => x.g === tab);
      const go = i => {
        const x = S.xi[i], q = byPk(x.k);
        if (S.cash + sale(x) < o.ask) return GM.toast(`Can’t afford him: you’d be ${money(o.ask - S.cash - sale(x))} short`);
        swap(S, i, tab, mi); save(); picking = null;
        GM.sound.play('cash'); GM.buzz(30);
        GM.toast(`✍️ <b>${esc(p.name)}</b> signs for ${money(o.ask)} · ${esc(q.name)} leaves for ${money(S.signed[S.signed.length - 1].outGot)}`, 2800);
        board();
      };
      if (picking != null && S.xi[picking].g === tab) return go(picking);
      const m = GM.modal(`<h3>Sign ${esc(p.name)} for ${money(o.ask)}?</h3><p class="muted">Who makes way? You have ${money(S.cash)}.</p>
        <div class="cb-outs">${outs.map(([x, i]) => { const q = byPk(x.k), after = S.cash + sale(x) - o.ask;
          return `<button class="cb-out" data-out="${i}" ${after < 0 ? 'disabled' : ''}>${GM.avatar(q, '', lv === 'hard')}<span><b>${esc(q.name)}</b><small>sells for ${money(sale(x))}${x.out ? ' (injured)' : ''}</small></span>${ovrBadge(playerOvr(S, x))}<em>${after < 0 ? 'can’t afford' : '→ ' + money(after)}</em></button>`; }).join('')}</div>
        <button class="btn ghost" data-close>Not now</button>`);
      GM.$$('[data-out]', m.el).forEach(b => b.onclick = () => { m.close(); go(+b.dataset.out); });
    }
    async function sack() {
      if (S.cash < L.sack) return GM.toast(`The compensation’s ${money(L.sack)}: you can’t afford to sack him`);
      if (!await GM.confirm(`Sack ${MANAGERS[S.mgr].name}? It costs ${money(L.sack)} in compensation, and the new one gets a bounce (+4 next game).`, '📣 Sack him', 'Keep him')) return;
      const offer = GM.rng(`${S.seed}|sack${S.week}|${S.sacked}`).shuffle(Object.keys(MANAGERS).filter(k => k !== S.mgr)).slice(0, 3);
      const m = GM.modal(`<h3>Who’s the new manager?</h3><div class="cb-mgrs">${offer.map(k => `<button class="cb-mgr" data-mgr="${k}"><span>${MANAGERS[k].icon}</span><b>${MANAGERS[k].name}</b><small>${MANAGERS[k].perk}</small></button>`).join('')}</div>`);
      GM.$$('[data-mgr]', m.el).forEach(b => b.onclick = () => {
        S.cash = r1(S.cash - L.sack); S.mgr = b.dataset.mgr; S.bounce = 1; S.sacked++; save(); m.close();
        GM.sound.play('sacked'); GM.buzz(60); board();
      });
    }

    /* ---- the match */
    function play() {
      if (S.phase !== 'market') return;
      const res = playWeek(S); save();
      result(res, true);
    }
    function result(res, live) {
      const opp = S.teams[res.opp], me = GM.clubShort(S.club), them = GM.clubShort(opp.name), pos = position(S);
      const name = i => esc(shortName(byPk(S.xi[i] ? S.xi[i].k : '') || { name: '?' }));
      const rows = res.rows.filter(x => !x.out).sort((a, b) => b.rt - a.rt), motm = rows[0];
      const others = schedule(10)[res.week - 1].filter(m => !m.includes(0));
      root.innerHTML = `${top()}
        <div class="cb-score ${res.res}"><span class="kicker">Matchweek ${res.week} · full time</span>
          <div class="cb-sl"><b>${esc(res.home ? me : them)}</b><span>${res.home ? res.gf : res.ga} – ${res.home ? res.ga : res.gf}</span><b>${esc(res.home ? them : me)}</b></div>
          <div class="cb-goals">${res.goals.map((g, k) => `<span style="--d:${k * 0.35}s">⚽ ${g.m}' ${name(g.s)}${g.a != null ? ` <small>(${name(g.a)})</small>` : ''}</span>`).join('') || '<span class="muted">No goals for you</span>'}</div>
          <b class="cb-res">${res.res === 'W' ? '✅ WIN · +3' : res.res === 'D' ? '🤝 DRAW · +1' : '❌ DEFEAT'}</b></div>
        ${motm ? `<div class="cb-motm">⭐ Player of the match: <b>${name(motm.i)}</b> ${motm.rt.toFixed(1)}</div>` : ''}
        <h3 class="section-title">Ratings</h3>
        <div class="cb-rates">${res.rows.map(x => { const p = byPk(S.xi[x.i] ? S.xi[x.i].k : ''); if (!p) return ''; return x.out ? `<div class="cb-rate"><span>${esc(shortName(p))}</span><small>🚑 injured</small></div>`
          : `<div class="cb-rate">${pill(x.rt)}<span>${esc(shortName(p))}${x.g ? ' ⚽'.repeat(x.g) : ''}${x.a ? ' 🅰️'.repeat(x.a) : ''}${x.cs ? ' 🧤' : ''}${x.inj ? ` 🚑 ${x.inj}w` : ''}</span><small class="${x.dv >= 0 ? 'up' : 'down'}">${x.dv >= 0 ? '▲' : '▼'} ${money(Math.abs(x.dv))}</small></div>`; }).join('')}</div>
        <h3 class="section-title">Elsewhere</h3>
        <div class="cb-else">${others.map(([h, a]) => `<span>${esc(GM.clubShort(S.teams[h].name))} v ${esc(GM.clubShort(S.teams[a].name))}</span>`).join('')}</div>
        <h3 class="section-title">The table <small>you’re ${ord(pos)}</small></h3>${tableHtml()}
        <div class="actions col"><button class="btn big" id="cbnext">${res.week >= WEEKS ? '🏁 Final table' : `▶ Matchweek ${res.week + 1}`}</button></div>`;
      if (live) {
        GM.sound.play('whistle');
        setTimeout(() => GM.sound.play(res.res === 'W' ? 'cheer' : res.res === 'L' ? 'bad' : 'good'), 500 + res.goals.length * 350);
        window.scrollTo(0, 0);
      }
      GM.$('#cbnext', root).onclick = () => { nextWeek(S); save(); window.scrollTo(0, 0); S.phase === 'over' ? end() : board(); };
    }
    function tableHtml() {
      return `<div class="cb-table"><div class="cb-tr head"><span>#</span><span>Club</span><span>P</span><span>GD</span><span>Pts</span></div>${table(S).map((t, i) => `<div class="cb-tr${t.you ? ' you' : ''}${i < 1 ? ' cb-top' : i >= 7 ? ' cb-drop' : ''}">
        <span>${i + 1}</span><span>${GM.clubChip(t.name)} ${esc(t.name)}</span><span>${t.w + t.d + t.l}</span><span>${t.gd > 0 ? '+' : ''}${t.gd}</span><b>${t.p}</b></div>`).join('')}</div>`;
    }

    /* ---- full time: the final table and the board's verdict */
    async function end() {
      const score = scoreOf(S), pos = position(S), isBest = score > GM.best(key);
      GM.sound.play('fulltime');
      if (pos === 1) setTimeout(() => GM.sound.play('fanfare'), 1300); else if (pos <= L.target) setTimeout(() => GM.sound.play('cheer'), 1300); else if (pos >= 8) setTimeout(() => GM.sound.play('boo'), 1300);
      fullTime(false, isBest);
      GM.checkGame('boss', score, { pos, unbeaten: !S.teams[0].l, sacked: S.sacked, lv });
      await GM.recordScore(key, score, { t: S.teams[0].p, pos });
    }
    function fullTime(seen, isBest) {
      const pos = position(S), t = S.teams[0], ok = pos <= L.target;
      const V = pos === 1 ? ['🏆', 'CHAMPIONS!', 'Open-top bus, the lot. They’ll name a stand after you.'] : pos <= 3 ? ['🌟', 'Into Europe', 'A season to remember. The board’s delighted.']
        : ok ? ['👍', 'Job done', 'The board wanted ' + (L.target === 5 ? 'the top half' : 'safety') + ', and got it.'] : pos >= 8 ? ['💀', 'Relegated', 'The board would like a word. In private.'] : ['😐', 'Mid-table', 'Not what the board wanted. Your seat’s getting warm.'];
      const all = S.xi.map(x => ({ x, p: byPk(x.k), avg: x.hist.filter(v => v != null) })).filter(o => o.avg.length).map(o => ({ ...o, avg: o.avg.reduce((a, b) => a + b, 0) / o.avg.length })).sort((a, b) => b.avg - a.avg);
      const deals = S.signed.map(d => { const x = S.xi.find(y => y.k === d.k); return x ? { d, p: byPk(d.k), gain: x.value - d.paid } : null; }).filter(Boolean).sort((a, b) => b.gain - a.gain);
      const txt = `📋 Goal Machine – ${title}: ${GM.clubShort(S.club)} finished ${ord(pos)} with ${t.p} points (W${t.w} D${t.d} L${t.l}) ${V[0]}`;
      root.innerHTML = `${top()}<div class="cb-final ${ok ? 'ok' : 'bad'}">
        <span class="kicker">The final table · ${esc(S.club)}</span>
        <div class="cb-verdict"><span>${V[0]}</span><b>${V[1]}</b><small>${V[2]}</small></div>
        <div class="result"><div class="result-score"><span>${ord(pos)}</span><small>${t.p} point${t.p === 1 ? '' : 's'} · W${t.w} D${t.d} L${t.l} · GD ${t.gf - t.ga >= 0 ? '+' : ''}${t.gf - t.ga}</small></div>
          ${isBest ? '<div class="banner">🏆 New personal best!</div>' : ''}
          ${tableHtml()}
          ${all[0] ? `<div class="mb-deal good">${GM.avatar(all[0].p, '', lv === 'hard')}<span><small>⭐ Player of the season</small><b>${esc(all[0].p.name)}</b><i>average rating ${all[0].avg.toFixed(1)}</i></span><em>${ovrBadge(ovr(all[0].p))}</em></div>` : ''}
          ${deals[0] && deals[0].gain > 0 ? `<div class="mb-deal good">${GM.avatar(deals[0].p, '', lv === 'hard')}<span><small>💎 Signing of the season</small><b>${esc(deals[0].p.name)}</b><i>${money(deals[0].d.paid)} → ${money(deals[0].d.paid + deals[0].gain)}</i></span></div>` : ''}
          <div class="actions col"><a class="btn big" href="#/boss?new=1">🔁 New season</a>
            <button class="btn ghost" id="cbshare">📤 Share</button><a class="btn ghost" href="#/leaderboard?m=${encodeURIComponent(key)}">🏆 Leaderboard</a></div></div></div>`;
      window.scrollTo(0, 0);
      GM.$('#cbshare', root).onclick = () => GM.share(txt, GM.baseUrl() + '#/boss');
    }
  };
})();

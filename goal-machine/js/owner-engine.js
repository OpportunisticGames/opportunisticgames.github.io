/* Goal Machine – 🕴️ Dodgy Owner: the rules (no screens here, so the tests can play whole seasons).
   You've bought a club. You're far too involved: you hire and sack the head coach, you can meddle and pick the team
   yourself (proud coaches hate it), you run the money and the transfers, and you're not above a dodgy deal. A 20-club
   league over 38 weeks and a cup; your score is your league points.
   - Squad of ~20. Every player has an OVR (Moneyball's worth as a percentile of the 50+ app players), fitness, morale,
     form (match ratings), a wage and a value. Tired players play worse and get injured more, so you rotate; cards
     build to bans; stars left out sulk.
   - Money flows every week: TV money, gate money at home (more when the fans are happy), prize money, the sponsor;
     wages go out. The wage bill has a cap (unless you ignore it…). Two windows (pre-season to week 3, weeks 19–22)
     with a Deadline Day each; bids get accepted, countered or rejected, then the player wants his wage; loans and free
     agents; rival clubs bid for your players.
   - Heat: dodgy choices bring money or an edge but the league notices. High heat → investigations: fines, points
     deductions, transfer embargoes. Fans: wins, signings and stunts move them; at zero they force you to sell (game over).
   - Matches are played minute by minute (live or simulated): midfield wins the ball, attack v defence makes chances,
     the keeper saves some; cards, injuries, tiring legs, subs, the half-time team talk. */
'use strict';

(function () {
  const WEEKS = 38, N = 20;
  const AI_STR = [86, 84, 82, 80, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 63];
  const LEVELS = {
    normal: { band: [65, 75], cash: 25, cap: 0.9, tv: 0.3, target: 10, ai: -2, fans: 60 },
    hard: { band: [60, 70], cash: 15, cap: 0.7, tv: 0.25, target: 17, ai: 0, fans: 50 },
    extreme: { band: [57, 68], cash: 18, cap: 0.75, tv: 0.25, target: 17, ai: -5, fans: 50 },
  };
  const FORMATIONS = { '4-4-2': { D: 4, M: 4, F: 2 }, '4-3-3': { D: 4, M: 3, F: 3 }, '4-5-1': { D: 4, M: 5, F: 1 }, '3-5-2': { D: 3, M: 5, F: 2 }, '5-3-2': { D: 5, M: 3, F: 2 }, '3-4-3': { D: 3, M: 4, F: 3 } };
  const WINDOWS = [[0, 3], [19, 22]];  // weeks the window's open (the last is Deadline Day)
  const CUP = { weeks: [6, 12, 20, 27, 33], names: ['Third round', 'Fourth round', 'Quarter-final', 'Semi-final', 'Final'], prize: [0.5, 1, 2, 3, 8] };
  const SQUAD_MIN = 16, SQUAD_MAX = 26, SUBS = 3;
  const BIG = ['Manchester City', 'Arsenal', 'Liverpool', 'Chelsea', 'Manchester United', 'Tottenham Hotspur', 'Newcastle United', 'Aston Villa'];

  // Head coaches: the owner hires and sacks them. ego: how much he minds you picking the team (relationship lost per meddled match)
  // Head coaches (affectionate parodies). ego: relationship lost per meddled match. Perks are what they're famous for.
  const COACHES = {
    philosopher: { icon: '🧥', name: 'Pep Cardigola', tag: 'The Tiki-Taka Tinkerer', perk: '+4 midfield when HE picks the team. Overthinks; hates meddling', ego: 14, wage: 70, mid: 4 },
    zealot: { icon: '🤗', name: 'Jürgen Kloppity', tag: 'Heavy Metal Football', perk: '+4 attack, +2 midfield, and big hugs (morale up every week), but legs tire 30% faster', ego: 10, wage: 55, att: 4, mid: 2, drain: 1.3, hugs: 1 },
    busparker: { icon: '🚌', name: 'José Moaninho', tag: 'The Special Two', perk: 'Parks the bus (+5 defence, −2 attack) and plays mind games (every opponent −1). Huge ego', ego: 16, wage: 65, def: 5, att: -2, mind: 1 },
    hairdryer: { icon: '💨', name: 'Sir Alex Furyson', tag: 'Squeaky Bum Time', perk: 'Half-time talks hit twice as hard, and his teams score late (better finishing after 80′)', ego: 10, wage: 60, talk: 2, late: 1 },
    sergeant: { icon: '🧢', name: 'Tony Pullcap', tag: 'Cap and Long Throws', perk: 'Gruelling training: +6 fitness back a week and +2 defence, but morale dips', ego: 8, wage: 35, fit: 6, def: 2 },
    firefighter: { icon: '🧯', name: 'Big Sam Alldicey', tag: 'Never Been Relegated', perk: '+5 to everything while you’re in the bottom six', ego: 6, wage: 45, fire: 5 },
    yesman: { icon: '😊', name: 'Ole Gunnar Smilesjær', tag: 'The Nice Guy', perk: 'No tactics to speak of, but never minds you meddling, and keeps everyone smiling (+2 morale a week)', ego: 0, wage: 20, smile: 2 },
    nerd: { icon: '💻', name: 'Graham Plotter', tag: 'The Laptop', perk: 'Sees through the market (exact OVRs on everyone) and +2 attack', ego: 4, wage: 40, att: 2 },
    dealer: { icon: '🚗', name: 'Harry Readyknapp', tag: 'Window Down, Deal Done', perk: 'Wheeler-dealer: signings 15% cheaper and clubs pay 15% more for your players', ego: 6, wage: 45 },
    youth: { icon: '🌱', name: 'Arsène Wonger', tag: 'Le Professeur', perk: 'Young players (debut 2015 or later) play 3 better and their values rise twice as fast', ego: 8, wage: 50, youth: 3 },
  };
  // Who you are: each owner plays differently and wants something different (achieving it is worth a lot of legacy)
  const OWNERS = {
    petro: { icon: '🛢️', name: 'The Petro-Prince', text: 'Bottomless pockets: £80m more, and the wage cap is “a suggestion” (no heat for ignoring it). The league already has a file on you.', cash: 80, heat: 30, fans: 5, ambition: 'Finish in the top four', amb: (S, pos) => pos <= 4 },
    nerd: { icon: '📊', name: 'The Spreadsheet', text: 'A Moneyball disciple: exact OVRs on everyone, free scouting, and clubs pay you 20% more for your players. Not much cash, though.', cash: -10, ambition: 'Make £25m profit and stay up', amb: (S, pos) => profit(S) >= 25 && pos <= 17 },
    local: { icon: '🏠', name: 'The Local Lad', text: 'A lifelong fan who won the lottery. The fans adore you (+25), but every dodgy deal costs you with them too.', fans: 25, ambition: 'Finish in the top half with the fans on 85+', amb: (S, pos) => pos <= 10 && S.fans >= 85 },
    crypto: { icon: '🪙', name: 'The Crypto Bro', text: 'Your fortune is in MoonDoge. Every week it moons or rugs: wild swings in your cash. To the moon!', heat: 10, ambition: 'Reach the Cup semi-finals', amb: S => S.cup.won || S.cup.ties.filter(t => t.through).length >= 3 },
    stripper: { icon: '🏚️', name: 'The Asset Stripper', text: 'You bought the club to squeeze it. Skim money into your own account every week (Money tab); it counts towards your legacy. Just don’t get relegated.', ambition: 'Skim £40m and stay up', amb: (S, pos) => (S.skim || 0) >= 40 && pos <= 17 },
  };
  // The club you buy: same league, different situations
  const SITUATIONS = {
    crisis: { icon: '🔥', name: 'Big club in crisis', text: 'A good squad, a mountain of debt and furious fans.', band: 3, cash: -25, fans: -20 },
    steady: { icon: '⚖️', name: 'Mid-table and comfortable', text: 'Nothing special. Nothing terrible. Yet.', band: 0, cash: 0, fans: 0 },
    upstart: { icon: '🚀', name: 'Plucky newcomers', text: 'A weak squad but money in the bank and fans who are just happy to be here.', band: -3, cash: 30, fans: 15 },
  };
  // How rival teams play, and what beats it
  const STYLES = {
    possession: { icon: '🔄', name: 'Possession', hint: 'They hog the ball (+3 midfield). Pack your midfield.' },
    counter: { icon: '⚡', name: 'Counter-attack', hint: 'Lethal on the break if you attack. Stay balanced or sit deep.' },
    press: { icon: '🔥', name: 'High press', hint: 'Exhausting to play against. Sitting deep saves your legs.' },
    direct: { icon: '🎯', name: 'Long ball', hint: 'Big and direct (+3 attack, −2 defence). Defending deep blunts it.' },
    bus: { icon: '🚌', name: 'Park the bus', hint: 'A wall (+5 defence, −3 attack). Attack them: they can’t hurt you.' },
  };
  const esc = GM.esc, byPk = k => GM.anyByPk(k);
  const r1 = x => Math.round(x * 10) / 10, clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------------------------------------------------------------- players: OVR, wages, values */
  let W = null;
  const ovrCache = new Map();
  function ovr(p) {
    if (ovrCache.has(p.pk)) return ovrCache.get(p.pk);
    if (!W) W = GM.players.map(GM.mbWorth).sort((a, b) => a - b);
    const w = GM.mbWorth(p);
    let o;
    if (w <= W[0]) o = Math.max(45, Math.round(45 + 10 * w / W[0]));
    else {
      let lo = 0, hi = W.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (W[mid] <= w) lo = mid; else hi = mid - 1; }
      o = Math.round(55 + 37 * Math.pow(lo / (W.length - 1), 1.15));
    }
    ovrCache.set(p.pk, o);
    return o;
  }
  const wageFor = o => Math.round(10 * Math.exp((o - 60) / 11));        // £k a week
  const fairValue = o => r1(6 * Math.exp((o - 60) / 12));             // £m
  // what his club wants: what he's worth, nudged by his reputation (so the underrated are cheap), and a premium for a club's best players
  function askPrice(S, p) {
    const o = ovr(p), fv = fairValue(o), rep = Math.max(1, GM.market.reputation(p));
    const repRatio = clamp(Math.sqrt(rep / Math.max(4, fv * 1.6)), 0.7, 1.45);
    const owner = S.teams[ownerOf(S, p)];
    const key = owner && o >= owner.str + 3 ? 1.25 : 1;
    const mood = 0.9 + 0.2 * GM.rng(`${S.seed}|ask|${p.pk}|${S.week >= 19 ? 2 : 1}`)();
    const envelope = S.discount != null && windowOpen(S) && WINDOWS.some(([a, b]) => S.discount >= a && S.discount <= b && S.week <= b) ? 0.8 : 1;
    return r1(fv * repRatio * key * mood * envelope * (deadlineDay(S) ? 0.85 : 1) * (S.coach === 'dealer' ? 0.85 : 1));
  }
  // which rival club a market player belongs to (the better he is, the bigger the club)
  function ownerOf(S, p) {
    const r = GM.rng(`${S.seed}|own|${p.pk}`), o = ovr(p);
    const fits = S.teams.map((t, i) => i).filter(i => i > 0 && Math.abs(S.teams[i].str - o) <= 9);
    return fits.length ? fits[r.int(fits.length)] : 1 + r.int(N - 1);
  }
  const groupOf = p => p.pos;  // G / D / M / F
  // loans: only players who aren't first-choice at their club; a tenth of his value, and you pay his wages
  const canLoan = (S, p) => { const t = S.teams[ownerOf(S, p)]; return ovr(p) <= (t ? t.str : 70); };
  const loanFee = p => r1(fairValue(ovr(p)) * 0.1);

  function mkPlayer(p, extra = {}) {
    const o = ovr(p);
    return Object.assign({ k: p.pk, g: groupOf(p), fit: 100, mor: 70, wage: wageFor(o), value: fairValue(o), inj: 0, ban: 0, yc: 0, rt: [], apps: 0, gl: 0, as: 0, listed: false, loan: false, joined: 0 }, extra);
  }

  /* ---------------------------------------------------------------- a new season */
  // three clubs you could buy (your favourite among them if you have one), each in a different situation
  function clubOffers(seed) {
    const r = GM.rng(seed + '|clubs'), names = leagueClubs(), fav = GM.favClub() && names.includes(GM.favClub()) ? GM.favClub() : null;
    const pool = r.shuffle(names.filter(c => c !== fav && !BIG.includes(c)));
    const picks = (fav ? [fav] : []).concat(pool).slice(0, 3);
    return r.shuffle(Object.keys(SITUATIONS)).map((sit, i) => ({ club: picks[i], sit }));
  }
  const leagueClubs = () => { const now = [...new Set((GM.fixtures ? GM.fixtures() : []).flatMap(f => [f.home, f.away]))]; return (now.length >= N ? now : GM.clubs).slice(); };
  function create(seed, lv, coach, opt = {}) {
    const owner = OWNERS[opt.owner] ? opt.owner : 'local', sit = SITUATIONS[opt.sit] ? opt.sit : 'steady', OW = OWNERS[owner], SI = SITUATIONS[sit];
    const L = { ...LEVELS[lv] }, pool = poolFor(lv), r = GM.rng(seed + '|start');
    L.band = [L.band[0] + SI.band, L.band[1] + SI.band];
    const names = leagueClubs();
    const mine = opt.club && names.includes(opt.club) ? opt.club : GM.favClub() && names.includes(GM.favClub()) ? GM.favClub() : r.pick(names.filter(c => !BIG.includes(c)));
    const rivals = r.shuffle(names.filter(c => c !== mine)).slice(0, N - 1).sort((a, b) => BIG.includes(b) - BIG.includes(a));
    const used = new Set(), squad = [];
    [['G', 2], ['D', 7], ['M', 7], ['F', 4]].forEach(([g, n]) => {
      const c = r.shuffle(pool.filter(p => p.pos === g && ovr(p) >= L.band[0] && ovr(p) <= L.band[1]));
      for (let i = 0; i < n && i < c.length; i++) { used.add(c[i].pk); squad.push(mkPlayer(c[i], { value: r1(fairValue(ovr(c[i])) * (0.85 + 0.3 * r())) })); }
    });
    const S = {
      v: 2, seed, lv, week: 0, n: 0, club: mine, owner, sit, coach, rel: 70, meddle: false, form: '4-4-2', ment: 'balanced', xi: null,
      cash: L.cash + (OW.cash || 0) + SI.cash, heat: OW.heat || 0, fans: clamp(L.fans + (OW.fans || 0) + SI.fans, 5, 95), embargo: 0, ignoredCap: false, sponsor: null, skim: 0, ownerLoan: 0,
      teams: [{ name: mine, you: true, str: 0 }].concat(rivals.map((c, i) => ({ name: c, str: AI_STR[i] + L.ai + Math.round((r() - 0.5) * 2), style: r.pick(Object.keys(STYLES)) })))
        .map(t => Object.assign(t, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, ded: 0 })),
      squad, results: [], cup: { round: 0, out: false, won: false, ties: [] }, inbox: [], offers: [], news: [], ledger: {}, cashLog: [],
      scouted: {}, free: [], shortlist: [], over: null, live: null, bonus: 0,
    };
    S.cash0 = S.cash; S.cashLog.push(S.cash);
    S.free = freeAgents(S);
    S.inbox.push(sponsorEvent(S));
    pickXI(S);
    return S;
  }
  const poolFor = lv => (lv === 'extreme' ? (GM.allPlayers || GM.players) : GM.players);
  const P = (S, x) => byPk(x.k);
  const rng = (S, tag) => GM.rng(`${S.seed}|${tag}|${S.week}|${S.n++}`);

  /* ---------------------------------------------------------------- the calendar */
  // 20 clubs, everyone home and away: 19 rounds by the circle method, then again with home and away swapped
  let ROUNDS = null;
  function rounds() {
    if (ROUNDS) return ROUNDS;
    const ids = [...Array(N).keys()], first = [];
    for (let r = 0; r < N - 1; r++) {
      const ps = [];
      for (let i = 0; i < N / 2; i++) { const a = ids[i], b = ids[N - 1 - i]; ps.push((r + i) % 2 ? [b, a] : [a, b]); }
      first.push(ps);
      ids.splice(1, 0, ids.pop());
    }
    ROUNDS = first.concat(first.map(rd => rd.map(([a, b]) => [b, a])));
    return ROUNDS;
  }
  // your league fixture in a week: { opp, home }
  function fixture(S, week = S.week) {
    if (week < 1 || week > WEEKS) return null;
    const m = rounds()[week - 1].find(x => x.includes(0));
    return { opp: m[0] === 0 ? m[1] : m[0], home: m[0] === 0, comp: 'league', week };
  }
  const cupWeek = (S, week = S.week) => !S.cup.out && !S.cup.won && CUP.weeks[S.cup.round] === week;
  function cupTie(S) {
    if (!cupWeek(S)) return null;
    if (!S.cup.draw || S.cup.draw.round !== S.cup.round) {
      const r = GM.rng(`${S.seed}|cupdraw|${S.cup.round}`), lower = ['Sunderland', 'Leeds United', 'Norwich City', 'Watford', 'Stoke City', 'Burnley', 'Hull City', 'Middlesbrough', 'Derby County', 'Blackburn Rovers', 'Bolton Wanderers', 'Wigan Athletic'];
      const big = S.cup.round >= 2 || r() < 0.5;
      const opts = big ? S.teams.slice(1).map(t => ({ name: t.name, str: t.str })) : lower.filter(c => !S.teams.some(t => t.name === c)).map(c => ({ name: c, str: 60 + r.int(8) }));
      const o = opts[r.int(opts.length)] || { name: 'Lower League FC', str: 60 };
      S.cup.draw = { round: S.cup.round, name: o.name, str: S.cup.round >= 3 ? Math.max(o.str, 74 + r.int(8)) : o.str, home: r() < 0.5 };
    }
    return { opp: -1, oppName: S.cup.draw.name, oppStr: S.cup.draw.str, home: S.cup.draw.home && S.cup.round < 4, comp: 'cup', week: S.week, round: S.cup.round };
  }
  const windowOpen = (S, week = S.week) => WINDOWS.some(([a, b]) => week >= a && week <= b);
  const deadlineDay = S => WINDOWS.some(([, b]) => S.week === b);
  const nextWindow = S => WINDOWS.find(([a]) => a > S.week);

  /* ---------------------------------------------------------------- the team */
  const formBonus = x => { const t = x.rt.slice(-3); return t.length ? clamp((t.reduce((a, b) => a + b, 0) / t.length - 6.5) * 1.2, -3, 3) : 0; };
  // how well he'll play today: OVR, worn down by tiredness, lifted or sunk by morale and form
  const isYoung = p => p.first >= 2015;
  const eff = (S, x) => ovr(P(S, x)) * (0.8 + 0.2 * x.fit / 100) + (x.mor - 70) / 12 + formBonus(x) + (S.coach === 'youth' && isYoung(P(S, x)) ? 3 : 0);
  const available = x => !x.inj && !x.ban;
  // the best XI the coach would pick: the fittest good players in his shape (tired ones rested)
  function pickXI(S, form = S.form) {
    const F = FORMATIONS[form], need = { G: 1, ...F }, xi = [];
    ['G', 'D', 'M', 'F'].forEach(g => {
      const c = S.squad.map((x, i) => i).filter(i => S.squad[i].g === g && available(S.squad[i])).sort((a, b) => eff(S, S.squad[b]) - (S.squad[b].fit < 70 ? 6 : 0) - eff(S, S.squad[a]) + (S.squad[a].fit < 70 ? 6 : 0));
      xi.push(...c.slice(0, need[g]).map(i => ({ i, g })));
      for (let k = c.length; k < need[g]; k++) xi.push({ i: null, g });
    });
    // gaps: fill from anyone left (out of position)
    xi.forEach(s => { if (s.i == null) { const left = S.squad.map((x, i) => i).filter(i => available(S.squad[i]) && !xi.some(t => t.i === i) && S.squad[i].g !== 'G'); if (left.length) s.i = left.sort((a, b) => eff(S, S.squad[b]) - eff(S, S.squad[a]))[0]; } });
    S.xi = xi;
    return xi;
  }
  // a valid XI for today: anyone injured or banned since you picked it is replaced
  function readyXI(S) {
    if (!S.xi || !S.meddle) return pickXI(S, S.meddle ? S.form : coachForm(S));
    const F = FORMATIONS[S.form], need = { G: 1, ...F };
    let ok = S.xi.length === 11 && ['G', 'D', 'M', 'F'].every(g => S.xi.filter(s => s.g === g).length === need[g]);
    if (!ok) return pickXI(S);
    S.xi.forEach(s => {
      if (s.i == null || !S.squad[s.i] || !available(S.squad[s.i])) {
        const left = S.squad.map((x, i) => i).filter(i => available(S.squad[i]) && !S.xi.some(t => t.i === i));
        const same = left.filter(i => S.squad[i].g === s.g), pool = same.length ? same : left.filter(i => S.squad[i].g !== 'G');
        s.i = pool.sort((a, b) => eff(S, S.squad[b]) - eff(S, S.squad[a]))[0] ?? null;
      }
    });
    return S.xi;
  }
  const coachForm = S => ({ busparker: '5-3-2', zealot: '4-3-3', philosopher: '4-5-1' }[S.coach] || S.form);
  const slotEff = (S, s) => { if (s.i == null) return 40; const x = S.squad[s.i]; let e = eff(S, x); if (x.g !== s.g) e -= (x.g === 'G' || s.g === 'G') ? 30 : 12; return e; };
  // a side's strength in each line, from its XI (or a rival's single number)
  function lines(S, xi, ment, extra = 0) {
    const C = COACHES[S.coach] || {}, k = S.meddle ? 0.5 : 1, pos = position(S);
    const avg = g => { const s = xi.filter(t => t.g === g); return s.length ? s.reduce((a, t) => a + slotEff(S, t), 0) / s.length : 50; };
    const n = g => xi.filter(t => t.g === g).length;
    const fire = C.fire && pos >= 15 ? C.fire : 0;
    const L = {
      gk: avg('G'),
      def: avg('D') + (n('D') - 4) * 2 + k * (C.def || 0) + fire,
      mid: avg('M') + (n('M') - 4) * 2 + k * (C.mid || 0) * (S.coach === 'philosopher' && S.meddle ? 0 : 1) + fire,
      att: avg('F') + (n('F') - 2) * 2 + k * (C.att || 0) + fire,
    };
    if (ment === 'attack') { L.att += 3; L.def -= 3; } else if (ment === 'defend') { L.def += 3; L.att -= 3; }
    ['def', 'mid', 'att'].forEach(l => { L[l] += extra + (S.bounce ? 3 : 0); });  // a new coach's first games: a bounce
    return L;
  }
  const strength = S => { const L = lines(S, readyXI(S), S.ment); return r1((L.gk + L.def * 4 + L.mid * 4 + L.att * 2) / 11); };
  const teamOvr = S => Math.round(readyXI(S).reduce((a, s) => a + (s.i == null ? 40 : ovr(P(S, S.squad[s.i]))), 0) / 11);
  const wageBill = S => r1(S.squad.reduce((a, x) => a + x.wage, 0) + (COACHES[S.coach] ? COACHES[S.coach].wage : 0));  // £k a week
  function table(S) { return S.teams.map((t, i) => ({ ...t, i, gd: t.gf - t.ga, pts: t.p - t.ded })).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf); }
  const position = S => table(S).findIndex(t => t.you) + 1;
  const profit = S => r1(S.cash - (S.cash0 ?? LEVELS[S.lv].cash) - (S.ownerLoan || 0));
  // the legacy: league points, plus everything else a season can be remembered for (so there's more than one way to win)
  function legacy(S) {
    const t = S.teams[0], pos = position(S), pts = t.p - t.ded, OW = OWNERS[S.owner] || OWNERS.local, parts = [];
    parts.push(['⚽ League points', pts]);
    parts.push(['📊 Final position', pos === 1 ? 40 : pos <= 4 ? 20 : pos <= 10 ? 5 : pos >= 18 ? -20 : 0]);
    const won = S.cup.ties.filter(x => x.through).length;
    parts.push(['🏆 The Cup', won * 4 + (S.cup.won ? 25 : 0)]);
    parts.push([`${OW.icon} Ambition: ${OW.ambition}`, OW.amb(S, pos) ? 30 : 0]);
    parts.push(['📣 The fans', Math.round(S.fans / 10)]);
    parts.push(['💷 Profit', Math.max(-15, Math.round(profit(S) / 3))]);
    if (S.skim) parts.push(['💼 Skimmed for yourself', Math.round(S.skim / 2)]);
    if (S.over && S.over !== 'done') parts.push([{ fans: '📣 Forced out by the fans', bankrupt: '🏦 Administration', expelled: '⚖️ Banned by the league' }[S.over], -30]);
    return { parts, total: Math.max(0, parts.reduce((a, p) => a + p[1], 0)) };
  }
  const scoreOf = S => legacy(S).total;
  // the asset stripper's little habit
  function skim(S, amt) {
    if (S.owner !== 'stripper' || S.cash < amt) return false;
    S.cash = r1(S.cash - amt); S.skim = r1((S.skim || 0) + amt); book(S, 'Skimmed', -amt);
    S.heat = clamp(S.heat + 2 * amt, 0, 100);  // a little heat for every £1m
    return true;
  }

  /* ---------------------------------------------------------------- the match */
  function startMatch(S, fx) {
    const xi = readyXI(S).map(s => ({ ...s }));
    const opp = fx.comp === 'league' ? S.teams[fx.opp] : { name: fx.oppName, str: fx.oppStr };
    const r = GM.rng(`${S.seed}|opp|${opp.name}`), o = opp.str + (fx.home ? 0 : 2) + (S.watered && fx.comp === 'league' ? -2 : 0);
    const M = {
      fx, oppName: opp.name, min: 0, gf: 0, ga: 0, ev: [], xi, bench: S.squad.map((x, i) => i).filter(i => !xi.some(s => s.i === i) && available(S.squad[i])).slice(0, 9),
      subs: SUBS, ment: S.ment, extra: fx.home ? 2 : 0, talk: 0, red: 0, oppRed: 0, shots: [0, 0], poss: [0, 0], cards: {}, mins: {}, gl: {}, as: {}, inj: [], subbed: [], done: false, ht: false,
      opp: { gk: o + (r() - 0.5) * 4, def: o + (r() - 0.5) * 4, mid: o + (r() - 0.5) * 4, att: o + (r() - 0.5) * 4 }, style: opp.style || r.pick(Object.keys(STYLES)),
      seed: `${S.seed}|match|${fx.comp}|${fx.week}`, meddled: S.meddle,
    };
    const st = { possession: { mid: 3 }, direct: { att: 3, def: -2 }, bus: { def: 5, att: -3 }, press: { mid: 2 }, counter: {} }[M.style] || {};
    ['gk', 'def', 'mid', 'att'].forEach(l => { M.opp[l] += (st[l] || 0) - ((COACHES[S.coach] || {}).mind ? 1 : 0); });
    xi.forEach(s => { if (s.i != null) M.mins[s.i] = 0; });
    S.squad.forEach((x, i) => { if (x.ban && !xi.some(s => s.i === i)) x.ban--; });  // a banned player serves his ban
    S.live = M;
    return M;
  }
  const say = (M, t, k = '') => M.ev.push({ m: M.min, t, k });
  // play minutes up to `to` (45 = half-time, 90 = full time)
  function stepMatch(S, M, to) {
    const r = GM.rng(`${M.seed}|${M.min}|${M.subbed.length}|${M.red}`);
    const C = COACHES[S.coach] || {};
    while (M.min < to) {
      M.min++;
      const me = lines(S, M.xi, M.ment, M.extra + M.talk - M.red * 5), op = { ...M.opp };
      ['def', 'mid', 'att'].forEach(l => { op[l] -= M.oppRed * 5; });
      let pY = 1 / (1 + Math.exp(-(me.mid - op.mid) / 12));
      if (M.ment === 'attack') pY += 0.03; else if (M.ment === 'defend') pY -= 0.04;
      M.poss[0] += pY; M.poss[1] += 1 - pY;
      // each side's chances: a base rate, more with more of the ball; conversion from attack v defence and the keeper
      const yC = 0.125 * (0.6 + 0.8 * pY), oC = 0.125 * (0.6 + 0.8 * (1 - pY)), roll = r();
      if (roll < yC + oC) {
        const you = roll < yC, A = you ? me : op, D = you ? op : me;
        let conv = (0.035 + 0.17 / (1 + Math.exp(-(A.att - D.def) / 10))) * (1 - (D.gk - 70) / 250);
        if (you && M.ment === 'attack') conv *= 1.05; if (!you && M.ment === 'attack') conv *= 1.2; if (!you && M.ment === 'defend') conv *= 0.78;
        // their style, and what beats it
        if (M.style === 'counter' && !you) conv *= M.ment === 'attack' ? 1.35 : 0.9;
        if (M.style === 'bus' && you && M.ment === 'attack') conv *= 1.2;
        if (M.style === 'direct' && !you && M.ment === 'defend') conv *= 0.8;
        if (you && C.late && M.min > 80) conv *= 1.3;  // squeaky bum time
        M.shots[you ? 0 : 1]++;
        if (r() < conv) {
          if (you) {
            M.gf++;
            const on = M.xi.filter(s => s.i != null), w = s => { const p = P(S, S.squad[s.i]); return ({ F: 3, M: 1.4, D: 0.5, G: 0 }[s.g]) * (p.goals / Math.max(1, p.apps)) + ({ F: 0.06, M: 0.03, D: 0.012, G: 0 }[s.g]); };
            const sc = r.weighted(on, w), as = r() < 0.72 ? r.weighted(on.filter(s => s !== sc), s => { const p = P(S, S.squad[s.i]); return p.ast / Math.max(1, p.apps) + 0.01; }) : null;
            M.gl[sc.i] = (M.gl[sc.i] || 0) + 1; if (as) M.as[as.i] = (M.as[as.i] || 0) + 1;
            say(M, `GOAL! ${P(S, S.squad[sc.i]).name}${as ? ` (assist: ${P(S, S.squad[as.i]).name})` : ''}`, 'goal');
          } else { M.ga++; say(M, `${M.oppName} score.`, 'conc'); }
        } else if (r() < 0.3) say(M, you ? r.pick(['Close! Just wide.', 'Great save from their keeper.', 'Off the bar!', 'Blazed over.']) : r.pick([`${M.oppName} go close.`, 'Big save from our keeper!', 'Cleared off the line!']), you ? 'chance' : 'scare');
      }
      // legs, cards and knocks
      M.xi.forEach(s => {
        if (s.i == null) return;
        const x = S.squad[s.i];
        x.fit = Math.max(0, x.fit - 0.2 * (C.drain || 1) * (M.ment === 'attack' ? 1.1 : 1) * (M.style === 'press' && M.ment !== 'defend' ? 1.25 : 1));
        M.mins[s.i] = (M.mins[s.i] || 0) + 1;
        if (r() < 0.0016 * (s.g === 'D' ? 1.4 : s.g === 'G' ? 0.3 : 1)) {
          M.cards[s.i] = (M.cards[s.i] || 0) + 1;
          if (M.cards[s.i] === 2) { sendOff(S, M, s, 'Second yellow!'); } else say(M, `🟨 ${P(S, x).name} booked.`, 'card');
        } else if (r() < 0.00012) { M.cards[s.i] = 3; sendOff(S, M, s, 'Straight red!'); }
        else if (r() < 0.00013 * (x.fit < 60 ? 4 : x.fit < 75 ? 2 : 1)) {
          x.inj = 1 + Math.floor(r() * r() * 7); M.inj.push(s.i);
          say(M, `🚑 ${P(S, x).name} is hurt (${x.inj} week${x.inj > 1 ? 's' : ''}).`, 'inj');
          autoSub(S, M, s, true);
        }
      });
      if (r() < 0.00025 * 11) { M.oppRed++; say(M, `🟥 ${M.oppName} have a man sent off!`, 'card'); }
      if (M.min === 45) { M.ht = true; say(M, `Half-time: ${M.gf}–${M.ga}.`, 'ht'); }
    }
    if (M.min >= 90) M.done = true;
    return M;
  }
  function sendOff(S, M, s, why) {
    const x = S.squad[s.i];
    say(M, `🟥 ${why} ${P(S, x).name} is off.`, 'red');
    x.ban = (x.ban || 0) + (M.cards[s.i] === 3 ? 3 : 1);
    M.red++; s.i = null;
  }
  // bring someone on (yours: the best fresh one from the bench in that position)
  function autoSub(S, M, s, forced) {
    if (!M.subs) { if (forced) s.i = null; return false; }
    const c = M.bench.filter(i => available(S.squad[i]) && !M.subbed.includes(i));
    const same = c.filter(i => S.squad[i].g === s.g), pick = (same.length ? same : c.filter(i => S.squad[i].g !== 'G')).sort((a, b) => eff(S, S.squad[b]) - eff(S, S.squad[a]))[0];
    if (pick == null) { if (forced) s.i = null; return false; }
    return sub(S, M, s, pick);
  }
  function sub(S, M, s, inI) {
    if (!M.subs || !M.bench.includes(inI)) return false;
    const off = s.i;
    M.subs--; M.subbed.push(inI); M.bench = M.bench.filter(i => i !== inI);
    if (off != null) M.subbed.push(off);
    s.i = inI; M.mins[inI] = M.mins[inI] || 0;
    say(M, `🔁 ${P(S, S.squad[inI]).name} on${off != null ? ` for ${P(S, S.squad[off]).name}` : ''}.`, 'sub');
    return true;
  }
  // the coach's subs in a simulated match: tired legs off around the hour
  function coachSubs(S, M) {
    M.xi.filter(s => s.i != null && S.squad[s.i].fit < 66).sort((a, b) => S.squad[a.i].fit - S.squad[b.i].fit).slice(0, M.subs).forEach(s => autoSub(S, M, s));
  }
  // the half-time team talk (the owner's version)
  const TALKS = {
    calm: { icon: '🫖', name: 'A calm word', go: (S, M) => (M.gf >= M.ga ? 1 : 0.5) },
    hairdryer: { icon: '💨', name: 'The hairdryer', go: (S, M, r) => (M.gf < M.ga ? (r() < 0.65 ? 3 : -1) : (r() < 0.4 ? 1 : -2)) },
    bonus: { icon: '💰', name: 'Promise a £1m win bonus', go: (S, M) => { M.bonus = 1; return 2.5; } },
    threat: { icon: '😤', name: 'Threaten to sell the lot of them', go: (S, M, r) => { S.fans += r() < 0.5 ? 2 : -2; return r() < 0.5 ? 4 : -3; }, dodgy: 3 },
    coach: { icon: '🧢', name: 'Leave it to the coach', go: S => (S.coach === 'hairdryer' ? 1.5 : 1) },
  };
  function halfTime(S, M, talk) {
    const T = TALKS[talk] || TALKS.coach, r = GM.rng(M.seed + '|talk');
    let v = T.go(S, M, r);
    if (talk !== 'coach' && S.coach === 'hairdryer') v *= COACHES.hairdryer.talk;
    if (talk !== 'coach') S.rel = clamp(S.rel - Math.round((COACHES[S.coach] || {}).ego / 3 || 0), 0, 100);
    if (T.dodgy) S.heat = clamp(S.heat + T.dodgy, 0, 100);
    M.talk = clamp(v, -4, 6); M.talkName = T.name;
    say(M, `${T.icon} ${T.name}: ${v >= 2 ? 'they’re fired up!' : v > 0 ? 'a few nods.' : v === 0 ? 'blank faces.' : 'that went down badly…'}`, 'talk');
    return v;
  }
  // full time: ratings, stats, the table, the money, the mood
  function endMatch(S, M) {
    if (!M.done) { stepMatch(S, M, 90); }
    const fx = M.fx, res = M.gf > M.ga ? 'W' : M.gf < M.ga ? 'L' : 'D', r = GM.rng(M.seed + '|ft');
    const played = Object.keys(M.mins).map(Number).filter(i => M.mins[i] >= 1 && S.squad[i]);
    const rows = played.map(i => {
      const x = S.squad[i], g = x.g, gl = M.gl[i] || 0, as = M.as[i] || 0, cs = M.ga === 0 && (g === 'D' || g === 'G');
      let rt = 6 + (res === 'W' ? 0.4 : res === 'L' ? -0.4 : 0) + gl * 1 + as * 0.7 + (cs ? 0.8 : 0) - ((g === 'D' || g === 'G') ? M.ga * 0.2 : 0)
        - (M.cards[i] === 1 ? 0.3 : M.cards[i] >= 2 ? 1.5 : 0) + (ovr(P(S, x)) - 70) / 20 + (r() - 0.5) * 1.2;
      rt = clamp(r1(rt), 3, 10);
      if (M.mins[i] >= 10) { x.rt.push(rt); x.apps++; }
      x.gl += gl; x.as += as;
      if (M.cards[i] === 1) { x.yc++; if (x.yc === 5 || x.yc === 10) { x.ban += 1; S.news.push(`🟨 ${P(S, x).name}: 5 bookings, banned for a match`); } }
      x.mor = clamp(x.mor + 2, 0, 100);
      return { i, rt, gl, as, cs, mins: M.mins[i], card: M.cards[i] || 0 };
    }).sort((a, b) => b.rt - a.rt);
    // morale: results for everyone; stars left out sulk
    const stars = S.squad.map((x, i) => [ovr(P(S, x)), i]).sort((a, b) => b[0] - a[0]).slice(0, 6).map(a => a[1]);
    S.squad.forEach((x, i) => {
      x.mor = clamp(x.mor + (res === 'W' ? 5 : res === 'L' ? -5 : 0) - (stars.includes(i) && !played.includes(i) && available(x) ? 6 : 0), 0, 100);
    });
    let money = 0;
    if (fx.comp === 'league') {
      const me = S.teams[0], op = S.teams[fx.opp];
      me.gf += M.gf; me.ga += M.ga; op.gf += M.ga; op.ga += M.gf;
      if (res === 'W') { me.w++; me.p += 3; op.l++; } else if (res === 'L') { me.l++; op.w++; op.p += 3; } else { me.d++; op.d++; me.p++; op.p++; }
      if (res === 'W') { money += 0.25; }
    } else {
      const tie = { round: fx.round, opp: M.oppName, gf: M.gf, ga: M.ga, home: fx.home };
      if (res === 'D') { tie.pens = r() < 0.5 + (strength(S) - fx.oppStr) / 60; }
      const through = res === 'W' || (res === 'D' && tie.pens);
      S.cup.ties.push(tie);
      if (through) { money += CUP.prize[fx.round]; if (fx.round === 4) { S.cup.won = true; S.news.push('🏆 CUP WINNERS!'); } else S.cup.round++; } else S.cup.out = true;
      tie.through = through;
    }
    if (fx.home) { money += r1(0.6 * (0.6 + 0.8 * S.fans / 100) * (fx.comp === 'cup' ? 0.8 : 1)); }
    if (M.bonus && res === 'W') money -= 1;
    S.fans = clamp(S.fans + (res === 'W' ? 3 : res === 'L' ? -2 : 0) + (M.gf - M.ga >= 3 ? 2 : M.ga - M.gf >= 3 ? -2 : 0), 0, 100);
    if (M.meddled) S.rel = clamp(S.rel - ((COACHES[S.coach] || {}).ego || 0) * (res === 'L' ? 1.2 : 0.6), 0, 100);
    else S.rel = clamp(S.rel + (res === 'W' ? 2 : 0), 0, 100);
    S.cash = r1(S.cash + money);
    book(S, fx.comp === 'league' ? 'Gate & prize money' : 'Cup money', money);
    const out = { week: fx.week, comp: fx.comp, round: fx.round, opp: M.oppName, home: fx.home, gf: M.gf, ga: M.ga, res, rows, ev: M.ev.slice(-40), shots: M.shots, poss: Math.round(100 * M.poss[0] / Math.max(1, M.poss[0] + M.poss[1])), money, pens: S.cup.ties.length && fx.comp === 'cup' ? S.cup.ties[S.cup.ties.length - 1].pens : undefined };
    S.results.push(out);
    S.live = null; S.watered = false;
    if (S.bounce) S.bounce--;
    return out;
  }
  // a whole match without stopping (the coach makes the subs)
  function simMatch(S, fx) {
    const M = startMatch(S, fx);
    stepMatch(S, M, 45); halfTime(S, M, 'coach'); stepMatch(S, M, 62); coachSubs(S, M); stepMatch(S, M, 90);
    return endMatch(S, M);
  }

  /* ---------------------------------------------------------------- the week */
  const book = (S, k, v) => { if (!v) return; S.ledger[k] = r1((S.ledger[k] || 0) + v); };
  // everything that happens after this week's games: the rest of the league, money, recovery, offers, the news
  function endWeek(S) {
    const notes = [];
    if (S.week >= 1) {
      const rd = rounds()[S.week - 1], r = GM.rng(`${S.seed}|league|${S.week}`);
      rd.forEach(([h, a]) => {
        if (h === 0 || a === 0) return;
        const H = S.teams[h], A = S.teams[a], lam = (x, y) => 1.35 * Math.exp((x - y) / 15);
        const gh = poisson(r, lam(H.str + 2, A.str)), ga = poisson(r, lam(A.str, H.str + 2));
        H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
        if (gh > ga) { H.w++; H.p += 3; A.l++; } else if (gh < ga) { A.w++; A.p += 3; H.l++; } else { H.d++; A.d++; H.p++; A.p++; }
      });
      S.teams.slice(1).forEach((t, k) => { t.str = r1(t.str + (r() - 0.5) * 0.4 + (S.week === 21 && r() < 0.3 ? 1 : 0)); });
    }
    // money in and out
    const L = LEVELS[S.lv], wages = r1(wageBill(S) / 1000);
    S.cash = r1(S.cash - wages); book(S, 'Wages', -wages);
    S.cash = r1(S.cash + L.tv); book(S, 'TV money', L.tv);
    if (S.sponsor) { const sp = SPONSORS[S.sponsor.id]; const last = S.results.filter(x => x.week === S.week); const v = sp.week + last.filter(x => x.res === 'W').length * (sp.win || 0); S.cash = r1(S.cash + v); book(S, 'Sponsor', v); }
    // legs and heads
    const C = COACHES[S.coach] || {};
    S.squad.forEach(x => {
      x.fit = clamp(x.fit + 15 + (C.fit || 0), 0, 100);
      if (x.inj) x.inj--;
      if (S.coach === 'sergeant') x.mor = clamp(x.mor - 1, 0, 100);
      if (C.hugs) x.mor = clamp(x.mor + 1, 0, 100);
      if (C.smile) x.mor = clamp(x.mor + C.smile, 0, 100);
      x.mor = clamp(x.mor + (70 - x.mor) * 0.05, 0, 100);
      const last = x.rt.length && S.results.length && S.results[S.results.length - 1].week === S.week ? x.rt[x.rt.length - 1] : null;
      if (last != null) x.value = r1(Math.max(0.3, x.value * (1 + (last - 6.5) * 0.03 * (S.coach === 'youth' && isYoung(P(S, x)) ? 2 : 1))));
      x.value = r1(x.value + (fairValue(ovr(P(S, x))) - x.value) * 0.04);
    });
    // the owner's other worries (the fans first: at zero after this week's games, they force you out)
    if (S.fans <= 0) { S.over = 'fans'; notes.push('📣 The fans have had enough. The supporters’ trust has forced you to sell the club.'); }
    if (S.owner === 'crypto') { const r2 = rng(S, 'moon'), v = r1(r2() < 0.5 ? 1 + r2() * 4 : -(1 + r2() * 3.5)); S.cash = r1(S.cash + v); book(S, 'MoonDoge', v); if (Math.abs(v) >= 3.5) notes.push(v > 0 ? `🚀 MoonDoge mooned: +£${v}m!` : `📉 MoonDoge rugged: −£${-v}m.`); }
    // at 100 heat there's no investigation: you're simply out
    if (S.heat >= 100 && !S.over) { S.over = 'expelled'; notes.push('⚖️ You’ve failed the league’s fit and proper persons test. You’re banned from owning a club.'); }
    S.heat = clamp(S.heat - 2, 0, 100);
    S.fans = clamp(S.fans + (S.fans < 55 ? 1 : -0.3), 0, 100);
    if (S.ignoredCap && S.owner !== 'petro' && wageBill(S) / 1000 > L.cap) { S.heat = clamp(S.heat + 2, 0, 100); }
    if (S.cash < 0) { S.heat = clamp(S.heat + 1, 0, 100); S.fans = clamp(S.fans - 1, 0, 100); }
    if (!S.over) investigate(S, notes);
    if (S.cash < -30 && !S.over) { S.over = 'bankrupt'; notes.push('🏦 The bank’s pulled the plug. The club’s gone into administration.'); }
    if (S.rel <= 10 && S.coach) { notes.push(`🧢 ${COACHES[S.coach].name} has had enough of you and walked out. Hire a new coach.`); S.coach = null; }
    S.cashLog.push(S.cash);
    if (S.over) { S.news.push(...notes); return notes; }
    // the next week
    S.week++;
    if (S.week > WEEKS) { S.over = 'done'; return notes; }
    if (windowOpen(S)) incomingOffers(S, notes);
    S.offers = S.offers.filter(o => o.week >= S.week - 1);
    if (S.week % 6 === 0) S.free = freeAgents(S);
    events(S, notes);
    if (S.week === 19 || S.week === 4) notes.push(S.week === 19 ? '🪟 The January window is open (until week 22).' : '🪟 The summer window has shut.');
    if (S.week === 23) notes.push('🪟 The window has shut.');
    if (S.week === 3 || S.week === 22) notes.push('⏰ It’s DEADLINE DAY! Prices are down 15%; last chance to do business.');
    S.news.push(...notes);
    return notes;
  }
  function poisson(r, l) { let k = 0, p = Math.exp(-l), s = p; const u = r(); while (u > s && k < 9) { k++; p *= l / k; s += p; } return k; }

  // the league notices: the higher the heat, the likelier a knock on the door
  function investigate(S, notes) {
    if (S.heat < 50) return;
    const r = rng(S, 'inv');
    if (r() > (S.heat - 40) / 120) return;
    if (S.heat >= 80 && r() < 0.6) { S.teams[0].ded += 6; S.heat -= 45; notes.push('⚖️ The league’s investigation found “irregularities”: a SIX-POINT DEDUCTION.'); }
    else if (S.heat >= 65 && r() < 0.5) { S.embargo = 1; S.heat -= 30; notes.push('⚖️ The league has slapped a transfer embargo on you: no signings next window.'); }
    else { const f = 2 + r.int(5); S.cash = r1(S.cash - f); book(S, 'Fines', -f); S.heat -= 20; notes.push(`⚖️ The league fines you £${f}m for “financial irregularities”.`); }
    S.fans = clamp(S.fans - 5, 0, 100);
  }

  /* ---------------------------------------------------------------- transfers */
  function freeAgents(S) {
    const pool = poolFor(S.lv), r = GM.rng(`${S.seed}|free|${S.week}`), mine = new Set(S.squad.map(x => x.k));
    return r.shuffle(pool.filter(p => !mine.has(p.pk) && ovr(p) <= 72 && ovr(p) >= 55)).slice(0, 8).map(p => p.pk);
  }
  // your bid for a player: accepted, countered or rejected
  function bid(S, k, fee) {
    const p = byPk(k), ask = askPrice(S, p), r = GM.rng(`${S.seed}|bid|${k}|${S.week}|${Math.round(fee * 10)}`);
    if (!windowOpen(S)) return { res: 'shut' };
    if (S.embargo && S.week >= 19) return { res: 'embargo' };
    if (fee >= ask) return { res: 'accept', ask };
    if (fee >= ask * 0.8) return { res: 'counter', counter: r1(Math.max(fee + 0.5, (fee + ask) / 2 * (1 + r() * 0.08))), ask };
    return { res: 'reject', ask };
  }
  // personal terms: what he wants a week (£k), and whether he'll take your offer
  const demand = (S, p) => Math.round(wageFor(ovr(p)) * (1 + (position(S) > 12 ? 0.1 : 0)));
  function terms(S, p, offer) {
    const d = demand(S, p);
    if (offer >= d) return true;
    if (offer < d * 0.85) return false;
    return GM.rng(`${S.seed}|terms|${p.pk}|${S.week}|${offer}`)() < (offer - d * 0.85) / (d * 0.15);
  }
  const capRoom = (S, extra) => wageBill(S) / 1000 + extra / 1000 <= LEVELS[S.lv].cap || S.ignoredCap || S.owner === 'petro';
  // sign him (fee agreed and terms accepted): loans pay a tenth of his value and he goes back in the summer
  function sign(S, k, fee, wage, loan = false) {
    const p = byPk(k);
    if (S.squad.length >= SQUAD_MAX) return 'Your squad’s full (26). Sell someone first.';
    if (!capRoom(S, wage)) return 'cap';
    if (S.cash - fee < -10) return 'The bank won’t lend you any more.';
    S.cash = r1(S.cash - fee); book(S, loan ? 'Loan fees' : 'Transfers in', -fee);
    const x = mkPlayer(p, { wage, value: loan ? fairValue(ovr(p)) : Math.max(fee, 0.5), loan, joined: S.week, paid: fee, mor: 80 });
    S.squad.push(x);
    S.fans = clamp(S.fans + (ovr(p) >= 80 ? 6 : ovr(p) >= 74 ? 3 : 1), 0, 100);
    S.shortlist = S.shortlist.filter(s => s !== k);
    S.free = S.free.filter(s => s !== k);
    S.news.push(`✍️ ${p.name} ${loan ? 'joins on loan' : `signs for ${fee ? '£' + fee + 'm' : 'free'}`} (£${wage}k a week).`);
    return true;
  }
  // sell (to an offer) or let go
  function sell(S, i, fee, to) {
    const x = S.squad[i];
    if (!x || x.loan || S.squad.length <= SQUAD_MIN) return false;
    S.cash = r1(S.cash + fee); book(S, 'Transfers out', fee);
    S.squad.splice(i, 1);
    S.xi = null;
    S.offers = S.offers.filter(o => o.k !== x.k);
    S.fans = clamp(S.fans - (ovr(P(S, x)) >= 78 ? 5 : 0), 0, 100);
    S.news.push(`👋 ${P(S, x).name} sold to ${to} for £${fee}m.`);
    return true;
  }
  const releaseCost = (S, x) => r1(x.wage * Math.max(0, WEEKS - S.week) / 1000 * 0.5);
  function release(S, i) {
    const x = S.squad[i];
    if (!x || x.loan || S.squad.length <= SQUAD_MIN) return false;
    const c = releaseCost(S, x);
    S.cash = r1(S.cash - c); book(S, 'Pay-offs', -c);
    S.squad.splice(i, 1); S.xi = null;
    S.news.push(`📄 ${P(S, x).name} released (£${c}m pay-off).`);
    return true;
  }
  // rival clubs come in for your players: more for the listed, the in-form and the stars
  function incomingOffers(S, notes) {
    const r = rng(S, 'offers');
    S.squad.forEach(x => {
      if (x.loan || S.offers.some(o => o.k === x.k)) return;
      const p = P(S, x), o = ovr(p), f = formBonus(x);
      const chance = (x.listed ? 0.4 : 0.05) + (f > 1 ? 0.08 : 0) + (o >= 80 ? 0.06 : 0);
      if (r() > chance) return;
      const clubs = S.teams.slice(1).filter(t => Math.abs(t.str - o) <= 8), club = clubs.length ? r.pick(clubs) : r.pick(S.teams.slice(1));
      const fee = r1(x.value * (x.listed ? 0.75 + r() * 0.3 : 1.1 + r() * 0.45) * (deadlineDay(S) ? 1.15 : 1) * (S.owner === 'nerd' ? 1.2 : 1) * (S.coach === 'dealer' ? 1.15 : 1));
      S.offers.push({ k: x.k, club: club.name, fee, week: S.week });
      notes.push(`📨 ${club.name} bid £${fee}m for ${p.name}.`);
    });
  }

  /* ---------------------------------------------------------------- the inbox: decisions, mostly dodgy */
  const SPONSORS = {
    safe: { icon: '🏦', name: 'A boring building society', text: '£0.35m a week, every week.', week: 0.35 },
    bonus: { icon: '🍔', name: 'A burger chain', text: '£0.15m a week, plus £0.6m for every win.', week: 0.15, win: 0.6 },
    crypto: { icon: '🪙', name: 'MoonDoge Coin (definitely legit)', text: '£0.7m a week. The league will have questions.', week: 0.7, heat: 25, fans: -6 },
  };
  function sponsorEvent() {
    return { id: 'sponsor', title: '🤝 Shirt sponsor', body: 'Three companies want their name on your shirt this season.', need: true,
      choices: Object.entries(SPONSORS).map(([id, s]) => ({ label: `${s.icon} ${s.name}`, sub: s.text, fx: S => { S.sponsor = { id }; if (s.heat) S.heat = clamp(S.heat + s.heat, 0, 100); if (s.fans) S.fans = clamp(S.fans + s.fans, 0, 100); return `${s.name} it is.`; } })) };
  }
  function coachQuitEvent() {
    return { id: 'coach', title: '🧢 Hire a head coach', body: 'You need a head coach. Here’s who’s available.', need: true, hire: true, choices: [] };
  }
  // random events, a third of weeks or so; each is a choice (the dodgy option is usually tempting)
  const EVENTS = [
    { id: 'accounts', when: S => S.cash < 15, title: '🧾 Creative accounting', body: 'Your accountant has an idea: sell the club car park to your other company for £12m. It’s… legal-ish.',
      choices: [{ label: 'Do it', sub: '+£12m · lots of heat', fx: S => { S.cash += 12; book(S, 'Car park sale', 12); S.heat += 30; return 'The car park now belongs to you. Twice.'; } }, { label: 'Don’t', sub: 'Keep it clean', fx: () => 'Your accountant looks disappointed.' }] },
    { id: 'nephew', title: '👦 Your nephew', body: 'Your sister says your nephew is “basically pro level” and wants a contract. £20k a week.',
      choices: [{ label: 'Sign him', sub: 'Family first · £20k a week · the fans laugh', fx: S => { S.nephew = (S.nephew || 0) + 1; S.squad.push({ k: '__nephew' + S.nephew, nephew: true, g: 'M', fit: 100, mor: 99, wage: 20, value: 0.1, inj: 0, ban: 0, yc: 0, rt: [], apps: 0, gl: 0, as: 0, listed: false, loan: false, joined: S.week }); S.fans -= 4; return 'He’s got his own parking space already.'; } },
        { label: 'Say no', sub: 'Christmas will be awkward', fx: () => 'Your sister isn’t speaking to you.' }] },
    { id: 'referee', title: '🎤 Press conference', body: 'The papers want a quote about the referees. Your media team is begging you to be boring.',
      choices: [{ label: 'Blast the refs', sub: 'Players fired up · a fine', fx: S => { S.squad.forEach(x => { x.mor = clamp(x.mor + 6, 0, 100); }); S.cash -= 0.5; book(S, 'Fines', -0.5); S.heat += 8; return '“Absolute disgrace.” £0.5m fine; the dressing room loved it.'; } },
        { label: 'Be boring', sub: 'Nothing happens', fx: () => 'You said “we go again”. Nobody remembers it.' }] },
    { id: 'water', when: S => fixture(S) && fixture(S).home && S.teams[fixture(S).opp].str >= 78, title: '🚿 The groundsman', body: 'Big game at home. The groundsman could “accidentally” leave the sprinklers on all night. Their passers will hate it.',
      choices: [{ label: 'Leave them on', sub: 'Their team −2 this week · heat', fx: S => { S.watered = true; S.heat += 10; return 'The pitch is a swamp. Oops.'; } }, { label: 'Play fair', sub: '', fx: () => 'Sprinklers off. How noble.' }] },
    { id: 'leak', title: '📰 A rival’s star', body: 'You could leak a fake story that a rival’s best player wants to join you. It’d unsettle them for weeks.',
      choices: [{ label: 'Leak it', sub: 'A random top-half rival −2 · heat', fx: S => { const t = table(S).filter(x => !x.you).slice(0, 10), v = t[S.week % t.length]; S.teams[v.i].str -= 2; S.heat += 12; return `${v.name}’s star is “unsettled”. Their form drops.`; } }, { label: 'Don’t', sub: '', fx: () => 'Probably for the best.' }] },
    { id: 'heli', when: S => S.fans < 50, title: '🚁 Win the fans back', body: 'Your PR team suggests you land a helicopter on the pitch before the next home game. With free pies.',
      choices: [{ label: 'Helicopter!', sub: '£1m · fans +10', fx: S => { S.cash -= 1; book(S, 'Stunts', -1); S.fans += 10; return 'The pies were cold but the fans loved it.'; } }, { label: 'No', sub: '', fx: () => 'The helicopter stays in the hangar.' }] },
    { id: 'stadium', title: '🏟️ Naming rights', body: 'A company will pay £8m to rename your stadium “The ToiletRollDirect.com Arena”.',
      choices: [{ label: 'Take the money', sub: '+£8m · fans −10', fx: S => { S.cash += 8; book(S, 'Naming rights', 8); S.fans -= 10; return 'Welcome to the ToiletRollDirect.com Arena.'; } }, { label: 'Tradition matters', sub: 'fans +3', fx: S => { S.fans += 3; return 'The fans sing your name. Once.'; } }] },
    { id: 'loan', title: '🏝️ A loan from yourself', body: 'You could lend the club £15m from your “offshore” account. Nobody needs to know where it came from.',
      choices: [{ label: 'Lend it', sub: '+£15m · heat', fx: S => { S.cash += 15; S.ownerLoan = (S.ownerLoan || 0) + 15; book(S, 'Owner loan', 15); S.heat += 25; return 'The money arrives from a Pacific island.'; } }, { label: 'No', sub: '', fx: () => 'Probably wise.' }] },
    { id: 'envelope', when: S => windowOpen(S), title: '✉️ The agent', body: 'An agent says he can get you 20% off any signing this window. He just needs a brown envelope.',
      choices: [{ label: 'Hand it over', sub: '£1m · 20% off fees this window · heat', fx: S => { S.cash -= 1; book(S, 'Agent “fees”', -1); S.discount = S.week; S.heat += 15; return 'Envelope delivered. Nobody saw. Probably.'; } }, { label: 'No', sub: '', fx: () => 'He says you’ll regret it.' }] },
    { id: 'bustup', title: '🥊 Training ground bust-up', body: 'Two players had a fight at training. The coach wants them fined; the dressing room wants it forgotten.',
      choices: [{ label: 'Fine them', sub: '+£0.2m · morale down', fx: S => { S.cash += 0.2; S.squad.slice(0, 6).forEach(x => { x.mor = clamp(x.mor - 6, 0, 100); }); S.rel += 5; return 'Fined. The coach is happy, they aren’t.'; } }, { label: 'Let it go', sub: 'Coach unhappy', fx: S => { S.rel -= 6; return 'The coach thinks you’re soft.'; } }] },
    { id: 'party', title: '🎉 The Christmas party', body: 'The squad want a Christmas party. In Dubai. You’re paying.', when: S => S.week >= 14 && S.week <= 18,
      choices: [{ label: 'Pay for it', sub: '£1.5m · morale +10', fx: S => { S.cash -= 1.5; book(S, 'Christmas party', -1.5); S.squad.forEach(x => { x.mor = clamp(x.mor + 10, 0, 100); }); return 'What happens in Dubai… ended up on the front pages. Morale’s great though.'; } }, { label: 'Pub quiz instead', sub: 'Morale −4', fx: S => { S.squad.forEach(x => { x.mor = clamp(x.mor - 4, 0, 100); }); return 'They came 4th. Nobody’s happy.'; } }] },
    { id: 'ticket', title: '🎟️ Ticket prices', body: 'Your finance director wants to put ticket prices up 30%.',
      choices: [{ label: 'Up they go', sub: '+£3m now · fans −8', fx: S => { S.cash += 3; book(S, 'Ticket rise', 3); S.fans -= 8; return '“Greedy” is trending in your town.'; } }, { label: 'Freeze them', sub: 'Fans +4', fx: S => { S.fans += 4; return 'A rare round of applause for the owner.'; } }] },
  ];
  function events(S, notes) {
    // a star wants a new deal; an unhappy one wants out
    const r = rng(S, 'ev');
    const sad = S.squad.find(x => x.mor < 30 && !x.loan && !x.nephew && ovr(P(S, x)) >= 72 && !x.wantsOut);
    if (sad) { sad.wantsOut = true; S.inbox.push({ id: 'out:' + sad.k, title: '😠 Transfer request', body: `${P(S, sad).name} isn’t happy (morale ${Math.round(sad.mor)}) and has asked to leave.`, need: true,
      choices: [{ label: 'Promise him games', sub: 'Morale +25, but he’ll want to start', fx: S => { const x = S.squad.find(y => y.k === sad.k); if (x) { x.mor = clamp(x.mor + 25, 0, 100); x.wantsOut = false; } return 'He’ll give it a go.'; } },
        { label: 'Put him on the list', sub: 'Offers will come in', fx: S => { const x = S.squad.find(y => y.k === sad.k); if (x) x.listed = true; return 'He’s up for sale.'; } }] }); }
    const greedy = S.squad.find(x => !x.loan && !x.nephew && formBonus(x) >= 1.5 && !x.newDeal && x.apps >= 5);
    if (greedy && r() < 0.5) { greedy.newDeal = true; const rise = Math.round(greedy.wage * 0.4); S.inbox.push({ id: 'deal:' + greedy.k, title: '✍️ Contract talks', body: `${P(S, greedy).name} has been brilliant and his agent wants a 40% rise (+£${rise}k a week).`, need: true,
      choices: [{ label: 'Pay him', sub: `+£${rise}k a week · morale up`, fx: S => { const x = S.squad.find(y => y.k === greedy.k); if (x) { x.wage += rise; x.mor = clamp(x.mor + 15, 0, 100); } return 'He’s signed a new deal.'; } },
        { label: 'No chance', sub: 'Morale −20', fx: S => { const x = S.squad.find(y => y.k === greedy.k); if (x) x.mor = clamp(x.mor - 20, 0, 100); return 'His agent is “disappointed”.'; } }] }); }
    if (S.week === 19) S.inbox.push({ id: 'board', title: '📊 Half-way', body: `Half the season gone: you’re ${ord(position(S))}. The bank manager has been in touch about your £${S.cash}m.`, choices: [{ label: 'OK', fx: () => 'Onwards.' }] });
    if (r() < 0.33) {
      const seen = new Set(S.seenEv || []), opts = EVENTS.filter(e => !seen.has(e.id) && (!e.when || e.when(S)));
      if (opts.length) { const e = opts[r.int(opts.length)]; S.seenEv = [...seen, e.id]; S.inbox.push({ id: e.id, title: e.title, body: e.body, need: true, choices: e.choices }); }
    }
  }
  // answer an inbox item (choices are kept as functions only in memory: we look them up again by id)
  function answer(S, id, k) {
    const item = S.inbox.find(m => m.id === id);
    if (!item) return null;
    const choices = choicesFor(S, item);
    const c = choices[k];
    if (!c) return null;
    const heat0 = S.heat, note = c.fx(S);
    if (S.owner === 'local' && S.heat > heat0) S.fans -= Math.round((S.heat - heat0) * 0.5);  // the fans hear about it
    S.heat = clamp(S.heat, 0, 100); S.fans = clamp(S.fans, 0, 100); S.rel = clamp(S.rel, 0, 100);
    S.inbox = S.inbox.filter(m => m !== item);
    S.news.push(`${item.title}: ${note}`);
    return note;
  }
  // inbox items are saved as data; their choices come from here
  function choicesFor(S, item) {
    if (item.id === 'sponsor') return sponsorEvent(S).choices;
    if (item.choices && item.choices.length && typeof item.choices[0].fx === 'function') return item.choices;
    const e = EVENTS.find(x => x.id === item.id);
    if (e) return e.choices;
    // rebuilt after a reload: the per-player ones
    const [kind, k] = item.id.split(':');
    const find = () => S.squad.find(y => y.k === k);
    if (kind === 'out') return [{ label: 'Promise him games', sub: 'Morale +25', fx: () => { const x = find(); if (x) { x.mor = clamp(x.mor + 25, 0, 100); x.wantsOut = false; } return 'He’ll give it a go.'; } }, { label: 'Put him on the list', sub: 'Offers will come in', fx: () => { const x = find(); if (x) x.listed = true; return 'He’s up for sale.'; } }];
    if (kind === 'deal') return [{ label: 'Pay him', sub: '+40% wages', fx: () => { const x = find(); if (x) { x.wage = Math.round(x.wage * 1.4); x.mor = clamp(x.mor + 15, 0, 100); } return 'He’s signed a new deal.'; } }, { label: 'No chance', sub: 'Morale −20', fx: () => { const x = find(); if (x) x.mor = clamp(x.mor - 20, 0, 100); return 'His agent is “disappointed”.'; } }];
    if (item.id === 'board') return [{ label: 'OK', fx: () => 'Onwards.' }];
    return [{ label: 'OK', fx: () => '' }];
  }
  // hire a coach (sacking the old one costs his compensation)
  const sackCost = S => (S.coach ? r1(COACHES[S.coach].wage * 30 / 1000 + 1) : 0);
  function hire(S, id, sacking) {
    if (sacking && S.coach) { GM.store.set('owner:sacked', (GM.store.get('owner:sacked', 0) || 0) + 1); const c = sackCost(S); S.cash = r1(S.cash - c); book(S, 'Compensation', -c); S.news.push(`🧢 ${COACHES[S.coach].name} sacked (£${c}m compensation).`); S.fans = clamp(S.fans + 3, 0, 100); }
    S.coach = id; S.rel = 70; S.bounce = 2;
    S.inbox = S.inbox.filter(m => m.id !== 'coach');
    S.news.push(`🧢 ${COACHES[id].name} is your new head coach.`);
  }
  const coachOffer = (S, n = 3) => GM.rng(`${S.seed}|coaches|${S.week}|${(S.news || []).length}`).shuffle(Object.keys(COACHES).filter(k => k !== S.coach)).slice(0, n);
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

  // the nephew isn't in the player data, so he gets a stand-in
  const NEPHEW = { pk: '__nephew', name: 'Your Nephew', goals: 0, ast: 0, apps: 1, poss: ['CM'], pos: 'M', clubs: [], nat: null, first: GM.currentSeason, last: GM.currentSeason, hon: {} };
  const baseByPk = GM.anyByPk;
  GM.anyByPk = k => (typeof k === 'string' && k.startsWith('__nephew') ? { ...NEPHEW, pk: k } : baseByPk(k));
  const baseWorth = GM.mbWorth;
  GM.mbWorth = p => (p && typeof p.pk === 'string' && p.pk.startsWith('__nephew') ? 0.5 : baseWorth(p));

  GM.owner = { WEEKS, N, LEVELS, FORMATIONS, COACHES, OWNERS, SITUATIONS, STYLES, TALKS, SPONSORS, CUP, WINDOWS, SQUAD_MIN, SQUAD_MAX, clubOffers, legacy, profit, skim,
    ovr, wageFor, fairValue, askPrice, ownerOf, canLoan, loanFee, create, rounds, fixture, cupTie, cupWeek, windowOpen, deadlineDay, nextWindow,
    eff, available, pickXI, readyXI, lines, strength, teamOvr, wageBill, table, position, scoreOf, formBonus,
    startMatch, stepMatch, halfTime, sub, autoSub, coachSubs, endMatch, simMatch, endWeek, bid, demand, terms, capRoom, sign, sell, release, releaseCost,
    answer, choicesFor, hire, sackCost, coachOffer, freeAgents, ord, book };
})();

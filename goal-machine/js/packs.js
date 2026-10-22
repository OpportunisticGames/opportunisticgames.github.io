/* Goal Machine – packs: player cards you finish piece by piece, and the Packed XI you build from finished cards.
   Every player with 50+ PL apps is a card: 🟫 Bronze (1 piece), ⚪ Silver (2), 🟡 Gold (3), 🟣 Legend (5) or 💎 Icon (7),
   by how good he was (GM.cardRating; Hall of Famers are always Icons). Pieces come from packs and from signing him in a draft, once a
   day per player, so the stars that turn up all the time still take a while. From Silver up, signings can only fill a
   card to one piece short: the last has to come from a pack (c.k counts a card's pack pieces; five packed pieces also
   finish a Legend). The Packed XI is the best XI of finished cards, with its own leaderboard.
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
    i: { name: 'Icon', icon: '💎', need: 7, odds: 1 },
  };
  const ORDER = ['b', 's', 'g', 'l', 'i'];
  const hi = t => t === 'l' || t === 'i';  // the top two: the big reveal when they come out of a pack
  // 5.34.1: a card's tier comes from a rating, not just fame (tools/card_rating.js is the same sum, for checking lists).
  // The rating adds up how long he played (less for each extra season), what he produced per game for his position,
  // PL titles and top-four seasons (less for squad players), Champions Leagues, World Cups, Golden Boots and the
  // Player of the Year awards. 💎 Icons are the Hall of Fame plus the six best-rated others; below them, each position
  // gets the same share of each tier (45 Legend, 190 Gold, 500 Silver), so there are keeper and defender Legends too.
  const U = 'Manchester United', A = 'Arsenal', C = 'Chelsea', L = 'Liverpool', MC = 'Manchester City', T = 'Tottenham Hotspur', N = 'Newcastle United', AV = 'Aston Villa', LE = 'Leeds United';
  const TOP4 = [[U, AV, 'Norwich City', 'Blackburn Rovers'], [U, 'Blackburn Rovers', N, A], ['Blackburn Rovers', U, 'Nottingham Forest', L], [U, N, L, AV], [U, N, A, L], [A, U, L, C], [U, A, C, LE], [U, A, LE, L], [U, A, L, LE], [A, L, U, N], [U, A, N, C], [A, C, U, L], [C, A, U, 'Everton'], [C, U, L, A], [U, C, L, A], [U, C, A, L], [U, L, C, A], [C, U, A, T], [U, C, MC, A], [MC, U, A, T], [U, MC, C, A], [MC, L, C, A], [C, MC, A, U], ['Leicester City', A, T, MC], [C, T, MC, L], [MC, U, T, L], [MC, L, C, T], [L, MC, U, C], [MC, U, L, C], [MC, L, C, T], [MC, A, U, N], [MC, A, L, AV], [L, A, MC, C]];
  // PFA Players' Player and FWA Footballer of the Year, 1993 on
  const AWARDS = ['Paul McGrath', 'Eric Cantona', 'Alan Shearer', 'Les Ferdinand', 'Alan Shearer', 'Dennis Bergkamp', 'David Ginola', 'Roy Keane', 'Teddy Sheringham', 'Ruud van Nistelrooy', 'Thierry Henry', 'Thierry Henry', 'John Terry', 'Steven Gerrard', 'Cristiano Ronaldo', 'Cristiano Ronaldo', 'Ryan Giggs', 'Wayne Rooney', 'Gareth Bale', 'Robin van Persie', 'Gareth Bale', 'Luis Suárez', 'Eden Hazard', 'Riyad Mahrez', "N'Golo Kanté", 'Mohamed Salah', 'Virgil van Dijk', 'Kevin De Bruyne', 'Kevin De Bruyne', 'Mohamed Salah', 'Erling Haaland', 'Phil Foden', 'Mohamed Salah',
    'Chris Waddle', 'Alan Shearer', 'Jürgen Klinsmann', 'Eric Cantona', 'Gianfranco Zola', 'Dennis Bergkamp', 'David Ginola', 'Roy Keane', 'Teddy Sheringham', 'Robert Pires', 'Thierry Henry', 'Thierry Henry', 'Frank Lampard', 'Thierry Henry', 'Cristiano Ronaldo', 'Cristiano Ronaldo', 'Steven Gerrard', 'Wayne Rooney', 'Scott Parker', 'Robin van Persie', 'Gareth Bale', 'Luis Suárez', 'Eden Hazard', 'Jamie Vardy', "N'Golo Kanté", 'Mohamed Salah', 'Raheem Sterling', 'Jordan Henderson', 'Rúben Dias', 'Mohamed Salah', 'Erling Haaland', 'Phil Foden', 'Mohamed Salah'];
  const AW = new Map(); AWARDS.forEach(n => AW.set(n, (AW.get(n) || 0) + 1));
  const top4 = p => { let n = 0; for (const [c, ys] of Object.entries(p.stints)) for (const y of ys) { const t = TOP4[y - 1992]; if (t && t.includes(c)) n++; } return n; };
  const seasons = p => { const ys = new Set(); Object.values(p.stints).forEach(x => x.forEach(y => ys.add(y))); return ys.size || (p.last - p.first + 1) || 1; };
  GM.cardRating = p => {
    const g = p.goals, a = p.ast, n = p.apps, h = p.hon, t4 = top4(p);
    const reg = Math.max(0.15, Math.min(1, n / (seasons(p) * 30))) ** 2;  // a regular, or a squad player
    const pg = p.pos === 'F' ? (g + 0.5 * a) / n : p.pos === 'M' ? (g + 0.8 * a) / n : p.pos === 'D' ? (g + a) / n : p.cs / n;
    const base = { F: 0.45, M: 0.25, D: 0.08, G: 0.3 }[p.pos];  // about a good regular's rate
    const out = p.pos === 'F' ? g + 0.5 * a : p.pos === 'M' ? (g + 0.8 * a) * 1.4 : p.pos === 'D' ? (g + a) * 0.6 : p.cs * 1.2;
    return 7 * Math.sqrt(Math.min(n, 450)) + out * Math.min(1.6, Math.max(0.6, pg / base))
      + (p.pos === 'D' ? 3 * Math.sqrt(Math.min(n, 500)) + reg * ((h.P || 0) * 8 + t4 * 5) : 0) + reg * ((h.P || 0) * 14 + t4 * 7)
      + (h.C || 0) * 14 + (h.W || 0) * 18 + (h.B || 0) * 30 + (AW.get(p.name) || 0) * 45 + (h.H ? 120 : 0);
  };
  const TIER = new Map(), POOL = { b: [], s: [], g: [], l: [], i: [] }, Q = new Map();
  GM.players.forEach(p => Q.set(p, GM.cardRating(p)));
  const byQ = (a, b) => Q.get(b) - Q.get(a);
  GM.players.filter(p => p.hon.H).concat(GM.players.filter(p => !p.hon.H).sort(byQ).slice(0, 6)).forEach(p => TIER.set(p.pk, 'i'));
  const rest = GM.players.filter(p => !TIER.has(p.pk)), share = { l: 45 / rest.length, g: 190 / rest.length, s: 500 / rest.length };
  for (const pos of 'GDMF') {
    const g = rest.filter(p => p.pos === pos).sort(byQ), n = g.length;
    const cut = { l: Math.round(n * share.l), g: Math.round(n * (share.l + share.g)), s: Math.round(n * (share.l + share.g + share.s)) };
    g.forEach((p, i) => TIER.set(p.pk, i < cut.l ? 'l' : i < cut.g ? 'g' : i < cut.s ? 's' : 'b'));
  }
  GM.players.forEach(p => POOL[TIER.get(p.pk)].push(p));
  // the tiers before 5.34.1 (by fame), only to keep cards finished then finished now
  const OLD = new Map();
  GM.players.slice().sort((a, b) => b.fame - a.fame).forEach((p, i) => OLD.set(p.pk, p.hon.H || i < 25 ? 'l' : i < 225 ? 'g' : i < 725 ? 's' : 'b'));
  GM.TIERS = TIERS;
  GM.cardTier = p => TIER.get(p.pk) || 'b';
  // 🌍 countries: each one's best-known player is its foil No. 1 card, and its five best known (fewer for a small country)
  // are its set in the Album; a set of three or more pays a Nations pack when you've finished every card in it
  const NO1 = new Map(), SETS = {};
  GM.players.slice().sort((a, b) => b.fame - a.fame).forEach(p => {
    if (!p.nat) return;
    if (!NO1.has(p.nat)) NO1.set(p.nat, p.pk);
    (SETS[p.nat] = SETS[p.nat] || []).length < 5 && SETS[p.nat].push(p);
  });
  GM.isNo1 = p => !!p && NO1.get(p.nat) === p.pk;
  GM.NATION_SETS = SETS;
  const SET_MIN = 3;
  GM.tierCounts = () => Object.fromEntries(ORDER.map(t => [t, POOL[t].length]));

  const load = () => {
    const c = GM.store.get('cards', null) || { p: {}, packs: 0, daily: '', seen: {}, seenDay: '', opened: 0, best: 0 };
    if (!c.extra) c.extra = [];  // special packs earned (Legends)
    if (!c.k) c.k = {};          // pack pieces per card
    if (c.v !== 2) {             // from 5.14 a card needs a pack piece: cards finished before keep their place
      for (const [pk, n] of Object.entries(c.p)) if (n >= TIERS[TIER.get(pk) || 'b'].need) c.k[pk] = c.k[pk] || 1;
      c.v = 2;
    }
    if (c.v === 2) {             // 5.34.1's new tiers: a card you'd finished stays finished, whatever its tier is now
      c.fin = {};
      for (const [pk, n] of Object.entries(c.p)) { const o = OLD.get(pk) || 'b'; if (n >= TIERS[o].need && (o === 'b' || (c.k[pk] || 0) >= 1)) c.fin[pk] = 1; }
      c.v = 3;
    }
    if (!c.fin) c.fin = {};
    if (c.seenDay !== GM.today()) { c.seen = {}; c.seenDay = GM.today(); }
    return c;
  };
  const save = c => { checkSets(c); GM.store.set('cards', c); };
  // a country set just finished: a Nations pack (sets you'd already finished before 5.33: up to three packs at once)
  function checkSets(c) {
    const was = c.sets || null; c.sets = was || [];
    const fresh = Object.keys(SETS).filter(n => SETS[n].length >= SET_MIN && !c.sets.includes(n) && SETS[n].every(p => done(c, p)));
    if (!fresh.length) return;
    c.sets = c.sets.concat(fresh);
    const give = was ? fresh : fresh.slice(0, 3);
    setTimeout(() => {
      if (!was && fresh.length > 1) { GM.toast(`🌍 You’ve already finished <b>${fresh.length} country sets</b>: ${give.length} Nations packs for you`, 3600); GM.givePack(give.length, 'country sets', 'nations'); return; }
      give.forEach((n, i) => setTimeout(() => { GM.toast(`${GM.flag(n)} <b>${GM.esc(n)}</b> set complete! A 🌍 Nations pack`, 3200); GM.givePack(1, `${n} set`, 'nations'); }, i * 3400));
    }, 1500);
  }
  GM.nationSets = () => { const c = load(); return Object.keys(SETS).filter(n => SETS[n].length >= SET_MIN).map(n => ({ nat: n, cards: SETS[n], have: SETS[n].filter(p => done(c, p)).length, no1: SETS[n][0], done: (c.sets || []).includes(n) }))
    .sort((a, b) => b.have / b.cards.length - a.have / a.cards.length || b.cards.length - a.cards.length); };
  const need = p => TIERS[GM.cardTier(p)].need;
  const packed = (c, p) => c.k[p.pk] || 0;
  // finished: all the pieces, and (Silver and up) at least one of them from a pack
  // (5.36.2: a card that went up a tier in 5.35, a Legend that's now an Icon, needs its extra pieces like any other: the owner's
  // call. Cards that went down still have the pieces, so they stay finished by themselves.)
  const done = (c, p) => (c.p[p.pk] || 0) >= need(p) && (GM.cardTier(p) === 'b' || packed(c, p) >= 1);
  // 5.39.2: a card worth showing off that you've finished, for the pitch (draft.js): Gold, Legend or Icon (its tier), or
  // a country's Nº1 (whatever its tier): { t, no1 }, or null (the save is read at most once a second: the draft asks for
  // every slot on every redraw)
  let ownC = null, ownT = 0;
  GM.cardOwned = p => {
    if (!p || !p.pk || !TIER.has(p.pk)) return null;
    const t = GM.cardTier(p), no1 = GM.isNo1(p);
    if (!no1 && !'gli'.includes(t)) return null;
    if (!ownC || Date.now() - ownT > 1000) { ownC = load(); ownT = Date.now(); }
    return done(ownC, p) ? { t, no1 } : null;
  };
  // the most signings can add: one short of full until a pack piece is in
  const gameCap = (c, p) => (GM.cardTier(p) === 'b' || packed(c, p) >= 1 ? need(p) : need(p) - 1);
  GM.cardPieces = p => load().p[p.pk] || 0;
  GM.cardPackPieces = p => load().k[p.pk] || 0;
  GM.cardState = p => { const c = load(); return { tracked: TIER.has(p.pk), t: GM.cardTier(p), have: c.p[p.pk] || 0, need: need(p), pack: packed(c, p), done: done(c, p) }; };
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
    legends: { name: 'Promotion Pack', sub: () => 'Choose a Legend, plus four Silver or better', pool: () => null },
    // one for each way of earning a pack, so you can see what it was for: how it looks (badge) and what's in it
    // (n pieces; the last `up` of them at least tier `min`; wild = always a wildcard)
    daily: { name: 'Daily Pack', badge: '🗓️', sub: () => 'Your free pack for today', pool: () => null },
    level: { name: 'Level Up Pack', badge: '⬆️', sub: () => 'Five pieces: two Silver or better', pool: () => null, min: 's', up: 2 },
    badge: { name: 'Badge Pack', badge: '🏅', sub: () => 'Five pieces and a wildcard', pool: () => null, wild: 'pick' },
    dailies: { name: 'Daily Hat-Trick Pack', badge: '🎩', sub: () => 'Three dailies in a day: one Gold or better', pool: () => null, min: 'g', up: 1 },
    royale: { name: 'Royale Pack', badge: '👑', sub: () => 'Gold or better, and a wildcard', pool: () => null, min: 'g', up: 1, wild: 'pick' },
    legendary: { name: 'Legendary Pack', badge: '🌟', sub: () => 'A Legend or better, Gold all through, a wildcard, and something from the vault', pool: () => null, min: 'g', up: 5, wild: 'pick', top: 'l' },
    season: { name: 'Season Pack', badge: '🏆', sub: () => 'A season reward: two Gold or better', pool: () => null, min: 'g', up: 2 },
    mission: { name: 'Mission Pack', badge: '🎯', sub: () => 'All three missions: Silver or better and a wildcard', pool: () => null, min: 's', up: 3, wild: 'pick' },
    fresh: { name: 'Fresh Pack', badge: '🆕', sub: () => 'Traded in from your duplicate pile: five cards you haven’t finished', pool: () => null, fresh: true },
    referral: { name: 'Referral Pack', badge: '🤝', sub: () => 'For bringing a mate: three Gold or better and a wildcard', pool: () => null, min: 'g', up: 3, wild: 'pick' },
    chaos: { name: 'CHAOS Pack', badge: '🌪️', sub: () => 'Anything could be in here: 3 to 7 pieces', pool: () => null, chaos: true },
  };
  GM.PACKS = PACKS;
  // each pack's colour on the effects layer (the charge, the tear, the sparks)
  const GLOW = { standard: 0xffe14a, legends: 0xe879f9, legendary: 0xfacc15, season: 0xf59e0b, mission: 0x34d399, nations: 0x60a5fa, matchday: 0xfde047, daily: 0x6ee7b7, level: 0x93c5fd, badge: 0xfbbf24, dailies: 0xf472b6, royale: 0xfde047, chaos: 0xff5a2d };
  // today's free pack is themed when something's on
  const dailyType = () => (GM.intlBreak && GM.intlBreak() ? 'nations' : GM.matchToday && GM.matchToday() ? 'matchday' : 'daily');
  const xType = x => (x && typeof x === 'object' ? x.t : x), xWhy = x => (x && typeof x === 'object' ? x.why : '');
  const nextType = c => (c.daily !== GM.today() ? dailyType() : c.extra.length ? (PACKS[xType(c.extra[0])] ? xType(c.extra[0]) : 'standard') : c.packs > 0 ? 'standard' : null);
  // why you've got it (shown when you open it)
  const nextWhy = c => (c.daily !== GM.today() ? 'Free every day' : c.extra.length ? xWhy(c.extra[0]) : '');
  GM.nextPackWhy = () => nextWhy(load());
  GM.nextPackType = () => nextType(load());
  const packFace = (type, big) => {
    const P = PACKS[type], f = type === 'matchday' && P.fx(), [, bg, fg] = f ? clubCol(GM.favClub() || f.home) : [];
    const badge = type === 'nations' ? `<span class="pf-badge">${GM.flag(P.nat())}</span>` : type === 'matchday' ? '<span class="pf-badge">🏟️</span>' : type === 'legends' ? '<span class="pf-badge">🟣</span>' : P.badge ? `<span class="pf-badge">${P.badge}</span>` : '';
    return `<div class="po-foil pk-${type}${big ? '' : ' small'}"${f ? ` style="--pk1:${bg};--pk2:${fg}"` : ''}>${badge}<b>GOAL</b><span>MACHINE</span><i>${P.name.toUpperCase()}</i></div>`;
  };

  // packs waiting: the free daily one, specials and earned ones
  GM.packsWaiting = () => { const c = load(); return c.packs + c.extra.length + (c.daily !== GM.today() ? 1 : 0); };
  GM.givePack = function (n, why, type = 'standard') {
    const c = load();
    if (type === 'standard') c.packs += n; else for (let i = 0; i < n; i++) c.extra.push({ t: type, why: why || '' });
    save(c);
    if (why) setTimeout(() => { GM.toast(`🎁 <b>+${n} ${type === 'standard' ? 'pack' : PACKS[type].name}${n > 1 ? 's' : ''}</b> · ${why}`, 2600); GM.sound.play('packget'); }, 900);
    if (GM.FX && GM.FX.preload) GM.FX.preload(['trophy']);
    GM.packDots();
  };
  GM.packDots = () => GM.$$('.pack-count').forEach(el => { const n = GM.packsWaiting(); el.textContent = n; el.hidden = !n; });

  // a piece for each player you sign (once a day each); called when a draft finishes
  GM.cardsFromDraft = function (xi) {
    const c = load(), finished = [], waiting = [];
    xi.forEach(p => {
      if (!p || !TIER.has(p.pk) || c.seen[p.pk]) return;
      c.seen[p.pk] = 1;
      const was = done(c, p), had = c.p[p.pk] || 0, cap = gameCap(c, p);
      c.p[p.pk] = Math.min(cap, had + 1);
      if (!was && done(c, p)) finished.push(p);
      else if (c.p[p.pk] === cap && had < cap && cap < need(p)) waiting.push(p);  // all but the pack piece
    });
    save(c);
    finished.filter(p => GM.cardTier(p) !== 'b').slice(0, 2).forEach((p, i) =>
      setTimeout(() => GM.toast(`🧩 ${TIERS[GM.cardTier(p)].icon} <b>${GM.esc(p.name)}</b> card complete!`, 2600), 3400 + i * 2800));
    waiting.slice(0, 2).forEach((p, i) =>
      setTimeout(() => GM.toast(`🎁 ${TIERS[GM.cardTier(p)].icon} <b>${GM.esc(p.name)}</b> just needs a piece from a pack`, 2600), 3400 + (finished.length + i) * 2800));
    updateXI();
    return finished;
  };

  /* ---------------------------------------------------------------- the Packed XI */
  GM.packedXI = function (stat = 'goals') {
    const c = load(), key = GM.STATS[stat].key;
    const xi = GM.dreamXI(GM.players.filter(p => done(c, p)), key);
    // 🌍 the nation bonus (goals): +3 for every teammate after the first from the same country
    const by = {}; xi.forEach(x => { if (x.player && x.player.nat) by[x.player.nat] = (by[x.player.nat] || 0) + 1; });
    const nats = Object.entries(by).filter(([, k]) => k >= 2).sort((a, b) => b[1] - a[1]);
    const bonus = stat === 'goals' ? nats.reduce((t, [, k]) => t + (k - 1) * 3, 0) : 0;
    return { xi, base: xi.reduce((t, s) => t + (s.player ? s.player[key] : 0), 0), bonus, nats, get total() { return this.base + this.bonus; }, n: xi.filter(s => s.player).length };
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
  // 5.34: packs deal at random, so cards you've finished turn up again as your album fills (duplicates: they go on your
  // ♻️ duplicate pile, 1/2/3/5 points by tier, and 100 points trades in for a 🆕 Fresh pack of cards you haven't finished).
  // Before, packs dodged finished cards, which made the album fill too fast. `fresh` keeps the old dodging.
  const DUPE = { b: 1, s: 2, g: 3, l: 5, i: 8 }, DUPE_PACK = 100;
  GM.DUPE_PACK = DUPE_PACK;
  GM.dupePile = () => load().dupes || 0;
  GM.tradeDupes = function () {
    const c = load(); if ((c.dupes || 0) < DUPE_PACK) return false;
    c.dupes -= DUPE_PACK; save(c); GM.givePack(1, 'your duplicate pile', 'fresh'); GM.buzz('confirm'); return true;
  };
  function pickFrom(c, r, t, theme, taken, fresh) {
    const tiers = ORDER.slice(0, ORDER.indexOf(t) + 1).reverse();
    for (const k of tiers) {
      const list = theme ? theme.filter(p => GM.cardTier(p) === k) : POOL[k];
      if (!list.length) continue;
      if (k !== 'b' && r() < 0.35) {  // now and then, a card that's all but done and only needs a pack piece
        const wait = list.filter(q => (c.p[q.pk] || 0) > 0 && !packed(c, q) && !done(c, q) && !taken.has(q.pk));
        if (wait.length) return r.pick(wait);
      }
      if (fresh) { for (let i = 0; i < 40; i++) { const q = r.pick(list); if (!done(c, q) && !taken.has(q.pk)) return q; } }
      for (let i = 0; i < 20; i++) { const q = r.pick(list); if (!taken.has(q.pk)) return q; }
    }
    return r.pick(theme && theme.length ? theme : POOL.b);
  }
  const WILDS = {
    pick: { icon: '🤝', name: 'Pick one', text: 'Choose one of these three', w: 60 },
    scout: { icon: '🔭', name: 'Scout’s tip', text: 'A piece for one of your cards that’s nearly there', w: 30 },
    legend: { icon: '🟣', name: 'Legend’s choice', text: 'Choose one of these three Legends', w: 10 },
  };
  GM.PACK_WILDS = WILDS;
  // (a 🔭 Scout's Tip, prizes.js: only cards you've started; none yet and it's a standard pack instead, never a wasted piece)
  GM.scoutOptions = () => { const w = wildOptions(load(), GM.rng('scout|' + Date.now()), 'scout', null, new Set()); return w.kind === 'scout' ? w.options : []; };
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
    const P = PACKS[type], theme = P.pool(), taken = new Set(), out = [], n = P.chaos ? 3 + r.int(5) : 5;
    for (let i = 0; i < n; i++) {
      let t = r.weighted(ORDER, k => TIERS[k].odds);
      if ((i === n - 1 || type === 'legends') && t === 'b') t = r.weighted(['s', 'g', 'l', 'i'], k => TIERS[k].odds);
      // a pack's promise: its last few pieces at least a tier (Silver for levelling up, Gold for Royale…)
      if (P.min && i >= n - P.up && ORDER.indexOf(t) < ORDER.indexOf(P.min)) t = r.weighted(ORDER.slice(ORDER.indexOf(P.min)), k => TIERS[k].odds);
      if (P.chaos && r() < 0.15) t = ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(t) + 1)];  // CHAOS: now and then a tier up
      if (P.top && i === n - 1 && ORDER.indexOf(t) < ORDER.indexOf(P.top)) t = r() < 0.2 ? 'i' : P.top;  // the Legendary pack's promise: a Legend (1 in 5 an Icon)
      const p = pickFrom(c, r, t, theme, taken, P.fresh);
      taken.add(p.pk);
      out.push({ p, t: GM.cardTier(p) });
    }
    // a wildcard: in 3 packs out of 10 (the Legends pack always has Legend's choice)
    const force = GM.packForce || {};
    const any = () => r.weighted(Object.keys(WILDS), k => WILDS[k].w);
    const kind = type === 'legends' ? 'legend' : force.wild || (P.wild ? any() : r() < 0.3 ? any() : null);
    if (kind && (force.wild !== 'none' || type === 'legends')) {
      const w = wildOptions(c, r, kind, theme, taken);
      if (w.options.length) out[type === 'legends' ? n - 1 : r.int(n - 1)] = { wild: w };
    }
    // the best one last, for the reveal (a wildcard just before the best, a Legend's choice last)
    const rank = x => (x.wild ? (x.wild.kind === 'legend' ? 9 : 2.5) : ORDER.indexOf(x.t));
    return out.sort((a, b) => rank(a) - rank(b));
  }
  function apply(c, x) {
    if (done(c, x.p)) {  // a duplicate: onto the pile
      x.spare = true; x.dupe = DUPE[GM.cardTier(x.p)] || 1;
      const was = c.dupes || 0; c.dupes = was + x.dupe;
      if (was < DUPE_PACK && c.dupes >= DUPE_PACK) setTimeout(() => GM.toast(`♻️ Your duplicate pile is full: trade it in for a 🆕 Fresh pack (Locker → Cards)`, 3600), 2500);
      return;
    }
    x.firstPack = !packed(c, x.p);
    c.p[x.p.pk] = Math.min(need(x.p), (c.p[x.p.pk] || 0) + 1);
    c.k[x.p.pk] = packed(c, x.p) + 1;
    x.have = c.p[x.p.pk]; x.need = need(x.p); x.pack = c.k[x.p.pk]; x.finished = done(c, x.p);
  }
  // a piece from a pack for one card (the packs and Scout's tip use this; so do the tests)
  GM.cardPackPiece = function (p) { const c = load(), x = { p, t: GM.cardTier(p) }; apply(c, x); save(c); updateXI(); return x; };
  GM.openPack = function () {
    const c = load(), type = nextType(c), why = nextWhy(c);
    if (!type) return null;
    if (c.daily !== GM.today()) c.daily = GM.today();
    else if (c.extra.length) c.extra.shift();
    else c.packs--;
    const before = GM.packedXI().total;
    const rng = GM.rng(GM.newSeed()), cards = draw(c, rng, type);
    cards.forEach(x => { if (!x.wild) apply(c, x); });
    const bonus = GM.packBonus ? GM.packBonus(type, rng) : null;  // now and then: a Locker item, a spin or season XP as well (prizes.js)
    c.opened = (c.opened || 0) + 1;
    save(c);
    const res = { type, why, cards, before, bonus };
    if (bonus && GM.grant) GM.grant(bonus, null, true);
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
    GM.checkGame('pack', c.opened, { legend: res.cards.some(x => hi(x.t)), finished: res.cards.filter(x => x.finished).map(x => x.t),
      xi: px.n, type: res.type, wild: res.cards.some(x => x.chose) });
    GM.packDots();
  }

  /* ---------------------------------------------------------------- the cards */
  const short = n => (n.length <= 12 ? n : n.split(' ').slice(-1)[0]);  // the full name if it's short, else the surname
  GM.cardHtml = function (x, opts = {}) {
    const back = opts.back !== false;
    const backHtml = back ? `<div class="pc-back"><span class="pcb-ring"><b>GM</b></span></div>` : '';
    if (x.wild) {
      const W = WILDS[x.wild.kind];
      return `<div class="pcard tier-w"><div class="pc-inner">${backHtml}<div class="pc-front pc-wild"><span class="pw-joker">🃏</span><b>WILDCARD</b><span class="pw-kind">${W.icon} ${W.name}</span></div></div></div>`;
    }
    const p = x.p, t = x.t || GM.cardTier(p), n = TIERS[t].need, have = x.have != null ? x.have : (x.spare ? n : 0);
    // Silver and up: the last pip is the pack piece (a diamond), the rest are any piece
    const gift = t !== 'b', pk = x.spare ? 1 : (x.pack != null ? x.pack : 0), fill = x.spare ? n : have;
    const anyOn = Math.min(gift ? n - 1 : n, gift && pk >= 1 ? Math.max(0, fill - 1) : fill);
    const pips = Array.from({ length: n }, (_, i) => gift && i === n - 1
      ? `<i class="gift${pk >= 1 ? ' on' : ''}${pk >= 1 && x.firstPack && opts.fresh && !x.spare ? ' new' : ''}"></i>`
      : `<i class="${i < anyOn ? 'on' : ''}${i === anyOn - 1 && !x.firstPack && opts.fresh && !x.spare ? ' new' : ''}"></i>`).join('');
    const no1 = GM.isNo1(p);
    return `<div class="pcard tier-${t}${no1 ? ' no1' : ''}${x.finished ? ' finished' : ''}${opts.cls ? ' ' + opts.cls : ''}"${opts.attr || ''}><div class="pc-inner">${backHtml}
      <div class="pc-front"><span class="pc-sheen"></span>${no1 ? `<span class="pc-bigflag" aria-hidden="true">${GM.flag(p.nat)}</span><span class="pc-no1tag">Nº1</span><span class="pc-foil"></span><span class="pc-glare"></span>` : ''}
        <div class="pc-top"><b class="pc-num">${p.goals}</b><small>GLS</small><span class="pc-pos">${p.poss[0]}</span><span class="pc-flag">${GM.flag(p.nat)}</span></div>
        <div class="pc-photo">${GM.avatar(p, 'lg')}</div>
        <div class="pc-name${short(p.name).length > 13 ? ' xxlong' : short(p.name).length > 10 ? ' xlong' : short(p.name).length > 7 ? ' long' : ''}">${GM.esc(short(p.name))}</div>
        <div class="pc-stats"><span><b>${p.ast}</b>AST</span><span><b>${p.apps}</b>APP</span><span><b>${p.first}</b>DEB</span></div>
        <div class="pc-foot"><span class="pc-club">${GM.esc(GM.clubShort(p.main))}</span><span class="pc-pips">${x.spare ? `<em>♻️ +${x.dupe || DUPE[t] || 1}</em>` : pips}</span></div>
        ${x.finished ? '<span class="pc-done">COMPLETE</span>' : ''}${x.chose ? `<span class="pc-chose">${WILDS[x.chose].icon}</span>` : ''}</div></div></div>`;
  };

  /* ---------------------------------------------------------------- opening */
  // light rays; tap the pack, it charges up and the top tears off; the cards rise out and fan into a hand, face down
  // (Gold and Legend backs glow); they flip one by one, best last; a wildcard asks you to choose; a Legend walks out.
  // Tap during the reveal to speed it up.
  GM.packOpening = function (onClose) {
    const type = GM.nextPackType(), why = GM.nextPackWhy();
    if (!type) return;
    const P = PACKS[type];
    const el = document.createElement('div');
    el.className = 'pack-open pko-' + type;
    el.innerHTML = `<div class="po-rays"></div><div class="po-flash"></div>
      <div class="po-stage"><div class="po-pack" role="button" aria-label="Open the pack"><div class="po-strip"></div>${packFace(type, true)}</div>
        <p class="po-name">${P.name}<small>${GM.esc(P.sub())}</small>${why ? `<em class="po-why">🎁 ${GM.esc(why)}</em>` : ''}</p><p class="po-hint">👆 Tap to open</p></div>
      <div class="po-cards"></div><div class="po-walk"></div><div class="po-choice"></div><div class="po-fx"></div><div class="po-actions"></div>`;
    document.body.appendChild(el);
    GM.sound.play('drumroll');
    const later = (ms, f) => setTimeout(() => { if (el.isConnected) f(); }, ms);
    let opened = false, fast = false, res = null;
    const FX = GM.FX, glow = GLOW[type] || 0xffe14a, mid = n => { const r = el.querySelector(n).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    if (FX) FX.preload(['trophy']);
    el.querySelector('.po-pack').onclick = () => {
      if (opened) return; opened = true;
      if (FX) { FX.ready().then(() => FX.raise(16000, true)); FX.charge(...mid('.po-pack'), 900, glow); }
      el.classList.add('charging'); GM.sound.play('charge', 1); later(300, () => GM.sound.play('charge', 2)); later(600, () => GM.sound.play('charge', 3));
      later(900, () => {
        res = GM.openPack();
        if (!res) { el.remove(); return; }
        el.classList.remove('charging'); el.classList.add('torn'); GM.sound.play('crack'); GM.buzz(60);
        if (FX) { const [x, y] = mid('.po-pack'); FX.shockwave(x, y, glow, 2.2); FX.sparks(x, y - 60, { n: 50, speed: 520, tint: glow, up: 200 }); if (type === 'chaos') FX.confetti(el, 90); }
        later(700, deal);
      });
    };
    el.addEventListener('click', e => { if (el.classList.contains('dealt') && !e.target.closest('.po-choice, .po-actions')) fast = true; });
    function deal() {
      el.classList.add('dealt');
      const box = el.querySelector('.po-cards');
      box.innerHTML = res.cards.map((x, i) => GM.cardHtml(x, { fresh: true, attr: ` style="--i:${i}"` })).join('');
      const cards = [...box.children];
      GM.sound.play('deal', cards.length);
      // the backs of the good ones glow before they turn
      later(700, () => {
        res.cards.forEach((x, i) => { if (x.wild) cards[i].classList.add('hint-w'); else if (x.t === 'g' || hi(x.t)) cards[i].classList.add('hint-' + (x.t === 'i' ? 'l' : x.t)); });
        if (res.cards.some(x => x.wild || x.t === 'g' || hi(x.t))) GM.sound.play('shimmer', res.cards.some(x => hi(x.t) && !x.wild));
      });
      later(1300, () => flip(0));
      function flip(i) {
        if (i >= cards.length) return finish();
        const x = res.cards[i];
        const go = () => {
          cards[i].classList.add('flipped');
          GM.sound.play(x.wild ? 'wild' : hi(x.t) ? 'fanfare' : x.t === 'g' ? 'jackpot' : x.t === 's' ? 'silver' : 'card');
          if (x.finished && !x.wild && !x.spare && x.t !== 'b') later(hi(x.t) ? 900 : 350, () => GM.sound.play('snap'));
          if (x.t === 'g' || hi(x.t)) burst(cards[i], x.t);
          if (x.wild) return later(700, () => choose(x, i, () => later(500, () => flip(i + 1))));
          later(fast ? 180 : hi(x.t) ? 1500 : x.t === 'g' ? 1000 : 600, () => flip(i + 1));
        };
        if (hi(x.t) && !x.wild) walkout(x.p, go); else go();
      }
      // a wildcard: three cards face up, tap one
      function choose(x, i, then) {
        const W = WILDS[x.wild.kind], box2 = el.querySelector('.po-choice'), c = load();
        box2.innerHTML = `<div class="pch-head"><span>${W.icon}</span><b>${W.name}</b><small>${W.text}</small></div>
          <div class="pch-cards">${x.wild.options.map((p, k) => GM.cardHtml({ p, t: GM.cardTier(p), have: c.p[p.pk] || 0, pack: packed(c, p) }, { back: false, attr: ` data-pick="${k}"` })).join('')}</div>`;
        el.classList.add('choosing'); GM.sound.play('box');
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
            if (x.t === 'g' || hi(x.t)) burst(nc, x.t);
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
        `<span class="pw-club">${GM.clubChip(p.main, true)}</span>`, '<span class="pw-big">🟣</span><small>LEGEND</small>'];
      steps.forEach((s, i) => later(i * step, () => { w.innerHTML = `<div class="pw-step">${s}</div>`; GM.sound.play('walkstep', i); GM.buzz(20); }));
      later(steps.length * step, () => { el.classList.remove('walking'); w.innerHTML = ''; then(); });
    }
    // sparks for Gold, confetti for a Legend
    function burst(card, t) {
      if (FX) {
        const r = card.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const tint = t === 'i' ? 0x67e8f9 : hi(t) ? 0xe879f9 : 0xffe14a; FX.shockwave(x, y, tint, t === 'i' ? 2.2 : hi(t) ? 1.8 : 1); FX.sparks(x, y, { n: t === 'i' ? 90 : hi(t) ? 60 : 30, tint: t === 'i' ? 0xcffafe : hi(t) ? 0xf0abfc : 0xffe14a }); FX.shimmer(card, tint);
        if (hi(t)) { FX.fireworks(el, t === 'i' ? 7 : 4); FX.lottie('trophy', { x, y: r.top - 40, w: 140, cls: 'po-trophy' }); }
      }
      const fx = el.querySelector('.po-fx'), r = card.getBoundingClientRect(), n = hi(t) ? 36 : 18;
      const cols = t === 'i' ? ['#a5f3fc', '#67e8f9', '#e0f2fe', '#fff'] : hi(t) ? ['#f0abfc', '#a855f7', '#fde047', '#fff'] : ['#fde047', '#facc15', '#fff'];
      for (let k = 0; k < n; k++) {
        const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * (hi(t) ? 160 : 90);
        s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${cols[k % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
        fx.appendChild(s); setTimeout(() => s.remove(), 1100);
      }
    }
    function finish() {
      const left = GM.packsWaiting(), fin = res.cards.filter(x => x.finished).length;
      el.classList.add('over');
      el.querySelectorAll('.po-cards .pcard').forEach((card, i) => { const x = res.cards[i]; if (x && x.p) card.dataset.psheet = x.p.pk; });  // tap a card to see the player
      if (res.better) GM.sound.play('sting'); else if (fin) GM.sound.play('good');
      if (res.bonus && GM.rewardLabel) { GM.sound.play('jackpot'); GM.buzz('win'); }
      el.querySelector('.po-actions').innerHTML = `${res.bonus && GM.rewardLabel ? `<div class="po-bonus"><small>🎁 Bonus in this pack</small><b>${GM.esc(GM.rewardLabel(res.bonus))}</b></div>` : ''}<p class="po-better">${fin ? `🧩 ${fin} card${fin > 1 ? 's' : ''} finished` : '🧩 Pieces added'}${res.better ? ` · 🃏 Packed XI up to <b>${res.better.toLocaleString()}</b> goals` : ''}</p>
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
      ? `<div class="slot filled tier-${GM.cardTier(s.player)}" data-psheet="${GM.esc(s.player.pk)}" title="${GM.esc(s.player.name)}">${GM.avatar(s.player)}<span class="slot-name">${GM.esc(s.player.name.split(' ').slice(-1)[0])}</span><span class="slot-goals">${s.player.goals}</span><span class="slot-pos">${s.pos}</span></div>`
      : `<div class="slot empty"><span class="pos pos-${GM.GROUP[s.pos]}">${s.pos}</span></div>`;
    return `<div class="pitch packed"><div class="pitch-lines"></div><div class="shape">${(px.base != null ? px.base : px.total).toLocaleString()} goals${px.bonus ? ` + ${px.bonus} 🌍` : ""} · ${px.n}/11</div>
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
  // ♻️ the duplicate pile: points from duplicates, traded in for a Fresh pack
  function dupeBox() {
    const n = GM.dupePile(), full = n >= DUPE_PACK;
    return `<div class="dupe-box ${full ? 'full' : ''}"><span>♻️</span><span><b>Duplicate pile: ${Math.min(n, DUPE_PACK)}/${DUPE_PACK}</b>
      <small>Duplicates from packs: 🟫 1 · ⚪ 2 · 🟡 3 · 🟣 5 · 💎 8 points. ${DUPE_PACK} trade in for a 🆕 Fresh pack of cards you haven’t finished${n > DUPE_PACK ? ` (${n - DUPE_PACK} more waiting)` : ''}</small>
      <div class="bar"><i style="width:${Math.min(100, n / DUPE_PACK * 100)}%"></i></div></span>${full ? '<button class="btn small" data-dupes>Trade in</button>' : ''}</div>`;
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-dupes]'); if (!b) return; if (GM.tradeDupes()) { GM.toast('🆕 A Fresh pack for your duplicates!', 2600); const box = b.closest('.dupe-box'); if (box) box.outerHTML = dupeBox(); } });
  // 🌍 the Album's country sets: each country's five best known (its No. 1 first). Tap one to see its cards above.
  function countrySets() {
    const sets = GM.nationSets(), fin = sets.filter(x => x.done).length;
    return `<details class="set nat-sets"><summary><span>🌍 Country sets <small class="muted">${fin}/${sets.length} done · a free Nations pack each</small></span></summary>
      <p class="muted small">Each country’s set is its five best-known players. Finish all five cards for a 🌍 Nations pack. Tap a country to see its cards.</p>
      <div class="nat-list">${sets.map(x => `<button class="nat-row ${x.done ? 'done' : ''}" data-cnat="${GM.esc(x.nat)}"><span class="nat-flag">${GM.flag(x.nat)}</span><span class="nat-nm"><b>${GM.esc(x.nat)}</b><small>${x.cards.map(p => GM.esc(p.name.split(' ').slice(-1)[0])).join(' · ')}</small></span><span class="nat-of">${x.done ? '✅' : `${x.have}/${x.cards.length}`}</span></button>`).join('')}</div></details>`;
  }
  // the cards on show: search by name, or a filter (started, finished, your club's, a country's set, everyone)
  const CF = { q: '', f: 'started', nat: null, tier: '' };
  const short1 = n => GM.fold(n);
  function gridHtml() {
    const c = load(), club = GM.favClub && GM.favClub(), q = short1(CF.q.trim());
    let list = q.length >= 2 ? GM.players.filter(p => p.key.includes(q))
      : CF.f === 'set' && CF.nat ? (GM.NATION_SETS[CF.nat] || [])
      : CF.f === 'club' && club ? GM.players.filter(p => p.clubs.includes(club))
      : CF.f === 'done' ? GM.players.filter(p => done(c, p))
      : CF.f === 'all' ? GM.players.slice()
      : GM.players.filter(p => c.p[p.pk]);
    if (CF.tier && !(CF.f === 'set' && CF.nat)) list = list.filter(p => GM.cardTier(p) === CF.tier);
    if (!(CF.f === 'set' && CF.nat)) list.sort((a, b) => ORDER.indexOf(GM.cardTier(b)) - ORDER.indexOf(GM.cardTier(a)) || (done(c, b) - done(c, a)) || b.fame - a.fame);
    const head = q.length >= 2 ? `${list.length} player${list.length === 1 ? '' : 's'} called “${GM.esc(CF.q.trim())}”`
      : CF.f === 'set' && CF.nat ? `${GM.flag(CF.nat)} ${GM.esc(CF.nat)}’s set: ${list.filter(p => done(c, p)).length}/${list.length} finished`
      : CF.f === 'club' && club ? `${GM.esc(club)}: ${list.filter(p => done(c, p)).length}/${list.length} finished` : '';
    const empty = q.length >= 2 ? 'Nobody by that name with 50+ PL apps.' : CF.f === 'done' ? 'No finished cards yet.' : 'No pieces yet. Open a pack, or sign players in any draft.';
    return `${head ? `<p class="cards-head">${head}</p>` : ''}${list.length ? `<div class="card-grid">${list.slice(0, 120).map(p => GM.cardHtml({ p, t: GM.cardTier(p), have: c.p[p.pk] || 0, pack: packed(c, p), finished: done(c, p) }, { back: false, attr: ` data-psheet="${GM.esc(p.pk)}"` })).join('')}</div>${list.length > 120 ? `<p class="muted center">…and ${list.length - 120} more: search for a name to find someone</p>` : ''}`
      : `<p class="muted center">${empty}</p>`}`;
  }
  const filterChips = () => {
    const club = GM.favClub && GM.favClub();
    return [['started', '✍️ Started'], ['done', '✅ Finished'], ...(club ? [['club', `🏟️ ${GM.esc(club.replace(/ (United|City|Hotspur|Wanderers|Albion|Athletic|Rovers|and Hove Albion)$/, ''))}`]] : []), ['all', '📚 All cards']]
      .map(([k, l]) => `<button class="${CF.f === k && !CF.q ? 'on' : ''}" data-cf="${k}">${l}</button>`).join('');
  };
  const redraw = () => { const g = document.getElementById('card-grid'); if (g) g.innerHTML = gridHtml(); const f = document.getElementById('card-filters'); if (f) f.innerHTML = filterChips(); };
  document.addEventListener('input', e => { if (e.target.id === 'card-q') { CF.q = e.target.value; redraw(); } });
  document.addEventListener('click', e => {
    const f = e.target.closest && e.target.closest('[data-cf]'), n = e.target.closest && e.target.closest('[data-cnat]');
    if (f) { CF.f = f.dataset.cf; CF.nat = null; CF.q = ''; const i = document.getElementById('card-q'); if (i) i.value = ''; redraw(); }
    if (n) { CF.f = 'set'; CF.nat = n.dataset.cnat; CF.q = ''; const i = document.getElementById('card-q'); if (i) i.value = ''; redraw(); const g = document.getElementById('card-search'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  GM.cardsFinished = () => { const c = load(); return GM.players.filter(p => done(c, p)).length; };
  // the finished cards themselves (Goal Royale builds its decks from them)
  GM.cardsOwned = () => { const c = load(); return GM.players.filter(p => done(c, p)); };
  // the Album's Cards section: how many of each tier you've finished, the cards you've started, and how it works
  GM.cardsSection = function (tier = '') {
    const c = load();
    CF.tier = tier;
    const counts = ORDER.map(t => [t, POOL[t].filter(p => done(c, p)).length, POOL[t].length]);
    return `<div class="tier-row">${counts.map(([t, have, all]) => `<a class="${tier === t ? 'on' : ''}" href="#/album?v=cards${tier === t ? '' : '&t=' + t}"><span>${TIERS[t].icon}</span><b>${have}<i>/${all}</i></b><em class="tr-bar"><i style="width:${all ? Math.round(have / all * 100) : 0}%"></i></em><small>${TIERS[t].name}</small><small class="tr-need">${TIERS[t].need} piece${TIERS[t].need > 1 ? 's' : ''}</small></a>`).join('')}</div>
      <details class="set how-cards"><summary><span>❓ How cards work</span></summary><ul class="how-list">
        <li>Every player with 50+ PL apps is a card: 🟫 Bronze needs 1 piece, ⚪ Silver 2, 🟡 Gold 3, 🟣 Legend 5 and 💎 Icon 7. Finished cards go into your 🃏 XI.</li>
        <li>🎁 A free pack every day: a 🌍 Nations pack in an international break, a 🏟️ Matchday pack when your club plays. A bonus pack for three daily games in a day, for every new badge and every level, and a 🟣 Legends pack when you go up a rank.</li>
        <li>🃏 Some packs hold a wildcard: pick one of three, a scout’s tip for a card that’s nearly there, or (rarely) a Legend of your choice.</li>
        <li>✍️ Signing a player in any draft gives you a piece of his card, once a day per player. From Silver up, signings fill a card to one piece short: the last one (the ◆) has to come from a pack. Bronze cards can be finished by signing alone.</li>
        <li>♻️ Packs deal at random, so cards you’ve finished come round again: duplicates go on your pile (🟫 1, ⚪ 2, 🟡 3, 🟣 5, 💎 8 points), and 100 points trade in for a 🆕 Fresh pack of cards you haven’t finished.</li></ul></details>
      ${dupeBox()}
      <div class="card-search" id="card-search"><input class="input" id="card-q" type="search" placeholder="🔎 Find a player’s card" value="${GM.esc(CF.q)}" autocomplete="off">
        <div class="seg card-filters" id="card-filters">${filterChips()}</div></div>
      <div id="card-grid">${gridHtml()}</div>
      ${countrySets()}`;
  };
})();

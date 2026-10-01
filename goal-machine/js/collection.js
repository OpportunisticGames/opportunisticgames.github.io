/* Goal Machine – the Album: players you've signed, your Dream XI, collectable sets and achievement badges */
'use strict';

(function () {
  // the Album / Purist / Players tabs, on one line, at the top of all three pages
  GM.albumTabs = on => `<div class="hard-toggle small three">${[['album', '#/album', '📒 Album'], ['purist', '#/album?b=purist', '💎 Purist'], ['players', '#/players', '📖 Players']]
    .map(([k, h, l]) => `<a class="${k === on ? 'on' : ''}" href="${h}">${l}</a>`).join('')}</div>`;
  // Two books: the Album (players with 50+ PL apps, plus badges) and the Purist collection (every PL player, filled
  // only by Purist drafts). Players are keyed "name|first season", which stays put when the weekly data refresh
  // re-orders the list; albums saved with list positions are converted once.
  const load = (book = 'album') => {
    const a = GM.store.get(book, { players: {}, ach: {}, days: [] });
    // by: the players signed in each stat's games, with how many times (so the goals Dream XI needs goals-mode signings).
    // Albums from before v4.2 didn't record the stat, so everyone collected then counts once in all three.
    if (!a.by) { const once = Object.fromEntries(Object.keys(a.players).map(k => [k, 1])); a.by = { goals: { ...once }, assists: { ...once }, apps: { ...once } }; }
    const keys = Object.keys(a.players);
    if (book === 'album' && keys.length && keys.every(k => /^\d+$/.test(k))) {
      const moved = {};
      keys.forEach(k => { const p = GM.players[+k]; if (p) moved[p.pk] = a.players[k]; });
      a.players = moved;
      GM.store.set(book, a);
    }
    return a;
  };
  const save = (a, book = 'album') => GM.store.set(book, a);
  const bookList = book => (book === 'purist' ? GM.allPlayers || [] : GM.players);
  const fmt = n => n.toLocaleString();

  /* ---------------------------------------------------------------- achievements */
  // ev: { type: 'draft', mode, stat, total, hard, xi: [players], rating, pairs, wildUsed, coinWin, bull, closeness }
  //  or { type: 'game', mode, score, extra }
  // badge categories, in the order the Album shows them
  const CATS = [['draft', '🎯 Scores'], ['squad', '🧩 Squads'], ['chaos', '🌪️ CHAOS'], ['events', '🏟️ Matchdays & breaks'], ['daily', '📅 Dailies'], ['games', '⚡ Quick games'], ['online', '🌐 Online'], ['collect', '📒 Collecting'], ['secret', '🤫 Secret']];
  // CHAOS has its own challenges, some of them secret (shown as ??? in the CHAOS list until found)
  const CAT_OF = (id, secret) => /^(cx|chaos$)/.test(id) ? 'chaos' : /^(md|ib)/.test(id) ? 'events' : secret ? 'secret' : /^daily/.test(id) ? 'daily' : /^on/.test(id) ? 'online'
    : /^(col|hofall|gball)/.test(id) ? 'collect' : /^(hop|hilo|who|grid|tally|ht|mb)/.test(id) ? 'games'
    : /^(first|contenders|invincible|relegated|chem5|hof3|wc2|club5|wild5|coin|hard|fan6|lifers|down5)$/.test(id) ? 'squad' : 'draft';
  const A = [
    // drafts
    ['first', '🥅', 'First XI', 'Finish your first draft.', e => e.type === 'draft'],
    ['ult300', '🥉', '300 Club', 'Score 300+ goals in Ultimate Wildcard.', e => ult(e, 'goals') && e.total >= 300],
    ['ult400', '🥈', '400 Club', 'Score 400+ goals in Ultimate Wildcard.', e => ult(e, 'goals') && e.total >= 400],
    ['ult500', '🥇', 'Goal Machine', 'Score 500+ goals in Ultimate Wildcard.', e => ult(e, 'goals') && e.total >= 500],
    ['ast250', '🅰️', 'Creator', 'Build an XI with 250+ assists in Ultimate Wildcard.', e => ult(e, 'assists') && e.total >= 250],
    ['apps4000', '🏃', 'Iron Men', 'Build an XI with 4,000+ apps in Ultimate Wildcard.', e => ult(e, 'apps') && e.total >= 4000],
    ['bull', '🎯', 'Bullseye', 'Hit a Target exactly.', e => e.type === 'draft' && e.bull && e.mode === 'target'],
    ['treble', '🏆', 'Treble Winners', 'Win the Treble – goals, assists and apps all within 3%.', e => e.type === 'draft' && e.treble],
    ['mystery', '🎲', 'Mystery Solved', 'Finish within 2% of a Mystery Target.', e => e.type === 'draft' && e.mode === 'mystery' && e.closeness <= 10],
    ['close', '📏', 'Near Miss', 'Finish within 2% of a Target.', e => e.type === 'draft' && e.mode === 'target' && e.closeness != null && e.closeness <= 10],
    ['contenders', '🏆', 'Title Race', 'Get a Title contenders squad rating (or better).', e => e.type === 'draft' && e.rating >= 80],
    ['invincible', '👑', 'Invincibles', 'Get an Invincibles squad rating.', e => e.type === 'draft' && e.rating >= 88],
    ['relegated', '☠️', 'Dead Rubber', 'Finish with a Relegation certainties squad. It happens.', e => e.type === 'draft' && e.rating < 55],
    ['chem5', '🤝', 'Band of Brothers', 'Have 5+ pairs of former teammates in one XI.', e => e.type === 'draft' && e.pairs >= 5],
    ['hof3', '🏛️', 'Hall of Fame XI', 'Sign 3+ Hall of Famers in one XI.', e => e.type === 'draft' && e.xi.filter(p => p.hon.H).length >= 3],
    ['wc2', '🌍', 'World Champions', 'Sign 2+ World Cup winners in one XI.', e => e.type === 'draft' && e.xi.filter(p => p.hon.W).length >= 2],
    ['club5', '🏟️', 'Club Legends', 'Have 5+ players from the same club in one XI.', e => e.type === 'draft' && maxSameClub(e.xi) >= 5],
    ['wild5', '🃏', 'Wildcard Wizard', 'Use 5 wildcards in one game.', e => e.type === 'draft' && e.wildUsed >= 5],
    ['coin', '🎲', 'Fortune Favours', 'Win a Double or Nothing coin toss.', e => e.type === 'draft' && e.coinWin],
    ['chaos', '🌪️', 'Agent of Chaos', 'Score 500+ points in Ultimate Wildcard CHAOS (goals).', e => chaos(e) && e.stat === 'goals' && e.points >= 500],
    ['hard', '🥵', 'No Clues', 'Finish a draft in Hard mode.', e => e.type === 'draft' && e.hard],
    ['fan6', '🧣', 'Proper Fan', 'Have 6+ players who played for your club in one XI (not in a Club or Matchday XI).', e => e.type === 'draft' && e.mode !== 'club' && e.mode !== 'match' && GM.favClub() && e.xi.filter(p => p.clubs.includes(GM.favClub())).length >= 6],
    ['lifers', '🗓️', 'Lifers', 'Every player in your XI had a PL career spanning 10+ seasons.', e => e.type === 'draft' && e.xi.length === 11 && e.xi.every(p => plSeasons(p) >= 10)],
    ['down5', '📉', 'Going Down', 'Have 5+ players who were relegated from the PL in one XI.', e => e.type === 'draft' && e.xi.filter(relegated).length >= 5],
    // CHAOS challenges
    ['cx1000', '💥', 'Total Anarchy', 'Score 1,000+ points in CHAOS (goals).', e => chaos(e) && e.stat === 'goals' && e.points >= 1000],
    ['cxsack', '📰', 'Vote of No Confidence', 'Get your manager sacked in CHAOS.', e => chaos(e) && (e.moments || []).includes('Manager sacked!')],
    ['cxleg', '✨', 'Once in a Lifetime', 'See a legendary CHAOS moment.', e => chaos(e) && (e.rars || []).includes('l')],
    ['cxmeter', '⚡', 'Meltdown', 'Fill the CHAOS meter 3 times in one game.', e => chaos(e) && e.bigs >= 3],
    ['cxgaffer', '👍', 'Gaffer’s Favourites', 'Sign 6+ players your manager likes in one CHAOS XI.', e => chaos(e) && e.liked >= 6],
    ['daily3', '📅', 'Regular', 'Play the Daily Ultimate 3 days in a row.', (e, a) => streak(a.days) >= 3],
    ['daily7', '🗓️', 'Season Ticket', 'Play the Daily Ultimate 7 days in a row.', (e, a) => streak(a.days) >= 7],
    // other games
    ['hop10', '🦘', 'Globetrotter', 'Make 10 hops in Club Hopper.', e => game(e, 'hopper') && e.score >= 10],
    ['hop20', '✈️', 'Frequent Flyer', 'Make 20 hops in Club Hopper.', e => game(e, 'hopper') && e.score >= 20],
    ['hilo10', '↕️', 'Streaker', 'Get 10 in a row in Higher or Lower.', e => game(e, 'hilo') && e.score >= 10],
    ['hilo25', '🔥', 'On Fire', 'Get 25 in a row in Higher or Lower.', e => game(e, 'hilo') && e.score >= 25],
    ['who3000', '🕵️', 'Detective', 'Score 3,000+ in Who Am I?', e => game(e, 'whoami') && e.score >= 3000],
    ['grid', '#️⃣', 'Full House', 'Fill a whole Club Grid.', e => game(e, 'grid') && e.extra && e.extra.full],
    ['tally700', '🔢', 'Human Calculator', 'Score 700+ in Guess the Tally.', e => game(e, 'tally') && e.score >= 700],
    ['htwin', '🃏', 'Card Sharp', 'Win a game of Hat-Trick.', e => game(e, 'hattrick') && e.extra && e.extra.won],
    ['htnil', '🤐', 'Clean Sheet', 'Make a Nil bid in Hat-Trick.', e => game(e, 'hattrick') && e.extra && e.extra.nil],
    // collecting
    ['col100', '📒', 'Scout', 'Collect 100 players.', (e, a) => Object.keys(a.players).length >= 100],
    ['col500', '🔭', 'Chief Scout', 'Collect 500 players.', (e, a) => Object.keys(a.players).length >= 500],
    ['col1000', '📚', 'Encyclopedia', 'Collect 1,000 players.', (e, a) => Object.keys(a.players).length >= 1000],
    ['hofall', '🏛️', 'Pantheon', 'Collect every Hall of Famer.', (e, a) => setDone(a, 'hof')],
    ['gball', '👟', 'Boot Room', 'Collect every Golden Boot winner.', (e, a) => setDone(a, 'boot')],
    // dailies
    ['daily14', '📆', 'Ever Present', 'Play the Daily Ultimate 14 days in a row.', (e, a) => streak(a.days) >= 14],
    ['daily30', '🏟️', 'Season Ticket Holder', 'Play the Daily Ultimate 30 days in a row.', (e, a) => streak(a.days) >= 30],
    // online (checked when a finished online game shows up: see GM.checkOnline)
    ['on1', '🌐', 'Kick-off', 'Finish your first online game.', e => e.type === 'online'],
    ['onwin', '⚔️', 'Away Win', 'Win an online game.', e => e.type === 'online' && e.won],
    ['onwin10', '🏅', 'Serial Winners', 'Win 10 online games.', (e, a) => e.type === 'online' && (a.online || {}).wins >= 10],
    ['onbeat5', '👥', 'Beat Them All', 'Beat 5 different friends online.', (e, a) => e.type === 'online' && ((a.online || {}).beat || []).length >= 5],
    ['onall', '🎮', 'All-Rounder', 'Win a Draft Duel, a Live Race and a Transfer Auction.', (e, a) => e.type === 'online' && ['duel', 'race', 'auction'].every(k => ((a.online || {}).kinds || []).includes(k))],
    ['onchaos', '🌀', 'Chaos Merchant', 'Win a CHAOS Race.', e => e.type === 'online' && e.won && e.variant === 'chaos'],
    // secrets: shown as ??? until you find them
    ['s442', '🔢', 'The Magic Number', 'Build an XI with exactly 442 goals.', e => e.type === 'draft' && e.stat === 'goals' && e.total === 442, true],
    ['saguero', '🇦🇷', 'AGÜEROOOO', 'Sign Sergio Agüero in a draft.', e => e.type === 'draft' && e.xi.some(p => p.name === 'Sergio Agüero'), true],
    ['sbus', '🚌', 'Parked the Bus', 'Finish a goals draft with under 40 goals.', e => e.type === 'draft' && e.stat === 'goals' && e.total < 40, true],
    ['sloyal', '💙', 'Club Till I Die', 'Have 8+ players from the same club in one XI.', e => e.type === 'draft' && maxSameClub(e.xi) >= 8, true],
    ['sowl', '🦉', 'Night Owl', 'Finish a draft between midnight and 4am.', e => e.type === 'draft' && new Date().getHours() < 4, true],
    ['sdown', '🪂', 'Yo-Yo Club', 'Every player in your XI was relegated from the PL at some point.', e => e.type === 'draft' && e.xi.length === 11 && e.xi.every(relegated), true],
    ['sonce', '☄️', 'One-Season Wonders', 'Have 3+ players who only had one PL season in one XI.', e => e.type === 'draft' && e.xi.filter(p => plSeasons(p) === 1).length >= 3, true],
    ['cxslip', '🍌', 'The Slip', 'Steven Gerrard finishes a CHAOS game on 0.', e => chaos(e) && (e.slots || []).some(x => x.name === 'Steven Gerrard' && x.g === 0), true],
    ['cxdilly', '🦊', 'Dilly Ding, Dilly Dong', 'Ranieri in the dugout with 3+ Leicester players.', e => chaos(e) && e.manager === 'ranieri' && e.xi.filter(p => p.clubs.includes('Leicester City')).length >= 3, true],
    ['cxfergie', '⌚', 'Fergie Time', 'Fergie in the dugout with 5+ Man Utd players.', e => chaos(e) && e.manager === 'fergie' && e.xi.filter(p => p.clubs.includes('Manchester United')).length >= 5, true],
    ['cxaliens', '🛸', 'We Are Not Alone', 'Witness an alien abduction in CHAOS.', e => chaos(e) && (e.moments || []).includes('Alien abduction'), true],
    ['cxpigeon', '🐦', 'Pigeon Fancier', 'A pigeon lands on your pitch in CHAOS.', e => chaos(e) && (e.moments || []).includes('Pitch invader'), true],
    // matchdays and international breaks (their secrets stay in their own list, as ???)
    ['mdfirst', '🏟️', 'Matchday', 'Play a Matchday XI when your club’s on.', e => md(e)],
    ['mdboth', '🤝', 'Split Loyalties', 'Sign 3+ players who played for both sides in one Matchday XI.', e => md(e) && e.clubs && e.xi.filter(p => e.clubs.every(c => p.clubs.includes(c))).length >= 3],
    ['md150', '📣', 'Twelfth Man', 'Score 150+ goals in a Matchday XI.', e => md(e) && e.total >= 150],
    ['mdseason', '🎟️', 'Season Ticket', 'Play the Matchday XI on 5 different matchdays.', (e, a) => md(e) && (a.md || []).length >= 5],
    ['mdpundit', '🔮', 'Pundit', 'Get the pre-match Footle in 3 guesses or fewer.', e => game(e, 'mfootle') && e.score >= 1 && e.score <= 3],
    ['mdderby', '🔥', 'Derby Day', 'Play a Matchday XI on derby day.', e => md(e) && e.clubs && GM.isDerby(e.clubs[0], e.clubs[1]), true],
    ['ibfirst', '🌍', 'International Duty', 'Finish an International XI during an international break.', e => intl(e)],
    ['ib250', '🌟', 'Golden Generation', 'Score 250+ goals in an International XI.', e => intl(e) && e.stat === 'goals' && e.total >= 250],
    ['ibtour', '🧳', 'World Tour', 'Build International XIs for 5 different countries.', (e, a) => intl(e) && (a.nations || []).length >= 5],
    ['ibclub', '⚔️', 'Club v Country', 'Have 3+ players from your club in an International XI.', e => intl(e) && GM.favClub() && e.xi.filter(p => p.clubs.includes(GM.favClub())).length >= 3, true],
    // Moneyball (the quick games list)
    ['mbprofit', '📈', 'In the Black', 'Finish a Moneyball season worth £150m or more.', e => game(e, 'money') && e.score >= 150],
    ['mbflip', '💎', 'Buy Low, Sell High', 'Sell a player for double what you paid in Moneyball.', e => game(e, 'money') && e.extra && e.extra.flip >= 2],
    ['mbmadrid', '📨', 'Sold to Madrid', 'Accept a big-money bid for one of your stars.', e => game(e, 'money') && e.extra && e.extra.bid],
    // Dodgy Owner
    ['mbchamp', '🏆', 'Champions!', 'Win the league as the Dodgy Owner.', e => game(e, 'owner') && e.extra && e.extra.pos === 1],
    ['mbinvincible', '🛡️', 'Invincibles', 'Go a whole Dodgy Owner season unbeaten.', e => game(e, 'owner') && e.extra && e.extra.unbeaten],
    ['mbcup', '🏆', 'Cup Run', 'Win the Cup as the Dodgy Owner.', e => game(e, 'owner') && e.extra && e.extra.cup],
    ['mbheat', '🔥', 'Under Investigation', 'Finish a Dodgy Owner season with the heat at 80 or more.', e => game(e, 'owner') && e.extra && e.extra.heat >= 80],
    ['mbclean', '😇', 'Squeaky Clean', 'Finish in the top half with no heat at all.', e => game(e, 'owner') && e.extra && e.extra.heat === 0 && e.extra.pos <= 10],
    ['mbout', '📣', 'Owner Out', 'Get forced out by your own fans.', e => game(e, 'owner') && e.extra && e.extra.sacked, true],
    ['mbdream', '🎯', 'Living the Dream', 'Achieve your owner’s ambition in Dodgy Owner.', e => game(e, 'owner') && e.extra && e.extra.amb],
    // Goal Royale (a secret game)
    ['mbroyal', '⚔️', 'First Blood', 'Win a Goal Royale battle.', e => game(e, 'royale') && e.extra && e.extra.res === 'win'],
    ['mbarena', '🦁', 'Big Time', 'Reach the Premier League arena in Goal Royale.', e => game(e, 'royale') && e.extra && e.extra.arena >= 3],
    // Reign Check (a secret game)
    ['mbreign', '👑', 'Long Live the Owner', 'Reign for a whole season in Reign Check.', e => game(e, 'reign') && e.extra && e.extra.weeks >= 38],
    ['mbstatue', '🗿', 'Statue', 'Get flattened by your own statue in Reign Check.', e => game(e, 'reign') && e.extra && e.extra.end === 'f100', true],
    // packs (the collect list)
    ['colpack', '🎁', 'Pack Opener', 'Open your first pack.', e => game(e, 'pack')],
    ['colwalk', '🚶', 'Walkout', 'Pull a Legend in a pack.', e => game(e, 'pack') && e.extra && e.extra.legend],
    ['colgold', '🟡', 'Gold Standard', 'Finish a Gold card.', () => GM.cardsDone('g') >= 1],
    ['collegend', '🟣', 'Legendary', 'Finish a Legend card.', () => GM.cardsDone('l') >= 1],
    ['colxi', '🃏', 'Fully Packed', 'Fill all 11 places in your Packed XI.', () => GM.packedXI().n === 11],
    ['ibhome', '🏴', 'Home Nations', 'Build International XIs for England, Scotland, Wales and Northern Ireland.', (e, a) => intl(e) && HOME.every(n => (a.nations || []).includes(n)), true],
  ].map(([id, icon, name, desc, test, secret]) => ({ id, icon, name, desc, test, secret: !!secret, cat: CAT_OF(id, secret) }));

  const chaos = e => e.type === 'draft' && (e.mode === 'chaos' || e.mode === 'chaosx');
  const md = e => e.type === 'draft' && e.mode === 'match';
  const intl = e => e.type === 'draft' && e.mode === 'nation';
  const HOME = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
  // PL seasons a player's career spanned (first to last season, as the CHAOS veteran bonus counts them)
  const plSeasons = p => Math.min(p.last, GM.currentSeason) - p.first + 1;
  // Clubs relegated from the PL, by the season they went down in (1992 = 1992/93). A player "went down" if his club
  // spells include that club in that season. The spells come from Transfermarkt and have gaps (Kevin Phillips has no
  // Sunderland spell), so a few relegations are missed, but none are made up.
  const DOWN = {
    1992: ['Crystal Palace', 'Middlesbrough', 'Nottingham Forest'], 1993: ['Sheffield United', 'Oldham Athletic', 'Swindon Town'],
    1994: ['Crystal Palace', 'Norwich City', 'Leicester City', 'Ipswich Town'], 1995: ['Manchester City', 'Queens Park Rangers', 'Bolton Wanderers'],
    1996: ['Sunderland', 'Middlesbrough', 'Nottingham Forest'], 1997: ['Bolton Wanderers', 'Barnsley', 'Crystal Palace'],
    1998: ['Charlton Athletic', 'Blackburn Rovers', 'Nottingham Forest'], 1999: ['Wimbledon', 'Sheffield Wednesday', 'Watford'],
    2000: ['Manchester City', 'Coventry City', 'Bradford City'], 2001: ['Ipswich Town', 'Derby County', 'Leicester City'],
    2002: ['West Ham United', 'West Bromwich Albion', 'Sunderland'], 2003: ['Leicester City', 'Leeds United', 'Wolverhampton Wanderers'],
    2004: ['Crystal Palace', 'Norwich City', 'Southampton'], 2005: ['Birmingham City', 'West Bromwich Albion', 'Sunderland'],
    2006: ['Sheffield United', 'Charlton Athletic', 'Watford'], 2007: ['Reading', 'Birmingham City', 'Derby County'],
    2008: ['Newcastle United', 'Middlesbrough', 'West Bromwich Albion'], 2009: ['Burnley', 'Hull City', 'Portsmouth'],
    2010: ['Birmingham City', 'Blackpool', 'West Ham United'], 2011: ['Bolton Wanderers', 'Blackburn Rovers', 'Wolverhampton Wanderers'],
    2012: ['Wigan Athletic', 'Reading', 'Queens Park Rangers'], 2013: ['Norwich City', 'Fulham', 'Cardiff City'],
    2014: ['Hull City', 'Burnley', 'Queens Park Rangers'], 2015: ['Newcastle United', 'Norwich City', 'Aston Villa'],
    2016: ['Hull City', 'Middlesbrough', 'Sunderland'], 2017: ['Swansea City', 'Stoke City', 'West Bromwich Albion'],
    2018: ['Cardiff City', 'Fulham', 'Huddersfield Town'], 2019: ['AFC Bournemouth', 'Watford', 'Norwich City'],
    2020: ['Fulham', 'West Bromwich Albion', 'Sheffield United'], 2021: ['Burnley', 'Watford', 'Norwich City'],
    2022: ['Leicester City', 'Leeds United', 'Southampton'], 2023: ['Luton Town', 'Burnley', 'Sheffield United'],
    2024: ['Leicester City', 'Ipswich Town', 'Southampton'],
  };
  const relegated = p => Object.entries(p.stints || {}).some(([c, ys]) => [...ys].some(y => (DOWN[y] || []).includes(c)));
  GM.relegated = relegated; GM.plSeasons = plSeasons;
  const ult = (e, stat) => e.type === 'draft' && (e.mode === 'ultimate' || e.mode === 'daily') && e.stat === stat;
  const game = (e, m) => e.type === 'game' && e.mode.replace(/h$/, '').replace(/:.*/, '') === m;
  function maxSameClub(xi) {
    const c = {};
    xi.forEach(p => p.clubs.forEach(k => { c[k] = (c[k] || 0) + 1; }));
    return Math.max(0, ...Object.values(c));
  }
  function streak(days) {
    const set = new Set(days);
    let n = 0;
    const d = new Date();
    for (;;) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!set.has(k)) break;
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  }

  /* ---------------------------------------------------------------- sets */
  const SETS = [
    { id: 'hof', icon: '🏛️', name: 'Hall of Fame', test: p => p.hon.H },
    { id: 'boot', icon: '👟', name: 'Golden Boot winners', test: p => p.hon.B },
    { id: 'wc', icon: '🌍', name: 'World Cup winners', test: p => p.hon.W },
    { id: 'cl', icon: '⭐', name: 'Champions League winners', test: p => p.hon.C },
    { id: '100', icon: '💯', name: '100 Club', test: p => p.goals >= 100 },
    { id: 'one', icon: '❤️', name: 'One-club men (150+ apps)', test: p => p.clubs.length === 1 && p.apps >= 150 },
  ];
  const setMembers = {};
  SETS.forEach(s => { setMembers[s.id] = GM.players.filter(s.test).map(p => p.id); });
  const setDone = (a, id) => setMembers[id].every(i => a.players[GM.players[i].pk]);

  function check(ev, a) {
    const fresh = [];
    for (const x of A) {
      if (a.ach[x.id]) continue;
      let ok = false;
      try { ok = x.test(ev, a); } catch (err) { ok = false; }
      if (ok) { a.ach[x.id] = GM.today(); fresh.push(x); }
    }
    return fresh;
  }

  function celebrate(fresh, newPlayers) {
    let delay = 600;
    if (fresh.length && GM.givePack) GM.givePack(fresh.length, fresh.length > 1 ? 'new badges' : 'new badge');
    if (fresh.length && GM.addXP) GM.addXP(GM.XP.badge * fresh.length);
    fresh.forEach(x => { setTimeout(() => GM.toast(`🏅 Badge unlocked: ${x.icon} <b>${x.name}</b>`, 2600), delay); delay += 2800; });
    const stars = newPlayers.filter(p => p.hon.H || p.hon.B || p.goals >= 100);
    if (stars.length) setTimeout(() => GM.toast(`📒 Collected ${stars.slice(0, 2).map(p => GM.esc(p.name)).join(' & ')}${stars.length > 2 ? ` +${stars.length - 2}` : ''}!`, 2600), delay);
  }

  /** Called when a draft finishes. Adds the XI to the album and checks badges. */
  GM.collectDraft = function (ev) {
    const a = load();
    const purist = ev.mode === 'purist', book = purist ? load('purist') : a;
    const newPlayers = [];
    const statBook = book.by[GM.STATS[ev.stat] ? ev.stat : 'goals'];
    ev.xi.forEach(p => {
      if (!purist && !GM.byPk.has(p.pk)) return;  // Extreme's lesser-known players belong to the Purist collection only
      if (!book.players[p.pk]) { book.players[p.pk] = GM.today(); newPlayers.push(p); }
      statBook[p.pk] = (statBook[p.pk] || 0) + 1;
    });
    if (ev.mode === 'daily' && !a.days.includes(GM.today())) a.days = a.days.concat(GM.today()).slice(-60);
    // the matchdays and countries you've played (for Season Ticket, World Tour and Home Nations)
    if (ev.mode === 'match' && ev.fx && !(a.md || []).includes(ev.fx)) a.md = (a.md || []).concat(ev.fx).slice(-100);
    if (ev.mode === 'nation' && ev.nat && !(a.nations || []).includes(ev.nat)) a.nations = (a.nations || []).concat(ev.nat);
    if (ev.mode === 'nation') GM.store.set('nationsPlayed', a.nations);
    if (!purist && GM.cardsFromDraft) GM.cardsFromDraft(ev.xi);
    if (GM.addXP) GM.addXP(GM.XP.draft);  // a piece of each signing's card (once a day each)
    const fresh = check({ type: 'draft', ...ev }, a);
    save(a);
    if (purist) save(book, 'purist');
    celebrate(fresh, newPlayers);
    return { newPlayers, fresh, total: Object.keys(book.players).length, book: purist ? 'purist' : 'album' };
  };

  /** Called when a finished online game shows up (the Online list or its result screen). Counts each game once. */
  GM.checkOnline = function (g, seat) {
    if (!g || !g.result || !g.code || !seat) return;
    const a = load(), o = a.online || (a.online = { rooms: [], wins: 0, beat: [], kinds: [] });
    if (o.rooms.includes(g.code)) return;
    o.rooms = o.rooms.concat(g.code).slice(-300);
    const won = g.result.winner === seat, opp = seat === 'host' ? g.guest : g.host;
    if (won) {
      o.wins++;
      if (opp && !o.beat.includes(opp)) o.beat.push(opp);
      if (!o.kinds.includes(g.kind)) o.kinds.push(g.kind);
    }
    if (GM.addXP) GM.addXP(won ? GM.XP.win : GM.XP.online);
    const fresh = check({ type: 'online', kind: g.kind, variant: g.variant, won }, a);
    save(a);
    celebrate(fresh, []);
  };

  /** Called when any other game finishes. */
  GM.checkGame = function (mode, score, extra) {
    if (GM.addXP) GM.addXP(mode === 'pack' ? GM.XP.pack : GM.XP.game);
    const a = load();
    const fresh = check({ type: 'game', mode, score, extra }, a);
    if (fresh.length) { save(a); celebrate(fresh, []); }
  };

  GM.albumSummary = function () {
    const a = load();
    return { players: Object.keys(a.players).length, badges: Object.keys(a.ach).length, totalBadges: A.length,
      purist: Object.keys(GM.store.get('purist', { players: {} }).players).length };
  };

  /* ---------------------------------------------------------------- who you pick */
  // picks: { p: { "name|first": [times offered, times signed] }, c: { club: signings } } – every draft reel counts
  GM.trackPick = function (picked, offered) {
    const t = GM.store.get('picks', { p: {}, c: {} });
    offered.forEach(p => { if (p) { const e = t.p[p.pk] || (t.p[p.pk] = [0, 0]); e[0]++; } });
    if (picked) {
      const e = t.p[picked.pk] || (t.p[picked.pk] = [1, 0]);
      e[1]++;
      picked.clubs.forEach(c => { t.c[c] = (t.c[c] || 0) + 1; });
    }
    GM.store.set('picks', t);
  };
  GM.pickCount = pk => ((GM.store.get('picks', { p: {} }).p[pk] || [0, 0]));
  const findPk = pk => GM.byPk.get(pk) || (GM.allPlayers || []).find(p => p.pk === pk);
  function picksHtml() {
    const t = GM.store.get('picks', { p: {}, c: {} }), rows = Object.entries(t.p);
    if (!rows.length) return '';
    const signed = rows.filter(([, [, n]]) => n > 0), total = signed.reduce((a, [, [, n]]) => a + n, 0);
    const list = (arr, fmtRow) => arr.map(([k, v]) => { const p = findPk(k); return p ? `<li>${GM.avatar(p)}<b>${GM.esc(p.name)}</b><span>${fmtRow(v)}</span></li>` : ''; }).join('');
    const loved = signed.slice().sort((a, b) => b[1][1] - a[1][1] || a[1][0] - b[1][0]).slice(0, 5);
    // snubbed: offered most without ever being signed
    const snubbed = rows.filter(([, [o, n]]) => n === 0 && o >= 2).sort((a, b) => b[1][0] - a[1][0]).slice(0, 5);
    const clubs = Object.entries(t.c).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return `<h3 class="section-title">📊 Your picks</h3>
      <div class="album-head"><div><b>${fmt(total)}</b><small>signings</small></div><div><b>${fmt(signed.length)}</b><small>different players</small></div></div>
      <div class="picks">
        <div><h4>❤️ Your favourites</h4><ol>${list(loved, ([o, n]) => `signed ×${n}`)}</ol></div>
        ${snubbed.length ? `<div><h4>🙅 Always snubbed</h4><ol>${list(snubbed, ([o]) => `passed over ×${o}`)}</ol></div>` : ''}
        <div><h4>🏟️ Clubs you sign from</h4><ol>${clubs.map(([c, n]) => `<li>${GM.clubChip(c)}<b>${GM.esc(c)}</b><span>${n}</span></li>`).join('')}</ol></div>
      </div>`;
  }

  /* ---------------------------------------------------------------- dream XI */
  const SLOTS = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];
  function dreamXI(have, key) {
    have = have.slice().sort((x, y) => y[key] - x[key]);
    const used = new Set();
    // fill scarcest positions first so utility players don't block them
    const order = [0, 1, 4, 5, 8, 2, 3, 6, 7, 9, 10];
    const xi = [];
    order.forEach(k => {
      const p = have.find(q => !used.has(q.id) && q.poss.includes(SLOTS[k]));
      if (p) used.add(p.id);
      xi[k] = { pos: SLOTS[k], player: p || null };
    });
    return xi;
  }
  GM.dreamXI = dreamXI;

  /* ---------------------------------------------------------------- the Album */
  // One hub for everything you collect: your level and packs at the top, then
  //   🃏 My XI    the Packed XI, from finished cards (it replaced the old Dream XI of everyone you'd signed)
  //   🧩 Cards    the cards you've started, by tier, and how cards work
  //   🏅 Badges
  //   ✍️ Signed   everyone you've signed in a draft: sets, clubs, who you pick; plus 💎 Purist and 📖 Players
  function albumHub(root, view, cat, tier, open) {
    const a = load(), l = GM.myLevel(), px = GM.packedXI(), list = GM.players;
    const VIEWS = [['xi', '🃏 My XI'], ['cards', '🧩 Cards'], ['badges', '🏅 Badges'], ['signed', '✍️ Signed']];
    if (view === 'sets' || view === 'stats') view = 'signed';
    if (!VIEWS.some(v => v[0] === view)) view = 'xi';
    if (!CATS.some(c => c[0] === cat)) cat = (CATS.find(([c]) => A.some(x => x.cat === c && !a.ach[x.id])) || CATS[0])[0];
    const has = p => !!a.players[p.pk], signed = Object.keys(a.players).length;
    const bar = (have, all) => `<div class="bar"><i style="width:${all ? have / all * 100 : 0}%"></i></div>`;
    const clubSets = GM.clubs.map(c => { const m = list.filter(p => p.clubs.includes(c)); return [c, m.filter(has).length, m.length]; })
      .sort((x, y) => y[1] / y[2] - x[1] / x[2] || y[2] - x[2]);
    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>📒 Album</h2><span class="top-btns">${GM.lbButton('packedxi')}</span></div>
      <div class="alb-head">
        <a class="alb-level" href="#/level"><span class="alb-lv-icon">${l.icon}</span><span><b>Level ${l.n}</b><small>${l.rank} · ${l.into}/${l.need} XP</small>${bar(l.into, l.need)}</span></a>
        ${GM.packBox()}</div>
      <div class="alb-stats"><a href="#/album?v=cards"><b>${fmt(GM.cardsFinished())}</b><small>cards finished</small></a><a href="#/album?v=badges"><b>${Object.keys(a.ach).length}/${A.length}</b><small>badges</small></a><a href="#/album?v=signed"><b>${fmt(signed)}</b><small>players signed</small></a></div>
      <div class="seg album-views">${VIEWS.map(([k, lab]) => `<a class="${k === view ? 'on' : ''}" href="#/album${k === 'xi' ? '' : '?v=' + k}">${lab}</a>`).join('')}</div>

      ${view === 'xi' ? `<p class="muted">Your team, built only from <b>finished cards</b>: the best player you’ve got in every position. Finish cards by opening packs and signing players. It replaced the old Dream XI, which let you use anyone you’d ever signed.</p>
        ${GM.packedPitch(px)}
        ${px.n < 11 ? `<p class="muted center small">${11 - px.n} place${11 - px.n > 1 ? 's' : ''} still empty. Finish a card in that position to fill it.</p>` : ''}
        <a class="btn ghost" href="#/leaderboard?m=packedxi">🏆 Packed XI leaderboard</a>` : ''}

      ${view === 'cards' ? GM.cardsSection(tier) : ''}

      ${view === 'badges' ? `<div class="ach-cats">${CATS.map(([c, label]) => { const lst = A.filter(x => x.cat === c); return `<a class="${c === cat ? 'on' : ''}" href="#/album?v=badges&c=${c}">${label}<small>${lst.filter(x => a.ach[x.id]).length}/${lst.length}</small></a>`; }).join('')}</div>
      <div class="ach-grid">${A.filter(x => x.cat === cat).map(x => {
          const hide = x.secret && !a.ach[x.id];
          return `<div class="ach ${a.ach[x.id] ? 'got' : ''} ${hide ? 'secret' : ''}" title="${hide ? 'A secret badge' : GM.esc(x.desc)}">
            <span class="ach-icon">${a.ach[x.id] ? x.icon : hide ? '❓' : '🔒'}</span><b>${hide ? '???' : x.name}</b><small>${hide ? 'Secret – keep playing to find it' : x.desc}</small></div>`; }).join('')}</div>` : ''}

      ${view === 'signed' ? `<p class="muted">Everyone you’ve signed in a draft: <b>${fmt(signed)}</b> of ${fmt(list.length)} players with 50+ PL apps. Stored on this device.</p>${bar(signed, list.length)}
        <div class="alb-links"><a href="#/album?b=purist">💎 Purist collection<small>every PL player, from Purist drafts</small></a><a href="#/players">📖 All players<small>who you have and haven’t signed</small></a></div>
        <h3 class="section-title">🗂️ Sets</h3>
        <div class="sets">${SETS.map(st => {
          const m = setMembers[st.id].map(i => GM.players[i]), got = m.filter(has);
          return `<details class="set"><summary><span>${st.icon} ${st.name}</span><span>${got.length}/${m.length}</span>${bar(got.length, m.length)}</summary>
            <div class="set-list">${m.sort((x, y) => y.fame - x.fame).map(p => `<span class="${has(p) ? 'have' : ''}">${has(p) ? '✅' : '▫️'} ${GM.esc(p.name)}</span>`).join('')}</div></details>`;
        }).join('')}</div>
        <details class="set clubs-block"><summary><span>🏟️ Clubs</span><span>${clubSets.filter(([, h, n]) => h === n).length}/${clubSets.length} complete</span></summary>
          <div class="sets">${clubSets.map(([c, h, n]) => `<div class="club-set">${GM.clubChip(c)}<span>${GM.esc(c)}</span><span>${h}/${n}</span>${bar(h, n)}</div>`).join('')}</div></details>
        <h3 class="section-title">📊 Who you pick</h3>${picksHtml()}` : ''}`;
    const ob = GM.$('#openpack', root);
    const reopen = () => albumHub(root, view, cat, tier, false);
    if (ob) ob.onclick = () => GM.packOpening(reopen);
    if (open && GM.packsWaiting()) GM.packOpening(reopen);
  }

  /* ---------------------------------------------------------------- album page (the Purist collection) */
  // The Album in four sections (?v=xi|badges|sets|stats), and the badges one category at a time (?c=draft …)
  GM.album = function (root, statId = 'goals', book = 'album', view = 'xi', cat = '', tier = '', open = false) {
    const purist = book === 'purist';
    if (!purist) return albumHub(root, view, cat, tier, open);
    if (purist && !GM.allPlayers) {
      root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>💎 Purist collection</h2><span></span></div><div class="loading-all"><div class="splash-bar"><i></i></div></div>`;
      GM.loadAll().then(() => { if (location.hash.includes('b=purist')) GM.album(root, statId, book); });
      return;
    }
    const a = load(book), list = bookList(book);
    const index = purist ? new Map(list.map(p => [p.pk, p])) : GM.byPk;
    const mine = Object.keys(a.players).map(k => index.get(k)).filter(Boolean);
    const has = p => !!a.players[p.pk];
    const ids = mine;
    const st = GM.STATS[statId];
    const got = a.by[statId] || {};
    const xi = dreamXI(mine.filter(p => got[p.pk]), st.key);
    const tot = xi.reduce((t, s) => t + (s.player ? s.player[st.key] : 0), 0);
    const rows = [['ST'], ['LM', 'CM', 'RM'], ['LB', 'CB', 'RB'], ['GK']];
    const rowOf = pos => rows.findIndex(r => r.includes(pos));
    const lines = [0, 1, 2, 3].map(r => xi.map((s, i) => [s, i]).filter(([s]) => rowOf(s.pos) === r));
    const slot = s => s.player
      ? `<div class="slot filled" title="${GM.esc(s.player.name)}">${GM.avatar(s.player)}<span class="slot-name">${GM.esc(s.player.name.split(' ').slice(-1)[0])}</span><span class="slot-goals">${fmt(s.player[st.key])}</span><span class="slot-pos">${s.pos}</span>${got[s.player.pk] > 1 ? `<span class="slot-times">×${got[s.player.pk]}</span>` : ''}</div>`
      : `<div class="slot empty"><span class="pos pos-${GM.GROUP[s.pos]}">${s.pos}</span></div>`;
    const clubSets = GM.clubs.map(c => {
      const members = list.filter(p => p.clubs.includes(c));
      return [c, members.filter(has).length, members.length];
    }).sort((x, y) => y[1] / y[2] - x[1] / x[2] || y[2] - x[2]);
    const bar = (have, all) => `<div class="bar"><i style="width:${all ? have / all * 100 : 0}%"></i></div>`;
    const recent = Object.entries(a.players).sort((x, y) => (y[1] > x[1] ? 1 : -1)).slice(0, 18).map(([k]) => index.get(k)).filter(Boolean);
    const main = load();
    const VIEWS = [['xi', '⭐ Dream XI'], ['sets', '🗂️ Sets']];  // (the main Album is albumHub)
    if (!VIEWS.some(v => v[0] === view)) view = 'xi';
    const link = (o = {}) => { const q = { s: statId !== 'goals' ? statId : '', b: purist ? 'purist' : '', v: view !== 'xi' ? view : '', c: cat, ...o };
      const qs = Object.entries(q).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'); return '#/album' + (qs ? '?' + qs : ''); };
    // badges: the first category with something left to earn, unless one was picked
    if (!CATS.some(c => c[0] === cat)) cat = (CATS.find(([c]) => A.some(x => x.cat === c && !a.ach[x.id])) || CATS[0])[0];

    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>${purist ? '💎 Purist collection' : '📒 Album'}</h2><span></span></div>
      ${GM.albumTabs(purist ? 'purist' : 'album')}
      <div class="album-head">
        <div><b>${fmt(ids.length)}</b><small>of ${fmt(list.length)} players</small></div>
        <div>${purist ? `<b>${list.length ? (100 * ids.length / list.length).toFixed(1) : 0}%</b><small>of every PL player</small>` : `<b>${Object.keys(main.ach).length}</b><small>of ${A.length} badges</small>`}</div>
      </div>
      ${bar(ids.length, list.length)}
      <p class="muted center">${purist ? 'The purist\'s album: every one of the ' + fmt(list.length) + ' players to play in the Premier League, collected only through <a href="#/draft?m=purist">💎 Purist</a> drafts (no wildcards, everyone equally likely).'
        : 'Every player you sign in a draft is added to your album. Stored on this device.'}</p>

      <div class="seg album-views">${VIEWS.map(([k, l]) => `<a class="${k === view ? 'on' : ''}" href="${link({ v: k === 'xi' ? '' : k, c: '' })}">${l}</a>`).join('')}</div>

      ${view === 'xi' ? `<p class="muted">Your best player in every position, from players you've signed in ${st.name.toLowerCase()} games (×2, ×3… is how many times you've signed him). ${fmt(Object.keys(got).length)} players in your ${st.name.toLowerCase()} book.</p>
      <div class="hard-toggle small three">${Object.entries(GM.STATS).map(([k, s]) => `<a class="${k === statId ? 'on' : ''}" href="${link({ s: k === 'goals' ? '' : k })}"><i class="sb-ico">${s.icon}</i>${s.name}</a>`).join('')}</div>
      <div class="pitch"><div class="pitch-lines"></div><div class="shape">${fmt(tot)} ${st.label}</div>
        ${lines.map(l => `<div class="pitch-row">${l.map(([s]) => slot(s)).join('')}</div>`).join('')}</div>
      ${recent.length ? `<h3 class="section-title">🆕 Recently collected</h3><div class="team-badges">${recent.map(p => `<span>${GM.esc(p.name)}</span>`).join('')}</div>` : ''}` : ''}

      ${view === 'badges' ? `<div class="ach-cats">${CATS.map(([c, label]) => { const l = A.filter(x => x.cat === c); return `<a class="${c === cat ? 'on' : ''}" href="${link({ c })}">${label}<small>${l.filter(x => a.ach[x.id]).length}/${l.length}</small></a>`; }).join('')}</div>
      <div class="ach-grid">${A.filter(x => x.cat === cat).map(x => {
          const hide = x.secret && !a.ach[x.id];
          return `<div class="ach ${a.ach[x.id] ? 'got' : ''} ${hide ? 'secret' : ''}" title="${hide ? 'A secret badge' : GM.esc(x.desc)}">
            <span class="ach-icon">${a.ach[x.id] ? x.icon : hide ? '❓' : '🔒'}</span><b>${hide ? '???' : x.name}</b><small>${hide ? 'Secret – keep playing to find it' : x.desc}</small></div>`; }).join('')}</div>` : ''}

      ${view === 'stats' ? picksHtml() : ''}

      ${view === 'sets' ? `<div class="sets">${SETS.map(s => {
        const m = setMembers[s.id].map(i => GM.players[i]), have = m.filter(has);
        return `<details class="set"><summary><span>${s.icon} ${s.name}</span><span>${have.length}/${m.length}</span>${bar(have.length, m.length)}</summary>
          <div class="set-list">${m.sort((x, y) => y.fame - x.fame).map(p => `<span class="${has(p) ? 'have' : ''}">${has(p) ? '✅' : '▫️'} ${GM.esc(p.name)}</span>`).join('')}</div></details>`;
      }).join('')}</div>

      <details class="set clubs-block"><summary><span>🏟️ Clubs</span><span>${clubSets.filter(([, h, n]) => h === n).length}/${clubSets.length} complete</span></summary>
        <div class="sets">${clubSets.map(([c, h, n]) => `<div class="club-set">${GM.clubChip(c)}<span>${GM.esc(c)}</span><span>${h}/${n}</span>${bar(h, n)}</div>`).join('')}</div></details>` : ''}`;
  };
})();

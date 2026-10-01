/* Goal Machine – 👑 Reign Check: a swipe-left, swipe-right reign as a dodgy football club owner (a secret game).
   Every card is someone wanting something. Swipe left or right. Four meters: 📣 Fans, 👟 the Squad, 💷 Money, ⚖️ the
   League. Let any of them hit zero OR a hundred and you're out (eight ways to go, and a ninth if you sell up). Each card
   is a week; every 38 weeks the season ends and how you've run the club decides where you finish. While you hold a card
   the meters it'll move show a dot (big or small), never which way. Stories carry on across cards (Vegas, the kid, the
   investor…), coaches come and go (parodies, all), and three objectives at a time give you something to chase across
   owners. Score: weeks reigned + 25 per trophy. Board: reign. */
'use strict';

(function () {
  const M = ['f', 's', 'c', 'l'];
  const METERS = { f: { icon: '📣', name: 'Fans' }, s: { icon: '👟', name: 'Squad' }, c: { icon: '💷', name: 'Money' }, l: { icon: '⚖️', name: 'League' } };
  const WEEKS = 38;
  const ENDINGS = {
    f0: { icon: '🗑️', title: 'Bin Day', text: 'The fans storm the boardroom. You escape through the car park, in a wheelie bin.' },
    f100: { icon: '🗿', title: 'Statue', text: 'The fans love you so much they build you a statue. It falls on you at the unveiling.' },
    s0: { icon: '🧤', title: 'Player Strike', text: 'The players go on strike. You play in goal yourself. You concede eleven. The fans vote you out at half-time.' },
    s100: { icon: '👑', title: 'Player Power', text: 'The dressing room runs the club now. The captain makes himself owner and you the kit man.' },
    c0: { icon: '🏦', title: 'Administration', text: 'The money’s gone. The receivers sell your chair, your desk and, somehow, your shoes.' },
    c100: { icon: '🧾', title: 'The Taxman', text: 'So much money sloshing about that the taxman moves into your office. Permanently.' },
    l0: { icon: '⚖️', title: 'Not Fit, Not Proper', text: 'The league runs its fit and proper persons test. You fail all of it. Even the bit about your name.' },
    l100: { icon: '🤝', title: 'Too Cosy', text: 'You’re so cosy with the league they make you its chairman. You never see your club again.' },
    sold: { icon: '🛢️', title: 'Sold Up', text: 'You sold the club for an undisclosed sum and a yacht. The fans are relieved. So, honestly, are you.' },
  };
  const WHO = {
    agent: ['🕶️', 'Jorge Mendacious', 'Super-agent', '#3b4a6b'], captain: ['🧔', 'The Captain', 'Club captain', '#2e6e6a'], star: ['💅', 'Your Star Striker', '', '#8a4f7d'],
    accountant: ['🧮', 'Nigel from Accounts', '', '#6b6b4a'], chief: ['🏛️', 'Richard Masterchef', 'League chief executive', '#4a3b6b'], hack: ['🎤', 'A Tabloid Hack', '', '#7a3b3b'],
    fan: ['📣', 'Big Dave', 'Supporters’ Trust', '#b5443b'], sheikh: ['🛢️', 'A Mysterious Investor', '', '#a0782c'], crypto: ['🪙', 'Chad', 'MoonDoge CEO', '#5a7d2e'],
    grounds: ['🌱', 'Old Reg', 'Groundsman', '#4f6b3b'], mum: ['👵', 'Your Mum', '', '#9c6b8a'], mayor: ['🎩', 'The Mayor', '', '#55555e'], kitman: ['👕', 'Kev', 'Kit man', '#3b6b8a'],
    doctor: ['🩺', 'The Club Doctor', '', '#3b7a6b'], rival: ['😈', 'A Rival Owner', '', '#6b2e2e'], pundit: ['📺', 'Gary Linekerr', 'Pundit', '#2e4a6b'],
    ref: ['🟨', 'Mike Deanish', 'Referee', '#8a7a2e'], kid: ['🧒', 'The Academy Kid', '', '#2e8a5a'], sponsor: ['🍔', 'Burger Barons', 'Shirt sponsor', '#a0522d'],
    board: ['📋', 'The Board', '', '#4a4a3b'], season: ['🏆', 'The Season', '', '#c79a3b'],
  };
  // head coaches (parodies, again): who's in the dugout changes some cards
  const COACHES = {
    pep: ['🧥', 'Pep Cardigola', 'Tiki-taka tinkerer'], klopp: ['🤗', 'Jürgen Kloppity', 'Heavy metal football'], jose: ['🚌', 'José Moaninho', 'The Special Two'],
    fergie: ['💨', 'Sir Alex Furyson', 'Squeaky bum time'], sam: ['🧯', 'Big Sam Alldicey', 'Never been relegated'], harry: ['🚗', 'Harry Readyknapp', 'Window down, deal done'],
    arsene: ['🌱', 'Arsène Wonger', 'Le Professeur'], ole: ['😊', 'Ole Gunnar Smilesjær', 'The nice guy'],
  };
  // a card: who, what they say, [left label, [f, s, c, l]], [right label, …], and options:
  // w weight, need(st) a condition, set/unset flags, once, next (a card that must come soon), fx(st, side) extras
  const C = (id, who, text, L, R, o = {}) => ({ id, who, text, L, R, w: 1, ...o });
  const has = f => st => !!st.flags[f];
  const CARDS = [
    C('wages', 'agent', 'My client wants his wages doubled, or he’s off to Madrid.', ['Show him the door', [-5, -10, 5, 0]], ['Pay up', [5, 5, -15, 0]]),
    C('striker', 'coach', 'I need a striker, boss. A proper one. £50m.', ['Make do', [-5, -5, 0, 0]], ['Buy him', [10, 5, -20, 0]]),
    C('leaseback', 'accountant', 'We could sell the training ground to your other company and lease it back. Totally normal.', ['That’s dodgy', [0, 5, -5, 5]], ['Do it', [0, -10, 20, -15]]),
    C('inspect', 'chief', 'The league would like to see your accounts. All of them.', ['Lose the receipts', [0, 0, 5, -15]], ['Open the books', [0, 0, -10, 10]]),
    C('tickets', 'fan', 'Tickets are £90! It’s daylight robbery!', ['Fans pay what fans pay', [-15, 0, 10, 0]], ['Cut prices', [15, 0, -10, 0]]),
    C('invest', 'sheikh', 'I would like to invest £200 million. You will ask no questions.', ['No thank you', [0, 0, 0, 5]], ['Questions are overrated', [10, 5, 25, -20]], { set: 'sheikh' }),
    C('moondoge', 'crypto', 'MoonDoge on the front of your shirt. We pay in MoonDoge. It only goes up.', ['Absolutely not', [5, 0, -5, 5]], ['To the moon', [-10, 0, 20, -10]], { set: 'crypto' }),
    C('rugpull', 'crypto', 'Small update: MoonDoge is now worth nothing. Also I’ve moved to a country with no extradition.', ['Who could have seen it', [-5, 0, -20, 0]], ['Sue him', [0, 0, -10, 5]], { need: has('crypto'), once: true, unset: 'crypto' }),
    C('flood', 'grounds', 'Big game Saturday. Shall I leave the sprinklers on all night? Their passers will hate it.', ['Play fair', [0, -5, 0, 5]], ['Flood it', [5, 5, 0, -10]]),
    C('mum1', 'mum', 'Are you eating properly? You look thin on the telly.', ['Yes, Mum', [0, 0, 0, 0]], ['Pies at half-time count', [5, 0, 0, 0]]),
    C('armband', 'star', 'I want to be captain, or I’m leaving.', ['No chance', [-5, -10, 0, 0]], ['Give him the armband', [5, -10, 0, 0]], { set: 'starcap' }),
    C('captaincy', 'captain', 'You gave HIM my armband? The lads aren’t happy, boss.', ['Tough', [0, -15, 0, 0]], ['Swap it back', [-5, 10, 0, 0]], { need: has('starcap'), once: true, unset: 'starcap' }),
    C('vegas', 'captain', 'The lads want a team-bonding trip. To Vegas.', ['Tea and biscuits', [0, -10, 5, 0]], ['Vegas!', [-5, 15, -10, 0]], { set: 'vegas' }),
    C('photos', 'hack', 'We’ve got photos from Vegas. There’s a flamingo in them. Comment?', ['No comment', [-10, 0, 0, -5]], ['Buy the photos', [0, 0, -15, -5]], { need: has('vegas'), once: true, unset: 'vegas', obj: 'vegas' }),
    C('identity', 'pundit', 'Your team has no identity. It’s just eleven blokes running about.', ['Ban him from the ground', [5, 0, 0, -5]], ['Agree, live on air', [-10, -5, 0, 5]]),
    C('reftix', 'ref', 'Lovely stadium. Any chance of some tickets for the cup final? For the family.', ['Report him', [0, 0, 0, 10]], ['Front row seats', [0, 5, -3, -15]]),
    C('sackcalls', 'fan', 'Three defeats on the bounce. The fans want the coach sacked.', ['Back him', [-10, 5, 0, 0]], ['Sack him', [10, -10, -10, 0]], { need: st => st.m.f < 50, sack: 'R' }),
    C('rush', 'doctor', 'Your best player’s hamstring is hanging by a thread. Rush him back for the derby?', ['Rest him', [-5, 5, 0, 0]], ['Strap it up', [10, -10, 0, 0]]),
    C('debut', 'kid', 'Please, sir, can I train with the first team?', ['Back to the academy', [0, -5, 0, 0]], ['Give the kid a chance', [10, 5, 0, 0]], { set: 'kid' }),
    C('wonderkid', 'kid', 'I scored a hat-trick! Big clubs are calling my mum.', ['Not for sale', [10, 5, -5, 0]], ['Sell him for £60m', [-15, -5, 25, 0]], { need: has('kid'), once: true, unset: 'kid' }),
    C('concert', 'mayor', 'The council would like your stadium for a concert. It’ll ruin the pitch.', ['No', [5, 0, 0, 0]], ['Book it', [-10, -5, 15, 0]]),
    C('kit', 'kitman', 'Next season’s kit: tasteful, or lightning bolts and a QR code?', ['Tasteful', [5, 0, -5, 0]], ['Lightning bolts', [-10, 0, 15, 0]]),
    C('cartel', 'rival', 'Fancy a gentleman’s agreement? We never bid for each other’s players.', ['Report him', [0, 0, 0, 15]], ['Shake on it', [0, 0, 10, -15]]),
    C('burgers', 'sponsor', 'We’d like the squad to eat our burgers on camera. Every day.', ['Absolutely not', [0, 5, -10, 0]], ['Extra cheese', [-5, -10, 15, 0]]),
    C('tax', 'accountant', 'The tax return’s due. Honest, or… creative?', ['Honest', [0, 0, -10, 10]], ['Creative', [0, 0, 15, -15]]),
    C('wonder', 'agent', 'I can get you a wonderkid. Twenty per cent for me, of course.', ['Too greedy', [0, -5, 0, 0]], ['Deal', [10, 5, -15, -5]]),
    C('cap', 'chief', 'We’re bringing in a salary cap. Will you support it?', ['Lobby against it', [0, 10, -5, -10]], ['Support it', [-5, -10, 10, 10]]),
    C('fanboard', 'fan', 'Can we have a fan on the board?', ['Never', [-15, 0, 0, 0]], ['Of course', [15, 0, 0, 5]], { set: 'fanboard' }),
    C('fanboard2', 'fan', 'As the fans’ man on the board: I’ve read the accounts. What’s “Consultancy (Bahamas)”?', ['Remove him from the board', [-15, 0, 0, -5]], ['Come clean', [10, 0, -10, 10]], { need: has('fanboard'), once: true }),
    C('cattle', 'hack', 'Did you really call the fans “cattle” at a dinner party?', ['Deny everything', [-5, 0, 0, -5]], ['Apologise', [5, 0, 0, 0]]),
    C('tvshare', 'captain', 'The lads want a share of the TV money.', ['Not a penny', [0, -15, 5, 0]], ['A fair share', [0, 10, -15, 0]]),
    C('rap', 'star', 'I’ve made a rap album. Can we play it at half-time?', ['Please no', [0, -5, 0, 0]], ['Crank it up', [-10, 10, 0, 0]]),
    C('cupkids', 'coach', 'Shall we play the kids in the Cup?', ['Full strength', [5, -10, 0, 0]], ['Play the kids', [-5, 10, 0, 0]]),
    C('herbal', 'doctor', 'These new energy drinks are “herbal”. Very herbal. Shall I hand them out?', ['Water’s fine', [0, -5, 0, 5]], ['Hand them out', [0, 10, 0, -15]]),
    C('podcast', 'pundit', 'Come on my podcast. We’ll talk about your… legacy.', ['No', [0, 0, 0, 0]], ['Of course', [5, 0, 0, -5]]),
    C('cousin', 'mum', 'Your cousin needs a job. He’s very good with… things.', ['No, Mum', [0, 0, 0, 0]], ['Assistant kit man', [-5, 0, -5, 0]], { set: 'cousin' }),
    C('cousin2', 'kitman', 'Your cousin has sold the entire kit cupboard on eBay.', ['Fire him', [0, 0, 0, 0]], ['It’s family', [-10, -5, -5, 0]], { need: has('cousin'), once: true }),
    C('moles', 'grounds', 'Moles on the pitch. Hundreds. I think they’re organised.', ['Live and let live', [-5, -5, 0, 0]], ['Call my mate (unlicensed)', [5, 0, 0, -5]]),
    C('heli', 'board', 'The PR team think you should arrive at the next home game by helicopter.', ['Bit much', [0, 0, 0, 0]], ['Fire up the chopper', [15, 0, -10, 0]]),
    C('statue', 'board', 'Some fans want a statue of the club’s greatest legend outside the ground.', ['Can’t afford it', [-10, 0, 5, 0]], ['Make it a statue of me', [-15, 0, -5, 0]]),
    C('deadline', 'agent', 'It’s Deadline Day! I’ve got a striker. Never seen him play, but his YouTube is unreal.', ['Pass', [-5, 0, 0, 0]], ['Fax it through', [10, 0, -15, 0]], { need: st => st.week % WEEKS === 1 || st.week % WEEKS === 20 }),
    C('sellstar', 'rival', 'I’ll give you £90m for your star striker. Cash. Today.', ['He’s not for sale', [5, 5, -5, 0]], ['Bite his hand off', [-15, -5, 25, 0]]),
    C('fixture', 'chief', 'We’ve moved your next game to Monday at 8pm. In Lapland.', ['Kick up a fuss', [5, 0, 0, -10]], ['Fine', [-10, -5, 0, 5]]),
    C('var', 'ref', 'VAR’s screen is broken. Shall we just… guess?', ['Use the screen', [0, 0, 0, 5]], ['Guess in our favour', [5, 5, 0, -10]]),
    C('bonus', 'captain', 'Promise us a bonus if we beat the champions?', ['You’re paid enough', [0, -10, 0, 0]], ['£1m if you win', [5, 10, -10, 0]]),
    C('stadium', 'mayor', 'Planning permission for a new 60,000 stadium? The council might… need persuading.', ['Too risky', [-5, 0, 0, 5]], ['Persuade them', [15, 0, -15, -10]]),
    C('naming', 'sponsor', 'We’ll pay £30m to call your ground The Burger Barons Bun-Dome.', ['Over my dead body', [5, 0, -5, 0]], ['Bun-Dome it is', [-15, 0, 20, 0]]),
    C('sellup', 'sheikh', 'I said I would invest. Now I would like to buy. Name your price.', ['Not for sale', [5, 0, 0, 0]], ['Sell the club', [0, 0, 0, 0]], { need: has('sheikh'), once: true, end: 'R' }),
    C('sheikh2', 'chief', 'Your new investor’s money comes from… where, exactly?', ['Mind your business', [0, 0, 5, -15]], ['Return the money', [-5, 0, -20, 15]], { need: has('sheikh') }),
    C('training', 'coach', 'Double sessions all week. The lads won’t like it, but they’ll be fit.', ['Rest them', [0, 10, 0, 0]], ['Double sessions', [5, -10, 0, 0]]),
    C('derby', 'fan', 'It’s derby week. Say something to fire us up!', ['Say nothing', [-5, 0, 0, 5]], ['Insult their owner', [15, 5, 0, -10]]),
    C('fine', 'chief', 'Your fans threw pies at the linesman. That’s a fine.', ['Pay it', [0, 0, -10, 5]], ['Blame the pies', [5, 0, 0, -10]]),
    C('poach', 'agent', 'A rival’s best player wants to join you. He’s still under contract. Wink.', ['Do it properly', [0, 0, -10, 5]], ['Tap him up', [10, 5, -5, -15]]),
    C('mum2', 'mum', 'I saw on Facebook you’re a crook.', ['Don’t believe Facebook', [0, 0, 0, 0]], ['Only a bit', [5, 0, 0, -5]]),
    C('youthdev', 'kid', 'The academy needs new pitches. The ones we’ve got are car parks.', ['Next year', [0, -5, 0, 0]], ['Build them', [5, 10, -15, 0]]),
    C('documentary', 'board', 'A streaming service wants to film a behind-the-scenes documentary.', ['No cameras', [0, 5, 0, 0]], ['Lights, camera', [10, -10, 15, 0]], { set: 'doc' }),
    C('documentary2', 'hack', 'The documentary aired. You’re the villain. Episode 4 is just you shouting at a printer.', ['Sue them', [0, 0, -10, 0]], ['Lean into it', [10, 0, 5, -5]], { need: has('doc'), once: true }),
    C('sleep', 'mum', 'You’re not sleeping. I can tell. Take a holiday.', ['There’s no time', [0, 0, 0, 0]], ['A week in Spain', [-5, 5, -5, 0]]),
    // the coach in the dugout
    C('coachpep', 'coach', 'I want six more full-backs. Inverted ones. And a philosopher.', ['We have full-backs', [0, -10, 0, 0]], ['Buy them all', [5, 10, -20, 0]], { need: st => st.coach === 'pep' }),
    C('coachklopp', 'coach', 'HEAVY METAL! I need a heavy metal fitness coach. And a gong.', ['No gong', [0, -10, 0, 0]], ['Get the gong', [5, 10, -10, 0]], { need: st => st.coach === 'klopp' }),
    C('coachjose', 'coach', 'The referees are against us. The league is against us. YOU are against us.', ['Calm down', [0, 0, 0, 5]], ['Say it on telly', [10, 5, 0, -15]], { need: st => st.coach === 'jose' }),
    C('coachfergie', 'coach', 'My hairdryer’s broken. I need a new one. Industrial.', ['Buy a normal one', [0, -5, 0, 0]], ['Industrial it is', [5, 10, -5, 0]], { need: st => st.coach === 'fergie' }),
    C('coachsam', 'coach', 'Long throws, big lads, wine in the dressing room. Trust me.', ['Play football', [5, -5, 0, 0]], ['Trust the process', [-5, 10, 0, 0]], { need: st => st.coach === 'sam' }),
    C('coachharry', 'coach', 'Got a mate who’ll sell us a striker cheap. Don’t ask where he got him.', ['I’ll ask', [0, 0, 0, 5]], ['Don’t ask', [10, 5, -5, -10]], { need: st => st.coach === 'harry' }),
    C('coacharsene', 'coach', 'We should only sign 17-year-olds from France. It is the way.', ['Sign proven players', [5, -5, -10, 0]], ['C’est la vie', [-5, 10, 5, 0]], { need: st => st.coach === 'arsene' }),
    C('coachole', 'coach', 'I think we just need to believe, and play with a smile. Smile!', ['Tactics, please', [0, -5, 0, 0]], ['Smile!', [5, 10, 0, 0]], { need: st => st.coach === 'ole' }),
    C('coachquit', 'coach', 'I can’t work like this. Either you stop meddling, or I’m gone.', ['Then go', [-5, -10, -5, 0]], ['I’ll back off', [5, 10, 0, 0]], { sack: 'L' }),
  ];
  const BY = Object.fromEntries(CARDS.map(c => [c.id, c]));
  // three objectives at a time, across owners; each one done is remembered
  const OBJECTIVES = [
    ['season', 'Reign for a whole season', m => m.best >= WEEKS], ['two', 'Reign for two seasons', m => m.best >= WEEKS * 2], ['title', 'Win the league', m => m.titles > 0],
    ['vegas', 'Survive the Vegas photos', m => m.flags && m.flags.vegas], ['sack3', 'Sack three coaches in one reign', m => m.maxSacks >= 3], ['endings3', 'Find three endings', m => Object.keys(m.endings || {}).length >= 3],
    ['broke', 'Go bust (on purpose, obviously)', m => m.endings && m.endings.c0], ['statue', 'Get a statue', m => m.endings && m.endings.f100], ['sold', 'Sell up', m => m.endings && m.endings.sold], ['endings9', 'Find all nine endings', m => Object.keys(m.endings || {}).length >= 9],
  ];

  /* ---------------------------------------------------------------- the rules (no DOM: the tests play whole reigns) */
  const blankMeta = () => ({ owners: 0, endings: {}, best: 0, titles: 0, maxSacks: 0, flags: {}, done: {} });
  function newReign(meta) {
    meta.owners++;
    const seed = GM.newSeed(), r = GM.rng(seed);
    const st = { m: { f: 50, s: 50, c: 50, l: 50 }, week: 1, flags: {}, seen: {}, coach: r.pick(Object.keys(COACHES)), trophies: 0, sacks: 0, owner: meta.owners, card: null, seed, log: [] };
    st.card = draw(st);
    return st;
  }
  const seasonNo = st => Math.floor((st.week - 1) / WEEKS) + 1, weekNo = st => ((st.week - 1) % WEEKS) + 1;
  // the next card: the end of the season, a coach to hire, a follow-up that's due, or one from the deck
  function draw(st) {
    if (st.week > 1 && weekNo(st) === 1 && !st.seasonDone) return 'season';
    if (st.hire) return 'hire';
    const r = GM.rng(`${st.seed}|${st.week}|${st.log.length}`);
    let ok = CARDS.filter(c => (!c.need || c.need(st)) && !(c.once && st.seen[c.id]) && (st.seen[c.id] || 0) < 3 && c.id !== st.last);
    if (!ok.length) { st.seen = Object.fromEntries(Object.entries(st.seen).filter(([k]) => BY[k] && BY[k].once)); ok = CARDS.filter(c => (!c.need || c.need(st)) && !(c.once && st.seen[c.id]) && c.id !== st.last); }  // a long reign: the deck reshuffles
    const due = ok.filter(c => c.need && !c.id.startsWith('coach') && r() < 0.5);
    const pool = due.length ? due : ok;
    return r.weighted(pool, c => (c.w || 1) / (1 + (st.seen[c.id] || 0)) * (c.id.startsWith('coach') ? 0.6 : 1)).id;
  }
  // the season's end: how you've run things decides where you finish
  function seasonCard(st) {
    const m = st.m, r = GM.rng(`${st.seed}|season|${seasonNo(st)}`), q = 0.45 * m.s + 0.3 * m.c + 0.25 * m.f + (r() - 0.5) * 30;
    const pos = Math.max(1, Math.min(20, Math.round(21 - (q - 20) / 3)));
    const fx = pos === 1 ? [20, 10, 15, 0] : pos <= 4 ? [10, 5, 10, 0] : pos <= 10 ? [5, 0, 0, 0] : pos >= 18 ? [-20, -10, -20, 0] : [-5, 0, 0, 0];
    const text = pos === 1 ? 'CHAMPIONS! Open-top bus, the lot. The fans are delirious.' : pos <= 4 ? `${pos}${pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}: into Europe! Tuesday nights in faraway places.` : pos <= 10 ? `A top-half finish (${pos}th). Respectable.` : pos >= 18 ? `Relegated (${pos}th). The fans are not happy. Neither is the bank.` : `${pos}th. Mid-table. Nobody’s happy, nobody’s angry.`;
    return { id: 'season', who: 'season', text: `Season ${seasonNo(st) - 1} is over. ${text}`, L: ['Onwards', fx], R: ['Onwards', fx], pos };
  }
  function hireCard(st) {
    const r = GM.rng(`${st.seed}|hire|${st.sacks}`), [a, b] = r.shuffle(Object.keys(COACHES).filter(k => k !== st.coach));
    return { id: 'hire', who: 'board', text: `You need a new head coach. Two are available: ${COACHES[a][1]} (“${COACHES[a][2]}”) or ${COACHES[b][1]} (“${COACHES[b][2]}”).`, L: [COACHES[a][1], [0, 5, -5, 0]], R: [COACHES[b][1], [0, 5, -5, 0]], hire: [a, b] };
  }
  const cardOf = (st, id) => (id === 'season' ? seasonCard(st) : id === 'hire' ? hireCard(st) : BY[id]);
  // the longer you reign, the bigger the swings (a quarter more every season)
  const scaled = (st, c, fx) => (c.id === 'season' || c.id === 'hire' ? fx : fx.map(v => Math.round(v * (1 + 0.25 * (seasonNo(st) - 1)))));
  // swipe: apply the choice; returns the ending if it's over
  function apply(st, meta, side) {
    const c = cardOf(st, st.card), pick = side === 'L' ? c.L : c.R, fx = scaled(st, c, pick[1]);
    M.forEach((k, i) => { st.m[k] = Math.max(0, Math.min(100, st.m[k] + fx[i])); });
    st.seen[c.id] = (st.seen[c.id] || 0) + 1; st.last = c.id;
    if (c.set && side === 'R') { st.flags[c.set] = 1; meta.flags[c.set] = 1; }
    if (c.unset) delete st.flags[c.unset];
    if (c.obj) meta.flags[c.obj] = 1;
    let title = false;
    if (c.id === 'season') { st.seasonDone = true; if (c.pos === 1) { st.trophies++; meta.titles++; title = true; } } else st.seasonDone = false;
    if (c.hire) { st.coach = c.hire[side === 'L' ? 0 : 1]; st.hire = false; }
    if (c.sack === side) { st.sacks++; meta.maxSacks = Math.max(meta.maxSacks, st.sacks); st.hire = true; }
    st.log.push(`${c.id}:${side}`);
    let end = c.end === side ? 'sold' : null;
    const dead = M.find(k => st.m[k] <= 0 || st.m[k] >= 100);
    if (!end && dead) end = dead + (st.m[dead] <= 0 ? '0' : '100');
    if (end) { st.over = end; meta.endings[end] = (meta.endings[end] || 0) + 1; meta.best = Math.max(meta.best, st.week - 1); return { end, title }; }
    if (c.id !== 'season' && c.id !== 'hire') st.week++;
    meta.best = Math.max(meta.best, st.week - 1);
    st.card = draw(st);
    return { end: null, title };
  }
  const scoreOf = st => st.week - 1 + st.trophies * 25;

  GM.reignCheck = function (root) {
    const META = 'reign:meta', SAVE = 'reign:save', key = 'reign';
    const meta = Object.assign(blankMeta(), GM.store.get(META, {}));
    let st = GM.store.get(SAVE, null);
    const save = () => { GM.store.set(SAVE, st); GM.store.set(META, meta); };
    const top = () => `<div class="topbar"><a href="#/" class="back">‹</a><h2>👑 Reign Check</h2>${GM.lbButton(key)}</div>`;
    const esc = GM.esc;
    const whoOf = c => { if (c.who === 'coach') { const k = COACHES[st.coach]; return [k[0], k[1], 'Head coach', '#3b5a4a']; } return WHO[c.who]; };
    function choose(side) {
      const res = apply(st, meta, side);
      if (res.title) GM.sound.play('fanfare');
      if (res.end) return die();
      save(); objectivesCheck(); render(true);
    }
    function die() {
      const score = scoreOf(st);
      save(); objectivesCheck();
      GM.sound.play(st.over === 'sold' ? 'cash' : 'sacked'); GM.buzz(80);
      render();
      GM.checkGame('reign', score, { weeks: st.week - 1, end: st.over, trophies: st.trophies });
      GM.recordScore(key, score, { t: score });
    }
    function objectivesCheck() {
      OBJECTIVES.forEach(([id, name, test]) => { if (!meta.done[id] && test(meta)) { meta.done[id] = 1; GM.toast(`🎯 Objective done: <b>${esc(name)}</b>`, 2600); GM.sound.play('good'); } });
      GM.store.set(META, meta);
    }
    const objectives = () => OBJECTIVES.filter(([id]) => !meta.done[id]).slice(0, 3);

    function meters(preview) {
      return `<div class="rg-meters">${M.map(k => { const v = st.m[k], d = preview ? Math.abs(preview[M.indexOf(k)]) : 0;
        return `<div class="rg-meter${v <= 15 || v >= 85 ? ' danger' : ''}"><span class="rg-icon" style="--v:${v}%">${METERS[k].icon}</span><i class="rg-dot ${d >= 10 ? 'big' : d > 0 ? 'small' : ''}"></i></div>`; }).join('')}</div>`;
    }
    function render(fresh) {
      if (!st) { st = newReign(meta); save(); }
      if (st.over) return ending();
      const c = cardOf(st, st.card), W = whoOf(c);
      root.innerHTML = `${top()}<div class="rg">
        ${meters()}
        <p class="rg-text">${esc(c.text)}</p>
        <div class="rg-stage"><div class="rg-card${fresh ? ' in' : ''}" id="rgcard" style="--bg:${W[3]}"><div class="rg-label l">${esc(c.L[0])}</div><div class="rg-label r">${esc(c.R[0])}</div><span class="rg-face">${W[0]}</span></div></div>
        <p class="rg-who"><b>${esc(W[1])}</b>${W[2] ? `<small>${esc(W[2])}</small>` : ''}</p>
        <div class="rg-btns"><button class="rg-btn" data-side="L">◀ ${esc(c.L[0])}</button><button class="rg-btn" data-side="R">${esc(c.R[0])} ▶</button></div>
        <div class="rg-foot"><span>Owner #${st.owner}</span><span>${st.week - 1} week${st.week === 2 ? '' : 's'} in charge</span><span>Season ${seasonNo(st)} · week ${weekNo(st)}</span></div>
        <div class="rg-coach">${COACHES[st.coach][0]} ${esc(COACHES[st.coach][1])}${st.trophies ? ` · 🏆×${st.trophies}` : ''}</div></div>`;
      swipe(c);
      GM.$$('[data-side]', root).forEach(b => {
        b.onmouseenter = b.onfocus = () => { GM.$('.rg-meters', root).outerHTML = meters(scaled(st, c, (b.dataset.side === 'L' ? c.L : c.R)[1])); };
        b.onclick = () => fly(b.dataset.side);
      });
    }
    function fly(side) {
      const el = GM.$('#rgcard', root);
      if (el) { el.style.transition = 'transform .3s ease-in, opacity .3s'; el.style.transform = `translateX(${side === 'L' ? -140 : 140}%) rotate(${side === 'L' ? -25 : 25}deg)`; el.style.opacity = '0'; }
      GM.sound.play('swoosh');
      setTimeout(() => choose(side), 220);
    }
    // drag the card: it tilts, shows the answer on that side, and the meters it'll move show dots
    function swipe(c) {
      const el = GM.$('#rgcard', root); if (!el) return;
      let x0 = null, dx = 0, shown = '';
      const set = d => {
        el.style.transform = `translateX(${d}px) rotate(${d / 14}deg)`;
        el.classList.toggle('show-l', d < -25); el.classList.toggle('show-r', d > 25);
        const side = d < -25 ? 'L' : d > 25 ? 'R' : '';
        if (side !== shown) { shown = side; GM.$('.rg-meters', root).outerHTML = meters(side ? scaled(st, c, (side === 'L' ? c.L : c.R)[1]) : null); }
      };
      el.addEventListener('pointerdown', e => { x0 = e.clientX; dx = 0; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
      el.addEventListener('pointermove', e => { if (x0 == null) return; dx = e.clientX - x0; set(dx); });
      const up = () => { if (x0 == null) return; x0 = null; el.style.transition = 'transform .25s'; if (Math.abs(dx) > 90) fly(dx < 0 ? 'L' : 'R'); else set(0); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    }
    function ending() {
      const E = ENDINGS[st.over] || ENDINGS.f0, weeks = st.week - 1, score = scoreOf(st);
      root.innerHTML = `${top()}<div class="rg rg-end">
        <div class="rg-endcard"><span class="rg-face">${E.icon}</span><b>${esc(E.title)}</b><p>${esc(E.text)}</p></div>
        <p class="rg-text">Owner #${st.owner} lasted <b>${weeks} week${weeks === 1 ? '' : 's'}</b>${st.trophies ? ` and won ${st.trophies} title${st.trophies > 1 ? 's' : ''}` : ''}. Score ${score}.</p>
        <div class="rg-endings">${Object.entries(ENDINGS).map(([k, e]) => `<span class="${meta.endings[k] ? 'got' : ''}" title="${meta.endings[k] ? esc(e.title) : '???'}">${meta.endings[k] ? e.icon : '❔'}</span>`).join('')}</div>
        <p class="muted center">Endings found: ${Object.keys(meta.endings).length}/9</p>
        <h3 class="section-title">🎯 Objectives</h3><ul class="rg-obj">${objectives().map(([, n]) => `<li>${esc(n)}</li>`).join('') || '<li>All done. You absolute menace.</li>'}</ul>
        <div class="actions col"><button class="btn big" id="rgagain">👑 Next owner</button><button class="btn ghost" id="rgshare">📤 Share</button></div></div>`;
      GM.$('#rgagain', root).onclick = () => { st = newReign(meta); save(); render(true); };
      GM.$('#rgshare', root).onclick = () => GM.share(`👑 Goal Machine – Reign Check: Owner #${st.owner} lasted ${weeks} weeks before “${E.title}” ${E.icon}`, GM.baseUrl() + '#/reign');
    }
    function intro() {
      root.innerHTML = `${top()}<div class="rg rg-intro">
        <div class="rg-endcard"><span class="rg-face">👑</span><b>Reign Check</b><p>You own a football club. Everyone wants something. Swipe left or right.</p></div>
        <ul class="how-list"><li>Four things to keep in balance: 📣 the fans, 👟 the squad, 💷 the money and ⚖️ the league.</li>
          <li>Let any of them hit <b>zero or a hundred</b> and you’re out. Too much money is as deadly as none.</li>
          <li>Hold a card: dots show which meters move (big dot, big change), never which way.</li>
          <li>Every card’s a week. Every 38, the season ends: how you’ve run things decides where you finish.</li></ul>
        <h3 class="section-title">🎯 Objectives</h3><ul class="rg-obj">${objectives().map(([, n]) => `<li>${esc(n)}</li>`).join('')}</ul>
        <div class="actions col"><button class="btn big" id="rggo">👑 Take over</button></div></div>`;
      GM.$('#rggo', root).onclick = () => { st = newReign(meta); save(); GM.sound.play('whistle'); render(true); };
    }
    if (!st) return intro();
    render();
  };
  GM.reignCore = { CARDS, ENDINGS, OBJECTIVES, COACHES, WEEKS, blankMeta, newReign, draw, cardOf, apply, scoreOf };
})();

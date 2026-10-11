/* Goal Machine – 🎒 the Locker: cosmetics and unlocks you earn by playing (nothing changes a score).
   Kinds: 🏟️ pitch styles (the draft pitch), 🃏 card backs (packs), 🎉 celebrations (a new best, a win), 📯 horns (the
   sound with it), 🖼️ frames (round your picture, everyone sees them), 🏷️ titles (under your name, everyone sees them),
   💬 reactions (extra ones for challenges), 🕴️ owners (new owners in Dodgy Owner).
   Where they come from (`src`): your level (`lvl`), the season track (`season`, see rewards.js), weekly missions
   (`missions`: how many you've done), the login calendar (`login`), badges (`badges`: how many), your club (`club`:
   dailies played for them), or one-offs given by name. Owned items live on this device ('locker'); the frame and title
   you wear go to the server (set_flair) so other players see them (get_flair). */
'use strict';

(function () {
  const KINDS = {
    pitch: { icon: '🏟️', name: 'Pitch styles', sub: 'How the pitch looks in your drafts' },
    back: { icon: '🃏', name: 'Card backs', sub: 'The back of every card you open' },
    celeb: { icon: '🎉', name: 'Celebrations', sub: 'When you beat your best or win' },
    horn: { icon: '📯', name: 'Horns', sub: 'The sound that goes with it' },
    frame: { icon: '🖼️', name: 'Frames', sub: 'Round your picture: everyone sees it' },
    title: { icon: '🏷️', name: 'Titles', sub: 'Under your name: everyone sees it' },
    react: { icon: '💬', name: 'Reactions', sub: 'Extra things to say in challenges' },
    owner: { icon: '🕴️', name: 'Owners', sub: 'New owners to play in Dodgy Owner' },
  };
  const club = () => (GM.favClub ? GM.favClub() : '');
  const clubShort = () => (club() && GM.clubShort ? GM.clubShort(club()) : 'your club');
  // [id, kind, name, how you get it, extra]
  const L = [
    // pitch styles
    ['pitch-classic', 'pitch', 'Classic', { def: 1 }],
    ['pitch-night', 'pitch', 'Under the lights', { lvl: 3 }],
    ['pitch-retro', 'pitch', 'Nineties', { season: 4 }],
    ['pitch-snow', 'pitch', 'Snow day', { login: 1 }],
    ['pitch-mud', 'pitch', 'Cold wet night in Stoke', { missions: 3 }],
    ['pitch-astro', 'pitch', 'Five-a-side astro', { lvl: 8 }],
    ['pitch-beach', 'pitch', 'Beach soccer', { season: 13 }],
    ['pitch-neon', 'pitch', 'Neon', { season: 22 }],
    ['pitch-gold', 'pitch', 'Golden turf', { lvl: 30 }],
    ['pitch-club', 'pitch', 'Club colours', { club: 3 }],
    // card backs
    ['back-classic', 'back', 'Classic green', { def: 1 }],
    ['back-carbon', 'back', 'Carbon', { lvl: 5 }],
    ['back-retro', 'back', 'Sticker album', { season: 7 }],
    ['back-chaos', 'back', 'CHAOS', { missions: 6 }],
    ['back-night', 'back', 'Night sky', { login: 1 }],
    ['back-holo', 'back', 'Holographic', { season: 25 }],
    ['back-gold', 'back', 'Solid gold', { lvl: 40 }],
    ['back-club', 'back', 'Club colours', { club: 10 }],
    // celebrations
    ['celeb-confetti', 'celeb', 'Confetti', { def: 1 }],
    ['celeb-fireworks', 'celeb', 'Fireworks', { lvl: 10 }],
    ['celeb-money', 'celeb', 'Make it rain', { season: 10 }],
    ['celeb-lightning', 'celeb', 'Thunderstruck', { missions: 10 }],
    ['celeb-pigeon', 'celeb', 'The pigeon', { login: 1 }],
    ['celeb-trophy', 'celeb', 'Lift the trophy', { badges: 25 }],
    ['celeb-club', 'celeb', 'Club ticker tape', { club: 25 }],
    // horns
    ['horn-whistle', 'horn', 'Full-time whistle', { def: 1 }],
    ['horn-air', 'horn', 'Air horn', { lvl: 6 }],
    ['horn-vuvuzela', 'horn', 'Vuvuzela', { season: 16 }],
    ['horn-cheer', 'horn', 'The Kop roars', { badges: 10 }],
    ['horn-fog', 'horn', 'Foghorn', { missions: 15 }],
    ['horn-fanfare', 'horn', 'Fanfare', { lvl: 20 }],
    // frames
    ['frame-none', 'frame', 'No frame', { def: 1 }],
    ['frame-silver', 'frame', 'Silver', { lvl: 4 }],
    ['frame-gold', 'frame', 'Gold', { lvl: 15 }],
    ['frame-neon', 'frame', 'Neon', { season: 19 }],
    ['frame-fire', 'frame', 'On fire', { missions: 20 }],
    ['frame-chaos', 'frame', 'CHAOS', { season: 28 }],
    ['frame-legend', 'frame', 'Legend', { badges: 50 }],
    ['frame-club', 'frame', 'Club colours', { club: 15 }],
    // titles
    ['title-none', 'title', 'No title', { def: 1 }],
    ['title-sunday', 'title', 'Sunday League Legend', { lvl: 2 }],
    ['title-gaffer', 'title', 'The Gaffer', { lvl: 12 }],
    ['title-supersub', 'title', 'Super Sub', { login: 1 }],
    ['title-tinkerman', 'title', 'Tinkerman', { season: 1 }],
    ['title-bus', 'title', 'Parks the Bus', { season: 9 }],
    ['title-chaos', 'title', 'CHAOS Merchant', { missions: 8 }],
    ['title-mogul', 'title', 'Moneyball Mogul', { season: 15 }],
    ['title-wonderkid', 'title', 'Wonderkid', { season: 21 }],
    ['title-cardshark', 'title', 'Card Shark', { badges: 35 }],
    ['title-chairman', 'title', 'Dodgy Chairman', { season: 27 }],
    ['title-hof', 'title', 'Hall of Famer', { lvl: 40 }],
    ['title-ballon', 'title', 'Ballon d’Or', { lvl: 50 }],
    ['title-season', 'title', 'Season Champion', { season: 30 }],
    ['title-club', 'title', 'Club Ultra', { club: 6 }],
    // reactions (challenges)
    ['react-vuvu', 'react', '🎺 Vuvuzela!', { lvl: 7 }],
    ['react-cap', 'react', '🧢 Cap doffed', { season: 3 }],
    ['react-clown', 'react', '🤡 Clown show', { season: 12 }],
    ['react-ambulance', 'react', '🚑 Call an ambulance', { missions: 4 }],
    ['react-bus', 'react', '🚌 Parked the bus', { login: 1 }],
    ['react-popcorn', 'react', '🍿 Grabbing popcorn', { season: 18 }],
    ['react-brain', 'react', '🧠 Galaxy brain', { lvl: 18 }],
    ['react-sweep', 'react', '🧹 Clean sweep', { badges: 15 }],
    // 🏛️ vault-only: found in Legendary packs, a pack's bonus slot and on the prize wheel (prizes.js)
    ['pitch-wembley', 'pitch', 'Cup final day', { vault: 1 }],
    ['back-comic', 'back', 'Comic strip', { vault: 1 }],
    ['celeb-flares', 'celeb', 'Flares in the away end', { vault: 1 }],
    ['horn-bell', 'horn', 'The bell', { vault: 1 }],
    ['frame-rainbow', 'frame', 'Rainbow laces', { vault: 1 }],
    ['title-cult', 'title', 'Cult Hero', { vault: 1 }],
    ['title-journeyman', 'title', 'Journeyman', { vault: 1 }],
    ['react-gg', 'react', '🤝 Good game', { vault: 1 }],
    // 🎃 the Spooky Season event (prizes.js EVENTS): its own track while it's on, then the vault
    ['pitch-haunted', 'pitch', 'Haunted ground', { event: 'spooky26', tier: 3 }],
    ['back-spooky', 'back', 'Cobwebs', { event: 'spooky26', tier: 5 }],
    ['frame-pumpkin', 'frame', 'Pumpkin', { event: 'spooky26', tier: 7 }],
    ['celeb-ghosts', 'celeb', 'Ghosts in the stands', { event: 'spooky26', tier: 9 }],
    ['title-ghoul', 'title', 'Ghoul-keeper', { event: 'spooky26', tier: 10 }],
    // the seasons ahead (rewards.js SEASONS): each month's own items, on its track; 'coming soon' until then, the vault after
    ['pitch-ucl', 'pitch', 'European night', { season: 6, s: '2026-11' }],
    ['back-starball', 'back', 'Starball', { season: 12, s: '2026-11' }],
    ['frame-starry', 'frame', 'Starry night', { season: 18, s: '2026-11' }],
    ['celeb-starburst', 'celeb', 'Starburst', { season: 24, s: '2026-11' }],
    ['title-european', 'title', 'European Nights', { season: 30, s: '2026-11' }],
    ['pitch-xmas', 'pitch', 'Snow and fairy lights', { season: 6, s: '2026-12' }],
    ['back-wrapping', 'back', 'Wrapping paper', { season: 10, s: '2026-12' }],
    ['horn-sleigh', 'horn', 'Sleigh bells', { season: 14, s: '2026-12' }],
    ['frame-holly', 'frame', 'Holly', { season: 18, s: '2026-12' }],
    ['celeb-snowfall', 'celeb', 'Let it snow', { season: 24, s: '2026-12' }],
    ['title-boxingday', 'title', 'Boxing Day Hero', { season: 30, s: '2026-12' }],
    ['pitch-deadline', 'pitch', 'Deadline day', { season: 6, s: '2027-01' }],
    ['back-contract', 'back', 'The contract', { season: 12, s: '2027-01' }],
    ['react-herewego', 'react', '🚨 Here we go!', { season: 16, s: '2027-01' }],
    ['frame-cash', 'frame', 'Cash', { season: 20, s: '2027-01' }],
    ['title-dealer', 'title', 'Deadline Day Dealer', { season: 30, s: '2027-01' }],
    ['pitch-cupnight', 'pitch', 'Cup night under the lights', { season: 6, s: '2027-02' }],
    ['back-ribbons', 'back', 'Cup ribbons', { season: 12, s: '2027-02' }],
    ['frame-cup', 'frame', 'The cup', { season: 18, s: '2027-02' }],
    ['celeb-ribbons', 'celeb', 'Ribbons on the trophy', { season: 24, s: '2027-02' }],
    ['title-giantkiller', 'title', 'Giant-Killer', { season: 30, s: '2027-02' }],
    ['pitch-titlerace', 'pitch', 'Run-in', { season: 6, s: '2027-03' }],
    ['back-chequered', 'back', 'Chequered flag', { season: 12, s: '2027-03' }],
    ['horn-klaxon', 'horn', 'Klaxon', { season: 16, s: '2027-03' }],
    ['frame-champion', 'frame', 'Champions', { season: 20, s: '2027-03' }],
    ['title-squeaky', 'title', 'Squeaky Bum', { season: 30, s: '2027-03' }],
    ['pitch-spring', 'pitch', 'Spring flowers', { season: 6, s: '2027-04' }],
    ['back-egg', 'back', 'Painted egg', { season: 12, s: '2027-04' }],
    ['frame-pastel', 'frame', 'Pastel', { season: 18, s: '2027-04' }],
    ['celeb-eggs', 'celeb', 'Egg hunt', { season: 24, s: '2027-04' }],
    ['title-eggstra', 'title', 'Eggs-tra Time', { season: 30, s: '2027-04' }],
    ['pitch-trophyday', 'pitch', 'Trophy day', { season: 6, s: '2027-05' }],
    ['back-medal', 'back', 'Winner’s medal', { season: 12, s: '2027-05' }],
    ['frame-medal', 'frame', 'Gold medal', { season: 18, s: '2027-05' }],
    ['celeb-tickertape', 'celeb', 'Ticker tape parade', { season: 24, s: '2027-05' }],
    ['title-finalday', 'title', 'Final Day Hero', { season: 30, s: '2027-05' }],
    ['pitch-summer', 'pitch', 'Summer sun', { season: 6, s: '2027-06' }],
    ['back-tropical', 'back', 'Tropical', { season: 12, s: '2027-06' }],
    ['react-sunnies', 'react', '😎 Too easy', { season: 16, s: '2027-06' }],
    ['frame-sun', 'frame', 'Sunshine', { season: 20, s: '2027-06' }],
    ['title-summer', 'title', 'Summer Signing', { season: 30, s: '2027-06' }],
    // Dodgy Owner owners
    ['owner-celeb', 'owner', '🌟 The Celebrity', { lvl: 9 }, { text: 'A film star who bought the club for the documentary. Fans love the cameras (+10) and the sponsors pay double, but the heat is always on.' }],
    ['owner-trust', 'owner', '🤝 The Supporters’ Trust', { season: 24 }, { text: 'The fans own the club. No dodgy deals, ever: the fans start on 90 and won’t stand for heat. Not much money.' }],
  ];
  const ITEMS = {};
  L.forEach(([id, kind, name, src, extra]) => { ITEMS[id] = { id, kind, name, src, ...(extra || {}) }; });
  GM.LOCKER = ITEMS;
  GM.LOCKER_KINDS = KINDS;

  // what you own and wear
  const load = () => { const s = GM.store.get('locker', null) || { own: {}, eq: {}, seen: {} }; s.own = s.own || {}; s.eq = s.eq || {}; s.seen = s.seen || {}; return s; };
  const save = s => GM.store.set('locker', s);
  const nameOf = it => (it.id === 'title-club' ? `${clubShort()} Ultra` : it.name);
  const has = id => { const it = ITEMS[id]; return !!it && (!!it.src.def || !!load().own[id]); };
  const worn = kind => { const e = load().eq[kind]; return e && has(e) ? e : Object.values(ITEMS).find(x => x.kind === kind && x.src.def)?.id || null; };

  // things still to come (a later season's items, an event that hasn't started) stay a surprise: not shown until they're out or yours
  const secret = it => {
    if (has(it.id)) return false;
    const s = it.src;
    if (s.season) return (s.s || '2026-10') > (GM.gmSeason ? GM.gmSeason().id : '');
    if (s.event) { const e = (GM.EVENTS || []).find(x => x.id === s.event), on = GM.activeEvent && GM.activeEvent();
      return !(on && on.id === s.event) && !!e && new Date().toISOString().slice(0, 10) < e.from; }
    return false;
  };
  GM.lockerSecret = secret;
  // how you'd get it, in words
  const how = it => {
    const s = it.src;
    if (s.def) return 'Everyone has this';
    if (s.lvl) return `Reach level ${s.lvl}`;
    if (s.vault) return 'In the vault: Legendary packs and the prize wheel';
    if (s.event) { const e = (GM.EVENTS || []).find(x => x.id === s.event), on = GM.activeEvent && GM.activeEvent(); return on && on.id === s.event ? `${e.name} event, tier ${s.tier}` : `${e ? e.name + ' (event over)' : 'An event'}: in the vault now`; }
    if (s.season) { const now = GM.gmSeason ? GM.gmSeason().id : '', sid = s.s || '2026-10', z = GM.gmSeason ? GM.gmSeason(sid) : null;
      return sid === now ? `Season track, tier ${s.season}` : sid > now ? 'Coming soon' : 'From an old season: in the vault now'; }
    if (s.missions) return `Finish ${s.missions} weekly mission${s.missions > 1 ? 's' : ''}`;
    if (s.badges) return `Earn ${s.badges} badges`;
    if (s.club) return `Play ${s.club} daily game${s.club > 1 ? 's' : ''} for ${clubShort()}`;
    if (s.login) return 'A login reward (day 7)';
    return 'A special reward';
  };

  // gives an item (returns true if it's new); a toast and a dot on the Locker
  GM.giveItem = function (id, why, quiet) {
    const it = ITEMS[id];
    if (!it || has(id)) return false;
    const s = load(); s.own[id] = GM.today ? GM.today() : 1; save(s);
    if (!quiet) setTimeout(() => { GM.toast(`🎒 <b>Unlocked:</b> ${KINDS[it.kind].icon} ${GM.esc(nameOf(it))}${why ? ` · ${GM.esc(why)}` : ''}`, 3000); GM.sound.play('packget'); }, 600);
    return true;
  };
  // checks the unlocks that come from what you've done (level, badges, missions, club); called after XP, badges, dailies
  GM.lockerCheck = function (quiet) {
    const lvl = GM.myLevel ? GM.myLevel().n : 1, badges = Object.keys((GM.store.get('album', { ach: {} }).ach) || {}).length;
    const missions = +GM.store.get('missionsDone', 0), clubN = club() ? +GM.store.get('clubDailies', 0) : 0;
    const got = [];
    Object.values(ITEMS).forEach(it => {
      const s = it.src;
      const ok = (s.lvl && lvl >= s.lvl) || (s.badges && badges >= s.badges) || (s.missions && missions >= s.missions) || (s.club && clubN >= s.club);
      if (ok && GM.giveItem(it.id, s.lvl ? `level ${s.lvl}` : s.badges ? `${s.badges} badges` : s.missions ? `${s.missions} missions` : `${s.club} dailies for ${clubShort()}`, quiet || got.length > 2)) got.push(it.id);
    });
    if (got.length > 3 && !quiet) setTimeout(() => GM.toast(`🎒 <b>${got.length} new things</b> in your Locker`, 3000), 800);
    return got;
  };
  GM.lockerHas = has;
  GM.lockerWorn = worn;
  GM.lockerNew = () => { const s = load(); return Object.keys(s.own).filter(id => !s.seen[id]).length; };
  GM.ownerUnlocked = k => has('owner-' + k);
  GM.extraReactions = () => Object.values(ITEMS).filter(it => it.kind === 'react' && has(it.id)).map(it => it.name);

  /* ---------------------------------------------------------------- wearing it */
  // the look: classes on <body> for the pitch and card back (CSS does the rest), plus the club's colours
  GM.applyLocker = function () {
    const b = document.body; if (!b) return;
    [...b.classList].filter(c => /^(pk|cbk)-/.test(c)).forEach(c => b.classList.remove(c));
    b.classList.add('pk-' + worn('pitch').slice(6), 'cbk-' + worn('back').slice(5));
    const c = club() && GM.CLUB && GM.CLUB[club()];
    b.style.setProperty('--club1', c ? c[1] : '#16803c'); b.style.setProperty('--club2', c ? c[2] : '#ffffff');
  };
  // your celebration and horn (a new best, beating a friend, winning online)
  GM.celebrate = function (big = true) {
    const c = worn('celeb'), h = worn('horn'), FX = GM.FX && GM.FX.on ? GM.FX : null, body = document.body;
    const HORN = { 'horn-sleigh': 'bell', 'horn-klaxon': 'alarm', 'horn-bell': 'bell', 'horn-whistle': 'whistle', 'horn-air': 'horn', 'horn-vuvuzela': 'vuvuzela', 'horn-cheer': 'cheer', 'horn-fog': 'foghorn', 'horn-fanfare': 'fanfare' };
    GM.sound.play(HORN[h] || 'whistle');
    if (!FX || GM.store.get('calm', false)) return;
    const cc = club() && GM.CLUB && GM.CLUB[club()], hex = s => parseInt(String(s || '#ffffff').replace('#', ''), 16);
    try {
      if (c === 'celeb-fireworks') FX.fireworks(body, big ? 6 : 3);
      else if (c === 'celeb-money') FX.money(body, big ? 50 : 24);
      else if (c === 'celeb-lightning') { FX.lightning(innerWidth * 0.3, innerHeight * 0.5); setTimeout(() => FX.lightning(innerWidth * 0.7, innerHeight * 0.45), 350); GM.sound.play('thunder'); }
      else if (c === 'celeb-pigeon') { if (FX.lottie) FX.lottie('pigeon', { x: innerWidth / 2, y: innerHeight * 0.4 }); FX.confetti(body, 40); }
      else if (c === 'celeb-trophy') { if (FX.lottie) FX.lottie('trophy', { x: innerWidth / 2, y: innerHeight * 0.42 }); FX.shimmer(body, 0xffe14a, 30); }
      else if (c === 'celeb-flares') { [0.2, 0.5, 0.8].forEach((f, k) => setTimeout(() => FX.flare(innerWidth * f, innerHeight * 0.75, 2400, [0xff4a3d, 0x3b82f6, 0xfacc15][k]), k * 250)); }
      else if (c === 'celeb-ghosts') { GM.sound.play('spooky'); FX.lottie('ghost', { x: innerWidth / 2, y: innerHeight * 0.42, w: 170 }); FX.lottie('batmoon', { x: innerWidth / 2, y: innerHeight * 0.22, w: 220 }); FX.smoke(innerWidth * 0.3, innerHeight * 0.6, { tint: 0xe9d5ff, ms: 2200 }); FX.smoke(innerWidth * 0.7, innerHeight * 0.55, { tint: 0xe9d5ff, ms: 2200 }); setTimeout(() => GM.sound.play('boo'), 700); }
      else if (c === 'celeb-starburst') { FX.shimmer(body, 0x93c5fd, 40); FX.fireworks(body, 4); FX.lottie('fireworks', { x: innerWidth / 2, y: innerHeight * 0.35, w: 300 }); }
      else if (c === 'celeb-snowfall') { FX.snow(body, 3500); GM.sound.play('bell'); FX.lottie('snowman', { x: innerWidth / 2, y: innerHeight * 0.45, w: 180 }); }
      else if (c === 'celeb-ribbons') { FX.lottie('trophy', { x: innerWidth / 2, y: innerHeight * 0.42, w: 180 }); FX.shimmer(body, 0xef4444, 30); FX.shimmer(body, 0xffffff, 30); FX.confetti(body, 60); }
      else if (c === 'celeb-eggs') { FX.lottie('bunny', { x: innerWidth / 2, y: innerHeight * 0.45, w: 150 }); [0xf9a8d4, 0xa7f3d0, 0xfde68a, 0xc4b5fd].forEach(t => FX.shimmer(body, t, 24)); }
      else if (c === 'celeb-tickertape') { FX.lottie('fireworks', { x: innerWidth / 2, y: innerHeight * 0.3, w: 300 }); FX.lottie('trophy', { x: innerWidth / 2, y: innerHeight * 0.5, w: 170 }); FX.shimmer(body, 0xfacc15, 50); FX.confetti(body, 120); FX.fireworks(body, 3); }
      else if (c === 'celeb-club' && cc) { FX.shimmer(body, hex(cc[1]), 40); FX.shimmer(body, hex(cc[2]), 30); FX.confetti(body, 60); }
      else FX.confetti(body, big ? 140 : 70);
    } catch (e) { /* the effects layer isn't ready */ }
  };

  /* ---------------------------------------------------------------- frames and titles everyone sees */
  GM.flair = {};  // name (lower case) -> { f, t }
  GM.titleText = id => { const it = ITEMS[id]; return it ? (id === 'title-club' ? 'Ultra' : it.name) : ''; };
  // the server copy of what you wear (only when it changes)
  GM.syncFlair = function () {
    const a = GM.account(); if (!a || !GM.lb.enabled) return;
    const f = worn('frame'), t = worn('title'), fv = f === 'frame-none' ? '' : f, tv = t === 'title-none' ? '' : t, sent = `${a.name}|${fv}|${tv}`;
    GM.flair[a.name.toLowerCase()] = { f: fv, t: tv };
    if (GM.store.get('flairSent', '') === sent) return;
    GM.lb.rpc('set_flair', { p_user: a.name, p_key: a.key, p_frame: fv, p_title: tv }).then(r => { if (r === 'ok') GM.store.set('flairSent', sent); }).catch(() => { });
  };
  // frames go on every picture of that player; titles fill any <i data-utitle="name">
  GM.paintFlair = function () {
    GM.$$('[data-user]').forEach(e => {
      const fl = GM.flair[e.dataset.user.toLowerCase()] || {};
      [...e.classList].filter(c => c.startsWith('fr-')).forEach(c => e.classList.remove(c));
      if (fl.f && ITEMS[fl.f]) e.classList.add('fr-' + fl.f.slice(6));
    });
    GM.$$('[data-utitle]').forEach(e => {
      const fl = GM.flair[e.dataset.utitle.toLowerCase()] || {};
      e.textContent = fl.t && ITEMS[fl.t] ? GM.titleText(fl.t) : '';
      e.hidden = !e.textContent;
    });
  };
  GM.fetchFlair = async function (names) {
    const want = [...new Set(names.map(n => n.toLowerCase()))].filter(n => n && !(n in GM.flair));
    if (!want.length || !GM.lb.enabled) return GM.paintFlair();
    want.forEach(n => { GM.flair[n] = {}; });
    try { const got = await GM.lb.rpc('get_flair', { p_names: want.slice(0, 60) }); Object.entries(got || {}).forEach(([n, f]) => { GM.flair[n.toLowerCase()] = f || {}; }); } catch (e) { want.forEach(n => { delete GM.flair[n]; }); }
    GM.paintFlair();
  };
  GM.titleHtml = name => `<i class="utitle" data-utitle="${GM.esc(name || '')}" hidden></i>`;

  /* ---------------------------------------------------------------- the Locker tab (#/locker) */
  // Everything you've got and are working towards, one tab: you (picture, frame, title) at the top, then
  //   🏆 Season  the season pass (rewards.js)          🃏 My XI   the Packed XI (collection.js)
  //   🧩 Cards   cards, signed players, Purist            🏅 Badges                        👕 Kit  what you wear (below)
  // Old addresses still work: #/album → My XI, #/album?v=badges, #/packs → Cards, #/season → Season, #/locker?k=pitch → Kit.
  const VIEWS = [['season', '🏆', 'Season'], ['xi', '🃏', 'My XI'], ['cards', '🧩', 'Cards'], ['badges', '🏅', 'Badges'], ['kit', '👕', 'Kit']];
  GM.lockerHub = function (root, q = {}) {
    let v = q.v === 'signed' ? 'cards' : q.v;
    if (!v && q.k) v = 'kit';
    if (!VIEWS.some(x => x[0] === v)) v = GM.store.get('lockerView', 'season');
    if (!VIEWS.some(x => x[0] === v)) v = 'season';
    GM.store.set('lockerView', v);
    const me = (GM.account() || {}).name || GM.getName() || 'You', s = load();
    const n = Object.values(ITEMS).filter(it => has(it.id)).length, total = Object.values(ITEMS).filter(it => !secret(it)).length;
    const a = GM.store.get('album', { ach: {} }), badges = Object.keys(a.ach || {}).length, i = GM.seasonInfo ? GM.seasonInfo() : null;
    const dot = { kit: GM.lockerNew() > 0, cards: GM.packsWaiting && GM.packsWaiting() > 0 };
    root.innerHTML = `<div class="lk-me">${GM.userPic(me, 'lg')}<span><b>${GM.esc(me)}</b>${GM.titleHtml(me)}
        <small class="lk-stats">${i ? `<span>${i.icon} Tier ${i.tier}</span>` : ''}<span>🏅 ${badges} badges</span><span>👕 ${n}/${total} kit</span></small></span>
        <a class="icon-btn" href="#/settings" aria-label="Settings">⚙️</a></div>
      <div class="seg lk-views">${VIEWS.map(([k, ic, l]) => `<a class="${k === v ? 'on' : ''}" href="#/locker?v=${k}" data-v="${k}"><span>${ic}</span>${l}${dot[k] ? '<i class="new-dot"></i>' : ''}</a>`).join('')}</div>
      <div id="lk-body" class="lk-body lk-v-${v}"></div>`;
    const body = GM.$('#lk-body', root);
    if (v === 'season') GM.seasonPage(body);
    else if (v === 'kit') kit(body, q);
    else GM.albumView(body, v === 'cards' && q.v === 'signed' ? 'signed' : v, q.c, q.t, q.open === '1' || q.open === true);
    GM.syncFlair(); GM.fetchFlair([me]);
  };
  // 👕 Kit: pitch styles, card backs, celebrations, horns, frames, titles, reactions, owners
  function kit(root, q = {}) {
    const s = load(), kind = KINDS[q.k] ? q.k : GM.store.get('lockerTab', 'pitch');
    const items = Object.values(ITEMS).filter(it => it.kind === kind && !secret(it));
    const me = (GM.account() || {}).name || GM.getName() || 'You';
    root.innerHTML = `<div class="seg wrap lk-tabs">${Object.entries(KINDS).map(([k, v]) => {
        const fresh = Object.values(ITEMS).some(it => it.kind === k && s.own[it.id] && !s.seen[it.id]);
        return `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${v.icon} ${v.name}${fresh ? '<i class="new-dot"></i>' : ''}</button>`;
      }).join('')}</div>
      <p class="muted center small">${KINDS[kind].sub}</p>
      <div class="lk-grid lk-k-${kind}">${items.map(it => {
        const own = has(it.id), on = kind === 'react' || kind === 'owner' ? own : worn(kind) === it.id, fresh = s.own[it.id] && !s.seen[it.id];
        return `<button class="lk-item ${own ? '' : 'locked'} ${on && kind !== 'react' && kind !== 'owner' ? 'on' : ''}" data-id="${it.id}">
          <span class="lk-pre ${preClass(it)}">${preview(it, me)}</span><b>${GM.esc(nameOf(it))}${fresh ? ' <i class="new-tag">NEW</i>' : ''}</b>
          <small>${own ? (kind === 'react' ? 'In your challenge reactions' : kind === 'owner' ? 'In Dodgy Owner' : on ? '✓ Wearing' : 'Tap to use') : '🔒 ' + how(it)}</small></button>`;
      }).join('')}</div>`;
    items.forEach(it => { if (s.own[it.id]) s.seen[it.id] = 1; }); save(s);
    GM.$$('.lk-tabs [data-k]', root).forEach(b => b.onclick = () => { GM.store.set('lockerTab', b.dataset.k); kit(root, { k: b.dataset.k }); });
    GM.$$('.lk-item', root).forEach(b => b.onclick = () => {
      const it = ITEMS[b.dataset.id];
      if (!has(it.id)) { GM.toast(`🔒 ${GM.esc(how(it))}`); GM.buzz('reject'); return; }
      if (kind === 'react' || kind === 'owner') { GM.toast(kind === 'react' ? `💬 “${GM.esc(it.name)}” is in your challenge reactions` : `🕴️ ${GM.esc(it.name)} is waiting in Dodgy Owner`); return; }
      const st = load(); st.eq[kind] = it.id; save(st);
      GM.applyLocker(); GM.buzz('confirm');
      if (kind === 'celeb' || kind === 'horn') GM.celebrate(false);
      if (kind === 'frame' || kind === 'title') GM.syncFlair();
      kit(root, { k: kind });
    });
    if (GM.statusBar) GM.statusBar();
  }
  GM.lockerPage = (root, q = {}) => GM.lockerHub(root, { ...q, v: 'kit' });  // (the old name)
  const preClass = it => (it.kind === 'pitch' ? 'pk-' + it.id.slice(6) : it.kind === 'back' ? 'cbk-' + it.id.slice(5) : it.kind === 'frame' ? 'fr-' + it.id.slice(6) : '');
  function preview(it, me) {
    if (it.kind === 'pitch') return '<i class="lk-pitch"></i>';
    if (it.kind === 'back') return '<i class="lk-back"><b>GM</b></i>';
    if (it.kind === 'frame') return GM.userPic(me).replace('data-user=', 'data-nofl data-u=');
    if (it.kind === 'title') return `<i class="utitle">${GM.esc(it.id === 'title-none' ? '—' : it.id === 'title-club' ? `${clubShort()} Ultra` : it.name)}</i>`;
    const ICON = { 'celeb-starburst': '🌟', 'celeb-snowfall': '❄️', 'celeb-ribbons': '🎀', 'celeb-eggs': '🥚', 'celeb-tickertape': '🎊', 'horn-sleigh': '🛷', 'horn-klaxon': '🚨', 'celeb-flares': '🧨', 'celeb-ghosts': '👻', 'horn-bell': '🛎️', 'celeb-confetti': '🎊', 'celeb-fireworks': '🎆', 'celeb-money': '💸', 'celeb-lightning': '⚡', 'celeb-pigeon': '🐦', 'celeb-trophy': '🏆', 'celeb-club': '🎗️',
      'horn-whistle': '🔔', 'horn-air': '📯', 'horn-vuvuzela': '🎺', 'horn-cheer': '🙌', 'horn-fog': '🚢', 'horn-fanfare': '🎉' };
    if (it.kind === 'react') return it.name.split(' ')[0];
    if (it.kind === 'owner') return it.name.split(' ')[0];
    return ICON[it.id] || KINDS[it.kind].icon;
  }
})();

/* Goal Machine – the XI draft: Ultimate Wildcard (most goals/assists/apps), Target (hit a number) and the Daily */
'use strict';

(function () {
  const FORMATION = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];
  // CHAOS kicks off in a random shape (seeded, so a Daily CHAOS or a CHAOS Race gives everyone the same one)
  const CHAOS_FORMATIONS = [
    FORMATION,                                                        // 4-4-2
    ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST'], // 4-5-1
    ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST', 'ST'], // 3-5-2
    ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST'], // 5-4-1
    ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'ST', 'ST', 'ST'], // 4-3-3
    ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST', 'ST'], // 3-4-3
    ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'ST', 'ST'], // 5-3-2
  ];
  const baseForm = () => (S && S.form) || FORMATION;
  const SIDE = { LB: 0, LM: 0, RB: 2, RM: 2 }; // for left-to-right ordering on the pitch
  // Target mode numbers - simulated so each is reachable in ~70% of games by someone picking the biggest numbers
  const TARGETS = { goals: 500, assists: 325, apps: 3400 };
  // The Treble: hit all three at once (above what a random team gets, below what a greedy one gets)
  const TREBLE = { goals: 400, assists: 300, apps: 3300 };
  // Mystery Target: stat and number are drawn at random; the number stays hidden until full time
  const MYSTERY = { goals: [300, 650], assists: [220, 420], apps: [2600, 4200] };
  // Target Race (online): a new target every game, anywhere in this range - some are much harder than others,
  // but you both chase the same one on the same spins, so it's all about who gets closer
  const RACE_TARGET = { goals: [220, 800], assists: [150, 520], apps: [2200, 5000] };
  const STAT_KEYS = ['goals', 'assists', 'apps'];
  // "big number" filter for the Centurion Throw, per stat
  const BIG = { goals: 100, assists: 50, apps: 400 };

  // kind: 'reveal' | 'respin' | 'special' (themed spin) | 'formation' | 'modifier' | 'sub'
  const WILDCARDS = {
    scout: { icon: '🔍', name: "Scout's IQ", w: 3, kind: 'reveal', desc: st => `See the PL ${st.label} of the players on the reels this turn.` },
    respin: { icon: '🎰', name: 'Roll Again', w: 3, kind: 'respin', desc: () => 'Throw these back and spin again – free.' },
    sub: { icon: '🔄', name: 'Make a Sub', w: 2, kind: 'sub', desc: st => `Release a player from your XI. His ${st.label} come off.` },
    centurion: { icon: '💯', name: 'Centurion Throw', w: 1.5, kind: 'special', desc: st => `A free spin of players with ${BIG[st.id]}+ PL ${st.bigLabel || st.label}.`, filter: (p, st) => p[st.key] >= BIG[st.id] },
    gegenpress: { icon: '⚡', name: 'Gegenpress', w: 1.5, kind: 'formation', desc: () => 'Your empty LM and RM slots push up and become strikers.' },
    bus: { icon: '🚌', name: 'Park the Bus', w: 1.5, kind: 'formation', desc: () => 'Two empty attacking slots drop back to centre-back.' },
    captain: { icon: '©️', name: "Captain's Armband", w: 1.5, kind: 'modifier', desc: st => {
      // in CHAOS the armband passes down: captain ×2, then vice-captain ×1.5, then ×1.25 (no endless armband + Centurion Throw)
      const n = S && S.rules && S.rules.chaos ? Math.min(S.capN || 0, 2) : 0;
      return `${['Captain', 'Vice-captain', 'Vice-vice-captain'][n]}: your next signing’s ${st.label} count ×${CAP[n]}.`; } },
    rotation: { icon: '🩹', name: 'Rotation Risk', w: 1.5, kind: 'modifier', desc: st => `Your next signing’s ${st.label} count half (rounded down).` },
    coin: { icon: '🎲', name: 'Double or Nothing', w: 1, kind: 'modifier', desc: st => `Coin toss on your next signing: his ${st.label} count ×2… or ×0.` },
    deadline: { icon: '⏰', name: 'Deadline Day', w: 1.5, kind: 'special', desc: () => 'A free spin with FIVE players to choose from.', reels: 5 },
    oneclub: { icon: '❤️', name: 'One-Club Man', w: 1, kind: 'special', desc: () => 'A free spin of players who only played for one PL club.', filter: p => p.clubs.length === 1 },
    journeyman: { icon: '🧳', name: 'Journeyman', w: 1, kind: 'special', desc: () => 'A free spin of players who turned out for 4+ PL clubs.', filter: p => p.clubs.length >= 4 },
    throwback: { icon: '📼', name: '90s Throwback', w: 1, kind: 'special', desc: () => 'A free spin of players whose PL career began in the 1990s.', filter: p => p.first <= 1999 },
    // CHAOS only
    allin: { icon: '🎰', name: 'All In', w: 1.2, chaos: true, kind: 'allin', desc: () => 'Coin toss on your whole XI so far: every signing ×2… or ×½.' },
    hot: { icon: '🔥', name: 'Hot Streak', w: 1.2, chaos: true, kind: 'hot', desc: st => `Your next three signings’ ${st.label} count ×1.5.` },
    magnet: { icon: '🧲', name: 'Old Teammates', w: 1.2, chaos: true, kind: 'special', desc: () => 'A free spin of players who played alongside your last signing (chemistry bonus!).',
      filter: p => { const lp = S.last != null ? byId(S.last) : null; return !!lp && p.first <= lp.last && p.last >= lp.first && p.clubs.some(c => lp.clubs.includes(c)); } },
    trophy: { icon: '🏆', name: 'Trophy Cabinet', w: 1.2, chaos: true, kind: 'special', desc: () => 'A free spin of PL title winners (title bonus!).', filter: p => (p.hon.P || 0) > 0 },
    storm: { icon: '🌪️', name: 'Wildcard Storm', w: 1, chaos: true, kind: 'special', desc: () => 'A free spin of nothing but wildcards.', storm: true },
    physio: { icon: '🏥', name: 'Physio Room', w: 1, chaos: true, kind: 'heal', desc: st => `Your most-hurt player gets his full ${st.label} back.` },
    joker: { icon: '🃏', name: 'Joker', w: 1, chaos: true, kind: 'joker', desc: () => 'Turns into a random CHAOS wildcard.' },
    // (kept as 'hero' so games saved with the old Hat-Trick Hero still load)
    hero: { icon: '🎩', name: 'Hat-Trick', w: 1, chaos: true, kind: 'special', trio: true, desc: st => `A spin of three players for one position: sign them ALL as one, their ${st.label} added up. Under ${HAT[st.id] || 50} between them and he counts half.` },
  };
  // drawn vehicles for CHAOS moments (side on, facing right; wheels turn while they drive, lights flash)
  const WHEEL = x => `<g transform="translate(${x} 37)"><g class="whl"><circle r="7" fill="#1d1f24"/><circle r="3.4" fill="#c4c9d2"/><rect x="-0.9" y="-6.4" width="1.8" height="12.8" fill="#6b717c"/></g></g>`;
  const SPRITE = {
    ambulance: `<svg class="spr" viewBox="0 0 82 46" width="82" height="46"><rect x="2" y="9" width="52" height="27" rx="3" fill="#fbfbf7" stroke="#b9c0c9"/>
      <path d="M54 15h13l11 11v10H54z" fill="#fbfbf7" stroke="#b9c0c9"/><path d="M57 18h9l8 8H57z" fill="#8fd0ff"/><rect x="2" y="25" width="76" height="4" fill="#e3262f"/>
      <rect x="2" y="29" width="76" height="3" fill="#f6d31e"/><path d="M21 13h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#e3262f"/>
      <rect class="lt a" x="38" y="4" width="7" height="5" rx="1.5" fill="#2f7bff"/><rect class="lt b" x="46" y="4" width="7" height="5" rx="1.5" fill="#2f7bff"/>${WHEEL(16)}${WHEEL(64)}</svg>`,
    police: `<svg class="spr" viewBox="0 0 82 46" width="82" height="46"><path d="M3 34V24q0-4 4-4h12l9-9h22l10 9h13q6 1 6 6v8z" fill="#f7f8fb" stroke="#9aa3ae"/>
      <path d="M31 13h18v8H24z" fill="#8fd0ff"/><path d="M51 13h7l8 8H51z" fill="#8fd0ff"/>
      <path d="M3 25h10v6H3zM23 25h10v6H23zM43 25h10v6H43zM63 25h10v6H63z" fill="#1747b8"/><path d="M13 25h10v6H13zM33 25h10v6H33zM53 25h10v6H53zM73 25h6v6h-6z" fill="#f6d31e"/>
      <text x="40" y="20" font-size="5" font-weight="900" font-family="Arial" fill="#1747b8" text-anchor="middle">POLICE</text>
      <rect class="lt a" x="32" y="6" width="8" height="5" rx="1.5" fill="#2f7bff"/><rect class="lt b" x="41" y="6" width="8" height="5" rx="1.5" fill="#ff3640"/>${WHEEL(17)}${WHEEL(64)}</svg>`,
    ufo: `<svg class="spr" viewBox="0 0 90 46" width="90" height="46"><defs><radialGradient id="ufo-dome"><stop offset="0" stop-color="#e9fbff"/><stop offset="1" stop-color="#7fd6ff"/></radialGradient></defs>
      <ellipse cx="45" cy="18" rx="17" ry="13" fill="url(#ufo-dome)" stroke="#5aa9cc"/><ellipse cx="45" cy="26" rx="43" ry="11" fill="#9aa4b5" stroke="#5e6878"/>
      <ellipse cx="45" cy="23" rx="43" ry="5" fill="#c3cad6"/><circle class="lt a" cx="17" cy="28" r="3" fill="#7dff6b"/><circle class="lt b" cx="31" cy="31" r="3" fill="#ff5ec8"/>
      <circle class="lt a" cx="45" cy="32" r="3" fill="#ffe14a"/><circle class="lt b" cx="59" cy="31" r="3" fill="#7dff6b"/><circle class="lt a" cx="73" cy="28" r="3" fill="#ff5ec8"/></svg>`,
    // a London pigeon: wings flap while it flies, it pecks once it has landed
    pigeon: `<svg class="spr pidge" viewBox="0 0 44 34" width="44" height="34"><path class="wing" d="M17 14q9-13 21-9-7 5-10 13z" fill="#7d8694"/>
      <ellipse cx="21" cy="20" rx="13" ry="8" fill="#9aa2ae"/><path d="M8 18l-7-3 2 6z" fill="#6f7782"/><g class="head"><circle cx="33" cy="13" r="5.5" fill="#7a8390"/>
      <path d="M30 17q4 3 8-1" stroke="#5fae86" stroke-width="2.4" fill="none"/><path d="M38 12l4 1.5-4 1z" fill="#e7b9a3"/><circle cx="34.6" cy="11.8" r="1.2" fill="#e8642c"/></g>
      <path d="M19 27v5M24 27v5" stroke="#e48a7c" stroke-width="1.6"/></svg>`,
    heli: `<svg class="spr" viewBox="0 0 110 52" width="110" height="52"><rect class="rotor" x="8" y="2" width="84" height="3" rx="1.5" fill="#2b2f36"/><rect x="48" y="4" width="4" height="8" fill="#2b2f36"/>
      <path d="M30 14h36q14 0 16 14v4H30q-8 0-8-9t8-9z" fill="#1d4ed8" stroke="#163a9e"/><path d="M64 16h4q10 1 12 11H64z" fill="#9fd8ff"/><path d="M30 20h-28v4h28z" fill="#1d4ed8"/>
      <circle class="trot" cx="4" cy="20" r="6" fill="none" stroke="#2b2f36" stroke-width="2" stroke-dasharray="3 3"/><text x="42" y="28" font-size="8" font-weight="900" font-family="Arial" fill="#fff">££</text>
      <path d="M30 40h46M36 32v8M70 32v8" stroke="#2b2f36" stroke-width="2.5"/></svg>`,
    tank: `<svg class="spr" viewBox="0 0 104 50" width="104" height="50"><rect x="6" y="30" width="88" height="14" rx="7" fill="#2f3324"/>
      <path d="M10 22h80l6 9H4z" fill="#5d6b3a" stroke="#3f4a26"/><path d="M34 10h30l6 12H28z" fill="#6c7c45" stroke="#3f4a26"/><rect x="64" y="13" width="38" height="4" rx="2" fill="#4c5730"/>
      <path d="M46 14l1.6 3.4 3.7.4-2.8 2.5.8 3.7L46 22.2l-3.3 1.8.8-3.7-2.8-2.5 3.7-.4z" fill="#f2f2e6"/>
      ${[16, 30, 44, 58, 72, 86].map(x => `<g transform="translate(${x} 37)"><g class="whl"><circle r="5" fill="#555c45"/><rect x="-0.8" y="-4.5" width="1.6" height="9" fill="#2f3324"/></g></g>`).join('')}</svg>`,
    wedding: `<svg class="spr" viewBox="0 0 120 46" width="120" height="46"><path d="M2 30l-0 0" />${[4, 14, 24].map((x, k) => `<g class="can c${k}"><path d="M${x + 22} 30L${x + 8} 33" stroke="#999" stroke-width="0.8"/><rect x="${x}" y="31" width="7" height="6" rx="1" fill="#c9ced6"/></g>`).join('')}
      <path d="M34 34V24q0-4 4-4h12l8-8h24l10 9h14q8 1 8 7v6z" fill="#fbfbf7" stroke="#b9c0c9"/><path d="M60 14h20v7H55z" fill="#8fd0ff"/><path d="M82 14h6l7 7H82z" fill="#8fd0ff"/>
      <path d="M40 24h60" stroke="#ff7eb6" stroke-width="2"/><path d="M98 18l6-6M104 18l-6-6" stroke="#ff7eb6" stroke-width="2"/>
      <text x="66" y="31" font-size="5.5" font-weight="900" font-family="Arial" fill="#e0457b" text-anchor="middle">JUST MARRIED</text>${WHEEL(48)}${WHEEL(98)}</svg>`,
    briefcase: `<svg class="spr" viewBox="0 0 44 34" width="44" height="34"><path d="M16 6h12v5h-3V9h-6v2h-3z" fill="#4a3018"/><rect x="3" y="10" width="38" height="22" rx="3" fill="#7a4b22" stroke="#4a3018"/>
      <rect x="3" y="17" width="38" height="3" fill="#5c3818"/><rect x="19" y="15" width="6" height="7" rx="1" fill="#d8b44a"/></svg>`,
  };
  // little drawn leftovers (CHAOS leaves its mark): a key starting with # in MESS is drawn, not an emoji
  const NOTE = `<svg viewBox="0 0 30 16" width="26" height="14"><rect width="30" height="16" rx="2" fill="#5fae6e" stroke="#2f7a42"/><circle cx="15" cy="8" r="4.5" fill="#8fd39b"/><text x="15" y="10.6" font-size="7" font-weight="900" font-family="Arial" fill="#1e5a2e" text-anchor="middle">£</text></svg>`;
  const LEFT = {
    pigeon: () => SPRITE.pigeon.replace('class="spr pidge"', 'class="spr pidge pecking"'),
    debris: () => `<svg viewBox="0 0 40 26" width="40" height="26"><path d="M2 20l14-8 3 4-14 8z" fill="#8a6a44"/><path d="M20 22l12-14 3 2-11 14z" fill="#a07a50"/><path d="M8 8l6 2-2 4z" fill="#ccc"/><circle cx="33" cy="20" r="3" fill="#9aa"/></svg>`,
    pad: () => `<svg viewBox="0 0 44 44" width="40" height="40"><circle cx="22" cy="22" r="19" fill="none" stroke="#ffe14a" stroke-width="3"/><text x="22" y="30" font-size="22" font-weight="900" font-family="Arial" fill="#ffe14a" text-anchor="middle">H</text></svg>`,
    puddle: () => `<svg viewBox="0 0 60 22" width="54" height="20"><ellipse cx="30" cy="11" rx="28" ry="9" fill="rgba(110,170,230,.55)"/><ellipse cx="22" cy="9" rx="10" ry="3" fill="rgba(255,255,255,.35)"/></svg>`,
    confetti: () => `<svg viewBox="0 0 40 30" width="40" height="30">${['#ff5ec8', '#ffe14a', '#5ec8ff', '#7dff6b', '#fff'].map((c, k) => `<rect x="${3 + k * 7}" y="${(k * 11) % 22 + 2}" width="5" height="3" fill="${c}" transform="rotate(${k * 37} ${5 + k * 7} ${(k * 11) % 22 + 3})"/>`).join('')}</svg>`,
    notes: () => `<span class="notes">${NOTE}${NOTE}</span>`,
    tracks: () => `<svg viewBox="0 0 70 20" width="66" height="18"><path d="M0 4h70M0 16h70" stroke="#4a3b2a" stroke-width="5" stroke-dasharray="3 3" opacity=".55"/></svg>`,
    tape: () => `<svg viewBox="0 0 70 16" width="64" height="15"><rect width="70" height="16" fill="#ffd400"/><path d="M6 0l10 16M22 0l10 16M38 0l10 16M54 0l10 16" stroke="#111" stroke-width="6"/><text x="35" y="11.5" font-size="7.5" font-weight="900" font-family="Arial" fill="#111" text-anchor="middle" style="paint-order:stroke" stroke="#ffd400" stroke-width="3">POLICE</text></svg>`,
    flare: () => `<svg viewBox="0 0 30 40" width="26" height="36"><circle class="smoke" cx="15" cy="12" r="11" fill="rgba(255,60,60,.45)"/><circle class="smoke s2" cx="10" cy="7" r="7" fill="rgba(255,120,80,.35)"/><rect x="12" y="20" width="6" height="16" rx="2" fill="#d22"/><circle cx="15" cy="20" r="3.5" fill="#ffd34d"/></svg>`,
    ball: () => `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10.5" fill="#ffd34d" stroke="#a67c00"/><path d="M12 6l4 3-1.6 4.6h-4.8L8 9z" fill="#7a5900"/></svg>`,
    tv: () => `<svg viewBox="0 0 40 30" width="34" height="26"><rect x="2" y="3" width="36" height="22" rx="3" fill="#1b1f2a" stroke="#555"/><rect x="5" y="6" width="30" height="16" fill="#2c7be5"/><text x="20" y="18" font-size="8" font-weight="900" font-family="Arial" fill="#fff" text-anchor="middle">VAR</text><path d="M14 25l-4 4M26 25l4 4" stroke="#555" stroke-width="2"/></svg>`,
    scarf: () => `<svg viewBox="0 0 54 16" width="50" height="15">${[0, 1, 2, 3, 4, 5].map(k => `<rect x="${3 + k * 8}" y="3" width="8" height="10" fill="${k % 2 ? '#fff' : 'var(--cb, #d22)'}"/>`).join('')}<path d="M3 3l-3 2M3 8l-3 0M3 13l-3-2M51 3l3 2M51 8l3 0M51 13l3-2" stroke="#ddd"/></svg>`,
    bucket: () => `<svg viewBox="0 0 30 30" width="26" height="26"><path d="M5 10h20l-3 18H8z" fill="#3a86ff" stroke="#1d4fa8"/><path d="M5 10q10-10 20 0" fill="none" stroke="#888" stroke-width="1.5"/><ellipse cx="20" cy="9" rx="6" ry="3.5" fill="#ffd34d"/></svg>`,
    paper: () => `<svg viewBox="0 0 26 32" width="22" height="27"><path d="M2 2h16l6 6v22H2z" fill="#fff" stroke="#aaa"/><path d="M6 12h14M6 17h14M6 22h9" stroke="#999" stroke-width="1.5"/></svg>`,
    card: () => `<svg viewBox="0 0 20 28" width="16" height="22"><rect x="1" y="1" width="18" height="26" rx="2" fill="#e3262f" stroke="#8a0d13"/></svg>`,
    scorch: () => `<svg viewBox="0 0 44 30" width="40" height="28"><ellipse cx="22" cy="15" rx="20" ry="12" fill="rgba(30,20,10,.55)"/><ellipse cx="22" cy="15" rx="10" ry="6" fill="rgba(10,5,0,.6)"/><circle class="ember" cx="16" cy="13" r="1.6" fill="#ff8a3d"/><circle class="ember e2" cx="27" cy="17" r="1.4" fill="#ffd34d"/></svg>`,
    ring: () => `<svg viewBox="0 0 50 24" width="48" height="23"><ellipse cx="25" cy="12" rx="23" ry="10" fill="none" stroke="rgba(160,255,120,.8)" stroke-width="2.5"/><ellipse cx="25" cy="12" rx="14" ry="5" fill="rgba(160,255,120,.25)"/></svg>`,
    chip: () => `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10.5" fill="#d22" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`,
    cross: () => `<svg viewBox="0 0 22 22" width="18" height="18"><rect x="1" y="1" width="20" height="20" rx="4" fill="#fff" stroke="#ccc"/><path d="M8 4h6v4h4v6h-4v4H8v-4H4V8h4z" fill="#e3262f"/></svg>`,
    coin: () => `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#f2c230" stroke="#8a6406" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#b98a0c"/></svg>`,
    heart: () => `<svg viewBox="0 0 30 28" width="24" height="22"><path d="M15 26L3 13q-5-7 2-11 6-3 10 4l-3 5 4 4z" fill="#e3262f"/><path d="M15 26l12-13q5-7-2-11-6-3-10 4l3 5-4 4z" fill="#c21b24" transform="translate(3 2) rotate(8 15 15)"/></svg>`,
  };
  // the Hat-Trick's bar (the three together), per stat; the armband in CHAOS, use by use
  const HAT = { goals: 50, assists: 30, apps: 400 };
  const CAP = [2, 1.5, 1.25];
  // CHAOS events: now and then, something happens to you before a spin (seeded, so a challenge gets the same chaos)
  const EVENTS = {
    redcard: { rar: 'c', icon: '🟥', name: 'Red card', w: 1, desc: st => `Your next signing’s ${st.label} count half.` },
    injury: { rar: 'c', icon: '🚑', name: 'Injury crisis', w: 1, desc: st => `One of your players picks up a knock: his ${st.label} are halved.` },
    taxman: { rar: 'u', icon: '🧾', name: 'The taxman', w: 0.8, desc: () => 'Takes a wildcard from your bag.' },
    windfall: { rar: 'c', icon: '💰', name: 'TV money', w: 1, desc: () => 'A windfall: bonus points!' },
    derby: { rar: 'c', icon: '🔥', name: 'Derby day', w: 1, desc: st => `Your next signing’s ${st.label} count double.` },
    golden: { rar: 'u', icon: '⚽', name: 'Golden goal', w: 0.7, desc: st => `Your next signing’s ${st.label} count TRIPLE.` },
    var: { rar: 'u', icon: '📺', name: 'VAR check', w: 0.9, desc: () => 'VAR reviews your last signing…' },
    box: { rar: 'u', icon: '🎁', name: 'Mystery box', w: 0.9, desc: () => 'A free CHAOS wildcard for your bag.' },
    masked: { rar: 'u', icon: '🎭', name: 'Masked men', w: 0.8, desc: () => 'This spin’s players wear masks: no names until you sign one.' },
  };
  // how rare things are: common, uncommon, rare, legendary (the badge on the card, and how often they come up)
  const RAR = { c: 1, u: 0.45, r: 0.15, l: 0.045 };
  const RAR_NAME = { u: 'Uncommon', r: 'Rare', l: 'Legendary' };
  // more match-day nonsense. go(r) changes the game and returns { note, run }; look = [scene, sound]
  const XEV = {
    pigeon: { rar: 'c', icon: '🐦', name: 'Pitch invader', tone: 'weird', look: ['kickoff', 'wild'], go: () => { S.bonus.push(['🐦 A pigeon', 1]); return { note: 'A pigeon lands on the pitch. It’s just a pigeon. It’s staying. <b>+1</b> bonus point, for the pigeon.', run: c => c.fly('🐦') }; } },
    streaker: { rar: 'c', icon: '🏃', name: 'Streaker', tone: 'good', look: ['party', ['whistle', 'cheer']], go: () => { const p = pts(6); S.bonus.push(['🏃 The streaker', p]); return { note: `Someone’s run on with nothing on. Best laugh of the season: <b>+${p}</b> bonus. He’s left his pants behind.`, run: c => c.dash('🏃') }; } },
    amnesty: { rar: 'r', icon: '📺', name: 'VAR overturns it all', tone: 'good', look: ['tv', ['var', 'cheer']], go: () => {
      const hurt = filledIdx().filter(i => HURT.includes(S.xi[i].mod));
      if (!hurt.length) { const p = pts(10); S.bonus.push(['📺 Nothing to overturn', p]); return { note: `VAR looks at everything and finds nothing wrong with your XI: <b>+${p}</b> bonus.` }; }
      hurt.forEach(heal);
      return { note: `Every decision against you is overturned: <b>${hurt.length}</b> player${hurt.length === 1 ? '' : 's'} back to full numbers.`, run: c => hurt.forEach((i, k) => c.visit(i, '📺', 'frame', k * 250)) }; } },
    splat: { rar: 'r', icon: '💩', name: 'The pigeon’s revenge', tone: 'weird', look: ['dark', 'boo'], go: r => {
      const f = filledIdx().filter(i => !(S.splat || []).includes(i));
      if (!f.length) return { note: 'A pigeon circles, finds nothing worth aiming at and flies off.' };
      const hit = []; while (hit.length < Math.min(2, f.length)) { const i = f[Math.floor(r() * f.length)]; if (!hit.includes(i)) hit.push(i); }
      S.splat = (S.splat || []).concat(hit);
      return { note: `Splat. ${hit.map(nm).join(' and ')} ${hit.length > 1 ? 'are' : 'is'} covered: you can’t see ${hit.length > 1 ? 'their numbers' : 'his number'} until full time. Keep track yourself!`, run: c => hit.forEach((i, k) => c.visit(i, '💩', 'strike', k * 500, 'boo')) }; } },
    chant: { rar: 'c', icon: '📣', name: 'Terrace anthem', tone: 'good', look: ['party', 'cheer'], go: () => { const p = pts(10); S.bonus.push(['📣 Terrace anthem', p]); return { note: `The away end sing your name for 90 minutes: <b>+${p}</b> bonus points.` }; } },
    pies: { rar: 'c', icon: '🥧', name: 'Who ate all the pies?', tone: 'good', look: ['gold', 'cheer'], go: () => {
      const i = S.xi.findIndex(x => x.p != null && x.pos === 'GK');
      if (i < 0) return { note: 'Your keeper hasn’t signed yet, so the pies go to waste.' };
      scale(S.xi[i], 2, 'boosted'); return { note: `${nm(i)} has eaten all the pies and now fills the whole goal: his numbers <b>double</b>.`, run: c => c.visit(i, '🥧') }; } },
    dog: { rar: 'c', icon: '🐕', name: 'Dog on the pitch', tone: 'good', look: ['kickoff', 'box'], go: r => {
      if (S.inv.length >= 3) return { note: 'A dog runs on, looks at your full wildcard bag and runs off again.' };
      const cards = Object.keys(WILDCARDS).filter(k => !WILDCARDS[k].chaos && !S.rules.noWild.includes(k)), w = cards[Math.floor(r() * cards.length)];
      S.inv.push(w); return { note: `A dog runs on and fetches you a wildcard: ${WILDCARDS[w].icon} <b>${WILDCARDS[w].name}</b>!`, run: c => c.bag('🐕') }; } },
    vuvuzela: { rar: 'c', icon: '🎺', name: 'Vuvuzelas', tone: 'weird', look: ['fire', 'horn'], go: () => { charge(); return { note: 'Nothing happens, very loudly. The CHAOS meter goes up one.' }; } },
    hamstring: { rar: 'c', icon: '🦵', name: 'Hamstring twang', tone: 'bad', look: ['red', 'bad'], go: r => {
      const f = filledIdx(); if (!f.length) return { note: 'Nobody to pull a hamstring yet.' };
      const i = f[Math.floor(r() * f.length)]; scale(S.xi[i], 0.7, 'injured'); park(i, 'ambulance'); return { note: `${nm(i)} stretches for a ball he was never getting: <b>−30%</b>. Nee-naw.`, run: c => c.drive('ambulance', i, { park: true }) }; } },
    interview: { rar: 'c', icon: '🎤', name: 'Post-match interview', tone: 'bad', look: ['news', 'boo'], go: () => {
      const p = pts(5); S.bonus.push(['🎤 That interview', -p]); const m = S.manager && MANAGERS[S.manager];
      return { note: `${m ? m.name : 'Your chairman'} blames the ball, the grass and the moon. <b>−${p}</b> bonus points.` }; } },
    handofgod: { rar: 'u', icon: '🤚', name: 'Hand of God', tone: 'good', look: ['tv', 'whistle'], go: () => {
      const i = S.xi.findIndex(y => y.p === S.last && y.p != null); if (i < 0) return { note: 'Nobody to handle it yet.' };
      scale(S.xi[i], 1.5, 'boosted'); return { note: `${nm(i)} punches it in. Nobody saw it: <b>×1.5</b>.`, run: c => c.visit(i, '🤚') }; } },
    sponge: { rar: 'u', icon: '🧽', name: 'The magic sponge', tone: 'good', look: ['kickoff', 'good'], go: () => {
      const f = filledIdx(); if (!f.length) return { note: 'The physio has nobody to sponge.' };
      const i = underdog(f); if (i < 0) { const p = pts(15); S.bonus.push(['🧽 The magic sponge', p]); return { note: `The physio’s sponge works wonders on morale: <b>+${p}</b> bonus.` }; }
      scale(S.xi[i], 2, 'boosted');
      return { note: `The physio runs on with a cold sponge and ${nm(i)} is a new man: <b>×2</b>.`, run: c => c.visit(i, '🧽') }; } },
    stoke: { rar: 'u', icon: '🌧️', name: 'A cold wet night in Stoke', tone: 'weird', look: ['storm', 'rain'], go: () => {
      S.xi.forEach(x => { if (x.p == null) return; const g = GM.GROUP[x.pos]; if (g === 'D' || g === 'G') scale(x, 1.5, 'boosted'); else if (g === 'F') scale(x, 0.8, 'halved'); });
      return { note: 'Can they do it here? Defenders and keeper <b>+50%</b>, strikers <b>−20%</b>.', run: c => c.rainfall() }; } },
    swapdeal: { rar: 'u', icon: '🔀', name: 'Swap deal', tone: 'weird', look: ['casino', 'swoosh'], go: r => {
      const f = filledIdx(); if (f.length < 2) return { note: 'Nobody to swap yet.' };
      const a = f[Math.floor(r() * f.length)], rest = f.filter(i => i !== a), b2 = rest[Math.floor(r() * rest.length)];
      const va = S.xi[a].v; S.xi[a].v = S.xi[b2].v; S.xi[b2].v = va; S.xi[a].g = S.xi[a].v[S.stat]; S.xi[b2].g = S.xi[b2].v[S.stat];
      return { note: `A clerical error: ${nm(a)} and ${nm(b2)} swap numbers.`, run: c => { c.visit(a, '🔀'); c.visit(b2, '🔀', 'pop', 300); } }; } },
    retro: { rar: 'u', icon: '📼', name: 'Retro kit launch', tone: 'good', look: ['gold', 'sting'], go: () => { S.forceSpecial = 'throwback'; return { note: 'Everyone’s in 90s shirts: this spin is <b>all 90s players</b>.' }; } },
    testimonial: { rar: 'u', icon: '❤️', name: 'Testimonial match', tone: 'good', look: ['gold', 'sting'], go: () => { S.forceSpecial = 'oneclub'; return { note: 'A night for the loyal: this spin is <b>one-club men</b> only.' }; } },
    loanarmy: { rar: 'u', icon: '🧳', name: 'The loan army', tone: 'good', look: ['gold', 'sting'], go: () => { S.forceSpecial = 'journeyman'; return { note: 'They’re back from loan: this spin is <b>journeymen</b> with 4+ clubs.' }; } },
    helicopter: { rar: 'r', icon: '🚁', name: 'Helicopter on the lawn', tone: 'good', look: ['money', 'heli'], go: () => { S.forceSpecial = 'centurion'; return { run: c => c.heli(), note: 'A billionaire lands with a chequebook: this spin is <b>100+ goal</b> players only.' }; } },
    aliens: { rar: 'r', icon: '🛸', name: 'Alien abduction', tone: 'weird', look: ['lightning', 'spooky'], go: r => {
      const f = filledIdx(); if (!f.length) return { note: 'The aliens look around, find nobody worth taking, and leave.' };
      const fw = f.filter(i => GM.GROUP[S.xi[i].pos] === 'F'), pool = fw.length ? fw : f, i = pool[Math.floor(r() * pool.length)], p = pts(40);
      scale(S.xi[i], 0, 'halved'); S.bonus.push(['🛸 Documentary rights', p]);
      return { note: `${nm(i)} is beamed up mid-warm-up: he counts for <b>nothing</b>. The documentary rights pay <b>+${p}</b> bonus.`, run: c => c.abduct(i) }; } },
    arrest: { rar: 'u', icon: '🚔', name: 'Arrested!', tone: 'bad', look: ['red', 'siren'], go: r => {
      const f = filledIdx().filter(i => S.xi[i].pos !== 'GK'); if (!f.length) return { note: 'The police have a look round, find nothing to nick, and leave.' };
      const i = f[Math.floor(r() * f.length)], x = S.xi[i];
      S.ghost = { i, p: x.p, g: x.g, mod: x.mod };  // still drawn on the pitch until the police have taken him
      x.p = null; x.g = 0; x.v = null; x.mod = null; x.as = null; unpark(i);
      if (S.splat) S.splat = S.splat.filter(k => k !== i);
      return { note: `${nm2(S.ghost.p)} is arrested and taken away. His place is empty: <b>sign someone else</b> for it.`, run: c => c.arrest(i), done: () => { S.ghost = null; } }; } },
    gamble: { rar: 'u', icon: '🎰', name: 'Betting scandal', tone: 'weird', look: ['casino', 'drumroll'], go: r => {
      const f = filledIdx(); if (!f.length) return { note: 'The papers have nobody to accuse yet.' };
      const i = f[Math.floor(r() * f.length)], win = r() < 0.4, SYM = ['⚽', '🏆', '🍒', '7️⃣', '💰'];
      const a = Math.floor(r() * SYM.length), sym = win ? [a, a, a] : [a, (a + 1 + Math.floor(r() * 4)) % 5, Math.floor(r() * 5)];
      if (!win && sym[2] === sym[0] && sym[1] === sym[0]) sym[2] = (sym[0] + 2) % 5;
      const p = pts(30), n = nm(i);
      if (win) S.bonus.push(['🎰 Jackpot', p]); else scale(S.xi[i], 0.5, 'halved');
      return { note: `${n} is accused of gambling. He swears it was one go on a fruit machine. Pull the lever…`, slot: sym.map(k => SYM[k]), win,
        after: win ? `<b>JACKPOT!</b> All charges dropped and <b>+${p}</b> bonus.` : `No luck. ${n} is fined: his numbers are <b>halved</b>.`,
        run: c => c.visit(i, win ? '💰' : '🧾', 'pop') }; } },
    conscript: { rar: 'r', icon: '🪖', name: 'Called up!', tone: 'weird', look: ['red', 'drumroll'], go: r => {
      const f = filledIdx().filter(i => S.xi[i].pos !== 'GK'); if (!f.length) return { note: 'The army comes looking, finds nobody and goes home.' };
      const i = f[Math.floor(r() * f.length)], x = S.xi[i], p = pts(20);
      S.ghost = { i, p: x.p, g: x.g, mod: x.mod };
      x.p = null; x.g = 0; x.v = null; x.mod = null; x.as = null; unpark(i); if (S.splat) S.splat = S.splat.filter(k => k !== i);
      S.bonus.push(['🎖️ A medal for service', p]);
      return { note: `${nm2(S.ghost.p)} is called up for national service and the tank comes to collect him. His place is empty, but there’s a medal: <b>+${p}</b>.`,
        run: c => c.drive('tank', i, { wait: 1100, sound: 'rumble', then: () => { const el = c.slot(i); if (el) el.classList.add('nicked'); } }), done: () => { S.ghost = null; } }; } },
    quake: { rar: 'u', icon: '🌍', name: 'Earthquake!', tone: 'weird', look: ['dark', 'quake'], go: r => {
      const f = filledIdx(); if (!f.length) return { note: 'The ground shakes. Luckily nobody’s on the pitch yet.' };
      let up = 0; f.forEach(i => { const k = 0.75 + r() * 0.55; scale(S.xi[i], k, k >= 1 ? 'boosted' : 'halved'); up += k >= 1; });
      return { note: `The ground opens up! Everyone’s shaken: <b>${up}</b> up, <b>${f.length - up}</b> down. The crack stays.`, run: c => c.quake() }; } },
    fraud: { rar: 'u', icon: '💼', name: 'The owner’s done a runner', tone: 'bad', look: ['money', 'siren'], go: () => {
      const p = pts(15); S.bonus.push(['💼 Points deduction', -p]);
      return { note: `Your owner has been using the club as a piggy bank and legs it with a briefcase of cash: a points deduction of <b>−${p}</b>.`, run: c => c.runner() }; } },
    breakup: { rar: 'c', icon: '💔', name: 'Messy break-up', tone: 'bad', look: ['news', 'boo'], go: r => {
      const f = filledIdx(); if (!f.length) return { note: 'Nobody’s heart to break yet.' };
      const i = f[Math.floor(r() * f.length)]; scale(S.xi[i], 0.8, 'halved');
      return { note: `${nm(i)}’s break-up is all over the papers. His head’s gone: <b>−20%</b>.`, run: c => c.heartbreak(i) }; } },
    wedding: { rar: 'u', icon: '💍', name: 'Wedding of the year', tone: 'good', look: ['party', 'bell'], go: r => {
      const f = filledIdx(); if (!f.length) return { note: 'The wedding goes ahead without any of your players. Lovely day for it.' };
      const i = f[Math.floor(r() * f.length)]; scale(S.xi[i], 1.4, 'boosted');
      return { note: `${nm(i)} gets married and plays like a man in love: <b>+40%</b>.`, run: c => { c.confetti(); c.drive('wedding', i, { sound: 'bell', wait: 700 }); } }; } },
    royal: { rar: 'r', icon: '👑', name: 'Royal visit', tone: 'good', look: ['gold', 'fanfare'], go: () => { const p = pts(50); S.bonus.push(['👑 Royal visit', p]); return { note: `Everyone’s on their best behaviour: <b>+${p}</b> bonus points.`, run: c => c.rain('👑') }; } },
    oligarch: { rar: 'r', icon: '💸', name: 'Takeover!', tone: 'good', look: ['money', 'cash'], go: r => {
      const cards = Object.keys(WILDCARDS).filter(k => WILDCARDS[k].chaos), got = [];
      while (S.inv.length < 3) { const w = cards[Math.floor(r() * cards.length)]; S.inv.push(w); got.push(WILDCARDS[w].icon); }
      return { note: got.length ? `New owners, new money: your bag fills up with CHAOS cards ${got.join(' ')}` : 'New owners, but your bag is already full. They buy a yacht instead.', run: c => c.bag('💸') }; } },
    fairytale: { rar: 'r', icon: '🦊', name: '5000–1', tone: 'good', look: ['party', 'fanfare'], go: () => {
      const f = filledIdx(); if (!f.length) return { note: 'A fairytale needs a hero. Sign someone first.' };
      const i = underdog(f); if (i < 0) { const p = pts(40); S.bonus.push(['🦊 5000–1', p]); return { note: `Nobody gave your lot a chance: <b>+${p}</b> bonus!`, run: c => c.rain('🦊') }; }
      scale(S.xi[i], 5, 'boosted');
      return { note: `Nobody gave ${nm(i)} a chance. <b>×5</b>!`, run: c => c.visit(i, '🦊', 'strike') }; } },
    slip: { rar: 'r', icon: '🍌', name: 'The slip', tone: 'bad', look: ['red', 'boo'], go: () => {
      const f = filledIdx(); if (!f.length) return { note: 'Nobody to slip yet.' };
      const sg = f.find(k => byId(S.xi[k].p).name === 'Steven Gerrard');  // 🤫 of course it's him
      const i = sg != null ? sg : f.slice().sort((a, b) => S.xi[b].g - S.xi[a].g)[0]; scale(S.xi[i], 0.5, 'halved');
      return { note: sg != null ? 'Steven Gerrard slips. Of course he does. <b>Halved</b>.' : `${nm(i)} slips at the worst possible moment: <b>halved</b>.`, run: c => c.visit(i, '🍌', 'drive') }; } },
    lastminute: { rar: 'l', icon: '⏱️', name: '93:20', tone: 'good', look: ['unleash', ['horn', 'cheer']], go: () => {
      filledIdx().forEach(i => scale(S.xi[i], 1.5, 'boosted'));
      return { note: 'Last-minute madness! The whole ground goes up: your <b>whole XI ×1.5</b>!', run: c => c.sweep('🎉') }; } },
  };
  const pts = n => Math.round(n * CHAOS_UNIT[S.stat]);
  // your lowest scorer who's actually scored (a boost on 0 would do nothing); -1 if nobody has
  const underdog = f => { const s0 = f.filter(i => S.xi[i].g > 0).sort((a, b) => S.xi[a].g - S.xi[b].g); return s0.length ? s0[0] : -1; };
  // something that's already happened this game can happen again, just less likely each time (a sixth, then a 36th…)
  // Postecoglou makes the rare and legendary ones three times as likely
  const rarW = r => RAR[r] * ((r === 'r' || r === 'l') && tw().rare ? tw().rare : 1);
  const again = (seen, k) => Math.pow(1 / 6, (seen || []).filter(x => x === k).length);
  // the CHAOS meter: taking or playing a wildcard (and every storm) charges it; full, the next spin opens with a big
  // CHAOS moment. Now and then a smaller match-day event (above) strikes too. Only ever one thing at a time.
  const METER = 4;
  const HURT = ['rotation', 'zero', 'injured', 'halved'];
  // the big moments the meter sets off (need: filled slots, empty slots)
  const MOMENTS = {
    unleash: { icon: '💥', name: 'CHAOS UNLEASHED', rar: 'c', tone: 'unleash' },
    tornado: { icon: '🌪️', name: 'Tornado!', rar: 'c', tone: 'bad', need: n => n >= 3 },
    lightning: { icon: '⚡', name: 'Lightning strike', rar: 'c', tone: 'weird', need: n => n >= 2 },
    parade: { icon: '🚌', name: 'Open-top bus parade', rar: 'u', tone: 'good', need: n => n >= 1 },
    deadline: { icon: '⏰', name: 'Deadline day', rar: 'u', tone: 'good', need: (n, left) => left >= 1 },
    sacked: { icon: '📰', name: 'Manager sacked!', rar: 'u', tone: 'weird', need: () => !!(S && S.manager) },
    blackhole: { icon: '🕳️', name: 'Black hole', rar: 'r', tone: 'weird', need: n => n >= 2 },
    relegation: { icon: '🪂', name: 'The great escape', rar: 'r', tone: 'weird', need: n => n >= 3 },
    title: { icon: '🏆', name: 'Champions!', rar: 'l', tone: 'good' },
  };
  // CHAOS managers: you appoint one at kick-off. Each brings a perk and a catch, worked out on your XI as bonus points
  // (per-player amounts are in goals and scale to the stat; percentages are of your XI's own numbers)
  const grpSum = (x, gs) => x.slots.filter(s => gs.includes(GM.GROUP[s.pos])).reduce((a, s) => a + s.g, 0);
  const count = (x, f) => x.ps.filter(f).length;
  const vet = p => Math.min(p.last, GM.currentSeason) - p.first + 1 >= 10;
  const MANAGERS = {
    fergie: { icon: '⌚', name: 'Sir Alex Ferguson', perk: '+10 for every Man Utd player, and Fergie time: your last signing counts double', catch: 'The hairdryer: your lowest scorer counts for nothing',
      likes: p => p.clubs.includes('Manchester United'),
      lines: x => { const n = count(x, p => p.clubs.includes('Manchester United')); return [[`⌚ Fergie’s Man Utd players (${n})`, 10 * x.u * n], ['💨 The hairdryer: lowest scorer dropped', x.slots.length > 1 ? -Math.min(...x.slots.map(s => s.g)) : 0]]; } },
    wenger: { icon: '🧥', name: 'Arsène Wenger', perk: '+20 for every Arsenal player, and “I didn’t see it”: no red cards or VAR checks', catch: 'He never buys a keeper: yours counts half',
      likes: p => p.clubs.includes('Arsenal'), tw: { ev: { redcard: 0, var: 0 } },
      lines: x => { const n = count(x, p => p.clubs.includes('Arsenal')); return [[`🧥 Wenger’s Arsenal players (${n})`, 20 * x.u * n], ['🧤 No new keeper: yours counts half', -0.5 * grpSum(x, ['G'])]]; } },
    mourinho: { icon: '🚌', name: 'José Mourinho', perk: 'Defenders and keeper +60%, and 🚌 Park the Bus is back in the deck', catch: 'Third-season syndrome: strikers −25%',
      likes: p => ['D', 'G'].includes(p.pos), hates: p => p.pos === 'F', tw: { allow: ['bus'], wild: { bus: 2 } },
      lines: x => [['🚌 Mourinho’s back line +60%', 0.6 * grpSum(x, ['D', 'G'])], ['📉 Third-season syndrome: strikers −25%', -0.25 * grpSum(x, ['F'])]] },
    pep: { icon: '🧠', name: 'Pep Guardiola', perk: 'Midfielders +70%, and 🧲 Old Teammates cards turn up three times as often', catch: 'Overthinking it: strikers −20%',
      likes: p => p.pos === 'M', hates: p => p.pos === 'F', tw: { wild: { magnet: 3 } },
      lines: x => [['🧠 Pep’s midfield +70%', 0.7 * grpSum(x, ['M'])], ['🤔 Overthinking it: strikers −20%', -0.2 * grpSum(x, ['F'])]] },
    klopp: { icon: '🤘', name: 'Jürgen Klopp', perk: 'Heavy metal: +12 for every pair of teammates, and the CHAOS meter starts half full', catch: 'Full throttle: −10 for every ten-season veteran',
      hates: vet, tw: { meter: 2 },
      lines: x => [[`🤘 Heavy metal chemistry (${x.pairs} pair${x.pairs === 1 ? '' : 's'})`, 12 * x.u * x.pairs], ['🏃 Full throttle: veterans', -10 * x.u * count(x, vet)]] },
    ranieri: { icon: '🦊', name: 'Claudio Ranieri', perk: 'The fairytale: +50 for every Leicester player, and 🦊 5000–1 is ten times likelier', catch: 'Dilly ding: title medals are worth nothing',
      likes: p => p.clubs.includes('Leicester City'), hates: p => (p.hon.P || 0) > 0, tw: { ev: { fairytale: 10 } },
      lines: x => { const n = count(x, p => p.clubs.includes('Leicester City')), m = x.ps.reduce((a, p) => a + (p.hon.P || 0), 0); return [[`🦊 The fairytale: Leicester players (${n})`, 50 * x.u * n], ['🔔 Dilly ding: no title medal bonus', -4 * x.u * m]]; } },
    keegan: { icon: '📺', name: 'Kevin Keegan', perk: '“I would love it”: strikers +50%, and 💥 CHAOS UNLEASHED is twice as likely', catch: 'All-out attack: defenders −20%',
      likes: p => p.pos === 'F', hates: p => p.pos === 'D', tw: { big: { unleash: 2 } },
      lines: x => [['📺 “I would love it”: strikers +50%', 0.5 * grpSum(x, ['F'])], ['🕳️ All-out attack: defenders −20%', -0.2 * grpSum(x, ['D'])]] },
    allardyce: { icon: '🍷', name: 'Sam Allardyce', perk: '+12 for every player with 4+ PL clubs, and the dossier: 🔍 Scout’s IQ turns up twice as often', catch: 'No big egos: −10 for every Hall of Famer',
      likes: p => p.clubs.length >= 4, hates: p => !!p.hon.H, tw: { wild: { scout: 2 } },
      lines: x => [[`🍷 Big Sam’s journeymen (${count(x, p => p.clubs.length >= 4)})`, 12 * x.u * count(x, p => p.clubs.length >= 4)], ['🙅 No big egos: Hall of Famers', -10 * x.u * count(x, p => p.hon.H)]] },
    redknapp: { icon: '🚗', name: 'Harry Redknapp', perk: 'Wheeler-dealer: starts you with ⏰ Deadline Day, 🎰 Roll Again and 🔥 Hot Streak, +5 for every wildcard you play', catch: '“He’d have sold them”: −3 for every one-club man',
      hates: p => p.clubs.length === 1,
      lines: x => [[`🚗 Wheeler-dealer (${x.wild} wildcards)`, 5 * x.u * x.wild], ['🚗 “He’d have sold them”: one-club men', -3 * x.u * count(x, p => p.clubs.length === 1)]] },
    moyes: { icon: '🧱', name: 'David Moyes', perk: 'Steady: +12 for every ten-season veteran, and no wildcard storms', catch: 'No superstars: your top scorer −20%',
      likes: vet, tw: { noStorm: true },
      lines: x => [[`🧱 Steady veterans (${count(x, vet)})`, 12 * x.u * count(x, vet)], ['⭐ No superstars: top scorer −20%', x.slots.length ? -0.2 * Math.max(...x.slots.map(s => s.g)) : 0]] },
    ancelotti: { icon: '🤨', name: 'Carlo Ancelotti', perk: 'The raised eyebrow: +3 for every PL title medal', catch: 'No journeymen: −10 for every player with 5+ clubs',
      likes: p => (p.hon.P || 0) > 0, hates: p => p.clubs.length >= 5,
      lines: x => { const m = x.ps.reduce((a, p) => a + (p.hon.P || 0), 0); return [[`🤨 Title medals (${m})`, 3 * x.u * m], ['🧳 No journeymen', -10 * x.u * count(x, p => p.clubs.length >= 5)]]; } },
    hodgson: { icon: '🦁', name: 'Roy Hodgson', perk: 'Three Lions: +10 for every England player, and 📣 terrace anthems three times as likely', catch: '−4 for every player from anywhere else',
      likes: p => p.nat === 'England', hates: p => p.nat !== 'England', tw: { ev: { chant: 3 } },
      lines: x => [[`🦁 Three Lions (${count(x, p => p.nat === 'England')})`, 10 * x.u * count(x, p => p.nat === 'England')], ['🌍 Players from abroad', -4 * x.u * count(x, p => p.nat !== 'England')]] },
    warnock: { icon: '🗯️', name: 'Neil Warnock', perk: 'Fired up: every signing +15%', catch: '“It’s a conspiracy”: 1 signing in 10 counts for nothing',
      lines: () => [] },  // both happen as you sign (place)
    pulis: { icon: '🧢', name: 'Tony Pulis', perk: 'Built to last: no red cards, injuries, hamstrings or slips', catch: 'Route one: your XI −2%',
      tw: { ev: { redcard: 0, injury: 0, hamstring: 0, slip: 0 } },
      lines: x => [['🧢 Route one: XI −2%', -0.02 * x.slots.reduce((a, s) => a + s.g, 0)]] },
    ange: { icon: '🦘', name: 'Ange Postecoglou', perk: '“We go again”: rare and legendary moments five times as likely', catch: 'High line: defenders −5%',
      hates: p => p.pos === 'D', tw: { rare: 5 },
      lines: x => [['🏃 High line: defenders −5%', -0.05 * grpSum(x, ['D'])]] },
    holloway: { icon: '🤪', name: 'Ian Holloway', perk: 'Bonkers: the CHAOS meter fills 50% faster', catch: 'Tornadoes, black holes and great escapes three times as likely',
      tw: { meterX: 1.5, big: { tornado: 3, blackhole: 3, relegation: 3 } },
      lines: () => [] },
    dyche: { icon: '🗿', name: 'Sean Dyche', perk: 'Solid: your XI +12%', catch: 'Calm down: the CHAOS meter fills at half speed',
      tw: { meterX: 0.5 },
      lines: x => [['🗿 Solid: XI +12%', 0.12 * x.slots.reduce((a, s) => a + s.g, 0)]] },
    vangaal: { icon: '📋', name: 'Louis van Gaal', perk: 'Philosophy: any outfield player can play any outfield position (not on themed spins like a Centurion Throw)', catch: 'Out of position, a player counts 80%',
      lines: () => [] },  // both happen as you sign (canPlay, place)
    conte: { icon: '🔥', name: 'Antonio Conte', perk: 'Three at the back: centre-backs +40% (kick-off switches you to 3-4-3)', catch: 'Touchline fury: −8 for every wildcard you play',
      likes: p => p.poss.includes('CB'),
      lines: x => [['🧱 Back three: centre-backs +40%', 0.4 * x.slots.filter(s => s.pos === 'CB').reduce((a, s) => a + s.g, 0)], [`😤 Touchline fury (${x.wild} wildcards)`, -8 * x.u * x.wild]] },
    benitez: { icon: '📝', name: 'Rafa Benítez', perk: 'Facts: wildcards turn up more often, +2 for every one you play', catch: 'Rotation: 🩹 Rotation Risk is back in the deck',
      tw: { wildP: 0.35, allow: ['rotation'] },
      lines: x => [[`📝 Facts (${x.wild} wildcards played)`, 2 * x.u * x.wild]] },
  };
  const mgrIs = k => !!(S && S.rules && S.rules.chaos && S.manager === k);
  // a manager's tweaks to the CHAOS itself: wildcard weights (wild) and extra cards (allow), how often events (ev, 0 =
  // never) and big moments (big) come up, rare ones (rare), the meter's speed (meterX) and start (meter), storms (noStorm)
  const tw = () => (S && S.rules && S.rules.chaos && S.manager && MANAGERS[S.manager] && MANAGERS[S.manager].tw) || {};
  const mgrShort = m => m.name.split(' ').slice(-1)[0];
  // CHAOS bonus points, in "goals": assists and apps games scale them to their stat
  const CHAOS_UNIT = { goals: 1, assists: 0.7, apps: 8 };

  const RULES = {
    // purist mode: no target, rack up the biggest total you can; every player equally likely
    ultimate: { max: true, weight: () => 1, noWild: ['rotation', 'bus'] },
    // hit the number: reels lean towards well-known players so big numbers are in reach
    target: { max: false, weight: p => p.fame, noWild: [] },
    // three targets at once
    treble: { max: false, treble: true, weight: p => p.fame, noWild: [] },
    // random stat + hidden number, with a thermometer
    mystery: { max: false, mystery: true, weight: p => p.fame, noWild: [] },
  };
  RULES.daily = RULES.ultimate;
  // Classic: Ultimate without the wildcards - the biggest total from the 50+ app players, all equally likely
  // The biggest-total modes come in three player pools, each with and without wildcards:
  //   Classic (50+ apps, well-known players more likely)  classicwild / classic
  //   Ultimate (50+ apps, all equally likely)             ultimate / ultimatepure
  //   Extreme (every PL player, all equally likely)       extreme / purist
  RULES.classicwild = { max: true, weight: p => p.fame, fame: true, noWild: ['rotation', 'bus'] };
  RULES.classic = { max: true, weight: p => p.fame, fame: true, noWild: [], wild: false };
  RULES.ultimatepure = { max: true, weight: () => 1, noWild: [], wild: false };
  // Every player to have played in the PL (1+ apps), all equally likely: Extreme has wildcards, Purist has none
  RULES.extreme = { max: true, weight: () => 1, noWild: ['rotation', 'bus'], all: true };
  RULES.purist = { max: true, weight: () => 1, noWild: [], wild: false, all: true };
  // Club XI: Ultimate Wildcard with everyone who played for one club in the PL (not just 50+ appearances)
  RULES.club = { max: true, weight: () => 1, noWild: ['rotation', 'bus'], club: true, all: true };
  // Ultimate Wildcard CHAOS: Ultimate plus bonus points (chemistry, rating, titles, loyalty…), extra risky wildcards,
  // wildcard storms and random events
  RULES.chaos = { max: true, weight: () => 1, noWild: ['rotation', 'bus'], chaos: true };
  // CHAOS Extreme: the same madness with every PL player (5,000+), mostly strangers
  RULES.chaosx = { ...RULES.chaos, all: true };
  // Matchday XI: on your club's matchday, players from either side (double for anyone who played for both).
  // Seeded by the fixture, so every fan gets the same spins; one go
  RULES.match = { ...RULES.club, match: true };
  // International XI (international breaks): Ultimate Wildcard with every PL player from one country
  RULES.nation = { ...RULES.club, club: false, nation: true };
  // Extreme Target games: every PL player on the reels (the well known still turn up more, so the targets are reachable)
  const RULES_X = { target: { ...RULES.target, all: true }, treble: { ...RULES.treble, all: true }, mystery: { ...RULES.mystery, all: true } };
  const rulesFor = (mode, extreme) => (extreme && RULES_X[mode]) || RULES[mode];

  let S = null; // game state
  let root = null;

  GM.draft = { METER, MANAGERS: () => MANAGERS, events: () => Object.keys(EVENTS).concat(Object.keys(XEV), Object.keys(MOMENTS)), start, RULES, WILDCARDS, TARGETS, state: () => S, total: st => scoreFor(st).t, score: st => scoreFor(st), render: () => render(), modeKey: (m, s, h, c, x) => keyFor(m, s, h, c, x) };

  const statSuffix = s => ({ goals: '', assists: 'ast', apps: 'apps' }[s] || '');
  function keyFor(mode, stat, hard, club, extreme) {
    if (mode === 'daily') return 'daily:' + GM.today();
    if (mode === 'club') return 'club' + GM.slug(club || '') + statSuffix(stat);
    if (mode === 'match') return 'match:' + club;  // club is the fixture id here
    if (mode === 'nation') return 'nation' + GM.slug(club || '') + statSuffix(stat);  // and the country here
    const k = mode === 'treble' || mode === 'mystery' ? mode : mode + statSuffix(stat);
    return extreme && RULES_X[mode] ? GM.extremeKey(k) : k + (hard ? 'h' : '');
  }

  function start(el, mode, opts = {}) {
    fitKey = '';  // a new page: size the pitch again
    root = el;
    if (!RULES[mode]) mode = 'ultimate';
    const extreme = !!opts.extreme && !!RULES_X[mode] && !opts.online;
    if (rulesFor(mode, extreme).all && !GM.allPlayers) {  // fetch every PL player first
      root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>${(GM.MODES[mode] || { icon: '🏟️' }).icon} ${(GM.MODES[mode] || { name: 'Club XI' }).name}</h2><span></span></div>
        <div class="loading-all"><div class="splash-bar"><i></i></div><p class="muted">Loading every Premier League player…</p></div>`;
      GM.loadAll().then(() => { if (root === el && location.hash.includes('m=' + mode)) start(el, mode, opts); })
        .catch(() => { root.innerHTML += '<p class="center">Couldn’t load the player list. Check your connection and try again.</p>'; });
      return;
    }
    const fx = mode === 'match' ? GM.fixtureById(opts.fx) : null;
    const nat = mode === 'nation' ? (GM.nations().includes(opts.nat) ? opts.nat : GM.store.get('nation', 'England')) : null;
    if (mode === 'match' && !fx) { location.hash = '#/matchday'; GM.toast('That match isn’t on the fixture list'); return; }
    if (fx) {
      const done = GM.store.get('match2:' + fx.id);
      if (done && done.xi) { S = done; S.rules = RULES.match; S.phase = 'done'; S.readonly = true; render(); return; }
    }
    // Daily CHAOS: the same chaos for everyone today, goals, one go
    const dailyChaos = mode === 'chaos' && !!opts.daily && !opts.seed;
    const seed = mode === 'daily' ? 'daily:' + GM.today() : dailyChaos ? 'dchaos:' + GM.today() : fx ? 'match:' + fx.id : (opts.seed || GM.newSeed());
    let stat = mode === 'daily' || dailyChaos || fx ? 'goals' : (GM.STATS[opts.stat] ? opts.stat : 'goals');
    let target = RULES[mode] && !RULES[mode].max ? TARGETS[stat] : null;
    if (mode === 'treble') { stat = 'goals'; target = null; }
    if (mode === 'target' && opts.online) { const [lo, hi] = RACE_TARGET[stat], r = GM.rng(seed + '|racetarget'); target = lo + r.int(Math.round((hi - lo) / 5) + 1) * 5; }
    if (mode === 'mystery') {
      // seeded, so a challenge link gets the same mystery
      const r = GM.rng(seed + '|mystery');
      stat = STAT_KEYS[r.int(3)];
      const [lo, hi] = MYSTERY[stat];
      target = lo + r.int(hi - lo + 1);
    }
    if (mode === 'daily') {
      const done = GM.store.get('daily2:' + GM.today());
      if (done && done.xi) { S = done; S.rules = RULES.daily; S.phase = 'done'; S.readonly = true; render(); return; }
      // carry on a Daily Ultimate left half-way (saved on every move, so there's nothing to gain by leaving)
      const saved = GM.store.get(progressKey());
      if (saved && saved.xi) {
        S = saved; S.rules = RULES.daily; S.pending = null; S.subbing = false;
        if (S.phase === 'spinning') S.phase = 'pick';
        GM.toast('Welcome back – carrying on where you left off');
        if (S.phase === 'reveal') { completePick(); return; }
        render(); return;
      }
    }
    if (dailyChaos) {
      const done = GM.store.get('dchaos2:' + GM.today());
      if (done && done.xi) { S = done; S.rules = RULES.chaos; S.phase = 'done'; S.readonly = true; render(); return; }
    }
    // any other draft left half-way: the Daily CHAOS carries straight on, the rest ask
    if (!opts.online && mode !== 'daily') {
      const key = 'draftp:' + (dailyChaos ? 'dchaos:' + GM.today() : keyFor(mode, stat, !!opts.hard && !extreme, mode === 'club' ? (opts.club || GM.favClub()) : fx ? fx.id : nat, extreme));
      const saved = GM.store.get(key);
      if (saved && saved.xi && saved.phase !== 'done' && (!opts.seed || saved.seed === opts.seed) && saved.xi.some(x => x.p != null)) {
        const resume = () => {
          S = saved; S.rules = rulesFor(S.mode, S.extreme); S.pending = null; S.subbing = false;
          if (S.phase === 'spinning') S.phase = 'pick';
          if (S.phase === 'reveal') { completePick(); return; }
          render();
        };
        if (dailyChaos || opts.seed || fx) { resume(); GM.toast('Welcome back – carrying on where you left off'); return; }
        setTimeout(() => {
          const n = saved.xi.filter(x => x.p != null).length;
          GM.confirm(`You left a game of ${GM.esc((GM.MODES[key.slice(7)] || GM.MODES[key.slice(7).replace(/h$/, '')] || { name: 'this' }).name)} half-way (${n}/11 signed). Carry on?`, '▶ Carry on', '🆕 New game')
            .then(ok => { if (ok && location.hash.includes('m=' + mode)) resume(); else GM.store.set(key, null); });
        }, 150);
      }
    }
    if (opts.online) {
      // an online race carries on where you left it (saved after every signing), so leaving never costs you the game
      const saved = GM.store.get('racep:' + opts.online.code);
      if (saved && saved.xi && saved.seed === seed) {
        S = saved; S.rules = rulesFor(S.mode, S.extreme); S.pending = null; S.subbing = false;
        S.online = { ...opts.online, ms: (saved.online || {}).ms || 0, lastT: Date.now() };
        if (S.phase === 'spinning') S.phase = 'pick';
        if (S.phase === 'reveal') { completePick(); return; }
        render(); return;
      }
    }
    const club = fx ? fx.home : mode === 'club' ? (opts.club && GM.clubs.includes(opts.club) ? opts.club : GM.favClub()) : null;
    if (mode === 'club' && !club) { location.hash = '#/settings?s=look'; GM.toast('Pick your favourite club first'); return; }
    const form = RULES[mode] && RULES[mode].chaos ? CHAOS_FORMATIONS[GM.rng(seed + '|formation').int(CHAOS_FORMATIONS.length)] : FORMATION;
    S = {
      mode, stat, seed, rules: rulesFor(mode, extreme), extreme, st: { ...GM.STATS[stat], id: stat },
      target, spin: 0, respins: 0, revealStage: mode === 'mystery' ? 'intro' : null,
      form, xi: form.map(pos => ({ pos, p: null, g: 0, mod: null, as: null })),
      reels: [], selected: -1, revealed: false, revealNext: false, special: null,
      inv: [], modifier: null, subbing: false, used: [], last: null,
      phase: 'spin', vs: opts.vs, vss: opts.vss, log: [], pending: null, wildUsed: 0, coinWin: false, bonus: [], hot: 0, event: null, meter: 0, unleash: 0, golden: false, masked: false, chaosCount: 0, manager: null, moments: [], chaosDue: false, momentSpin: -1, forceSpecial: null,
      hard: mode !== 'daily' && !dailyChaos && !fx && !extreme && !!opts.hard, club, club2: fx ? fx.away : null, fx: fx ? fx.id : null, nat, dailyChaos, day: GM.today(),
      online: opts.online ? { ...opts.online, ms: 0, lastT: Date.now() } : null,  // Live Race: { code, seat, opp } + time taken
    };
    if (S.online) root.className = 'page-draft page-online';
    render();
    const me = S;
    if (RULES[mode] && RULES[mode].chaos) setTimeout(() => { if (S === me && onThisGame() && !S.manager && S.spin === 0) pickManager(); }, 350);
  }

  const modeKey = () => (S.dailyChaos ? 'dchaos:' + S.day : keyFor(S.mode, S.stat, S.hard, S.fx || S.nat || S.club, S.extreme));
  // where a half-finished draft is kept (the Daily Ultimate has its own; online races save with the race)
  const saveKey = () => (S.mode === 'daily' ? progressKey() : S.online ? null : 'draftp:' + modeKey());
  const progressKey = () => 'dailyp:' + GM.today();
  const distKey = () => S.mode === 'daily' ? 'daily' : modeKey();
  // Hard mode flattens the star bias in the target modes (Shearer ~4x an average player instead of ~16x) but keeps the
  // same targets - big numbers are rarer, so one wrong pick can put the target out of reach.
  const reelWeight = () => (S.hard && (!S.rules.max || S.rules.fame) ? p => Math.sqrt(S.rules.weight(p)) : S.rules.weight);
  // what wildcard descriptions talk about: in the Treble a wildcard affects all three numbers
  const wst = () => S.rules.treble ? { ...S.st, label: 'numbers', bigLabel: 'goals' } : S.st;
  const modeName = () => S.dailyChaos ? 'Daily CHAOS' : S.fx ? `Matchday XI · ${GM.clubShort(S.club)} v ${GM.clubShort(S.club2)}` : S.online && S.mode === 'target' ? `Target Race · ${fmt(S.target)}` : S.mode === 'club' || S.nat || S.extreme ? GM.MODES[modeKey()].name : GM.MODES[S.mode === 'daily' ? 'daily' : (S.rules.treble || S.rules.mystery) ? S.mode : S.mode + statSuffix(S.stat)].name;
  // CHAOS: a keeper's clean sheets count too, one point for every three (about a midfielder's goals; tools/clean_sheets.py)
  const KEEPER_CS = 3;
  const keeperPts = p => (S && S.rules && S.rules.chaos && p.pos === 'G' && p.cs ? Math.floor(p.cs / KEEPER_CS) : 0);
  const val = p => pv(p)[S.stat];
  const bothSides = p => p.clubs.includes(S.club) && p.clubs.includes(S.club2);
  const pv = p => { const k = keeperPts(p); return { goals: p.goals + k, assists: p.ast + Math.floor(k * CHAOS_UNIT.assists), apps: p.apps }; };
  const tot = k => S.xi.reduce((t, s) => t + (s.v ? s.v[k] : 0), 0);
  const total = () => tot(S.stat);
  const openPos = () => [...new Set(S.xi.filter(s => s.p == null).map(s => s.pos))];
  // Extreme and Purist draw from every PL player; everything else from the 50+ app list
  const PL = () => (S && S.rules && S.rules.all ? GM.allPlayers : GM.players);
  const byId = id => PL()[id];
  // van Gaal lets any outfield player play any outfield position (keepers stay in goal)
  // (not on a themed spin like a Centurion Throw: a 100-goal striker at centre-back with a Hat-Trick Hero was far too much)
  const themed = () => !!(S.special && WILDCARDS[S.special] && WILDCARDS[S.special].filter);
  const canPlay = (p, pos) => p.poss.includes(pos) || (mgrIs('vangaal') && pos !== 'GK' && p.pos !== 'G' && !themed());
  const fits = (p, open) => open.some(pos => canPlay(p, pos));
  const emptySlots = () => S.xi.filter(s => s.p == null).length;
  const fmt = n => n.toLocaleString();
  const signed = n => (n < 0 ? '−' : '+') + Math.abs(n).toLocaleString();

  /* ---------------------------------------------------------------- reel generation */
  // Fair deals. Every spin has its own fixed running order of players, drawn from the whole field and seeded by the
  // game seed + spin number (+ which re-roll or special spin it is). The reels are the first players in that order who
  // fit your open positions. So two people on the same seed see the same players on the same spin wherever their
  // positions allow - if Shearer is 1st in spin 3's order, everyone with a striker slot open on spin 3 gets him -
  // and identical decisions always give identical games. Wildcards depend on the spin alone.
  const samplers = new Map();
  function sampler(key, list, w) {
    if (!samplers.has(key)) {
      const cum = []; let t = 0;
      for (const p of list) { t += w(p); cum.push(t); }
      samplers.set(key, { list, cum, t });
    }
    const sm = samplers.get(key);
    return u => {  // binary search the cumulative weights
      let lo = 0, hi = sm.cum.length - 1; const x = u * sm.t;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (sm.cum[mid] < x) lo = mid + 1; else hi = mid; }
      return sm.list[lo];
    };
  }
  function makeReels(special) {
    const tag = `${S.seed}|${S.stat}|${S.spin}|${S.spinRespins || 0}|${special || ''}`;
    const r = GM.rng(tag), rw = GM.rng(tag + '|wild');
    const wc = special && WILDCARDS[special];
    // a Hat-Trick spin: three players for one open position (seeded)
    const open = wc && wc.trio ? (o => [o[GM.rng(tag + '|trio').int(o.length)]])(openPos()) : openPos();
    const used = new Set(S.used.concat(S.xi.filter(s => s.p != null).map(s => s.p)));
    const ok = p => fits(p, open) && !used.has(p.id);
    const n = (wc && wc.reels) || 3;
    const wildTypes = () => Object.keys(WILDCARDS).filter(t => (!S.rules.noWild.includes(t) || (tw().allow || []).includes(t)) && (!WILDCARDS[t].chaos || S.rules.chaos) && t !== 'storm');
    // a wildcard storm: every reel is a wildcard (the Storm card, or 1 spin in 10 in CHAOS)
    if ((wc && wc.storm) || (S.rules.chaos && !special && S.spin >= 2 && S.momentSpin !== S.spin && !tw().noStorm && GM.rng(tag + '|storm')() < 0.1)) {
      const rs = GM.rng(tag + '|stormcards'), types = wildTypes(), out = [];
      while (out.length < 3) { const t = rs.weighted(types, k => WILDCARDS[k].w); if (!out.some(x => x.wild === t)) out.push({ wild: t }); }
      S.storm = true;
      if (S.rules.chaos) setTimeout(() => { fx('storm', '🌪️', 8); }, 200);
      charge();
      return out;
    }
    S.storm = false;
    // the field: everyone (or the club's players in Club XI, or a wildcard's theme), as long as it still has someone who fits
    let field = PL(), fkey = S.rules.all ? 'every' : 'all';
    if (S.club) {
      const mine = PL().filter(p => p.clubs.includes(S.club) || (S.club2 && p.clubs.includes(S.club2)));
      if (mine.some(ok)) { field = mine; fkey = 'club:' + S.club + (S.club2 ? '|' + S.club2 : ''); }
    }
    if (S.nat) {
      const mine = PL().filter(p => p.nat === S.nat);
      if (mine.some(ok)) { field = mine; fkey = 'nat:' + S.nat; }
    }
    if (wc && wc.filter) {
      const themed = field.filter(p => wc.filter(p, wst()));
      if (themed.some(ok)) { field = themed; fkey += '|' + special + (special === 'magnet' ? ':' + S.last : ''); }
    }
    const draw = sampler(`${fkey}|${S.mode}|${S.hard ? 'h' : ''}`, field, reelWeight());
    // wildcard: reel 1 or 2 on 28% of spins each, decided by the spin number only
    let wildAt = -1, wild = null;
    if (!special && S.spin >= 1 && S.rules.wild !== false) {
      const wp = tw().wildP || 0.28;
      if (rw() < wp) wildAt = 0; else if (rw() < wp) wildAt = 1;
      wild = rw.weighted(wildTypes(), t => WILDCARDS[t].w * ((tw().wild || {})[t] || 1));
    }
    const reels = [], taken = new Set();
    for (let i = 0; i < n; i++) {
      if (i === wildAt) { reels.push({ wild }); continue; }
      let p = null;
      for (let tries = 0; tries < 800 && !p; tries++) { const c = draw(r()); if (ok(c) && !taken.has(c.id)) p = c; }
      if (!p) {  // very few players left who fit: pick from them directly
        const rest = field.filter(c => ok(c) && !taken.has(c.id));
        if (!rest.length) break;
        p = r.weighted(rest, reelWeight());
      }
      taken.add(p.id);
      const x = { id: p.id };
      // chemistry hint (a label only, so it doesn't change who you're offered): played with your last signing
      const lp = S.last != null ? byId(S.last) : null;
      if (lp && p.first <= lp.last && p.last >= lp.first && p.clubs.some(c => lp.clubs.includes(c))) x.mate = { name: lp.name, club: p.clubs.find(c => lp.clubs.includes(c)) };
      reels.push(x);
    }
    return reels;
  }

  /* ---------------------------------------------------------------- actions */
  async function doSpin(special) {
    if (busy || (S.phase !== 'spin' && S.phase !== 'pick')) return;
    if (S.rules.chaos && !S.manager && S.spin === 0 && !special) { await pickManager(); if (!onThisGame()) return; }
    S.pending = null;
    S.event = null;
    if (S.rules.chaos && !special && !(S.spinRespins > 0) && S.spin >= 2 && S.momentSpin !== S.spin) { await chaosTurn(); if (!onThisGame()) return; }
    if (!special && S.forceSpecial) { special = S.forceSpecial; S.forceSpecial = null; }
    S.special = special || null;
    S.reels = makeReels(special);
    S.selected = -1;
    S.revealed = S.revealNext; S.revealNext = false;
    S.phase = 'spinning';
    if (S.spin === 0 && S.respins === 0) GM.sound.play('whistle');
    render();
    await animateReels();
    S.phase = 'pick';
    render();
    if (S.online && GM.online) GM.online.pushRace(S);  // so your opponent can watch the spin you've got
  }

  // before a spin: a big moment if the meter's full, otherwise (now and then) a match-day event; never both, and
  // never on the spin straight after a big one
  async function chaosTurn() {
    if (S.forceEv) { const f = S.forceEv; S.forceEv = null; S.momentSpin = S.spin; return MOMENTS[f] ? bigMoment(f) : chaosEvent(GM.rng(`${S.seed}|chaos|${S.spin}`), f); }  // tests
    if (S.chaosDue) { S.chaosDue = false; S.momentSpin = S.spin; return bigMoment(); }
    if (S.lastBig === S.spin - 1) return;
    const r = GM.rng(`${S.seed}|chaos|${S.spin}`);
    if (r() >= 0.22) return;
    S.momentSpin = S.spin;
    return chaosEvent(r);
  }
  const filledIdx = () => S.xi.map((x, i) => i).filter(i => S.xi[i].p != null);
  // back to his full numbers (the Physio Room, VAR overturning it all)
  const heal = i => { const x = S.xi[i]; x.v = pv(byId(x.p)); x.g = x.v[S.stat]; x.mod = 'healed'; unpark(i); };
  // how much a hurt player has lost (0 if he isn't hurt)
  const hurtBy = i => { const x = S.xi[i]; return x.p != null && HURT.includes(x.mod) ? Math.max(0, pv(byId(x.p))[S.stat] - x.g) : 0; };
  // CHAOS leaves its mark: things that stay on the pitch for the rest of the game (decoration only, under the players)
  // every moment leaves its mark on the pitch for the rest of the game (# = drawn, see LEFT; the rest are stickers)
  const MESS = {
    pigeon: '#pigeon', streaker: '🩲', stoke: '#puddle', quake: '#crack', wedding: '#confetti', fraud: '#notes', conscript: '#tracks', breakup: '#heart',
    gamble: '#chip', dog: '🐾', vuvuzela: '🎺', pies: '🥧', redcard: '#card', slip: '🍌', interview: '#paper', taxman: '🧾', windfall: '#notes', chant: '#scarf',
    tornado: '#debris', lightning: '#scorch', blackhole: '🕳️', parade: '#confetti', title: '🏆', relegation: '🪂', helicopter: '#pad', unleash: '#scorch',
    amnesty: '#tv', box: '📦', retro: '👕', aliens: '#ring', royal: '👑', oligarch: '💰', arrest: '#tape', derby: '#flare', golden: '#ball',
    'var+': '#tv', 'var-': '#tv', masked: '🎭', handofgod: '🧤', sponge: '#bucket', swapdeal: '🔀', testimonial: '#scarf', loanarmy: '🧳', helicopter2: '#pad',
    fairytale: '🦊', lastminute: '⏱️', splat: '💩', deadline: '#paper', sacked: '#paper', injury: '#cross', hamstring: '#cross', coin: '#coin', hero: '#ball', physio: '#cross',
  };
  function leave(key) {
    const icon = MESS[key]; if (!icon || !S.rules.chaos) return;
    const r = GM.rng(`${S.seed}|mess|${(S.mess || []).length}|${key}`);
    // along the touchlines and in the gaps between the lines of players, never in the middle of a slot
    const edge = r() < 0.6, x = edge ? (r() < 0.5 ? 3 + r() * 7 : 90 + r() * 7) : 12 + r() * 76, y = edge ? 6 + r() * 88 : [4, 27, 50, 73, 96][Math.floor(r() * 5)] + (r() - 0.5) * 4;
    // an earthquake leaves a crack right across the pitch: a jagged line, drawn over the whole pitch
    const crack = icon === '#crack' ? Array.from({ length: 9 }, (_, k) => `${(k * 12.5).toFixed(1)},${(30 + r() * 40).toFixed(1)}`).join(' ') : null;
    S.mess = (S.mess || []).concat([{ i: icon, x: +x.toFixed(1), y: +y.toFixed(1), r: Math.round((r() - 0.5) * 50), t: Date.now(), ...(crack ? { c: crack } : {}) }]).slice(-18);
  }
  const scale = (x, f, mod) => { STAT_KEYS.forEach(k => { x.v[k] = Math.floor(x.v[k] * f); }); x.g = x.v[S.stat]; if (mod) x.mod = mod; };
  const nm = i => GM.esc(byId(S.xi[i].p).name);
  const nm2 = id => GM.esc(byId(id).name);
  // a vehicle that stays by a player (the ambulance by an injured one), drawn with his slot
  const park = (i, kind) => { S.parked = { ...(S.parked || {}), [i]: kind }; };
  const unpark = i => { if (S.parked && S.parked[i]) { S.parked = { ...S.parked }; delete S.parked[i]; } };

  function chaosEvent(r, forced) {
    const all = Object.keys(EVENTS).concat(Object.keys(XEV));
    let e = forced || r.weighted(all, k => rarW((EVENTS[k] || XEV[k]).rar) * again(S.evSeen, k) * (tw().ev && tw().ev[k] != null ? tw().ev[k] : 1));
    S.evSeen = (S.evSeen || []).concat(e);
    if (XEV[e]) {
      const x = XEV[e], before = snap(), out = x.go(r) || {};
      S.log.push(x.icon); S.chaosCount = (S.chaosCount || 0) + 1; leave(e);
      return moment({ icon: x.icon, name: x.name, text: out.note, tone: x.tone, before, run: out.run, onDone: out.done, slot: out.slot, win: out.win, after: out.after, small: true, scene: x.look[0], sound: x.look[1], rarity: x.rar });
    }
    const ev = EVENTS[e];
    const before = snap();
    let note = ev.desc(wst()), run = null, reveal = null, tone = null;
    if (e === 'redcard' || e === 'derby') {
      if (S.modifier) note = 'But you already had a modifier lined up, so it slips by.';
      else S.modifier = e === 'redcard' ? 'rotation' : 'captain';
    } else if (e === 'injury') {
      const filled = filledIdx().filter(i => S.xi[i].mod !== 'injured');
      if (!filled.length) note = 'Nobody to injure yet. Phew.';
      else {
        const i = filled[Math.floor(r() * filled.length)];
        scale(S.xi[i], 0.5, 'injured');
        note = `${nm(i)} is crocked: his ${S.st.label} are halved.`;
        park(i, 'ambulance');
        run = c => c.drive('ambulance', i, { park: true });
      }
    } else if (e === 'taxman') {
      if (!S.inv.length) note = 'Your wildcard bag is empty, so he leaves with nothing.';
      else { const k = Math.floor(r() * S.inv.length), w = S.inv.splice(k, 1)[0]; note = `He takes your ${WILDCARDS[w].icon} ${WILDCARDS[w].name} from your bag.`; run = c => c.bag('🧾'); }
    } else if (e === 'golden') {
      S.golden = true;
    } else if (e === 'var') {
      const i = S.xi.findIndex(y => y.p === S.last && y.p != null);
      if (i < 0) note = 'Nothing to review yet.';
      else {
        const given = r() < 0.5;
        scale(S.xi[i], given ? 2 : 0.5, given ? 'boosted' : 'halved');
        note = `Checking ${nm(i)}…`;
        reveal = { text: given ? `${nm(i)}: <b>GOAL GIVEN!</b> His ${S.st.label} double.` : `${nm(i)}: <b>DISALLOWED.</b> His ${S.st.label} are halved.`, tone: given ? 'good' : 'bad' };
        run = c => c.visit(i, '📺', 'frame');
        e = given ? 'var+' : 'var-';
      }
    } else if (e === 'box') {
      const cards = Object.keys(WILDCARDS).filter(k => WILDCARDS[k].chaos), w = cards[Math.floor(r() * cards.length)];
      if (S.inv.length >= 3) note = 'But your bag is full, so it’s empty. Typical.';
      else { S.inv.push(w); note = `Inside: ${WILDCARDS[w].icon} ${WILDCARDS[w].name}! It goes in your bag.`; run = c => c.bag('🎁'); }
    } else if (e === 'masked') {
      S.masked = true;
    } else if (e === 'windfall') {
      const pts = Math.round(20 * CHAOS_UNIT[S.stat]);
      S.bonus.push([`💰 TV money (spin ${S.spin + 1})`, pts]);
      note = `+${pts} bonus points.`;
      run = c => c.rain('💰');
    }
    S.event = { icon: ev.icon, name: ev.name, note: (reveal ? reveal.text : note).replace(/<[^>]+>/g, '') };
    S.log.push(ev.icon); leave(e);
    S.chaosCount = (S.chaosCount || 0) + 1;
    const good = ['windfall', 'derby', 'golden', 'var+', 'box'].includes(e);
    tone = good ? 'good' : e === 'masked' || e === 'var-' || e === 'var+' ? 'weird' : 'bad';
    const look = { redcard: ['red', ['whistle', 'boo']], injury: ['red', 'ambulance'], taxman: ['dark', 'taxman'], golden: ['gold', 'fanfare'], box: ['gold', 'box'],
      masked: ['dark', 'spooky'], windfall: ['money', 'cash'], derby: ['fire', ['drumroll', 'cheer']], 'var+': ['tv', 'var'], 'var-': ['tv', 'var'] }[e] || ['dark', 'boom'];
    if (reveal) reveal.sound = reveal.tone === 'good' ? 'cheer' : 'boo';
    return moment({ icon: ev.icon, name: ev.name, text: note, tone, before, run, reveal, small: true, scene: look[0], sound: look[1], rarity: ev.rar });
  }

  async function bigMoment(forced) {
    const r = GM.rng(`${S.seed}|moment|${S.spin}`), filled = filledIdx(), left = emptySlots();
    const keys = Object.keys(MOMENTS).filter(k => !MOMENTS[k].need || MOMENTS[k].need(filled.length, left));
    const k = forced || r.weighted(keys, x => rarW(MOMENTS[x].rar) * again(S.bigSeen, x) * ((tw().big || {})[x] || 1)), m = MOMENTS[k], before = snap();
    S.bigSeen = (S.bigSeen || []).concat(k);
    const o = { icon: m.icon, name: m.name, tone: m.tone, before, big: true, rarity: m.rar, ...{ blackhole: { scene: 'lightning', sound: 'spooky' }, relegation: { scene: 'red', sound: 'drumroll', actSound: 'cheer' }, title: { scene: 'party', sound: ['fanfare', 'cheer'] }, unleash: { scene: 'unleash', sound: ['meterfull', 'horn'] }, tornado: { scene: 'storm', sound: 'wind', actSound: 'wind' },
      tornado: { scene: 'twister', sound: 'wind' }, lightning: { scene: 'lightning', sound: 'thunder' }, parade: { scene: 'party', sound: 'fanfare', actSound: 'cheer' }, deadline: { scene: 'clock', sound: 'tick3' }, sacked: { scene: 'news', sound: 'sacked' } }[k] };
    S.lastBig = S.spin;
    S.chaosCount = (S.chaosCount || 0) + 1; S.log.push(m.icon);
    if (k === 'unleash') {
      S.unleash = (S.unleash || 0) + 2;
      o.text = 'The meter blows! Your next two signings count <b>DOUBLE</b>.';
      o.run = c => c.rain('💥');
    } else if (k === 'tornado') {
      const hits = filled.map(i => ({ i, up: r() < 0.5 }));
      hits.forEach(({ i, up }) => scale(S.xi[i], up ? 2 : 0.5, up ? 'boosted' : 'halved'));
      const ups = hits.filter(h => h.up).length;
      o.text = `It rips through your XI: <b>${ups}</b> player${ups === 1 ? '' : 's'} doubled, <b>${hits.length - ups}</b> halved.`;
      o.run = c => c.tornado(2400);
    } else if (k === 'lightning') {
      // two random players: one is struck (halved), another who's scored is charged up (×3), so it can go either way
      const top = filled[Math.floor(r() * filled.length)], rest = filled.filter(i => i !== top && S.xi[i].g > 0);
      scale(S.xi[top], 0.5, 'halved');
      if (rest.length) {
        const low = rest[Math.floor(r() * rest.length)]; scale(S.xi[low], 3, 'boosted');
        o.text = `${nm(top)} is struck: <b>halved</b>. ${nm(low)} is charged up: <b>×3</b>!`;
        o.run = c => { c.visit(top, '⚡', 'strike', 0, 'crack'); c.visit(low, '✨', 'strike', 1100, 'good'); };
      } else {
        const p = pts(25); S.bonus.push(['⚡ Lightning', p]);
        o.text = `${nm(top)} is struck: <b>halved</b>. The rest of the power goes to the floodlights: <b>+${p}</b> bonus.`;
        o.run = c => c.visit(top, '⚡', 'strike', 0, 'crack');
      }
    } else if (k === 'parade') {
      const medals = S.xi.reduce((a, x) => a + (x.p != null ? (byId(x.p).hon.P || 0) : 0), 0), pts = Math.round(Math.max(15, 8 * medals) * CHAOS_UNIT[S.stat]);
      S.bonus.push([`🚌 Bus parade (spin ${S.spin + 1})`, pts]);
      o.text = `The fans are out: <b>+${pts}</b> bonus points${medals ? ` for your ${medals} title medal${medals === 1 ? '' : 's'}` : ''}.`;
      o.run = c => c.sweep('🚌');
    } else if (k === 'blackhole') {
      const by = filled.slice().sort((a, b) => S.xi[b].g - S.xi[a].g), top = by[0], low = by[by.length - 1];
      const v = S.xi[top].v; S.xi[top].v = S.xi[low].v; S.xi[low].v = v; S.xi[top].g = S.xi[top].v[S.stat]; S.xi[low].g = S.xi[low].v[S.stat];
      o.text = `A hole opens in the space-time continuum: ${nm(top)} and ${nm(low)} <b>swap numbers</b>.`;
      o.run = c => { c.hole(); c.visit(top, '🕳️', 'suck', 300); c.visit(low, '🕳️', 'suck', 1000); };
    } else if (k === 'relegation') {
      const p = pts(60); filled.forEach(i => scale(S.xi[i], 0.75, 'halved')); S.bonus.push(['🪂 The great escape', p]);
      o.text = `Bottom of the table at Christmas. Everyone’s numbers <b>−25%</b>… but the great escape is worth <b>+${p}</b> bonus.`;
      o.run = c => c.sweep('🪂');
    } else if (k === 'title') {
      const p = pts(100); S.bonus.push(['🏆 Champions!', p]);
      o.text = `Somehow, you’ve won the league. <b>+${p}</b> bonus points!`;
      o.run = c => c.rain('🏆');
    } else if (k === 'deadline') {
      S.forceSpecial = 'deadline';
      o.text = 'The window’s about to slam shut: this spin has <b>FIVE</b> players to choose from.';
    } else if (k === 'sacked') {
      const old = MANAGERS[S.manager];
      o.text = `${old.name} has been sacked. Pick his replacement:`;
      o.pick = mgrChoices(S.manager);
      o.onPick = appoint;
    }
    if (!o.pick) S.event = { icon: m.icon, name: m.name, note: o.text.replace(/<[^>]+>/g, '') };
    leave(k);
    return moment(o);
  }

  // three managers to choose from (the same three for everyone on this seed and spin)
  function mgrChoices(not) {
    const r = GM.rng(`${S.seed}|mgr|${S.spin}`), out = [];
    const keys = Object.keys(MANAGERS).filter(k => k !== not);
    const fm = S.forceMgr || GM._forceMgr;  // tests and the balance simulation (tools/test/managers.js)
    if (fm && MANAGERS[fm] && !not) out.push(fm);
    while (out.length < 3) { const k = keys[Math.floor(r() * keys.length)]; if (!out.includes(k)) out.push(k); }
    return out;
  }
  function appoint(k) {
    S.manager = k; S.log.push('👔');
    if (k === 'conte' && S.xi.every(x => x.p == null)) {  // only before anyone has signed
      S.form = ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST', 'ST'];
      S.xi = S.form.map(pos => ({ pos, p: null, g: 0, mod: null, as: null }));
      fitKey = '';
    }
    if (k === 'redknapp') ['deadline', 'respin', 'hot'].forEach(w => { if (S.inv.length < 3) S.inv.push(w); });
    if (tw().meter && !S.chaosDue) S.meter = Math.max(S.meter || 0, tw().meter);
  }
  function pickManager() {
    const shape = ['D', 'M', 'F'].map(g => S.form.filter(p => GM.GROUP[p] === g).length).join('-');
    return moment({ icon: '👔', name: 'Kick-off', tone: 'good', before: snap(), text: `Formation <b>${shape}</b>. Appoint your manager: each has a perk and a catch.`, pick: mgrChoices(null), onPick: appoint, scene: 'kickoff', sound: 'whistle' });
  }

  /* ---------------------------------------------------------------- CHAOS moments: one at a time, on the pitch
     A moment is applied to the state first, then shown: a card over the reels, a bit of action on the pitch, and every
     number that changed counting from its old value to its new one. Tap to skip; nothing else can happen meanwhile. */
  let busy = false;
  const snap = () => ({ g: S.xi.map(x => x.g), t: total(), b: S.rules.chaos ? scoreFor(S).bonus : 0 });
  function countTo(el, from, to, ms, fmtFn = fmt) {
    if (!el) return;
    const t0 = performance.now();
    const step = now => { const f = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - f, 3); el.textContent = fmtFn(Math.round(from + (to - from) * e)); if (f < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  // the backdrop for a moment's big entrance: weather, confetti, coins, a spinning burst…
  function scene(el, kind, timers) {
    const sky = document.createElement('div'); sky.className = 'cm-sky sky-' + (kind || 'dark'); el.prepend(sky);
    const bits = (n, cls, chars) => { for (let k = 0; k < n; k++) { const b = document.createElement('i'); b.className = cls; b.textContent = chars ? chars[k % chars.length] : ''; b.style.left = Math.random() * 100 + '%'; b.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's'; b.style.animationDuration = (1.4 + Math.random() * 1.4).toFixed(2) + 's'; if (!chars) b.style.background = ['#ff2bd6', '#ffe600', '#39ff88', '#00f0ff', '#fff'][k % 5]; sky.appendChild(b); } };
    if (kind === 'storm' || kind === 'lightning') {
      if (kind === 'storm') { sky.insertAdjacentHTML('beforeend', '<div class="cm-rain"></div><div class="cm-rain far"></div>'); GM.sound.play('rain'); }
      let n = 0;
      const flash = () => { if (!el.isConnected) return; sky.classList.remove('flash'); void sky.offsetWidth; sky.classList.add('flash'); if (n++ < 2) GM.sound.play('thunder'); timers.push(setTimeout(flash, 900 + Math.random() * 1500)); };
      timers.push(setTimeout(flash, 250));
    }
    if (kind === 'twister') { sky.insertAdjacentHTML('beforeend', '<div class="cm-tornado big"><i></i><i></i><i></i><i></i><i></i><i></i><b>🍃</b><b>📰</b><b>🧢</b><b>🍃</b></div>'); GM.sound.play('wind'); }
    if (kind === 'party') bits(40, 'cm-confetti');
    if (kind === 'money') bits(22, 'cm-coin', ['💰', '🪙', '💷']);
    if (kind === 'unleash') bits(18, 'cm-coin', ['💥', '⚡', '🔥']);
  }
  const coinHtml = heads => `<button class="coin-wrap" aria-label="Flip the coin"><div class="coin" data-end="${heads ? 1440 : 1620}">${'<i class="coin-rim"></i>'.repeat(7)}<div class="coin-f h">⚽<b>HEADS</b></div><div class="coin-f t">🧤<b>TAILS</b></div></div><i class="coin-shadow"></i><span class="coin-go">👆 Tap to flip</span></button>`;
  // a fruit machine: three windows of spinning symbols and a lever to pull
  const FRUIT = ['⚽', '🏆', '🍒', '7️⃣', '💰'];
  const fruitHtml = () => `<button class="fruit" aria-label="Pull the lever"><span class="fruit-top">JACKPOT</span><span class="fruit-wins">${[0, 1, 2].map(k => `<span class="fruit-win"><span class="fruit-strip">${FRUIT.concat(FRUIT, FRUIT).map(x => `<i>${x}</i>`).join('')}</span></span>`).join('')}</span><span class="fruit-lever"><i></i></span><span class="coin-go">👆 Pull the lever</span></button>`;
  const mgrCard = k => { const m = MANAGERS[k]; return `<button class="mgr" data-mgr="${k}"><span class="mgr-ico">${m.icon}</span><b>${m.name}</b><small class="up">✅ ${m.perk}</small><small class="down">⚠️ ${m.catch}</small></button>`; };
  /* A moment in three acts. 1: the entrance, full screen with its own scene and sound (you flip the coin here, or pick
     a manager). 2: the action, as the card drops to the bottom and whatever it is happens on your pitch while the
     numbers count to their new values. 3: the result, held long enough to read. A tap moves it on a step. */
  function moment(o) {
    return new Promise(done => {
      busy = true;
      render();
      const pitch = GM.$('.pitch', root), timers = [], later = (ms, f) => timers.push(setTimeout(f, ms));
      const slotEl = i => GM.$(`.slot[data-slot="${i}"]`, root);
      const b = o.before || snap(), changed = S.xi.map((x, i) => i).filter(i => b.g[i] !== S.xi[i].g);
      // wind the changed numbers (and the counter) back to where they were; they count to their new values on cue
      changed.forEach(i => { const n = GM.$('.sg', slotEl(i)); if (n) n.textContent = fmt(b.g[i]); });
      const cn = GM.$('.counter-num b', root), cb = GM.$('.chaos-pts b', root), now = snap();
      if (cn) cn.textContent = fmt(b.t);
      if (cb) cb.textContent = signed(b.b);
      const hitDone = new Set();
      const hit = i => {
        if (hitDone.has(i) || !changed.includes(i)) return; hitDone.add(i);
        const el = slotEl(i); if (!el) return;
        el.classList.add(S.xi[i].g > b.g[i] ? 'hit-up' : 'hit-down');
        countTo(GM.$('.sg', el), b.g[i], S.xi[i].g, 800);
        GM.sound.play(S.xi[i].g > b.g[i] ? 'good' : 'bad');
      };
      const fxEl = (cls, txt, x, y) => { if (!pitch) return null; const e = document.createElement('span'); e.className = 'cm-fx ' + cls; e.textContent = txt; if (x != null) { e.style.left = x + 'px'; e.style.top = y + 'px'; } pitch.appendChild(e); return e; };
      const at = i => { const el = slotEl(i), pr = pitch.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - pr.left + r.width / 2, r.top - pr.top + r.height / 2, (r.left + r.width / 2 - pr.left) / pr.width]; };
      const c = {
        // something crosses the whole pitch, hitting each changed player as it passes
        sweep(icon, ms = 1800) {
          const e = fxEl('sweep', icon); if (!e) return;
          e.style.animationDuration = ms + 'ms';
          changed.forEach(i => { const [, , f] = at(i); later(ms * (0.08 + 0.84 * f), () => hit(i)); });
        },
        // something arrives at one player
        visit(i, icon, kind = 'pop', delay = 0, sound) {
          later(delay, () => { if (!slotEl(i)) return; const [x, y] = at(i); fxEl('visit ' + kind, icon, x, y); if (sound) GM.sound.play(sound); if (kind === 'strike') flashApp(); });
          later(delay + (kind === 'frame' ? 1400 : 700), () => hit(i));
        },
        bag(icon) { const inv = GM.$('.inv', root); if (inv) { inv.classList.remove('robbed'); void inv.offsetWidth; inv.classList.add('robbed'); } fxEl('visit pop', icon, pitch ? pitch.clientWidth / 2 : 0, pitch ? pitch.clientHeight - 30 : 0); },
        rain(icon) { if (!pitch) return; for (let k = 0; k < 9; k++) { const e = fxEl('rain', icon, Math.random() * pitch.clientWidth, -30); if (e) e.style.animationDelay = (k * 0.09) + 's'; } },
        // a proper twister: a spinning funnel with bits flying round it, crossing the pitch and spinning players as it goes
        tornado(ms = 2400) {
          if (!pitch) return;
          const t = document.createElement('div'); t.className = 'cm-tornado'; t.style.animationDuration = ms + 'ms';
          t.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><b>🍃</b><b>📰</b><b>🧢</b><b>🍃</b>';
          pitch.appendChild(t); GM.sound.play('wind'); pitch.classList.add('windy'); later(ms, () => pitch.classList.remove('windy'));
          changed.forEach(i => { const [, , f] = at(i); later(ms * (0.1 + 0.8 * f), () => { const el = slotEl(i); if (el) { el.classList.remove('spun'); void el.offsetWidth; el.classList.add('spun'); } hit(i); }); });
        },
        // a black hole opens in the middle of the pitch
        hole() { if (!pitch) return; const h = document.createElement('div'); h.className = 'cm-hole'; pitch.appendChild(h); GM.sound.play('spooky'); later(2400, () => h.remove()); },
        // something flies in and lands (where it'll stay: the last leftover)
        fly(icon) {
          const m = (S.mess || []).slice(-1)[0]; if (!pitch || !m) return;
          const W = pitch.clientWidth, H = pitch.clientHeight, tx = W * m.x / 100, ty = H * m.y / 100, e = fxEl('fly', '', tx, ty); if (!e) return;
          e.innerHTML = icon === '🐦' ? SPRITE.pigeon.replace('class="spr pidge"', 'class="spr pidge flying"') : icon;
          GM.sound.play('swoosh');
          // in from the left, a loop over the pitch, then down onto its spot (where the leftover stays)
          const at = (x, y, more = '') => `translate(${(x - tx).toFixed(0)}px, ${(y - ty).toFixed(0)}px) translate(-50%, -50%) ${more}`;
          if (e.animate) e.animate([
            { transform: at(-40, H * 0.35, 'scaleX(-1)') },
            { transform: at(W * 0.6, H * 0.12, 'scaleX(-1) rotate(12deg)'), offset: 0.35 },
            { transform: at(W * 0.75, H * 0.45, 'rotate(-10deg)'), offset: 0.55 },
            { transform: at(tx, ty - 50, 'scaleX(-1) scale(1.1)'), offset: 0.8 },
            { transform: at(tx, ty, 'scaleX(-1) scale(1, .85)'), offset: 0.9 },
            { transform: at(tx, ty, 'scaleX(-1) scale(.6)'), opacity: 0 },
          ], { duration: 2400, easing: 'ease-in-out', fill: 'forwards' });
        },
        // a vehicle drives on from the side, stops by player i (a little bounce on the brakes) and, unless it's staying
        // (park: it's drawn by the slot from now on), drives off the other way
        drive(kind, i, o = {}) {
          const el = slotEl(i); if (!pitch || !el || !el.animate) return;
          const W = pitch.clientWidth, [x, y] = at(i), sw = el.offsetWidth, left = x > W / 2;
          const stopX = left ? x - sw * 0.3 : x + sw * 0.3, from = left ? -110 : W + 110;  // pulls up against him, from the near touchline
          const v = document.createElement('div'); v.className = 'cm-veh moving' + (left ? '' : ' flip'); v.innerHTML = SPRITE[kind];
          v.style.left = stopX + 'px'; v.style.top = (y + 6) + 'px'; pitch.appendChild(v);
          GM.sound.play(o.sound || kind);
          const tx = d => `translate(-50%, -50%) translateX(${d}px)`;
          v.animate([{ transform: tx(from - stopX) }, { transform: tx(0), offset: 0.85 }, { transform: tx(left ? 5 : -5) + ' rotate(' + (left ? 3 : -3) + 'deg)', offset: 0.93 }, { transform: tx(0) }],
            { duration: 1500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
          later(1500, () => { v.classList.remove('moving'); GM.sound.play('screech'); if (o.then) o.then(v); });
          if (!o.park) later(1500 + (o.wait || 900), () => {
            v.classList.add('moving'); GM.sound.play(o.sound || kind);
            v.animate([{ transform: tx(0) }, { transform: tx(left ? W + 140 - stopX : -stopX - 140) }], { duration: 1300, easing: 'cubic-bezier(.6,0,.9,.6)', fill: 'forwards' });
          });
          later(400, () => hit(i));
        },
        // the police take player i away: the car pulls up, he's bundled in, and it drives off with him
        arrest(i) {
          const el = slotEl(i); if (!el) return;
          c.drive('police', i, { wait: 1000, then: () => { el.classList.add('nicked'); GM.sound.play('cuffs'); } });
        },
        // a flying saucer hovers over player i, beams him up and zooms off
        abduct(i) {
          const el = slotEl(i); if (!pitch || !el || !el.animate) return;
          const [x, y] = at(i), u = document.createElement('div'); u.className = 'cm-ufo'; u.innerHTML = SPRITE.ufo + '<i class="beam"></i>';
          u.style.left = x + 'px'; u.style.top = Math.max(34, y - 70) + 'px'; pitch.appendChild(u); GM.sound.play('ufo');
          u.animate([{ transform: 'translate(-50%, -50%) translate(-260px, -140px) rotate(-12deg)' }, { transform: 'translate(-50%, -50%) rotate(6deg)', offset: 0.35 },
            { transform: 'translate(-50%, -50%) translateY(4px)', offset: 0.8 }, { transform: 'translate(-50%, -50%) translate(300px, -200px) rotate(20deg)' }], { duration: 3600, easing: 'ease-in-out', fill: 'forwards' });
          later(1300, () => { u.classList.add('beaming'); el.classList.add('beamed'); hit(i); });
          later(2800, () => u.classList.remove('beaming'));
        },
        slot: slotEl,
        // the ground shakes, a crack tears across the pitch (and stays: the leftover), players wobble
        quake() {
          if (!pitch) return; GM.sound.play('quake');
          const app = document.getElementById('app'); app.classList.remove('quaking'); void app.offsetWidth; app.classList.add('quaking'); later(1600, () => app.classList.remove('quaking'));
          const m = (S.mess || []).filter(x => x.c).slice(-1)[0];
          if (m) { const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 100 100'); sv.setAttribute('preserveAspectRatio', 'none'); sv.setAttribute('class', 'crack tearing'); sv.innerHTML = `<polyline points="${m.c}" pathLength="100"/>`; pitch.appendChild(sv); }
          changed.forEach((i, k) => later(300 + k * 90, () => { const el = slotEl(i); if (el) { el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble'); } hit(i); }));
        },
        // a downpour over the pitch, and puddles
        rainfall() {
          if (!pitch) return; GM.sound.play('rain');
          const w = document.createElement('div'); w.className = 'cm-rainfall';
          w.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(Math.random() * 0.8).toFixed(2)}s;animation-duration:${(0.45 + Math.random() * 0.3).toFixed(2)}s"></i>`).join('');
          pitch.appendChild(w); later(3200, () => w.classList.add('stopping'));
          changed.forEach((i, k) => later(500 + k * 120, () => hit(i)));
        },
        // a helicopter swoops in, lands on the centre spot (the H stays) and takes off again
        heli() {
          if (!pitch || !pitch.animate) return; GM.sound.play('heli');
          const W = pitch.clientWidth, H = pitch.clientHeight, v = document.createElement('div'); v.className = 'cm-veh heli'; v.innerHTML = SPRITE.heli; pitch.appendChild(v);
          v.style.left = (W / 2) + 'px'; v.style.top = (H / 2) + 'px';
          v.animate([{ transform: `translate(-50%, -50%) translate(${-W / 2 - 120}px, ${-H / 2 - 40}px) rotate(-14deg)` }, { transform: 'translate(-50%, -50%) translateY(-30px) rotate(-6deg)', offset: 0.4 },
            { transform: 'translate(-50%, -50%)', offset: 0.55 }, { transform: 'translate(-50%, -50%)', offset: 0.75 }, { transform: `translate(-50%, -50%) translate(${W / 2 + 140}px, ${-H / 2 - 60}px) rotate(-12deg)` }],
            { duration: 4200, easing: 'ease-in-out', fill: 'forwards' });
        },
        // the owner legs it with a briefcase, banknotes flying out behind him
        runner() {
          if (!pitch || !pitch.animate) return; GM.sound.play('siren');
          const W = pitch.clientWidth, H = pitch.clientHeight, v = document.createElement('div'); v.className = 'cm-veh case'; v.innerHTML = SPRITE.briefcase; pitch.appendChild(v);
          v.style.left = '0px'; v.style.top = (H * 0.55) + 'px';
          v.animate([{ transform: 'translate(-60px, -50%) rotate(-8deg)' }, { transform: `translate(${W * 0.5}px, -70%) rotate(8deg)`, offset: 0.5 }, { transform: `translate(${W + 60}px, -50%) rotate(-8deg)` }], { duration: 2400, easing: 'linear', fill: 'forwards' });
          for (let k = 0; k < 12; k++) later(200 + k * 160, () => { const n = document.createElement('div'); n.className = 'cm-note'; n.innerHTML = NOTE; n.style.left = (W * (0.08 + k * 0.075)) + 'px'; n.style.top = (H * 0.5) + 'px'; pitch.appendChild(n); });
        },
        // a heart cracks in two over player i
        heartbreak(i) {
          const el = slotEl(i); if (!el || !pitch) return; const [x, y] = at(i);
          const h = document.createElement('div'); h.className = 'cm-heart'; h.style.left = x + 'px'; h.style.top = (y - 20) + 'px';
          h.innerHTML = '<svg viewBox="0 0 60 54" width="70" height="63"><path class="hl" d="M30 50L6 26Q-4 12 8 4q12-6 22 8l-6 10 8 8z" fill="#e3262f"/><path class="hr" d="M30 50l24-24q10-14-2-22-12-6-22 8l6 10-8 8z" fill="#c21b24"/></svg>';
          pitch.appendChild(h); GM.sound.play('boo'); later(1300, () => hit(i));
        },
        // drawn confetti falling over the pitch
        confetti() {
          if (!pitch) return; const w = document.createElement('div'); w.className = 'cm-confetti';
          const C = ['#ff5ec8', '#ffe14a', '#5ec8ff', '#7dff6b', '#ffffff', '#ff8a3d'];
          w.innerHTML = Array.from({ length: 60 }, (_, k) => `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${C[k % C.length]};animation-delay:${(Math.random() * 1.2).toFixed(2)}s;--sx:${((Math.random() - 0.5) * 80).toFixed(0)}px"></i>`).join('');
          pitch.appendChild(w);
        },
        // someone legs it across the pitch
        dash(icon) { const e = fxEl('dash', icon); if (e) { e.style.top = (25 + Math.random() * 50) + '%'; GM.sound.play('cheer'); } },
      };
      const flashApp = () => { const f = document.createElement('div'); f.className = 'chaos-flash lightning'; document.body.appendChild(f); setTimeout(() => f.remove(), 700); };
      const el = document.createElement('div');
      el.className = `cm intro cm-${o.tone || 'weird'} ${o.big ? 'cm-big' : ''} ${o.pick ? 'cm-pick' : ''}`;
      el.innerHTML = `<div class="cm-card ${o.rarity ? 'rar-' + o.rarity : ''}">${RAR_NAME[o.rarity] ? `<div class="cm-rar">${o.rarity === 'l' ? '✨ ' : ''}${RAR_NAME[o.rarity]}${o.rarity === 'l' ? ' ✨' : ''}</div>` : ''}<div class="cm-icon">${o.icon}</div><div class="cm-name">${o.name}</div><div class="cm-text">${o.text || ''}</div>
        ${o.coin != null ? coinHtml(o.coin) : ''}${o.slot ? fruitHtml() : ''}${o.pick ? `<div class="mgr-list">${o.pick.map(mgrCard).join('')}</div>` : '<small class="cm-skip">Tap to carry on</small>'}</div>`;
      document.body.appendChild(el);
      scene(el, o.scene, timers);
      if (o.sound) [].concat(o.rarity === 'l' || o.rarity === 'r' ? ['wild'] : [], o.sound).forEach((snd, k) => later(k * 450, () => GM.sound.play(snd)));
      if (o.tone === 'bad' || o.tone === 'unleash') { const app = document.getElementById('app'); app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake'); }
      GM.buzz(o.tone === 'bad' ? 120 : 40);
      const card = GM.$('.cm-card', el), setText = (html, tone) => { const t = GM.$('.cm-text', el); if (t) t.innerHTML = html; if (tone) el.className = el.className.replace(/cm-(good|bad|weird|unleash)\b/, 'cm-' + tone); };
      let stage = 'intro', over = false;
      const finish = () => {
        if (over) return; over = true;
        timers.forEach(clearTimeout); window.removeEventListener('hashchange', finish);
        el.classList.add('out'); setTimeout(() => el.remove(), 300);
        busy = false;
        if (o.onDone) o.onDone();
        if (S.rules.chaos && (o.text || o.reveal)) S.moments = (S.moments || []).concat([{ icon: o.icon, name: o.name, text: (o.after || (o.reveal && o.reveal.text) || o.text).replace(/<[^>]+>/g, ''), rar: o.rarity || '' }]);
        render();
        if (S.rules.chaos && S.online && GM.online) GM.online.pushRace(S);
        done();
      };
      window.addEventListener('hashchange', finish);
      if (o.pick) { GM.$$('[data-mgr]', el).forEach(bt => bt.onclick = e => { e.stopPropagation(); o.onPick(bt.dataset.mgr); GM.sound.play('sting'); finish(); }); return; }
      const onPitch = !!o.run || changed.length > 0;
      // act 2: the card drops to the bottom (so the pitch and the score show) and it happens
      const act = () => {
        if (stage !== 'intro' || over) return;
        if (!onPitch) { stage = 'result'; later(o.reveal ? 0 : 400, finish); return; }
        stage = 'act';
        const r1 = card.getBoundingClientRect();
        el.classList.remove('intro'); el.classList.add('act');
        const r2 = card.getBoundingClientRect();
        if (card.animate) card.animate([{ transform: `translateY(${r1.top - r2.top}px)` }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
        const t0 = 450;
        later(t0, () => { if (o.run) o.run(c); changed.forEach(i => later(o.run ? 2000 : 200, () => hit(i))); countTo(cn, b.t, now.t, 1100); countTo(cb, b.b, now.b, 1100, signed); if (o.actSound) GM.sound.play(o.actSound); });
        if (o.reveal) later(t0 + 1400, () => { setText(o.reveal.text, o.reveal.tone); if (o.reveal.sound) GM.sound.play(o.reveal.sound); });
        later(t0 + (o.run ? 2900 : 1300), () => { stage = 'result'; later(1700, finish); });
      };
      el.onclick = () => { if (stage === 'intro') { if ((o.coin != null || o.slot) && !flipped) return o.slot ? pull() : flip(); act(); } else finish(); };
      // the fruit machine: pull the lever, the reels spin and stop one by one on the symbols already decided
      const pull = () => {
        if (flipped) return; flipped = true;
        el.classList.add('flipping', 'pulled'); GM.sound.play('slotspin');
        const wins = [...el.querySelectorAll('.fruit-win')], T = GM.calm() ? 0 : 1;
        wins.forEach(w => w.classList.add('spinning'));
        wins.forEach((w, k) => later(T * (900 + k * 450), () => {
          w.classList.remove('spinning'); w.innerHTML = `<span class="fruit-strip stop"><i>${o.slot[k]}</i></span>`; GM.sound.play('land');
        }));
        later(T * 1900 + 200, () => {
          el.classList.add('landed'); if (o.win) el.querySelector('.fruit').classList.add('won');
          GM.sound.play(o.win ? 'jackpot' : 'boo'); setText(o.after, o.win ? 'good' : 'bad');
          later(2000, act);
        });
      };
      // the coin waits for you to flip it
      let flipped = false;
      const flip = () => {
        if (flipped) return; flipped = true;
        el.classList.add('flipping'); GM.sound.play('coinflip');
        // flipped frame by frame: up, spinning end over end, and down on the right face (a CSS keyframe version
        // blended the spin as a matrix, which just wobbled)
        const coin = el.querySelector('.coin'), sh = el.querySelector('.coin-shadow'), end = +coin.dataset.end;
        // four turns end over end (a fifth for tails), thrown high, tilted and wobbling so you see it's a coin with an
        // edge (the rim) and not a flat disc; the spin slows into the landing with a little bounce
        const T = GM.calm() ? 1 : 1900, start = performance.now();
        coin.style.animation = 'none';
        const step = now => {
          const t = Math.min(1, (now - start) / T), spin = 1 - Math.pow(1 - t, 2.4), up = Math.sin(Math.PI * Math.min(1, t / 0.9));
          const bounce = t > 0.9 ? Math.sin((t - 0.9) / 0.1 * Math.PI) * 10 : 0, tilt = 22 * (1 - t), wob = Math.sin(t * Math.PI * 5) * 10 * (1 - t);
          coin.style.transform = `translateY(${(-170 * up - bounce).toFixed(1)}px) scale(${(1 + 0.35 * up).toFixed(3)}) rotateY(${(tilt + wob).toFixed(1)}deg) rotateX(${(end * spin).toFixed(1)}deg)`;
          if (sh) sh.style.transform = `scale(${(1 - 0.6 * up).toFixed(3)})`;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        later(T === 1 ? 50 : 1900, () => {
          el.classList.add('landed'); GM.sound.play('coinland');
          later(150, () => { GM.sound.play(o.coin ? 'cheer' : 'boo'); setText(o.after, o.coin ? 'good' : 'bad'); });
          later(2000, act);
        });
      };
      if (o.coin == null && !o.slot) later(onPitch ? (o.small ? 2600 : 3000) : 3600, act);
    });
  }
  // CHAOS meter
  function charge(n = 1) {
    if (!S.rules.chaos) return;
    S.meter = (S.meter || 0) + n * (tw().meterX || 1);
    if (S.meter >= METER && !S.chaosDue) { S.meter = 0; S.chaosDue = true; setTimeout(() => GM.sound.play('meterfull'), 250); }
    else if (!S.chaosDue) setTimeout(() => GM.sound.play('charge', S.meter), 250);
    if (S.online && GM.online) GM.online.pushRace(S);  // the opponent's view of the CHAOS bar
  }
  function fx(kind, icon, rain = 0) {
    if (!S.rules.chaos) return;
    const app = document.getElementById('app');
    if (kind === 'bad' || kind === 'unleash') { app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake'); }
    if (!icon) return;
    const flash = document.createElement('div');
    flash.className = 'chaos-flash ' + kind;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
    const emojis = kind === 'good' ? [icon, '💰', '🔥', '⭐'] : kind === 'unleash' ? ['💥', '⚡', '🌪️', '🔥'] : kind === 'storm' ? ['🌪️', '🃏', '💨'] : kind === 'weird' ? [icon, '❓', '🤡'] : [icon, '💀', '😱'];
    for (let i = 0; i < rain; i++) {
      const e = document.createElement('span');
      e.className = 'chaos-emoji';
      e.textContent = emojis[i % emojis.length];
      e.style.left = Math.random() * 100 + 'vw';
      e.style.animationDelay = Math.random() * 0.35 + 's';
      e.style.fontSize = 18 + Math.random() * 26 + 'px';
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 2200);
    }
    GM.sound.play(kind === 'good' ? 'jackpot' : kind === 'storm' ? 'siren' : kind === 'unleash' ? 'horn' : kind === 'weird' ? 'wild' : 'boom');
    GM.buzz(kind === 'bad' || kind === 'unleash' ? 120 : 40);
  }

  async function animateReels() {
    const cards = GM.$$('.reel', root);
    const names = PL();
    const stops = cards.map((c, i) => 500 + i * 250);
    const t0 = performance.now();
    let frame = 0;
    await new Promise(res => {
      const tick = () => {
        const t = performance.now() - t0;
        let running = false;
        if (frame++ % 2 === 0) GM.sound.play('tick');
        cards.forEach((c, i) => {
          if (t < stops[i]) {
            running = true;
            const n = c.querySelector('.reel-spin');
            if (n) n.textContent = names[Math.floor(Math.random() * names.length)].name;
          } else if (c.classList.contains('spinning')) {
            c.classList.remove('spinning');
            c.innerHTML = reelInner(S.reels[i]);
            c.classList.add('landed');
            GM.sound.play('land');
          }
        });
        if (running) setTimeout(tick, 55); else res();
      };
      tick();
    });
  }

  // Tapping a player selects him; his possible open slots light up on the pitch and you tap one to sign him.
  function sign(i) {
    const reel = S.reels[i];
    if (busy || !reel || S.phase !== 'pick' || S.subbing !== false) return;
    if (reel.wild) {
      if (S.inv.length >= 3 && !S.storm) { GM.toast('Your wildcard bag is full (3) – use one first'); return; }
      if (S.inv.length >= 3) { const gone = S.inv.shift(); GM.toast(`Bag full: your ${WILDCARDS[gone].icon} ${WILDCARDS[gone].name} blows away in the storm`); }
      S.pending = null;
      S.inv.push(reel.wild);
      S.log.push('🃏');
      charge();
      if (GM.trackPick) GM.trackPick(null, S.reels.filter(x => !x.wild).map(x => byId(x.id)));
      GM.sound.play('wild');
      GM.toast(`${WILDCARDS[reel.wild].icon} ${WILDCARDS[reel.wild].name} added to your bag`);
      return afterPick(i);
    }
    const p = byId(reel.id);
    if (!targetSlots(p).length) { GM.toast(`No open position for ${GM.esc(p.name)} any more`); return; }
    S.pending = S.pending === i ? null : i;
    render();
    if (S.pending != null) {
      const pitch = GM.$('.pitch', root);
      if (pitch && pitch.getBoundingClientRect().bottom < 60) pitch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const targetSlots = p => S.xi.map((s, i) => i).filter(i => S.xi[i].p == null && canPlay(p, S.xi[i].pos));

  async function place(slotIdx) {
    if (busy || S.pending == null || S.phase !== 'pick') return;
    const i = S.pending;
    const p = byId(S.reels[i].id);
    const slot = S.xi[slotIdx];
    if (!targetSlots(p).includes(slotIdx)) { GM.toast(`${GM.esc(p.name)} can play ${p.poss.join(' / ')} – pick a highlighted slot`); return; }
    const pos = slot.pos;
    // every signing stores goals/assists/apps; modifiers apply to all three
    let mult = 1, heads = true;
    if (S.modifier === 'captain') mult = S.capMult || 2;
    if (S.modifier === 'rotation') mult = 0.5;
    // a Hat-Trick: all three on the reels signed as one, their numbers added; under the bar he counts half
    const trio = S.special === 'hero' ? S.reels.filter(x => !x.wild).map(x => byId(x.id)) : null;
    const base = trio ? trio.reduce((a, q) => { const w = pv(q); STAT_KEYS.forEach(k => { a[k] += w[k]; }); return a; }, { goals: 0, assists: 0, apps: 0 }) : pv(p);
    const short = trio ? base[S.stat] < (HAT[S.stat] || 50) : false;
    if (short) mult *= 0.5;
    if (S.hot > 0) { mult *= 1.5; S.hot--; }
    if (S.golden) { mult *= 3; S.golden = false; }
    if (S.unleash > 0) { mult *= 2; S.unleash--; }
    if (S.modifier === 'coin') {
      heads = GM.rng(`${S.seed}|coin|${S.spin}|${S.respins}`)() < 0.5;
      mult = heads ? 2 : 0;
      if (heads) S.coinWin = true;
    }
    let rant = false;
    if (mgrIs('warnock')) { rant = GM.rng(`${S.seed}|warnock|${S.spin}|${S.respins}`)() < 0.1; mult = rant ? 0 : mult * 1.15; }
    const outPos = !p.poss.includes(pos);
    if (outPos) mult *= 0.8;  // van Gaal's philosophy
    const fergieTime = mgrIs('fergie') && emptySlots() === 1;
    if (fergieTime) mult *= 2;
    const both = S.club2 && bothSides(p);  // Matchday XI: played for both sides, double (on top of everything else)
    if (both) mult *= 2;
    const before = S.modifier === 'coin' ? snap() : null;
    const v = { ...base };
    STAT_KEYS.forEach(k => { v[k] = Math.floor(v[k] * mult); });
    slot.v = v;
    const g = v[S.stat];
    slot.p = p.id; slot.g = g; slot.mod = rant ? 'zero' : S.modifier === 'coin' ? (heads ? 'captain' : 'zero') : short ? 'halved' : S.modifier === 'hero' ? null : S.modifier;
    slot.trio = trio ? trio.map(q => q.id) : null;
    if (trio) trio.forEach(q => { if (q.id !== p.id) S.used.push(q.id); });
    slot.as = pos !== p.poss[0] ? pos : null;
    slot.fresh = true;
    S.modifier = null; S.capMult = null;
    S.last = p.id;
    S.used.push(p.id);
    if (!S.readonly && GM.trackPick) GM.trackPick(p, S.reels.filter(x => !x.wild).map(x => byId(x.id)));
    S.log.push(pos);
    S.pending = null;
    GM.sound.play('place'); GM.buzz();
    // in target modes a blip climbs as the total closes in on the number
    if (S.target && !S.rules.treble) setTimeout(() => GM.sound.play('rise', S.xi.reduce((a, x) => a + x.g, 0) / S.target), 180);
    if (both) setTimeout(() => GM.toast(`🤝 ${GM.esc(p.name)} played for both sides: <b>double points</b>`, 2600), 300);
    if (rant) setTimeout(() => { GM.toast(`🗯️ “It’s a conspiracy!” ${GM.esc(p.name)} <b>counts for nothing</b>`, 2800); GM.sound.play('boo'); }, 300);
    else if (outPos && S.rules.chaos) setTimeout(() => GM.toast(`📋 ${GM.esc(p.name)} out of position: <b>80%</b>`, 2200), 300);
    if (trio) setTimeout(() => { GM.toast(`🎩 Hat-trick! ${trio.map(q => GM.esc(q.name.split(' ').slice(-1)[0])).join(' + ')} = <b>${fmt(base[S.stat])}</b> ${S.st.label}${short ? ` – under ${HAT[S.stat]}, so <b>half</b>` : ''}`, 3400); GM.sound.play(short ? 'boo' : 'cheer'); }, 300);
    if (fergieTime && !rant) setTimeout(() => { GM.toast(`⌚ <b>Fergie time!</b> ${GM.esc(p.name)} counts double`, 2800); GM.sound.play('cheer'); }, 300);
    if (p.name === 'Sergio Agüero' && emptySlots() === 0) {  // 🤫 the last signing of the game
      setTimeout(() => { GM.toast('🇦🇷 <b>AGÜEROOOOOOOO!</b> Last-minute winner.', 3200); GM.sound.play('cheer'); }, 400);
    }
    if (before) leave('coin');
    if (trio) leave('hero');
    if (before) {  // Double or Nothing: a real coin toss before he takes his place
      await moment({ icon: '🎲', name: 'Double or nothing', tone: 'weird', before, coin: heads, scene: 'casino', sound: 'drumroll', text: `${GM.esc(p.name)}: heads he counts double, tails he counts for nothing…`,
        after: heads ? `<b>Heads!</b> ${GM.esc(p.name)} counts double.` : `<b>Tails…</b> ${GM.esc(p.name)} counts for nothing.` });
      if (!onThisGame()) return;
    }
    afterPick(i);
  }

  async function afterPick(i) {
    // show what everyone on the reels had before moving on
    S.revealed = true;
    S.phase = 'reveal';
    S.selected = i;
    render();
    await GM.sleep(S.reels.some(r => !r.wild) ? 1500 : 700);
    completePick();
  }

  function completePick() {
    if (S.online && GM.online) GM.online.pushRace(S);
    S.masked = false;
    S.xi.forEach(s => { s.fresh = false; });
    S.spinRespins = 0;
    S.spin++;
    S.reels = [];
    S.selected = -1;
    S.revealed = false;
    S.special = null;
    if (emptySlots() === 0) return finish();
    S.phase = 'spin';
    render();
  }

  function useWild(k) {
    const w = S.inv[k];
    const wc = WILDCARDS[w];
    if (busy || S.phase === 'spinning' || S.phase === 'reveal' || S.phase === 'done') return;
    const consume = () => { S.inv.splice(k, 1); S.log.push(wc.icon); S.wildUsed++; GM.sound.play('wild'); charge(); };
    switch (wc.kind) {
      case 'reveal':
        if (S.phase === 'pick') S.revealed = true; else S.revealNext = true;
        GM.toast(S.phase === 'pick' ? '🔍 Scout report in' : '🔍 Your next spin will be scouted');
        break;
      case 'respin':
        if (S.phase !== 'pick') { GM.toast('Spin first, then Roll Again if you don’t like them'); return; }
        S.respins++; S.spinRespins = (S.spinRespins || 0) + 1; consume(); doSpin(); return;
      case 'special':
        S.respins++; S.spinRespins = (S.spinRespins || 0) + 1; consume(); doSpin(w); return;
      case 'sub':
        if (!S.xi.some(s => s.p != null)) { GM.toast('No one to release yet'); return; }
        S.subbing = k; S.pending = null; render(); GM.toast('Tap a player on the pitch to release him'); return;
      case 'allin': {
        const filled = S.xi.filter(x => x.p != null);
        if (!filled.length) { GM.toast('Sign someone first – there’s nothing to gamble yet'); return; }
        const heads = GM.rng(`${S.seed}|allin|${S.spin}|${S.wildUsed}`)() < 0.5, before = snap();
        filled.forEach(x => scale(x, heads ? 2 : 0.5, heads ? 'boosted' : 'halved'));
        if (heads) S.coinWin = true;
        consume(); leave('coin');
        moment({ icon: '🎰', name: 'ALL IN', tone: 'weird', before, coin: heads, scene: 'casino', sound: 'drumroll', text: 'Heads, your whole XI doubles. Tails, it’s halved…',
          after: heads ? '<b>Heads!</b> It pays off: your whole XI doubles.' : '<b>Tails…</b> It’s gone wrong: your whole XI is halved.', run: c => c.sweep(heads ? '💰' : '💸'), actSound: heads ? 'cash' : 'taxman', big: true });
        return;
      }
      case 'heal': {
        const i = filledIdx().sort((a, b) => hurtBy(b) - hurtBy(a))[0];
        if (i == null || !hurtBy(i)) { GM.toast('Nobody’s hurt – keep the physio for later'); return; }
        const before = snap(); heal(i); consume(); leave('physio');
        moment({ icon: '🏥', name: 'Physio Room', tone: 'good', before, scene: 'kickoff', sound: 'ambulance', text: `${nm(i)} is back from the treatment table: <b>full ${S.st.label}</b> again.`, run: c => c.drive('ambulance', i) });
        return;
      }
      case 'joker': {
        const types = Object.keys(WILDCARDS).filter(t => WILDCARDS[t].chaos && !['joker', 'storm'].includes(t));
        const t = types[GM.rng(`${S.seed}|joker|${S.spin}|${S.wildUsed}|${k}`).int(types.length)];
        S.inv[k] = t; GM.sound.play('shimmer');
        GM.toast(`🃏 The Joker turns into ${WILDCARDS[t].icon} <b>${WILDCARDS[t].name}</b>`, 2600);
        render(); return;
      }
      case 'hot':
        S.hot = (S.hot || 0) + 3;
        GM.toast('🔥 Hot streak: your next three signings count ×1.5');
        break;
      case 'modifier':
        if (S.modifier) { GM.toast('A modifier is already active'); return; }
        S.modifier = w;
        if (w === 'captain' && S.rules.chaos) {
          const n = Math.min(S.capN || 0, 2); S.capMult = CAP[n]; S.capN = (S.capN || 0) + 1;
          GM.toast(`©️ ${['Captain', 'Vice-captain', 'Vice-vice-captain'][n]}: your next signing counts ×${CAP[n]}`);
        } else GM.toast(`${wc.icon} ${wc.name} active on your next signing`);
        break;
      case 'formation': {
        const idx = w === 'gegenpress'
          ? S.xi.map((x, i) => i).filter(i => ['LM', 'RM'].includes(S.xi[i].pos) && S.xi[i].p == null)
          : S.xi.map((x, i) => i).filter(i => ['ST', 'CM', 'LM', 'RM'].includes(S.xi[i].pos) && S.xi[i].p == null)
            .sort((a, b) => ['ST', 'CM', 'LM', 'RM'].indexOf(S.xi[a].pos) - ['ST', 'CM', 'LM', 'RM'].indexOf(S.xi[b].pos) || b - a).slice(0, 2);
        if (!idx.length) { GM.toast(w === 'gegenpress' ? 'Your LM and RM slots are already filled' : 'No free attacking slots to drop back'); return; }
        idx.forEach(i => { S.xi[i].pos = w === 'gegenpress' ? 'ST' : 'CB'; });
        GM.toast(w === 'gegenpress' ? `⚡ Gegenpress! ${idx.length} midfield slot${idx.length > 1 ? 's' : ''} → strikers` : `🚌 Bus parked: ${idx.length} slot${idx.length > 1 ? 's' : ''} → defence`);
        if (S.phase === 'pick' && !S.reels.some(x => x.wild || fits(byId(x.id), openPos()))) { S.respins++; S.spinRespins = (S.spinRespins || 0) + 1; consume(); doSpin(); return; }
        break;
      }
    }
    consume();
    render();
  }

  function release(slotIdx) {
    const s = S.xi[slotIdx];
    if (busy || S.subbing === false || s.p == null) return;
    GM.toast(`👋 ${byId(s.p).name} released`);
    GM.sound.play('swoosh');
    s.p = null; s.g = 0; s.v = null; s.mod = null; s.as = null;
    if (S.splat) S.splat = S.splat.filter(x => x !== slotIdx);
    unpark(slotIdx);
    S.inv.splice(S.subbing, 1);
    S.log.push('🔄');
    S.wildUsed++;
    S.subbing = false;
    charge();
    render();
  }

  /* ---------------------------------------------------------------- scoring / finish */
  function scoreFor(st) {
    const sum = k => st.xi.reduce((a, s) => a + (s.v ? s.v[k] : (k === st.stat ? s.g : 0)), 0);
    const t = sum(st.stat);
    if (st.rules.chaos) return chaosScore(st, t);
    if (st.rules.max) return { total: t, parts: [], diff: null, t };
    if (st.rules.treble) {
      // up to 333 per stat: full marks when exact, nothing once you're 25% out
      const parts = [], hits = [];
      STAT_KEYS.forEach(k => {
        const got = sum(k), tg = TREBLE[k], e = Math.abs(got - tg) / tg;
        parts.push([`${GM.STATS[k].icon} ${fmt(got)} / ${fmt(tg)} ${GM.STATS[k].label}`, Math.round(333 * Math.max(0, 1 - 4 * e))]);
        if (e <= 0.03) hits.push(k);
      });
      if (hits.length === 3) parts.push(['🏆 THE TREBLE – all three within 3%!', 500]);
      else if (hits.length === 2) parts.push(['🥈 The Double – two within 3%', 150]);
      const worst = Math.max(...STAT_KEYS.map(k => Math.abs(sum(k) - TREBLE[k]) / TREBLE[k]));
      return { total: parts.reduce((a, p) => a + p[1], 0), parts, diff: hits.length === 3 ? 0 : null, t, hits, closeness: Math.round(worst * 500) };
    }
    const diff = Math.abs(st.target - t);
    // closeness is measured in "500-goal units" so every stat/target scores on the same scale
    const d = Math.round(diff * 500 / st.target);
    const parts = [[`Closeness (${fmt(diff)} off)`, Math.max(0, 1000 - 5 * d)]];
    if (diff === 0) parts.push(['🎯 Bullseye!', 500]);
    return { total: parts.reduce((a, p) => a + p[1], 0), parts, diff, t, closeness: d };
  }

  function chaosLevel() {
    const n = (S.chaosCount || 0) + S.log.filter(x => x === '🃏').length;
    const [icon, name] = n >= 12 ? ['💥', 'Total anarchy'] : n >= 8 ? ['🌪️', 'Utter carnage'] : n >= 4 ? ['🔥', 'Proper chaos'] : ['😇', 'Mild disorder'];
    return `${icon} Chaos level: <b>${name}</b><small>${S.log.filter(x => !/^[A-Z]{2}$/.test(x)).join(' ')}</small>`;
  }
  // CHAOS: your total plus bonus points for the kind of XI you built (scaled to the stat)
  function chaosScore(st, t) {
    const u = CHAOS_UNIT[st.stat] || 1, slots = st.xi.filter(x => x.p != null).map(x => ({ ...x, player: byId(x.p) })), ps = slots.map(x => x.player);
    const parts = [];
    const add = (label, pts) => { if (pts) parts.push([label, Math.round(pts * u)]); };
    if (slots.length) {
      const { score, pairs } = GM.teamRating(slots);
      add(`🤝 Chemistry (${pairs.length} pair${pairs.length === 1 ? '' : 's'} of teammates)`, 12 * pairs.length);
      add(`⭐ Squad rating ${score}`, 3 * Math.max(0, score - 55));
      const titles = ps.reduce((a, p) => a + (p.hon.P || 0), 0);
      add(`🏆 PL title medals (${titles})`, 4 * titles);
      const hof = ps.filter(p => p.hon.H).length; add(`🏛️ Hall of Famers (${hof})`, 15 * hof);
      const loyal = ps.filter(p => p.clubs.length === 1 && p.apps >= 150).length; add(`❤️ One-club men (${loyal})`, 15 * loyal);
      const jm = ps.filter(p => p.clubs.length >= 5).length; add(`🧳 Journeymen, 5+ clubs (${jm})`, 10 * jm);
      const vets = ps.filter(p => Math.min(p.last, GM.currentSeason) - p.first + 1 >= 10).length; add(`🗓️ Ten-season veterans (${vets})`, 8 * vets);
    }
    (st.bonus || []).forEach(([label, pts]) => parts.push([label, pts]));
    const m = MANAGERS[st.manager];
    if (m && slots.length) {
      const pairs = GM.teamRating(slots).pairs.length;
      m.lines({ slots, ps, u, pairs, wild: st.wildUsed || 0, big: (st.bigSeen || []).length }).forEach(([label, pts]) => { pts = Math.round(pts); if (pts) parts.push([label, pts]); });
    }
    const bonus = parts.reduce((a, x) => a + x[1], 0);
    const gk = st.stat !== 'apps' && slots.some(x => x.player.pos === 'G' && x.player.cs) ? ' + 🧤 clean sheets' : '';
    return { total: t + bonus, parts: [[`${GM.STATS[st.stat].icon} PL ${GM.STATS[st.stat].label}${gk}`, t], ...parts], diff: null, t, bonus };
  }

  async function finish() {
    S.phase = 'done';
    const sc = scoreFor(S);
    S.final = sc;
    if (S.rules.max && !S.readonly) GM.addDist(distKey(), S.stat, S.rules.chaos ? sc.total : sc.t);  // CHAOS counts its points  // before the score is saved (see GM.dist)
    const xiSlots = S.xi.filter(s => s.p != null).map(s => ({ ...s, player: byId(s.p) }));
    if (GM.collectDraft && !S.readonly) {
      const rating = GM.teamRating(xiSlots);
      S.collected = GM.collectDraft({
        mode: S.mode, stat: S.stat, total: sc.t, points: sc.total, hard: S.hard, xi: xiSlots.map(s => s.player),
        rating: rating.score, pairs: rating.pairs.length, wildUsed: S.wildUsed, coinWin: S.coinWin,
        bull: sc.diff === 0, closeness: sc.closeness != null ? sc.closeness : null, treble: !!(sc.hits && sc.hits.length === 3),
        slots: xiSlots.map(x => ({ name: x.player.name, g: x.g })), manager: S.manager || null, extreme: !!S.extreme,
        moments: (S.moments || []).map(m => m.name), rars: (S.moments || []).map(m => m.rar), bigs: (S.bigSeen || []).length,
        clubs: S.club2 ? [S.club, S.club2] : null, fx: S.fx || null, nat: S.nat || null,
        liked: S.manager && MANAGERS[S.manager].likes ? xiSlots.filter(x => MANAGERS[S.manager].likes(x.player)).length : 0,
      });
      S.collected = { n: S.collected.newPlayers.length, total: S.collected.total, badges: S.collected.fresh.map(x => x.icon + ' ' + x.name), book: S.collected.book };
    }
    if (saveKey() && !S.readonly) GM.store.set(saveKey(), null);
    if (S.fx && !S.readonly) GM.store.set('match2:' + S.fx, { ...S, rules: undefined });
    if (S.dailyChaos && !S.readonly) {
      GM.store.set('dchaos2:' + S.day, { ...S, rules: undefined });
      GM.markDaily('chaos', sc.total, S.day);
    }
    if (S.mode === 'daily') {
      GM.store.set('daily2:' + GM.today(), { ...S, rules: undefined });
      GM.store.set(progressKey(), null);
      GM.markDaily('daily', sc.t);
    }
    render();
    if (S.online && GM.online) GM.online.pushRace(S);
    GM.sound.play('fulltime');
    const bull = sc.diff === 0;
    if (bull) setTimeout(() => GM.sound.play('horn'), 1700);
    if (!S.readonly && !(S.online && S.mode === 'target')) {  // a Target Race's target is its own, so it stays off the Target board
      if (S.mode === 'daily' && sc.total > GM.best('daily')) GM.store.set('best:daily', sc.total);
      const { isBest } = await GM.recordScore(modeKey(), sc.total, S.target && !S.rules.max && !S.rules.treble ? { t: sc.t, g: S.target } : { t: sc.t });
      if (isBest && sc.total > 0 && S.mode !== 'daily') GM.toast('🏆 New personal best!');
      if (isBest && sc.total > 0 && !bull) setTimeout(() => GM.sound.play('cheer'), 1700);
    }
  }

  /* ---------------------------------------------------------------- rendering */
  const posBadges = GM.posBadges;
  // a small secondary number on the reel card that isn't the stat being played for
  const hintStat = p => S.stat === 'apps' || S.rules.mystery ? '' : `<small>${fmt(p.apps)} apps</small>`;

  function reelInner(x) {
    if (!x) return '';
    if (S.masked && !x.wild && !S.revealed && S.phase !== 'reveal') {
      const p = byId(x.id);
      return `<div class="avatar lg mystery"><b>🎭</b></div><div class="reel-name">Masked man</div><div class="reel-meta">${posBadges(p)} ${GM.era(p)}</div><div class="reel-goals"><b>?</b> ${S.st.label}</div>`;
    }
    if (x.wild) {
      const w = WILDCARDS[x.wild];
      return `<div class="wild-card"><div class="wild-icon">${w.icon}</div><div class="wild-name">${w.name}</div><div class="wild-desc">${w.desc(wst())}</div><div class="tag">WILDCARD</div></div>`;
    }
    const p = byId(x.id);
    const reveal = S.revealed;
    const num = S.rules.treble
      ? `<div class="reel-goals treble-num ${reveal ? 'show' : ''}">${STAT_KEYS.map(k => `<span><b>${reveal ? fmt(pv(p)[k]) : '?'}</b> ${GM.STATS[k].icon}</span>`).join('')}</div>`
      : `<div class="reel-goals ${reveal ? 'show' : ''}">${reveal ? `<b>${fmt(val(p))}</b> ${S.st.label}` : `<b>?</b> ${S.st.label}`}${reveal && keeperPts(p) && S.stat !== 'apps' ? `<small>🧤 ${fmt(p.cs)} clean sheets</small>` : S.hard ? '' : hintStat(p)}</div>`;
    if (S.hard) {
      return `${GM.avatar(p, 'lg', true)}
      <div class="reel-name">${GM.esc(p.name)}</div>
      <div class="reel-meta">${posBadges(p)}</div>${num}`;
    }
    const mg = S.manager && MANAGERS[S.manager], gl = mg && mg.likes && mg.likes(p), gh = mg && mg.hates && mg.hates(p);
    const gaffer = gl || gh ? `<i class="gaffer ${gl ? 'up' : 'down'}" title="${GM.esc(mg.name)} ${gl ? 'likes him' : 'won’t like this'}">${gl ? '👍' : '👎'}</i>` : '';
    const both = S.club2 && bothSides(p) ? `<div class="mate both">🤝 Both sides ×2</div>` : '';
    return `${gaffer}${both}${!both && x.mate ? `<div class="mate" title="Also played for ${GM.esc(x.mate.club)}, like ${GM.esc(x.mate.name)}">🤝 ${GM.clubShort(x.mate.club)} link · ${GM.esc(x.mate.name.split(' ').slice(-1)[0])}</div>` : ''}
      ${GM.avatar(p, 'lg')}
      <div class="reel-name">${GM.esc(p.name)}</div>
      <div class="reel-meta">${posBadges(p)} ${GM.flag(p.nat)} <span>${GM.era(p)}</span></div>
      <div class="chips">${p.clubs.map(c => GM.clubChip(c)).join('')}</div>${num}`;
  }

  const MOD_TAG = { captain: '<i title="Captain – doubled">©</i>', rotation: '<i title="Rotation Risk – halved">🩹</i>', zero: '<i title="Double or Nothing – lost">🎲</i>',
    injured: '<i title="Injured – halved">🚑</i>', halved: '<i title="Halved">⬇</i>', boosted: '<i title="Boosted">⬆</i>', healed: '<i title="Back to full numbers">💚</i>' };
  // the pigeon's revenge hides a number until full time
  const splatted = i => S.phase !== 'done' && (S.splat || []).includes(i);
  // CHAOS leftovers on the pitch (a new one drops in)
  const messHtml = () => (S.mess || []).length ? `<div class="mess" aria-hidden="true">${S.mess.map(m => m.c
    ? `<svg class="crack ${Date.now() - m.t < 2500 ? 'new' : ''}" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${m.c}" pathLength="100"/></svg>`
    : `<i class="${Date.now() - m.t < 2500 ? 'new' : ''} ${m.i[0] === '#' ? 'drawn' : ''}" style="left:${m.x}%;top:${m.y}%;--r:${m.r}deg">${m.i[0] === '#' && LEFT[m.i.slice(1)] ? LEFT[m.i.slice(1)]() : m.i}</i>`).join('')}</div>` : '';
  function slotHtml(s, i) {
    const gh = S.ghost && S.ghost.i === i ? S.ghost : null;
    if (gh) s = { ...s, p: gh.p, g: gh.g, mod: gh.mod };
    if (s.p == null) {
      const tgt = S.pending != null && S.reels[S.pending] && targetSlots(byId(S.reels[S.pending].id)).includes(i);
      return `<div class="slot empty ${s.pos !== baseForm()[i] ? 'moved' : ''} ${tgt ? 'target' : ''}" data-slot="${i}" title="${GM.POS_NAME[s.pos]}"><span class="pos pos-${GM.GROUP[s.pos]}">${s.pos}</span></div>`;
    }
    const p = byId(s.p);
    const surname = (p.name.includes(' ') ? p.name.split(' ').slice(1).join(' ') : p.name) + (s.trio && s.trio.length > 1 ? ` +${s.trio.length - 1}` : '');
    const pk = S.parked && S.parked[i] && SPRITE[S.parked[i]] ? `<i class="parked ${(SIDE[baseForm()[i]] ?? 1) === 2 ? 'r' : ''}" aria-hidden="true">${SPRITE[S.parked[i]]}</i>` : '';
    return `<div class="slot filled ${s.fresh ? 'fresh' : ''}" data-slot="${i}" title="${GM.esc(p.name)}">${pk}
      ${GM.avatar(p)}<span class="slot-name">${GM.esc(surname)}</span>
      <span class="slot-goals ${splatted(i) ? 'splatted' : ''}"><span class="sg">${S.rules.treble && s.v ? `${s.v.goals}·${s.v.assists}·${s.v.apps}` : fmt(s.g)}</span>${MOD_TAG[s.mod] || ''}</span><span class="slot-pos" title="${GM.POS_NAME[s.pos]}">${s.pos}</span></div>`;
  }

  function pitchHtml() {
    const lat = i => SIDE[baseForm()[i]] ?? 1;
    const rows = ['F', 'M', 'D', 'G'].map(g => S.xi.map((s, i) => [s, i]).filter(([s]) => GM.GROUP[s.pos] === g)
      .sort((a, b) => lat(a[1]) - lat(b[1]) || a[1] - b[1])).filter(r => r.length);
    const shape = rows.slice(0, -1).reverse().map(r => r.length).join('-');
    return `<div class="pitch ${S.subbing !== false ? 'subbing' : ''} ${S.pending != null ? 'placing' : ''}">
      <div class="pitch-lines"></div><div class="shape">${shape}</div>${S.rules.chaos ? messHtml() : ''}
      ${rows.map(r => `<div class="pitch-row ${r.length > 4 ? 'crowded' : ''}">${r.map(([s, i]) => slotHtml(s, i)).join('')}</div>`).join('')}
    </div>`;
  }

  function counterHtml() {
    const t = total();
    const left = emptySlots();
    const mod = S.modifier ? ` · <b>${WILDCARDS[S.modifier].icon} ${WILDCARDS[S.modifier].name}</b>` : '';
    if (S.rules.max) {
      const pb = GM.best(S.mode === 'daily' ? 'daily' : modeKey());
      return `<div class="counter max">
      <div class="counter-num"><b>${fmt(t)}</b><span>${S.st.label}</span>${S.rules.chaos ? `<span class="chaos-pts"><b>${signed(scoreFor(S).bonus)}</b> bonus</span>` : ''}</div>
      <div class="bar"><i style="width:${pb ? Math.min(100, t / pb * 100) : 0}%"></i></div>
      <div class="counter-sub">${pb ? (t > pb && !S.rules.chaos ? '🔥 Beating your best (' + fmt(pb) + ')' : `Your best: ${fmt(pb)}${S.rules.chaos ? ' pts' : ''}`) : 'Set your first score'} · ${left} slot${left === 1 ? '' : 's'} left${mod}${S.hot ? ` · <b>🔥 ×1.5 ×${S.hot}</b>` : ''}${S.golden ? ' · <b>⚽ ×3 next</b>' : ''}${S.unleash ? ` · <b>💥 ×2 ×${S.unleash}</b>` : ''}</div>
      ${S.rules.chaos ? `<div class="chaos-row">${S.manager ? `<button class="dugout" id="dugout">${MANAGERS[S.manager].icon} <b>${mgrShort(MANAGERS[S.manager])}</b></button>` : ''}<div class="chaos-meter ${S.chaosDue ? 'due' : ''}" title="The CHAOS meter: taking or playing wildcards fills it. Full = a CHAOS moment next spin"><span>${S.chaosDue ? 'NEXT SPIN!' : 'CHAOS'}</span>${Array.from({ length: METER }, (_, i) => `<i class="${S.chaosDue || i < Math.floor(S.meter || 0) ? 'on' : ''}"></i>`).join('')}</div></div>` : ''}
    </div>`;
    }
    if (S.rules.treble) {
      return `<div class="counter treble">${STAT_KEYS.map(k => {
        const got = tot(k), tg = TREBLE[k];
        return `<div class="trow"><span><b>${GM.STATS[k].icon} ${fmt(got)}</b>/ ${fmt(tg)} ${GM.STATS[k].label}</span>
          <div class="bar"><i style="width:${Math.min(100, got / tg * 100)}%" class="${got > tg ? 'over' : ''}"></i></div></div>`;
      }).join('')}<div class="counter-sub">${left} slot${left === 1 ? '' : 's'} left${mod}</div></div>`;
    }
    if (S.rules.mystery) {
      const th = thermo(t / S.target);
      return `<div class="counter mystery">
        <div class="counter-num"><b>${fmt(t)}</b><span>${S.st.label} · target ❓</span></div>
        <div class="thermo"><i style="width:${Math.min(100, t / S.target * 80)}%;background:${th.color}"></i></div>
        <div class="counter-sub"><b>${th.icon} ${th.label}</b> · ${left} slot${left === 1 ? '' : 's'} left${mod}</div>
      </div>`;
    }
    const over = t > S.target;
    return `<div class="counter ${over ? 'over' : ''}">
      <div class="counter-num"><b>${fmt(t)}</b><span>/ ${fmt(S.target)} ${S.st.label}</span></div>
      <div class="bar"><i style="width:${Math.min(100, t / S.target * 100)}%"></i></div>
      <div class="counter-sub">${over ? `${fmt(t - S.target)} over` : `${fmt(S.target - t)} to go`} · ${left} slot${left === 1 ? '' : 's'} left${mod}</div>
    </div>`;
  }

  // Mystery Target temperature, from the fraction of the hidden target you've reached
  function thermo(f) {
    if (f > 1.08) return { icon: '💥', label: 'Overcooked!', color: 'var(--bad)' };
    if (f >= 0.97) return { icon: '🎯', label: 'Scorching!', color: '#ff7a00' };
    if (f >= 0.85) return { icon: '🔥', label: 'Hot', color: '#ffa53b' };
    if (f >= 0.65) return { icon: '♨️', label: 'Warm', color: '#ffd23f' };
    if (f >= 0.4) return { icon: '🌤️', label: 'Getting warmer', color: '#9fd8ff' };
    return { icon: '🥶', label: 'Ice cold', color: '#6cc3ff' };
  }

  function mysteryIntro() {
    // a little slot-machine reveal of which stat counts – the number stays secret
    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🎲 Mystery Target</h2><span></span></div>
      <div class="mystery-intro"><p>Tonight we’re counting…</p><div class="mystery-roll" id="mroll">⚽ Goals</div>
      <p class="muted" id="mnote">The target number is secret until full time. A thermometer tells you how warm you are.</p>
      <button class="btn big" id="mgo" hidden>Kick off</button></div>`;
    const el = GM.$('#mroll', root), labels = STAT_KEYS.map(k => `${GM.STATS[k].icon} ${GM.STATS[k].name}`);
    let i = 0;
    const iv = setInterval(() => { el.textContent = labels[i++ % 3]; GM.sound.play('tick'); }, 90);
    setTimeout(() => {
      clearInterval(iv);
      GM.sound.play('land');
      el.textContent = `${S.st.icon} ${S.st.name}`;
      el.classList.add('landed');
      const range = MYSTERY[S.stat];
      GM.$('#mnote', root).innerHTML = `Somewhere between <b>${fmt(range[0])}</b> and <b>${fmt(range[1])}</b> ${S.st.label}. The exact number is secret until full time – watch the thermometer.`;
      const go = GM.$('#mgo', root); go.hidden = false;
      go.onclick = () => { S.revealStage = null; render(); };
    }, 1400);
  }

  // Size the pitch to the screen: after each update, give its four rows whatever height is left over (46-86px a row),
  // so it fills tall phones without making short ones scroll
  // sized once per screen (and game layout); the dock under the pitch is a fixed height, so it never needs to change mid-game
  let fitKey = '';
  function fitPitch() {
    const pitch = GM.$('.pitch', root);
    if (!pitch || !root.isConnected || S.phase === 'done') return;
    const rows = GM.$$('.pitch-row', pitch).length || 4;
    const key = [innerWidth, innerHeight, S.mode, S.hard, S.rules.wild !== false, !!S.vs, !!S.online, rows].join('|');
    if (key === fitKey) return;
    fitKey = key;
    const cur = parseFloat(getComputedStyle(root).getPropertyValue('--slot-h')) || 52;
    // the game's own content (the page itself always stretches to the screen, so measure #app, padding included)
    const spare = window.innerHeight - (root.getBoundingClientRect().bottom + window.scrollY);
    const next = Math.max(46, Math.min(86, Math.floor(cur + spare / rows)));
    if (Math.abs(next - cur) >= 1) root.style.setProperty('--slot-h', next + 'px');
    root.classList.toggle('slots-compact', next < 62);
  }
  window.addEventListener('resize', () => { if (S && root) { fitPitch(); fitReels(); } });
  if (document.fonts) document.fonts.ready.then(() => { fitKey = ''; if (S && root) { fitPitch(); fitReels(); } });
  // Each card measures itself: if its contents don't fit (bigger fonts on some phones, a two-line name), the less
  // important bits give way one step at a time (fit1: club badges, fit2: a smaller photo and no link line,
  // fit3: no photo), so the stat box and a wildcard's full text always show
  function fitReels() {
    GM.$$('.stage .reel', root).forEach(r => {
      const over = () => { const d = GM.$('.wild-desc', r); return r.scrollHeight > r.clientHeight + 1 || (d && d.scrollHeight > d.clientHeight + 1); };
      r.classList.remove('fit1', 'fit2', 'fit3');
      for (const c of ['fit1', 'fit2', 'fit3']) { if (!over()) break; r.classList.add(c); }
    });
  }

  // one line for what's happening (a CHAOS event, a storm, an active wildcard) and one for what to do next
  function msgHtml(sp) {
    const top = S.storm ? '<span class="m-ev">🌪️ <b>Wildcard storm!</b> Grab a card</span>'
      : sp && S.phase !== 'spin' ? `<span class="m-sp">${sp.icon} ${sp.name}</span>` : '';
    const first = S.spin === 0;  // tips only on the first go: after that you know what to do
    const pend = S.pending != null && S.reels[S.pending] && !S.reels[S.pending].wild && byId(S.reels[S.pending].id);
    const next = S.subbing !== false ? '🔁 Tap a player on the pitch to release him <button class="btn small ghost" id="cancel-sub">Cancel</button>'
      : !first ? ''
      : S.phase === 'spin' ? 'Spin for three new players'
      : S.phase !== 'pick' ? ''
      : pend ? `📍 Tap a glowing slot for <b>${GM.esc(pend.name)}</b>`
      : `Tap a player, then the slot he’ll play in${S.reels.some(r => r.wild) ? ' – or grab the wildcard' : ''}`;
    return `<div class="m-top">${top}</div><div class="m-next">${next}</div>`;
  }

  // only draw while you're still on this game: a delayed animation or sound cue must never paint a draft over the page you went to
  const onThisGame = () => { const h = location.hash; return S.online ? h.includes(S.online.code) : /^#\/(draft|daily)\b/.test(h); };
  function render() {
    if (!S || !onThisGame()) return;
    if (S.phase === 'done') return renderDone();
    requestAnimationFrame(() => { fitPitch(); fitReels(); });
    if (!S.readonly && saveKey()) GM.store.set(saveKey(), { ...S, rules: undefined });  // saved on every move
    if (S.revealStage === 'intro') return mysteryIntro();
    const icon = S.nat ? GM.flag(S.nat) : S.mode === 'club' ? '🏟️' : GM.MODES[S.mode === 'daily' ? 'daily' : S.mode].icon;
    const nReels = Math.max(3, S.reels.length);
    const sp = S.special && WILDCARDS[S.special];
    root.innerHTML = `
      <div class="topbar"><a href="#/" class="back">‹</a><h2><span class="t-name">${icon} ${modeName().replace(/^Ultimate Wildcard CHAOS/, 'CHAOS').replace(/^Matchday XI · /, '')}</span>${S.hard ? '<small class="hard-pill">Hard</small>' : ''}</h2><span class="top-btns">${S.online ? '' : GM.lbButton(modeKey())}<button class="icon-btn" id="help">?</button></span></div>
      ${S.vs ? `<div class="banner">⚔️ Beat <b>${GM.esc(S.vs)}</b>’s score of <b>${GM.esc(S.vss)}</b></div>` : ''}
      ${S.online ? `<div class="opp-bar" id="oppbar">${(GM.online && GM.online.oppBar && GM.online.oppBar(S.online.code)) || `🌐 Racing <b>${GM.esc(S.online.opp)}</b>…`}</div>` : ''}
      ${counterHtml()}
      ${pitchHtml()}
      <div class="dock">
      ${S.rules.wild === false ? '' : `<div class="inv ${S.inv.length ? 'has' : ''}"><span class="inv-label">${S.inv.length ? `🃏 ${S.inv.length}/3` : 'Wildcards 0/3'}</span>${S.inv.length ? S.inv.map((w, k) =>
      `<button class="wild-btn ${S.subbing === k ? 'active' : ''}" data-w="${k}" title="${GM.esc(WILDCARDS[w].desc(wst()))}">${WILDCARDS[w].icon}<small>${WILDCARDS[w].name}</small></button>`).join('')
        : '<span class="muted">none yet · spin to find them</span>'}</div>`}
      <div class="stage ${S.hard ? 'hard' : ''}">${S.phase === 'spin' ? `<div class="spin-zone"><button class="btn big spin" id="spin" ${busy ? 'disabled' : ''}>🎰 SPIN</button></div>` : `<div class="reels ${nReels > 3 ? 'n5' : ''}">${Array.from({ length: nReels }, (_, i) => {
          const x = S.reels[i];
          if (S.phase === 'spinning') return `<div class="reel spinning"><div class="reel-spin">…</div></div>`;
          if (!x) return `<div class="reel idle"><div class="reel-q">?</div></div>`;
          return `<button class="reel ${x.wild ? 'is-wild' : ''} ${S.selected === i || S.pending === i ? 'selected' : ''} ${S.phase === 'reveal' && S.selected !== i ? 'dim' : ''} ${S.hard ? 'hard' : ''}" data-reel="${i}">${reelInner(x)}</button>`;
        }).join('')}</div>`}</div>
      <div class="msg">${msgHtml(sp)}</div>
      </div>`;
    GM.$('#help', root).onclick = help;
    const spb = GM.$('#spin', root); if (spb) spb.onclick = () => doSpin();
    GM.$$('[data-reel]', root).forEach(b => b.onclick = () => sign(+b.dataset.reel));
    GM.$$('[data-w]', root).forEach(b => b.onclick = () => useWild(+b.dataset.w));
    GM.$$('[data-slot]', root).forEach(b => b.onclick = () => {
      if (S.subbing !== false) release(+b.dataset.slot);
      else if (S.pending != null) place(+b.dataset.slot);
      else { const sl = S.xi[+b.dataset.slot]; if (sl && sl.p != null) GM.playerSheet(byId(sl.p)); }  // a player already on the pitch: his sheet
    });
    const cs = GM.$('#cancel-sub', root); if (cs) cs.onclick = () => { S.subbing = false; render(); };
    const dg = GM.$('#dugout', root); if (dg) dg.onclick = () => { const m = MANAGERS[S.manager]; GM.modal(`<div class="center"><div class="mgr-big">${m.icon}</div><h3>${m.name}</h3></div><p>✅ ${m.perk}</p><p>⚠️ ${m.catch}</p><p class="muted small">👍 and 👎 on the reels show who he’d like or not. It all adds up in your bonus.</p><div class="actions"><button class="btn" data-close>Got it</button></div>`); };
  }

  function help() {
    const r = S.rules, L = S.st.label;
    GM.modal(`<h3>How to play</h3>
      ${r.treble ? `<p>🏆 <b>The Treble:</b> one XI, three targets – <b>${fmt(TREBLE.goals)} goals</b>, <b>${fmt(TREBLE.assists)} assists</b> and <b>${fmt(TREBLE.apps)} appearances</b>. Strikers bring goals, creators bring assists, old warhorses bring apps: balance them.</p>`
      : r.mystery ? `<p>🎲 <b>Mystery Target:</b> you’re counting <b>${S.st.label}</b>, but the target is secret – somewhere between ${fmt(MYSTERY[S.stat][0])} and ${fmt(MYSTERY[S.stat][1])}. The thermometer tells you how close you are. It’s revealed at full time.</p>`
      : r.chaos ? `<p>🌪️ <b>Ultimate Wildcard CHAOS:</b> build the XI with the most PL ${L}, and then some. Your score is your ${L} <b>plus bonus points</b> for the kind of team you build: teammates who played together (chemistry), your squad rating, PL title medals, Hall of Famers, one-club men, journeymen (5+ clubs) and ten-season veterans.</p>
        <p>👔 <b>Your manager</b> brings a perk and a catch (👍 and 👎 on the reels show who he’d like). He can get the sack.</p>
        ${S.stat !== 'apps' ? `<p>🧤 <b>Keepers count too:</b> ${S.stat === 'goals' ? 'a goal for every three' : 'an assist for about every four'} Premier League clean sheets.</p>` : ''}
        <p>⚡ <b>The CHAOS meter</b> fills every time you take or play a wildcard. When it’s full, the next spin opens with a big moment: a 🌪️ tornado through your XI, a ⚡ lightning strike, a 🚌 bus parade, ⏰ deadline day, 💥 CHAOS unleashed or a sacking.</p>
        <p>🐦 CHAOS leaves its mark: what happens stays on the pitch. If the pigeon gets its revenge, two of your numbers stay covered until full time, so keep track!</p>
        <p>Now and then a <b>match-day event</b> strikes too (🟥 red cards, 🚑 injuries, 📺 VAR, 🧾 the taxman, 💰 TV money), one spin in ten is a <b>🌪️ wildcard storm</b>, and there are riskier wildcards like 🎰 All In (a coin toss: your whole XI ×2 or ×½).</p>`
      : r.max ? `<p>👑 <b>${modeName()}:</b> no target – build the XI with the <b>most Premier League ${L}</b> you can. Every player with 50+ apps is equally likely to turn up, so you’ll mostly see journeymen: spot the big numbers and use your wildcards well.</p>`
      : `<p>🎯 <b>${modeName()}:</b> build an XI whose players have <b>${fmt(S.target)}</b> Premier League ${L} between them – as close as you can, exactly for a bullseye.</p>`}
      <p>Each spin shows three players who fit an open position. Their ${L} are hidden until you sign one. You keep spinning until the XI is full.</p>
      <p>Every player has real positions – <b>GK, LB, CB, RB, LM, CM, RM, ST</b>. Tap a player, then tap one of the highlighted slots he can play.</p>
      <p><b>Wildcards</b> appear on the reels from the 2nd spin – grab one instead of a player and use it when you like (hold up to 3):</p>
      <ul class="wc-list">${Object.entries(WILDCARDS).filter(([k, w]) => !r.noWild.includes(k) && (!w.chaos || r.chaos)).map(([, w]) => `<li>${w.icon} <b>${w.name}</b> – ${w.desc(wst())}</li>`).join('')}</ul>
      <p><b>Scoring:</b> ${r.treble ? 'up to 333 points per stat (full marks when exact, nothing once you’re 25% out). All three within 3% wins the Treble: +500. Two = the Double: +150.'
        : r.mystery ? '1000 minus 5 points per 1% you miss by (roughly). Hit it exactly for a +500 bullseye.'
        : r.chaos ? `your XI’s PL ${L} plus every bonus, shown at full time.` : r.max ? `your score is your XI’s total PL ${L} (after any wildcard modifiers).` : `1000 minus 5 for every ${S.stat === 'goals' ? 'goal' : `${fmt(Math.round(S.target / 442 * 10) / 10)} ${L}`} off target. Exactly ${fmt(S.target)} = +500 bullseye bonus.`}</p>
      <p>🤝 A player who shares a club with your last signing may turn up to tempt you.</p>
      ${S.hard ? `<p>🥵 <b>Hard mode:</b> just names and positions – no clubs, years, apps or nationality${r.max ? '' : ', and far fewer star players on the reels (same targets)'}. Separate leaderboard.</p>` : ''}
      <div class="row"><button class="btn" data-close>Got it</button></div>`);
  }

  function renderDone() {
    const sc = S.final || scoreFor(S);
    const best = GM.best(S.mode === 'daily' ? 'daily' : modeKey());
    const icon = S.nat ? GM.flag(S.nat) : S.mode === 'club' ? '🏟️' : GM.MODES[S.mode === 'daily' ? 'daily' : S.mode].icon;
    const xi = S.xi.filter(s => s.p != null).map(s => ({ ...s, player: byId(s.p) }));
    root.innerHTML = `
      <div class="topbar"><a href="#/" class="back">‹</a><h2>${icon} Full time</h2><span></span></div>
      <div class="result">
        ${S.rules.mystery ? `<div class="mystery-reveal">🎲 The mystery target was <b>${fmt(S.target)}</b> ${S.st.label}</div>` : ''}
        ${S.rules.treble ? `<div class="result-total ${sc.diff === 0 ? 'bull' : ''}">${sc.hits.length === 3 ? '🏆' : sc.hits.length === 2 ? '🥈' : ''}${fmt(sc.t)}<small>goals · ${fmt(tot('assists'))} assists · ${fmt(tot('apps'))} apps</small></div>`
        : S.rules.chaos ? `<div class="result-total">${fmt(sc.total)}<small>CHAOS points · ${fmt(sc.t)} ${S.st.label} + ${fmt(sc.bonus)} bonus</small></div>`
        : `<div class="result-total ${sc.diff === 0 ? 'bull' : ''}">${fmt(sc.t)}<small>PL ${S.st.label}${S.rules.max ? '' : ` · target ${fmt(S.target)} · <b>${Math.round(sc.t / S.target * 1000) / 10}%</b>`}</small></div>`}
        ${S.rules.chaos ? `<div class="chaos-level">${chaosLevel()}</div>${S.manager ? `<div class="muted small">👔 Manager: ${MANAGERS[S.manager].icon} ${MANAGERS[S.manager].name}</div>` : ''}
          ${(S.moments || []).length ? `<details class="chaos-story"><summary>📜 What happened</summary><ol>${S.moments.map(m => `<li>${m.icon} <b>${GM.esc(m.name)}</b> ${GM.esc(m.text)}</li>`).join('')}</ol></details>` : ''}` : ''}
        ${S.rules.max && !S.rules.chaos ? '' : `${S.rules.chaos ? '' : `<div class="result-score">${fmt(sc.total)}<small>points</small></div>`}
        <table class="breakdown">${sc.parts.map(([k, v]) => `<tr><td>${k}</td><td class="${v < 0 ? 'neg' : ''}">${v < 0 ? '−' + fmt(-v) : '+' + fmt(v)}</td></tr>`).join('')}</table>`}
        ${S.vs ? `<div class="banner">${sc.total > S.vss ? '🎉 You beat' : sc.total == S.vss ? '🤝 You drew with' : '😬 You lost to'} <b>${GM.esc(S.vs)}</b> (${GM.esc(S.vss)})</div>` : ''}
        <div class="muted">Personal best: ${fmt(Math.max(best, sc.total))}</div>
      </div>
      ${S.rules.max ? (S.rules.chaos ? GM.distHtml(distKey(), S.stat, sc.total, 'CHAOS points') : GM.distHtml(distKey(), S.stat, sc.t)) : ''}
      ${S.collected ? `<a class="collected" href="#/album${S.collected.book === 'purist' ? '?b=purist' : ''}">📒 ${S.collected.n ? `<b>+${S.collected.n}</b> new player${S.collected.n === 1 ? '' : 's'} for your album` : 'No new players this time'} · ${S.collected.total.toLocaleString()} collected${S.collected.badges.length ? `<br>🏅 ${S.collected.badges.join(' · ')}` : ''} ›</a>` : ''}
      ${GM.report ? GM.report(xi, S.st, S.rules.treble) : ''}
      ${pitchHtml()}
      <div class="actions col">
        ${S.online ? `<div id="race-result"></div><a class="btn big" href="#/online?room=${S.online.code}&v=1">🆚 Compare teams${S.mode === 'chaos' || S.mode === 'target' ? '' : ' & match points'}</a>` : S.fx ? `<a class="btn big" href="#/matchday">🏟️ Back to matchday</a>` : S.mode !== 'daily' && !S.dailyChaos ? `<button class="btn big" id="again">🔁 Play again</button>` : `<div class="muted">New Daily ${S.dailyChaos ? 'CHAOS' : 'Ultimate'} tomorrow</div>`}
        ${S.fx ? '' : '<button class="btn" id="challenge">⚔️ Challenge a friend (same spins)</button>'}
        <button class="btn ghost" id="share">📤 Share result</button>
        <button class="btn ghost" id="sharepic">🖼️ Share a picture of your XI</button>
        <a class="btn ghost" href="#/leaderboard?m=${encodeURIComponent(modeKey())}">🏆 Leaderboard</a>
      </div>`;
    const again = GM.$('#again', root); if (again) again.onclick = () => start(root, S.mode, { hard: S.hard, extreme: S.extreme, stat: S.rules.mystery ? undefined : S.stat, club: S.club, nat: S.nat });
    GM.$('#share', root).onclick = () => GM.share(resultText(sc));
    GM.$('#sharepic', root).onclick = () => {
      const png = GM.teamPicture(S.xi.map(s => ({ pos: s.pos, p: s.p != null ? PL()[s.p] : null, v: s.p != null ? s.g : null })), {
        title: `${modeName()}${S.hard ? ' · Hard' : ''}`, sub: S.rules.max ? `My XI's Premier League ${S.st.label}` : `${sc.total} points · ${fmt(sc.t)} / ${fmt(S.target || 0)} ${S.st.label}`,
        total: sc.t, totalLabel: S.st.label });
      GM.shareImage(png, resultText(sc));
    };
    if (GM.$('#challenge', root)) GM.$('#challenge', root).onclick = async () => {
      const name = await GM.askName() || 'A friend';
      const m = S.mode === 'daily' ? 'ultimate' : S.mode;
      const url = `${GM.baseUrl()}#/draft?m=${m}&s=${S.stat}${S.club ? '&c=' + encodeURIComponent(S.club) : ''}${S.nat ? '&n=' + encodeURIComponent(S.nat) : ''}${S.extreme ? '&x=1' : ''}&seed=${encodeURIComponent(S.seed)}${S.hard ? '&h=1' : ''}&vs=${encodeURIComponent(name)}&vss=${sc.total}`;
      GM.share(S.rules.max
        ? `⚽ Goal Machine – my ${modeName()}${S.hard ? ' (Hard)' : ''} XI has ${fmt(sc.t)} PL ${S.st.label}. Same spins, can you beat it?`
        : S.rules.treble || S.rules.mystery ? `⚽ Goal Machine – I scored ${sc.total} in ${modeName()}${S.hard ? ' (Hard)' : ''}. Same spins, can you beat me?`
        : `⚽ Goal Machine – I scored ${sc.total} in ${modeName()}${S.hard ? ' (Hard)' : ''} (${fmt(sc.t)}/${fmt(S.target)}). Same spins, can you beat me?`, url);
    };
  }

  function resultText(sc) {
    const icons = S.log.map(l => ({ G: '🧤', D: '🛡️', M: '⚙️', F: '⚽' }[GM.GROUP[l]] || l)).join('');
    const head = S.mode === 'daily' ? `Daily Ultimate · ${GM.today()}` : modeName() + (S.hard ? ' (Hard)' : '');
    const rating = GM.teamRating ? GM.teamRating(S.xi.filter(s => s.p != null).map(s => ({ ...s, player: byId(s.p) }))) : null;
    const tier = rating ? `\n${rating.tier.icon} ${rating.tier.name}` : '';
    if (S.rules.chaos) return `⚽ Goal Machine – ${head}\n🌪️ ${fmt(sc.total)} CHAOS points (${fmt(sc.t)} ${S.st.label} + ${fmt(sc.bonus)} bonus)${tier}\n${icons}`;
    if (S.rules.max) return `⚽ Goal Machine – ${head}\n👑 ${fmt(sc.t)} PL ${S.st.label}${tier}\n${icons}`;
    if (S.rules.treble) return `⚽ Goal Machine – ${head}\n${STAT_KEYS.map(k => `${GM.STATS[k].icon} ${fmt(tot(k))}/${fmt(TREBLE[k])}`).join(' ')}${sc.hits.length === 3 ? ' 🏆 TREBLE!' : ''}\n${sc.total} pts${tier}\n${icons}`;
    if (S.rules.mystery) return `⚽ Goal Machine – ${head}\n🎲 ${fmt(sc.t)} ${S.st.label} vs a secret ${fmt(S.target)}${sc.diff === 0 ? ' 🎯 BULLSEYE' : ''} · ${sc.total} pts${tier}\n${icons}`;
    return `⚽ Goal Machine – ${head}\n${fmt(sc.t)}/${fmt(S.target)} ${S.st.label}${sc.diff === 0 ? ' 🎯 BULLSEYE' : ''} · ${sc.total} pts${tier}\n${icons}`;
  }
})();

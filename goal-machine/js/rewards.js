/* Goal Machine – 🏆 seasons, weekly missions and login rewards.
   A season is a calendar month: every XP you earn also counts on the season track (30 tiers, 250 XP each), and each tier
   gives something: a Locker item (locker.js, src.season = the tier) or a pack. Your level is for life; the track
   starts again each month (items you already have become packs).
   Weekly missions: three a week (Monday to Sunday, UTC), the same three for everyone; each is worth 300 season XP and
   counts towards the Locker's mission rewards, and all three earn a Mission Pack.
   Login rewards: the first time you open the game each day, the next day on a seven-day card (day 7: a Locker item).
   The games report what you do through GM.track(type) (draft, chaos, daily, pack, game, owner, hattrick, online, onwin,
   badge, pb, challenge, chwin). Stored on this device: 'season', 'missions', 'login'. */
'use strict';

(function () {
  const TIER = 250, TIERS = 30, MISSION_XP = 300;
  const NAMES = ['Transfer Window', 'Cup Run', 'Title Race', 'Squeaky Bum Time', 'Final Day', 'Summer Tournament', 'Pre-season Tour', 'Opening Day',
    'Deadline Day', 'Autumn Leaves', 'Bonfire Night', 'Festive Fixtures'];
  // The season calendar: each month's name, its look (html.sz-<theme>: colours, the strip along the top, decorations on
  // Home), its music for the menus (audio.js TRACKS) and its exclusive Locker items (locker.js, src.s = the month).
  // A month that isn't here gets a plain season with the old name.
  const SEASONS = {
    '2026-10': { name: 'Halloween', icon: '🎃', theme: 'halloween', music: 'spooky', sub: 'Fright night at the ground: a haunted pitch, ghosts in the stands and the creepiest organ in the league' },
    '2026-11': { name: 'Champions Nights', icon: '⭐', theme: 'champions', music: 'champions', sub: 'Big European nights under the lights: starry pitches and a grand anthem of our own' },
    '2026-12': { name: 'Christmas', icon: '🎄', theme: 'christmas', music: 'festive', sub: 'Festive fixtures: snow on the pitch, sleigh bells and a Boxing Day hero' },
    '2027-01': { name: 'Transfer Window', icon: '💸', theme: 'window', music: 'boardroom', sub: 'The January window: contracts, cash and a deadline-day dash' },
    '2027-02': { name: 'Cup Run', icon: '🏆', theme: 'cup', sub: 'Giant-killings, replays and ribbons on the trophy' },
    '2027-03': { name: 'Title Race', icon: '🏁', theme: 'title', sub: 'Squeaky bum time: it all goes down to the wire' },
    '2027-04': { name: 'Easter', icon: '🐣', theme: 'easter', music: 'easter', sub: 'Spring has sprung: pastel kits, flowers on the touchline and an egg hunt' },
    '2027-05': { name: 'Final Day', icon: '🎉', theme: 'finalday', music: 'champions', sub: 'Trophies, ticker tape and a lap of honour' },
    '2027-06': { name: 'Summer Tournament', icon: '☀️', theme: 'summer', sub: 'Sun, flags and a summer of international football' },
  };
  GM.SEASONS = SEASONS;
  // the look and music follow the season (Settings → Look → Seasonal look can turn them off)
  GM.applySeason = function () {
    const sz = SEASONS[seasonId()], on = GM.store.get('seasonLook', true) !== false, h = document.documentElement;
    [...h.classList].filter(c => c.startsWith('sz-')).forEach(c => h.classList.remove(c));
    if (sz && on) h.classList.add('sz-' + sz.theme);
    GM.seasonMusic = sz && on ? sz.music || null : null;
    // a cobweb in the top corner of the menus at Halloween (a LottieFiles web; the spider visits from it now and then)
    GM.$$('.sz-corner').forEach(e => e.remove());
    if (sz && on && sz.theme === 'halloween' && GM.FX && GM.FX.lottie && !GM.store.get('calm', false)) {
      const c = document.createElement('div'); c.className = 'sz-corner'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
      GM.FX.lottie('cobweb', { into: c, loop: true, speed: 0.6, fit: 'xMaxYMin meet' });
    }
    // the falling layer on the menus: what falls, how many, and how
    GM.$$('.sz-fx').forEach(e => e.remove());
    // drawn shapes (SVG), not emoji: leaves, petals, paper confetti; the snow and stars are plain white glyphs
    const svg = (path, fill, vb = 24) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vb} ${vb}'>${path.replace(/FILL/g, fill)}</svg>`)}")`;
    const LEAF = "<path d='M12 1c1.6 2.6 4.2 3.2 6.6 2.6-.6 2.4.2 4.4 2.4 5.6-2 1.2-2.6 3-2 5.2-2.4-.4-4.4.4-5.6 2.6l-.4 6h-2l-.4-6C9.4 15 7.4 14.2 5 14.6c.6-2.2 0-4-2-5.2C5.2 8.2 6 6.2 5.4 3.8 7.8 4.4 10.4 3.8 12 1z' fill='FILL'/><path d='M12 4v19' stroke='rgba(0,0,0,.25)' stroke-width='.8'/>";
    const OAK = "<path d='M12 2c2 1 2 3 1 4 2-1 4 0 4 2s-2 2-3 2c2 0 4 1 3 3s-3 1-4 1c1 1 1 3-1 4l0 5h-1l0-5c-2-1-2-3-1-4-1 0-3 1-4-1s1-3 3-3c-1 0-3 0-3-2s2-3 4-2c-1-1-1-3 1-4z' fill='FILL'/>";
    const PETAL = "<ellipse cx='12' cy='12' rx='6' ry='10' fill='FILL'/><ellipse cx='10' cy='9' rx='2' ry='4' fill='rgba(255,255,255,.45)'/>";
    const PAPER = "<rect x='4' y='8' width='16' height='8' rx='1.5' fill='FILL'/>";
    const RIBBON = "<path d='M2 10c5-6 9 6 14 0s6-2 6-2v6s-1-4-6 2-9-6-14 0z' fill='FILL'/>";
    const FALL = {
      christmas: { glyph: '❄❅❆', n: 26 },
      halloween: { n: 12, mode: 'flutter', art: [[LEAF, '#ea580c'], [LEAF, '#b91c1c'], [OAK, '#a16207'], [OAK, '#c2410c'], [LEAF, '#d97706']] },
      champions: { glyph: '✦✧', n: 22, mode: 'twinkle' },
      easter: { n: 14, mode: 'flutter', art: [[PETAL, '#f9a8d4'], [PETAL, '#fbcfe8'], [PETAL, '#ffffff'], [PETAL, '#c4b5fd']] },
      finalday: { n: 22, art: [[PAPER, '#fde047'], [PAPER, '#ef4444'], [PAPER, '#3b82f6'], [PAPER, '#22c55e'], [PAPER, '#f9a8d4']] },
      cup: { n: 8, mode: 'flutter', art: [[RIBBON, '#dc2626'], [RIBBON, '#1d4ed8'], [RIBBON, '#f8fafc']] },
    };
    const f = sz && on && FALL[sz.theme];
    if (!f || !f.n) return;
    const box = document.createElement('div'); box.className = 'sz-fx ' + (f.mode || ''); box.setAttribute('aria-hidden', 'true');
    const r = GM.rng('szfx:' + sz.theme), chars = [...(f.glyph || '')], arts = (f.art || []).map(([pth, c]) => svg(pth, c));
    for (let k = 0; k < f.n; k++) {
      const i = document.createElement('i'), size = f.mode === 'twinkle' ? 8 + r.int(10) : 12 + r.int(12);
      i.style.cssText = `left:${r.int(100)}%;animation-duration:${(f.mode === 'twinkle' ? 1.5 + r() * 2.5 : 9 + r() * 12).toFixed(1)}s;animation-delay:-${(r() * 20).toFixed(1)}s;--dx:${r.int(80) - 40}px;--rot:${r.int(360)}deg;--y:${r.int(95)}%`;
      if (arts.length) { i.className = 'art'; i.style.width = i.style.height = size + 'px'; i.style.backgroundImage = arts[r.int(arts.length)]; }
      else { i.textContent = chars[r.int(chars.length)]; i.style.fontSize = size + 'px'; i.style.color = '#fff'; i.style.textShadow = '0 0 4px rgba(255,255,255,.6)'; }
      box.appendChild(i);
    }
    document.body.appendChild(box);
  };
  const seasonId = (d = new Date()) => d.toISOString().slice(0, 7);  // YYYY-MM (UTC)
  const seasonNo = id => { const [y, m] = id.split('-').map(Number); return (y - 2026) * 12 + m - 9; };  // October 2026 = Season 1
  const seasonEnds = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };
  GM.gmSeason = (id = seasonId()) => { const sz = SEASONS[id] || {}; return { id, n: seasonNo(id), name: sz.name || NAMES[+id.slice(5, 7) - 1], icon: sz.icon || '🏆', sub: sz.sub || '', theme: sz.theme || '', ends: seasonEnds() }; };

  // this season's progress (a new month starts a new one)
  const loadS = () => { let s = GM.store.get('season', null); if (!s || s.id !== seasonId()) { s = { id: seasonId(), xp: 0, got: [] }; GM.store.set('season', s); } return s; };
  const tierOf = xp => Math.min(TIERS, Math.floor(xp / TIER));
  // the reward for a tier: the Locker item for it (if you haven't got it), else a pack
  // (this season's items: src.season = the tier, src.s = the season, October 2026 if not set; older ones are in the vault)
  const tierReward = t => {
    const it = Object.values(GM.LOCKER || {}).find(x => x.src.season === t && (x.src.s || '2026-10') === seasonId());
    if (it && !GM.lockerHas(it.id)) return { item: it.id };
    return t % 10 === 0 ? { pack: 'legendary' } : t % 5 === 0 ? { choice: [{ pack: 'season' }, { freeze: 1 }, { vault: 1 }] } : t % 3 === 0 ? { spin: 1 }
      : [{ pack: 'standard' }, { boost: 1 }, { pack: 'season' }, { scout: 1 }][t % 4];
  };
  // 🔁 after the last tier the track keeps paying: a bonus every 1,000 XP, round and round (renewables and packs)
  const BONUS_XP = 1000, BONUS = [{ freeze: 1 }, { pack: 'season' }, { boost: 1 }, { spin: 1 }, { scout: 1 }, { pack: 'standard' }];
  const bonusOf = xp => Math.max(0, Math.floor((xp - TIERS * TIER) / BONUS_XP));
  GM.seasonBonus = () => { const s = loadS(); return { n: bonusOf(s.xp), into: s.xp >= TIERS * TIER ? (s.xp - TIERS * TIER) % BONUS_XP : 0, of: BONUS_XP, next: BONUS[(bonusOf(s.xp) + 1) % BONUS.length] }; };
  GM.seasonInfo = () => { const s = loadS(), t = tierOf(s.xp); return { ...GM.gmSeason(), xp: s.xp, tier: t, into: t >= TIERS ? TIER : s.xp - t * TIER, got: s.got }; };
  // season XP (called with every XP, and for missions and login rewards); new tiers hand out their rewards
  GM.seasonXP = function (n) {
    if (!n) return;
    const s = loadS(), before = tierOf(s.xp), b0 = bonusOf(s.xp);
    s.xp += n; const after = tierOf(s.xp), b1 = bonusOf(s.xp);
    for (let b = b0 + 1; b <= b1; b++) GM.grant(BONUS[b % BONUS.length], `season bonus ${b}`);
    for (let t = before + 1; t <= after; t++) {
      if (s.got.includes(t)) continue;
      s.got.push(t);
      GM.store.set('season', s);
      GM.grant(tierReward(t), `season tier ${t}`);
    }
    GM.store.set('season', s);
    if (GM.eventXP) GM.eventXP(n);  // an event on: its track fills too
    GM.$$('.season-chip').forEach(el => { el.outerHTML = GM.seasonChip(); });
  };
  GM.seasonChip = () => { const i = GM.seasonInfo(); return `<a class="season-chip" href="#/season" title="Season ${i.n}: ${GM.esc(i.name)}">${i.icon} Tier ${i.tier}<i style="width:${i.tier >= TIERS ? 100 : Math.round(100 * i.into / TIER)}%"></i></a>`; };

  /* ---------------------------------------------------------------- weekly missions */
  // [id, what, how many, the event that counts, an optional test on its data]
  const POOL = [
    ['drafts5', 'Finish 5 drafts (any XI mode)', 5, 'draft'],
    ['chaos3', 'Finish 3 CHAOS drafts', 3, 'chaos'],
    ['daily4', 'Play a daily game on 4 different days', 4, 'daily'],
    ['packs3', 'Open 3 packs', 3, 'pack'],
    ['quick6', 'Play 6 quick games (Higher or Lower, Who Am I?…)', 6, 'game'],
    ['online3', 'Finish 3 online games', 3, 'online'],
    ['onwin1', 'Win an online game', 1, 'onwin'],
    ['badge1', 'Earn a badge', 1, 'badge'],
    ['pb1', 'Beat one of your personal bests', 1, 'pb'],
    ['challenge2', 'Send 2 challenges to friends', 2, 'challenge'],
    ['chwin1', 'Beat a friend’s challenge', 1, 'chwin'],
    ['owner1', 'Finish a Dodgy Owner season', 1, 'owner'],
    ['drafts10', 'Finish 10 drafts', 10, 'draft'],
    ['chaos6', 'Finish 6 CHAOS drafts', 6, 'chaos'],
  ];
  const weekId = () => { const d = new Date(), day = (d.getUTCDay() + 6) % 7; const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)); return m.toISOString().slice(0, 10); };
  const weekEnds = () => Date.parse(weekId() + 'T00:00:00Z') + 7 * 864e5;
  // the same three for everyone this week, each counting a different thing
  const pick = wk => {
    const r = GM.rng('missions:' + wk), out = [], seen = new Set();
    // one of the three is always this season's CHAOS, when the season has one
    const sz = GM.gmSeason && GM.gmSeason(), szc = sz && GM.SZ_CHAOS && GM.SZ_CHAOS[sz.theme];
    if (szc) { out.push(['szchaos', `Play 3 games of ${szc.name}`, 3, 'szchaos']); seen.add('szchaos'); }
    for (let k = 0; k < 40 && out.length < 3; k++) { const m = POOL[r.int(POOL.length)]; if (!seen.has(m[3])) { seen.add(m[3]); out.push(m); } }
    return out;
  };
  // a game of this season's CHAOS: season XP on top, a count towards the season's CHAOS title (locker.js), the mission
  const SZ_XP = 60;
  GM.szChaosDone = function (theme) {
    const z = GM.gmSeason(); if (!z || z.theme !== theme) return;  // (a challenge from last month doesn't count for this one)
    const c = GM.store.get('szChaos', {}) || {}; c[z.id] = (c[z.id] || 0) + 1; GM.store.set('szChaos', c);
    GM.track('szchaos'); GM.seasonXP(SZ_XP);
    setTimeout(() => GM.toast(`${z.icon} <b>+${SZ_XP} season XP</b> for playing ${GM.esc(z.name)} CHAOS`, 2800), 2200);
    if (GM.lockerCheck) setTimeout(() => GM.lockerCheck(), 2600);
  };
  GM.szChaosCount = () => { const z = GM.gmSeason(); return (GM.store.get('szChaos', {}) || {})[z.id] || 0; };
  const loadM = () => { let m = GM.store.get('missions', null); if (!m || m.wk !== weekId()) { m = { wk: weekId(), n: {}, done: [], bonus: false, days: [] }; GM.store.set('missions', m); } return m; };
  GM.missions = () => { const m = loadM(); return pick(m.wk).map(([id, text, need, ev]) => ({ id, text, need, ev, have: Math.min(need, m.n[id] || 0), done: m.done.includes(id) })); };
  GM.missionsLeft = () => GM.missions().filter(x => !x.done).length;
  // the games report what happened here
  GM.track = function (ev, n = 1) {
    if (!ev) return;
    const m = loadM();
    if (ev === 'daily') { const d = GM.today(); if (m.days.includes(d)) return; m.days.push(d); }
    pick(m.wk).forEach(([id, text, need, e]) => {
      if (e !== ev || m.done.includes(id)) return;
      m.n[id] = (m.n[id] || 0) + n;
      if (m.n[id] >= need) {
        m.done.push(id);
        GM.store.set('missionsDone', +GM.store.get('missionsDone', 0) + 1);
        setTimeout(() => { GM.toast(`🎯 <b>Mission done:</b> ${GM.esc(text)} · +${MISSION_XP} season XP`, 3200); GM.sound.play('fanfare'); }, 1200);
        GM.store.set('missions', m); setTimeout(() => { GM.seasonXP(MISSION_XP); GM.lockerCheck(); }, 0);
      }
    });
    if (!m.bonus && m.done.length >= 3) { m.bonus = true; if (GM.givePack) GM.givePack(1, 'all three missions this week', 'mission'); if (GM.grant) GM.grant({ spin: 1 }, 'all three missions'); }
    GM.store.set('missions', m);
  };

  /* ---------------------------------------------------------------- login rewards */
  const DAYS = [
    { icon: '⚡', text: '+50 season XP', xp: 50 }, { icon: '⚡', text: '+75 season XP', xp: 75 }, { icon: '🎁', text: 'A pack', pack: 'standard' },
    { icon: '🎡', text: 'A spin of the wheel', spin: 1 }, { icon: '🎁', text: 'A Level Up pack', pack: 'level' }, { icon: '⚡', text: '+150 season XP', xp: 150 },
    { icon: '🎒', text: 'A Locker item', item: true },
  ];
  GM.LOGIN_DAYS = DAYS;
  // the first open of the day claims the next day on the card (it loops after day 7; missing a day doesn't reset it)
  GM.loginCheck = function () {
    const l = GM.store.get('login', { last: '', n: 0 }), today = GM.today();
    if (l.last === today) return null;
    const d = DAYS[l.n % 7];
    GM.store.set('login', { last: today, n: l.n + 1 });
    let what = d.text;
    if (d.xp) GM.seasonXP(d.xp);
    if (d.pack && GM.givePack) GM.givePack(1, null, d.pack);
    if (d.spin && GM.grant) GM.grant({ spin: d.spin }, null, true);
    if (d.item) {
      const it = Object.values(GM.LOCKER).find(x => x.src.login && !GM.lockerHas(x.id));
      if (it) { GM.giveItem(it.id, null, true); what = `${GM.LOCKER_KINDS[it.kind].icon} ${it.name}`; } else if (GM.givePack) { GM.givePack(1, null, 'legends'); what = 'A Promotion pack'; }
    }
    setTimeout(() => GM.notice({ pic: `<span class="notice-icon">${d.icon}</span>`, title: `Day ${(l.n % 7) + 1} login reward`, sub: `${what} · tap for this week’s missions`, href: '#/today', ms: 6000 }), 1500);
    return d;
  };

  /* ---------------------------------------------------------------- the page (#/season) */
  // this week's missions and the login card: on the Today tab (they reset, like the dailies)
  GM.missionsHtml = function () {
    const ms = GM.missions(), wdays = Math.max(1, Math.ceil((weekEnds() - Date.now()) / 864e5));
    return `<h3 class="section-title">🎯 This week’s missions <span class="more">${wdays} day${wdays > 1 ? 's' : ''} left</span></h3>
      <div class="st-missions">${ms.map(m => `<div class="st-m ${m.done ? 'done' : ''}"><span>${m.done ? '✅' : '🎯'}</span><span><b>${GM.esc(m.text)}</b><div class="bar"><i style="width:${Math.round(100 * m.have / m.need)}%"></i></div></span><small>${m.done ? `+${MISSION_XP}` : `${m.have}/${m.need}`}</small></div>`).join('')}
        <p class="muted small center">Each one: +${MISSION_XP} season XP. All three: a 🎯 Mission pack and a 🎡 spin.</p></div>`;
  };
  GM.loginHtml = function () {
    const l = GM.store.get('login', { last: '', n: 0 });
    return `<h3 class="section-title">📅 Login rewards</h3>
      <div class="st-login">${DAYS.map((d, k) => { const cur = l.n % 7, claimedToday = l.last === GM.today();
        const today = claimedToday ? k === (cur + 6) % 7 : k === cur;
        return `<div class="${k < cur ? 'got' : ''} ${today ? 'today' : ''}"><small>Day ${k + 1}</small><span>${d.icon}</span><b>${d.text}</b></div>`; }).join('')}</div>`;
  };
  // this season's CHAOS on the Season page: what it brings, the title you earn by playing it, a way in
  const szChaosCard = z => {
    const szc = GM.SZ_CHAOS && GM.SZ_CHAOS[z.theme]; if (!szc) return '';
    const t = Object.values(GM.LOCKER || {}).find(x => x.src.szc && (x.src.s || '') === z.id), n = GM.szChaosCount(), need = t ? t.src.szc : 0, got = t && GM.lockerHas(t.id);
    return `<a class="szc-card sz-${z.theme}" href="#/draft?m=szchaos&s=goals"><span class="szc-k">This month only</span><b>${GM.esc(szc.name)}</b><small>${GM.esc(szc.kick)} Its own wildcards, moments and managers.</small>
      <span class="szc-row"><span>+${SZ_XP} season XP a game</span>${t ? `<span>${got ? '✅' : `${Math.min(n, need)}/${need}`} 🏷️ “${GM.esc(t.name)}” title</span>` : ''}</span><i>Play ›</i></a>`;
  };
  // the season pass: the Season view of the Locker tab (also #/season, from the top bar)
  GM.seasonPage = function (root) {
    const i = GM.seasonInfo(), lv = GM.myLevel();
    const days = Math.max(1, Math.ceil((i.ends - Date.now()) / 864e5));
    const reward = t => { const r = tierReward(t), got = i.got.includes(t), it = r.item && GM.LOCKER[r.item];
      const label = GM.esc(GM.rewardLabel(r));
      return `<div class="st-tier ${got || t <= i.tier ? 'got' : ''} ${t === i.tier + 1 ? 'next' : ''} ${it ? 'item' : ''}"><span>${t}</span><b>${label}</b></div>`; };
    root.innerHTML = `<div class="st-hero"><small>Season ${i.n} · ${days} day${days > 1 ? 's' : ''} left</small><b>${i.icon} ${GM.esc(i.name)}</b>${i.sub ? `<small>${GM.esc(i.sub)}</small>` : ''}
        <div class="st-lvl"><span>Tier <b>${i.tier}</b>/${TIERS}</span><div class="bar"><i style="width:${Math.round(100 * i.into / TIER)}%"></i></div><span>${i.tier >= TIERS ? '🏁 Done!' : `${i.into}/${TIER} XP`}</span></div>
        <small>All your XP counts here too. Your level (${lv.icon} ${lv.n}) is for life; the track starts again each month.</small>
        ${(() => { const b = GM.seasonBonus(); return `<small class="st-bonus">🔁 After tier ${TIERS}: a bonus every ${b.of.toLocaleString()} XP, for as long as you play${i.tier >= TIERS ? ` · next: <b>${GM.esc(GM.rewardLabel(b.next))}</b> (${b.into.toLocaleString()}/${b.of.toLocaleString()})` : ''}</small>`; })()}
        <span class="st-go"><a class="btn small" href="#/today">🎯 Missions</a><a class="btn small" href="#/level">🛤️ Level road</a></span></div>
      ${szChaosCard(i)}
      ${GM.eventHtml ? GM.eventHtml() : ''}
      <h3 class="section-title">🪜 The season track</h3>
      <div class="st-track">${Array.from({ length: TIERS }, (_, k) => reward(k + 1)).join('')}</div>
      <h3 class="section-title">🗓️ Next season</h3>
      <div class="st-next">${(() => { const d = new Date(), id = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 7), z = GM.gmSeason(id);
        return `<div><span>🎁</span><b>Season ${z.n}</b><small>A new track, a new look and new things to unlock. It starts on the 1st: no peeking.</small></div>`; })()}</div>
      <p class="muted center small">When the month ends, this season’s items go into the vault: you can still find them in 🌟 Legendary packs and on the 🎡 wheel.</p>`;
  };

  /* ---------------------------------------------------------------- seasonal visitors (LottieFiles, fx/lottie/) */
  // Now and then something from the season crosses Home: Santa's sleigh over the top, a ghost drifting by, a bunny
  // hopping along the bottom, fireworks over the banner… (first visit a few seconds in, then every few minutes on Home)
  const VISIT = {
    christmas: [{ n: 'sleigh', w: 230, path: 'across', y: 0.16, sound: 'bell', ms: 7000 }, { n: 'snowman', w: 120, path: 'corner' }, { n: 'gift', w: 150, path: 'corner' }],
    halloween: [{ n: 'ghost', w: 120, path: 'float', y: 0.42, sound: 'boo', ms: 9000 }, { n: 'spider', w: 150, path: 'dangle' }, { n: 'witch', w: 150, path: 'across', y: 0.24, sound: 'spooky', ms: 6500 },
      { n: 'bat', w: 90, path: 'across', y: 0.3, sound: 'spooky', ms: 5000, flip: 1 }, { n: 'pumpkin', w: 120, path: 'corner' }, { n: 'batmoon', w: 170, path: 'top' }],
    easter: [{ n: 'bunny', w: 90, path: 'hop', ms: 9000 }, { n: 'eggs', w: 120, path: 'corner' }],
    champions: [{ n: 'fireworks', w: 240, path: 'top' }],
    finalday: [{ n: 'fireworks', w: 240, path: 'top' }, { n: 'trophy', w: 140, path: 'corner' }],
    cup: [{ n: 'trophy', w: 140, path: 'corner' }],
    window: [{ n: 'stopwatch', w: 90, path: 'corner' }],
    title: [{ n: 'flags', w: 140, path: 'corner' }],
    summer: [{ n: 'sun', w: 130, path: 'top' }],
  };
  GM.SEASON_VISITORS = VISIT;
  let visitT = null, visitK = 0;
  GM.seasonVisit = async function (force) {
    const sz = SEASONS[seasonId()], list = sz && VISIT[sz.theme], FX = GM.FX;
    if (!list || !FX || !FX.lottie || GM.store.get('seasonLook', true) === false || (!force && !document.body.classList.contains('has-tabs'))) return null;
    const v = list[visitK++ % list.length], W = innerWidth, H = innerHeight, w = v.w;
    // (dangle: the spider lets itself down on its thread from the cobweb in the corner, and climbs back up)
    const web = GM.$('.sz-corner'), wr = web && web.getBoundingClientRect();
    if (v.path === 'dangle' && !wr) return null;
    const at = { across: [-w, H * (v.y || 0.2)], float: [-w, H * (v.y || 0.4)], hop: [-w, H - 210], corner: [W - w * 0.7, H - 150 - w / 2], top: [W / 2, H * 0.22],
      dangle: wr && [wr.left + wr.width * 0.55, wr.top + wr.height * 0.35 + w / 2] }[v.path];
    const h = await FX.lottie(v.n, { x: v.path === 'top' || v.path === 'corner' || v.path === 'dangle' ? at[0] : 0, y: at[1], w, loop: v.path !== 'top', flip: v.flip, cls: 'sz-visit' + (v.path === 'dangle' ? ' sz-spider' : '') });
    if (!h) return null;
    if (v.sound) setTimeout(() => GM.sound.play(v.sound), 400);
    const el = h.el.closest ? h.el.closest('.fx-lottie') || h.el : h.el;
    const end = () => h.remove();
    if (v.path === 'across' || v.path === 'float' || v.path === 'hop') {
      el.style.left = (-w) + 'px';
      const frames = v.path === 'float' ? [{ transform: 'translate(0,0)' }, { transform: `translate(${(W + w) * 0.33}px,-30px)` }, { transform: `translate(${(W + w) * 0.66}px,25px)` }, { transform: `translate(${W + w * 2}px,-10px)` }]
        : v.path === 'hop' ? [{ transform: 'translate(0,0)' }, { transform: `translate(${W + w * 2}px,0)` }]
        : [{ transform: 'translate(0,20px)' }, { transform: `translate(${(W + w) / 2}px,-25px)` }, { transform: `translate(${W + w * 2}px,10px)` }];
      el.animate(frames, { duration: v.ms || 7000, easing: 'linear', fill: 'forwards' }).onfinish = end;
    } else if (v.path === 'dangle') {
      el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: 12000, fill: 'forwards' }).onfinish = end;
    } else if (v.path === 'corner') {
      el.animate([{ transform: 'translateY(60px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.12 }, { transform: 'none', opacity: 1, offset: 0.85 }, { transform: 'translateY(30px)', opacity: 0 }], { duration: 5000, fill: 'forwards' }).onfinish = end;
    }
    return v.n;
  };
  // the router calls this on every page: Home gets a visitor now and then
  GM.seasonVisitPlan = function (path) {
    clearTimeout(visitT);
    if (path !== '' || GM.store.get('calm', false)) return;
    const last = GM._visitAt || 0, wait = last ? Math.max(4000, 180000 - (Date.now() - last)) : 2500;
    visitT = setTimeout(() => { if ((location.hash || '#/') === '#/' || location.hash === '') { GM._visitAt = Date.now(); GM.seasonVisit(); GM.seasonVisitPlan(''); } }, wait);
  };

  /* ---------------------------------------------------------------- start-up */
  // a new day (login reward), the unlocks you've already earned (first time: quietly), the look you wear
  GM.rewardsStart = function () {
    if (GM.rewardsStart._done) return;
    GM.rewardsStart._done = true;
    const first = !GM.store.get('locker', null);
    if (first && GM.favClub && GM.favClub()) GM.store.set('clubDailies', Math.min(30, Object.keys(GM.store.get('dlog', {})).length));
    GM.lockerCheck(first);
    if (first && GM.lockerNew()) setTimeout(() => GM.notice({ pic: '<span class="notice-icon">🎒</span>', title: 'Your Locker is open', sub: `${GM.lockerNew()} things unlocked already from what you’ve done · tap to look`, href: '#/locker?v=kit', ms: 8000 }), 2500);
    else GM.loginCheck();
    GM.applyLocker();
    GM.applySeason();
    GM.syncFlair();
  };
})();

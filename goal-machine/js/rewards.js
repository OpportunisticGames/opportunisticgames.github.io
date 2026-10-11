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
    // the falling layer on the menus: what falls, how many, and how
    GM.$$('.sz-fx').forEach(e => e.remove());
    const FALL = { christmas: ['❄️❄❅❆', 26, ''], halloween: ['🦇🍂🍁', 10, 'flutter'], champions: ['✦✧⭐', 22, 'twinkle'], easter: ['🌸🌼🌷', 14, 'flutter'],
      finalday: ['🎊▪▪▪', 22, ''], cup: ['🎀', 8, 'flutter'], window: ['💸', 7, 'flutter'], summer: ['☀️', 0, ''], title: ['🔥', 0, ''] };
    const f = sz && on && FALL[sz.theme];
    if (!f || !f[1]) return;
    const box = document.createElement('div'); box.className = 'sz-fx ' + f[2]; box.setAttribute('aria-hidden', 'true');
    const chars = [...f[0]], r = GM.rng('szfx:' + sz.theme), COL = ['#fde047', '#ef4444', '#3b82f6', '#22c55e', '#f9a8d4'];
    for (let k = 0; k < f[1]; k++) {
      const i = document.createElement('i'), ch = chars[r.int(chars.length)];
      i.textContent = ch;
      const size = f[2] === 'twinkle' ? 8 + r.int(10) : 10 + r.int(12);
      i.style.cssText = `left:${r.int(100)}%;font-size:${size}px;animation-duration:${(f[2] === 'twinkle' ? 1.5 + r() * 2.5 : 9 + r() * 12).toFixed(1)}s;animation-delay:-${(r() * 20).toFixed(1)}s;--dx:${r.int(80) - 40}px;--rot:${r.int(360)}deg;--y:${r.int(95)}%`
        + (ch === '▪' ? `;color:${COL[r.int(COL.length)]};font-size:${8 + r.int(6)}px` : sz.theme === 'christmas' ? ';color:#fff;text-shadow:0 0 4px rgba(255,255,255,.6)' : '');
      box.appendChild(i);
    }
    document.body.appendChild(box);
  };
  const seasonId = (d = new Date()) => d.toISOString().slice(0, 7);  // YYYY-MM (UTC)
  const seasonNo = id => { const [y, m] = id.split('-').map(Number); return (y - 2026) * 12 + m - 9; };  // October 2026 = Season 1
  const seasonEnds = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };
  GM.season = (id = seasonId()) => { const sz = SEASONS[id] || {}; return { id, n: seasonNo(id), name: sz.name || NAMES[+id.slice(5, 7) - 1], icon: sz.icon || '🏆', sub: sz.sub || '', theme: sz.theme || '', ends: seasonEnds() }; };

  // this season's progress (a new month starts a new one)
  const loadS = () => { let s = GM.store.get('season', null); if (!s || s.id !== seasonId()) { s = { id: seasonId(), xp: 0, got: [] }; GM.store.set('season', s); } return s; };
  const tierOf = xp => Math.min(TIERS, Math.floor(xp / TIER));
  // the reward for a tier: the Locker item for it (if you haven't got it), else a pack
  // (this season's items: src.season = the tier, src.s = the season, October 2026 if not set; older ones are in the vault)
  const tierReward = t => {
    const it = Object.values(GM.LOCKER || {}).find(x => x.src.season === t && (x.src.s || '2026-10') === seasonId());
    if (it && !GM.lockerHas(it.id)) return { item: it.id };
    return t % 10 === 0 ? { pack: 'legendary' } : t % 5 === 0 ? { choice: [{ pack: 'season' }, { spin: 2 }, { vault: 1 }] } : t % 3 === 0 ? { spin: 1 } : { pack: t % 2 ? 'standard' : 'season' };
  };
  GM.seasonInfo = () => { const s = loadS(), t = tierOf(s.xp); return { ...GM.season(), xp: s.xp, tier: t, into: t >= TIERS ? TIER : s.xp - t * TIER, got: s.got }; };
  // season XP (called with every XP, and for missions and login rewards); new tiers hand out their rewards
  GM.seasonXP = function (n) {
    if (!n) return;
    const s = loadS(), before = tierOf(s.xp);
    s.xp += n; const after = tierOf(s.xp);
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
  GM.seasonChip = () => { const i = GM.seasonInfo(); return `<a class="season-chip" href="#/season" title="${GM.esc(i.name)}">🏆 S${i.n} · T${i.tier}${GM.rewardsWaiting && GM.rewardsWaiting() ? '<i class="new-dot"></i>' : ''}</a>`; };

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
    for (let k = 0; k < 40 && out.length < 3; k++) { const m = POOL[r.int(POOL.length)]; if (!seen.has(m[3])) { seen.add(m[3]); out.push(m); } }
    return out;
  };
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
    setTimeout(() => GM.notice({ pic: `<span class="notice-icon">${d.icon}</span>`, title: `Day ${(l.n % 7) + 1} login reward`, sub: `${what} · tap for the season`, href: '#/season', ms: 6000 }), 1500);
    return d;
  };

  /* ---------------------------------------------------------------- the page (#/season) */
  GM.seasonPage = function (root) {
    const i = GM.seasonInfo(), ms = GM.missions(), l = GM.store.get('login', { last: '', n: 0 }), lv = GM.myLevel();
    const days = Math.max(1, Math.ceil((i.ends - Date.now()) / 864e5)), wdays = Math.max(1, Math.ceil((weekEnds() - Date.now()) / 864e5));
    const reward = t => { const r = tierReward(t), got = i.got.includes(t), it = r.item && GM.LOCKER[r.item];
      const label = GM.esc(GM.rewardLabel(r));
      return `<div class="st-tier ${got || t <= i.tier ? 'got' : ''} ${t === i.tier + 1 ? 'next' : ''} ${it ? 'item' : ''}"><span>${t}</span><b>${label}</b></div>`; };
    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🏆 Season ${i.n}</h2><span></span></div>
      <div class="st-hero"><small>Season ${i.n} · ${days} day${days > 1 ? 's' : ''} left</small><b>${i.icon} ${GM.esc(i.name)}</b>${i.sub ? `<small>${GM.esc(i.sub)}</small>` : ''}
        <div class="st-lvl"><span>Tier <b>${i.tier}</b>/${TIERS}</span><div class="bar"><i style="width:${Math.round(100 * i.into / TIER)}%"></i></div><span>${i.tier >= TIERS ? '🏁 Done!' : `${i.into}/${TIER} XP`}</span></div>
        <small>All your XP counts here too. Your level (${lv.icon} ${lv.n}) is for life; the track starts again each month.</small>
        <a class="btn small" href="#/locker">🎒 Your Locker${GM.lockerNew() ? ' <i class="new-dot inline"></i>' : ''}</a></div>
      <div class="st-prizes"><a class="st-p" href="#/spin"><span>🎡</span><b>${+GM.store.get('spins', 0)}</b><small>spin${+GM.store.get('spins', 0) === 1 ? '' : 's'}</small></a>
        <button class="st-p" id="st-pick" ${(GM.store.get('choices', []) || []).length ? '' : 'disabled'}><span>🎁</span><b>${(GM.store.get('choices', []) || []).length}</b><small>to pick</small></button>
        <a class="st-p" href="#/level"><span>${lv.icon}</span><b>${lv.n}</b><small>level road</small></a></div>
      ${GM.eventHtml ? GM.eventHtml() : ''}
      <h3 class="section-title">🎯 This week’s missions <span class="more">${wdays} day${wdays > 1 ? 's' : ''} left</span></h3>
      <div class="st-missions">${ms.map(m => `<div class="st-m ${m.done ? 'done' : ''}"><span>${m.done ? '✅' : '🎯'}</span><span><b>${GM.esc(m.text)}</b><div class="bar"><i style="width:${Math.round(100 * m.have / m.need)}%"></i></div></span><small>${m.done ? `+${MISSION_XP}` : `${m.have}/${m.need}`}</small></div>`).join('')}
        <p class="muted small center">Each one: +${MISSION_XP} season XP. All three: a 🎯 Mission pack and a 🎡 spin.</p></div>
      <h3 class="section-title">📅 Login rewards</h3>
      <div class="st-login">${DAYS.map((d, k) => { const cur = l.n % 7, claimedToday = l.last === GM.today(), done = k < cur || (cur === 0 && claimedToday && l.n > 0 && k === 6);
        const today = claimedToday ? k === (cur + 6) % 7 : k === cur;
        return `<div class="${k < cur ? 'got' : ''} ${today ? 'today' : ''}"><small>Day ${k + 1}</small><span>${d.icon}</span><b>${d.text}</b></div>`; }).join('')}</div>
      <h3 class="section-title">🪜 The season track</h3>
      <div class="st-track">${Array.from({ length: TIERS }, (_, k) => reward(k + 1)).join('')}</div>
      <h3 class="section-title">🗓️ Next season</h3>
      <div class="st-next">${(() => { const d = new Date(), id = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 7), z = GM.season(id);
        return `<div><span>🎁</span><b>Season ${z.n}</b><small>A new track, a new look and new things to unlock. It starts on the 1st: no peeking.</small></div>`; })()}</div>
      <p class="muted center small">When the month ends, this season’s items go into the vault: you can still find them in 🌟 Legendary packs and on the 🎡 wheel.</p>`;
    const pk = GM.$('#st-pick', root); if (pk) pk.onclick = () => GM.pickReward();
  };

  /* ---------------------------------------------------------------- seasonal visitors (LottieFiles, fx/lottie/) */
  // Now and then something from the season crosses Home: Santa's sleigh over the top, a ghost drifting by, a bunny
  // hopping along the bottom, fireworks over the banner… (first visit a few seconds in, then every few minutes on Home)
  const VISIT = {
    christmas: [{ n: 'sleigh', w: 230, path: 'across', y: 0.16, sound: 'bell', ms: 7000 }, { n: 'snowman', w: 120, path: 'corner' }, { n: 'gift', w: 150, path: 'corner' }],
    halloween: [{ n: 'ghost', w: 120, path: 'float', y: 0.42, sound: 'boo', ms: 9000 }, { n: 'bat', w: 90, path: 'across', y: 0.3, sound: 'spooky', ms: 5000, flip: 1 }, { n: 'pumpkin', w: 120, path: 'corner' }, { n: 'batmoon', w: 170, path: 'top' }],
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
    const at = { across: [-w, H * (v.y || 0.2)], float: [-w, H * (v.y || 0.4)], hop: [-w, H - 210], corner: [W - w * 0.7, H - 150 - w / 2], top: [W / 2, H * 0.22] }[v.path];
    const h = await FX.lottie(v.n, { x: v.path === 'top' || v.path === 'corner' ? at[0] : 0, y: at[1], w, loop: v.path !== 'top', flip: v.flip, cls: 'sz-visit' });
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
    if (first && GM.lockerNew()) setTimeout(() => GM.notice({ pic: '<span class="notice-icon">🎒</span>', title: 'Your Locker is open', sub: `${GM.lockerNew()} things unlocked already from what you’ve done · tap to look`, href: '#/locker', ms: 8000 }), 2500);
    else GM.loginCheck();
    GM.applyLocker();
    GM.applySeason();
    GM.syncFlair();
  };
})();

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
  const seasonId = (d = new Date()) => d.toISOString().slice(0, 7);  // YYYY-MM (UTC)
  const seasonNo = id => { const [y, m] = id.split('-').map(Number); return (y - 2026) * 12 + m - 9; };  // October 2026 = Season 1
  const seasonEnds = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };
  GM.season = () => { const id = seasonId(); return { id, n: seasonNo(id), name: NAMES[+id.slice(5, 7) - 1], ends: seasonEnds() }; };

  // this season's progress (a new month starts a new one)
  const loadS = () => { let s = GM.store.get('season', null); if (!s || s.id !== seasonId()) { s = { id: seasonId(), xp: 0, got: [] }; GM.store.set('season', s); } return s; };
  const tierOf = xp => Math.min(TIERS, Math.floor(xp / TIER));
  // the reward for a tier: the Locker item for it (if you haven't got it), else a pack
  const tierReward = t => {
    const it = Object.values(GM.LOCKER || {}).find(x => x.src.season === t);
    if (it && !GM.lockerHas(it.id)) return { item: it.id };
    return { pack: t % 10 === 0 ? 'legends' : t % 5 === 0 ? 'season' : 'standard' };
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
      const r = tierReward(t);
      if (r.item) GM.giveItem(r.item, `season tier ${t}`);
      else if (GM.givePack) GM.givePack(1, `season tier ${t}`, r.pack);
    }
    GM.store.set('season', s);
    GM.$$('.season-chip').forEach(el => { el.outerHTML = GM.seasonChip(); });
  };
  GM.seasonChip = () => { const i = GM.seasonInfo(); return `<a class="season-chip" href="#/season" title="${GM.esc(i.name)}">🏆 S${i.n} · T${i.tier}${GM.missionsLeft() ? '<i class="new-dot"></i>' : ''}</a>`; };

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
    if (!m.bonus && m.done.length >= 3) { m.bonus = true; if (GM.givePack) GM.givePack(1, 'all three missions this week', 'mission'); }
    GM.store.set('missions', m);
  };

  /* ---------------------------------------------------------------- login rewards */
  const DAYS = [
    { icon: '⚡', text: '+50 season XP', xp: 50 }, { icon: '⚡', text: '+75 season XP', xp: 75 }, { icon: '🎁', text: 'A pack', pack: 'standard' },
    { icon: '⚡', text: '+100 season XP', xp: 100 }, { icon: '🎁', text: 'A Level Up pack', pack: 'level' }, { icon: '⚡', text: '+150 season XP', xp: 150 },
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
    const reward = t => { const r = tierReward(t), got = i.got.includes(t); const it = r.item && GM.LOCKER[r.item];
      const label = it ? `${GM.LOCKER_KINDS[it.kind].icon} ${GM.esc(it.id === 'title-club' ? 'Club Ultra' : it.name)}` : r.pack === 'legends' ? '🟣 Promotion pack' : r.pack === 'season' ? '🏆 Season pack' : '🎁 Pack';
      return `<div class="st-tier ${got || t <= i.tier ? 'got' : ''} ${t === i.tier + 1 ? 'next' : ''} ${it ? 'item' : ''}"><span>${t}</span><b>${label}</b></div>`; };
    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🏆 Season ${i.n}</h2><span></span></div>
      <div class="st-hero"><small>Season ${i.n} · ${days} day${days > 1 ? 's' : ''} left</small><b>${GM.esc(i.name)}</b>
        <div class="st-lvl"><span>Tier <b>${i.tier}</b>/${TIERS}</span><div class="bar"><i style="width:${Math.round(100 * i.into / TIER)}%"></i></div><span>${i.tier >= TIERS ? '🏁 Done!' : `${i.into}/${TIER} XP`}</span></div>
        <small>All your XP counts here too. Your level (${lv.icon} ${lv.n}) is for life; the track starts again each month.</small>
        <a class="btn small" href="#/locker">🎒 Your Locker${GM.lockerNew() ? ' <i class="new-dot inline"></i>' : ''}</a></div>
      <h3 class="section-title">🎯 This week’s missions <span class="more">${wdays} day${wdays > 1 ? 's' : ''} left</span></h3>
      <div class="st-missions">${ms.map(m => `<div class="st-m ${m.done ? 'done' : ''}"><span>${m.done ? '✅' : '🎯'}</span><span><b>${GM.esc(m.text)}</b><div class="bar"><i style="width:${Math.round(100 * m.have / m.need)}%"></i></div></span><small>${m.done ? `+${MISSION_XP}` : `${m.have}/${m.need}`}</small></div>`).join('')}
        <p class="muted small center">Each one: +${MISSION_XP} season XP. All three: a 🎯 Mission pack.</p></div>
      <h3 class="section-title">📅 Login rewards</h3>
      <div class="st-login">${DAYS.map((d, k) => { const cur = l.n % 7, claimedToday = l.last === GM.today(), done = k < cur || (cur === 0 && claimedToday && l.n > 0 && k === 6);
        const today = claimedToday ? k === (cur + 6) % 7 : k === cur;
        return `<div class="${k < cur ? 'got' : ''} ${today ? 'today' : ''}"><small>Day ${k + 1}</small><span>${d.icon}</span><b>${d.text}</b></div>`; }).join('')}</div>
      <h3 class="section-title">🪜 The season track</h3>
      <div class="st-track">${Array.from({ length: TIERS }, (_, k) => reward(k + 1)).join('')}</div>`;
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
    GM.syncFlair();
  };
})();

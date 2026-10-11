/* Goal Machine – 🎁 prizes: one way to hand out every kind of reward, Clash Royale style.
   A reward is one of { pack: type }, { item: id }, { xp: n } (season XP), { spin: n } (prize-wheel spins),
   { vault: 1 } (a Locker item from the vault), { choice: [r, r, r] } (pick one). GM.grant(reward, why) gives it.
   - 🛤️ The level road: every level has its reward (levelReward), not just a pack.
   - 🎡 The prize wheel (#/spin): spins come from the road, the season track, login day 4 and missions.
   - 🏛️ The vault: last season's and old events' items, plus vault-only ones. They come back in 🌟 Legendary packs,
     in a pack's bonus slot now and then, and on the wheel, so nothing's gone for good.
   - 🎃 Events: a time-limited track (EVENTS) with its own items, filled by the same XP while it's on.
   Stored on this device: 'spins', 'choices' (picks waiting), 'event:<id>'. */
'use strict';

(function () {
  const L = () => GM.LOCKER || {};
  const label = r => r.pack ? `${(GM.PACKS && GM.PACKS[r.pack] || {}).badge || '🎁'} ${(GM.PACKS && GM.PACKS[r.pack] || { name: 'Pack' }).name}`
    : r.item ? `${GM.LOCKER_KINDS[L()[r.item].kind].icon} ${L()[r.item].name}` : r.xp ? `⚡ ${r.xp} season XP` : r.spin ? `🎡 ${r.spin} spin${r.spin > 1 ? 's' : ''}`
    : r.vault ? '🏛️ A vault item' : r.choice ? '🎁 Pick one of three' : '🎁';
  GM.rewardLabel = label;

  /* ---------------------------------------------------------------- the vault */
  // items you can find in packs and on the wheel: past seasons', past events', and vault-only ones you don't have yet
  GM.vaultItems = function () {
    const sid = GM.season ? GM.season().id : '', today = new Date().toISOString().slice(0, 10);
    const over = id => { const e = EVENTS.find(x => x.id === id); return !!e && today >= e.to; };  // an event's items only once it's finished
    return Object.values(L()).filter(it => !GM.lockerHas(it.id) && (it.src.vault || (it.src.season && (it.src.s || '2026-10') < sid) || (it.src.event && over(it.src.event))));
  };
  const vaultPick = rng => { const v = GM.vaultItems(); return v.length ? v[Math.floor(rng() * v.length)] : null; };

  /* ---------------------------------------------------------------- granting */
  GM.grant = function (r, why, quiet) {
    if (!r) return null;
    if (r.pack && GM.givePack) GM.givePack(r.n || 1, quiet ? null : why, r.pack);
    else if (r.item) { if (!GM.giveItem(r.item, why, quiet)) return GM.grant({ pack: 'standard' }, why, quiet); }
    else if (r.xp && GM.seasonXP) { GM.seasonXP(r.xp); if (!quiet) GM.toast(`⚡ <b>+${r.xp} season XP</b>${why ? ` · ${GM.esc(why)}` : ''}`, 2400); }
    else if (r.spin) { GM.store.set('spins', +GM.store.get('spins', 0) + r.spin); if (!quiet) setTimeout(() => GM.toast(`🎡 <b>+${r.spin} spin${r.spin > 1 ? 's' : ''}</b> on the prize wheel${why ? ` · ${GM.esc(why)}` : ''}`, 2600), 300); GM.rewardDots(); }
    else if (r.vault) { const it = vaultPick(Math.random); return it ? GM.grant({ item: it.id }, why, quiet) : GM.grant({ pack: 'legendary' }, why, quiet); }
    else if (r.choice) { GM.store.set('choices', (GM.store.get('choices', []) || []).concat([{ opts: r.choice, why: why || '' }])); if (!quiet) setTimeout(() => GM.pickReward(), 900); GM.rewardDots(); }
    return r;
  };
  // the dots on the season chip: spins to use, a choice waiting
  GM.rewardDots = () => { GM.$$('.season-chip').forEach(el => { if (GM.seasonChip) el.outerHTML = GM.seasonChip(); }); };
  GM.rewardsWaiting = () => +GM.store.get('spins', 0) + (GM.store.get('choices', []) || []).length;

  /* ---------------------------------------------------------------- pick one of three */
  GM.pickReward = function () {
    const q = GM.store.get('choices', []) || [];
    if (!q.length || document.querySelector('.rw-pick')) return;
    const c = q[0];
    const m = GM.modal(`<div class="rw-pick"><h3 class="center">🎁 Pick one</h3>${c.why ? `<p class="muted center">${GM.esc(c.why)}</p>` : ''}
      <div class="rw-opts">${c.opts.map((o, k) => `<button class="rw-opt" data-k="${k}"><span>${label(o).split(' ')[0]}</span><b>${GM.esc(label(o).split(' ').slice(1).join(' '))}</b></button>`).join('')}</div>
      <p class="muted center small">Close it and it waits on the Season page.</p></div>`);
    GM.$$('.rw-opt', m.el).forEach(b => b.onclick = () => {
      const left = (GM.store.get('choices', []) || []).slice(1);
      GM.store.set('choices', left); m.close();
      GM.buzz('confirm'); GM.grant(c.opts[+b.dataset.k], 'your pick'); GM.rewardDots();
      if (left.length) setTimeout(() => GM.pickReward(), 600);
    });
  };

  /* ---------------------------------------------------------------- the prize wheel */
  const WHEEL = [
    { r: { xp: 50 }, w: 26, c: '#2563eb' }, { r: { pack: 'standard' }, w: 20, c: '#16a34a' }, { r: { xp: 100 }, w: 16, c: '#7c3aed' },
    { r: { pack: 'level' }, w: 14, c: '#0891b2' }, { r: { spin: 1 }, w: 9, c: '#f59e0b' }, { r: { xp: 200 }, w: 7, c: '#db2777' },
    { r: { vault: 1 }, w: 5, c: '#9333ea' }, { r: { pack: 'legendary' }, w: 3, c: '#eab308' },
  ];
  GM.WHEEL = WHEEL;
  GM.spinPage = function (root) {
    const n = +GM.store.get('spins', 0), seg = 360 / WHEEL.length;
    root.innerHTML = `<div class="topbar"><a href="#/season" class="back">‹</a><h2>🎡 Prize wheel</h2><span></span></div>
      <div class="wh-wrap"><div class="wh-pointer">▼</div><div class="wh" id="wh" style="background:conic-gradient(${WHEEL.map((s, k) => `${s.c} ${k * seg}deg ${(k + 1) * seg}deg`).join(',')})">
        ${WHEEL.map((s, k) => `<span style="transform:rotate(${k * seg + seg / 2}deg)"><i>${label(s.r).split(' ')[0]}</i></span>`).join('')}</div></div>
      <p class="center"><b id="wh-n">${n}</b> spin${n === 1 ? '' : 's'} left</p>
      <div class="actions col"><button class="btn big" id="wh-go" ${n ? '' : 'disabled'}>🎡 Spin!</button></div>
      <p class="muted center small">Spins come from the level road, the season track, login rewards and missions.</p>
      <div class="wh-key">${WHEEL.map(s => `<span><i style="background:${s.c}"></i>${GM.esc(label(s.r))}</span>`).join('')}</div>`;
    let turn = 0;
    GM.$('#wh-go', root).onclick = () => {
      const left = +GM.store.get('spins', 0); if (!left) return;
      GM.store.set('spins', left - 1); GM.$('#wh-go', root).disabled = true;
      const r = GM.rng('wheel:' + Date.now() + Math.random()), k = r.weighted(WHEEL.map((_, i) => i), i => WHEEL[i].w);
      turn += 360 * 5 + (360 - (k * seg + seg / 2)) - (turn % 360);
      const wh = GM.$('#wh', root); wh.style.transform = `rotate(${turn}deg)`;
      GM.sound.play('slotspin'); GM.buzz('tick');
      setTimeout(() => {
        const prize = WHEEL[k].r; GM.sound.play(prize.vault || prize.pack === 'legendary' ? 'jackpot' : 'good'); GM.buzz(prize.vault || prize.pack === 'legendary' ? 'win' : 'confirm');
        GM.grant(prize, 'the prize wheel');
        const now = +GM.store.get('spins', 0), el = GM.$('#wh-n', root); if (el) el.textContent = now;
        const go = GM.$('#wh-go', root); if (go) go.disabled = !now;
        GM.rewardDots();
      }, GM.store.get('calm', false) ? 300 : 3600);
    };
  };

  /* ---------------------------------------------------------------- the level road */
  // what each level gives: its Locker item(s), or a spin, a pick-one, a Legendary pack every 10, else a Level Up pack
  GM.levelReward = function (n) {
    const items = Object.values(L()).filter(it => it.src.lvl === n);
    if (items.length) return items.map(it => ({ item: it.id }));
    if (n % 10 === 0) return [{ pack: 'legendary' }];
    if (n % 5 === 0) return [{ choice: [{ pack: 'season' }, { spin: 2 }, { vault: 1 }] }];
    if (n % 3 === 0) return [{ spin: 1 }, { pack: 'level' }];
    return [{ pack: 'level' }];
  };
  GM.roadHtml = function (lvl) {
    const from = Math.max(2, lvl - 2), to = from + 11;
    return `<div class="road">${Array.from({ length: to - from + 1 }, (_, k) => from + k).map(n => {
      const rs = GM.levelReward(n), got = n <= lvl;
      return `<div class="road-n ${got ? 'got' : ''} ${n === lvl + 1 ? 'next' : ''}"><span>${n}</span><b>${rs.map(r => GM.esc(label(r))).join(' + ')}</b></div>`;
    }).join('')}</div>`;
  };

  /* ---------------------------------------------------------------- the pack's bonus slot */
  // now and then a pack carries something else as well as player pieces (always in a Legendary pack)
  const BONUS = { legendary: 1, season: 0.3, mission: 0.3, legends: 0.2, level: 0.1, badge: 0.1, chaos: 0.15 };
  GM.packBonus = function (type, rng) {
    const p = BONUS[type] != null ? BONUS[type] : 0.06;
    if (rng() >= p) return null;
    const v = vaultPick(rng);
    if (v && (type === 'legendary' || rng() < 0.5)) return { item: v.id };
    return rng() < 0.6 ? { spin: 1 } : { xp: 100 };
  };

  /* ---------------------------------------------------------------- events (time-limited tracks) */
  const EVENTS = [
    { id: 'spooky26', name: '🎃 Spooky Season', sub: 'Halloween at the ground: a haunted pitch, ghosts and a pumpkin frame', from: '2026-10-24', to: '2026-11-03', cost: 150, tiers: 10, cls: 'ev-spooky' },
  ];
  GM.EVENTS = EVENTS;
  GM.activeEvent = function () {
    const peek = GM.store.get('eventPeek', ''), today = new Date().toISOString().slice(0, 10);
    return EVENTS.find(e => e.id === peek) || EVENTS.find(e => today >= e.from && today < e.to) || null;
  };
  const evReward = (e, t) => {
    const it = Object.values(L()).find(x => x.src.event === e.id && x.src.tier === t);
    if (it) return { item: it.id };
    return t % 2 ? { xp: 75 } : { spin: 1 };
  };
  GM.eventInfo = function () {
    const e = GM.activeEvent(); if (!e) return null;
    const s = GM.store.get('event:' + e.id, { xp: 0, got: [] }), t = Math.min(e.tiers, Math.floor(s.xp / e.cost));
    return { ...e, xp: s.xp, tier: t, into: t >= e.tiers ? e.cost : s.xp - t * e.cost, got: s.got, rewards: Array.from({ length: e.tiers }, (_, k) => evReward(e, k + 1)) };
  };
  GM.eventXP = function (n) {
    const e = GM.activeEvent(); if (!e || !n) return;
    const s = GM.store.get('event:' + e.id, { xp: 0, got: [] }), before = Math.min(e.tiers, Math.floor(s.xp / e.cost));
    s.xp += n; const after = Math.min(e.tiers, Math.floor(s.xp / e.cost));
    GM.store.set('event:' + e.id, s);
    for (let t = before + 1; t <= after; t++) if (!s.got.includes(t)) { s.got.push(t); GM.store.set('event:' + e.id, s); GM.grant(evReward(e, t), `${e.name} tier ${t}`); }
  };
  GM.eventHtml = function () {
    const e = GM.eventInfo(); if (!e) return '';
    const days = Math.max(1, Math.ceil((Date.parse(e.to + 'T00:00:00Z') - Date.now()) / 864e5));
    return `<div class="ev-card ${e.cls}"><small>⏳ Limited time · ${days} day${days > 1 ? 's' : ''} left</small><b>${GM.esc(e.name)}</b><span>${GM.esc(e.sub)}</span>
      <div class="st-lvl"><span>Tier <b>${e.tier}</b>/${e.tiers}</span><div class="bar"><i style="width:${Math.round(100 * e.into / e.cost)}%"></i></div><span>${e.tier >= e.tiers ? '🏁' : `${e.into}/${e.cost}`}</span></div>
      <div class="ev-track">${e.rewards.map((r, k) => `<span class="${k < e.tier ? 'got' : ''} ${r.item ? 'item' : ''}" title="${GM.esc(label(r))}"><small>${k + 1}</small>${label(r).split(' ')[0]}</span>`).join('')}</div>
      <small>Event items go to the vault afterwards: you can still find them in Legendary packs.</small></div>`;
  };
})();

/* Goal Machine – levels (XP for everything you do, a rank to climb, a pack every level) and club v club (a weekly
   table of clubs by their fans' Daily Ultimate results). Your club and level go to the server with your account
   (set_profile), so the table knows your club and the boards can show your level. */
'use strict';

(function () {
  // XP for: a draft 25, any other game 15, a daily game 20 (on top), a badge 50, a pack 5, an online game 10 (win 30)
  GM.XP = { draft: 25, game: 15, daily: 20, badge: 50, pack: 5, online: 10, win: 30 };
  // level n → n+1 takes 100 + 25(n−1) XP; the ranks by level
  const need = n => 100 + 25 * (n - 1);
  const RANKS = [[1, '🥾', 'Sunday League'], [5, '🧤', 'Non-League'], [10, '🥉', 'League Two'], [15, '🥈', 'League One'], [20, '🥇', 'Championship'],
    [30, '🦁', 'Premier League'], [40, '⭐', 'Champions League'], [50, '🏆', 'Ballon d’Or']];
  GM.RANKS = RANKS;
  GM.levelOf = xp => {
    let n = 1, left = xp;
    while (left >= need(n)) { left -= need(n); n++; }
    const r = RANKS.filter(k => n >= k[0]).pop();
    return { n, into: left, need: need(n), icon: r[1], rank: r[2], next: RANKS.find(k => k[0] > n) };
  };
  // players from before levels start with XP for what they've already done
  const xp = () => {
    let v = GM.store.get('xp', null);
    if (v == null) {
      const a = GM.store.get('album', { ach: {} }), days = Object.values(GM.store.get('dlog', {})).reduce((t, e) => t + Object.keys(e).length, 0);
      v = GM.store.get('played', 0) * GM.XP.game + Object.keys(a.ach || {}).length * GM.XP.badge + days * GM.XP.daily;
      GM.store.set('xp', v);
    }
    return v;
  };
  GM.xp = xp;
  GM.myLevel = () => GM.levelOf(xp());
  GM.addXP = function (n, why) {
    if (!n) return;
    const before = GM.levelOf(xp()), after = GM.levelOf(xp() + n);
    GM.store.set('xp', xp() + n);
    if (after.n > before.n) {
      const promo = after.rank !== before.rank;
      setTimeout(() => {
        GM.toast(`⬆️ <b>Level ${after.n}</b>${promo ? ` · promoted to ${after.icon} <b>${after.rank}</b>!` : ''}`, 3200);
        GM.sound.play('levelup'); if (promo) setTimeout(() => GM.sound.play('cheer'), 450);
        if (GM.givePack) GM.givePack(1, promo ? `promoted to ${after.rank}` : `level ${after.n}`, promo ? 'legends' : 'level');
      }, 1500);
      GM.syncProfile();
    }
    GM.$$('.lvl-chip').forEach(el => { el.outerHTML = GM.levelChip(); });
  };
  GM.levelChip = () => { const l = GM.myLevel(); return `<a class="lvl-chip" href="#/level" title="${l.into}/${l.need} XP to level ${l.n + 1}">${l.icon} Lv ${l.n}<i style="width:${Math.round(100 * l.into / l.need)}%"></i></a>`; };

  // your club and level, with your account (only when they change)
  GM.syncProfile = function () {
    const a = GM.account();
    if (!a || !GM.lb.enabled) return;
    const club = GM.favClub() || '', lv = GM.myLevel().n, sent = `${a.name}|${club}|${lv}`;
    if (GM.store.get('profileSent', '') === sent) return;
    GM.lb.rpc('set_profile', { p_username: a.name, p_key: a.key, p_club: club, p_level: lv })
      .then(r => { if (r === 'ok') GM.store.set('profileSent', sent); }).catch(() => { });
  };

  GM.levelPage = function (root) {
    const l = GM.myLevel(), total = xp();
    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>${l.icon} Your level</h2><span></span></div>
      <div class="lvl-hero"><span class="lvl-big">${l.icon}</span><b>Level ${l.n}</b><small>${l.rank}</small>
        <div class="bar lvl-bar"><i style="width:${100 * l.into / l.need}%"></i></div>
        <small>${l.into.toLocaleString()} / ${l.need.toLocaleString()} XP to level ${l.n + 1} · 🎁 a pack every level${l.next ? ` · ${l.next[1]} ${l.next[2]} at level ${l.next[0]}` : ''}</small></div>
      <h3 class="section-title">🪜 The ladder</h3>
      <div class="lvl-ladder">${RANKS.map(([n, i, name]) => `<div class="${l.n >= n ? 'got' : ''}${l.rank === name ? ' now' : ''}"><span>${l.n >= n ? i : '🔒'}</span><b>${name}</b><small>Level ${n}</small></div>`).join('')}</div>
      <h3 class="section-title">⚡ Earning XP</h3>
      <div class="lvl-earn"><div><span>⚽</span>Finish a draft<b>+${GM.XP.draft}</b></div><div><span>📅</span>Play a daily game<b>+${GM.XP.daily}</b></div>
        <div><span>🎮</span>Any other game<b>+${GM.XP.game}</b></div><div><span>🏅</span>Earn a badge<b>+${GM.XP.badge}</b></div>
        <div><span>🌐</span>Online game (win)<b>+${GM.XP.online} (+${GM.XP.win})</b></div><div><span>🎁</span>Open a pack<b>+${GM.XP.pack}</b></div></div>
      <p class="muted center">${total.toLocaleString()} XP in all. Your level shows next to your name on the leaderboards.</p>`;
  };

  /* ================================================================ club v club */
  GM.clubTable = async (week = 0) => GM.lb.rpc('club_table', { p_week: week });
  // the table, inside the Leaderboards (🏟️ Your club → Club v club)
  GM.clubsBody = async function (el, week = 0) {
    const club = GM.favClub();
    el.innerHTML = `${club ? '' : '<a class="pick-club" href="#/settings?s=look">🏟️ Pick your club to play for them</a>'}
      ${club && !GM.account() ? '<a class="pick-club" href="#/settings?s=account">🔒 Claim a leaderboard name so your games count for your club</a>' : ''}
      <div class="lb club-lb" id="clubs"><div class="muted">Loading…</div></div>
      ${club ? `<a class="btn big" href="#/daily">📅 Play today’s Daily Ultimate for ${GM.esc(GM.clubShort(club))}</a>` : ''}`;
    GM.syncProfile();
    const box = () => GM.$('#clubs', el);
    if (!GM.lb.enabled) { box().innerHTML = '<div class="muted">The online table is switched off.</div>'; return; }
    try {
      const rows = await GM.clubTable(week);
      if (!box()) return;
      let rank = 0;
      box().innerHTML = rows.length ? rows.map(r => {
        const pos = r.ranked ? ++rank : '–';
        return `<div class="lb-row ${r.club === club ? 'me' : ''}"><span>${r.ranked && pos <= 3 ? ['🥇', '🥈', '🥉'][pos - 1] : pos}</span><span>${GM.clubChip(r.club)} ${GM.esc(r.club)}<small class="muted"> · ${r.fans} fan${r.fans > 1 ? 's' : ''}, ${r.games} game${r.games > 1 ? 's' : ''}</small></span><b>${r.avg.toLocaleString()}</b></div>`;
      }).join('') : `<div class="muted">No games yet ${week ? 'last' : 'this'} week. Be the first for your club!</div>`;
    } catch (e) { if (box()) box().innerHTML = '<div class="muted">Couldn’t load the table.</div>'; }
  };
})();

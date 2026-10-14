/* Goal Machine – player profiles. Tap any name (the leaderboards, Best Players, your friends) for their profile: picture
   (friends only, as Settings promises; everyone else gets their initials), level and title, favourite club, the boards they
   top, their Best Players place, their best XI and favourite CHAOS manager (scores from 5.33 carry them), your record
   against them, and Add friend / Report. Server: player_profile(p_name, p_me). */
'use strict';

(function () {
  const esc = s => GM.esc(s);
  const n = x => Number(x || 0).toLocaleString();
  const monthYear = t => new Date(t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  GM.profile = async function (name) {
    if (!name || !GM.lb.enabled) return;
    const me = GM.getName(), mine = !!me && name.toLowerCase() === me.toLowerCase();
    const m = GM.modal(`<div class="prof"><div id="profbody"><p class="muted center">Loading ${esc(name)}…</p></div></div>`);
    let d = null, failed = false;
    try { d = await GM.lb.rpc('player_profile', { p_name: name, p_me: me || null }); } catch (e) { failed = true; }
    const el = GM.$('#profbody', m.el);
    const kicker = mine ? '<p class="prof-you">This is how other players see you</p>' : '';
    if (!el) return;
    if (!d) { el.innerHTML = failed ? GM.net.msg(`${esc(name)}’s profile`, '<p class="muted center">Couldn’t load the profile – try again in a bit.</p>') : '<p class="muted center">No profile to show.</p>'; return; }
    const photo = mine || d.friend;
    const bests = [d.mbest && `#${d.mbest.rank} this month`, d.best && `#${d.best.rank} all time`].filter(Boolean).join(' · ');
    const vs = d.vs && d.vs.w + d.vs.d + d.vs.l ? d.vs : null;
    el.innerHTML = `${kicker}<div class="prof-head">${GM.userPic(d.name, 'xl', photo)}
        <div><h3>${esc(d.name)}${GM.titleHtml ? GM.titleHtml(d.name) : ''}</h3>
          <small>${d.level ? `<i class="lv-tag">Lv ${d.level}</i> ` : ''}${d.club ? `${esc(d.club)} fan · ` : ''}playing since ${monthYear(d.since)}</small></div></div>
      <div class="prof-tiles">
        <div><b>👑 ${n(d.crowns)}</b><small>board${d.crowns === 1 ? '' : 's'} on top</small></div>
        <a href="#/leaderboard?m=bestplayers"><b>🏅 ${d.mbest ? '#' + d.mbest.rank : d.best ? '#' + d.best.rank : '–'}</b><small>${bests ? 'Best Players ' + (d.mbest ? 'this month' : 'all time') : 'Best Players'}</small></a>
        <div><b>⚽ ${n(d.games)}</b><small>scores posted</small></div></div>
      ${vs ? `<div class="prof-vs"><b>You v ${esc(d.name)}</b><span>${vs.w} won · ${vs.d} drawn · ${vs.l} lost</span><a href="#/rival?name=${encodeURIComponent(d.name)}">Rivalry ›</a></div>` : ''}
      ${d.xi && d.xi.xi && d.xi.xi.length ? `<h4>⭐ Best XI <small class="muted">${esc(GM.boardName ? GM.boardName(d.xi.mode) : d.xi.mode)} · ${n(d.xi.score)}</small></h4>
        <div class="prof-xi">${d.xi.xi.map(p => `<span>${esc(p)}</span>`).join('')}</div>` : ''}
      ${d.mgr ? `<p class="prof-line">👔 Favourite CHAOS manager: <b>${esc(d.mgr)}</b></p>` : ''}
      ${d.boards.length ? `<h4>🏆 Best places</h4><div class="prof-boards">${d.boards.map(b => `<a href="#/leaderboard?m=${encodeURIComponent(b.mode)}"><span>${b.rk === 1 ? '👑' : b.rk <= 3 ? ['', '', '🥈', '🥉'][b.rk] : '#' + b.rk}</span><span>${esc(GM.boardName ? GM.boardName(b.mode) : b.mode)}<small>#${b.rk} of ${n(b.n)}</small></span><b>${GM.scoreText ? GM.scoreText(b.mode, b.score) : n(b.score)}</b></a>`).join('')}</div>` : '<p class="muted center small">No scores on the boards yet.</p>'}
      ${mine ? `<div class="prof-acts"><a class="btn small" href="#/locker?v=kit">🎒 Your kit${GM.lockerNew && GM.lockerNew() ? ' <i class="new-dot"></i>' : ''}</a><a class="btn ghost small" href="#/settings">⚙️ Name & picture</a></div>` : `<div class="prof-acts">${GM.account() && !d.friend ? '<button class="btn small" id="prof-add">👋 Add friend</button>' : ''}${GM.account() && d.friend ? `<a class="btn small" href="#/online?tab=friends">⚔️ Play ${esc(d.name)}</a>` : ''}<button class="btn ghost small" id="prof-report">🚩 Report name</button></div>`}`;
    GM.$$('a', el).forEach(a => a.addEventListener('click', () => m.close()));
    const add = GM.$('#prof-add', el);
    if (add) add.onclick = async () => {
      const a = GM.account(); add.disabled = true;
      try {
        const r = await GM.lb.rpc('online_add_friend', { p_user: a.name, p_key: a.key, p_friend: d.name });
        GM.toast(r === 'ok' || r === 'exists' ? `👋 ${esc(d.name)} is your friend now` : 'Couldn’t add them');
        if (r === 'ok' || r === 'exists') { add.outerHTML = `<a class="btn small" href="#/online?tab=friends">⚔️ Play ${esc(d.name)}</a>`; GM.$$('a', el).forEach(x => x.addEventListener('click', () => m.close())); }
      } catch (e) { GM.toast('Couldn’t reach the server – try again'); add.disabled = false; }
    };
    const rep = GM.$('#prof-report', el);
    if (rep) rep.onclick = () => { m.close(); GM.reportName(d.name); };
  };

  // any name you can tap: leaderboard rows (data-name) and anything marked data-profile
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-profile], .lb-row[data-name]');
    if (!t || e.defaultPrevented) return;
    e.preventDefault();
    GM.buzz('click');
    GM.profile(t.dataset.profile || t.dataset.name);
  });
})();

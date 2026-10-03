/* Goal Machine – the player sheet: tap a player who's already yours (on your pitch, a pack card, the Players index, the
   Album, your XI) and see his photo, his card and how far you are with it, every club with its seasons, his numbers,
   his honours and your history with him. Never on the reels: it would give the game away. */
'use strict';

(function () {
  // consecutive seasons as "1996/97–2003/04"
  const season = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  function spans(ys) {
    const a = [...ys].sort((x, y) => x - y), out = [];
    a.forEach(y => { const l = out[out.length - 1]; if (l && y === l[1] + 1) l[1] = y; else out.push([y, y]); });
    return out.map(([x, y]) => (x === y ? season(x) : `${season(x)}–${season(y)}`)).join(', ');
  }
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } };

  GM.playerSheet = function (ref, extra = '') {  // extra: a game's own block at the top (CHAOS: what's happened to him)
    const p = typeof ref === 'string' ? (GM.byPk.get(ref) || GM.anyByPk(ref)) : ref;
    if (!p) return null;
    const cs = GM.cardState ? GM.cardState(p) : null;
    const T = cs && GM.TIERS[cs.t];
    // the card, and where you are with it
    let cardBlock = '<p class="muted small">Not a collectable card: fewer than 50 Premier League appearances.</p>';
    if (cs && cs.tracked) {
      const cardHtml = GM.cardHtml({ p, t: cs.t, have: cs.have, pack: cs.pack, finished: cs.done }, { back: false });
      const status = cs.done ? '✅ Card finished. He can go into your 🃏 Packed XI.'
        : cs.t !== 'b' && cs.have >= cs.need - 1 && !cs.pack ? `🎁 One piece short, and it has to come from a pack (the ◆).`
        : `🧩 ${cs.have} of ${cs.need} pieces${cs.t !== 'b' ? (cs.pack ? ' (a pack piece is in)' : ': the last has to come from a pack (the ◆)') : ''}.`;
      cardBlock = `<div class="ps-cardrow"><div class="ps-card">${cardHtml}</div><div><b>${T.icon} ${T.name} card</b><p class="small">${status}</p></div></div>`;
    }
    // clubs with their seasons, oldest first; the one he's best known for is starred
    const clubs = p.clubs.map(c => {
      const ys = p.stints[c];
      return `<li>${GM.clubChip(c)} <span><b>${GM.esc(c)}</b>${c === p.main && p.clubs.length > 1 ? ' ⭐' : ''}<small>${ys && ys.size ? `${spans(ys)} · ${ys.size} season${ys.size > 1 ? 's' : ''}` : 'seasons not known'}</small></span></li>`;
    }).join('');
    const hon = [
      p.hon.H ? '🏛️ Premier League Hall of Fame' : '', p.hon.P ? `🏆 ${p.hon.P}× Premier League champion` : '', p.hon.B ? `👟 ${p.hon.B}× Golden Boot` : '',
      p.hon.W ? '🌍 World Cup winner' : '', p.hon.C ? '⭐ Champions League winner' : ''].filter(Boolean);
    // your history with him
    const [offered, signed] = GM.pickCount ? GM.pickCount(p.pk) : [0, 0];
    const alb = GM.store.get('album', { players: {} }).players || {}, pur = GM.store.get('purist', { players: {} }).players || {};
    const since = alb[p.pk] || pur[p.pk];
    const mine = `${signed ? `✍️ You’ve signed him <b>${signed}</b> time${signed > 1 ? 's' : ''}` : '✍️ You haven’t signed him in a draft yet'}${offered ? ` · 👀 he’s turned up on the reels ${offered} time${offered > 1 ? 's' : ''}` : ''}${since ? `<br>📒 In your ${alb[p.pk] ? 'Album' : 'Purist collection'} since ${fmtDate(since)}` : ''}`;
    const wiki = p.photo && p.photo.t ? 'https://en.wikipedia.org/wiki/' + encodeURIComponent(p.photo.t.replace(/ /g, '_'))
      : 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(p.name + ' footballer');
    const credit = p.photo && p.photo.w ? `<p class="muted small">Photo: ${GM.esc(p.photo.a || 'Wikimedia')}, <a href="${GM.esc(p.photo.u)}" target="_blank" rel="noopener">${GM.esc(p.photo.l || 'free licence')}</a></p>` : '';
    const m = GM.modal(`<div class="ps">
      <div class="ps-head">${GM.avatar(p, 'lg')}<div><h3>${GM.esc(p.name)}</h3>
        <div class="ps-sub">${GM.flag(p.nat)} ${GM.esc(p.nat || '')} · ${GM.posBadges(p)}</div>
        <div class="ps-sub">${GM.era(p)}${p.clubs.length > 1 || p.main ? ` · best known at ${GM.clubChip(p.main)}` : ''}</div></div></div>
      ${extra}${cardBlock}
      <div class="ps-stats"><span><b>${p.apps}</b>appearances</span><span><b>${p.goals}</b>goals</span><span><b>${p.ast}</b>assists</span><span><b>${p.apps ? (p.goals / p.apps).toFixed(2) : '0.00'}</b>goals a game</span></div>
      ${hon.length ? `<ul class="ps-hon">${hon.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
      <h4>Clubs</h4><ul class="ps-clubs">${clubs}</ul>
      <h4>You and ${GM.esc(p.name.split(' ')[0])}</h4><p class="small">${mine}</p>
      <p class="small"><a href="${GM.esc(wiki)}" target="_blank" rel="noopener">📖 Read about him on Wikipedia</a></p>${credit}
      <div class="row"><button class="btn" data-close>Close</button></div></div>`);
    m.el.parentNode.style.zIndex = 140;   // above the pack opening
    return m;
  };
  // anything marked data-psheet="<player key>" opens his sheet
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-psheet]');
    if (!t || e.target.closest('a, button')) return;
    GM.playerSheet(t.dataset.psheet);
  });
})();

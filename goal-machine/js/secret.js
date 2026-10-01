/* Goal Machine – 🤫 secret games: fun knock-offs you unlock by doing something. Locked ones show a hint on Home
   (Quick & more tab); opening one before you've unlocked it shows the lock and the hint. Once unlocked, always unlocked
   (stored as secret:<id>), with a little celebration the first time you're back on Home. */
'use strict';

(function () {
  GM.SECRET_GAMES = [
    { id: 'reign', icon: '👑', name: 'Reign Check', sub: 'Swipe left, swipe right: own a club and try not to get thrown out', href: '#/reign', cls: 't-purple',
      hint: 'Sack a head coach in Dodgy Owner', test: () => !!GM.store.get('owner:sacked', 0) },
    { id: 'hattrick', icon: '🃏', name: 'Hat-Trick', sub: 'Football Spades: you and a partner against two rivals', href: '#/hattrick', cls: 't-teal',
      hint: 'Play 10 games of anything', test: () => GM.store.get('played', 0) >= 10 || !!GM.store.get('ht:record', null) || !!GM.store.get('ht:save', null) },
  ];
  const byPath = path => GM.SECRET_GAMES.find(g => g.href === '#/' + path);
  // unlocked? (the first time the test passes it's remembered, and flagged for a celebration)
  GM.secretUnlocked = function (id) {
    if (GM.store.get('secret:' + id, 0)) return true;
    const g = GM.SECRET_GAMES.find(x => x.id === id);
    if (g && g.test()) { GM.store.set('secret:' + id, 1); GM.store.set('secretNew', (GM.store.get('secretNew', []) || []).concat(id)); return true; }
    return false;
  };
  // the router asks: is this page a locked secret? (invites to an online Hat-Trick always get through)
  GM.secretLocked = function (path) {
    const g = byPath(path);
    if (!g) return null;
    if (g.id === 'hattrick' && GM.store.get('ht:autostart', 0)) return null;
    return GM.secretUnlocked(g.id) ? null : g;
  };
  GM.secretLockPage = function (root, g) {
    root.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🔒 Secret game</h2><span></span></div>
      <div class="secret-lock"><span class="sl-icon">🔒</span><b>Locked</b><p>This one’s a secret. To unlock it:</p><p class="sl-hint">🗝️ ${GM.esc(g.hint)}</p><a class="btn" href="#/">Back to Home</a></div>`;
  };
  // Home's secret section
  GM.secretTiles = function () {
    return `<h3 class="section-title">🤫 Secret games <small>${GM.SECRET_GAMES.filter(g => GM.secretUnlocked(g.id)).length}/${GM.SECRET_GAMES.length} unlocked</small></h3>
      <div class="tiles secret-tiles">${GM.SECRET_GAMES.map(g => GM.secretUnlocked(g.id)
        ? `<a class="tile ${g.cls}" href="${g.href}"><span class="tile-icon">${g.icon}</span><b>${GM.esc(g.name)}</b><small>${GM.esc(g.sub)}</small></a>`
        : `<div class="tile locked"><span class="tile-icon">🔒</span><b>???</b><small>🗝️ ${GM.esc(g.hint)}</small></div>`).join('')}</div>`;
  };
  // back on Home after unlocking one: tell them
  GM.secretCelebrate = function () {
    const fresh = GM.store.get('secretNew', []) || [];
    if (!fresh.length) return;
    GM.store.set('secretNew', []);
    const gs = fresh.map(id => GM.SECRET_GAMES.find(g => g.id === id)).filter(Boolean);
    if (!gs.length) return;
    GM.sound.play('wild'); GM.buzz(80);
    const m = GM.modal(`<div class="secret-unlock"><span class="sl-icon">🔓</span><b>Secret game unlocked!</b>${gs.map(g => `<a class="tile ${g.cls}" href="${g.href}" data-close><span class="tile-icon">${g.icon}</span><b>${GM.esc(g.name)}</b><small>${GM.esc(g.sub)}</small></a>`).join('')}
      <button class="btn ghost" data-close>Later</button></div>`);
    return m;
  };
})();

/* Goal Machine – router, home screen, leaderboard, player index */
'use strict';

(function () {
  const app = GM.$('#app');
  let installEvt = null;

  const isAndroid = /Android/i.test(navigator.userAgent);
  // Already "installed"? Inside the Android app, running as an installed web app, or the user said so.
  const standalone = () => !!window.AndroidApp || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const installHidden = () => standalone() || GM.store.get('installed', false);
  let hasNativeApp = false;
  // Android Chrome can tell us if the Goal Machine app is installed (manifest related_applications + app asset_statements)
  if (isAndroid && navigator.getInstalledRelatedApps) {
    navigator.getInstalledRelatedApps().then(apps => {
      if (apps && apps.length) { hasNativeApp = true; GM.$$('.install-bar').forEach(b => b.remove()); }
    }).catch(() => { });
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); installEvt = e;
    const b = GM.$('#install'); if (b && !isAndroid && !installHidden()) b.hidden = false;
  });
  window.addEventListener('appinstalled', () => { GM.store.set('installed', true); GM.$$('.install-bar').forEach(b => b.remove()); });

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { path: path || '', q: Object.fromEntries(new URLSearchParams(qs || '')) };
  }

  // bottom tab bar: shown on the menus, hidden mid-game so the pitch gets the whole screen
  // the Players index lives in the Album and on the home screen; Online gets the tab (with a badge for games waiting on you)
  const TABS = [['', '⚽', 'Play'], ['today', '<i class="cal-slot"></i>', 'Today'], ['online', '🌐<i class="online-badge" hidden></i>', 'Online'], ['leaderboard', '🏆', 'Ranks'], ['album', '📒', 'Album']];
  const MENU_PAGES = ['', 'today', 'leaderboard', 'album', 'players', 'updates', 'settings', 'about', 'h2h', 'credits'];
  const tabbar = document.createElement('nav');
  tabbar.className = 'tabbar';
  tabbar.innerHTML = TABS.map(([p, i, l]) => `<a href="#/${p}" data-tab="${p}"><span>${i}</span>${l}</a>`).join('');
  document.body.appendChild(tabbar);
  tabbar.addEventListener('click', () => GM.buzz(8));

  // Back button / swipe in the Android app (MainActivity asks GM.back() first). A pop-up closes; a game or sub-page
  // goes to the last menu page you were on; the home screen asks before quitting. Returns 'handled' or 'native'.
  const menuTrail = [];
  GM.back = function () {
    const open = GM.$$('.modal-wrap');
    if (open.length) { open[open.length - 1].click(); open[open.length - 1].remove(); return 'handled'; }
    const { path } = parseHash();
    if (!path) {
      GM.confirm('Leave Goal Machine?', 'Quit', 'Stay').then(ok => { if (ok) GM.app('quit'); });
      return 'handled';
    }
    if (GM.leaveGuard && GM.leaveGuard()) {  // mid-way through a market game: check first
      GM.confirm('Leave this game? Your signings so far will be lost.', 'Leave', 'Keep playing').then(ok => { if (ok) { GM.leaveGuard = null; GM.back(); } });
      return 'handled';
    }
    // the last menu page that isn't this one (Play, Today, Ranks, Album, Players, Settings…), or home
    while (menuTrail.length && menuTrail[menuTrail.length - 1] === location.hash) menuTrail.pop();
    location.hash = menuTrail.pop() || '#/';
    return 'handled';
  };

  // the ‹ in the top bar: when it points at the page you're already on (a Hat-Trick in progress is still #/hattrick),
  // changing the address does nothing, so draw that page afresh instead
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a.back');
    if (!a || e.defaultPrevented || a.getAttribute('href') !== location.hash) return;
    e.preventDefault(); GM.sound.play('tap'); route();
  });
  // the ‹ in the top bar asks too, while a market game is half-way
  document.addEventListener('click', e => {
    const a = e.target.closest('a.back');
    if (!a || !GM.leaveGuard || !GM.leaveGuard()) return;
    e.preventDefault();
    GM.confirm('Leave this game? Your signings so far will be lost.', 'Leave', 'Keep playing').then(ok => { if (ok) { GM.leaveGuard = null; location.hash = a.getAttribute('href'); } });
  }, true);

  GM.NEW_MODES = ['chaos', 'auction'];
  function route() {
    const { path, q } = parseHash();
    const tried = path === 'draft' ? q.m : path;
    GM.triedGame(tried);  // opening a game clears its NEW / UPDATED tag
    if (path !== 'settings') GM.lastPage = location.hash;  // for feedback: the page you were on before Settings
    if (MENU_PAGES.includes(path)) {  // remember menu pages for the back button
      if (menuTrail[menuTrail.length - 1] !== (location.hash || '#/')) menuTrail.push(location.hash || '#/');
      if (menuTrail.length > 30) menuTrail.shift();
    }
    window.scrollTo(0, 0);
    GM.$$('.modal-wrap').forEach(m => m.remove());
    app.className = 'page-' + (path || 'home');
    const menu = MENU_PAGES.includes(path) || (path === 'online' && !q.room && !q.join);
    document.body.classList.toggle('has-tabs', menu);
    tabbar.hidden = !menu;
    GM.$$('[data-tab]', tabbar).forEach(a => a.classList.toggle('on', a.dataset.tab === path));
    if (menu && GM.account()) {  // the Online tab's badge: games waiting on you (checked at most every 30 s)
      const n = GM.store.get('onlineWaiting', 0), b = GM.$('.online-badge', tabbar);
      b.textContent = n; b.hidden = !n;
      if (GM.online && GM.online.check) GM.online.check();
    }
    GM.sound.scene(path === 'draft' && /^chaos/.test(q.m || '') ? 'chaos' : path);  // each game area has its own music (CHAOS has Mayhem)
    GM.chaosLook(path === 'draft' && /^chaos/.test(q.m || ''));
    GM.moneyLook(path === 'moneyball');
    GM.ownerLook(path === 'owner' || path === 'reign');
    GM.applyIntl();
    GM.$('.cal-slot', tabbar).innerHTML = GM.calIcon();  // stays right past midnight
    const locked = GM.secretLocked && GM.secretLocked(path);  // a secret game you haven't unlocked yet
    if (locked) { GM.ownerLook(false); return GM.secretLockPage(app, locked); }
    try { page(path, q); } catch (e) {
      // a page that fails to draw: never leave the last page up in the wrong look, say so and offer a way out
      console.error(e);
      GM.chaosLook(false); GM.moneyLook(false); GM.ownerLook(false);
      app.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>😬 Something went wrong</h2><span></span></div>
        <div class="result"><p>This page didn’t load properly. Try again, and if it keeps happening tell us in Settings → Feedback.</p>
          <p class="muted"><small>${GM.esc(String(e && e.message || e))}</small></p>
          <div class="actions col"><button class="btn big" onclick="location.reload()">🔄 Reload</button><a class="btn ghost" href="#/">🏠 Home</a></div></div>`;
    }
  }
  function page(path, q) {
    switch (path) {
      case 'draft': return GM.draft.start(app, ['target', 'treble', 'mystery', 'club', 'classic', 'classicwild', 'ultimatepure', 'extreme', 'purist', 'chaos', 'chaosx', 'match', 'nation'].includes(q.m) ? q.m : 'ultimate',
        { fx: q.fx, nat: q.n, stat: q.s, seed: q.seed, vs: q.vs, vss: q.vss ? +q.vss : undefined, hard: q.seed ? q.h === '1' : GM.isHard(), extreme: q.seed ? q.x === '1' : GM.isExtreme(), club: q.c, daily: q.daily === '1' });
      case 'today': return GM.todayPage(app);
      case 'matchday': return GM.matchday(app);
      case 'nations': return GM.nationsPage(app);
      case 'level': return GM.levelPage(app);
      case 'clubs': return leaderboard('clubs' + (q.w === '1' ? ':1' : ''));
      case 'packs': return GM.album(app, 'goals', 'album', q.v === 'xi' ? 'xi' : 'cards', '', GM.TIERS[q.t] ? q.t : '', q.open === '1');
      case 'matchfootle': return GM.footle(app, false, q.fx);
      case 'online': return GM.onlinePage(app, q);
      case 'footle': return GM.footle(app, false);
      case 'clubfootle': return GM.footle(app, true);
      case 'daily': return GM.draft.start(app, 'daily');
      case 'hilo': return GM.hilo(app);
      case 'hattrick': return GM.hattrick(app);
      case 'hopper': return GM.hopper(app);
      case 'whoami': return GM.whoami(app);
      case 'grid': return GM.grid(app, false);
      case 'dailygrid': return GM.grid(app, true);
      case 'tally': return GM.tally(app);
      case 'moneyball': return GM.moneyball(app, q);
      case 'owner': return GM.dodgyOwner(app, q);
      case 'reign': return GM.reignCheck(app);
      case 'tester': if (q.code === GM.TESTER_CODE) { GM.unlockAllSecrets(); GM.store.set('homeTab', 'quick'); GM.toast('🔓 Every secret game is unlocked on this device'); } location.replace('#/'); return;
      case 'royale': return GM.goalRoyale(app);
      case 'boss': location.replace('#/owner'); return;  // Club Boss grew up into Dodgy Owner
      case 'window': location.replace('#/moneyball'); return;  // the Transfer Window is part of the new Moneyball
      case 'auction': return GM.auction(app, q);
      case 'leaderboard': return leaderboard(q.m);
      case 'players': return playerIndex();
      case 'album': return GM.album(app, GM.STATS[q.s] ? q.s : 'goals', q.b === 'purist' ? 'purist' : 'album', q.v, q.c, GM.TIERS[q.t] ? q.t : '', q.open === '1');
      case 'about': return about();
      case 'credits': return credits();
      case 'h2h': return GM.h2h(app);
      case 'h2hplay': return GM.h2hPlay(app);
      case 'updates': return GM.updatesPage(app);
      case 'settings': return settings();
      default: return home();
    }
  }

  /* ---------------------------------------------------------------- home */
  // CHAOS always sits on the dark look (its neon needs it); leaving puts your own look back. A CHAOS Race turns it on too.
  // 💰 Moneyball's boardroom look (dark, gold and money green)
  GM.moneyLook = function (on) {
    if (on === document.body.classList.contains('money-mode')) return;
    document.body.classList.toggle('money-mode', on);
    if (on) { document.documentElement.dataset.theme = 'dark'; GM.app('setBars', '#07140f', false); } else if (!document.body.classList.contains('chaos-mode')) GM.applyTheme();
  };
  // 🕴️ the dodgy owner games' look: ink-dark, paper cards, gold, a serif face (Dodgy Owner and Reign Check)
  GM.ownerLook = function (on) {
    if (on === document.body.classList.contains('owner-mode')) return;
    document.body.classList.toggle('owner-mode', on);
    if (on) { document.documentElement.dataset.theme = 'dark'; GM.app('setBars', '#1a1622', false); } else if (!document.body.classList.contains('chaos-mode') && !document.body.classList.contains('money-mode')) GM.applyTheme();
  };
  GM.chaosLook = function (chaos) {
    if (chaos === document.body.classList.contains('chaos-mode')) return;
    document.body.classList.toggle('chaos-mode', chaos);
    if (chaos) { document.documentElement.dataset.theme = 'dark'; GM.app('setBars', '#12001f', false); } else GM.applyTheme();
  };

  function home() {
    // Home always has the normal look and music, whatever drew it (a game's dark look must never be left behind)
    GM.chaosLook(false); GM.moneyLook(false); GM.ownerLook(false); GM.sound.scene('');
    const hard = GM.isHard(), level = GM.level(), extreme = level === 'extreme';
    const pb = k => GM.best(hard && GM.HARD_MODES.includes(k) ? k + 'h' : extreme && GM.extremeKey(k) || k);
    const club = GM.favClub(), waiting = GM.account() ? GM.store.get('onlineWaiting', 0) : 0;
    const statBtn = (m, s, label) => {
      const st = GM.STATS[s], key = m === 'club' ? GM.draft.modeKey(m, s, false, club) : GM.draft.modeKey(m, s, false), best = m === 'club' ? GM.best(key) : pb(key);
      const pct = best && GM.pctOf(key, (GM.store.get('hist:' + (hard && GM.HARD_MODES.includes(key) ? key + 'h' : extreme && GM.extremeKey(key) || key), [])[0] || {}).m);
      return `<a class="stat-btn" href="#/draft?m=${m}&s=${s}${m === 'club' ? '&c=' + encodeURIComponent(club) : ''}"><i class="sb-ico">${st.icon}</i>${label || st.short || st.name}${best ? `<small>PB ${pct || best.toLocaleString()}</small>` : ''}</a>`;
    };
    // NEW on the newest modes until you've opened them
    const newTag = k => GM.gameTag(k);
    const tile = (href, cls, icon, title, sub, best, extra = '') => {
      const k = href.replace(/^#\/(draft\?m=)?/, '').replace(/[?&].*$/, '');
      return `<a class="tile ${cls}" href="${href}"><span class="tile-icon">${icon}</span>${best ? `<span class="tile-pb">PB ${best.toLocaleString()}</span>` : ''}${newTag(k)}<b>${title}</b><small>${sub}</small>${extra}</a>`;
    };
    const album = GM.albumSummary();
    // The main event: pick the player pool and whether wildcards are on - six modes in two small switches (remembered)
    const POOLS = {
      classic: { icon: '⭐', short: 'Classic', on: 'classicwild', off: 'classic', about: 'Every player with 50+ PL apps, and the better known they are, the more often they turn up' },
      ultimate: { icon: '👑', short: 'Ultimate', on: 'ultimate', off: 'ultimatepure', about: 'Every player with 50+ PL apps, all equally likely, so find the stars among the journeymen' },
    };
    const EXTREME = { icon: '⚡', short: 'Extreme', on: 'extreme', off: 'purist', about: 'Every one of the 5,000+ players ever to play in the PL, all equally likely. Mostly strangers' };
    const pool = POOLS[GM.store.get('ultPool', 'ultimate')] ? GM.store.get('ultPool', 'ultimate') : 'ultimate';
    const wild = GM.store.get('ultWild', true) !== false;
    const ult = (extreme ? EXTREME : POOLS[pool])[wild ? 'on' : 'off'];
    const cpool = extreme ? 'chaosx' : 'chaos';  // CHAOS: 50+ apps, or everyone on Extreme
    const ultName = GM.MODES[ult].name;
    const ultSub = `${(extreme ? EXTREME : POOLS[pool]).about}. ${wild ? 'Wildcards on.' : 'No wildcards: just the reels and your knowledge.'}${ult === 'purist' ? ' Fills your 💎 Purist collection.' : ''}`;
    const streak = GM.streak();
    const dtile = (g, cls, sub) => {
      const G = GM.DAILY_GAMES[g], st = GM.dailyStatus(g), gs = GM.streak(g);
      return `<a class="tile ${cls}${st.done ? ' done' : ''}" href="${G.href}"><span class="tile-icon">${G.icon}</span>${gs ? `<span class="tile-pb">🔥 ${gs}</span>` : ''}
        <b>${g === 'club' ? GM.esc(GM.clubShort(club)) + ' Footle' : G.name}</b><small>${st.text || sub}</small></a>`;
    };
    const h2h = GM.store.get('h2h', null);
    // sub-tabs keep Home short: the main event up front, everything else a tap away (the dailies live in the Today tab)
    const HTABS = [['main', '⚽ Main', ['chaos']], ['targets', '🎯 Targets', []], ['market', '💰 Market', ['owner', 'moneyball', 'auction']], ['quick', '⚡ Quick & more', []]];
    const htab = HTABS.some(t => t[0] === GM.store.get('homeTab')) ? GM.store.get('homeTab') : 'main';
    app.innerHTML = `
      <div class="appbar"><a class="icon-btn" href="#/settings" aria-label="Settings">⚙️</a>
        <div class="logo small">GOAL<span>MACHINE</span></div>
        <a class="icon-btn" href="#/updates" aria-label="Updates">📰${GM.hasUnseenUpdate() ? '<i class="new-dot"></i>' : ''}</a></div>
      <header class="hero">
        <p>${GM.levelChip()} ${club ? `<span class="fan-chip">${GM.clubChip(club, true)}</span> <span class="banter">${GM.esc(GM.clubBanter(club))}</span>` : `${GM.allPlayers ? GM.allPlayers.length.toLocaleString() : '5,000+'} Premier League players · 1992 to today`}</p>
        ${installHidden() || hasNativeApp ? '' : `<div class="install-bar">
          ${isAndroid ? `<a class="btn small" id="getapk" href="${GM.APK_URL}">🤖 Get the Android app</a>` : `<button class="btn small" id="install" hidden>📲 Install app</button>`}
          <button class="install-x" id="install-x" title="I already have it" aria-label="Hide">✕</button></div>`}
        ${GM.appOutdated() ? `<div class="install-bar"><a class="btn small" href="${GM.APK_URL}">📲 New version of the app – tap to update</a></div>` : ''}
      </header>
      ${GM.firstXICard()}${GM.promoHtml()}
      ${GM.packsWaiting() ? `<a class="pack-bar" href="#/packs?open=1"><span>🎁</span><span><b>${GM.packsWaiting()} pack${GM.packsWaiting() > 1 ? 's' : ''} to open</b><small>${GM.esc(GM.packedXI().n < 11 ? 'Build your Packed XI' : 'Improve your Packed XI')}</small></span><span>›</span></a>` : ''}
      <div class="hard-toggle three" role="group" aria-label="Difficulty">${Object.entries(GM.LEVELS).map(([k, [i, n, sub]]) => `<button class="${k === level ? 'on' : ''}" data-level="${k}">${i} ${n}<small>${sub}</small></button>`).join('')}</div>
      <div class="seg home-tabs" id="htabs">${HTABS.map(([k, l, modes]) => `<button data-t="${k}">${l}${modes.some(m => newTag(m)) ? '<i class="new-dot"></i>' : ''}</button>`).join('')}</div>
      <div data-hpanel="main">
      <div class="chaos-card">${newTag('chaos')}<div class="chaos-head"><span>🌪️</span><div><span class="kicker">Headline event</span><b>Ultimate Wildcard CHAOS</b><small>Appoint a manager, fill the CHAOS meter and survive tornadoes, VAR and last-minute madness. Your XI’s total plus bonus points.</small></div></div>
        ${extreme ? '<span class="cx-note">⚡ Extreme: all 5,000+ players</span>' : ''}
        <div class="stat-row">${Object.keys(GM.STATS).map(s => statBtn(cpool, s)).join('')}</div>
        <a class="chaos-daily" href="#/draft?m=chaos&daily=1">${GM.calIcon()} <b>Daily CHAOS</b><span>${GM.dailyStatus('chaos').text || 'Same chaos for everyone today · one go'}</span>${GM.streak('chaos') ? `<i>🔥 ${GM.streak('chaos')}</i>` : ''}</a></div>
      <div class="mode-card featured ultimate big-card">
        <span class="mode-icon">${GM.MODES[ult].icon}</span>
        <span class="mode-text"><span class="kicker">Main event</span><b>${ultName}</b><small>${ultSub}</small>
          ${extreme ? '' : `<span class="variant" role="group" aria-label="Players">${Object.entries(POOLS).map(([k, v]) => `<button data-pool="${k}" class="${k === pool ? 'on' : ''}"><span>${v.icon}</span>${v.short}</button>`).join('')}</span>`}
          <span class="variant wild-switch" role="group" aria-label="Wildcards"><button data-wild="1" class="${wild ? 'on' : ''}">🃏 Wildcards on</button><button data-wild="0" class="${wild ? '' : 'on'}">🚫 No wildcards</button></span>
          <span class="stat-pick">${statBtn(ult, 'goals')}${statBtn(ult, 'assists')}${statBtn(ult, 'apps')}</span></span>
      </div>
      <a class="h2h-banner" href="${waiting ? '#/online' : '#/h2h'}"><span>⚔️</span><span><b>Head to Head</b><small>${waiting ? `🌐 ${waiting} online game${waiting > 1 ? 's' : ''} waiting for your move` : h2h ? `${GM.esc(h2h.names[0])} v ${GM.esc(h2h.names[1])}: tap to carry on` : 'Pass the phone, or play your mates online'}</small></span><span>🏆</span><i class="online-badge" ${waiting ? '' : 'hidden'}>${waiting}</i></a>
      ${club ? `<div class="tile club-tile wide target-tile"><span class="tile-icon">🏟️</span><b>${GM.esc(club)} XI</b><small>Ultimate Wildcard with only ${GM.esc(club)} players. Their whole PL careers count.</small>${GM.nextMatchLine()}<a class="next-match" href="#/clubs">🏆 Club v club: this week’s table ›</a>
        <span class="stat-pick">${statBtn('club', 'goals')}${statBtn('club', 'assists')}${statBtn('club', 'apps')}</span></div>` : ''}
      </div>
      <div data-hpanel="targets">
      <div class="tile t-red wide target-tile"><span class="tile-icon">🎯</span><b>Target</b><small>Hit the number exactly for a bullseye.</small>
        <span class="stat-pick">${statBtn('target', 'goals', '500 goals')}${statBtn('target', 'assists', '325 assists')}${statBtn('target', 'apps', '3,400 apps')}</span></div>
      <div class="tiles">
        ${tile('#/draft?m=treble', 't-gold', '🏆', 'The Treble', '400 goals, 300 assists AND 3,300 apps', pb('treble'))}
        ${tile('#/draft?m=mystery', 't-magenta', '🎲', 'Mystery Target', 'Secret number. Follow the thermometer.', pb('mystery'))}
      </div>
      </div>
      <div data-hpanel="market">
      <div class="tiles">
        ${tile('#/owner', 't-navy wide', '🕴️', 'Dodgy Owner', 'You’ve bought a club. Hire and sack coaches, meddle, wheel and deal, and try to stay one step ahead of the league’s investigators.', pb('owner') ? Math.floor(pb('owner') / 100) + ' pts' : 0)}
        ${tile('#/moneyball', 't-green wide', '💼', 'Moneyball', 'Chairman for a season: buy low, sell high, and get rich. Bids, injuries, takeovers and Deadline Day.', pb('money') ? '£' + pb('money') + 'm' : 0)}
        ${dtile('moneyball', 't-gold', 'Same season for everyone · one go')}
        ${tile('#/auction', 't-magenta', '🔨', 'Auction', 'Secret bids against a mate', 0)}
      </div>
      </div>
      <div data-hpanel="quick">
      <div class="tiles">
        ${tile('#/hopper', 't-teal', '🦘', 'Club Hopper', 'Club to club through players. 90s.', pb('hopper'))}
        ${tile('#/hilo', 't-orange', '↕️', 'Higher or Lower', 'More goals? More apps?', pb('hilo'))}
        ${tile('#/whoami', 't-indigo', '🕵️', 'Who Am I?', 'Guess the player from the clues', pb('whoami'))}
        ${tile('#/tally', 't-amber', '🔢', 'Guess the Tally', 'How many PL goals?', pb('tally'))}
        ${tile('#/grid', 't-navy wide', '🔀', 'Random Club Grid', 'Endless grids. Obscure answers score more.', pb('grid'))}
      </div>
      <h3 class="section-title">Your collection</h3>
      <a class="tile t-purple wide album-tile" href="#/album"><span class="tile-icon">📒</span><b>Album & badges</b>
        <small>${album.players.toLocaleString()}/${GM.players.length.toLocaleString()} players · ${album.badges}/${album.totalBadges} badges${album.purist ? ` · 💎 ${album.purist.toLocaleString()} purist` : ''}</small>
        <span class="bar"><i style="width:${(100 * album.players / GM.players.length).toFixed(1)}%"></i></span></a>
      <a class="tile t-navy wide" href="#/players"><span class="tile-icon">📖</span><b>Player index</b><small>All ${GM.allPlayers ? GM.allPlayers.length.toLocaleString() : '5,000+'} Premier League players, and how often you've signed them</small></a>
      ${GM.secretTiles()}
      </div>
      <button class="btn ghost share-game" id="share-game">📣 Share Goal Machine with your mates</button>
      <footer class="muted center">Playing as <a href="#/settings?s=account">${GM.account() ? '🔒 ' : ''}${GM.esc(GM.getName() || 'no name yet')}</a> · <a href="#/updates">v${GM.versionLabel}</a></footer>`;
    const showTab = t => {
      GM.store.set('homeTab', t);
      GM.$$('#htabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
      GM.$$('[data-hpanel]').forEach(el => { el.hidden = el.dataset.hpanel !== t; });
    };
    GM.$$('#htabs button').forEach(b => b.onclick = () => showTab(b.dataset.t));
    showTab(htab);
    GM.$$('[data-level]').forEach(b => b.onclick = () => {
      if (b.dataset.level === 'extreme' && GM.level() !== 'extreme') GM.toast('⚡ <b>Extreme:</b> all 5,000+ PL players on the reels and markets, and no name suggestions when you type', 3400);
      GM.setLevel(b.dataset.level); home();
    });
    GM.$('#share-game').onclick = () => GM.shareGame();
    GM.promoWire();
    GM.secretCelebrate();
    GM.syncProfile();  // your club and level, for club v club and the boards (only when they change)
    if (GM.online && GM.online.check) GM.online.check().then(() => {  // refresh the banner if the count changed
      const n = GM.store.get('onlineWaiting', 0), sm = GM.$('.h2h-banner small');
      if (sm && n !== waiting && location.hash.replace(/^#\/?/, '') === '') home();
    });
    GM.$$('[data-pool]').forEach(b => b.onclick = () => { GM.store.set('ultPool', b.dataset.pool); home(); });
    GM.$$('[data-wild]').forEach(b => b.onclick = () => { GM.store.set('ultWild', b.dataset.wild === '1'); home(); });
    const ib = GM.$('#install');
    if (ib) {
      if (installEvt) ib.hidden = false;
      ib.onclick = async () => {
        if (!installEvt) return;
        installEvt.prompt();
        const { outcome } = await installEvt.userChoice;
        installEvt = null;
        if (outcome === 'accepted') { GM.store.set('installed', true); GM.$$('.install-bar').forEach(b => b.remove()); }
      };
    }
    // downloading the APK counts as installing – don't nag again on this browser
    const ga = GM.$('#getapk'); if (ga) ga.addEventListener('click', () => GM.store.set('installed', true));
    const ix = GM.$('#install-x'); if (ix) ix.onclick = () => { GM.store.set('installed', true); GM.$$('.install-bar').forEach(b => b.remove()); };
    // hide the bar entirely on desktop until Chrome actually offers an install
    const bar = GM.$('.install-bar'); if (bar && ib && !installEvt) bar.hidden = true;
    window.addEventListener('beforeinstallprompt', () => { const b2 = GM.$('.install-bar'); if (b2 && !installHidden()) b2.hidden = false; }, { once: true });
  }

  /* ---------------------------------------------------------------- settings */
  function settings() {
    const seg = (id, opts, on) => `<div class="seg" id="${id}">${Object.entries(opts).map(([k, l]) => `<button data-v="${k}" class="${k === String(on) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const build = GM.appBuild(), snd = GM.sound.settings();
    // Settings is a short menu; each row opens one group (#/settings?s=account …). All groups are drawn and the
    // others hidden, so the wiring below works the same on every sub-page.
    const inApp = GM.app('notificationsAllowed') !== undefined, np = GM.notify.prefs();
    const GROUPS = [
      ['account', '👤 Account', GM.account() ? '🔒 ' + GM.esc(GM.account().name) : 'No name claimed yet'],
      ['look', '🎨 Look & club', `${GM.THEMES[GM.getTheme()] || ''} · ${GM.favClub() ? GM.esc(GM.clubShort(GM.favClub())) : 'No club'}`],
      ['sound', '🔊 Sound & vibration', `Effects ${snd.sfx ? 'on' : 'off'} · Music: ${{ off: 'off', music: 'game', tunes: 'soundtrack' }[snd.bg]}`],
      ...(inApp ? [['notify', '🔔 Notifications', `${GM.notify.KINDS.filter(([k]) => np[k]).length + (np.daily ? 1 : 0)} of ${GM.notify.KINDS.length + 1} on`]] : []),
      ...(inApp && GM.app('pgsAvailable') ? [['pgs', '🏆 Google Play Games', 'Sign-in, achievements, leaderboards']] : []),
      ['play', '🎮 Gameplay', GM.LEVELS[GM.level()].slice(0, 2).join(' ')],
    ];
    const sub = GROUPS.some(g => g[0] === parseHash().q.s) ? parseHash().q.s : '';
    const grp = (g, html) => `<div class="sgroup" ${g === sub ? '' : 'hidden'}>${html}</div>`;
    app.innerHTML = `<div class="topbar"><a href="${sub ? '#/settings' : '#/'}" class="back">‹</a><h2>${sub ? GROUPS.find(g => g[0] === sub)[1] : '⚙️ Settings'}</h2><span></span></div>
      ${sub ? '' : `<section class="settings links smenu">${GROUPS.map(([k, l, v]) => `<a href="#/settings?s=${k}">${l}<small>${v}</small><span>›</span></a>`).join('')}</section>`}
      <section class="settings" ${sub ? '' : 'hidden'}>
        ${grp('account', `<div class="setting"><b>Account</b>${GM.account()
          ? `<small>Your leaderboard name is <b>🔒 ${GM.esc(GM.account().name)}</b>. It's yours alone: only this device can post scores with it.</small>
            <div class="pic-row">${GM.userPic(GM.account().name, 'lg')}<div><b>Profile picture</b><small>Friends and opponents see it in online games and your weekly league</small>
              <div class="setting-btns"><label class="btn small">📷 Choose a photo<input type="file" id="s-pic" accept="image/*" hidden></label><button class="btn ghost small" id="s-picdel">Remove</button></div></div></div>
            <div id="s-hidden"></div>
            <div class="setting-btns"><button class="btn ghost small" id="s-move">📲 Move to another phone</button><button class="btn ghost small" id="s-name">✏️ New name</button></div>
            <div class="setting-btns"><button class="btn ghost small" id="s-backup">☁️ Back up now</button><button class="btn ghost small" id="s-restore">⤵️ Restore a backup</button></div>
            <small>${GM.store.get('backupAt', 0) ? `Last backup: ${new Date(GM.store.get('backupAt')).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. ` : ''}Your album, stats, streaks and scores back up automatically after games.</small>
            <button class="btn ghost small danger" id="s-delete">🗑️ Delete my account</button>`
          : `<small>${GM.getName() ? `You play as “${GM.esc(GM.getName())}”, but it isn't claimed yet.` : 'No leaderboard name yet.'} Claim a unique name so nobody else can post scores as you.</small>
            <div class="setting-btns"><button class="btn small" id="s-name">🔒 Claim a name</button><button class="btn ghost small" id="s-code">🔑 I have a transfer code</button></div>`}</div>`)}
        ${grp('look', `<div class="setting"><b>Appearance</b><small>Auto follows your phone's light or dark setting. Club paints the game in your favourite club's colours</small>${seg('s-theme', GM.THEMES, GM.getTheme())}</div>
        <div class="setting"><b>Favourite club</b><small>Unlocks Club Footle and Club XI, and brings your club's colours to the app</small>
          <select class="input" id="s-club"><option value="">None</option>${GM.clubOptions().map(c => `<option ${c === GM.favClub() ? 'selected' : ''}>${GM.esc(c)}</option>`).join('')}</select></div>
        <div class="setting"><b>Animations</b><small>Full: the coin flips, the tornado tears through, the ambulance drives on. Calm keeps movement to a minimum</small>${seg('s-calm', { false: '🎬 Full', true: '🍃 Calm' }, GM.calm())}</div>`)}
        ${grp('sound', `<div class="setting"><b>Sound effects</b><small>Whistles, reels, the crowd and the goal horn</small>${seg('s-sfx', { true: '🔊 On', false: '🔇 Off' }, snd.sfx)}
          <label class="vol">🔈<input type="range" id="s-sfxvol" min="0" max="1" step="0.05" value="${snd.sfxVol}">🔊</label></div>
        <div class="setting"><b>Music</b><small id="s-bg-about"></small>${seg('s-bg', GM.playSafe ? { off: '🔇 Off', music: '🎹 Game' } : { off: '🔇 Off', music: '🎹 Game', tunes: '🎧 Soundtrack' }, snd.bg)}
          <label class="vol">🔈<input type="range" id="s-bgvol" min="0" max="1" step="0.05" value="${snd.bgVol}">🔊</label>
          <div class="now-playing" id="s-now" hidden><span></span><button class="btn ghost small" id="s-skip">⏭ Next song</button></div></div>
          <div class="setting"><b>Vibration</b><small>A little buzz on taps, hops and wins (phones only)</small>${seg('s-buzz', { true: '📳 On', false: '🔕 Off' }, GM.store.get('buzz', true))}</div>`)}
        ${inApp ? grp('notify', `<div class="setting"><b>Notifications</b><small>A whistle for the things you choose below. The app checks about every 15 minutes while it's closed.</small>
          <div class="ntoggles">${GM.notify.KINDS.map(([k, l, d]) => `<label><span><b>${l}</b><small>${d}</small></span><input type="checkbox" data-nk="${k}" ${GM.notify.prefs()[k] ? 'checked' : ''}></label>`).join('')}
            <label><span><b>📅 Daily reminder</b><small>A nudge to play the daily games, if you haven't yet</small></span><select class="input" id="s-ndaily"><option value="">Off</option>${Array.from({ length: 31 }, (_, i) => { const t = String(7 + Math.floor(i / 2)).padStart(2, '0') + (i % 2 ? ':30' : ':00'); return `<option ${GM.notify.prefs().daily === t ? 'selected' : ''}>${t}</option>`; }).join('')}</select></label></div>
          <div id="s-nstatus" class="nstatus"></div>
          <div class="setting-btns"><button class="btn ghost small" id="s-ntest">🔔 Send a test</button><button class="btn ghost small" id="s-ncheck">🔄 Check now</button><button class="btn ghost small" id="s-notif">⚙️ Phone settings</button></div></div>`) : ''}
        ${inApp && GM.app('pgsAvailable') ? grp('pgs', `<div class="setting"><b>🏆 Google Play Games</b><small>Your badges, scores and stats go to your Play Games profile when you’re signed in.</small>
          <div id="s-pgs" class="nstatus"><span>Checking…</span></div>
          <div class="setting-btns"><button class="btn ghost small" id="s-pgsin">🔑 Sign in</button><button class="btn ghost small" id="s-pgsbadges">🏅 My achievements</button><button class="btn ghost small" id="s-pgsboards">🏆 Leaderboards</button></div></div>`) : ''}
        ${grp('play', `<div class="setting"><b>Difficulty</b><small>Hard hides clubs, years and appearances: names and positions only, and in the Target games big-name players turn up less often. Extreme brings in every one of the 5,000+ PL players, not just the 50+ app ones, in the Main event, CHAOS, the Target and money games, Higher or Lower and Guess the Tally. Where you type names (Who Am I?, the Club Grid, Club Hopper) every PL player always counts, and Extreme turns the suggestions off: type the whole name. The daily games stay the same for everyone. Each level has its own leaderboards</small>${seg('s-level', Object.fromEntries(Object.entries(GM.LEVELS).map(([k, [i, n]]) => [k, i + ' ' + n])), GM.level())}</div>`)}
      </section>
      <section class="settings links" ${sub ? 'hidden' : ''}>
        <a href="#" id="s-share">📣 Share Goal Machine with a friend<span>›</span></a>
        <a href="#" id="s-feedback">✉️ Report a bug or suggest something<span>›</span></a>
        <a href="#" id="s-howto">❓ How Goal Machine works<span>›</span></a>
        <a href="#/updates">📰 Updates & version history ${GM.hasUnseenUpdate() ? '<i class="new-dot inline"></i>' : ''}<span>›</span></a>
        <a href="#/about">ℹ️ About the data<span>›</span></a>
        ${build == null ? `<a href="${GM.APK_URL}">🤖 Android app (APK)<span>›</span></a>` : ''}
        <a href="privacy.html">🔐 Privacy policy<span>›</span></a>
      </section>
      ${sub ? '' : `<p class="muted center">Goal Machine v${GM.versionLabel}${build != null ? ` · App build ${build}` : ''}<br>Made by Opportunistic Games</p>`}`;
    const wire = (id, fn) => GM.$$('#' + id + ' [data-v]').forEach(b => b.onclick = () => {
      fn(b.dataset.v); GM.buzz(); GM.$$('#' + id + ' button').forEach(x => x.classList.toggle('on', x === b));
    });
    const nb = GM.$('#s-notif'); if (nb) nb.onclick = () => GM.app('openNotificationSettings');
    GM.$$('[data-nk]').forEach(c => c.onchange = () => { GM.notify.set(c.dataset.nk, c.checked); GM.buzz(); });
    const nd = GM.$('#s-ndaily'); if (nd) nd.onchange = () => { GM.notify.set('daily', nd.value || null); GM.toast(nd.value ? `📅 Daily reminder at ${nd.value}` : 'Daily reminder off'); };
    // notification health, from the app (build 16+): permission, the 15-minute check, and what it last found
    const nstatus = () => {
      const el = GM.$('#s-nstatus'); if (!el) return;
      let st = null; try { st = JSON.parse(GM.app('notifyStatus') || 'null'); } catch (e) { }
      const allowed = GM.app('notificationsAllowed');
      if (!st) { el.innerHTML = `<span>${allowed ? '🔔 Allowed' : '🔕 Not allowed'}</span><span class="muted">Update the app to see more</span>`; return; }
      const ago = st.lastRun ? Math.round((Date.now() - st.lastRun) / 60000) : null;
      const mins = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 120 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; };
      // app build 26+ says why checks might not be running: the schedule, background runs and battery limits
      const sched = st.scheduled ? '✅ Checking every ~15 min'
        : !GM.account() ? '🔒 Claim a name on the Online tab first'
        : st.sched && st.sched !== 'scheduled' ? `⚠️ Not scheduled: ${GM.esc(st.sched)}`
        : '⚠️ Not scheduled yet – open the app again, or tap Check now';
      el.innerHTML = `<span>${st.allowed && st.enabled ? '✅ Allowed' : '❌ Not allowed – tap Phone settings'}</span>
        ${'push' in st ? `<span>${st.push ? '⚡ Instant notifications on' : st.pushErr ? `⚠️ Instant notifications off: ${GM.esc(st.pushErr.slice(0, 90))}. Check Google Play services is up to date` : '⏳ Instant notifications: waiting for Google Play services (reopen the app in a minute)'}${st.lastPush ? ` · last one ${mins(st.lastPush)}` : ''}</span>` : ''}
        <span>${sched}</span>
        ${st.restricted ? '<span>⚠️ Your phone limits Goal Machine’s battery use, so it can’t check in the background. Phone settings → Battery → <b>Unrestricted</b> (or Optimised)</span>' : ''}
        ${st.bucket >= 40 ? `<span>💤 Android runs Goal Machine’s checks rarely (it’s been used little lately). Opening it more often speeds them up.</span>` : ''}
        ${'lastJob' in st ? `<span>${st.lastJob ? `Last background check ${mins(st.lastJob)}` : 'No background check yet'}</span>` : ''}
        <span>${ago == null ? 'No check yet' : `Last check ${mins(st.lastRun)}: ${GM.esc(st.lastResult)}${st.lastCount >= 0 ? ` · ${st.lastCount} waiting` : ''}`}</span>`;
    };
    nstatus();
    const pgsLine = () => { const el = GM.$('#s-pgs'); if (el) el.innerHTML = `<span>${GM.esc(GM.app('pgsStatus') || 'Update the app to see this')}</span>`; };
    if (GM.$('#s-pgs')) { pgsLine(); setTimeout(pgsLine, 2500); }
    const pi = GM.$('#s-pgsin'); if (pi) pi.onclick = () => { GM.app('pgsSignIn'); [1500, 4000, 8000].forEach(t => setTimeout(pgsLine, t)); };
    const pb = GM.$('#s-pgsbadges'); if (pb) pb.onclick = () => GM.app('pgsShow');
    const pl = GM.$('#s-pgsboards'); if (pl) pl.onclick = () => GM.app('pgsBoards');
    const nt = GM.$('#s-ntest');
    if (nt) nt.onclick = () => {
      if (GM.app('notificationsAllowed') === false) { GM.app('askNotifications'); GM.app('openNotificationSettings'); return; }
      if (typeof (window.AndroidApp || {}).testNotification !== 'function') { GM.toast('Update the app to send a test'); return; }
      GM.app('testNotification');
      GM.toast('🔔 Sent – check your notifications');
    };
    const nc = GM.$('#s-ncheck');
    if (nc) nc.onclick = () => {
      if (GM.online && GM.online.check) { GM.online._checked = 0; GM.online.check(); }  // makes sure the app knows who you are
      if (typeof (window.AndroidApp || {}).checkNow !== 'function') { GM.toast('Update the app for this'); return; }
      GM.app('checkNow'); GM.toast('🔄 Checking…');
      setTimeout(nstatus, 2500); setTimeout(nstatus, 6000);
    };
    GM.$('#s-howto').onclick = e => { e.preventDefault(); GM.welcome(); };
    GM.$('#s-feedback').onclick = e => { e.preventDefault(); GM.feedback(); };
    GM.$('#s-share').onclick = e => { e.preventDefault(); GM.shareGame(); };
    wire('s-theme', v => { GM.setTheme(v); if (v === 'club' && !GM.favClub()) GM.toast('🏟️ Pick your favourite club below to see its colours'); });
    wire('s-level', v => GM.setLevel(v));
    wire('s-buzz', v => GM.store.set('buzz', v === 'true'));
    wire('s-calm', v => { GM.store.set('calm', v === 'true'); GM.applyCalm(); });
    GM.$('#s-club').onchange = e => { GM.setFavClub(e.target.value); GM.sound.play('whistle'); if (e.target.value) GM.toast(`🏟️ Welcome, ${GM.esc(GM.clubShort(e.target.value))} fan!`); };
    wire('s-sfx', v => { GM.sound.set('sfx', v === 'true'); GM.sound.play('whistle'); });
    const bgInfo = () => {
      const v = GM.sound.settings().bg, t = GM.sound.nowPlaying();
      GM.$('#s-bg-about').textContent = v === 'tunes' ? 'Real songs on shuffle, the same wherever you are in the game'
        : 'Made for the game: Anthem on the menus, Matchday for team builders, Thinking Cap for puzzles, Derby for head-to-heads and Boardroom for Moneyball';
      GM.$('#s-now').hidden = v !== 'tunes';
      GM.$('#s-now span').innerHTML = t ? `🎧 <b>${GM.esc(t.title)}</b>${t.artist ? `<small>${GM.esc(t.artist)}</small>` : ''}` : '🎧 Tap anywhere to start';
    };
    bgInfo();
    document.addEventListener('gm-tune', () => { if (GM.$('#s-now')) bgInfo(); });
    wire('s-bg', v => { GM.sound.set('bg', v); bgInfo(); });
    GM.$('#s-skip').onclick = () => GM.sound.skipTune();
    GM.$('#s-sfxvol').onchange = e => { GM.sound.set('sfxVol', +e.target.value); GM.sound.play('good'); };
    GM.$('#s-bgvol').oninput = e => GM.sound.set('bgVol', +e.target.value);
    GM.$('#s-name').onclick = async () => {
      if (GM.account()) await GM.accountModal('Your scores, friends, online games and backup come with you.', true);
      else await GM.askName();
      settings();
    };
    GM.hiddenNameBanner(GM.$('#s-hidden'));
    const mv = GM.$('#s-move');
    if (mv) mv.onclick = () => {
      const code = GM.transferCode();
      const m = GM.modal(`<h3>📲 Move to another phone</h3><p>On the new phone, open ⚙️ Settings → Account → <b>I have a transfer code</b> and paste this code:</p>
        <div class="code-box">${code}</div><p class="muted">Keep it private: anyone with this code can post scores as you.</p>
        <div class="row"><button class="btn ghost" data-close>Done</button><button class="btn" id="copycode">📋 Copy</button></div>`);
      GM.$('#copycode', m.el).onclick = async () => { try { await navigator.clipboard.writeText(code); GM.toast('Copied'); } catch (e) { GM.toast('Press and hold the code to copy it'); } };
    };
    const pf = GM.$('#s-pic');
    if (pf) pf.onchange = async () => {
      const f = pf.files && pf.files[0]; if (!f) return;
      let img;
      try { img = await GM.shrinkPhoto(f); } catch (e) { GM.toast('That file isn’t a photo I can read'); return; }
      const r = await GM.setMyPic(img);
      GM.toast(r === 'ok' ? '📷 Looking good!' : r === 'offline' ? 'Couldn’t reach the server – try again' : 'Couldn’t use that photo');
      settings();
    };
    const pd = GM.$('#s-picdel');
    if (pd) pd.onclick = async () => { if ((await GM.setMyPic(null)) === 'ok') { GM.pics[GM.account().name.toLowerCase()] = null; settings(); } };
    const bk = GM.$('#s-backup');
    if (bk) bk.onclick = async () => {
      const r = await GM.backup.save(false);
      GM.toast(r === 'ok' ? '☁️ Backed up' : r === 'too_big' ? 'Your data is too big to back up' : 'Couldn’t reach the server – try again');
      if (r === 'ok') settings();
    };
    const rs = GM.$('#s-restore'); if (rs) rs.onclick = () => offerRestore(false);
    const del = GM.$('#s-delete');
    if (del) del.onclick = async () => {
      if (!await GM.confirm(`🗑️ Delete “${GM.esc(GM.getName())}”? Your name, leaderboard scores, friends, online games and backup are removed from our server for good. Your album stays on this phone.`, 'Delete', 'Cancel')) return;
      const a = GM.account();
      try {
        const r = await GM.lb.rpc('delete_account', { p_user: a.name, p_key: a.key });
        if (r !== 'deleted') throw new Error(r);
        GM.store.set('account', null); GM.store.set('name', ''); GM.store.set('backupAt', 0);
        GM.toast('Your account has been deleted');
        settings();
      } catch (e) { GM.toast('Couldn’t reach the server – try again'); }
    };
    async function offerRestore(afterMove) {
      const b = await GM.backup.fetch();
      if (!b || b.none) { if (!afterMove) GM.toast('No backup found for this name yet'); return; }
      const when = new Date(b.updated).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      if (await GM.confirm(`⤵️ Restore your backup from ${when}? It replaces the album, stats and scores on this phone.`, 'Restore', 'Not now')) GM.backup.restore(b.data);
    }
    const cd = GM.$('#s-code');
    if (cd) cd.onclick = async () => {
      const code = await GM.prompt('Paste your transfer code', '', 'from Settings on your old phone', 200);
      if (!code) return;
      const r = await GM.useTransferCode(code);
      GM.toast(r === 'ok' ? `🔒 Welcome back, ${GM.esc(GM.getName())}` : r === 'offline' ? 'Couldn’t reach the leaderboard – try again' : 'That code doesn’t match any account');
      settings();
      if (r === 'ok') offerRestore(true);
    };
  }

  /* ---------------------------------------------------------------- leaderboard */
  // Leaderboards, simply: one row of games, one line of drop-downs for what applies (version, stat, Normal/Hard, this
  // month or all time), then you and the board. Club v club and the Daily stars live here too.
  async function leaderboard(m) {
    const club = GM.favClub(), today = GM.today();
    const nations = [...new Set([GM.store.get('nation', 'England')].concat(GM.store.get('nationsPlayed', [])))].slice(0, 8).map(n => 'nation' + GM.slug(n));
    const GAMES = [
      ['⚽ Main event', ['ultimate', 'ultimatepure', 'classicwild', 'classic']],
      ['🌪️ CHAOS', ['chaos', 'dchaos:' + today]],
      [GM.calIcon() + ' Daily', ['daily:' + today, 'footle:' + today, 'grid:' + today, 'dmoney:' + today, 'dailies']],
    ].concat(club ? [['🏟️ Your club', ['clubs', 'club' + GM.slug(club)].concat(GM.nextMatch(club) ? ['match:' + GM.nextMatch(club).id] : [])]] : [])
      .concat(GM.intlBreak() || GM.store.get('nationsPlayed', []).length ? [['🌍 International', nations]] : [])
      .concat([['🃏 Packed XI', ['packedxi']], ['🎯 Targets', ['target', 'treble', 'mystery']], ['💰 Market', ['owner', 'money']], ['⚡ Quick', ['hopper', 'hilo', 'whoami', 'grid', 'tally']]]);
    const NAMES = { classicwild: 'Classic Wildcard', classic: 'Classic', ultimate: 'Ultimate Wildcard', ultimatepure: 'Ultimate', extreme: 'Extreme Wildcard', purist: 'Extreme Purist',
      chaos: 'CHAOS', chaosx: 'CHAOS Extreme', target: 'Target', treble: 'The Treble', mystery: 'Mystery Target', money: 'Moneyball', owner: 'Dodgy Owner', dailies: 'Daily stars', clubs: 'Club v club', packedxi: 'Packed XI' };
    const SUFFIX = { goals: '', assists: 'ast', apps: 'apps' };
    const hasStats = b => !!GM.MODES[b + 'ast'];
    // m → base board, stat, level (Normal / Hard / Extreme), and the option for Club v club (week) or Daily stars (sort)
    let base = m || '', stat = 'goals', lv = m ? 'normal' : GM.level(), opt = '';
    if (/^(dailies|clubs):/.test(base)) { [base, opt] = base.split(':'); }
    if (base && /h$/.test(base) && GM.MODES[base] && GM.HARD_MODES.includes(base.slice(0, -1))) { lv = 'hard'; base = base.slice(0, -1); }
    for (const [st, suf] of [['assists', 'ast'], ['apps', 'apps']]) if (base.endsWith(suf) && GM.MODES[base] && GM.MODES[base.slice(0, -suf.length) + 'ast']) { stat = st; base = base.slice(0, -suf.length); break; }
    // Extreme boards: the Main event's and CHAOS's have their own names, the rest end in x (targetx, hilox…)
    const XOF = { ultimate: 'extreme', classicwild: 'extreme', ultimatepure: 'purist', classic: 'purist', chaos: 'chaosx' };
    const XBACK = { extreme: 'ultimate', purist: 'ultimatepure', chaosx: 'chaos' };
    if (XBACK[base]) { lv = 'extreme'; base = XBACK[base]; }
    else if (/x$/.test(base) && GM.EXTREME_GAMES.includes(base.slice(0, -1))) { lv = 'extreme'; base = base.slice(0, -1); }
    const hard = lv === 'hard';
    let g = GAMES.findIndex(x => x[1].includes(base));
    const special = base === 'clubs' || base === 'dailies';
    if (g < 0) { g = 0; base = 'ultimate'; }
    const keyFor = (b, st = stat, l = lv) => {
      const k = b + (hasStats(b) ? SUFFIX[st] : '');
      if (l === 'extreme') { if (XOF[b]) return XOF[b] + (hasStats(XOF[b]) ? SUFFIX[st] : ''); if (GM.extremeKey(k)) return GM.extremeKey(k); }
      return l === 'hard' && GM.HARD_MODES.includes(k) ? k + 'h' : k;
    };
    const levels = special ? [] : ['normal'].concat(GM.HARD_MODES.includes(keyFor(base, stat, 'normal')) ? ['hard'] : [], keyFor(base, stat, 'extreme') !== keyFor(base, stat, 'normal') ? ['extreme'] : []);
    m = special ? base : keyFor(base);
    const name = k => k.startsWith('daily:') ? 'Daily Ultimate' : k.startsWith('grid:') ? 'Club Grid' : k.startsWith('footle:') ? 'Footle' : /^(mbdaily|dmoney):/.test(k) ? 'Daily Moneyball'
      : k.startsWith('dchaos:') ? 'Daily CHAOS' : k.startsWith('match:') ? GM.matchTitle(k) : NAMES[k] || ((GM.MODES[k] || {}).name || k).replace(/ \(Hard\)| – .*$/g, '');
    const link = k => `#/leaderboard?m=${encodeURIComponent(k)}`;
    const variants = GAMES[g][1];
    const sel = (id, opts, on) => `<select class="lbx-sel" id="${id}">${opts.map(([v, l]) => `<option value="${GM.esc(v)}" ${v === on ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const DSORT = { big_days: '⚽ 450+ days', footle_wins: '🟩 Footle wins', grid_days: '#️⃣ Grids', best_streak: '🔥 Streaks' };
    const filters = [
      variants.length > 1 ? sel('lbv', variants.map(k => [k, name(k)]), base) : '',
      !special && hasStats(base) ? sel('lbs', Object.entries(GM.STATS).map(([k, st]) => [k, `${st.icon} ${st.name}`]), stat) : '',
      levels.length > 1 ? sel('lbh', levels.map(l => [l, GM.LEVELS[l][0] + ' ' + GM.LEVELS[l][1]]), lv) : '',
      !special && !/:/.test(m) ? sel('lbp', [['1', '📅 This month'], ['0', '🏆 All time']], GM.lbMonth() ? '1' : '0') : '',
      base === 'clubs' ? sel('lbw', [['0', '📅 This week'], ['1', '⏪ Last week']], opt === '1' ? '1' : '0') : '',
      base === 'dailies' ? sel('lbd', Object.entries(DSORT), DSORT[opt] ? opt : 'big_days') : '',
    ].join('');
    const NOTES = { chaos: '🌪️ Total points: your XI’s tally plus every bonus.', footle: '🟩 8 points for a first-guess win, down to 1 on the last guess.',
      clubs: 'Every fan’s Daily Ultimate this week counts for their club. Same spins for everyone, so the table is the average; a club needs 3 games to be ranked.',
      dailies: 'Everyone’s daily results count, and you don’t need a streak.', packedxi: 'Your best XI from finished cards (📒 Album).' };
    const note = NOTES[/^d?chaos/.test(m) ? 'chaos' : m.split(':')[0]] || '';
    app.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🏆 Leaderboards</h2><span></span></div>
      <div class="lbx-games">${GAMES.map(([l, v], i) => `<a class="${i === g ? 'on' : ''}" href="${link(v[0] === 'clubs' || v[0] === 'dailies' ? v[0] : keyFor(v[0]))}">${l}</a>`).join('')}</div>
      ${filters ? `<div class="lbx-filters">${filters}</div>` : ''}
      ${note ? `<p class="muted small lbx-note">${note}</p>` : ''}
      <div id="lbhidden"></div>
      <div id="lbbody"></div>`;
    const on = GM.$('.lbx-games a.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    const go = k => { location.hash = link(k); };
    const ch = (id, f) => { const e = GM.$('#' + id); if (e) e.onchange = () => f(e.value); };
    ch('lbv', v => go(v === 'clubs' || v === 'dailies' ? v : keyFor(v)));
    ch('lbs', v => go(keyFor(base, v)));
    ch('lbh', v => go(keyFor(base, stat, v)));
    ch('lbp', v => { GM.store.set('lbMonth', v === '1'); leaderboard(m); });
    ch('lbw', v => go('clubs' + (v === '1' ? ':1' : '')));
    ch('lbd', v => go('dailies:' + v));
    const body = GM.$('#lbbody');
    if (base === 'clubs') return GM.clubsBody(body, opt === '1' ? 1 : 0);
    if (base === 'dailies') return dailyBody(body, DSORT[opt] ? opt : 'big_days');
    GM.hiddenNameBanner(GM.$('#lbhidden'));
    const spread = /^(ultimate|club|classic|extreme|purist)/.test(m) || m.startsWith('daily:');  // (keyed by board, Extreme included)
    body.innerHTML = `<div class="lb" id="lbyou"></div>
      ${GM.lb.enabled ? `<h3 class="section-title">🌍 ${/:/.test(m) ? 'Everyone' : GM.lbMonth() ? new Date().toLocaleDateString(undefined, { month: 'long' }) : 'All time'}</h3><div id="global" class="lb"><div class="muted">Loading…</div></div>`
        : '<div class="banner">The global leaderboard isn’t switched on – use <b>⚔️ Challenge a friend</b> after a game to go head-to-head on the same spins.</div>'}
      ${spread ? `<details class="set lbx-spread"><summary><span>📊 Your spread</span></summary>${m.startsWith('daily:') ? GM.distHtml('daily', 'goals') : GM.distHtml(m, stat)}</details>` : ''}`;
    GM.lbYou(m, GM.$('#lbyou'));
    if (!GM.lb.enabled) return;
    try {
      const rows = await GM.lb.top(m), pts = /^d?chaos/.test(m), me = GM.getName(), el = GM.$('#global');
      if (!el) return;
      el.innerHTML = rows.length ? rows.map((r, i) =>
        `<div ${GM.lbRow(r.name, me)}><span>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span>${GM.esc(r.name)}${GM.lbLevel(r)}${GM.pctTag(m, r.meta)}</span><b>${GM.scoreText(m, r.score)}${pts ? '<small> pts</small>' : ''}</b></div>`).join('')
        + (rows.some(r => r.name !== me) ? GM.lbReportHint : '')
        : '<div class="muted">No scores yet – be the first!</div>';
    } catch (e) { const el = GM.$('#global'); if (el) el.innerHTML = '<div class="muted">Couldn’t load the board.</div>'; }
  }

  // the Daily stars: who's played the dailies best, by a few measures
  async function dailyBody(el, sort) {
    const me = GM.getName(), l = GM.dailyLog();
    el.innerHTML = `<div class="dstats">
        <div><b>${Object.values(l).filter(e => e.daily >= 450).length}</b><small>your 450+ days</small></div>
        <div><b>${Object.values(l).filter(e => e.footle > 0).length}</b><small>Footle wins</small></div>
        <div><b>${Object.values(l).filter(e => e.grid != null).length}</b><small>Grids</small></div>
        <div><b>${GM.bestStreak()}</b><small>Best streak</small></div></div>
      <div id="dboard" class="lb">${GM.lb.enabled ? '<div class="muted">Loading…</div>' : '<div class="muted">The global leaderboard is switched off.</div>'}</div>`;
    if (!GM.lb.enabled) return;
    try {
      const rows = await GM.lb.dailyBoard(sort), box = GM.$('#dboard');
      if (!box) return;
      box.innerHTML = rows.length ? rows.map((r, i) => `<div ${GM.lbRow(r.name, me)}><span>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
        <span>${GM.esc(r.name)}<small class="muted"> · ${r.days_played} day${r.days_played === 1 ? '' : 's'}${r.current_streak > 1 ? ` · 🔥${r.current_streak}` : ''}</small></span><b>${r[sort]}</b></div>`).join('')
        + (rows.some(r => r.name !== me) ? GM.lbReportHint : '')
        : '<div class="muted">No daily results yet. Be the first!</div>';
    } catch (e) { const box = GM.$('#dboard'); if (box) box.innerHTML = '<div class="muted">Couldn’t load the daily board.</div>'; }
  }

  /* ---------------------------------------------------------------- player index */
  function playerIndex() {
    const from = menuTrail.filter(h => h !== location.hash).pop() || '#/';
    app.innerHTML = `<div class="topbar"><a href="${GM.esc(from)}" class="back">‹</a><h2>📖 Player index</h2><span></span></div>
      ${GM.albumTabs('players')}
      <div class="filters"><input class="input" id="pq" placeholder="Search name…" autocomplete="off">
      <select class="input" id="pc"><option value="">All clubs</option>${GM.clubs.map(c => `<option>${GM.esc(c)}</option>`).join('')}</select>
      <select class="input" id="pa"><option value="1">Every PL player</option><option value="50">50+ apps</option><option value="100">100+ apps</option><option value="300">300+ apps</option></select>
      <select class="input" id="pown"><option value="">Signed or not</option><option value="yes">✅ Signed</option><option value="no">❌ Not yet</option></select>
      <select class="input" id="ps"><option value="goals">Most goals</option><option value="ast">Most assists</option><option value="apps">Most apps</option><option value="name">A–Z</option><option value="first">Newest</option></select></div>
      <div id="plist" class="plist"></div>`;
    let pool = GM.allPlayers || GM.players;
    const draw = () => {
      if (!GM.$('#plist')) return;
      const q = GM.fold(GM.$('#pq').value), c = GM.$('#pc').value, s = GM.$('#ps').value, min = +GM.$('#pa').value, own = GM.$('#pown').value;
      // signed = in your Album or Purist collection, or signed in any draft
      const mine = new Set([...Object.keys(GM.store.get('album', { players: {} }).players || {}), ...Object.keys(GM.store.get('purist', { players: {} }).players || {}),
        ...Object.entries(GM.store.get('picks', { p: {} }).p).filter(([, e]) => e[1] > 0).map(([k]) => k)]);
      let list = pool.filter(p => p.apps >= min && (!q || p.key.includes(q)) && (!c || p.clubs.includes(c)) && (!own || (own === 'yes') === mine.has(p.pk)));
      list.sort(s === 'name' ? (a, b) => a.name.localeCompare(b.name) : s === 'first' ? (a, b) => b.first - a.first : (a, b) => b[s] - a[s] || b.apps - a.apps);
      const picks = GM.store.get('picks', { p: {} }).p;
      GM.$('#plist').innerHTML = `<div class="muted">${list.length.toLocaleString()} players${own ? '' : ` · ✅ ${pool.filter(p => mine.has(p.pk)).length.toLocaleString()} signed`}${pool === GM.players && min < 50 ? ' · loading everyone else…' : list.length > 150 ? ' · showing the top 150, search to find anyone' : ''}</div>` + list.slice(0, 150).map(p =>
        `<div class="prow ${mine.has(p.pk) ? 'owned' : 'unowned'}" data-psheet="${GM.esc(p.pk)}">${GM.avatar(p)}<div><b>${mine.has(p.pk) ? '✅ ' : ''}${GM.esc(p.name)}${(picks[p.pk] || [])[1] ? ` <i class="signed">✍️×${picks[p.pk][1]}</i>` : ''}</b><small>${GM.flag(p.nat)} ${p.poss.join('/')} · ${GM.era(p)}</small><div class="chips">${p.clubs.map(x => GM.clubChip(x)).join('')}</div></div><span class="num">${p.apps}<small>apps</small></span><span class="num">${s === 'ast' ? p.ast : p.goals}<small>${s === 'ast' ? 'assists' : 'goals'}</small></span></div>`).join('');
    };
    ['#pq', '#pc', '#ps', '#pa', '#pown'].forEach(s => GM.$(s).addEventListener('input', draw));
    draw();
    // everyone who has played in the PL (5,000+) loads in the background; the 50+ list shows straight away
    if (pool === GM.players) GM.loadAll().then(all => {
      pool = all;
      const sel = GM.$('#pc');
      if (sel) [...new Set(all.flatMap(p => p.clubs))].filter(c => !GM.clubs.includes(c)).forEach(c => sel.append(new Option(c)));
      draw();
    }).catch(() => { });
  }

  function about() {
    app.innerHTML = `<div class="topbar"><a href="#/" class="back">‹</a><h2>ℹ️ About the data</h2><span></span></div>
      <div class="prose">
      <p>Goal Machine includes <b id="ab-all">${GM.allPlayers ? GM.allPlayers.length.toLocaleString() : '5,000+'}</b> players: <b>everyone to play in the Premier League</b> since 1992/93. Most modes draw from the <b>${GM.players.length.toLocaleString()}</b> with at least 50 PL appearances; ⚡ Extreme and 💎 Purist use everyone. Each player comes with their PL goals, assists, appearances, clubs, positions and nationality, plus honours for the full-time badges. Stats include matches up to <b>${GM.dataDate}</b> and refresh automatically every week.</p>
      <p>Stats are stitched together from public datasets: the official premierleague.com player pages (1992–2020), Fantasy Premier League gameweek data (2016–today) and Understat season stats (2014–2016). Which club a player was at in each season (for chemistry and title badges) comes from Transfermarkt transfer records. Assists after 2020 are FPL assists, which run slightly higher than the official count. A handful of players’ early seasons are estimated from minutes played, so the odd tally might be off by a game or a goal.</p>
      <p>Only Premier League appearances and goals count – no cups, Europe or Championship seasons.</p>
      <p>📸 Player photos come from ${GM.playSafe ? '' : 'the Premier League, Transfermarkt and '}Wikimedia Commons (<a href="#/credits">photo credits</a>). Players without a photo show their initials in their club colours.</p>
      ${GM.playSafe ? '' : `<p>📲 Android app: <a href="${GM.APK_URL}">download the latest APK</a>. Game updates arrive automatically in the app.</p>`}
      ${GM.playSafe ? '' : `<p>🎧 Soundtrack music from <a href="https://www.epidemicsound.com/">Epidemic Sound</a>: <span id="tune-credits">the songs in the playlist</span>.</p>`}
      <p>🔐 <a href="privacy.html">Privacy policy</a></p>
      <p>This is a fan-made game inspired by FourFourTwo’s 442GOALS and is not affiliated with the Premier League or FourFourTwo.</p>
      </div>`;
    if (!GM.allPlayers) GM.loadAll().then(all => { const el = GM.$('#ab-all'); if (el) el.textContent = all.length.toLocaleString(); }).catch(() => { });
    GM.sound.tuneList().then(list => {
      const el = GM.$('#tune-credits');
      if (el && list && list.length) el.innerHTML = list.map(t => `“${GM.esc(t.title)}”${t.artist ? ' by ' + GM.esc(t.artist) : ''}`).join(', ');
    });
  }

  // Wikimedia Commons photos are freely licensed but need crediting
  function credits() {
    const list = GM.players.filter(p => p.photo && p.photo.w).sort((a, b) => a.name.localeCompare(b.name));
    app.innerHTML = `<div class="topbar"><a href="#/about" class="back">‹</a><h2>📸 Photo credits</h2><span></span></div>
      <p class="muted">These photos come from Wikimedia Commons under the licences shown. Tap one to see the original file and its full licence.${GM.playSafe ? '' : ' Other photos are from premierleague.com and Transfermarkt.'}</p>
      <div class="plist">${list.length ? list.map(p => `<a class="prow credit" href="${GM.esc(p.photo.u)}" target="_blank" rel="noopener">${GM.avatar(p)}<div><b>${GM.esc(p.name)}</b>
        <small>📷 ${GM.esc(p.photo.a)} · ${GM.esc(p.photo.l)}</small></div></a>`).join('') : '<div class="muted">No Wikimedia photos in use yet.</div>'}</div>
      <h3>🎬 Animations</h3><p class="muted">The ambulances, police cars, flying saucers and friends in CHAOS are free animations from <a href="https://lottiefiles.com" target="_blank" rel="noopener">LottieFiles</a>, by these artists. Effects are drawn with <a href="https://pixijs.com" target="_blank" rel="noopener">PixiJS</a>.</p>
      <div class="plist" id="lot-credits"></div>
      <h3>🔊 Sounds</h3><p class="muted">Recordings from <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> and <a href="https://opengameart.org" target="_blank" rel="noopener">OpenGameArt</a>, trimmed and levelled. Tap one for the original and its licence.</p>
      <div class="plist" id="sfx-credits"></div>`;
    fetch('fx/sfx/credits.json').then(r => r.json()).then(c => {
      const el = GM.$('#sfx-credits'); if (!el) return;
      el.innerHTML = Object.keys(c).map(k => `<a class="prow credit" href="${GM.esc(c[k].source)}" target="_blank" rel="noopener"><div><b>${GM.esc(k[0].toUpperCase() + k.slice(1))}</b><small>🔊 ${GM.esc(c[k].title)} · ${GM.esc(c[k].author || 'unknown')} · ${GM.esc(c[k].licence)}</small></div></a>`).join('');
    }).catch(() => {});
    fetch('fx/lottie/credits.json').then(r => r.json()).then(c => {
      const el = GM.$('#lot-credits'); if (!el) return;
      el.innerHTML = Object.keys(c).map(k => `<a class="prow credit" href="${GM.esc(c[k].source)}" target="_blank" rel="noopener"><div><b>${GM.esc(k[0].toUpperCase() + k.slice(1))}</b><small>🎬 ${GM.esc(c[k].creator.replace(/^.*lottiefiles\.com\/+/, ''))} · LottieFiles</small></div></a>`).join('');
    }).catch(() => {});
  }

  window.addEventListener('hashchange', route);
  route();
  // loading screen off, then (once per release) what's new
  const splash = document.getElementById('splash');
  if (splash) { splash.classList.add('gone'); setTimeout(() => splash.remove(), 500); }
  if (!parseHash().path) setTimeout(() => (GM.store.get('welcomed') || GM.store.get('played', 0) ? GM.maybeShowWhatsNew() : GM.firstWelcome()), 600);

  // First time here: three quick cards on how it all works (also under Settings → How Goal Machine works)
  GM.welcome = function () {
    GM.store.set('welcomed', 1);
    GM.store.set('seenVersion', GM.UPDATES[0].v);
    const cards = [
      ['⚽', 'Build the XI', 'Spin the reels and sign real Premier League players, one per spin, until your XI is full. Their goals, assists or appearances stay hidden until you sign them. Biggest total wins.'],
      ['🎮', 'Loads of ways to play', '<b>Main event</b>: pick your player pool and wildcards. <b>🌪️ CHAOS</b>: bonus points and madness. <b>📅 Today</b>: daily puzzles with streaks. <b>💰 Transfer market</b>: budgets and bargains. Plus targets and quick games.'],
      ['🌐', 'Play your mates', 'Claim a name on the <b>Online</b> tab to challenge friends, take turns whenever suits you and fight it out in a weekly league. Every player you sign goes in your <b>📒 Album</b>.'],
    ];
    let i = 0;
    const m = GM.modal('<div class="welcome"></div>');
    const show = () => {
      const [icon, title, text] = cards[i];
      GM.$('.welcome', m.el).innerHTML = `<div class="wl-icon">${icon}</div><h3>${title}</h3><p>${text}</p>
        <div class="wl-dots">${cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="row">${i < cards.length - 1 ? '<button class="btn ghost" data-close>Skip</button><button class="btn" id="wlnext">Next ➜</button>' : '<button class="btn big" data-close>Let’s play ⚽</button>'}</div>`;
      const n = GM.$('#wlnext', m.el); if (n) n.onclick = () => { i++; show(); GM.sound.play('tap'); };
    };
    show();
  };

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // when a new version's service worker takes over, reload once so the new files are used straight away
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // files are fetched network-first, so the page is already up to date: don't yank the What's New pop-up away
      if (hadController && !reloaded && !document.querySelector('.whats-new')) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
  }
})();

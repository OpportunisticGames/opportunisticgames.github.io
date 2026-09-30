/* Goal Machine – your club's matchdays, and international breaks. The fixtures come from data/fixtures.js (rebuilt with the weekly data).
   On matchday: a banner on Home and Today, the Matchday XI (players from either side, double for anyone who played
   for both, the same spins for every fan, one go) and a pre-match Footle (a mystery player who played for both).
   The Android app also gets a 9am "Matchday" notification (see app_inbox in Supabase).
   International breaks (from the gaps in the fixture list): a flag-bunting look, a banner, and the International XI,
   a draft of every PL player from one country. */
'use strict';

(function () {
  const pad = n => String(n).padStart(2, '0');
  const localDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let list = null;
  GM.fixtures = function () {
    if (!list) list = ((window.PL_FIXTURES || {}).fixtures || []).map(([ko, home, away]) => {
      const d = new Date(ko);
      return { ko: d, home, away, day: localDay(d), id: ko.slice(0, 10) + ':' + GM.slug(home) + '-' + GM.slug(away) };
    }).sort((a, b) => a.ko - b.ko);
    return list;
  };
  GM.setFixtures = (fx, breaks) => { window.PL_FIXTURES = { fixtures: fx, breaks: breaks || [] }; list = null; GM.applyIntl(); };  // for tests
  GM.fixtureById = id => GM.fixtures().find(f => f.id === id) || null;
  // your club's next match: today's (all day, even after full time), or the next one
  GM.nextMatch = (club = GM.favClub(), from = GM.today()) => club ? GM.fixtures().find(f => (f.home === club || f.away === club) && f.day >= from) || null : null;
  GM.matchToday = (club = GM.favClub()) => { const f = GM.nextMatch(club); return f && f.day === GM.today() ? f : null; };
  GM.kickOff = f => f.ko.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const when = f => f.day === GM.today() ? `Today ${GM.kickOff(f)}` : `${f.ko.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${GM.kickOff(f)}`;
  const vs = (f, club) => f.home === club ? `v ${GM.clubShort(f.away)} (H)` : `v ${GM.clubShort(f.home)} (A)`;
  GM.matchTitle = key => { const f = GM.fixtureById(key.replace(/^match:/, '')); return f ? `Matchday XI · ${GM.clubShort(f.home)} v ${GM.clubShort(f.away)}` : 'Matchday XI'; };
  // players (50+ apps) who played for both sides: the pre-match Footle picks one, and they're worth double in the XI
  GM.bothSides = f => GM.players.filter(p => p.clubs.includes(f.home) && p.clubs.includes(f.away));

  // the matchday banner (Home and Today); on other days a small "next match" line for the club tile
  GM.matchBanner = function () {
    const f = GM.matchToday();
    if (!f) return '';
    const done = GM.store.get('match2:' + f.id) && GM.store.get('mfootle:' + f.id, { done: false }).done;
    return `<a class="match-banner${done ? ' done' : ''}" href="#/matchday"><span class="mb-ball">🏟️</span>
      <span><b>MATCHDAY</b><small>${GM.esc(f.home)} v ${GM.esc(f.away)} · ${GM.kickOff(f)}</small><small class="mb-sub">${done ? '✅ All played – come on you ' + GM.esc(GM.clubShort(GM.favClub())) + '!' : 'Matchday XI and pre-match Footle are open'}</small></span><span>›</span></a>`;
  };
  GM.nextMatchLine = function () {
    const club = GM.favClub(), f = GM.nextMatch(club);
    return f && f.day !== GM.today() ? `<a class="next-match" href="#/matchday">📅 Next: ${GM.esc(vs(f, club))} · ${when(f)} ›</a>` : '';
  };

  GM.matchday = function (root) {
    const club = GM.favClub();
    const top = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🏟️ Matchday</h2>`;
    if (!club) {
      root.innerHTML = `${top}<span></span></div><a class="pick-club" href="#/settings?s=look">🏟️ Pick your favourite club to get matchday games whenever they play</a>`;
      return;
    }
    const f = GM.nextMatch(club);
    if (!f) {
      root.innerHTML = `${top}<span></span></div><div class="banner">No ${GM.esc(club)} fixtures yet. They'll show up here once the fixture list is out.</div>`;
      return;
    }
    const today = f.day === GM.today(), mins = Math.round((f.ko - Date.now()) / 6e4);
    const clock = !today ? when(f) : mins > 0 ? `Kick-off ${GM.kickOff(f)} · in ${mins >= 60 ? Math.floor(mins / 60) + 'h ' : ''}${mins % 60}m` : mins > -115 ? `Kicked off at ${GM.kickOff(f)} · it’s on now` : `Kicked off at ${GM.kickOff(f)}`;
    const xi = GM.store.get('match2:' + f.id), xiNow = GM.store.get('draftp:match:' + f.id);
    const ft = GM.store.get('mfootle:' + f.id, { guesses: [], done: false });
    const later = GM.fixtures().filter(x => (x.home === club || x.away === club) && x.ko > f.ko).slice(0, 3);
    const tile = (href, icon, title, sub, st) => today
      ? `<a class="md-tile${st ? ' done' : ''}" href="${href}"><span class="md-ico">${icon}</span><b>${title}</b><small>${st || sub}</small></a>`
      : `<div class="md-tile locked"><span class="md-ico">🔒</span><b>${title}</b><small>Opens on matchday. ${sub}</small></div>`;
    root.innerHTML = `${top}<span class="top-btns">${GM.lbButton('match:' + f.id)}</span></div>
      <div class="md-card${today ? ' today' : ''}"><span class="kicker">${today ? 'MATCHDAY' : 'Next match'}</span>
        <div class="md-teams"><span>${GM.clubChip(f.home, true)}</span><b>v</b><span>${GM.clubChip(f.away, true)}</span></div>
        <p class="md-clock">${clock}</p></div>
      ${tile(`#/draft?m=match&fx=${encodeURIComponent(f.id)}`, '⚽', 'Matchday XI', `Build the XI with the most PL goals from players who played for either side. Played for both? <strong>Double points.</strong> Same spins for every fan, one go.`,
        xi ? `✅ ${(xi.final ? xi.final.total : 0).toLocaleString()} goals · tap to see your XI` : xiNow ? '▶ Carry on your XI' : '')}
      ${tile(`#/matchfootle?fx=${encodeURIComponent(f.id)}`, '🟩', 'Pre-match Footle', 'Guess the mystery player who played for both clubs.',
        ft.done ? (ft.won ? `✅ Got it in ${ft.guesses.length}` : '❌ Not this time · tap to see who it was') : ft.guesses.length ? `▶ ${ft.guesses.length} guess${ft.guesses.length === 1 ? '' : 'es'} so far` : '')}
      ${later.length ? `<h3 class="section-title">Coming up</h3><div class="md-list">${later.map(x => `<div><span>${GM.esc(vs(x, club))}</span><small>${when(x)}</small></div>`).join('')}</div>` : ''}
      <p class="muted center small">Kick-off times are in your time zone. Matchday games open whenever ${GM.esc(club)} play.</p>`;
  };

  /* ================================================================ international breaks */
  const breaks = () => (window.PL_FIXTURES || {}).breaks || [];
  const nice = day => new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  // the break we're in (null if there's PL football): { from, to, back: the first PL kick-off after it }
  GM.intlBreak = (day = GM.today()) => {
    const b = breaks().find(([a, z]) => day >= a && day <= z);
    if (!b) return null;
    const next = GM.fixtures().find(f => f.day > b[1]);
    return { from: b[0], to: b[1], back: next ? next.ko : null };
  };
  GM.nextBreak = (day = GM.today()) => { const b = breaks().find(([a]) => a > day); return b ? { from: b[0], to: b[1] } : null; };
  // the flag bunting look, on for the whole break
  GM.applyIntl = () => document.documentElement.classList.toggle('intl-break', !!GM.intlBreak());
  GM.applyIntl();

  // countries with 10+ PL regulars (50+ apps), biggest first. The draft uses every PL player they've had; if none of
  // them fits a slot (no keeper left, say) the reels fall back to anyone, as Club XI does
  let nats = null;
  GM.nations = function () {
    if (nats) return nats;
    const c = {};
    GM.players.forEach(p => { if (p.nat) c[p.nat] = (c[p.nat] || 0) + 1; });
    return (nats = Object.keys(c).filter(k => c[k] >= 10).sort((a, b) => c[b] - c[a]));
  };
  // each country gets its own boards
  GM.nations().forEach(n => ['', 'ast', 'apps'].forEach(sfx => {
    GM.MODES['nation' + GM.slug(n) + sfx] = { name: `${n} XI` + ({ ast: ' – Assists', apps: ' – Apps' }[sfx] || ''), icon: '🌍' };
  }));
  const FLAGS = ['England', 'France', 'Brazil', 'Spain', 'Scotland', 'Netherlands', 'Wales', 'Argentina', 'Ireland', 'Portugal', 'Nigeria', 'Germany'];
  GM.intlBanner = function () {
    const b = GM.intlBreak();
    if (!b) return '';
    return `<a class="intl-banner" href="#/nations"><span class="ib-flags" aria-hidden="true">${FLAGS.concat(FLAGS).map(GM.flag).join(' ')}</span>
      <span class="ib-row"><span>🌍</span><span><b>INTERNATIONAL BREAK</b><small>${b.back ? `No PL football till ${nice(localDay(b.back))}. ` : ''}Build a country’s XI instead</small></span><span>›</span></span></a>`;
  };

  GM.nationsPage = function (root) {
    const b = GM.intlBreak(), nb = GM.nextBreak();
    const top = `<div class="topbar"><a href="#/" class="back">‹</a><h2>🌍 International XI</h2>`;
    if (!b) {
      root.innerHTML = `${top}<span></span></div>
        <div class="md-card"><span class="kicker">International break</span><p class="md-clock">${nb ? `Next one: ${nice(nb.from)} to ${nice(nb.to)}` : 'The next one isn’t on the fixture list yet'}</p></div>
        <div class="md-tile locked"><span class="md-ico">🔒</span><b>International XI</b><small>Comes out for every international break: pick a country and build its XI from every PL player it’s had.</small></div>`;
      return;
    }
    const all = GM.nations(), mine = GM.store.get('nation', 'England'), pick = all.includes(mine) ? mine : all[0];
    const statBtn = s => {
      const st = GM.STATS[s], key = GM.draft.modeKey('nation', s, false, pick), best = GM.best(key);
      return `<a class="stat-btn" href="#/draft?m=nation&n=${encodeURIComponent(pick)}&s=${s}"><i class="sb-ico">${st.icon}</i>${st.name}${best ? `<small>PB ${best.toLocaleString()}</small>` : ''}</a>`;
    };
    const done = GM.store.get('nationsPlayed', []);
    root.innerHTML = `${top}<span class="top-btns">${GM.lbButton(GM.draft.modeKey('nation', 'goals', false, pick))}</span></div>
      <div class="md-card today intl"><span class="kicker">INTERNATIONAL BREAK</span>
        <div class="ib-big">${GM.flag(pick)}</div><b class="ib-name">${GM.esc(pick)} XI</b>
        <p class="md-clock small">Every PL player ${GM.esc(pick)} has had, all equally likely. Wildcards on. Until ${nice(b.to)}</p>
        <span class="stat-pick">${['goals', 'assists', 'apps'].map(statBtn).join('')}</span></div>
      <h3 class="section-title">Pick a country</h3>
      <div class="nation-grid">${all.map(n => `<button class="${n === pick ? 'on' : ''}" data-nat="${GM.esc(n)}"><span>${GM.flag(n)}</span>${GM.esc(n)}${done.includes(n) ? '<i>✓</i>' : ''}</button>`).join('')}</div>`;
    GM.$$('[data-nat]', root).forEach(el => el.onclick = () => { GM.store.set('nation', el.dataset.nat); GM.nationsPage(root); window.scrollTo(0, 0); });
  };
})();

/* Goal Machine – the rotating banner on Home, and NEW / UPDATED tags on game tiles.
   Slides, in order: matchday, the international break, the latest release's featured games (the `promo` list in
   updates.js, for three weeks after the release), and news from the Supabase `announcements` table (the last
   fortnight). One slide shows on its own; more swipe, and turn over every few seconds by themselves.
   Tags: an update entry's `tags` ({ moneyball: 'UPDATED' }) shows on that game's tile until you open it. */
'use strict';

(function () {
  const DAY = 864e5, FEATURE_DAYS = 21, NEWS_DAYS = 14;
  const recent = (date, days) => date && Date.now() - new Date(date + (date.length === 10 ? 'T00:00:00' : '')).getTime() < days * DAY;
  // a link to the site (from an announcement) becomes an in-app link, so it works in the apps too
  const inApp = link => { const i = (link || '').indexOf('#/'); return i >= 0 ? link.slice(i) : '#/updates'; };

  /* ---------------------------------------------------------------- tags */
  // { game: { tag, v } } from the releases that carry tags; the newest release wins
  function tags() {
    const out = {};
    (GM.UPDATES || []).slice().reverse().forEach(u => Object.entries(u.tags || {}).forEach(([k, tag]) => { out[k] = { tag, v: u.v }; }));
    (GM.NEW_MODES || []).forEach(k => { if (!out[k]) out[k] = { tag: 'NEW', v: 1 }; });  // the older NEW games
    return out;
  }
  // the tag for a game, until you've opened it since that release
  GM.gameTag = function (k) {
    const t = tags()[k];
    if (!t || +GM.store.get('tried:' + k, 0) >= t.v) return '';
    return `<span class="new-tag${t.tag === 'NEW' ? '' : ' upd'}">${t.tag}</span>`;
  };
  // the router: opening a game clears its tag
  GM.triedGame = function (k) {
    const t = tags()[k];
    if (t && +GM.store.get('tried:' + k, 0) < t.v) GM.store.set('tried:' + k, t.v);
  };

  /* ---------------------------------------------------------------- the slides */
  const NEWS_KEY = 'promoNews';
  function slides() {
    const out = [];
    const match = GM.matchBanner ? GM.matchBanner() : '', intl = GM.intlBanner ? GM.intlBanner() : '';
    if (match) out.push(match);
    if (intl) out.push(intl);
    const hrefs = new Set();
    const latest = (GM.UPDATES || []).find(u => u.promo);
    if (latest && recent(latest.date, FEATURE_DAYS)) latest.promo.forEach(p => {
      hrefs.add(p.href);
      out.push(`<a class="promo-card ${p.cls || 't-green'}" href="${p.href}"><span class="pcd-icon">${p.icon}</span>
        <span class="pcd-text"><span class="pcd-kick">${p.kick || `✨ New in ${latest.label}`}</span><b>${GM.esc(p.title)}</b><small>${GM.esc(p.sub)}</small></span><span class="pcd-go">›</span></a>`);
    });
    const news = (GM.store.get(NEWS_KEY, { list: [] }).list || []).filter(n => recent(n.created_at, NEWS_DAYS) && !hrefs.has(inApp(n.link)));
    news.forEach((n, i) => out.push(`<a class="promo-card news ${['t-navy', 't-purple', 't-teal'][i % 3]}" href="${GM.esc(inApp(n.link))}"><span class="pcd-icon">📣</span>
      <span class="pcd-text"><span class="pcd-kick">News</span><b>${GM.esc(n.title)}</b><small>${GM.esc(n.body || '')}</small></span><span class="pcd-go">›</span></a>`));
    return out;
  }

  GM.promoHtml = function () {
    const s = slides();
    if (!s.length) return '<div id="promo"></div>';
    if (s.length === 1) return `<div id="promo" class="promo one">${s[0]}</div>`;
    return `<div id="promo" class="promo"><div class="promo-track">${s.map((h, i) => `<div class="promo-slide" data-i="${i}">${h}</div>`).join('')}</div>
      <div class="promo-dots">${s.map((_, i) => `<button data-dot="${i}" class="${i ? '' : 'on'}" aria-label="Slide ${i + 1}"></button>`).join('')}</div></div>`;
  };

  // after Home draws: dots, swiping, turning over by itself (and a pause after you touch it), and fetching the news
  GM.promoWire = function () {
    const box = GM.$('#promo');
    if (!box) return;
    fetchNews(box);
    const track = GM.$('.promo-track', box);
    if (!track) return;
    const n = track.children.length, dots = GM.$$('[data-dot]', box);
    let i = 0, held = 0;
    const show = (k, smooth = true) => { i = (k + n) % n; track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); };
    track.addEventListener('scroll', () => {
      const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (k !== i) i = k;
      dots.forEach((d, j) => d.classList.toggle('on', j === k));
    }, { passive: true });
    dots.forEach(d => d.onclick = () => { held = Date.now(); show(+d.dataset.dot); });
    ['pointerdown', 'touchstart'].forEach(ev => track.addEventListener(ev, () => { held = Date.now(); }, { passive: true }));
    const timer = setInterval(() => {
      if (!box.isConnected) return clearInterval(timer);
      if (document.hidden || Date.now() - held < 12000) return;
      show(i + 1);
    }, 5500);
  };

  // the news: from the announcements table, at most every 30 minutes; if it's changed, redraw just the banner
  let fetching = false;
  function fetchNews(box) {
    const c = GM.lb && GM.lb.cfg, old = GM.store.get(NEWS_KEY, { at: 0, list: [] });
    if (fetching || !c || !c.supabaseUrl || Date.now() - (old.at || 0) < 30 * 60e3) return;
    fetching = true;
    const since = new Date(Date.now() - NEWS_DAYS * DAY).toISOString();
    fetch(`${c.supabaseUrl}/rest/v1/announcements?select=id,title,body,link,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=3`,
      { headers: { apikey: c.supabaseAnonKey, Authorization: 'Bearer ' + c.supabaseAnonKey } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(list => {
        const changed = JSON.stringify(list) !== JSON.stringify(old.list);
        GM.store.set(NEWS_KEY, { at: Date.now(), list });
        if (changed && box.isConnected) { box.outerHTML = GM.promoHtml(); GM.promoWire(); }
      })
      .catch(() => { GM.store.set(NEWS_KEY, { at: Date.now(), list: old.list || [] }); })
      .finally(() => { fetching = false; });
  }
})();

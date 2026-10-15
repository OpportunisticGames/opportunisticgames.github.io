// Offline support: cache the app shell, network-first so updates show up on the next load.
const CACHE = 'goal-machine-v98';
const SHELL = ['./', 'index.html', 'style.css', 'config.js', 'data/players.js', 'data/photos.js', 'data/faces.js', 'js/core.js', 'js/audio.js', 'js/daily.js', 'js/fx.js', 'js/chaosart.js', 'js/draft.js', 'js/challenge.js', 'js/report.js', 'js/collection.js', 'js/packs.js', 'js/player.js', 'js/profile.js', 'js/levels.js', 'js/locker.js', 'js/prizes.js', 'js/rewards.js', 'js/firstgame.js', 'js/tour.js', 'js/modes.js', 'js/h2h.js', 'js/online.js', 'js/picture.js', 'js/market.js', 'js/moneyball.js', 'js/owner-engine.js', 'js/owner.js', 'js/reign.js', 'js/royale.js', 'js/secret.js', 'js/hattrick.js', 'js/updates.js', 'js/banter.js', 'data/fixtures.js', 'js/matchday.js', 'js/promo.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

let slowUntil = 0;   // after one request gives up on a hanging network, the rest don't wait again for a minute
const SLOW = 4000;   // ms to wait for the network before using what's cached

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/music/') && !url.pathname.endsWith('.json')) return;  // songs stream straight from the network (partial responses can't be cached)
  // Network-first, but a phone showing 4G with no real data makes fetch() hang instead of fail, so the cached copy
  // is used after a few seconds (and straight away if the request fails).
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const offline = hit || (e.request.mode === 'navigate' ? caches.match('index.html') : null);
      // 'no-cache' makes the browser check with GitHub Pages every time (cheap 304s), so a new deploy shows up at once
      const net = fetch(e.request, { cache: 'no-cache' }).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        slowUntil = 0;
        return res;
      });
      if (!offline) return net;
      return Promise.race([net, new Promise(r => setTimeout(() => { slowUntil = Date.now() + 60000; r(null); }, Date.now() < slowUntil ? 200 : SLOW))]).then(res => res || offline, () => offline);
    })
  );
});

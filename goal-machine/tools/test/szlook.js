// 🎃 5.30: Halloween CHAOS looks the part. Cobwebs and pumpkins sit on the pitch's corners, something flies over now and
// then, the weather is never sunny, Calm takes the decorations away, leaving the game takes them with it, and Hard hides
// the clubs like everywhere else.
//   node szlook.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const U = 'http://localhost:8765/goal-machine/';
const { fast, idle } = require('./helpers');
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await fast(ctx, { calm: false, speed: 3 });
  await ctx.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.goto(U); await pg.waitForTimeout(600);
  await pg.evaluate(() => { GM._forceSz = 'halloween'; location.hash = '#/draft?m=szchaos&seed=look1'; });
  await pg.waitForSelector('.cm-pick [data-mgr]'); await pg.click('.cm-pick [data-mgr]'); await idle(pg);
  await pg.waitForFunction(() => document.querySelectorAll('.cz-deco .web svg, .cz-deco .corner svg').length === 4, null, { timeout: 15000 }).catch(() => {});
  const d = await pg.evaluate(() => { const p = document.querySelector('.pitch').getBoundingClientRect(), w = document.querySelector('.cz-deco .web.r').getBoundingClientRect(), c = document.querySelector('.cz-deco .corner.l').getBoundingClientRect();
    return { svgs: document.querySelectorAll('.cz-deco .web svg, .cz-deco .corner svg').length, webTop: Math.abs(w.top - p.top) < 6 && Math.abs(w.right - p.right) < 6, pkBottom: c.bottom <= p.bottom && c.bottom > p.bottom - 12 && c.left >= p.left,
      bg: getComputedStyle(document.body, '::before').backgroundImage.includes('svg'), wx: GM.draft.state().weather }; });
  ok(d.svgs === 4 && d.webTop && d.pkBottom, 'cobwebs hang in the pitch’s top corners and pumpkins sit in the bottom ones');
  ok(d.bg, 'the night sky has its moon and graveyard');
  ok(d.wx !== 'sun', `never sunny at Halloween (${d.wx})`);
  const flew = await pg.waitForFunction(() => document.querySelector('.fx-lottie.sz-visit'), null, { timeout: 12000 }).then(() => true).catch(() => false);
  ok(flew, 'something flies over the pitch now and then');
  await pg.screenshot({ path: 'lay/szlook.png' });
  await pg.evaluate(() => { localStorage.setItem('gm:calm', 'true'); document.body.classList.add('calm'); });
  ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.cz-deco')).display === 'none'), 'Calm hides the decorations');
  await pg.evaluate(() => { localStorage.removeItem('gm:calm'); document.body.classList.remove('calm'); location.hash = '#/'; }); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => !document.querySelector('.cz-deco') && !document.body.dataset.cz), 'leaving the game takes the decorations with it');
  // normal CHAOS: none of it
  await pg.evaluate(() => { location.hash = '#/draft?m=chaos&seed=look2'; });
  await pg.waitForSelector('.cm-pick [data-mgr]'); await pg.click('.cm-pick [data-mgr]'); await idle(pg); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => !document.querySelector('.cz-deco')), 'normal CHAOS has no Halloween decorations');
  await pg.evaluate(() => { location.hash = '#/'; Object.keys(localStorage).filter(x => x.startsWith('gm:draftp')).forEach(x => localStorage.removeItem(x)); }); await pg.waitForTimeout(300);
  // Hard
  await pg.evaluate(() => { location.hash = '#/draft?m=szchaos&seed=hard1&h=1'; });
  await pg.waitForSelector('.cm-pick [data-mgr]'); await pg.click('.cm-pick [data-mgr]'); await idle(pg);
  await pg.click('#spin'); await idle(pg);
  const h = await pg.evaluate(() => ({ hard: GM.draft.state().hard, blind: document.querySelector('.stage').classList.contains('hard'), chips: document.querySelectorAll('.stage .reel .chips > *').length, key: GM.draft.modeKey('szchaos', 'goals', true) }));
  ok(h.hard && h.blind && h.chips === 0 && h.key === 'szchaosh', `Hard Seasonal CHAOS hides the clubs and has its own board (${h.key})`);
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
})();

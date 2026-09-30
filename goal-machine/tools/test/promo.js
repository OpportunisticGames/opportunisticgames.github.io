// 🎠 Home's rotating banner (matchday / the international break, the release's featured games, news from the
// announcements table), NEW / UPDATED tags on game tiles, and a page that fails to draw never leaving a game's look behind.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  let asked = 0;
  const NEWS = [{ id: 9, title: 'The new Moneyball', body: 'x', link: 'https://example.org/goal-machine/#/moneyball', created_at: new Date().toISOString() },
    { id: 10, title: 'Cup final weekend', body: 'A special CHAOS event all weekend', link: 'https://example.org/goal-machine/#/draft?m=chaos', created_at: new Date().toISOString() },
    { id: 8, title: 'Old news', body: 'y', link: 'https://example.org/goal-machine/#/packs', created_at: new Date(Date.now() - 30 * 864e5).toISOString() }];
  await pg.route(/wikimedia|premierleague|transfermarkt/, r => r.abort());
  await pg.route(/supabase/, r => { if (!/announcements/.test(r.request().url())) return r.abort(); asked++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEWS) }); });
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false); set('homeTab', 'market');
    GM.setFixtures([['2099-01-01T15:00:00Z', 'Everton', 'Chelsea']], []); });
  await pg.reload(); await pg.waitForTimeout(1200);
  const a0 = asked;
  const s1 = await pg.evaluate(() => ({ slides: [...document.querySelectorAll('.promo-slide')].map(s => s.textContent.replace(/\s+/g, ' ').trim()), hrefs: [...document.querySelectorAll('.promo-slide a')].map(a => a.getAttribute('href')), dots: document.querySelectorAll('.promo-dots button').length }));
  ok(s1.slides.some(t => /New Moneyball/i.test(t)) && s1.slides.some(t => /Cup final weekend/.test(t)), `the banner has the new release’s games and the news (${s1.slides.length} slides)`);
  ok(s1.hrefs.filter(h => h === '#/moneyball').length === 1 && !s1.slides.some(t => /Old news/.test(t)), 'news about a game that’s already featured isn’t doubled up, and old news drops off');
  ok(s1.hrefs.includes('#/draft?m=chaos') && s1.dots === s1.slides.length, 'news links open in the app (not the website), with a dot per slide');
  const w = await pg.evaluate(() => { const t = document.querySelector('.promo-track'); return [...t.children].every(c => Math.abs(c.getBoundingClientRect().width - t.clientWidth) < 1); });
  ok(w, 'every slide is exactly the banner’s width');
  await pg.waitForTimeout(6200);
  ok(await pg.evaluate(() => [...document.querySelectorAll('.promo-dots button')].findIndex(d => d.classList.contains('on'))) === 1, 'it turns over by itself');
  await pg.evaluate(() => document.querySelector('.promo-dots button:last-child').click()); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => { const t = document.querySelector('.promo-track'); return Math.round(t.scrollLeft / t.clientWidth) === t.children.length - 1; }), 'tapping a dot goes to that slide');
  await pg.goto(U + '#/settings'); await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  ok(a0 >= 1 && asked === a0, 'the news is fetched at most every half hour');

  // tags
  ok(/UPDATED/.test(await pg.textContent('a.tile[href="#/moneyball"]')) && !!(await pg.$('#htabs [data-t="market"] .new-dot')), 'an updated game gets an UPDATED tag, and its tab a dot');
  await pg.click('a.tile[href="#/moneyball"]'); await pg.waitForTimeout(400); await pg.goto(U + '#/'); await pg.waitForTimeout(500);
  ok(!/UPDATED/.test(await pg.textContent('a.tile[href="#/moneyball"]')), '…until you open it');
  ok(/NEW/.test(await pg.textContent('a.tile[href="#/auction"]')), 'NEW still marks games you’ve never tried');

  // matchday joins the banner
  await pg.evaluate(() => { const d = new Date(); d.setHours(23, 0, 0, 0); GM.store.set('club', 'Everton'); GM.setFixtures([[d.toISOString().slice(0, 19) + 'Z', 'Everton', 'Liverpool']]); });
  await pg.goto(U + '#/settings'); await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => !!document.querySelector('.promo-slide:first-child .match-banner')), 'on matchday, the matchday banner is the first slide');

  // a page that fails to draw
  await pg.goto(U + '#/moneyball'); await pg.waitForTimeout(400);
  await pg.evaluate(() => { GM.moneyball = () => { throw new Error('test'); }; }); await pg.goto(U + '#/'); await pg.goto(U + '#/moneyball'); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => !document.body.classList.contains('money-mode') && /Something went wrong/.test(document.querySelector('.topbar h2').textContent)), 'a page that crashes says so, in the normal look (not a dark page stuck on the last screen)');
  await pg.evaluate(() => document.body.classList.add('money-mode')); await pg.goto(U + '#/'); await pg.waitForTimeout(400);
  ok(!(await pg.evaluate(() => document.body.classList.contains('money-mode'))), 'Home always puts the normal look back');
  ok(!errs.filter(e => e !== 'test').length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

// The player sheet: tap a player who's yours (Players index, pack cards, your pitch) for his photo, card, clubs, honours
// and your history. Never from the reels.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase|fonts/, r => r.abort());
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('sfx', false); });
  await pg.reload(); await pg.waitForTimeout(700);
  // 1. the Players index
  await pg.goto(U + '#/players'); await pg.waitForTimeout(900);
  await pg.fill('#pq', 'Ferdinand'); await pg.waitForTimeout(400);
  await pg.click('.prow[data-psheet*="Rio Ferdinand"]'); await pg.waitForTimeout(300);
  let sh = await pg.evaluate(() => { const m = document.querySelector('.ps'); return m && { text: m.textContent, clubs: m.querySelectorAll('.ps-clubs li').length, card: !!m.querySelector('.pcard'), z: m.closest('.modal-wrap').style.zIndex, wiki: !!m.querySelector('a[href*="wikipedia"]') }; });
  ok(sh && /Rio Ferdinand/.test(sh.text) && sh.clubs >= 3 && sh.card, 'the Players index opens a sheet with his card and clubs');
  ok(/best known at/.test(sh.text) && /Manchester United/.test(sh.text) && /Premier League champion/.test(sh.text), 'it says the club he’s best known for, and his honours');
  ok(/seasons|season/.test(sh.text) && /\d{4}\/\d\d/.test(sh.text), 'each club has its seasons');
  ok(/You and Rio/.test(sh.text) && /haven’t signed him/.test(sh.text) && sh.wiki, 'your history with him, and a Wikipedia link');
  await pg.click('.ps [data-close]'); ok(!(await pg.$('.ps')), 'Close closes it');
  // 2. a card in the Album's Cards list, with a piece in
  await pg.evaluate(() => { const p = GM.players.find(q => q.name === 'Alan Shearer'); GM.cardsFromDraft([p]); });
  await pg.goto(U + '#/album?v=cards'); await pg.waitForTimeout(700);
  await pg.click('.card-grid .pcard[data-psheet]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => /Legend card/.test(document.querySelector('.ps').textContent) && /1 of 5 pieces/.test(document.querySelector('.ps').textContent)), 'an Album card opens his sheet with how far the card is (1 of 5)');
  await pg.click('.ps [data-close]');
  // 3. in a draft: the reels never open it, a signed player on the pitch does
  await pg.goto(U + '#/draft?m=ultimate'); await pg.waitForTimeout(1200);
  await pg.click('#spin'); await pg.waitForTimeout(2200);
  await pg.click('.reel >> nth=0'); await pg.waitForTimeout(400);
  ok(!(await pg.$('.ps')), 'tapping a player on the reels does not open a sheet');
  const t = await pg.$('.slot.target'); if (t) { await t.click(); await pg.waitForTimeout(1800); }
  await pg.click('.slot.filled >> nth=0'); await pg.waitForTimeout(300);
  ok(!!(await pg.$('.ps')), 'a player you have signed opens his sheet when tapped on the pitch');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close();
})();

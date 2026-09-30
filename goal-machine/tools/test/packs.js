// 🎁 Packs: card tiers, the free daily pack, opening one (burst, flips), pieces from drafts (once a day per player),
// bonus packs (three dailies, new badges), the Packed XI and its board, and the Album showing it.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  await pg.goto(U);
  await pg.evaluate(() => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v));
    set('seenVersion', 999); set('welcomed', 1); set('sfx', false);
  });
  await pg.reload(); await pg.waitForTimeout(600);

  const t = await pg.evaluate(() => ({ c: GM.tierCounts(), all: GM.players.length, hof: GM.players.filter(p => p.hon.H).every(p => GM.cardTier(p) === 'l'),
    shearer: GM.cardTier(GM.players.find(p => p.name === 'Alan Shearer')) }));
  ok(t.c.l >= 25 && t.c.l <= 60 && t.c.g > 150 && t.c.s > 400 && t.c.b + t.c.s + t.c.g + t.c.l === t.all, `tiers: ${JSON.stringify(t.c)} of ${t.all} players`);
  ok(t.hof && t.shearer === 'l', 'Hall of Famers (Shearer included) are Legends');
  ok(await pg.evaluate(() => GM.packsWaiting() === 1) && /1 pack to open/i.test(await pg.textContent('.pack-bar')), 'a free pack every day, and Home says so');

  // opening
  await pg.goto(U + '#/packs'); await pg.waitForTimeout(500);
  await pg.click('#openpack'); await pg.waitForTimeout(400);
  await pg.$eval('.po-pack', e => e.click()); await pg.waitForTimeout(12000);
  const op = await pg.evaluate(() => { const c = GM.store.get('cards'); return { cards: document.querySelectorAll('.pack-open .pcard').length, flipped: document.querySelectorAll('.pack-open .pcard.flipped').length,
    pieces: Object.values(c.p).reduce((a, n) => a + n, 0), daily: c.daily === GM.today(), last: [...document.querySelectorAll('.pack-open .pcard')].pop().className, done: !!document.querySelector('[data-done]') }; });
  ok(op.cards === 5 && op.flipped === 5 && op.done, 'a pack bursts into five cards that all flip over');
  ok(op.pieces === 5 && op.daily, 'five pieces saved, and today’s free pack is used');
  ok(!/tier-b/.test(op.last), 'the last card is Silver or better: ' + op.last);
  await pg.click('[data-done]'); await pg.waitForTimeout(300);
  const badges = await pg.evaluate(() => Object.keys(GM.store.get('album').ach));
  ok(badges.includes('colpack'), 'the first pack earns Pack Opener');
  ok(await pg.evaluate(() => GM.packsWaiting()) >= 1, 'and a new badge earns a bonus pack');

  // pieces from drafts: once a day per player
  const dr = await pg.evaluate(() => {
    const p = GM.players.find(q => q.name === 'Alan Shearer'), c0 = GM.cardPieces(p);
    GM.cardsFromDraft([p]); GM.cardsFromDraft([p]); const once = GM.cardPieces(p) - c0;
    const days = [];
    for (let i = 0; i < 6; i++) { const c = GM.store.get('cards'); c.seenDay = 'old'; GM.store.set('cards', c); GM.collectDraft({ mode: 'ultimate', stat: 'goals', total: 0, points: 0, xi: [p], slots: [], moments: [], rars: [] }); days.push(GM.cardPieces(p)); }
    return { once, days, xi: GM.packedXI().xi.some(s => s.player && s.player.name === 'Alan Shearer') };
  });
  ok(dr.once === 1, 'signing the same player twice in a day gives one piece');
  ok(dr.days[dr.days.length - 1] === 5 && dr.days.every(n => n <= 5), `a Legend takes 5 pieces (${dr.days.join(' → ')})`);
  ok(dr.xi, 'a finished card goes into the Packed XI');
  ok(await pg.evaluate(() => GM.best('packedxi') > 0 && GM.store.get('cards').best > 0), 'a better Packed XI goes on its leaderboard');
  ok((await pg.evaluate(() => Object.keys(GM.store.get('album').ach))).includes('collegend'), 'finishing a Legend earns Legendary');

  // three dailies in a day: a bonus pack
  const before = await pg.evaluate(() => GM.store.get('cards').packs);
  await pg.evaluate(() => { GM.markDaily('footle', 3); GM.markDaily('daily', 400); GM.markDaily('grid', 7); GM.markDaily('grid', 8); });
  ok(await pg.evaluate(() => GM.store.get('cards').packs) === before + 1, 'three dailies in a day earn one bonus pack (not one per game after that)');

  // the album's XI is the Packed XI now
  await pg.goto(U + '#/album'); await pg.waitForTimeout(500);
  ok(!!(await pg.$('.pitch.packed')) && /Packed XI/.test(await pg.textContent('.album-views')), 'the Album shows the Packed XI');
  await pg.goto(U + '#/packs?v=cards'); await pg.waitForTimeout(400);
  ok((await pg.$$('.card-grid .pcard')).length >= 5, 'the Cards list shows what you’ve started');
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

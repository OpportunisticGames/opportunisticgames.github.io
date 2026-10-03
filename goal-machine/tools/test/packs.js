// 🎁 Packs: card tiers, the free daily pack, opening one (burst, flips), pieces from drafts (once a day per player),
// bonus packs (three dailies, new badges), the Packed XI and its board, and the Album showing it.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const GM_N = { level: 'Level Up Pack', badge: 'Badge Pack', royale: 'Royale Pack', chaos: 'CHAOS Pack' };
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
  // no break or matchday in this test: a plain Daily Pack
  await pg.evaluate(() => { GM.setFixtures([['2099-01-01T15:00:00Z', 'Everton', 'Chelsea']], []); });
  ok(await pg.evaluate(() => GM.nextPackType()) === 'daily', 'on a normal day the free pack is a Daily Pack');

  // opening (no wildcard in this one; they're tested below)
  await pg.evaluate(() => { GM.packForce = { wild: 'none' }; });
  await pg.goto(U + '#/packs'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { window.snd = []; const p = GM.sound.play; GM.sound.play = (n, x) => { snd.push(n); return p(n, x); }; });
  await pg.click('#openpack'); await pg.waitForTimeout(400);
  await pg.$eval('.po-pack', e => e.click()); await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => document.querySelector('.pack-open').classList.contains('charging')), 'tapping the pack charges it up…');
  await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => document.querySelector('.pack-open').classList.contains('torn')), '…and the top tears off');
  await pg.waitForTimeout(11000);
  const op = await pg.evaluate(() => { const c = GM.store.get('cards'); return { cards: document.querySelectorAll('.pack-open .pcard').length, flipped: document.querySelectorAll('.pack-open .pcard.flipped').length,
    pieces: Object.values(c.p).reduce((a, n) => a + n, 0), daily: c.daily === GM.today(), last: [...document.querySelectorAll('.pack-open .pcard')].pop().className, done: !!document.querySelector('[data-done]') }; });
  ok(op.cards === 5 && op.flipped === 5 && op.done, 'a pack bursts into five cards that all flip over');
  ok(op.pieces === 5 && op.daily, 'five pieces saved, and today’s free pack is used');
  ok(!/tier-b/.test(op.last), 'the last card is Silver or better: ' + op.last);
  ok(await pg.evaluate(() => { const r = [...document.querySelectorAll('.pack-open .pcard')].map(e => e.getBoundingClientRect()); return r.every(x => Math.abs(x.height - r[0].height) < 1 && Math.abs(x.width - r[0].width) < 1); }), 'every card is the same size');
  await pg.click('[data-done]'); await pg.waitForTimeout(300);
  const badges = await pg.evaluate(() => Object.keys(GM.store.get('album').ach));
  ok(badges.includes('colpack'), 'the first pack earns Pack Opener');
  ok(await pg.evaluate(() => GM.packsWaiting()) >= 1, 'and a new badge earns a bonus pack');
  await pg.waitForTimeout(1000);
  const sn = await pg.evaluate(() => snd.slice());
  ok(['drumroll', 'charge', 'crack', 'deal'].every(n => sn.includes(n)) && ['silver', 'jackpot', 'fanfare'].some(n => sn.includes(n)) && sn.includes('packget'),
    `sounds: the drum roll, charging, the tear, the deal, a flip for the tier, and a jingle when you earn a pack (${[...new Set(sn)].join(', ')})`);

  // pieces from drafts: once a day per player; from Silver up signings stop one piece short, the last comes from a pack
  const dr = await pg.evaluate(() => {
    const p = GM.players.find(q => q.name === 'Alan Shearer'), c0 = GM.cardPieces(p);
    GM.cardsFromDraft([p]); GM.cardsFromDraft([p]); const once = GM.cardPieces(p) - c0;
    const days = [];
    for (let i = 0; i < 6; i++) { const c = GM.store.get('cards'); c.seenDay = 'old'; GM.store.set('cards', c); GM.collectDraft({ mode: 'ultimate', stat: 'goals', total: 0, points: 0, xi: [p], slots: [], moments: [], rars: [] }); days.push(GM.cardPieces(p)); }
    const stuck = { pieces: GM.cardPieces(p), packed: GM.cardPackPieces(p), inXI: GM.packedXI().xi.some(s => s.player && s.player.name === 'Alan Shearer'), ach: Object.keys(GM.store.get('album').ach).includes('collegend') };
    const x = GM.cardPackPiece(p);   // one piece from a pack
    return { once, days, stuck, finished: x.finished, xi: GM.packedXI().xi.some(s => s.player && s.player.name === 'Alan Shearer') };
  });
  ok(dr.once === 1, 'signing the same player twice in a day gives one piece');
  ok(dr.days.join() === '2,3,4,4,4,4' && dr.stuck.pieces === 4 && dr.stuck.packed === 0, `signings fill a Legend to 4 of 5 and stop (${dr.days.join(' → ')})`);
  ok(!dr.stuck.inXI && !dr.stuck.ach, 'a Legend with four signings is not finished: not in the Packed XI, no Legendary badge');
  ok(dr.finished && dr.xi, 'one piece from a pack finishes him and he goes into the Packed XI');
  ok(await pg.evaluate(() => GM.best('packedxi') > 0 && GM.store.get('cards').best > 0), 'a better Packed XI goes on its leaderboard');
  await pg.evaluate(() => GM.checkGame('pack', 99, { legend: true, finished: ['l'] }));
  ok((await pg.evaluate(() => Object.keys(GM.store.get('album').ach))).includes('collegend'), 'finishing a Legend earns Legendary');
  // Bronze still finishes from one signing; a Legend can be finished by five packed pieces alone; old finished cards keep their place
  const rules = await pg.evaluate(() => {
    const b = GM.players.find(q => GM.cardTier(q) === 'b' && !GM.cardPieces(q)), l = GM.players.find(q => GM.cardTier(q) === 'l' && q.name !== 'Alan Shearer' && !GM.cardPieces(q));
    GM.cardsFromDraft([b]);
    const bronze = GM.cardsDone('b') >= 1;
    const done5 = []; for (let i = 0; i < 5; i++) done5.push(GM.cardPackPiece(l).finished);
    const c = GM.store.get('cards'); const s = GM.players.find(q => GM.cardTier(q) === 's' && !GM.cardPieces(q));
    c.p[s.pk] = 2; delete c.k[s.pk]; c.v = 1; GM.store.set('cards', c);   // a Silver finished by signings before this rule
    return { bronze, done5, grand: GM.cardsOwned().some(q => q.pk === s.pk) };
  });
  ok(rules.bronze, 'a Bronze card is still finished by signing him once');
  ok(rules.done5.join() === 'false,false,false,false,true', `five packed pieces finish a Legend on their own (${rules.done5})`);
  ok(rules.grand, 'a card finished before the pack rule stays finished');

  // three dailies in a day: a bonus pack
  const n3 = () => pg.evaluate(() => GM.store.get('cards').extra.filter(x => x.t === 'dailies').length);
  const before = await n3();
  await pg.evaluate(() => { GM.markDaily('footle', 3); GM.markDaily('daily', 400); GM.markDaily('grid', 7); GM.markDaily('grid', 8); });
  ok(await n3() === before + 1, 'three dailies in a day earn one Daily Hat-Trick Pack (not one per game after that)');
  // every kind of pack says what it is and why you got it, and has its own face
  const kinds = await pg.evaluate(async () => {
    const out = []; GM.packForce = {};
    for (const t of ['level', 'badge', 'royale', 'chaos']) {
      const c = GM.store.get('cards'); c.daily = GM.today(); c.extra = []; c.packs = 0; GM.store.set('cards', c);
      GM.givePack(1, 'test ' + t, t);
      GM.packOpening();
      const el = document.querySelector('.pack-open');
      const r = { t, face: !!el.querySelector('.pk-' + t), name: el.querySelector('.po-name').textContent, why: (el.querySelector('.po-why') || {}).textContent || '' };
      el.querySelector('.po-pack').click();
      await new Promise(res => setTimeout(res, 1800));
      r.cards = el.querySelectorAll('.po-cards .pcard').length;
      r.tiers = [...el.querySelectorAll('.po-cards .pcard')].map(x => (x.className.match(/tier-(\w)/) || [])[1]).join('');
      el.remove(); out.push(r);
    }
    return out;
  });
  kinds.forEach(k => ok(k.face && k.name.includes(GM_N[k.t]) && k.why.includes('test ' + k.t) && k.cards >= 3, `${GM_N[k.t]}: its own face, the name, why you got it, ${k.cards} cards (${k.tiers})`));
  ok(/[sgl].*[sgl]/.test(kinds[0].tiers.replace(/w/g, '')), 'a Level Up Pack has two Silver or better');
  ok(/[gl]/.test(kinds[2].tiers), 'a Royale Pack has a Gold or better');
  ok(kinds[1].tiers.includes('w') && kinds[2].tiers.includes('w'), 'Badge and Royale Packs always have a wildcard');

  // a wildcard: Pick one — three face up, your choice gets the piece
  await pg.evaluate(() => { GM.packForce = { wild: 'pick' }; const c = GM.store.get('cards'); c.packs = 1; c.extra = []; GM.store.set('cards', c); });
  const before2 = await pg.evaluate(() => Object.values(GM.store.get('cards').p).reduce((a, n) => a + n, 0));
  await pg.goto(U + '#/packs?open=1'); await pg.waitForTimeout(700);
  await pg.$eval('.po-pack', e => e.click());
  for (let i = 0; i < 40 && !(await pg.$('.choosing')); i++) await pg.waitForTimeout(300);
  await pg.waitForTimeout(800);
  const ch = await pg.evaluate(() => { const b = [...document.querySelectorAll('.po-choice [data-pick]')]; return { n: b.length, visible: b.every(e => e.querySelector('.pc-front').getBoundingClientRect().width > 50), name: b[2] && b[2].querySelector('.pc-name').textContent }; });
  ok(ch.n === 3 && ch.visible, 'a wildcard flips and offers three cards to choose from');
  ok(await pg.evaluate(() => snd.includes('wild') && snd.includes('box')), '…with its own sounds');
  await pg.$eval('[data-pick="2"]', e => e.click()); await pg.waitForTimeout(9000);
  const after2 = await pg.evaluate(() => ({ sum: Object.values(GM.store.get('cards').p).reduce((a, n) => a + n, 0), chosen: !!document.querySelector('.pack-open .pcard.from-wild'), done: !!document.querySelector('[data-done]') }));
  ok(after2.chosen && after2.done && after2.sum - before2 >= 4, `the pick (${ch.name}) takes the wildcard’s place and the pack finishes`);
  await pg.click('[data-done]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { GM.packForce = { wild: 'none' }; });

  // themed packs: a Nations pack in an international break, a Matchday pack when your club plays
  const themed = await pg.evaluate(() => {
    const d = new Date(), day = GM.today(), iso = x => x.toISOString().slice(0, 10);
    const c = GM.store.get('cards'); c.daily = ''; GM.store.set('cards', c);
    GM.setFixtures([[iso(new Date(Date.now() + 8 * 864e5)) + 'T14:00:00Z', 'Everton', 'Chelsea']], [[iso(new Date(Date.now() - 864e5)), iso(new Date(Date.now() + 5 * 864e5))]]);
    const t1 = GM.nextPackType(), nat = GM.PACKS.nations.nat(), r1 = GM.openPack();
    const allNat = r1.cards.every(x => x.p.nat === nat);
    const k = new Date(); k.setHours(23, 0, 0, 0);
    GM.setFixtures([[k.toISOString().slice(0, 19) + 'Z', 'Everton', 'Liverpool']], []);
    const c2 = GM.store.get('cards'); c2.daily = ''; GM.store.set('cards', c2);
    GM.store.set('club', 'Everton');
    const t2 = GM.nextPackType(), r2 = GM.openPack();
    const allMd = r2.cards.every(x => x.p.clubs.includes('Everton') || x.p.clubs.includes('Liverpool'));
    return { t1, nat, allNat, t2, allMd };
  });
  ok(themed.t1 === 'nations' && themed.allNat, `in an international break the free pack is a Nations pack, every piece from ${themed.nat}`);
  ok(themed.t2 === 'matchday' && themed.allMd, 'on your matchday it’s a Matchday pack of players from either side');

  // going up a rank: a Legends pack with a Legend's choice last
  const lg = await pg.evaluate(() => {
    GM.setFixtures([['2099-01-01T15:00:00Z', 'Everton', 'Chelsea']], []);
    const c = GM.store.get('cards'); c.packs = 0; c.extra = []; c.daily = GM.today(); GM.store.set('cards', c);
    GM.store.set('xp', 0); GM.addXP(560);  // level 1 → 5: Non-League
    return new Promise(res => setTimeout(() => { const t = GM.nextPackType(), r = GM.openPack(), last = r.cards[r.cards.length - 1];
      res({ t, wild: last.wild && last.wild.kind, legends: last.wild && last.wild.options.every(p => GM.cardTier(p) === 'l'), rest: r.cards.slice(0, 4).every(x => x.t !== 'b') }); }, 1800));
  });
  ok(lg.t === 'legends' && lg.wild === 'legend' && lg.legends, 'going up a rank earns a Legends pack, ending in a choice of three Legends');
  ok(lg.rest, '…and its other four pieces are Silver or better');

  // the Album: level and packs at the top, then My XI, Cards, Badges, Signed
  await pg.goto(U + '#/album'); await pg.waitForTimeout(500);
  ok(!!(await pg.$('.pitch.packed')) && /My XI/.test(await pg.textContent('.album-views a.on')) && !!(await pg.$('.alb-level')) && !!(await pg.$('.pack-box')), 'the Album opens on your Packed XI, with your level and packs at the top');
  ok(/replaced the old Dream XI/.test(await pg.textContent('#app, body')), 'and says what happened to the Dream XI');
  await pg.goto(U + '#/packs?v=cards'); await pg.waitForTimeout(400);
  ok((await pg.$$('.card-grid .pcard')).length >= 5 && /Cards/.test(await pg.textContent('.album-views a.on')), 'the Cards section shows what you’ve started');
  await pg.goto(U + '#/album?v=signed'); await pg.waitForTimeout(400);
  ok(!!(await pg.$('.sets')) && !!(await pg.$('a[href="#/album?b=purist"]')), 'Signed has your sets, clubs and a way to the Purist collection');
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

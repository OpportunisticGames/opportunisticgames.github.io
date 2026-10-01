// ⚔️ Goal Royale (a secret game): locked until you finish a Legend card; then the arena and your deck (your finished pack
// cards, topped up from the academy), the deck editor, a battle (playing cards costs stamina, only in your half, the hand
// cycles, the AI plays back), the engine (goals, three to win, abilities by tier), trophies and arenas, a pack every
// five wins, and balance (better cards win; even decks are close).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false); set('homeTab', 'quick'); });
  await pg.reload(); await pg.waitForTimeout(500);

  ok(/Collect a Legend/.test(await pg.textContent('.secret-tiles')), 'Goal Royale starts locked: “Collect a Legend card”');
  await pg.goto(U + '#/royale'); await pg.waitForTimeout(300);
  ok(!!(await pg.$('.secret-lock')), 'opening it before then shows the lock');
  // finish a Legend (and a few others)
  await pg.evaluate(() => {
    const c = { p: {}, packs: 0, daily: '', seen: {}, seenDay: '', opened: 3, best: 0, extra: [] }, T = t => GM.players.filter(p => GM.cardTier(p) === t);
    [T('l').find(p => p.pos === 'F'), T('g').find(p => p.pos === 'D'), T('s').find(p => p.pos === 'M'), T('s').find(p => p.pos === 'G')].forEach(p => { c.p[p.pk] = GM.TIERS[GM.cardTier(p)].need; });
    GM.store.set('cards', c);
  });
  await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  ok(/Goal Royale/.test(await pg.evaluate(() => (document.querySelector('.modal-wrap') || {}).textContent || '')), 'finishing a Legend unlocks it, with a celebration');
  await pg.goto(U + '#/royale'); await pg.waitForTimeout(400);
  const deck = await pg.evaluate(() => [...document.querySelectorAll('#grdeck .gr-card')].map(e => e.className + '|' + e.textContent));
  ok(/Sunday League/.test(await pg.textContent('.gr-arena')) && deck.length === 8 && deck.some(d => /t-l/.test(d) && /Talisman/.test(d)) && deck.some(d => /Academy|Striker|Midfielder/.test(d)), 'the arena, and a deck of eight: your finished cards (the Legend striker’s a Talisman) topped up from the academy');

  // the deck editor
  await pg.click('#grdeck'); await pg.waitForTimeout(300);
  await pg.click('[data-out]'); await pg.waitForTimeout(150);
  ok(await pg.$eval('#grsave', e => e.disabled), 'take one out: you can’t save seven');
  await pg.click('[data-in]'); await pg.waitForTimeout(150); await pg.click('#grsave'); await pg.waitForTimeout(300);
  ok((await pg.evaluate(() => GM.store.get('royale').deck.length)) === 8, 'put another in and save: your deck is remembered');

  // a battle
  await pg.click('#grgo'); await pg.waitForTimeout(500);
  ok(!!(await pg.$('.gr-pitch')) && (await pg.$$('[data-hand]')).length === 4, 'a battle: the pitch and four cards in your hand');
  await pg.waitForTimeout(1500);
  const before = await pg.evaluate(() => document.querySelector('#grstn').textContent);
  const next0 = await pg.evaluate(() => GM.goalRoyale.live.sides[0].next);
  await pg.evaluate(() => { const S = GM.goalRoyale.live.sides[0]; S.st = 10; const i = S.hand.findIndex(c => c.g !== 'G'); document.querySelector(`[data-hand="${i}"]`).click(); });  // a player, not a keeper boost
  const pitch = await pg.$eval('#grpitch', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await pg.mouse.click(pitch.x + pitch.w * 0.3, pitch.y + pitch.h * 0.2); await pg.waitForTimeout(200);
  ok(/Your half only/.test(await pg.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join())), 'you can only send players on in your own half');
  await pg.mouse.click(pitch.x + pitch.w * 0.3, pitch.y + pitch.h * 0.8); await pg.waitForTimeout(250);
  ok((await pg.$$('.gr-u.s0')).length >= 1 && +await pg.evaluate(() => document.querySelector('#grstn').textContent) < 10 && await pg.evaluate(() => GM.goalRoyale.live.sides[0].next) === next0 + 1, 'tap a card, tap your half: he runs on, it costs stamina, and the hand cycles');
  await pg.waitForTimeout(6000);
  ok((await pg.$$('.gr-u.s1')).length >= 1, 'the opponent plays cards too');

  // the engine, directly
  const eng = await pg.evaluate(() => {
    const R = GM.royaleCore, T = t => GM.players.filter(p => GM.cardTier(p) === t), out = {};
    const C = (t, g) => R.card(T(t).find(p => p.pos === g));
    const deck8 = t => ['F', 'F', 'M', 'M', 'M', 'D', 'D', 'G'].map(g => C(t, g));
    // a lone striker walks up and scores eventually; three goals win it
    let M = R.newMatch(deck8('b'), deck8('b'), { level: 0 }); M.ai.think = 999; M.sides[0].st = 10;
    M.sides[0].hand[0] = C('b', 'F'); R.play(M, 0, 0, 0.5, 0.3);
    let n = 0; while (!M.fx.some(f => f.k === 'goal' || f.k === 'save') && n++ < 600) { M.ai.think = 999; R.step(M, 0.05); }
    out.shoot = M.fx.some(f => f.k === 'goal' || f.k === 'save');
    M = R.newMatch(deck8('b'), deck8('b')); M.sides[0].score = 2; M.ai.think = 999;
    const f = R.card(T('l').find(p => p.pos === 'F')); M.units.push({ id: 99, s: 0, c: f, x: 0.5, y: 0.9, hp: 500, max: 500, atk: 10, spd: 0.1, shot: 200, aggro: 0.05, cd: 0, stun: 0, hit: {} });
    n = 0; while (!M.over && n++ < 400) { M.ai.think = 999; R.step(M, 0.05); }
    out.three = M.over === 'win';
    // abilities: The Wall blocks three shots; Maestro brings two runners; Colossus has double stamina
    M = R.newMatch(deck8('b'), deck8('b')); M.sides[1].hand[0] = C('l', 'G'); M.sides[1].st = 10; R.play(M, 1, 0, 0.5, 0.9);
    out.wall = M.sides[1].wall === 3;
    M = R.newMatch(deck8('b'), deck8('b')); M.sides[0].hand[0] = C('l', 'M'); M.sides[0].st = 10; R.play(M, 0, 0, 0.5, 0.2);
    out.maestro = M.units.filter(u => u.s === 0).length === 3;
    const cb = R.statsOf(C('l', 'D')), bd = R.statsOf(C('b', 'D')); out.colossus = cb.hp > bd.hp * 2.2;
    out.costs = [C('b', 'F').cost, C('g', 'F').cost, C('l', 'F').cost].join(',');
    // can't afford it, can't play it
    M = R.newMatch(deck8('l'), deck8('b')); M.sides[0].st = 1; out.broke = !R.play(M, 0, 0, 0.5, 0.2);
    // balance (bots for both sides)
    const bot = M => { const S = M.sides[0]; M.b0 = (M.b0 || 0) - 0.05; if (M.b0 > 0) return; M.b0 = 1; const aff = S.hand.map((c, i) => [c, i]).filter(([c]) => c.cost <= S.st); if (!aff.length) return;
      const th = M.units.filter(u => u.s === 1 && u.y < 0.5).sort((a, b) => a.y - b.y)[0]; if (th) { const d = aff.filter(([c]) => c.g !== 'F' && c.g !== 'G')[0]; if (d) return R.play(M, 0, d[1], th.x, Math.max(0.08, th.y - 0.1)); }
      const a = aff.filter(([c]) => c.g === 'F' || c.g === 'M').sort((x, y) => y[0].cost - x[0].cost)[0]; if (a && (S.st >= 6 || Math.random() < 0.35)) R.play(M, 0, a[1], Math.random() < 0.5 ? 0.28 : 0.72, 0.4); };
    const run = (d0, d1, lv) => { const M = R.newMatch(d0, d1, { level: lv }); let k = 0; while (!M.over && k++ < 6000) { bot(M); R.step(M, 0.05); } return M.over; };
    let w = 0; for (let i = 0; i < 20; i++) if (run(R.aiDeck(4, 'x' + i), R.aiDeck(0, 'y' + i), 0) === 'win') w++;
    out.legendsWin = w;
    let e = 0; for (let i = 0; i < 20; i++) if (run(R.aiDeck(3, 'p' + i), R.aiDeck(3, 'q' + i), 3) === 'win') e++;
    out.even = e;
    return out;
  });
  ok(eng.shoot, 'a forward runs at goal and shoots');
  ok(eng.three, 'three goals wins it');
  ok(eng.wall && eng.maestro && eng.colossus, 'Legend abilities: The Wall (blocks three), Maestro (two runners), Colossus (double stamina)');
  ok(eng.costs === '3,4,6' && eng.broke, 'Legends cost more (bronze 3, gold 4, Legend 6), and you can’t play what you can’t afford');
  ok(eng.legendsWin >= 16, `balance: a Legend-heavy deck beats a bronze one (${eng.legendsWin}/20)`);
  ok(eng.even >= 5 && eng.even <= 15, `…and even decks are a contest (${eng.even}/20)`);

  // the result: trophies, arenas, a pack every five wins (a real battle, won at the end)
  await pg.evaluate(() => { const st = GM.store.get('royale'); st.trophies = 190; st.wins = 4; st.played = 4; GM.store.set('royale', st); });
  const packs0 = await pg.evaluate(() => GM.packsWaiting());
  await pg.goto(U + '#/'); await pg.goto(U + '#/royale'); await pg.waitForTimeout(400);
  await pg.click('#grgo'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const M = GM.goalRoyale.live; M.sides[0].score = 3; M.over = 'win'; });
  await pg.waitForTimeout(800);
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  const fin = await pg.evaluate(() => ({ cls: (document.querySelector('.gr-result') || {}).className || '', st: GM.store.get('royale'), packs: GM.packsWaiting(), best: GM.best('royale') }));
  ok(/win/.test(fin.cls) && fin.st.played === 5 && fin.st.trophies === 220 && fin.best === 220, `a win: +30 trophies (${fin.st.trophies}), on the board`);
  ok(fin.packs >= packs0 + 1 && /New arena/.test(await pg.textContent('.gr-hub')) && /5 more wins/.test(await pg.textContent('.gr-hub')), 'the fifth win brings a pack, and 200 trophies a new arena (Non-League)');
  // the tester's link unlocks everything on this device
  await pg.evaluate(() => { ['reign', 'hattrick', 'royale'].forEach(id => localStorage.removeItem('gm:secret:' + id)); localStorage.setItem('gm:played', '0'); localStorage.setItem('gm:cards', 'null'); });
  await pg.goto(U + '#/'); await pg.goto(U + '#/tester?code=wrong'); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => !GM.secretUnlocked('reign')), 'a wrong tester code does nothing');
  await pg.goto(U + '#/tester?code=' + await pg.evaluate(() => GM.TESTER_CODE)); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => GM.SECRET_GAMES.every(g => GM.secretUnlocked(g.id))) && /#\/$/.test(await pg.evaluate(() => location.hash)), 'the tester link unlocks every secret game and goes Home');
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

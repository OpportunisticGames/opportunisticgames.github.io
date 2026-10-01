// 👑 Reign Check (a secret game): locked until you sack a coach in Dodgy Owner; then the intro, four meters, swiping
// (buttons and dragging, with the dots preview), story chains, the season's end, hiring a coach, endings at zero and a
// hundred and selling up, the endings collection and objectives, the score, and a balance check (care beats chance).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false); });
  await pg.reload(); await pg.waitForTimeout(400);
  const R = () => pg.evaluate(() => GM.store.get('reign:save'));

  await pg.goto(U + '#/reign'); await pg.waitForTimeout(300);
  ok(/Locked/.test(await pg.textContent('.secret-lock')) && /Sack a head coach/.test(await pg.textContent('.sl-hint')), 'locked at first, with the hint');
  await pg.evaluate(() => GM.store.set('owner:sacked', 1));
  await pg.goto(U + '#/'); await pg.goto(U + '#/reign'); await pg.waitForTimeout(400);
  ok(/Reign Check/.test(await pg.textContent('.rg-endcard')) && await pg.evaluate(() => document.body.classList.contains('owner-mode')), 'unlocked: the intro, in the dodgy owner look');
  await pg.click('#rggo'); await pg.waitForTimeout(400);
  let st = await R();
  ok((await pg.$$('.rg-meter')).length === 4 && Object.values(st.m).every(v => v === 50) && !!(await pg.$('#rgcard')) && (await pg.$$('[data-side]')).length === 2, 'four meters at half, a card with someone wanting something, and two answers');

  // dragging shows the answer and which meters move
  const box = await pg.$eval('#rgcard', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await pg.mouse.move(box[0], box[1]); await pg.mouse.down(); await pg.mouse.move(box[0] + 70, box[1], { steps: 6 });
  const drag = await pg.evaluate(() => ({ shown: document.querySelector('#rgcard').classList.contains('show-r'), dots: document.querySelectorAll('.rg-dot.small, .rg-dot.big').length }));
  ok(drag.shown && drag.dots >= 1, `dragging right shows the right-hand answer and dots on the meters it’ll move (${drag.dots})`);
  await pg.mouse.move(box[0] + 220, box[1], { steps: 6 }); await pg.mouse.up(); await pg.waitForTimeout(600);
  st = await R();
  ok(st.week === 2 && st.log.length === 1 && /:R$/.test(st.log[0]), 'letting go past the edge chooses it, and a week passes');
  await pg.click('[data-side="L"]'); await pg.waitForTimeout(600);
  ok((await R()).week === 3, 'the buttons work too');

  // the rules, directly
  const rules = await pg.evaluate(() => {
    const C = GM.reignCore, out = {};
    const fresh = () => { const meta = C.blankMeta(), st = C.newReign(meta); return { meta, st }; };
    // a story chain: Vegas, then the photos
    let { meta, st } = fresh(); st.card = 'vegas'; C.apply(st, meta, 'R');
    let saw = false; for (let i = 0; i < 40 && !st.over; i++) { if (st.card === 'photos') { saw = true; break; } C.apply(st, meta, st.m.c < 50 ? 'L' : 'R'); }
    out.chain = saw || !!st.over;
    // the season ends at week 38
    ({ meta, st } = fresh()); st.week = 39; st.card = C.draw(st);
    const sc = C.cardOf(st, st.card); out.season = st.card === 'season' && /Season 1 is over/.test(sc.text) && sc.pos >= 1 && sc.pos <= 20;
    // a sacking: the next card is hiring a coach, and the coach changes
    ({ meta, st } = fresh()); st.m.f = 30; st.card = 'sackcalls'; const before = st.coach; C.apply(st, meta, 'R');
    const hc = C.cardOf(st, st.card); C.apply(st, meta, 'L'); out.hire = hc.id === 'hire' && st.coach !== before && st.sacks === 1;
    // endings: a meter at zero, a meter at a hundred, selling up
    ({ meta, st } = fresh()); st.m.c = 5; st.card = 'striker'; C.apply(st, meta, 'R'); out.c0 = st.over === 'c0';
    ({ meta, st } = fresh()); st.m.f = 95; st.card = 'tickets'; C.apply(st, meta, 'R'); out.f100 = st.over === 'f100';
    ({ meta, st } = fresh()); st.flags.sheikh = 1; st.card = 'sellup'; C.apply(st, meta, 'R'); out.sold = st.over === 'sold' && meta.endings.sold === 1;
    // the longer you reign, the bigger the swings
    ({ meta, st } = fresh()); st.week = 39 * 2; st.seasonDone = true; st.card = 'tickets'; C.apply(st, meta, 'R'); out.scale = st.m.f > 65;
    // balance: random swiping v keeping things in the middle
    const run = smart => { const m = C.blankMeta(), s = C.newReign(m); let n = 0; while (!s.over && n++ < 1500) { const c = C.cardOf(s, s.card); let side = Math.random() < 0.5 ? 'L' : 'R'; if (smart) { const cost = fx => ['f', 's', 'c', 'l'].reduce((a, k, i) => a + Math.pow(Math.abs(Math.max(0, Math.min(100, s.m[k] + fx[i])) - 50), 2.2), 0); side = cost(c.L[1]) <= cost(c.R[1]) ? 'L' : 'R'; } C.apply(s, m, side); } return s.week - 1; };
    const med = smart => { const r = []; for (let i = 0; i < 101; i++) r.push(run(smart)); r.sort((a, b) => a - b); return r[50]; };
    out.random = med(false); out.smart = med(true);
    out.cards = C.CARDS.length; out.endings = Object.keys(C.ENDINGS).length;
    return out;
  });
  ok(rules.chain, 'stories carry on: the Vegas trip comes back as photos');
  ok(rules.season, 'every 38 weeks the season ends, and how you ran the club decides where you finish');
  ok(rules.hire, 'sacking the coach brings a card to hire a new one');
  ok(rules.c0 && rules.f100 && rules.sold, 'endings: money at zero (administration), fans at a hundred (the statue), or selling up');
  ok(rules.scale, 'the swings grow every season');
  ok(rules.cards >= 60 && rules.endings === 9, `${rules.cards} cards and ${rules.endings} endings`);
  ok(rules.random >= 5 && rules.smart >= rules.random * 3, `balance: random swiping lasts ~${rules.random} weeks, keeping things in the middle ~${rules.smart}`);

  // dying for real: the ending screen, the collection, the score
  await pg.evaluate(() => { const st = GM.store.get('reign:save'); st.m.c = 3; st.card = 'striker'; GM.store.set('reign:save', st); });
  await pg.goto(U + '#/'); await pg.goto(U + '#/reign'); await pg.waitForTimeout(400);
  await pg.click('[data-side="R"]'); await pg.waitForTimeout(700);
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  const end = await pg.evaluate(() => ({ title: (document.querySelector('.rg-endcard b') || {}).textContent, got: document.querySelectorAll('.rg-endings .got').length, best: GM.best('reign'), meta: GM.store.get('reign:meta') }));
  ok(end.title === 'Administration' && end.got >= 1 && end.best >= 2 && end.meta.endings.c0 === 1, `going bust: “${end.title}”, the ending’s collected, the score’s on the board (${end.best})`);
  await pg.click('#rgagain'); await pg.waitForTimeout(400);
  ok((await R()).owner === 2 && /Owner #2/.test(await pg.textContent('.rg-foot')), 'the next owner takes over (Owner #2)');
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

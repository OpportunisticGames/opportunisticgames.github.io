// 5.38, online: the level (Hard by default), the opponent's XI secret until you've finished, the bigger total wins,
// the result stays on screen, no notification for a result you watched, the 🔔 count, Scout's Tip, Seasonal CHAOS races.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
async function phone(b, name, key, errs) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U); await pg.evaluate(([n, k]) => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:calm', 'true'); localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k })); }, [name, key]);
  return pg;
}
async function playDraft(pg) {
  for (let step = 0; step < 220; step++) {
    const st = await pg.evaluate(() => {
      document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
      if (document.querySelector('.result-total, .o-hero')) return 'done';
      const mg = document.querySelector('.cm [data-mgr]'); if (mg) { mg.click(); return 'mgr'; }
      const cm = document.querySelector('.cm:not(.out)'); if (cm) { cm.click(); return 'moment'; }
      const sp = document.getElementById('spin'); if (sp) { sp.click(); return 'spin'; }
      const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
      const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
      (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
    }).catch(() => 'err');
    if (st === 'done') return true;
    await pg.waitForTimeout(st === 'spin' ? 1300 : 450);
  }
  return false;
}
const done = (code, seat, sum) => server.rooms[code].race[seat] = { n: 11, done: true, x: [['GK', 'x|1', 1]], ...sum };
(async () => {
  const b = await chromium.launch(), errs = [];
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs), B = await phone(b, 'Bob', 'b'.repeat(28), errs);
  // New game: the main four first, Hard by default
  await A.goto(U + '#/online'); await A.waitForTimeout(900);
  await A.click('#onew'); await A.waitForTimeout(300);
  const ng = await A.evaluate(() => ({ main: [...document.querySelectorAll('.ng-games')][0].querySelectorAll('.ng-game').length, first: document.querySelector('.ng-game').dataset.k,
    more: [...document.querySelectorAll('.ng-more .ng-game')].map(e => e.dataset.k).join(), lvl: (document.querySelector('#nlevel .on') || {}).dataset.v, sz: (document.querySelector('.ng-game[data-k="szchaos"] b') || {}).textContent }));
  ok(ng.main === 4 && ng.first === 'chaos' && /hattrick/.test(ng.more) && ng.lvl === 'hard' && /CHAOS Race/.test(ng.sz || ''), `New game: CHAOS, Seasonal CHAOS, Target and Live first, Hard picked (${JSON.stringify(ng)})`);
  await A.fill('#nname', 'Bob'); await A.click('.ng-game[data-k="race"]'); await A.click('#ngo'); await A.waitForTimeout(1500);
  const code = Object.keys(server.rooms).pop();
  ok(server.rooms[code].level === 'hard', `the room is played at Hard (${server.rooms[code].level})`);
  ok(await A.evaluate(() => !!document.querySelector('.hard-pill') && GM.draft.state().hard), 'and the draft is Hard (names and positions only)');
  // Bob finishes first: Alice, still playing, can't see his XI
  done(code, 'guest', { t: 400, r: 90, ms: 60000 });
  await A.evaluate(() => GM.online.refresh && GM.online.refresh()); await A.waitForTimeout(1500);
  const seen = await A.evaluate(async c => { const r = await GM.lb.rpc('online_get', { p_code: c, p_user: 'Alice' }); return { x: !!(r.race.guest || {}).x, n: (r.race.guest || {}).n }; }, code);
  ok(!seen.x && seen.n === 11, 'while you\'re playing, the server leaves your opponent\'s XI out (their count and score still come)');
  await A.click('[data-oppxi]'); await A.waitForTimeout(300);
  const modal = await A.evaluate(() => (document.querySelector('.modal-wrap') || {}).innerText || '');
  ok(/stays secret/.test(modal) && /11\/11/.test(modal), `the XI button only says how far they've got (${modal.replace(/\s+/g, ' ').slice(0, 70)})`);
  await A.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  // Alice finishes: a bigger total beats a better rating and a quicker time; the result stays up
  ok(await playDraft(A), 'Alice plays her XI to the end');
  await A.waitForTimeout(2500);
  const mine = server.rooms[code].race.host || {};
  ok(server.rooms[code].result && server.rooms[code].result.winner === (mine.t > 400 ? 'host' : 'guest') && server.rooms[code].result.by === 'host', `the bigger total wins outright, whatever the rating and time (${mine.t} v 400 → ${server.rooms[code].result && server.rooms[code].result.winner})`);
  await A.waitForTimeout(5000);
  const after = await A.evaluate(() => ({ hero: !!document.querySelector('.o-hero'), solo: !!document.querySelector('.result-total'), rows: [...document.querySelectorAll('.cmp-points tr')].map(r => r.innerText.replace(/\s+/g, ' ')).join(' | ') }));
  ok(after.hero && !after.solo, 'the result card stays on screen (the draft doesn\'t draw back over it)');
  ok(/wins it/i.test(after.rows) && /if level/i.test(after.rows) && !/Pts/.test(after.rows), `the table: the total wins it, rating and time only if level (${after.rows.slice(0, 120)})`);
  await A.screenshot({ path: 'lay/o538_result.png' });
  // notifications: Alice watched it happen; Bob didn't
  const inbox = async (pg, n) => pg.evaluate(async n => (await GM.lb.rpc('app_inbox', { p_user: n, p_prefs: {} })).map(x => x.id), n);
  ok(!(await inbox(A, 'Alice')).includes('r:' + code) && (await inbox(B, 'Bob')).includes('r:' + code), 'no notification for the result you just watched; your opponent gets one');
  // the 🔔: a number for the result Bob hasn't seen, gone once he's looked
  await B.goto(U + '#/'); await B.waitForTimeout(800); await B.evaluate(() => GM.feed.load(true)); await B.waitForTimeout(1600);
  const bell1 = await B.evaluate(() => (document.querySelector('.gs-bell i') || {}).textContent || '');
  await B.goto(U + '#/online?room=' + code); await B.waitForTimeout(2200);
  await B.goto(U + '#/'); await B.waitForTimeout(1200);
  const bell2 = await B.evaluate(() => (document.querySelector('.gs-bell i') || {}).textContent || '');
  ok(+bell1 >= 1 && !bell2, `the 🔔 shows a number for the new result (${bell1}), and it goes once you've seen it (${bell2 || 'none'})`);
  // 😂 a reaction, seen by the other player
  await A.click('[data-rx="🔥"]'); await A.waitForTimeout(400);
  await B.goto(U + '#/online?room=' + code); await B.waitForTimeout(2200);
  const their = await B.evaluate(() => (document.querySelector('.o-their') || {}).innerText || '');
  ok(server.rooms[code].reacts && server.rooms[code].reacts.host === '🔥' && /Alice/.test(their) && /🔥/.test(their), `a reaction to the result reaches your opponent (${their.replace(/\s+/g, ' ')})`);
  await B.goto(U + '#/'); await B.waitForTimeout(400);
  // ⚔️ Home: a card when a friend's waiting on you; Friends: this month's record
  await A.click('#onew').catch(() => {});
  const c2 = await A.evaluate(async () => (await GM.lb.rpc('online_create', { p_user: 'Bob', p_key: 'b'.repeat(28), p_kind: 'race', p_stat: 'goals', p_opp: 'Alice', p_level: 'hard' })).code);
  await A.goto(U + '#/'); await A.waitForTimeout(600); await A.evaluate(() => GM.feed.load(true)); await A.waitForTimeout(1500);
  const ym = await A.evaluate(() => (document.querySelector('.your-move') || {}).innerText || '');
  ok(/move|Bob/.test(ym) && /Play/.test(ym), `Home shows a your-move card when a friend's waiting on you (${ym.replace(/\s+/g, ' ')})`);
  await A.goto(U + '#/online?tab=friends'); await A.waitForTimeout(1500);
  const fm = await A.evaluate(() => (document.querySelector('.f-month') || {}).innerText || '');
  ok(/This month: W\d D\d L\d/.test(fm), `Friends: your record with each this month (${fm})`);
  // Scout's Tip: three cards you can tap
  await A.goto(U + '#/'); await A.waitForTimeout(800);
  await A.evaluate(() => { GM.addConsum('scout', 1); const pk = n => GM.players.find(p => p.name === n); ['Alan Shearer', 'Frank Lampard', 'Tim Cahill'].forEach(n => GM.cardPackPiece(pk(n))); GM.useScout(); });
  await A.waitForTimeout(500);
  const sc = await A.evaluate(() => [...document.querySelectorAll('.scout-pick button')].map(b => Math.round(b.getBoundingClientRect().width)));
  ok(sc.length >= 2 && sc.every(w => w > 60), `Scout's Tip shows its cards properly (${sc.join(', ')} px wide)`);
  await A.screenshot({ path: 'lay/o538_scout.png' });
  await A.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  // a Seasonal CHAOS race plays Seasonal CHAOS
  await A.goto(U + '#/online'); await A.waitForTimeout(900);
  await A.click('#onew'); await A.waitForTimeout(300); await A.fill('#nname', 'Bob'); await A.click('.ng-game[data-k="szchaos"]'); await A.click('#ngo'); await A.waitForTimeout(2000);
  const sz = await A.evaluate(() => { const S = GM.draft.state(); return { mode: S && S.mode, sz: S && S.sz }; });
  ok(sz.mode === 'szchaos' && server.rooms[Object.keys(server.rooms).pop()].variant === 'szchaos', `a Seasonal CHAOS Race plays Seasonal CHAOS (${JSON.stringify(sz)})`);
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); server.close && server.close();
})();

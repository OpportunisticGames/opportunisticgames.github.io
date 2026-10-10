// 5.23.2: your challenges are easy to find. Bob takes on Alice's challenge; Alice gets a card at the top of the screen,
// sees it on the Online tab (Games and Finished), on the ⚔️ Your challenges page, and from Bob's menu on Friends.
//   node fixes5232.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
async function phone(b, name, key, errs) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U); await pg.evaluate(([n, k]) => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k })); }, [name, key]);
  await pg.reload(); await pg.waitForTimeout(800);
  return pg;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs), B = await phone(b, 'Bob', 'b'.repeat(28), errs);
  await A.evaluate(() => GM.lb.rpc('online_add_friend', { p_user: 'Alice', p_key: 'a'.repeat(28), p_friend: 'Bob' }));
  const c = await A.evaluate(() => GM.lb.rpc('challenge_create', { p_user: 'Alice', p_key: 'a'.repeat(28), p_mode: 'chaos', p_stat: 'goals', p_seed: 's1', p_hard: false, p_score: 1676, p_total: 1000, p_game: { unit: 'pts' } }));
  await A.evaluate(() => GM.challenge.checkNew()); await A.waitForTimeout(300);  // first look: nothing old pops up
  ok(!(await A.$('.notice')), 'nothing old pops up the first time');
  const s = await B.evaluate(code => GM.lb.rpc('challenge_start', { p_user: 'Bob', p_key: 'b'.repeat(28), p_code: code }), c.code);
  await B.evaluate(([s]) => GM.lb.rpc('challenge_progress', { p_play: s.play, p_token: s.token, p_score: 300, p_total: 200, p_done: false }), [s]);
  await A.evaluate(() => GM.challenge.checkNew()); await A.waitForTimeout(400);
  const live = await A.evaluate(() => { const n = document.querySelector('.notice'); return n ? n.textContent + ' ' + n.getAttribute('href') : ''; });
  ok(/Bob’s taking on your challenge/.test(live) && /watch=/.test(live), `Alice is told Bob's taking it on, with a link to watch along (${live.trim()})`);
  await A.evaluate(() => document.querySelectorAll('.notice').forEach(n => n.remove()));
  await B.evaluate(([s]) => GM.lb.rpc('challenge_progress', { p_play: s.play, p_token: s.token, p_score: 1347, p_total: 800, p_done: true }), [s]);
  await A.evaluate(() => GM.challenge.checkNew()); await A.waitForTimeout(400);
  const res = await A.evaluate(() => { const n = document.querySelector('.notice'); return n ? n.textContent + ' ' + n.getAttribute('href') : ''; });
  ok(/held off Bob/.test(res) && /1,347 v your 1,676/.test(res) && /&p=/.test(res), `and when he's done: the result, linking to the head-to-head (${res.trim()})`);
  await A.evaluate(() => { document.querySelectorAll('.notice').forEach(n => n.remove()); return GM.challenge.checkNew(); }); await A.waitForTimeout(300);
  ok(!(await A.$('.notice')), 'each one is shown once');
  // the Online tab
  await A.goto(U + '#/online?tab=games'); await A.waitForTimeout(1500);
  const games = await A.textContent('#olists');
  ok(/Challenges/.test(games) && /Took on yours/.test(games) && /1,676–1,347/.test(games), 'the Games tab lists the challenge with the score');
  await A.screenshot({ path: 'lay/ch_games.png' });
  await A.click('#otabs [data-t="done"]'); await A.waitForTimeout(200);
  ok(/Took on yours/.test(await A.textContent('#odone')), 'and so does Finished');
  await A.click('#otabs [data-t="friends"]'); await A.waitForTimeout(200);
  const rec = await A.evaluate(() => { const m = document.querySelector('.friend .f-main'); m.insertAdjacentHTML('beforeend', '<span class="rec" id="trec"><b class="w">W4</b> <b class="d">D0</b> <b class="l">L9</b></span>'); const r = document.getElementById('trec'); const cs = r && getComputedStyle(r); return r ? { w: r.getBoundingClientRect().width, anim: cs.animationName } : null; });
  ok(rec && rec.w > 40 && rec.anim === 'none', `the W–D–L record sits still at full size (${JSON.stringify(rec)})`);
  await A.click('[data-fmenu="Bob"]'); await A.waitForTimeout(200);
  const menu = await A.$('.modal a[href^="#/rival?name=Bob"]');
  ok(!!menu, "Bob's menu on Friends links to your challenges with him");
  await A.goto(U + '#/challenges'); await A.waitForTimeout(1200);
  const page = await A.textContent('#app');
  ok(/Your challenges/.test(page) && /Took on yours/.test(page) && /1–0/.test(page), 'the ⚔️ Your challenges page: every challenge and your record per friend');
  await A.screenshot({ path: 'lay/ch_list.png' });
  await A.click('.ch-mine'); await A.waitForTimeout(1200);
  ok(/held off|beat|Bob/i.test(await A.textContent('#app')) && A.url().includes('&p='), 'tapping it opens the head-to-head');
  await B.goto(U + '#/challenges'); await B.waitForTimeout(1200);
  ok(/You took on theirs/.test(await B.textContent('#app')) && /Alice/.test(await B.textContent('#app')), "Bob's list has the one he took on");
  // 5.23.3: challenge a friend in the app – Alice sends a new challenge straight to Bob
  const c2 = await A.evaluate(() => GM.lb.rpc('challenge_create', { p_user: 'Alice', p_key: 'a'.repeat(28), p_mode: 'classic', p_stat: 'goals', p_seed: 's2', p_hard: false, p_score: 40, p_total: 40, p_game: {} }));
  await A.evaluate(code => { GM.share = (t, u) => { window._shared = u; }; window._S = { chCode: code }; GM.challenge.send(window._S, { total: 40 }, 'Beat me'); }, c2.code); await A.waitForTimeout(600);
  const sheet = await A.evaluate(() => ({ title: (document.querySelector('.modal h3') || {}).textContent, bob: !!document.querySelector('.ch-pick [data-f="Bob"]'), dis: document.getElementById('chp-send').disabled }));
  ok(/Challenge a friend/.test(sheet.title) && sheet.bob && sheet.dis, 'challenging opens a sheet with your friends (send is off until you pick one)');
  await A.screenshot({ path: 'lay/ch_sheet.png' });
  await A.click('.ch-pick [data-f="Bob"]'); await A.waitForTimeout(150);
  ok(/Send to Bob/.test(await A.textContent('#chp-send')), 'pick Bob: “Send to Bob”');
  await A.click('#chp-send'); await A.waitForTimeout(600);
  const toast = await A.evaluate(() => document.body.innerText);
  ok(/Sent to Bob/.test(toast) && !(await A.$('.modal')), 'sent, with a toast');
  await A.evaluate(() => GM.challenge.send(window._S, { total: 40 }, 'Beat me')); await A.waitForTimeout(500);
  ok(await A.evaluate(() => { const b = document.querySelector('.ch-pick [data-f="Bob"]'); return b && b.disabled && /sent/.test(b.textContent); }), 'open it again: Bob shows as sent');
  await A.click('#chp-link'); await A.waitForTimeout(200);
  ok(/#\/c\?id=/.test(await A.evaluate(() => window._shared)), 'or send a link instead');
  await B.evaluate(() => GM.challenge.checkNew()); await B.waitForTimeout(400);
  const bn = await B.evaluate(() => { const n = document.querySelector('.notice'); return n ? n.textContent + ' ' + n.getAttribute('href') : ''; });
  ok(/Alice challenged you/.test(bn) && bn.includes('#/c?id=' + c2.code), `Bob gets a card in the app (${bn.trim()})`);
  await B.goto(U + '#/'); await B.goto(U + '#/challenges'); await B.waitForTimeout(1200);
  const bl = await B.textContent('#app');
  ok(/Challenged you/.test(bl) && /beat 40/.test(bl), 'and it waits in his challenges list (' + bl.replace(/\s+/g, ' ').slice(0, 200) + ')');
  await A.goto(U + '#/challenges'); await A.waitForTimeout(1200);
  ok(/Sent to Bob/.test(await A.textContent('#app')), "Alice's list says who she sent it to");
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); server.close && server.close();
})();

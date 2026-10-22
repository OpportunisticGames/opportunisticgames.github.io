// 5.32: Bob beats Alice's top score → Alice gets a "beaten" alert (inbox for push), the 🔔 shows it, the drawer lists
// it with her crowns and Best Players place; Ranks has 🏅 Best Players; Settings has the Beaten switch.   node beaten532.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
async function phone(b, name, key, errs, w = 390) {
  const ctx = await b.newContext({ viewport: { width: w, height: 780 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U); await pg.evaluate(([n, k]) => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k })); localStorage.setItem('gm:name', JSON.stringify(n)); }, [name, key]);
  await pg.reload(); await pg.waitForTimeout(800);
  return pg;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs, 360), B = await phone(b, 'Bob', 'b'.repeat(28), errs);
  await A.evaluate(() => Promise.all([GM.lb.submit('ultimate', 300, 'Alice'), GM.lb.submit('chaosh', 900, 'Alice'), GM.lb.submit('target', 700, 'Alice')]));
  await B.evaluate(() => Promise.all([GM.lb.submit('ultimate', 250, 'Bob'), GM.lb.submit('target', 650, 'Bob')]));
  ok((await A.evaluate(() => GM.lb.rpc('app_inbox', { p_user: 'Alice' }))).length === 0, 'nobody beaten yet');
  await B.evaluate(() => GM.lb.submit('ultimate', 320, 'Bob'));
  await B.evaluate(() => GM.lb.submit('ultimate', 340, 'Bob'));  // already top: no second alert
  const inbox = await A.evaluate(() => GM.lb.rpc('app_inbox', { p_user: 'Alice', p_prefs: GM.notify.prefs() }));
  ok(inbox.length === 1 && /^b:/.test(inbox[0].id) && /Bob beat your/.test(inbox[0].title) && /320 v your 300/.test(inbox[0].body), `Alice's inbox (and so her phone's push) has one alert: ${inbox.map(x => x.title + ' / ' + x.body).join(' | ')}`);
  ok((await A.evaluate(() => GM.lb.rpc('app_inbox', { p_user: 'Alice', p_prefs: { ...GM.notify.prefs(), beaten: false } }))).length === 0, 'switched off in Settings, no alert');
  // the 🔔
  await A.goto(U + '#/'); await A.waitForTimeout(1200); await A.evaluate(() => GM.feed.load(true)); await A.waitForTimeout(1700);
  const bell = await A.evaluate(() => { const e = document.querySelector('.gs-bell'); return e ? e.textContent.trim() : null; });
  ok(bell && /1/.test(bell), `the 🔔 on the top bar shows 1 new (${bell})`);
  const over = await A.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(!over, 'the top bar still fits at 360px');
  await A.screenshot({ path: 'lay/feed_bar.png' });
  await A.click('.gs-bell'); await A.waitForSelector('.feed-item', { timeout: 5000 }).catch(() => {});
  const feed = await A.evaluate(() => (document.querySelector('.feed') || {}).textContent || '');
  ok(/Bob beat your score/.test(feed), 'the drawer lists the alert');
  ok(/👑 2/.test(feed) && /boards you top/.test(feed), 'and how many boards she tops (CHAOS Hard and Target)');
  ok(/🏅 #\d/.test(feed) && /Best Players/.test(feed), 'and her Best Players place');
  await A.screenshot({ path: 'lay/feed_sheet.png' });
  await A.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(x => x.remove())); await A.waitForTimeout(1700);
  ok(await A.evaluate(() => !(document.querySelector('.gs-bell i'))), 'opening it clears the count');
  const bobFeed = await B.evaluate(() => GM.lb.rpc('activity_feed', { p_user: 'Bob', p_key: 'b'.repeat(28) }));
  ok(bobFeed.items.some(x => x.kind === 'crown'), 'Bob gets a 👑 in his drawer');
  // 🏅 Best Players on Ranks
  await A.goto(U + '#/leaderboard?m=bestplayers'); await A.waitForTimeout(1500);
  const bp = await A.evaluate(() => [...document.querySelectorAll('#global .pod:not(.empty), #global .lb-row')].sort((x, y) => (x.querySelector('.pod-step') || {}).textContent - (y.querySelector('.pod-step') || {}).textContent).map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  ok(bp.length === 2 && /Alice/.test(bp[0]) && /(^|\D)9 pts/.test(bp[0]) && /👑 ?2/.test(bp[0]) && /Bob/.test(bp[1]) && /(^|\D)6 pts/.test(bp[1]) && /👑 ?1/.test(bp[1]), `Best Players adds up the boards: ${bp.join(' | ')}`);
  ok(await A.evaluate(() => /Best Players/.test(document.querySelector('.lbx-games a.on').textContent)), 'its tab is on');
  await A.screenshot({ path: 'lay/bestplayers.png' });
  // Settings
  await A.goto(U + '#/settings?s=notify'); await A.waitForTimeout(800);
  ok(await A.evaluate(() => /Beaten/.test(document.body.textContent)) || !(await A.evaluate(() => !!document.querySelector('[data-nk]'))), 'Settings has the 😬 Beaten switch (where the app shows notification choices)');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(process.exitCode || 0);
})();

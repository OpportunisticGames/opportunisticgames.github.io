// ⚡ Extreme everywhere it makes sense: the leaderboards' Normal / Hard / Extreme, Extreme in the Target games and the
// quick games that show you players (Higher or Lower, Who Am I?, Guess the Tally), and not where it doesn't.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false); set('level', 'extreme'); });
  await pg.reload(); await pg.waitForTimeout(500);
  const hash = () => pg.evaluate(() => decodeURIComponent(location.hash));

  // leaderboards
  await pg.goto(U + '#/leaderboard'); await pg.waitForTimeout(700);
  const opts = await pg.$$eval('#lbh option', l => l.map(o => o.textContent));
  ok(opts.length === 3 && /Extreme/.test(opts[2]) && await pg.$eval('#lbh', e => e.value) === 'extreme', 'the board’s difficulty is Normal / Hard / Extreme, and opens on yours (Extreme)');
  ok(!(await pg.$$eval('#lbv option', l => l.map(o => o.value))).some(v => ['extreme', 'purist'].includes(v)), 'Extreme isn’t hiding in the version list any more');
  ok(await pg.evaluate(() => GM.lb.view('extreme')) && /Ultimate Wildcard/.test(await pg.$eval('#lbv', e => e.selectedOptions[0].textContent)), 'Main event on Extreme shows the Extreme Wildcard board');
  await pg.selectOption('#lbh', 'hard'); await pg.waitForTimeout(500);
  ok(/m=ultimateh$/.test(await hash()), 'Hard → Ultimate (Hard)');
  await pg.selectOption('#lbh', 'extreme'); await pg.waitForTimeout(500);
  await pg.selectOption('#lbv', 'ultimatepure'); await pg.waitForTimeout(500);
  ok(/m=purist$/.test(await hash()), 'Ultimate (no wildcards) on Extreme → Extreme Purist');
  const boards = {};
  for (const [label, want] of [['CHAOS', /m=chaosx$/], ['Targets', /m=targetx$/], ['Quick', /m=hopperx$/], ['Moneyball', /m=moneyx$/]]) {
    await pg.evaluate(l => [...document.querySelectorAll('.lbx-games a')].find(a => a.textContent.includes(l)).click(), label); await pg.waitForTimeout(500);
    boards[label] = await hash(); ok(want.test(boards[label]), `${label} keeps Extreme where it has one (${boards[label].split('m=')[1]})`);
  }
  ok(await pg.$$eval('#lbh option', l => l.length) === 3, 'Moneyball has Normal / Hard / Extreme');
  await pg.evaluate(() => [...document.querySelectorAll('.lbx-games a')].find(a => a.textContent.includes('Quick')).click()); await pg.waitForTimeout(500);
  await pg.selectOption('#lbv', 'hilo'); await pg.waitForTimeout(500);
  await pg.selectOption('#lbh', 'extreme'); await pg.waitForTimeout(500);
  ok(/m=hilox$/.test(await hash()), 'Higher or Lower has an Extreme board');

  // the quick games
  const inPL50 = names => pg.evaluate(ns => ns.filter(n => !GM.players.some(p => p.name === n)).length, names);
  let obscure = 0;
  for (let i = 0; i < 6; i++) {
    await pg.goto(U + '#/'); await pg.goto(U + '#/hilo'); await pg.waitForTimeout(i ? 500 : 2500);
    obscure += await inPL50(await pg.$$eval('.hl-card .reel-name', l => l.map(e => e.textContent)));
  }
  ok(/Extreme/.test(await pg.textContent('.topbar h2')) && await pg.$eval('.lb-btn', e => e.dataset.lb) === 'hilox', 'Higher or Lower on Extreme: says so, with its own board');
  ok(obscure > 0, `…and deals players from outside the 50+ app list (${obscure} in 6 games)`);
  await pg.goto(U + '#/tally'); await pg.waitForTimeout(600);
  ok(/Extreme/.test(await pg.textContent('.topbar h2')) && await pg.$eval('.lb-btn', e => e.dataset.lb) === 'tallyx', 'Guess the Tally on Extreme');
  // typing names: every player counts, and Extreme turns the suggestions off
  await pg.goto(U + '#/whoami'); await pg.waitForTimeout(600);
  await pg.fill('#wg', 'Alan Shea'); await pg.waitForTimeout(400);
  ok(/Extreme/.test(await pg.textContent('.topbar h2')) && !(await pg.$$('#wac .ac-item')).length && !!(await pg.$('.name-go')), 'Who Am I? on Extreme: no suggestions as you type, just a Go button');
  await pg.fill('#wg', 'Alan Sheerer'); await pg.click('.name-go'); await pg.waitForTimeout(300);
  ok(/No PL player called/.test(await pg.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' '))), 'a misspelt name is flagged, not counted');
  // the grid on Extreme: type an obscure answer that fits a cell
  await pg.goto(U + '#/grid'); await pg.waitForTimeout(900);
  ok(/Extreme/.test(await pg.textContent('.topbar h2')) && /Name any PL player/.test(await pg.textContent('#app')), 'the Club Grid on Extreme, and any PL player counts');
  await pg.click('[data-cell="0"]'); await pg.waitForTimeout(300);
  ok(!!(await pg.$('.modal-wrap .name-go')), 'a grid cell asks for the whole name, no suggestions');
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  await pg.evaluate(() => GM.setLevel('normal'));
  await pg.goto(U + '#/'); await pg.goto(U + '#/grid'); await pg.waitForTimeout(700);
  await pg.click('[data-cell="0"]'); await pg.waitForTimeout(300);
  const obscure50 = await pg.evaluate(() => { const p = GM.allPlayers.find(q => q.apps < 20 && q.apps >= 5 && q.name.length > 8); return p.name; });
  await pg.fill('#gg', obscure50); await pg.waitForTimeout(400);
  ok((await pg.$$eval('#gac .ac-item', l => l.map(e => e.textContent))).some(t => t.includes(obscure50)), `on Normal the suggestions include every PL player (${obscure50})`);
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  await pg.evaluate(() => GM.setLevel('extreme'));
  await pg.goto(U + '#/hopper'); await pg.waitForTimeout(600);
  ok(/Extreme/.test(await pg.textContent('.topbar h2')) && await pg.$eval('.lb-btn', e => e.dataset.lb) === 'hopperx' && !!(await pg.$('.name-go')), 'Club Hopper on Extreme: type the whole name, its own board');
  await pg.goto(U + '#/'); await pg.goto(U + '#/dailygrid'); await pg.waitForTimeout(700);
  ok(!/Extreme/.test(await pg.textContent('.topbar h2')), 'the Daily Club Grid is the same for everyone');

  // Moneyball (tools/test/moneyball.js has the rest)
  await pg.evaluate(() => GM.setLevel('extreme'));
  await pg.goto(U + '#/'); await pg.goto(U + '#/moneyball?daily=1'); await pg.waitForTimeout(700);
  ok(!/Extreme/.test(await pg.textContent('.topbar h2')), 'the Daily Moneyball is the same for everyone');

  // the Target games
  await pg.goto(U + '#/draft?m=target&s=assists'); await pg.waitForTimeout(1200);
  const t = await pg.evaluate(() => { const S = GM.draft.state(); return { x: S.extreme, all: S.rules.all, key: GM.draft.modeKey('target', 'assists', false, null, true), title: document.querySelector('.topbar h2').textContent }; });
  ok(t.x && t.all && t.key === 'targetxast' && /Extreme/.test(t.title), `Target on Extreme draws from every player (${t.title.trim()}, board ${t.key})`);
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=treble'); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => GM.draft.state().extreme && GM.draft.state().rules.all), 'The Treble too');
  await pg.goto(U + '#/'); await pg.waitForTimeout(400);
  ok(await pg.$$eval('[data-hpanel="targets"] .stat-btn', l => l.every(a => /m=target/.test(a.getAttribute('href')))), 'Home’s Target buttons start Extreme games (the draft reads the switch)');

  // Hard leaves all this alone
  await pg.evaluate(() => GM.setLevel('hard'));
  await pg.goto(U + '#/hilo'); await pg.waitForTimeout(500);
  ok(await pg.$eval('.lb-btn', e => e.dataset.lb) === 'hiloh', 'on Hard, Higher or Lower is the Hard game');
  // the daily games stay the same for everyone
  await pg.evaluate(() => GM.setLevel('extreme'));
  await pg.goto(U + '#/footle'); await pg.waitForTimeout(500);
  ok(!/Extreme/.test(await pg.textContent('.topbar h2')), 'the daily games are the same for everyone');
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

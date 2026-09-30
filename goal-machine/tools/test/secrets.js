// 📤 Share my day, the daily club banter, CHAOS as the headline event, and the new (and secret) badges.
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
    set('seenVersion', 999); set('welcomed', 1); set('club', 'Everton');
    const log = {}, d = n => { const x = new Date(Date.now() - n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    log[d(1)] = { daily: 400 }; log[d(2)] = { daily: 380 };
    log[d(0)] = { daily: 512, footle: 3, club: 0, chaos: 1099 };
    set('dlog', log);
  });
  // Share my day
  await pg.goto(U + '#/today'); await pg.waitForTimeout(900);
  ok(!!(await pg.$('#shareday')), 'Today has a Share my day button once you’ve played something');
  const text = await pg.evaluate(() => { let t = ''; GM.share = x => { t = x; }; document.getElementById('shareday').click(); return t; });
  console.log('  ' + text.replace(/\n/g, ' | '));
  ok(/🔥 3-day streak/.test(text) && /📅 Daily Ultimate: 512 goals/.test(text) && /🟩 Footle: 3\/8/.test(text) && /🏟️ Everton Footle: X\/8/.test(text) && /🌪️ Daily CHAOS: 1,099 pts/.test(text) && !/Moneyball|Grid/.test(text),
    'the post lists only today’s results, with the streak, and no spoilers');
  // home: banter and CHAOS first
  await pg.goto(U + '#/'); await pg.waitForTimeout(900);
  const hero = await pg.textContent('.hero');
  ok(!/Premier League players/.test(hero) && (await pg.$eval('.hero .banter', e => e.textContent.length)) > 10, `with a club picked, the home line is banter: “${(await pg.textContent('.hero .banter')).trim()}”`);
  ok(await pg.$eval('[data-hpanel="main"]', e => e.firstElementChild.classList.contains('chaos-card') && /Headline event/.test(e.firstElementChild.textContent)), 'CHAOS is the headline event, first on the Main tab');
  // CHAOS Extreme: every player
  await pg.click('[data-cpool="chaosx"]'); await pg.waitForTimeout(400);
  ok(await pg.$$eval('.chaos-card .stat-btn', l => l.every(a => a.getAttribute('href').includes('m=chaosx'))), 'the CHAOS card switches to Every player (5,000+)');
  await pg.click('.chaos-card .stat-btn'); await pg.waitForTimeout(2500);
  const cx = await pg.evaluate(() => { const S = GM.draft.state(); return { title: document.querySelector('.topbar h2').textContent, all: S.rules.all && S.rules.chaos, n: (GM.allPlayers || []).length, pick: !!document.querySelector('.cm [data-mgr]'), key: GM.draft.modeKey('chaosx', 'goals', false) }; });
  ok(/CHAOS Extreme/.test(cx.title) && cx.all && cx.n > 4000 && cx.pick && cx.key === 'chaosx', `CHAOS Extreme loads all ${cx.n.toLocaleString()} players, appoints a manager, own leaderboard (${cx.key})`);
  await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  const banter = await pg.evaluate(() => { const out = new Set(); const clubs = [...new Set(GM.players.flatMap(p => p.clubs))]; clubs.forEach(c => out.add(typeof GM.clubBanter(c))); return [...out].join(); });
  ok(banter === 'string', 'every club gets a line of banter');
  // the data behind the new badges
  const facts = await pg.evaluate(() => { const by = n => GM.players.find(p => p.name === n), r = n => GM.relegated(by(n));
    return { gerrard: [GM.plSeasons(by('Steven Gerrard')), r('Steven Gerrard')], terry: r('John Terry'), defoe: r('Jermain Defoe'), barry: r('Gareth Barry'), nolan: r('Kevin Nolan'),
      share: Math.round(100 * GM.players.filter(GM.relegated).length / GM.players.length) }; });
  console.log('  ', JSON.stringify(facts));
  ok(facts.gerrard[0] === 17 && !facts.gerrard[1] && !facts.terry && facts.defoe && facts.barry && facts.nolan && facts.share > 20 && facts.share < 70,
    `career spans and relegations are right (Gerrard 17 seasons, never down; Terry never; Defoe, Barry, Nolan went down; ${facts.share}% of players went down at some point)`);
  // badges: a CHAOS game with Ranieri, 3 Leicester players, a sacking and a legendary moment
  const got = await pg.evaluate(() => {
    const lei = GM.players.filter(p => p.clubs.includes('Leicester City')).slice(0, 3), rest = GM.players.filter(p => !p.clubs.includes('Leicester City')).slice(0, 8), xi = lei.concat(rest);
    const r = GM.collectDraft({ mode: 'chaos', stat: 'goals', total: 700, points: 1200, hard: false, xi, rating: 70, pairs: 1, wildUsed: 1, coinWin: false, bull: false, closeness: null, treble: false,
      slots: xi.map(p => ({ name: p.name, g: 10 })), manager: 'ranieri', moments: ['Manager sacked!', '93:20'], rars: ['u', 'l'], bigs: 3, liked: 3 });
    return r.fresh.map(x => x.id);
  });
  console.log('  badges: ' + got.join(', '));
  ok(['cx1000', 'cxsack', 'cxleg', 'cxmeter', 'cxdilly', 'chaos'].every(k => got.includes(k)), 'CHAOS challenges unlock (1,000+, sacked, legendary, meltdown, and the secret Dilly Ding)');
  await pg.goto(U + '#/album?v=badges&c=chaos'); await pg.waitForTimeout(900);
  const list = await pg.$$eval('.ach', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(list.length >= 11 && list.some(t => /\?\?\?/.test(t)) && list.some(t => /Dilly Ding/.test(t)), `the Album has a CHAOS category (${list.length} badges), unfound secrets shown as ???`);
  await pg.screenshot({ path: 'lay/secrets_album.png' });
  console.log(errs.join('\n') || 'no page errors'); if (errs.length) process.exitCode = 1; await b.close();
})();

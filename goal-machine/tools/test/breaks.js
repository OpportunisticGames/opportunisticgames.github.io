// 🌍 International breaks (look, banner, International XI), the Normal / Hard / Extreme switch, and the Matchday and
// international badges.
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
    set('seenVersion', 999); set('welcomed', 1); set('club', 'Everton'); set('sfx', false); set('hard', true);
  });
  await pg.reload(); await pg.waitForTimeout(600);

  // difficulty: one switch, and the old Hard setting carries over
  ok(await pg.evaluate(() => GM.level() === 'hard' && GM.isHard()), 'someone who had Hard on before starts on Hard');
  ok((await pg.$$('.hard-toggle [data-level]')).length === 3 && !(await pg.$('[data-cpool]')) && !(await pg.$('[data-pool="extreme"]')), 'Home has Normal / Hard / Extreme, and no pool switches on the cards');
  const links = () => pg.evaluate(() => ({ chaos: document.querySelector('.chaos-card .stat-btn').getAttribute('href'), main: document.querySelector('.mode-card .stat-btn').getAttribute('href') }));
  await pg.click('[data-level="extreme"]'); await pg.waitForTimeout(400);
  let l = await links();
  ok(/m=chaosx/.test(l.chaos) && /m=extreme/.test(l.main) && !(await pg.evaluate(() => GM.isHard())), `Extreme: CHAOS and the Main event use every player (${l.chaos}, ${l.main})`);
  await pg.click('[data-wild="0"]'); await pg.waitForTimeout(300);
  ok(/m=purist/.test((await links()).main), 'Extreme with wildcards off is Extreme Purist');
  await pg.click('[data-wild="1"]'); await pg.click('[data-level="normal"]'); await pg.waitForTimeout(300);
  l = await links();
  ok(/m=chaos&/.test(l.chaos) && /m=ultimate&/.test(l.main), 'Normal: back to the 50+ app players');
  await pg.evaluate(() => { localStorage.removeItem('gm:level'); localStorage.setItem('gm:hard', 'false'); localStorage.setItem('gm:ultPool', '"extreme"'); });
  ok(await pg.evaluate(() => GM.level() === 'extreme'), 'someone who used the old Extreme pool starts on Extreme');
  await pg.evaluate(() => GM.setLevel('normal'));
  await pg.goto(U + '#/settings?s=play'); await pg.waitForTimeout(400);
  ok((await pg.$$('#s-level button, #s-level option, [data-v]')).length >= 3 || /Extreme/.test(await pg.textContent('.settings')), 'Settings has the same three levels');

  // an international break (the real list has one now; set our own to be sure)
  const day = await pg.evaluate(() => GM.today());
  const plus = n => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };
  await pg.evaluate(([a, z, k]) => GM.setFixtures([[k + 'T14:00:00Z', 'Everton', 'Chelsea']], [[a, z]]), [plus(-3), plus(5), plus(6)]);
  await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => document.documentElement.classList.contains('intl-break')) && /INTERNATIONAL BREAK/.test(await pg.textContent('.intl-banner')), 'during a break: flag bunting and an INTERNATIONAL BREAK banner on Home');
  await pg.goto(U + '#/today'); await pg.waitForTimeout(400);
  ok(!!(await pg.$('.intl-banner')), '…and on Today');
  await pg.goto(U + '#/nations'); await pg.waitForTimeout(500);
  const nats = await pg.evaluate(() => GM.nations());
  ok(nats.length >= 20 && ['England', 'Scotland', 'Wales', 'Northern Ireland', 'France', 'Brazil'].every(n => nats.includes(n)) && (await pg.$$('.nation-grid button')).length === nats.length, `${nats.length} countries to pick from, the Home Nations included`);
  await pg.click('[data-nat="Wales"]'); await pg.waitForTimeout(300);
  ok(/Wales XI/.test(await pg.textContent('.md-card')) && await pg.evaluate(() => GM.store.get('nation') === 'Wales'), 'picking Wales remembers it');
  await pg.click('.md-card .stat-btn'); await pg.waitForTimeout(2500);
  await pg.evaluate(() => document.getElementById('spin').click()); await pg.waitForTimeout(1600);
  const dr = await pg.evaluate(() => { const S = GM.draft.state(); return { title: document.querySelector('.topbar h2').textContent, key: GM.draft.modeKey('nation', 'goals', false, S.nat), nats: S.reels.filter(x => !x.wild).map(x => GM.allPlayers[x.id].nat) }; });
  ok(/Wales XI/.test(dr.title) && dr.key === 'nationwales' && dr.nats.length && dr.nats.every(n => n === 'Wales'), `the Wales XI deals only Welsh players (${dr.nats.length} checked), with its own board (${dr.key})`);

  // not a break: the page waits for the next one, no bunting
  await pg.evaluate(([a, z]) => GM.setFixtures([[a + 'T14:00:00Z', 'Everton', 'Chelsea']], [[a, z]]), [plus(20), plus(30)]);
  await pg.goto(U + '#/'); await pg.waitForTimeout(500);
  ok(!(await pg.$('.intl-banner')) && !(await pg.evaluate(() => document.documentElement.classList.contains('intl-break'))), 'no break: no banner, no bunting');
  await pg.goto(U + '#/nations'); await pg.waitForTimeout(400);
  ok(/Next one/.test(await pg.textContent('.md-card')) && !!(await pg.$('.md-tile.locked')), 'the International XI waits for the next break');

  // badges
  const got = await pg.evaluate(() => {
    const P = GM.players, find = f => P.filter(f);
    const both = find(p => p.clubs.includes('Everton') && p.clubs.includes('Liverpool')).slice(0, 11);
    const rest = find(p => p.clubs.includes('Everton')).slice(0, 11 - both.length);
    GM.collectDraft({ mode: 'match', stat: 'goals', total: 180, points: 180, xi: both.concat(rest), clubs: ['Everton', 'Liverpool'], fx: '2026-10-17:everton-liverpool', slots: [], moments: [], rars: [] });
    GM.checkGame('mfootle', 2);
    ['England', 'Scotland', 'Wales', 'Northern Ireland', 'France'].forEach((n, i) => GM.collectDraft({ mode: 'nation', nat: n, stat: 'goals', total: i ? 120 : 260, points: 0,
      xi: find(p => p.nat === n && p.clubs.includes('Everton')).slice(0, 3).concat(find(p => p.nat === n).slice(0, 8)), slots: [], moments: [], rars: [] }));
    return Object.keys(GM.store.get('album').ach);
  });
  const want = ['mdfirst', 'mdboth', 'md150', 'mdpundit', 'mdderby', 'ibfirst', 'ib250', 'ibtour', 'ibhome', 'ibclub'];
  ok(want.every(k => got.includes(k)), 'the matchday and international badges unlock: ' + want.filter(k => got.includes(k)).join(', ') + (want.some(k => !got.includes(k)) ? ' — missing ' + want.filter(k => !got.includes(k)).join(', ') : ''));
  ok(!got.includes('mdseason'), 'Season Ticket needs 5 different matchdays');
  await pg.goto(U + '#/album?v=badges&c=events'); await pg.waitForTimeout(500);
  ok((await pg.$$('.ach')).length === 11, `the album has a Matchdays & breaks list (${(await pg.$$('.ach')).length} badges)`);
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

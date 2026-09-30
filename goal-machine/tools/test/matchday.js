// 🏟️ Matchday: the fixtures, the Home/Today banner, the hub, the Matchday XI (either side, double for both, same
// spins for every fan, one go), the pre-match Footle, and what the app tells the server for the 9am notification.
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
    set('seenVersion', 999); set('welcomed', 1); set('club', 'Everton'); set('sfx', false);
  });
  await pg.reload(); await pg.waitForTimeout(600);
  const real = await pg.evaluate(() => ({ n: GM.fixtures().length, clubs: GM.fixtures().every(f => GM.clubs.includes(f.home) && GM.clubs.includes(f.away)), next: GM.nextMatch('Everton') }));
  ok(real.n > 0 && real.clubs, `the fixture list loads (${real.n} fixtures, every club name matches the player data)`);
  ok(!!real.next, `Everton’s next match is known: ${real.next && real.next.home} v ${real.next && real.next.away} on ${real.next && real.next.day}`);

  // a normal day: no banner, a "next match" line, and the hub's games are locked
  const later = () => pg.evaluate(() => { const d = new Date(Date.now() + 3 * 864e5); d.setHours(15, 0, 0, 0); GM.setFixtures([[d.toISOString().slice(0, 19) + 'Z', 'Liverpool', 'Everton']]); });
  await later(); await pg.goto(U + '#/settings'); await pg.goto(U + '#/'); await pg.waitForTimeout(700);
  ok(!(await pg.$('.match-banner')) && /Next: v LIV \(A\)/.test(await pg.textContent('.club-tile')), 'not matchday: no banner, and the club tile says when the next match is');
  await pg.goto(U + '#/matchday'); await pg.waitForTimeout(500);
  ok((await pg.$$('.md-tile.locked')).length === 2 && /Next match/.test(await pg.textContent('.md-card')), 'the hub shows the next match with its games locked until matchday');

  // matchday
  await pg.evaluate(() => { const d = new Date(); d.setHours(23, 0, 0, 0); GM.setFixtures([[d.toISOString().slice(0, 19) + 'Z', 'Everton', 'Liverpool'], ['2099-01-01T15:00:00Z', 'Everton', 'Chelsea']]); });
  await pg.goto(U + '#/'); await pg.waitForTimeout(700);
  ok(/MATCHDAY/.test(await pg.textContent('.match-banner')) && /Everton v Liverpool/.test(await pg.textContent('.match-banner')), 'matchday: a banner on Home');
  await pg.goto(U + '#/today'); await pg.waitForTimeout(500);
  ok(!!(await pg.$('.match-banner')), '…and on Today');
  const fx = await pg.evaluate(() => GM.matchToday());
  const state = await pg.evaluate(() => { const nm = GM.nextMatch(); return { day: nm.day, text: `${nm.home} v ${nm.away}, ${GM.kickOff(nm)}` }; });
  ok(state.day === fx.day && /^Everton v Liverpool, \d\d?:\d\d/.test(state.text), `the app tells the server about the match for the 9am notification: “${state.text}”`);
  ok(await pg.evaluate(() => GM.notify.KINDS.some(k => k[0] === 'matchday') && GM.notify.prefs().matchday === true), 'Matchday notifications are a setting, on by default');
  await pg.goto(U + '#/matchday'); await pg.waitForTimeout(500);
  ok((await pg.$$('.md-tile.locked')).length === 0 && (await pg.$$('a.md-tile')).length === 2 && !!(await pg.$('.lb-btn')), 'the hub opens the Matchday XI and the pre-match Footle, with a leaderboard');

  // Matchday XI
  await pg.click('a.md-tile[href*="m=match"]'); await pg.waitForTimeout(2500);
  const st = await pg.evaluate(() => { const S = GM.draft.state(); return { title: document.querySelector('.topbar h2').textContent, seed: S.seed, key: GM.draft.modeKey('match', 'goals', false, S.fx), stat: S.stat, hard: S.hard }; });
  ok(/EVE v LIV/.test(st.title) && st.seed === 'match:' + fx.id && st.key === 'match:' + fx.id && st.stat === 'goals' && !st.hard, `same spins for every fan (seed ${st.seed}), goals, its own leaderboard`);
  const play = async () => {
    for (let k = 0; k < 160 && (await pg.evaluate(() => GM.draft.state().phase !== 'done')); k++) {
      await pg.evaluate(() => { const c = document.querySelector('.modal-wrap [data-close], .modal-wrap .btn'); if (c) c.click(); });
      const act = await pg.evaluate(() => {
        const sp = document.getElementById('spin'); if (sp && !sp.disabled) { sp.click(); return 'spin'; }
        const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
        const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
        (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
      });
      await pg.waitForTimeout(act === 'spin' ? 1500 : act === 'place' ? 1500 : 350);
    }
  };
  // every reel is someone who played for Everton or Liverpool
  await pg.evaluate(() => document.getElementById('spin').click()); await pg.waitForTimeout(1600);
  const reels = await pg.evaluate(() => GM.draft.state().reels.filter(x => !x.wild).map(x => (GM.allPlayers || GM.players)[x.id].clubs));
  ok(reels.length > 0 && reels.every(c => c.includes('Everton') || c.includes('Liverpool')), `the reels only offer players from either side (${reels.length} checked)`);
  await play();
  const res = await pg.evaluate(() => {
    const S = GM.draft.state(), P = GM.allPlayers || GM.players;
    const plain = S.xi.filter(x => x.p != null && !x.mod).map(x => { const p = P[x.p]; const both = p.clubs.includes('Everton') && p.clubs.includes('Liverpool'); return { both, ok: x.g === p.goals * (both ? 2 : 1) }; });
    return { done: S.phase === 'done', n: S.xi.filter(x => x.p != null).length, plain, saved: !!GM.store.get('match2:' + S.fx), again: !!document.getElementById('again'), chall: !!document.getElementById('challenge'), back: !!document.querySelector('a[href="#/matchday"]') };
  });
  ok(res.done && res.n === 11 && res.saved, 'the Matchday XI plays through to full time and is saved');
  ok(res.plain.every(x => x.ok), `players count their PL goals, doubled if they played for both (${res.plain.filter(x => x.both).length} of ${res.plain.length} unmodified slots played for both)`);
  const dbl = await pg.evaluate(() => { const S = GM.draft.state(), P = GM.allPlayers || GM.players; const p = P.find(p => p.clubs.includes('Everton') && p.clubs.includes('Liverpool') && p.goals > 20); return p && p.name; });
  ok(!!dbl, `players who played for both exist to be found (e.g. ${dbl})`);
  ok(!res.again && !res.chall && res.back, 'one go: no Play again or challenge, just back to matchday');
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=match&fx=' + encodeURIComponent(fx.id)); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => GM.draft.state().readonly && GM.draft.state().phase === 'done'), 'going back to it shows your finished XI rather than a new one');

  // double points: put someone who played for both on a reel and sign him
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=match&fx=' + encodeURIComponent('2099-01-01:everton-chelsea')); await pg.waitForTimeout(1500);
  await pg.evaluate(() => document.getElementById('spin').click()); await pg.waitForTimeout(1600);
  const pick = await pg.evaluate(() => {
    const S = GM.draft.state(), P = GM.allPlayers || GM.players;
    const p = P.find(p => p.clubs.includes('Everton') && p.clubs.includes('Chelsea') && p.goals > 10);
    S.reels[0] = { id: p.id }; GM.draft.render();
    document.querySelector('.stage .reel[data-reel="0"]').click();
    return { name: p.name, goals: p.goals, id: p.id };
  });
  await pg.waitForTimeout(600);
  await pg.evaluate(() => { const t = document.querySelector('.slot.target'); if (t) t.click(); }); await pg.waitForTimeout(1500);
  const slot = await pg.evaluate(id => { const x = GM.draft.state().xi.find(x => x.p === id); return x && { g: x.g, mod: x.mod }; }, pick.id);
  ok(slot && !slot.mod && slot.g === pick.goals * 2, `${pick.name} played for both: ${pick.goals} goals count double (${slot && slot.g})`);

  // pre-match Footle
  await pg.goto(U + '#/matchday'); await pg.waitForTimeout(500);
  ok(/✅/.test(await pg.textContent('a.md-tile[href*="m=match"]')), 'the hub ticks off the Matchday XI');
  await pg.click('a.md-tile[href*="matchfootle"]'); await pg.waitForTimeout(800);
  const ans = await pg.evaluate(() => GM.matchFootleAnswer(GM.matchToday()));
  ok(ans.both && ans.p.clubs.includes('Everton') && ans.p.clubs.includes('Liverpool'), `the mystery player played for both: ${ans.p.name}`);
  ok(/played for Everton and Liverpool/.test(await pg.textContent('.hl-head')), 'the Footle says so');
  await pg.fill('#fg', ans.p.name); await pg.waitForTimeout(500);
  await pg.evaluate(() => { const s = document.querySelector('#fac .ac-item'); if (s) s.click(); }); await pg.waitForTimeout(900);
  const fo = await pg.evaluate(() => ({ res: !!document.querySelector('.f-result'), stats: !!document.querySelector('.f-stats'), back: !!document.querySelector('.f-result a[href="#/matchday"]'), dlog: JSON.stringify(GM.dailyLog()[GM.today()] || {}) }));
  ok(fo.res && !fo.stats && fo.back && !/footle|club/.test(fo.dlog), 'winning shows the result with no streak stats, and doesn’t count as a daily game');
  await pg.goto(U + '#/matchday'); await pg.waitForTimeout(500);
  ok(/Got it in 1/.test(await pg.textContent('a.md-tile[href*="matchfootle"]')), 'the hub ticks off the Footle');
  await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  ok(await pg.$eval('.match-banner', e => e.classList.contains('done')), 'with both played the banner calms down');

  // leaderboards
  await pg.goto(U + '#/leaderboard?m=' + encodeURIComponent('match:' + fx.id)); await pg.waitForTimeout(700);
  ok(/Matchday XI · EVE v LIV/.test(await pg.textContent('.tabs')), 'the Matchday XI has a board under Your club');
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

// 5.39: watch along shows the challenger's real game (their pitch, wildcards and reels, live) and what's happened move by
// move; a challenger's score stays off the public boards (the creator's goes on); the podium on every board, even with
// one or two names; the five card tiers in one row; Easy boards count half in Best Players.   node new539.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
async function phone(b, name, key, errs, vp = { width: 390, height: 844 }) {
  const ctx = await b.newContext({ viewport: vp }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U); await pg.evaluate(([n, k]) => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:calm', 'true'); if (n) localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k })); }, [name, key]);
  await pg.evaluate(() => { GM.share = (t, u) => { window._shared = { t, u }; }; });
  return pg;
}
async function step(pg, last) {
  return pg.evaluate(last => {
    document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
    if (document.querySelector('.result-total')) return 'done';
    const mg = document.querySelector('.cm [data-mgr]'); if (mg) { mg.click(); return 'mgr'; }
    const cm = document.querySelector('.cm:not(.out)'); if (cm) { const coin = cm.querySelector('.coin-wrap'); if (coin && !cm.classList.contains('flipping')) { coin.click(); return 'coin'; } if (!cm.classList.contains('act')) cm.click(); return 'moment'; }
    const sp = document.getElementById('spin'); if (sp && !sp.disabled) { sp.click(); return 'spin'; }
    const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
    const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
    const ok = rs.filter(r => !r.classList.contains('is-wild')); ((last ? ok[ok.length - 1] : ok[0]) || rs[0]).click(); return 'pick';
  }, !!last).catch(() => 'err');
}
async function playDraft(pg, each, last) {
  for (let k = 0; k < 220; k++) {
    const st = await step(pg, last);
    if (st === 'done') return true;
    if (each && st === 'place') await each(k);
    await pg.waitForTimeout(st === 'spin' ? 1300 : 420);
  }
  return false;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs), B = await phone(b, 'Bob', 'b'.repeat(28), errs);
  // Alice plays CHAOS and challenges Bob
  await A.goto(U + '#/draft?m=chaos&s=goals&seed=w539'); await A.waitForTimeout(1500);
  ok(await playDraft(A), 'Alice plays CHAOS to full time');
  await A.waitForTimeout(1200);
  const aOn = server.scores.filter(x => x.name === 'Alice' && x.mode === 'chaos').length;
  ok(aOn === 1, `the creator's game goes on the public board (${aOn})`);
  await A.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  await A.evaluate(() => document.getElementById('challenge').click()); await A.waitForTimeout(1200);
  const code = Object.keys(server.chs)[0];
  ok(!!code, 'the challenge is made');
  await B.goto(U + '#/c?id=' + code); await B.waitForTimeout(1200);
  ok(/same luck/i.test(await B.textContent('#app')) && /not the public leaderboards/.test(await B.textContent('#app')), 'the landing page says it’s the same luck and stays off the public boards');
  await B.click('#ch-go'); await B.waitForTimeout(3600);
  // Alice watches Bob's real game after a few signings
  let seen = null;
  const mid = async () => {
    const n = await B.evaluate(() => GM.draft.state().xi.filter(x => x.p != null).length);
    if (n === 4 && !seen) {
      await B.waitForTimeout(2200);  // (his phone sends the game a moment after each move)
      const bp = server.plays.find(p => p.code === code && !p.owner);
      await A.goto(U + `#/c?id=${code}&watch=${bp.id}`); await A.waitForTimeout(1800);
      const mine = await B.evaluate(() => GM.draft.state().xi.filter(x => x.p != null).map(x => GM.players[x.p].name));
      seen = await A.evaluate(() => ({
        pitch: !!document.querySelector('.watch-game .pitch'), counter: !!document.querySelector('.watch-game .counter, .watch-game .counter-num'),
        dock: !!document.querySelector('.watch-game .dock'), names: [...document.querySelectorAll('.watch-game .slot')].map(s => s.textContent).join(' | '),
        feed: document.querySelectorAll('.ch-feed li').length, feedText: (document.querySelector('.ch-feed') || {}).textContent || '',
        wide: document.scrollingElement.scrollWidth - innerWidth, spin: !!document.querySelector('.watch-game #spin'),
      }));
      seen.mine = mine;
      await A.screenshot({ path: 'lay/w539_watch.png', fullPage: true });
      // he carries on: a minute later her page has caught up
      await B.waitForTimeout(200);
    }
  };
  ok(await playDraft(B, mid, true), 'Bob plays the challenge to full time');
  ok(seen && seen.pitch && seen.counter && seen.dock && !seen.spin, 'watch along draws his real game: his counter, pitch and wildcards, with no buttons of his to press');
  ok(seen && seen.mine.every(n => seen.names.includes(n.split(' ').slice(-1)[0])), `…with the players he's signed on his pitch (${seen && seen.mine.join(', ')})`);
  ok(seen && seen.feed >= 4 && /Signed at/.test(seen.feedText), `…and his game move by move (${seen && seen.feed} moves)`);
  ok(seen && seen.wide <= 1, 'the watch page fits the screen');
  await A.waitForTimeout(4000);
  const after = await A.evaluate(() => ({ full: /Full time/.test(document.querySelector('#app').textContent), game: !!document.querySelector('.watch-game'), h2h: !!document.querySelector('a[href*="&p="]') }));
  ok(after.full && !after.game && after.h2h, 'at full time her page says so, his game gives way, and the head-to-head is a tap away');
  // Bob's score: on the challenge table, not the public board
  await B.waitForTimeout(1500);
  const bOn = server.scores.filter(x => x.name === 'Bob' && /chaos/.test(x.mode)).length, bp = server.plays.find(p => p.code === code && !p.owner);
  ok(bOn === 0 && bp.status === 'done', `the challenger's score goes on the challenge table, not the public boards (${bOn} on the boards)`);
  // his full-time screen: the result against Alice first, his own game on its own tab
  await B.waitForSelector('#ch-h2h .ch-verdict', { timeout: 8000 }).catch(() => {});
  const order = await B.evaluate(() => {
    const v = document.querySelector('#ch-h2h .ch-verdict'), me = document.querySelector('.done-me'), rm = document.getElementById('ch-rematch'), xis = document.querySelector('#ch-h2h .ch-xis');
    const top = e => e ? e.getBoundingClientRect().top : 1e9;
    return { tabs: document.querySelectorAll('.done-tabs [data-dt]').length, vTop: top(v), meHidden: !!(me && me.hidden), rmAbove: !!rm && !!xis && top(rm) < top(xis), reactAbove: !!document.querySelector('#ch-h2h .ch-reacts') && top(document.querySelector('#ch-h2h .ch-reacts')) < top(xis) };
  });
  ok(order.tabs === 2 && order.vTop < 400 && order.meHidden, `his full time opens on the head-to-head, at the top, with his own game on the other tab (${JSON.stringify(order)})`);
  ok(order.rmAbove && order.reactAbove, '…the reactions and the rematch come before the detail (the XIs)');
  await B.screenshot({ path: 'lay/w539_done.png' });
  await B.click('[data-dt="me"]'); await B.waitForTimeout(300);
  const line = await B.evaluate(() => (document.getElementById('board-news') || {}).textContent || '');
  ok(await B.evaluate(() => !document.querySelector('.done-me').hidden && document.querySelector('.done-vs').hidden && !!document.querySelector('.done-me .result-total')), '“Your game” shows his own score and XI');
  ok(/challenge table/.test(line), `…and his full-time screen says so ("${line.replace(/\s+/g, ' ').trim().slice(0, 60)}")`);
  ok(bp.game.feed && bp.game.feed.length >= 11 && !bp.game.live, `his finished game keeps the move-by-move (${bp.game.feed && bp.game.feed.length}) and drops the live copy`);
  ok(JSON.stringify(bp.game).length < 30000, `what his phone sends fits the server's limit (${JSON.stringify(bp.game).length} characters)`);
  await A.goto(U + `#/c?id=${code}&p=${bp.id}`); await A.waitForTimeout(1500);
  ok((await A.$$('.ch-feed')).length === 2, 'the head-to-head has both games move by move');
  // the podium with only two names on a board
  await A.goto(U + '#/leaderboard?m=chaos'); await A.waitForTimeout(1800);
  await A.evaluate(() => { const el = document.querySelector('#global') || document.querySelector('#app'); el.innerHTML = GM.lbList([{ name: 'Alice', score: 348 }], { key: 'chaos', unit: ' pts' }); });
  const pod = await A.evaluate(() => ({ pods: document.querySelectorAll('.podium .pod').length, empty: document.querySelectorAll('.podium .pod.empty').length, first: (document.querySelector('.pod1 > b') || {}).textContent }));
  ok(pod.pods === 3 && pod.empty === 2 && pod.first === 'Alice', `a board with one name still has the podium, the other steps up for grabs (${JSON.stringify(pod)})`);
  await A.screenshot({ path: 'lay/w539_podium.png' });
  // Easy counts half in Best Players
  const bpRows = server.fns.best_players({ p_limit: 50 });
  server.fns.submit_score({ p_username: 'Bob', p_key: 'b'.repeat(28), p_mode: 'chaose', p_score: 50 });
  const bob = server.fns.best_players({ p_limit: 50 }).find(r => r.name === 'Bob');
  ok(bob && bob.points === 1 && bpRows.every(r => r.name !== 'Bob'), `Best Players: on his own on an Easy board, Bob gets 1 point (${bob && bob.points})`);
  server.fns.submit_score({ p_username: 'Bob', p_key: 'b'.repeat(28), p_mode: 'chaosh', p_score: 80 });
  server.fns.submit_score({ p_username: 'Alice', p_key: 'a'.repeat(28), p_mode: 'chaosh', p_score: 60 });
  const bob2 = server.fns.best_players({ p_limit: 50 }).find(r => r.name === 'Bob');
  ok(bob2 && bob2.points === 1 + 2 * 3, `…and top of a two-player Hard board adds 2 points ×3 (${bob2 && bob2.points})`);
  // the five card tiers in one row, at 360 px
  const C = await phone(b, null, null, errs, { width: 360, height: 740 });
  await C.goto(U + '#/album?v=cards'); await C.waitForTimeout(1500);
  const tiers = await C.evaluate(() => { const t = [...document.querySelectorAll('.tier-row a')]; return { n: t.length, rows: new Set(t.map(a => a.offsetTop)).size, fits: t.every(a => a.scrollWidth <= a.clientWidth + 1), bars: document.querySelectorAll('.tier-row .tr-bar').length }; });
  ok(tiers.n === 5 && tiers.rows === 1 && tiers.fits && tiers.bars === 5, `the five card tiers sit in one row with a bar each, nothing cut off (${JSON.stringify(tiers)})`);
  await C.screenshot({ path: 'lay/w539_tiers.png' });
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
})();

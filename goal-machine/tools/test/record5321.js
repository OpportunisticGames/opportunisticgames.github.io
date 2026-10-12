// 5.32.1: where your score landed, said on the full-time screen: a record (top of the board), "Top 3/10/20…" only when
// the board has at least twice that many players, otherwise your place; nothing claimed for an older best.
//   node record5321.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { fast } = require('./helpers');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx); await fast(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:account', JSON.stringify({ name: 'Alice', key: 'a'.repeat(28) })); localStorage.setItem('gm:name', JSON.stringify('Alice')); });
  await pg.reload(); await pg.waitForTimeout(800);
  // the board's answer is faked: [all time, this month] as {rank, of, score}
  const fake = (all, mon) => pg.evaluate(([all, mon]) => { GM.lb.mine = async (m, n, month) => (month ? mon : all); }, [all, mon]);
  const news = async (mode, score, all, mon) => { await fake(all, mon); return pg.evaluate(([m, s]) => GM.boardNews(m, s).then(x => x ? x.title + ' | ' + x.sub : ''), [mode, score]); };
  ok(/^Record! You’re top of Ultimate Wildcard \| Ahead of all 37 players, all time/.test(await news('ultimate', 400, { rank: 1, of: 37, score: 400 }, { rank: 1, of: 12, score: 400 })), 'top of the board all time: a record');
  ok(/^You’re top of .*CHAOS \(Hard\) in /.test(await news('chaosh', 1500, { rank: 3, of: 20, score: 1500 }, { rank: 1, of: 6, score: 1500 })), 'top this month: a record for the month');
  let t = await news('target', 900, { rank: 4, of: 50, score: 900 }, { rank: 2, of: 9, score: 900 });
  ok(/^Top 3 in .* on Target/.test(t), `#2 of 9 this month beats #4 of 50 all time (top 3 needs 6+): ${t}`);
  t = await news('target', 900, { rank: 4, of: 50, score: 900 }, { rank: 4, of: 9, score: 900 });
  ok(/^Top 10 all time on Target/.test(t) && /3 to beat/.test(t), `#4 of 50 all time: top 10 (${t})`);
  t = await news('target', 900, { rank: 4, of: 12, score: 900 }, { rank: 4, of: 12, score: 900 });
  ok(/^On the Target .* board/.test(t) && /#4 of 12 all time/.test(t), `#4 of 12: no top-10 claim on a small board, just the place (${t})`);
  t = await news('classic', 200, { rank: 1, of: 10, score: 260 }, { rank: 1, of: 4, score: 260 });
  ok(/^Not your best/.test(t), `an older, higher best on the board: nothing claimed (${t})`);
  t = await news('daily:' + new Date().toISOString().slice(0, 10), 500, { rank: 2, of: 30, score: 500 }, null);
  ok(/^Top 3 on today’s Daily Ultimate/.test(t), `a daily board: ${t}`);

  // on the full-time screen of a real draft
  await fake({ rank: 1, of: 37, score: -1 }, { rank: 1, of: 9, score: -1 });
  await pg.evaluate(() => { const f = GM.lb.mine; GM.lb.mine = async (...a) => { const r = await f(...a); return r && { ...r, score: GM.draft.state().final ? GM.draft.state().final.total : r.score }; }; });
  await pg.goto(U + '#/draft?m=classic&seed=rec1'); await pg.waitForTimeout(800);
  const act = f => pg.evaluate(f).catch(() => null);
  let saw = '';
  for (let step = 0; step < 200; step++) {
    if (await act(() => !!document.querySelector('.result-total'))) break;
    await act(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
    if (await act(() => { const b = document.getElementById('spin'); if (b && !b.disabled) { b.click(); return true; } return false; })) { await pg.waitForTimeout(250); continue; }
    await act(() => { const t = document.querySelector('.slot.target'); if (t) return t.click(); const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (rs.length) (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); });
    await pg.waitForTimeout(150);
  }
  await pg.waitForSelector('#board-news.rec', { timeout: 8000 }).catch(() => {});
  saw = await act(() => { const e = document.getElementById('board-news'); return e ? e.className + ' | ' + e.textContent.replace(/\s+/g, ' ').trim() : ''; });
  ok(/rec/.test(saw) && /Record! You’re top of Classic/.test(saw), `the full-time screen says it, under the score: ${saw}`);
  await pg.screenshot({ path: 'lay/record_fulltime.png' });
  ok(await act(() => { const r = document.querySelector('.result'); const bn = document.getElementById('board-news'); return !!(r && bn && r.contains(bn)); }), 'in the result card itself');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(process.exitCode || 0);
})();

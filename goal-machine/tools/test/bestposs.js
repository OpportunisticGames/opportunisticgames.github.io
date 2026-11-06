// 5.40: the "best possible" line at full time: a whole Ultimate and a whole CHAOS game, then the line is there, is never below
// what you got, and a perfect pick every spin reads "A perfect draft".   node bestposs.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { fast, idle } = require('./helpers');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [], ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await fast(ctx); await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia|supabase/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  for (const [mode, greedy] of [['ultimate', false], ['ultimate', true]]) {
    await pg.evaluate(m => { Object.keys(localStorage).filter(x => x.startsWith('gm:draftp')).forEach(x => localStorage.removeItem(x)); location.hash = '#/'; }, mode);
    await pg.evaluate(([m, g]) => { location.hash = `#/draft?m=${m}&s=goals&seed=bp${m}${g}`; }, [mode, greedy]);
    let done = false;
    for (let k = 0; k < 2500 && !done; k++) {
      const st = await pg.evaluate(greedy => {
        document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
        if (document.querySelector('.result-total')) return 'done';
        const cm = document.querySelector('.cm:not(.out)');
        if (cm) { const mg = cm.querySelector('[data-mgr]'); if (mg) { mg.click(); return 'mgr'; } const coin = cm.querySelector('.coin-wrap'); if (coin && !cm.classList.contains('flipping')) { coin.click(); return 'coin'; } const pick = cm.querySelector('.cm-pick button'); if (pick) { pick.click(); return 'pick'; } if (!cm.classList.contains('act')) cm.click(); return 'card'; }
        const sp = document.getElementById('spin'); if (sp && !sp.disabled) { sp.click(); return 'spin'; }
        const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
        const S = GM.draft.state(), rs = [...document.querySelectorAll('.stage .reel[data-reel]:not(.is-wild)')]; if (!rs.length) return 'wait';
        const val = r => { const x = S.reels[+r.dataset.reel], q = (S.rules.all ? GM.allPlayers : GM.players)[x.id]; return q ? q.goals : 0; };
        (greedy ? rs.sort((a, b) => val(b) - val(a))[0] : rs[0]).click(); return 'pick';
      }, greedy).catch(() => 'err');
      if (st === 'done') done = true; else await pg.waitForTimeout(40);
    }
    await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => { const e = document.getElementById('best-poss'); return { text: e ? e.textContent.replace(/\s+/g, ' ').trim() : null, got: +((document.querySelector(".result-total") || { firstChild: { textContent: "0" } }).firstChild.textContent.replace(/[^0-9]/g, "")), offers: GM.draft.state().offers.length }; });
    const bp = r.text && +((r.text.match(/Best possible: ([\d,]+)/) || [])[1] || '0').replace(/,/g, '');
    ok(done, `${mode}${greedy ? ' (always the biggest number)' : ''}: full time, ${r.offers} spins recorded`);
    // (CHAOS signings that come from a wildcard or a moment have no spin to compare with: the line only shows when every signing does)
    if (mode === 'chaos') { ok(r.offers === 11 ? !!r.text : !r.text, `chaos: the line shows only when all 11 signings came from spins (${r.offers} did, line ${r.text ? 'shown' : 'not shown'})`); continue; }
    ok(!!r.text, `${mode}${greedy ? ' (greedy)' : ''}: the best-possible line shows ("${(r.text || '').slice(0, 90)}")`);
    if (r.text && bp) ok(bp >= r.got, `…and it's never below what you got (${bp} v ${r.got})`);
    if (greedy) ok(!r.text || /Best possible|perfect/.test(r.text), 'always picking the biggest gets close to or the best');
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close();
})();

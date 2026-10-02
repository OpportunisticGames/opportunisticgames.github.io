const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });  // screenshots go in ./lay
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
async function phone(b, name, key, errs) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U); await pg.evaluate(([n, k]) => { localStorage.setItem('gm:seenVersion', '99'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k })); }, [name, key]);
  return pg;
}
async function playDraft(pg, tag) {
  for (let step = 0; step < 90; step++) {
    const st = await pg.evaluate(() => {
      document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
      if (document.querySelector('.result-total')) return 'done';
      const mg = document.querySelector('.cm [data-mgr]'); if (mg) { mg.click(); return 'mgr'; }  // CHAOS: appoint a manager, tap through moments
      const cm = document.querySelector('.cm:not(.out)'); if (cm) { cm.click(); return 'moment'; }
      const sp = document.getElementById('spin'); if (sp) { sp.click(); return 'spin'; }
      const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
      const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
      (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
    }).catch(() => 'err');
    if (step === 8 && tag) await pg.screenshot({ path: `lay/${tag}.png` });
    if (st === 'done') return true;
    await pg.waitForTimeout(st === 'spin' ? 1300 : 500);
  }
  return false;
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs), B = await phone(b, 'Bob', 'b'.repeat(28), errs);
  const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
  for (const kind of ['chaos', 'race']) {
    await A.goto(U + '#/online'); await A.waitForTimeout(900);
    await A.click('#onew'); await A.waitForTimeout(300); await A.fill('#nname', 'Bob');
    await A.evaluate(() => { const d = document.querySelector('.ng-more'); if (d) d.open = true; }); await A.click(`.ng-game[data-k="${kind}"]`);
    await A.click('#ngo'); await A.waitForTimeout(1500);
    const code = Object.keys(server.rooms).find(c => (kind === 'chaos' ? server.rooms[c].variant === 'chaos' : !server.rooms[c].variant && server.rooms[c].kind === 'race'));
    await playDraft(A);   // Alice finishes first
    await B.goto(U + '#/online?room=' + code); await B.waitForTimeout(1500);
    // Bob takes a few steps: spin, pick, place
    for (let i = 0; i < 9; i++) {
      if (i >= 3 && (((server.rooms[code].race.guest || {}).rl) || []).length) break;   // until a spin is on their screen
      await B.evaluate(() => { document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
        const mg = document.querySelector('.cm [data-mgr]'); if (mg) return mg.click(); const cm = document.querySelector('.cm:not(.out)'); if (cm) return cm.click();
        const sp = document.getElementById('spin'); if (sp) return sp.click();
        const t = document.querySelector('.slot.target'); if (t) return t.click();
        const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (rs.length) (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); });
      await B.waitForTimeout(i === 0 ? 3500 : 2800);
    }
    await A.waitForTimeout(3500);
    const w = await A.evaluate(() => { const e = document.querySelector('.watch'); return e && { text: e.innerText.replace(/\s+/g, ' '), reels: e.querySelectorAll('.wr').length, meter: !!e.querySelector('.chaos-meter') }; });
    ok(w && /Watching Bob/.test(w.text), `${kind}: the finished player sees a Watch panel for the other (${w && w.text.slice(0, 80)})`);
    ok(w && w.reels >= 1 && w.reels <= 3, `${kind}: it shows their options (${w && w.reels})`);
    ok(kind !== 'chaos' || (w && w.meter), `${kind}: CHAOS shows the CHAOS bar`);
    const sum = server.rooms[code].race.guest || {};
    ok(JSON.stringify(sum).length < 3500, `${kind}: what Bob posts stays well under the 4,000-byte limit (${JSON.stringify(sum).length})`);
    await playDraft(B); await B.waitForTimeout(1500); await A.waitForTimeout(2500);
    ok(!(await A.$('.watch')), `${kind}: the panel goes once they have finished`);
    if (kind === 'chaos') {
      const line = await A.evaluate(() => (document.querySelector('.race-final') || {}).innerText || '');
      ok(/CHAOS points/.test(line) && !/match points/.test(line), `CHAOS Race result has no points out of 100: "${line.replace(/\s+/g, ' ')}"`);
      await A.goto(U + '#/online?room=' + code + '&v=1'); await A.waitForTimeout(1500);
      const tbl = await A.$eval('.cmp-points', e => e.innerText.replace(/\s+/g, ' '));
      ok(!/Pts/.test(tbl), 'the comparison table has no Pts column: ' + tbl);
    }
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|')); await b.close();
})();

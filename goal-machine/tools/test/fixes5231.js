// 5.23.1: Make a Sub can be called off (tap it again), the Joker can become any wildcard the game allows (at the reels'
// odds), and Benítez the Tinkerman rotates one of your players (counts half) every third wildcard you play.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  await pg.goto(U); await pg.evaluate(() => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); });
  await pg.evaluate(() => { GM._forceMgr = 'benitez'; location.hash = '#/draft?m=chaos&seed=fix5231'; });
  await pg.waitForSelector('.cm-pick [data-mgr="benitez"]', { timeout: 8000 }); await pg.click('.cm-pick [data-mgr="benitez"]'); await pg.waitForTimeout(900);
  const prep = () => pg.evaluate(() => {
    const S = GM.draft.state();
    S.xi.forEach((x, i) => { if (x.p == null && i < 8) { const id = GM.players.findIndex((p, j) => p.poss.includes(x.pos) && !S.xi.some(y => y.p === j) && (x.pos === "GK" || p.goals > 20)); if (id < 0) return; x.p = id; x.v = { goals: GM.players[id].goals, assists: 0, apps: 1 }; x.g = x.v.goals; x.base = x.g; } });
    S.phase = 'spin'; S.reels = []; S.pending = null; S.subbing = false; document.querySelectorAll('.cm').forEach(c => c.remove()); GM.draft.render();
  });
  await prep();
  // Make a Sub: tap it, then tap it again to call it off
  await pg.evaluate(() => { const S = GM.draft.state(); S.inv = ['sub']; GM.draft.render(); });
  await pg.click('[data-w="0"]'); await pg.waitForTimeout(200);
  const on = await pg.evaluate(() => ({ s: GM.draft.state().subbing, label: document.querySelector('[data-w="0"]').textContent }));
  await pg.click('[data-w="0"]'); await pg.waitForTimeout(200);
  const off = await pg.evaluate(() => ({ s: GM.draft.state().subbing, inv: GM.draft.state().inv.join() }));
  ok(on.s === 0 && /Cancel/.test(on.label) && off.s === false && off.inv === 'sub', `Make a Sub: tap it again and it's called off, still in your bag (${JSON.stringify({ on, off })})`);
  // the Joker: every kind of wildcard can come out
  const kinds = await pg.evaluate(() => {
    const S = GM.draft.state(), seen = new Set();
    for (let k = 0; k < 400; k++) { S.inv = ['joker']; S.wildUsed = k; S.spin = k; document.querySelector('[data-w="0"]') || GM.draft.render(); GM.draft.render(); document.querySelector('[data-w="0"]').click(); seen.add(S.inv[0]); }
    return [...seen];
  });
  ok(['scout', 'respin', 'sub', 'captain'].every(k => kinds.includes(k)) && kinds.includes('hero') && !kinds.includes('joker'), `the Joker can become everyday wildcards too (${kinds.length} kinds: ${kinds.join(' ')})`);
  // Benítez the Tinkerman: the third wildcard played rotates a player (halved)
  await prep();
  const tk = await pg.evaluate(async () => {
    const S = GM.draft.state(); S.wildUsed = 2; S.modifier = null; S.inv = ['scout'];
    const before = S.xi.map(x => x.g); GM.draft.render(); document.querySelector('[data-w="0"]').click();
    await new Promise(r => setTimeout(r, 900));
    const i = S.xi.findIndex((x, k) => x.p != null && x.g === Math.floor(before[k] / 2) && before[k] > 1);
    return { halved: i, mod: i >= 0 ? S.xi[i].mod : null, toast: document.body.innerText.includes('Rafa rotates') };
  });
  ok(tk.halved >= 0 && tk.mod === 'halved' && tk.toast, `Benítez: the third wildcard and Rafa rotates someone, who counts half (${JSON.stringify(tk)})`);
  ok(await pg.evaluate(() => GM.draft.MANAGERS().benitez.catch.includes('Tinkerman')), 'his catch says so');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

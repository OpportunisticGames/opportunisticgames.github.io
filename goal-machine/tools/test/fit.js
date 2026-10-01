// 🧹 Readability on a small phone (360px): every player's name fits on a pack card and on a Goal Royale card, the
// draft titles aren't cut off, stat buttons don't wrap, and wide tiles keep their text clear of the corner icon.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 360, height: 760 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false); set('club', 'Everton'); set('secret:royale', 1); });
  await pg.reload(); await pg.waitForTimeout(700);

  const cut = await pg.evaluate(() => {
    const box = document.createElement('div'); box.className = 'po-cards'; box.style.cssText = 'position:fixed;left:0;top:0;width:340px;display:flex;flex-wrap:wrap;gap:10px;visibility:hidden';
    document.body.appendChild(box);
    const bad = [];
    for (let i = 0; i < GM.players.length; i += 60) {
      box.innerHTML = GM.players.slice(i, i + 60).map(p => GM.cardHtml({ p, t: GM.cardTier(p) }, { back: false })).join('');
      box.querySelectorAll('.pc-name').forEach(n => { if (n.scrollWidth > n.clientWidth + 1) bad.push(n.textContent); });
    }
    box.remove(); return bad;
  });
  ok(!cut.length, `every player's name fits on a pack card (${cut.length} cut off${cut.length ? ': ' + cut.slice(0, 5).join(', ') : ''})`);

  // tiles: the corner icon never sits on a wide tile's title or first line
  const hits = await pg.evaluate(() => [...document.querySelectorAll('.tile.wide')].filter(t => {
    const i = t.querySelector(':scope > .tile-icon'); if (!i) return false; const r = i.getBoundingClientRect();
    return [...t.querySelectorAll(':scope > b, :scope > small:first-of-type')].some(el => { const rng = document.createRange(); rng.selectNodeContents(el);
      return [...rng.getClientRects()].some(q => q.right > r.left + 4 && q.left < r.right && q.bottom > r.top + 4 && q.top < r.bottom - 4); });
  }).map(t => t.querySelector('b') && t.querySelector('b').textContent));
  ok(!hits.length, `wide tiles' text stays clear of the corner icon${hits.length ? ': ' + hits.join(', ') : ''}`);
  const wrapped = await pg.evaluate(() => [...document.querySelectorAll('.stat-btn')].filter(s => s.offsetParent && s.getClientRects().length && s.scrollWidth > s.clientWidth + 1).length);
  ok(!wrapped, `stat buttons fit (${wrapped} overflowing)`);

  for (const m of ['ultimate', 'extreme', 'classicwild', 'chaos']) {
    await pg.goto(U + '#/draft?m=' + m); await pg.waitForTimeout(500);
    const t = await pg.evaluate(() => { const e = document.querySelector('.t-name'); return e && { text: e.textContent, cut: e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1 }; });
    ok(t && !t.cut, `draft title “${t && t.text}” isn't cut off`);
  }

  await pg.goto(U + '#/royale'); await pg.waitForTimeout(600);
  const gr = await pg.evaluate(() => {
    const d = document.getElementById('grdeck'); if (!d) return null;
    const names = [...new Set(GM.players.map(p => p.name.split(' ').slice(-1)[0]))];
    d.innerHTML = names.map(n => `<div class="gr-card t-b"><span class="gr-cost">3</span><b${n.length > 9 ? ' class="long"' : ''}>${GM.esc(n)}</b><small>M</small></div>`).join('');
    return [...d.querySelectorAll('b')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent);
  });
  ok(gr && !gr.length, `every surname fits on a Goal Royale card (${gr ? gr.length : '?'} cut off${gr && gr.length ? ': ' + gr.slice(0, 5).join(', ') : ''})`);

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

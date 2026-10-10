// ⚔️ Friend challenges end to end on two phones: Alice plays a Classic draft and sends a challenge; Bob opens the link,
// sees her score, takes it on (same spins) with the ghost bar showing where he stands after each signing; Alice watches
// along; at full time both get the head-to-head (verdict, both lines on one chart, the XIs, the different signings),
// reactions both ways, a rematch sent back (best of three), the Friends-tab tally and the rivalry page.
//   node challenges.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
async function phone(b, name, key, errs) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U); await pg.evaluate(([n, k]) => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k })); }, [name, key]);
  await pg.evaluate(() => { GM.share = (t, u) => { window._shared = { t, u }; }; });
  return pg;
}
async function step(pg, last) {
  return pg.evaluate(last => {
    document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
    if (document.querySelector('.result-total')) return 'done';
    const mg = document.querySelector('.cm [data-mgr]'); if (mg) { mg.click(); return 'mgr'; }
    const cm = document.querySelector('.cm:not(.out)'); if (cm) { cm.click(); return 'moment'; }
    const sp = document.getElementById('spin'); if (sp && !sp.disabled) { sp.click(); return 'spin'; }
    const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
    const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
    const ok = rs.filter(r => !r.classList.contains('is-wild')); ((last ? ok[ok.length - 1] : ok[0]) || rs[0]).click(); return 'pick';
  }, !!last).catch(() => 'err');
}
async function playDraft(pg, each, last) {
  for (let k = 0; k < 160; k++) {
    const st = await step(pg, last);
    if (st === 'done') return true;
    if (each && st === 'place') await each(k);
    await pg.waitForTimeout(st === 'spin' ? 1300 : 450);
  }
  return false;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs), B = await phone(b, 'Bob', 'b'.repeat(28), errs);
  // Alice plays and challenges
  await A.goto(U + '#/draft?m=classic&s=goals&seed=chal-1'); await A.waitForTimeout(1200);
  ok(await playDraft(A), 'Alice plays a Classic draft to full time');
  await A.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  await A.evaluate(() => document.getElementById('challenge').click()); await A.waitForTimeout(1200);
  const shared = await A.evaluate(() => window._shared);
  const code = Object.keys(server.chs)[0];
  ok(shared && code && shared.u.endsWith('#/c?id=' + code), `the challenge is saved and shared as a short link (${shared && shared.u})`);
  const owner = server.plays.find(p => p.code === code && p.owner);
  ok(owner && owner.game.xi.filter(x => x[1]).length === 11 && owner.game.prog.length >= 11 && owner.game.picks.length === 11, `her XI, her line and her 11 signings travel with it (line ${owner && owner.game.prog.length} points)`);
  // Bob opens the link
  await B.goto(U + '#/c?id=' + code); await B.waitForTimeout(1200);
  const land = await B.textContent('#app');
  ok(/Alice challenges you/.test(land) && land.includes(owner.score.toLocaleString()), 'Bob sees who challenged him and the score to beat');
  await B.screenshot({ path: 'lay/ch_landing.png' });
  await B.click('#ch-go'); await B.waitForTimeout(1500);
  ok(/seed=chal-1/.test(await B.evaluate(() => location.hash)), 'Take it on: the same spins (same seed)');
  // the ghost bar after a few signings, and Alice watching along
  let ghost = '', watched = false;
  const mid = async k => {
    const n = await B.evaluate(() => GM.draft.state().xi.filter(x => x.p != null).length);
    if (n === 3 && !ghost) {
      await B.waitForTimeout(1600);
      ghost = await B.evaluate(() => (document.querySelector('.ch-ghost') || {}).textContent || '');
      await B.screenshot({ path: 'lay/ch_ghost.png' });
      const bp = server.plays.find(p => p.code === code && !p.owner);
      await A.goto(U + `#/c?id=${code}&watch=${bp.id}`); await A.waitForTimeout(1500);
      watched = /Bob is playing/.test(await A.textContent('#app')) && !!(await A.$('.ch-chart polyline.la'));
      await A.screenshot({ path: 'lay/ch_watch.png' });
    }
  };
  ok(await playDraft(B, mid, true), 'Bob plays the challenge to full time (picking differently)');
  ok(/After 3 signings: you .* Alice/.test(ghost.replace(/\s+/g, ' ')), 'the ghost bar shows where he stands after the same number of signings: ' + ghost.replace(/\s+/g, ' ').trim().slice(0, 90));
  ok(watched, 'Alice watches along live: Bob is playing, his line on the chart');
  await A.waitForTimeout(4500);
  ok(/Full time/.test(await A.textContent('#app')), '…and her watch page turns to full time when he finishes');
  // the head-to-head on Bob's full-time screen
  await B.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  await B.waitForSelector('.ch-verdict', { timeout: 8000 }).catch(() => {});
  const h = await B.evaluate(() => ({ v: (document.querySelector('.ch-verdict') || {}).textContent || '', lines: document.querySelectorAll('#ch-h2h polyline').length, diffs: document.querySelectorAll('.ch-diff').length, xis: document.querySelectorAll('.ch-xis tr').length, react: document.querySelectorAll('[data-react]').length }));
  ok(/(beat|level)/.test(h.v) && h.diffs > 0 && h.lines === 2 && h.xis >= 12 && h.react >= 6, `Bob's head-to-head: the verdict, both lines, both XIs, reactions (${JSON.stringify({ ...h, v: h.v.replace(/\s+/g, ' ').trim().slice(0, 40) })})`);
  await B.evaluate(() => document.getElementById('ch-h2h').scrollIntoView()); await B.screenshot({ path: 'lay/ch_h2h.png', fullPage: false });
  const bp = server.plays.find(p => p.code === code && !p.owner);
  ok(bp.status === 'done' && bp.game.prog.length >= 11, 'his result is saved with his line');
  // reactions both ways
  await B.evaluate(() => document.querySelector('[data-react]').click()); await B.waitForTimeout(500);
  ok(!!bp.reaction, `Bob's reaction reaches the challenge (${bp.reaction})`);
  await A.goto(U + `#/c?id=${code}&p=${bp.id}`); await A.waitForTimeout(1500);
  ok((await A.textContent('#app')).includes(bp.reaction), 'Alice sees his reaction on the head-to-head');
  await A.evaluate(() => document.querySelectorAll('[data-react]')[1].click()); await A.waitForTimeout(500);
  ok(!!bp.owner_reaction, `and reacts back (${bp.owner_reaction})`);
  // a picture of it
  await A.evaluate(() => { window._pic = null; GM.shareImage = p => { window._pic = p; }; document.getElementById('ch-pic').click(); });
  ok(await A.evaluate(() => (window._pic || '').startsWith('data:image/png')), 'Share the head-to-head makes a picture');
  // Alice asks for a rematch: plays new spins, it's sent back to Bob (best of three)
  await A.evaluate(() => document.getElementById('ch-rematch').click()); await A.waitForTimeout(1500);
  ok(/rm=/.test(await A.evaluate(() => location.hash)) && !/seed=chal-1/.test(await A.evaluate(() => location.hash)), 'Rematch: new spins');
  ok(await playDraft(A), 'Alice plays the rematch');
  await A.waitForTimeout(1500);
  const re = Object.values(server.chs).find(c => c.parent === code);
  ok(re && re.to_user === 'Bob', `the rematch is sent to Bob (${re && re.code} → ${re && re.to_user})`);
  // Bob plays the rematch: best of three
  await B.goto(U + '#/c?id=' + re.code); await B.waitForTimeout(1200); await B.click('#ch-go'); await B.waitForTimeout(1200);
  ok(await playDraft(B), 'Bob plays the rematch');
  await B.waitForSelector('.ch-bo3', { timeout: 8000 }).catch(() => {});
  ok(/Best of three/.test(await B.evaluate(() => (document.querySelector('.ch-bo3') || {}).textContent || '')), 'the rematch shows best of three');
  // the tally on the Friends tab and the rivalry page
  server.fns.online_add_friend({ p_user: 'Alice', p_key: 'a'.repeat(28), p_friend: 'Bob' });
  await A.goto(U + '#/online?t=friends'); await A.waitForTimeout(1800);
  await A.evaluate(() => { const t = document.querySelector('[data-tab="friends"]'); if (t) t.click(); }); await A.waitForTimeout(1500);
  const tal = await A.evaluate(() => (document.querySelector('.ch-tally') || {}).textContent || '');
  ok(/\d–\d/.test(tal), 'the Friends tab shows the challenge tally with Bob: ' + tal);
  await A.goto(U + '#/rival?name=Bob'); await A.waitForTimeout(1500);
  const rv = await A.textContent('#app');
  ok(/You \d – \d Bob/.test(rv) && /Every challenge/.test(rv), 'the rivalry page: the record and every challenge');
  await A.screenshot({ path: 'lay/ch_rival.png' });
  // a third friend makes it a group challenge (the table)
  const C = await phone(b, 'Cara', 'c'.repeat(28), errs);
  await C.goto(U + '#/c?id=' + code); await C.waitForTimeout(1200); await C.click('#ch-go'); await C.waitForTimeout(1200);
  ok(await playDraft(C), 'Cara takes on the same challenge');
  await C.waitForSelector('.ch-verdict', { timeout: 8000 }).catch(() => {});
  await C.waitForTimeout(800);
  ok((await C.$$('#ch-h2h .ch-table .ch-row')).length === 3, 'with three goes it becomes a group challenge: the table');
  // a CHAOS challenge (points, a manager, moments)
  await A.goto(U + '#/draft?m=chaos&s=goals&seed=chal-chaos'); await A.waitForTimeout(1500);
  ok(await playDraft(A), 'Alice plays CHAOS');
  await A.waitForTimeout(800); await A.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  await A.evaluate(() => { window._shared = null; document.getElementById('challenge').click(); }); await A.waitForTimeout(1500);
  const cc = (await A.evaluate(() => window._shared.u)).split('id=')[1];
  ok(server.plays.find(p => p.code === cc && p.owner).game.unit === 'pts', 'a CHAOS challenge counts points');
  await B.goto(U + '#/c?id=' + cc); await B.waitForTimeout(1200); await B.click('#ch-go'); await B.waitForTimeout(1500);
  ok(await playDraft(B, null, true), 'Bob plays the CHAOS challenge');
  await B.waitForSelector('.ch-verdict', { timeout: 8000 }).catch(() => {});
  ok(/pts/.test(await B.evaluate(() => (document.querySelector('.ch-verdict') || {}).textContent || '')) && (await B.$$('#ch-h2h polyline')).length === 2, 'and gets the CHAOS head-to-head in points');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

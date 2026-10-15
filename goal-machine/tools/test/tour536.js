// 5.36: the tour (offered once on Home to players who were here before it, from Settings any time) and the first-time
// tips for CHAOS, the Targets, Hat-Trick and Dodgy Owner.   node tour536.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  for (const [w, h] of [[390, 844], [360, 640]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); await server.attach(ctx);
    await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(U); await pg.evaluate(() => { const s = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v));
      s('seenVersion', 999); s('welcomed', 1); s('played', 3); s('calm', true); s('tourTest', 1); s('account', { name: 'Alice', key: 'a'.repeat(28) }); });
    await pg.reload(); await pg.waitForTimeout(3600);
    const offer = await pg.evaluate(() => (document.querySelector('.modal-wrap') || {}).innerText || '');
    ok(/30-second tour/.test(offer), `${w}px: an existing player is offered the tour on Home ("${offer.replace(/\s+/g, ' ').slice(0, 60)}")`);
    await pg.click('#tourgo'); await pg.waitForTimeout(700);
    const titles = [];
    for (let k = 0; k < 14; k++) {
      const t = await pg.evaluate(() => { const b = document.querySelector('.tour-bubble'); if (!b) return null; const r = b.getBoundingClientRect(), g = document.querySelector('.tour-ring').getBoundingClientRect();
        return { t: b.querySelector('b').textContent, inside: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, ring: g.width > 10 && g.height > 10 }; });
      if (!t) break;
      titles.push(t);
      if (k === 0 || k === 4 || t.t.includes('Locker')) await pg.screenshot({ path: `lay/tour_${w}_${k}.png` });
      await pg.click('.tour', { position: { x: 5, y: 5 } }); await pg.waitForTimeout(450);
    }
    ok(titles.length >= 8 && titles.every(t => t.inside && t.ring), `${w}px: ${titles.length} tour steps, each bubble on screen with its spotlight (${titles.map(t => t.t).join(' · ')})`);
    const end = await pg.evaluate(() => ({ modal: (document.querySelector('.modal-wrap') || {}).innerText || '', seen: localStorage.getItem('gm:tourSeen') }));
    ok(/That’s the tour/.test(end.modal) && end.seen, `${w}px: it ends on what to try next, and is remembered`);
    await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
    await pg.evaluate(() => { location.hash = '#/settings'; }); await pg.waitForTimeout(900);
    await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(3200);
    const again = await pg.evaluate(() => (document.querySelector('.modal-wrap') || {}).innerText || '');
    ok(!/tour/i.test(again), `${w}px: it isn't offered again${again ? ' (other pop-up: ' + again.replace(/\s+/g, ' ').slice(0, 50) + ')' : ''}`);
    if (w === 390) {
      await pg.evaluate(() => { location.hash = '#/settings'; }); await pg.waitForTimeout(800);
      await pg.click('#s-tour'); await pg.waitForTimeout(1400);
      ok(!!(await pg.$('.tour-bubble')), 'Settings → Take the tour starts it again');
      await pg.click('[data-skip]'); await pg.waitForTimeout(300);
      ok(!(await pg.$('.tour')), 'Skip ends it');
      // the first-time tips (the tester link unlocks the secret games, Hat-Trick among them)
      await pg.evaluate(() => { location.hash = '#/tester?code=owner-test-2026'; }); await pg.waitForTimeout(800);
      await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
      for (const [hash, name] of [['#/draft?m=chaos&s=goals', 'CHAOS'], ['#/draft?m=target&s=goals', 'Targets'], ['#/hattrick', 'Hat-Trick'], ['#/owner', 'Dodgy Owner']]) {
        await pg.evaluate(hh => { location.hash = '#/x'; location.hash = hh; }, hash); await pg.waitForTimeout(1300);
        for (let k = 0; k < 6; k++) { await pg.evaluate(() => { const mg = document.querySelector('.cm [data-mgr]'); if (mg) return mg.click(); const cm = document.querySelector('.cm:not(.out)'); if (cm) cm.click(); const sp = document.getElementById('spin'); if (sp && /chaos/.test(location.hash) && !document.querySelector('.welcome.tips')) sp.click(); }); await pg.waitForTimeout(700); if (await pg.$('.welcome.tips')) break; }
        const t = await pg.evaluate(() => (document.querySelector('.welcome.tips') || {}).innerText || '');
        ok(t.toLowerCase().includes(name.toLowerCase()), `the first time in ${name}: its tips (${t.split('\n').length} lines)`);
        if (name === 'CHAOS') { await pg.waitForTimeout(800); await pg.screenshot({ path: 'lay/tips_chaos.png' }); }
        await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
        await pg.evaluate(hh => { location.hash = '#/x'; location.hash = hh; }, hash); await pg.waitForTimeout(1000);
        ok(!(await pg.$('.welcome.tips')), `…and not the second time (${name})`);
      }
      await pg.evaluate(() => { location.hash = '#/settings'; }); await pg.waitForTimeout(700);
      await pg.click('#s-tips'); await pg.evaluate(() => { location.hash = '#/draft?m=target&s=goals'; }); await pg.waitForTimeout(1300);
      ok(!!(await pg.$('.welcome.tips')), 'Show the game tips again brings them back');
    }
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); server.close && server.close();
})();

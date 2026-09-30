// 💰 Moneyball (the chairman's season): start, buy, play the matchweeks, the news, selling, Deadline Day, full time
// and its board (£m), Hard and Extreme, the Daily (the same for everyone, one go), and a balance check on the economy.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const fresh = async (extra = {}) => {
    await pg.goto(U);
    await pg.evaluate(x => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false);
      Object.entries(x).forEach(([k, v]) => set(k, v)); }, extra);
    await pg.reload(); await pg.waitForTimeout(400);
  };
  const closeNews = () => pg.evaluate(() => { const m = document.querySelector('.mb-breaking:not(.out)'); if (!m) return ''; const t = m.querySelector('h2').textContent; (m.querySelector('[data-ok], [data-no]') || m.querySelector('button')).click(); return t; });
  const top = () => pg.evaluate(() => [...document.querySelectorAll('.mb-top b')].map(e => e.textContent));
  await fresh();

  // Home and the old routes
  await pg.evaluate(() => { localStorage.setItem('gm:homeTab', '"market"'); }); await pg.goto(U + '#/'); await pg.waitForTimeout(400);
  ok(!!(await pg.$('a.tile[href="#/moneyball"]')) && !(await pg.$('a[href="#/window"]')), 'the Market tab has the new Moneyball (the Transfer Window is part of it now)');
  await pg.goto(U + '#/window?s=goals'); await pg.waitForTimeout(500);
  ok(/#\/moneyball/.test(await pg.evaluate(() => location.hash)), 'old Transfer Window links go to Moneyball');

  // a season
  await pg.goto(U + '#/moneyball'); await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.snd = []; const p = GM.sound.play; GM.sound.play = (n, x) => { snd.push(n); return p(n, x); }; });
  ok(/Chairman for a season/.test(await pg.textContent('#app')), 'it starts with the idea: chairman for a season, net worth is the score');
  await pg.click('#mbgo'); await pg.waitForTimeout(400);
  let t = await top();
  ok(t[0] === '1/8' && t[1] === '£100m' && (await pg.$$('[data-buy]')).length === 4, 'week 1: £100m and a market of four');
  const ask = await pg.evaluate(() => { const b = document.querySelector('[data-buy]:not([disabled])'); const price = b.querySelector('.mk-price').textContent; b.click(); return price; });
  await pg.waitForTimeout(300);
  t = await top();
  ok((await pg.$$('.mb-card:not(.empty)')).length === 1 && (await pg.$$('.mb-card.empty')).length === 4 && (await pg.$$('[data-buy]')).length === 3, `buying one (${ask}) puts his card in your squad`);
  ok(await pg.evaluate(() => document.body.classList.contains('money-mode') && !!document.querySelector('.mb-hud #mbnet') && !!document.querySelector('.mb-hud svg .mbs-line')), 'the boardroom look: a net worth counter and a chart of the season');
  await pg.click('#mbplay'); await pg.waitForTimeout(1200);
  ok(!!(await pg.$('.mb-live .rec')) && (await pg.$$('.mbl-ev')).length >= 1, 'the matchweek plays out live, minute by minute');
  ok((await pg.$$('.mbw-row')).length === 1 && /Scored|Brace|Hat-trick|Assist|Clean sheet|Quiet game|Benched|Injured/.test(await pg.textContent('#mbweek')), '…then each player’s prize money and value change');
  await pg.click('#mbnext'); await pg.waitForTimeout(900);
  const news = await closeNews();
  ok(!!news, `week 2 brings BREAKING NEWS: “${news}”`);
  await pg.waitForTimeout(300);
  // sell
  if (await pg.$('[data-sell]')) {
    const before = await pg.evaluate(() => document.querySelectorAll('.mb-card:not(.empty)').length);
    await pg.click('[data-sell]'); await pg.waitForTimeout(300);
    await pg.evaluate(() => { const y = [...document.querySelectorAll('.modal-wrap button')].find(b => /Sell/.test(b.textContent)); if (y) y.click(); }); await pg.waitForTimeout(250);
    ok(!!(await pg.$('.mbc-stamp')), 'selling stamps his card SOLD');
    await pg.waitForTimeout(900);
    ok(await pg.evaluate(() => document.querySelectorAll('.mb-card:not(.empty)').length) === before - 1, '…and takes him off your books');
    ok(await pg.evaluate(() => ['newsflash', 'stamp'].every(n => snd.includes(n))), 'sounds: the news sting, the stamp coming down');
  }
  // play through, buying what we can afford
  for (let w = 2; w <= 8; w++) {
    await closeNews(); await pg.waitForTimeout(200);
    if (w === 8) {
      const cut = await pg.evaluate(() => ({ banner: !!document.querySelector('.mb-deadline .mbd-clock'), tags: document.querySelectorAll('[data-buy] .dc-tag').length, was: document.querySelectorAll('[data-buy] .mk-price s').length }));
      ok(cut.banner && cut.tags >= 1 && cut.was >= 1, 'week 8 is Deadline Day: a clock, and cut-price players with the old price struck through');
    }
    await pg.evaluate(() => { for (let i = 0; i < 2; i++) { const x = document.querySelector('[data-buy]:not([disabled])'); if (x) x.click(); } });
    await pg.waitForTimeout(200);
    await pg.click('#mbplay'); await pg.waitForTimeout(400);
    await pg.click('#mbnext'); await pg.waitForTimeout(1300);
  }
  await closeNews(); await pg.waitForTimeout(600);
  await pg.waitForTimeout(1500);
  const res = await pg.evaluate(() => ({ score: (document.querySelector('.result-score') || {}).textContent, best: GM.best('money'), chart: !!document.querySelector('.mb-result svg .mbs-line'), verdict: (document.querySelector('.mbr-verdict b') || {}).textContent }));
  ok(/^£[\d.,]+m/.test(res.score || '') && res.best > 0 && res.chart && !!res.verdict, `full time: the chairman’s report — “${res.verdict}”, net worth (${(res.score || '').split('n')[0]}), a chart, on the board (${res.best})`);
  ok(await pg.evaluate(() => snd.includes('count') && ['fanfare', 'bell', 'good', 'tricklose', 'boo', 'sacked'].some(n => snd.includes(n)) && GM.sound.TRACKS.includes('boardroom')), 'the counter rolls up, the verdict has its own sound, and Moneyball has its own music (Boardroom)');
  ok(await pg.evaluate(() => GM.scoreText('money', 143) === '£143m' && GM.scoreText('ultimate', 1432) === '1,432'), 'boards show Moneyball scores in £m');

  // Hard and Extreme
  await fresh({ level: 'hard' });
  await pg.goto(U + '#/moneyball?go=1'); await pg.waitForTimeout(500);
  ok(/Hard/.test(await pg.textContent('.topbar h2')) && !(await pg.$('.mk-card .chips')) && await pg.$eval('.lb-btn', e => e.dataset.lb) === 'moneyh', 'Hard: names and positions only, its own board');
  await fresh({ level: 'extreme' });
  let obscure = 0;
  for (let i = 0; i < 4; i++) {
    await pg.goto(U + '#/'); await pg.goto(U + '#/moneyball?go=1'); await pg.waitForTimeout(i ? 400 : 2000);
    obscure += await pg.evaluate(() => [...document.querySelectorAll('.mk-card b')].filter(b => !GM.players.some(p => p.name === b.textContent)).length);
  }
  ok(/Extreme/.test(await pg.textContent('.topbar h2')) && await pg.$eval('.lb-btn', e => e.dataset.lb) === 'moneyx' && obscure > 0, `Extreme: every PL player on the market (${obscure} from outside the 50+ list in 4 markets)`);

  // the Daily: the same for everyone, one go
  await fresh({ level: 'extreme' });
  await pg.goto(U + '#/moneyball?daily=1'); await pg.waitForTimeout(500);
  const m1 = await pg.$$eval('.mk-card b', l => l.map(e => e.textContent).join());
  ok(!/Extreme/.test(await pg.textContent('.topbar h2')) && await pg.$eval('.lb-btn', e => e.dataset.lb).then(k => /^dmoney:/.test(k)), 'the Daily Moneyball is Normal for everyone, on the day’s board');
  await fresh();
  await pg.goto(U + '#/moneyball?daily=1'); await pg.waitForTimeout(500);
  ok(await pg.$$eval('.mk-card b', l => l.map(e => e.textContent).join()) === m1, 'everyone gets the same market');
  for (let w = 1; w <= 8; w++) { await closeNews(); await pg.waitForTimeout(150); await pg.click('#mbplay'); await pg.waitForTimeout(300); await pg.click('#mbnext'); await pg.waitForTimeout(1300); }
  await closeNews(); await pg.waitForTimeout(500);
  const dr = await pg.evaluate(() => GM.dailyResult('moneyball'));
  ok(dr >= 90 && dr <= 110, `the Daily counts for your streak (doing nothing: £${dr}m, just the news)`);
  await pg.goto(U + '#/'); await pg.goto(U + '#/moneyball?daily=1'); await pg.waitForTimeout(500);
  ok(!!(await pg.$('.mb-result')) && !(await pg.$('#mbagain')), 'one go: coming back shows today’s result');
  await pg.goto(U + '#/'); await pg.waitForTimeout(300);
  ok(!(await pg.evaluate(() => document.body.classList.contains('money-mode'))), 'leaving Moneyball puts the normal look back');

  // the economy: luck alone makes a little, stars are a gamble, knowing who's underpriced pays
  const sim = await pg.evaluate(() => {
    const C = GM.mbCore, r1 = x => Math.round(x * 10) / 10;
    function season(seed, pick) {
      let cash = C.START; const squad = [];
      for (let w = 1; w <= C.WEEKS; w++) {
        const r = GM.rng(seed + '|mk' + w), mk = [];
        while (mk.length < 4) { const p = GM.players[r.int(GM.players.length)]; if (!squad.some(x => x.p === p) && !mk.some(o => o.p === p)) { const full = r1(GM.market.price(p, seed)); mk.push({ p, ask: w === C.WEEKS ? r1(full * C.DEADLINE) : full, full }); } }
        for (const o of pick(mk)) if (squad.length < C.SQUAD && cash >= o.ask) { cash -= o.ask; squad.push({ p: o.p, value: o.full }); }
        for (const x of squad) { const o = C.matchweek(x.p, seed, w); x.value = Math.max(0.5, x.value * (1 + o.change)); x.value += (C.worth(x.p) - x.value) * 0.1; cash += o.cash; }
      }
      return cash + squad.reduce((t, x) => t + x.value, 0);
    }
    const med = f => { const v = []; for (let i = 0; i < 250; i++) v.push(season('bal' + i, f)); v.sort((a, b) => a - b); return Math.round(v[125]); };
    return { random: med(mk => [mk[0]]), stars: med(mk => mk.slice().sort((a, b) => b.ask - a.ask).slice(0, 1)), informed: med(mk => mk.filter(o => C.worth(o.p) / o.ask > 1.3)) };
  });
  ok(sim.random >= 95 && sim.random <= 125 && sim.informed >= sim.random + 20 && sim.stars <= sim.random + 5, `balance: random ~£${sim.random}m, stars ~£${sim.stars}m, spotting bargains ~£${sim.informed}m`);
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

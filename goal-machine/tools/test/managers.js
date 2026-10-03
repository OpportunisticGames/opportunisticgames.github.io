// 👔 CHAOS manager balance: a bot plays the same seeded CHAOS drafts with every manager (timers sped up) and compares
// the average final points. The bot knows every player's numbers (a well-read player), takes what his manager likes,
// grabs and plays wildcards now and then, and flips every coin.
//   node managers.js [games per manager, default 30] [managers, e.g. "pulis,dyche"] [parallel pages, default 6]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = process.env.SIM_URL || 'http://localhost:8765/goal-machine/';
const STRAT = process.env.STRAT || '';
const GAMES = +(process.argv[2] || 30), ONLY = (process.argv[3] || '').split(',').filter(Boolean), PAR = +(process.argv[4] || 6);

// speed every timer up (animations and pauses), so a whole CHAOS draft takes a second or two
const TURBO = () => {
  const st = window.setTimeout, si = window.setInterval;
  window.setTimeout = (f, ms, ...a) => st(f, Math.min(+ms || 0, 8), ...a);
  window.setInterval = (f, ms, ...a) => si(f, Math.max(4, Math.min(+ms || 0, 8)), ...a);
  const t0 = performance.now(), pn = performance.now.bind(performance);
  performance.now = () => t0 + (pn() - t0) * 40;  // count-ups and the coin flip finish 40x faster
};

// one move of the bot; returns what it did
const STEP = () => {
  document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
  const S = GM.draft.state(), M = GM.draft.MANAGERS();
  const cm = document.querySelector('.cm:not(.out):not(.act)');  // (a moment that's under way doesn't stop play)
  if (cm) {
    const pick = cm.querySelector(`[data-mgr="${GM._forceMgr}"]`) || cm.querySelector('[data-mgr]');
    if (pick) { pick.click(); return 'mgr'; }
    const coin = cm.querySelector('.coin-wrap'); if (coin && !cm.classList.contains('flipping')) { coin.click(); return 'coin'; }
    cm.click(); return 'moment';
  }
  if (document.querySelector('.result-total') || S.phase === 'done') return 'done';
  const m = S.manager && M[S.manager];
  const P = (S.rules.all ? GM.allPlayers : GM.players);
  const worth = p => {  // what the bot thinks he's worth to this XI, in goals
    const k = S.rules.chaos && p.pos === 'G' && p.cs ? Math.floor(p.cs / 3) : 0;
    let v = { goals: p.goals + k, assists: p.ast + Math.floor(k * 0.7), apps: p.apps }[S.stat];
    if (m && m.likes && m.likes(p)) v += 12; if (m && m.hates && m.hates(p)) v -= 8;
    return v;
  };
  const sub = document.querySelector('.pitch.subbing .slot.filled');
  if (sub) {  // release the weakest
    const f = [...document.querySelectorAll('.pitch.subbing .slot.filled')].sort((a, b) => S.xi[a.dataset.slot].g - S.xi[b.dataset.slot].g)[0];
    f.click(); return 'sub';
  }
  const spin = document.getElementById('spin');
  // STRAT=combo: save a Centurion Throw for a booster (Hat-Trick Hero, else Captain's Armband) and play them together
  const combo = window.GM_STRAT === 'combo', btn = t => [...document.querySelectorAll('.wild-btn')].find(b => S.inv[b.dataset.w] === t);
  const late = S.xi.filter(x => x.p != null).length >= 9;
  if (combo && spin && !spin.disabled && btn('centurion')) {
    if (!S.modifier && btn('captain')) { btn('captain').click(); return 'combo-boost'; }
    if (S.modifier === 'captain' || late) { btn('centurion').click(); return 'combo-centurion'; }
  }
  if (spin && !spin.disabled) {
    // a special spin or a respin from the bag now and then before spinning
    const w = [...document.querySelectorAll('.wild-btn')].find(b => !['sub', 'captain', 'coin', 'rotation', 'allin', 'hot'].concat(combo ? ['centurion'] : []).includes(S.inv[b.dataset.w]));
    if (w && Math.random() < 0.5) { w.click(); return 'wild-spin'; }
    spin.click(); return 'spin';
  }
  if (S.pending != null) {
    const p = P[S.reels[S.pending].id];
    const ts = [...document.querySelectorAll('.slot.target')];
    if (!ts.length) return 'wait';
    const natural = ts.find(t => p.poss.includes(S.xi[t.dataset.slot].pos));
    (natural || ts[0]).click(); return 'place';
  }
  if (S.phase !== 'pick') return 'wait';
  const reels = [...document.querySelectorAll('.stage .reel[data-reel]')];
  if (!reels.length) return 'wait';
  const players = reels.filter(r => !S.reels[r.dataset.reel].wild).map(r => ({ r, p: P[S.reels[r.dataset.reel].id] }))
    .sort((a, b) => worth(b.p) - worth(a.p));
  const best = players[0];
  // play a boost or a gamble from the bag on a good signing
  if (best && worth(best.p) >= 20) {
    const w = [...document.querySelectorAll('.wild-btn')].find(b => (combo ? ['hot', 'coin'] : ['captain', 'hot', 'coin']).includes(S.inv[b.dataset.w]));
    if (w && !S.modifier && Math.random() < 0.7) { w.click(); return 'wild-boost'; }
  }
  const allin = [...document.querySelectorAll('.wild-btn')].find(b => S.inv[b.dataset.w] === 'allin');
  if (allin && S.xi.filter(x => x.p != null).length >= 7 && Math.random() < 0.5) { allin.click(); return 'allin'; }
  const subW = [...document.querySelectorAll('.wild-btn')].find(b => S.inv[b.dataset.w] === 'sub');
  if (subW && best && S.xi.some(x => x.p != null && x.g < 2) && worth(best.p) > 15 && Math.random() < 0.5) { subW.click(); return 'sub-card'; }
  const wildReel = (combo && reels.find(r => ['centurion', 'captain'].includes(S.reels[r.dataset.reel].wild))) || reels.find(r => S.reels[r.dataset.reel].wild);
  if (wildReel && S.inv.length < 3 && (!best || worth(best.p) < 10 || Math.random() < 0.25 || (combo && ['centurion', 'captain'].includes(S.reels[wildReel.dataset.reel].wild) && worth(best.p) < 60))) { wildReel.click(); return 'take-wild'; }
  (best ? best.r : reels[0]).click(); return 'pick';
};

(async () => {
  const b = await chromium.launch();
  const mgrs = await (async () => {
    const ctx = await b.newContext(); const pg = await ctx.newPage();
    await pg.goto(U); await pg.waitForFunction(() => window.GM && GM.draft);
    const ks = await pg.evaluate(() => Object.keys(GM.draft.MANAGERS())); await ctx.close();
    return ONLY.length ? ks.filter(k => ONLY.includes(k)) : ks;
  })();
  const jobs = []; for (const k of mgrs) for (let g = 0; g < GAMES; g++) jobs.push({ k, seed: 'mgrsim' + g });
  const res = {}, info = {}; mgrs.forEach(k => { res[k] = []; });
  let done = 0, errs = 0; const t0 = Date.now();
  const worker = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/wikimedia|premierleague|transfermarkt|supabase|fonts\./, r => r.abort());
    await ctx.addInitScript(TURBO);
    await ctx.addInitScript(s => { window.GM_STRAT = s; }, STRAT);
    await ctx.addInitScript(() => { try { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:sound', '0'); localStorage.setItem('gm:music', '0'); } catch (e) { /* about:blank */ } });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => { errs++; if (errs < 5) console.log('page error:', e.message); });
    while (jobs.length) {
      const j = jobs.shift();
      await pg.goto('about:blank');
      await pg.goto(U);
      await pg.waitForFunction(() => window.GM && GM.draft);
      await pg.evaluate(k => { Object.keys(localStorage).filter(x => x.startsWith('gm:draftp')).forEach(x => localStorage.removeItem(x)); GM._forceMgr = k; }, j.k);
      await pg.evaluate(seed => { location.hash = '#/draft?m=chaos&seed=' + seed; }, j.seed);
      let r = '', n = 0;
      for (; n < 1500 && r !== 'done'; n++) {
        r = await pg.evaluate(STEP).catch(e => 'err ' + e.message);
        await pg.waitForTimeout(r === 'wait' || r === 'moment' ? 25 : 6);
      }
      const out = await pg.evaluate(() => { const S = GM.draft.state(); return S.final ? { total: S.final.total, t: S.final.t, mgr: S.manager, full: S.xi.every(x => x.p != null), wild: S.wildUsed, big: (S.bigSeen || []).length, ev: (S.evSeen || []).length, form: S.form.join('') } : null; });
      if (out && out.full) { res[j.k].push(out.total); (info[j.k] = info[j.k] || []).push(out); } else console.log('no result', j.k, j.seed, r, out && out.mgr);
      done++;
      if (done % 25 === 0) console.log(`${done} games, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await ctx.close();
  };
  await Promise.all(Array.from({ length: PAR }, worker));
  const rows = mgrs.map(k => {
    const v = res[k].slice().sort((a, b) => a - b), n = v.length, mean = v.reduce((a, x) => a + x, 0) / (n || 1);
    const sd = Math.sqrt(v.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, n - 1));
    const I = info[k] || [], av = f => (I.reduce((a, x) => a + x[f], 0) / (I.length || 1)).toFixed(1);
    return { k, n, mean, wild: av('wild'), big: av('big'), ev: av('ev'), median: v[n >> 1], p10: v[Math.floor(n * 0.1)], p90: v[Math.floor(n * 0.9)], sd, se: sd / Math.sqrt(n || 1) };
  });
  const avg = rows.reduce((a, r) => a + r.mean, 0) / rows.length;
  console.log(`\n${GAMES} games each, average of managers ${avg.toFixed(0)} points (page errors: ${errs})`);
  console.log('manager      games  mean  vs avg   median  p10   p90   sd   ±se  wilds  big  events');
  rows.sort((a, b) => b.mean - a.mean).forEach(r => console.log(
    `${r.k.padEnd(12)} ${String(r.n).padStart(4)} ${r.mean.toFixed(0).padStart(5)} ${((r.mean / avg - 1) * 100).toFixed(1).padStart(6)}% ${String(r.median).padStart(6)} ${String(r.p10).padStart(5)} ${String(r.p90).padStart(5)} ${r.sd.toFixed(0).padStart(4)} ${r.se.toFixed(0).padStart(4)}  ${r.wild.padStart(5)} ${r.big.padStart(4)} ${r.ev.padStart(5)}`));
  require('fs').writeFileSync('lay/managers.json', JSON.stringify({ games: GAMES, rows }, null, 1));
  await b.close();
})();

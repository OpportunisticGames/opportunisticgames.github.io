// 5.33: profiles, invites (Referral packs), the leaderboard podium, nation cards (No. 1s, sets, the Packed XI bonus),
// 🛂 Visa trouble!, the Hat-Trick fusion and the renewable rewards (Streak Freeze, Double XP, bonus tiers).   node new533.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { fast } = require('./helpers');
require('fs').mkdirSync('lay', { recursive: true });
const server = require('./mockserver')();
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
async function phone(b, name, key, errs, extra = '') {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await server.attach(ctx); await fast(ctx);
  await ctx.route(/transfermarkt|premierleague\.com|wikimedia|wikipedia/, r => r.abort());
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(U + extra); await pg.evaluate(([n, k]) => { localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1');
    if (n) { localStorage.setItem('gm:account', JSON.stringify({ name: n, key: k })); localStorage.setItem('gm:name', JSON.stringify(n)); } }, [name, key]);
  await pg.reload(); await pg.waitForTimeout(700);
  return pg;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const A = await phone(b, 'Alice', 'a'.repeat(28), errs);
  // 👤 a profile: Bob's best XI and manager come with his scores
  await A.evaluate(() => GM.lb.rpc('submit_score', { p_username: 'Bob', p_key: 'b'.repeat(28), p_mode: 'chaos', p_score: 900, p_meta: { t: 400, xi: ['Alan Shearer', 'Thierry Henry'], mgr: 'Jürgen Klopp' } }));
  await A.evaluate(() => GM.profile('Bob')); await A.waitForSelector('.prof-head', { timeout: 5000 }).catch(() => {});
  const prof = await A.evaluate(() => (document.querySelector('.prof') || {}).textContent || '');
  ok(/Bob/.test(prof) && /Alan Shearer/.test(prof) && /Jürgen Klopp/.test(prof) && /Add friend/.test(prof) && /Report name/.test(prof), 'a profile: best XI, favourite manager, Add friend and Report');
  await A.screenshot({ path: 'lay/new_profile.png' });
  await A.click('#prof-add'); await A.waitForTimeout(500);
  ok(await A.evaluate(() => GM.lb.rpc('online_friends', { p_user: 'Alice', p_key: 'a'.repeat(28) }).then(f => (f || []).some(x => x.name === 'Bob'))), 'Add friend from a profile');
  await A.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  // 🏆 the podium
  const pod = await A.evaluate(() => { const d = document.createElement('div'); d.innerHTML = GM.lbList([{ name: 'Bob', score: 9 }, { name: 'Alice', score: 8 }, { name: 'Cara', score: 7 }, { name: 'Dan', score: 6 }], { key: 'x' }); return { pods: d.querySelectorAll('.pod').length, rows: d.querySelectorAll('.lb-row').length, first: d.querySelector('.pod1 > b').textContent }; });
  ok(pod.pods === 3 && pod.rows === 1 && pod.first === 'Bob', `a podium for the top three, rows after (${JSON.stringify(pod)})`);
  // 🤝 an invite: a new player from Alice's link
  const N = await phone(b, '', '', errs, '?ref=Alice');
  ok(await N.evaluate(() => GM.store.get('refBy', null)) === 'Alice', 'the invite link is kept until a name is claimed');
  const packs0 = await N.evaluate(() => GM.packsWaiting());
  await N.evaluate(() => GM.claimName('Newbie')); await N.waitForTimeout(1200);
  ok(await N.evaluate(() => GM.packsWaiting()) === packs0 + 1, 'the new player gets a Referral pack');
  const ap0 = await A.evaluate(() => GM.packsWaiting());
  await A.evaluate(() => GM.feed.load(true)); await A.waitForTimeout(600);
  ok(await A.evaluate(() => GM.packsWaiting()) === ap0 + 1, 'and so does the inviter, once');
  await A.evaluate(() => GM.feed.load(true)); await A.waitForTimeout(400);
  ok(await A.evaluate(() => GM.packsWaiting()) === ap0 + 1, '(not twice)');
  // 🌍 nation cards
  const nat = await A.evaluate(() => { const no1 = GM.players.filter(p => GM.isNo1(p)); const sets = GM.nationSets(); const eng = GM.NATION_SETS.England;
    const d = document.createElement('div'); d.innerHTML = GM.cardHtml({ p: no1[0], t: GM.cardTier(no1[0]) }, { back: false });
    return { no1: no1.length, sets: sets.length, eng: eng.length, foil: !!d.querySelector('.pc-foil') }; });
  ok(nat.no1 > 30 && nat.sets > 20 && nat.eng === 5 && nat.foil, `a foil No. 1 per country and country sets (${JSON.stringify(nat)})`);
  const bonus = await A.evaluate(() => { GM.NATION_SETS.England.forEach(p => { for (let k = 0; k < 6; k++) GM.cardPackPiece(p); }); const px = GM.packedXI(); return { bonus: px.bonus, total: px.total, base: px.base, eng: (GM.store.get('cards').sets || []).includes('England') }; });
  ok(bonus.eng && bonus.bonus > 0 && bonus.total === bonus.base + bonus.bonus, `finishing England's set; the Packed XI's nation bonus (${JSON.stringify(bonus)})`);
  // 🧊 renewables
  const ren = await A.evaluate(() => {
    const d = n => { const t = new Date(); t.setDate(t.getDate() - n); return t.toISOString().slice(0, 10); };
    const log = {}; [2, 3, 4].forEach(n => { log[d(n)] = { daily: 400 }; }); GM.store.set('dlog', log);
    const before = GM.streak(); GM.grant({ freeze: 1 }, 't', true); GM.store.set('freezeChecked', ''); GM.freezeCheck();
    GM.grant({ boost: 1 }, 't', true); GM.useBoost(); const x0 = GM.xp(); GM.addXP(10);
    return { before, after: GM.streak(), freezes: GM.consum('freeze'), doubled: GM.xp() - x0 };
  });
  ok(ren.before === 0 && ren.after === 4 && ren.freezes === 0, `a Streak Freeze covers yesterday (${JSON.stringify(ren)})`);
  ok(ren.doubled === 20, 'Double XP doubles');
  const bon = await A.evaluate(() => { const c0 = GM.consum('freeze'); GM.seasonXP(7500 + 1000); return GM.seasonBonus().n; });
  ok(bon >= 1, 'after tier 30 the track keeps paying (bonus tiers)');
  // 🎩 the fused name
  const fz = await A.evaluate(() => GM.fusedName(['Alan Shearer', 'Andrew Cole', 'Robbie Fowler'].map(n => GM.players.findIndex(p => p.name === n))));
  ok(fz === 'Sheaoller', `Hat-Trick names fuse: Shearer + Cole + Fowler = ${fz}`);
  // 🛂 Visa trouble! sends a spin of his country's players
  await A.evaluate(() => { location.hash = '#/draft?m=chaos&s=goals&seed=visa533'; }); await A.waitForTimeout(1200);
  let vis = null;
  for (let k = 0; k < 300 && !vis; k++) {
    const st = await A.evaluate(() => { const cm = document.querySelector('.cm:not(.out)'); if (cm) { const mg = cm.querySelector('[data-mgr]'); if (mg) { mg.click(); return 'mgr'; } if (!cm.classList.contains('act')) cm.click(); return 'cm'; }
      const sp = document.getElementById('spin'); if (sp && !sp.disabled) return 'spin'; const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
      const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (rs.length) { (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick'; } return 'wait'; }).catch(() => 'err');
    if (st === 'spin') {
      const n = await A.evaluate(() => GM.draft.state().xi.filter(x => x.p != null).length);
      if (n >= 3) { await A.evaluate(() => { GM.draft.state().forceEv = 'visa'; }); await A.click('#spin').catch(() => {}); await A.waitForTimeout(2500);
        for (let j = 0; j < 30; j++) { const done = await A.evaluate(() => { const cm = document.querySelector('.cm:not(.out)'); if (cm && !cm.classList.contains('act')) cm.click(); return GM.draft.state().phase === 'pick' && GM.draft.state().special === 'passport'; }); if (done) break; await A.waitForTimeout(300); }
        vis = await A.evaluate(() => { const S = GM.draft.state(); return { special: S.special, nat: S.passNat, nats: S.reels.filter(x => x.id != null).map(x => GM.players[x.id].nat), story: (S.moments || []).map(m => m.name) }; });
      } else await A.click('#spin').catch(() => {});
    }
    await A.waitForTimeout(150);
  }
  ok(vis && vis.special === 'passport' && vis.nats.length && vis.nats.every(n => n === vis.nat) && vis.story.includes('Visa trouble!'), `Visa trouble! then a spin of one country (${JSON.stringify(vis)})`);
  ok(await A.evaluate(() => !GM.draft.WILDCARDS.passport || GM.draft.WILDCARDS.passport.deal === false), 'Passport Office is never dealt as a wildcard');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(process.exitCode || 0);
})();

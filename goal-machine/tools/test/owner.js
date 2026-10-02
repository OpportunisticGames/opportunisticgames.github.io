// 🕴️ Dodgy Owner: hiring a coach, the inbox (sponsor and dodgy choices), the squad, meddling (formation, picking a
// player, the coach minding), transfers (a bid, a counter, personal terms, the wage cap, an offer for your player, free
// agents, releasing, scouting on Hard), a live match (half-time talk, a sub), sim to the next decision, heat and
// investigations, the fans forcing you out, the end of the season and its board, and a balance check.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase/, r => r.abort());
  const fresh = async (extra = {}) => {
    await pg.goto(U);
    await pg.evaluate(x => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('firstXI', 1); set('sfx', false); set('club', 'Everton');
      Object.entries(x).forEach(([k, v]) => set(k, v)); }, extra);
    await pg.reload(); await pg.waitForTimeout(400);
  };
  const S = (k = 'owner') => pg.evaluate(k => GM.store.get('owner:save:' + k), k);
  const setS = (fn, k = 'owner') => pg.evaluate(([f, k]) => { const s = GM.store.get('owner:save:' + k); new Function('S', 'GM', f)(s, GM); GM.store.set('owner:save:' + k, s); }, [fn, k]);
  const toasts = () => pg.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '));
  const reopen = async () => { await pg.goto(U + '#/'); await pg.goto(U + '#/owner'); await pg.waitForTimeout(400); };
  // the three steps: who you are, the club (by its situation), the coach
  const begin = async (owner = 'local', sit = 'steady', coach = c => c !== 'yesman') => {
    await pg.click(`[data-owner="${owner}"]`); await pg.waitForTimeout(150);
    await pg.click(`[data-sit="${sit}"]`); await pg.waitForTimeout(150);
    await pg.evaluate(f => { const t = new Function('c', 'return (' + f + ')(c)'); const b = [...document.querySelectorAll('[data-coach]')].find(x => t(x.dataset.coach)) || document.querySelector('[data-coach]'); b.click(); }, coach.toString());
    await pg.waitForTimeout(400);
  };
  await fresh({ homeTab: 'market' });
  ok(!!(await pg.$('a.tile[href="#/owner"]')) && /NEW/.test(await pg.textContent('a.tile[href="#/owner"]')), 'Dodgy Owner is on the Market tab, tagged NEW');
  await pg.goto(U + '#/boss'); await pg.waitForTimeout(400);
  ok(/#\/owner/.test(await pg.evaluate(() => location.hash)), 'the old Club Boss link goes to Dodgy Owner');

  // the pitch and the first coach
  ok(/bought a football club/.test(await pg.textContent('#app')) && (await pg.$$('[data-owner]')).length === 5, 'it starts with the pitch and five kinds of owner, each with an ambition');
  await pg.click('[data-owner="local"]'); await pg.waitForTimeout(150);
  ok((await pg.$$('[data-club]')).length === 3 && (await pg.$$('[data-sit]')).length === 3, 'then three clubs to buy, each in a different situation');
  await pg.click('[data-sit="steady"]'); await pg.waitForTimeout(150);
  ok((await pg.$$('[data-coach]')).length === 3 && await pg.evaluate(() => Object.values(GM.owner.COACHES).some(c => c.name === 'Pep Cardigola') && Object.keys(GM.owner.COACHES).length === 10), 'then three head coaches (parodies: Pep Cardigola and friends, ten in all)');
  await pg.evaluate(() => { const b = [...document.querySelectorAll('[data-coach]')].find(x => x.dataset.coach !== 'yesman') || document.querySelector('[data-coach]'); b.click(); });
  await pg.waitForTimeout(400);
  let s = await S();
  ok(s.squad.length === 20 && s.teams.length === 20 && s.owner === 'local' && s.sit === 'steady' && s.fans === 85 && s.week === 0, `${s.club}: a squad of 20, a 20-club league, £${s.cash}m, and the fans love the Local Lad (85)`);
  ok(await pg.evaluate(() => GM.store.get('owner:save:owner').teams.slice(1).every(t => GM.owner.STYLES[t.style])), 'every rival club has a playing style');
  ok(/Answer your inbox/.test(await pg.textContent('#owgo')) && /Shirt sponsor/.test(await pg.textContent('.ow-mail')), 'pre-season: the sponsor choice has to be made first');
  await pg.click('#owgo'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => document.querySelector('[data-tab="home"]').classList.contains('on')), '…and the big button takes you to it');
  await pg.evaluate(() => [...document.querySelectorAll('[data-mail="0"]')].find(b => /MoonDoge/.test(b.textContent)).click()); await pg.waitForTimeout(300);
  s = await S();
  ok(s.sponsor.id === 'crypto' && s.heat === 25 && s.fans < 75, 'the dodgy crypto sponsor: more money, but heat, and the Local Lad’s fans hear about it');
  for (const t of ['squad', 'team', 'transfers', 'money', 'league']) { await pg.click(`[data-tab="${t}"]`); await pg.waitForTimeout(250); }
  ok(!errs.length, 'every tab draws');

  // the squad and the team
  await pg.click('[data-tab="squad"]'); await pg.waitForTimeout(200);
  ok((await pg.$$('.ow-pl')).length === 20 && (await pg.$$('.ow-pl.xi')).length === 11, 'the squad: 20 players, the XI highlighted');
  await pg.click('[data-pl="3"]'); await pg.waitForTimeout(200);
  await pg.click('[data-list]'); await pg.waitForTimeout(200);
  ok((await S()).squad[3].listed, 'you can transfer-list a player');
  await pg.click('[data-tab="team"]'); await pg.waitForTimeout(200);
  ok(!!(await pg.$('.cb-man[disabled]')), 'the coach picks the team by default');
  await pg.click('[data-meddle="1"]'); await pg.waitForTimeout(200);
  await pg.click('[data-form="4-3-3"]'); await pg.waitForTimeout(200);
  s = await S();
  ok(s.meddle && s.form === '4-3-3' && s.xi.filter(x => x.g === 'F').length === 3 && /isn’t happy|doesn’t mind/.test(await pg.textContent('.ow-body')), 'meddling: you pick the shape (4-3-3), and the coach lets you know how he feels');
  await pg.click('[data-slot="0"]'); await pg.waitForTimeout(200);
  const picked = await pg.evaluate(() => { const b = [...document.querySelectorAll('.modal-wrap [data-pick]')][1]; b.click(); return +b.dataset.pick; }); await pg.waitForTimeout(200);
  ok((await S()).xi[0].i === picked, 'you can choose who plays in each position');

  // transfers: a bid that's accepted, personal terms, signed
  await pg.click('[data-tab="transfers"]'); await pg.waitForTimeout(400);
  ok(/window’s open/.test(await pg.textContent('.ow-window')) && (await pg.$$('.cb-row')).length > 0, 'pre-season: the window’s open, the market opens on bargains you can afford');
  const target = await pg.evaluate(() => { const S = GM.store.get('owner:save:owner'), E = GM.owner; const p = GM.players.filter(p => !S.squad.some(x => x.k === p.pk) && E.askPrice(S, p) <= 15 && E.ovr(p) >= 64)[0]; return { k: p.pk, ask: E.askPrice(S, p), name: p.name }; });
  await pg.evaluate(k => { const S = GM.store.get('owner:save:owner'); S.shortlist = [k]; GM.store.set('owner:save:owner', S); }, target.k);
  await reopen(); await pg.click('[data-tab="transfers"]'); await pg.click('[data-mtab="short"]'); await pg.waitForTimeout(200);
  await pg.click(`[data-mk="${target.k}"]`); await pg.waitForTimeout(200);
  await pg.click('[data-bid]'); await pg.waitForTimeout(200);
  for (let i = 0; i < 4; i++) await pg.click('[data-up="owfee"]');   // a little over the asking price
  await pg.click('[data-go]'); await pg.waitForTimeout(300);
  ok(/personal terms/.test(await pg.textContent('.modal-wrap')), `${target.name}: the bid’s accepted, then personal terms`);
  await pg.click('.modal-wrap [data-go]'); await pg.waitForTimeout(300);
  s = await S();
  ok(s.squad.length === 21 && s.squad.some(x => x.k === target.k) && s.cash < 25.01 && /signs/.test(s.news.join()), `he signs (£${(25 - s.cash).toFixed(1)}m), and he’s in the squad`);
  // a low bid: rejected; a near one: countered
  const r = await pg.evaluate(() => { const S = GM.store.get('owner:save:owner'), E = GM.owner, p = GM.players.find(p => !S.squad.some(x => x.k === p.pk) && E.ovr(p) >= 80); const a = E.askPrice(S, p); return [E.bid(S, p.pk, a * 0.5).res, E.bid(S, p.pk, a * 0.9).res, E.bid(S, p.pk, a).res]; });
  ok(r.join() === 'reject,counter,accept', 'bids: way under is laughed off, close gets a counter-offer, the asking price is accepted');
  // the wage cap, and ignoring it
  await setS(`S.squad.forEach(x => { x.wage = 44; });`);
  const big = await pg.evaluate(() => { const S = GM.store.get('owner:save:owner'), E = GM.owner; return GM.players.find(p => !S.squad.some(x => x.k === p.pk) && E.ovr(p) >= 85).pk; });
  await reopen(); await pg.click('[data-tab="transfers"]'); await pg.click('[data-mtab="search"]');
  await pg.evaluate(() => GM.store.set('x', 1));
  await pg.evaluate(k => { const S = GM.store.get('owner:save:owner'); S.shortlist = [k]; S.cash = 200; GM.store.set('owner:save:owner', S); }, big);
  await reopen(); await pg.click('[data-tab="transfers"]'); await pg.click('[data-mtab="short"]'); await pg.click(`[data-mk="${big}"]`); await pg.click('[data-bid]');
  for (let i = 0; i < 60; i++) await pg.click('[data-up="owfee"]');
  await pg.click('[data-go]'); await pg.waitForTimeout(200);
  await pg.click('.modal-wrap [data-go]'); await pg.waitForTimeout(300);
  ok(/wage cap/.test(await pg.textContent('.modal-wrap')), 'a signing over the wage cap is blocked…');
  await pg.click('[data-dodgy]'); await pg.waitForTimeout(300);
  s = await S();
  ok(s.ignoredCap && s.heat >= 40 && s.squad.some(x => x.k === big), '…unless you ignore it (more heat)');
  // an offer for one of your players
  await setS(`S.offers = [{ k: S.squad[3].k, club: 'Arsenal', fee: 30, week: S.week }];`);
  await reopen(); await pg.click('[data-tab="transfers"]'); await pg.click('[data-mtab="offers"]'); await pg.waitForTimeout(200);
  const n0 = (await S()).squad.length, c0 = (await S()).cash;
  await pg.click('[data-offer="0"][data-act="yes"]'); await pg.waitForTimeout(300);
  s = await S();
  ok(s.squad.length === n0 - 1 && Math.abs(s.cash - c0 - 30) < 0.01, 'accepting a £30m offer sells him and banks the money');
  // free agents (any time, wages only)
  await pg.click('[data-mtab="free"]'); await pg.waitForTimeout(200);
  await pg.click('[data-mk]'); await pg.click('[data-sign]'); await pg.waitForTimeout(200); await pg.click('.modal-wrap [data-go]'); await pg.waitForTimeout(300);
  ok((await S()).squad.length === n0, 'a free agent signs for wages only');
  // release
  await pg.click('[data-tab="squad"]'); await pg.click('[data-pl="0"]'); await pg.click('[data-release]'); await pg.waitForTimeout(200);
  await pg.evaluate(() => [...document.querySelectorAll('.modal-wrap button')].find(b => /Release/.test(b.textContent)).click()); await pg.waitForTimeout(300);
  ok((await S()).squad.length === n0 - 1 && /released/.test((await S()).news.join()), 'releasing a player pays him off');

  // the season starts; a live match
  await setS(`S.inbox = []; S.heat = 10; S.ignoredCap = false; S.cash = 30;`);
  await reopen();
  await pg.click('#owgo'); await pg.waitForTimeout(300);
  await setS(`S.inbox = [];`); await reopen();  // (a random event may have arrived; tested elsewhere)
  ok((await S()).week === 1 && /Week 1/.test(await pg.textContent('#owgo')), 'kick off: week 1, and the first match is up');
  ok(!!(await pg.$('.ow-next .ow-style')) && !!(await pg.$('.ow-ambition')), 'the next match shows how they play (and what beats it), and your ambition');
  await pg.click('#owgo'); await pg.click('[data-live]'); await pg.waitForTimeout(500);
  ok(!!(await pg.$('.ow-board')) && !!(await pg.$('.ow-feed')), 'watching it live: a scoreboard, the clock, the commentary');
  for (let i = 0; i < 30 && !(await pg.evaluate(() => GM.store.get('owner:save:owner') && document.querySelectorAll('#owfeed .ow-ev.fresh').length)); i++) await pg.waitForTimeout(300);
  await pg.evaluate(() => { const f = document.querySelector('#owfeed .ow-ev.fresh'); if (f) f.dataset.mark = '1'; });
  await pg.waitForTimeout(1500);
  ok(await pg.evaluate(() => !!document.querySelector('#owfeed [data-mark]')), 'commentary lines stay where they are (no flashing redraws)');
  await pg.click('#owskip'); await pg.waitForTimeout(400);
  ok((await pg.$$('.modal-wrap .ow-subs .pos')).length >= 11, 'the subs show everyone’s position');
  ok(/Half-time/.test(await pg.textContent('.modal-wrap')) && (await pg.$$('[data-talk]')).length === 5, 'half-time: five team talks (the owner’s)');
  await pg.click('[data-talk="bonus"]'); await pg.waitForTimeout(200);
  await pg.waitForSelector('.modal-wrap [data-off="9"]'); await pg.click('.modal-wrap [data-off="9"]');
  await pg.waitForSelector('.modal-wrap [data-on]'); await pg.evaluate(() => document.querySelector('.modal-wrap [data-on]').click());
  const subbed = await pg.waitForFunction(() => /Subs left: 2/.test((document.querySelector('.modal-wrap') || {}).textContent || ''), null, { timeout: 4000 }).then(() => true, () => false);
  ok(subbed, 'a sub at half-time (two left)');
  await pg.click('[data-resume]'); await pg.waitForTimeout(300);
  await pg.click('#owskip'); await pg.waitForTimeout(1200);
  s = await S();
  ok(!s.live && s.results.length === 1 && s.results[0].rows.length >= 12 && !!(await pg.$('#owback')), `full time (${s.results[0].gf}–${s.results[0].ga}): ratings for everyone who played, including the sub`);
  // leaving mid-match carries it on
  await pg.click('#owback'); await pg.waitForTimeout(200);
  await pg.click('#owgo'); await pg.waitForTimeout(300);
  ok((await S()).week === 2, 'on to week 2');
  await setS(`S.inbox = [];`); await reopen();
  await pg.click('#owgo'); await pg.click('[data-live]'); await pg.waitForTimeout(800);
  await reopen();
  ok(!!(await pg.$('.ow-board')), 'leaving during a live match and coming back carries it on');
  await pg.click('#owskip'); await pg.waitForTimeout(300); await pg.click('[data-resume]'); await pg.click('#owskip'); await pg.waitForTimeout(900);
  await pg.click('#owback'); await pg.waitForTimeout(200);

  // sim to the next decision
  const w0 = (await S()).week;
  await setS(`S.inbox = [];`); await reopen();
  await pg.click('#owsim'); await pg.waitForTimeout(800);
  s = await S();
  ok(s.week > w0 && (s.inbox.some(m => m.need) || s.offers.length || s.week === 3 || s.week >= 19), `⏩ sims until something needs you (week ${w0} → ${s.week})`);
  ok(s.cashLog.length > 2 && await pg.evaluate(() => { const E = GM.owner, T = E.create('fit', 'normal', 'yesman', {}); T.week = 1; E.simMatch(T, E.fixture(T)); return T.squad.filter(x => x.fit < 90).length >= 8; }), 'a match tires the players who played; the money’s logged every week');

  // heat: an investigation
  await pg.evaluate(() => {
    const E = GM.owner, S = GM.store.get('owner:save:owner'); S.inbox = []; S.heat = 95; S.offers = [];  // (100 is a lifetime ban, tested below)
    let n = 0; while (S.heat >= 50 && n++ < 15) { E.endWeek(S); S.heat = Math.max(S.heat, 60); }
    GM.store.set('owner:save:owner', S);
  });
  s = await S();
  ok(/fine|DEDUCTION|embargo/.test(s.news.join()), 'high heat brings the league’s investigators (a fine, an embargo or a points deduction)');
  // the fans force you out
  await pg.evaluate(() => { const E = GM.owner, S = GM.store.get('owner:save:owner'); S.inbox = []; S.fans = 0.5; S.playedLeague = S.week; S.playedCup = S.week; S.fans = 0; E.endWeek(S); GM.store.set('owner:save:owner', S); });
  await reopen(); await pg.waitForTimeout(600);
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  ok(/Forced out/.test(await pg.textContent('.cb-verdict')), 'if the fans hit zero, they force you to sell: game over');

  // a whole season, start to end, through the engine (the coach picking), then the end screen
  await fresh();
  await pg.goto(U + '#/owner'); await pg.waitForTimeout(300); await begin('local', 'steady', () => true);
  await pg.evaluate(() => {
    const E = GM.owner, S = GM.store.get('owner:save:owner');
    let guard = 0;
    while (!S.over && guard++ < 60) {
      while (S.inbox.length) E.answer(S, S.inbox[0].id, 1 % E.choicesFor(S, S.inbox[0]).length);
      if (!S.coach) E.hire(S, 'yesman');
      const tie = E.cupTie(S); if (tie) E.simMatch(S, tie);
      const fx = E.fixture(S); if (fx) E.simMatch(S, fx);
      E.endWeek(S);
    }
    GM.store.set('owner:save:owner', S);
  });
  s = await S();
  ok(s.over === 'done' && s.teams.every(t => t.w + t.d + t.l === 38) && s.results.filter(r => r.comp === 'league').length === 38, 'a full season: everyone plays 38');
  ok(s.cup.ties.length >= 1 && s.cup.ties.length <= 5, `the cup: ${s.cup.won ? 'won it!' : `out in round ${s.cup.ties.length}`}`);
  await reopen(); await pg.waitForTimeout(800);  // the season ended while you were away: the score's recorded when you come back
  await pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  const fin = await pg.evaluate(() => ({ v: (document.querySelector('.cb-verdict b') || {}).textContent, best: GM.best('owner'), legacy: GM.owner.legacy(GM.store.get('owner:save:owner')), rows: document.querySelectorAll('.ow-legacy > div').length }));
  ok(!!fin.v && fin.best === fin.legacy.total && fin.rows >= 7, `the end: “${fin.v}”, and your score is your legacy (${fin.best}: ${fin.legacy.parts.map(p => p[1]).join(' + ')})`);
  ok(await pg.evaluate(() => !!GM.store.get('owner:finished')), 'finishing a season is remembered');

  // Hard: names and positions only, OVR ranges until you scout
  await fresh({ level: 'hard' });
  await pg.goto(U + '#/owner'); await pg.waitForTimeout(300);
  await begin('local', 'steady', c => c !== 'nerd');
  await pg.click('[data-tab="transfers"]'); await pg.waitForTimeout(300);
  ok(/Hard/.test(await pg.textContent('.topbar h2')) && await pg.$eval('.lb-btn', e => e.dataset.lb) === 'ownerh' && (await pg.$$('.cb-market .cb-ovr.q')).length > 0, 'Hard: its own board, and the market shows OVR ranges');
  await pg.click('.cb-row'); await pg.click('[data-scout]'); await pg.waitForTimeout(300);
  ok(!(await pg.$('.modal-wrap .cb-ovr.q')) && Object.keys((await S('ownerh')).scouted).length === 1, 'scouting a player (£0.2m) shows his exact OVR');

  // different owners play differently
  const own = await pg.evaluate(() => {
    const E = GM.owner, out = {};
    const p = E.create('own1', 'normal', 'yesman', { owner: 'petro', sit: 'steady' }); p.squad.forEach(x => { x.wage = 80; });
    out.petro = p.cash === 105 && E.capRoom(p, 200) && p.heat === 30;
    const st = E.create('own2', 'normal', 'yesman', { owner: 'stripper', sit: 'steady' }); out.skim = E.skim(st, 3) && st.skim === 3 && st.heat === 6 && st.cash === 22;
    const lo = E.create('own3', 'normal', 'yesman', { owner: 'local' }); out.noskim = !E.skim(lo, 1);
    const cr = E.create('own4', 'normal', 'yesman', { owner: 'crypto' }); const c0 = cr.cash; for (let i = 0; i < 8; i++) E.endWeek(cr); out.crypto = (cr.ledger.MoonDoge || 0) !== 0;
    const sits = ['crisis', 'steady', 'upstart'].map(sit => { const S = E.create('sit', 'normal', 'yesman', { owner: 'local', sit }); return [E.teamOvr(S), S.cash]; });
    out.sits = sits[0][0] > sits[1][0] && sits[1][0] > sits[2][0] && sits[0][1] < sits[1][1] && sits[1][1] < sits[2][1];
    const b = E.create('own5', 'normal', 'yesman', {}); b.inbox = []; b.cash = -31; E.endWeek(b); out.bust = b.over === 'bankrupt';
    const x = E.create('own6', 'normal', 'yesman', {}); x.inbox = []; x.heat = 100; x.cash = 50; let n = 0; while (!x.over && n++ < 3) { x.heat = 100; E.endWeek(x); } out.banned = x.over === 'expelled';
    return out;
  });
  ok(own.petro, 'the Petro-Prince: £80m more, no wage cap, but the league’s already watching (heat 30)');
  ok(own.skim && own.noskim, 'the Asset Stripper can skim money for himself (a little heat each time); nobody else can');
  ok(own.crypto, 'the Crypto Bro’s cash swings with MoonDoge');
  ok(own.sits, 'clubs in crisis have better squads and less money; plucky newcomers the opposite');
  ok(own.bust && own.banned, 'more ways to fail: going bust (administration) and being banned by the league');
  // the owner's bug reports (2026-10-02)
  const fixes = await pg.evaluate(() => {
    const E = GM.owner, out = {};
    GM.store.set('club', 'Everton');
    const offers = Array.from({ length: 30 }, (_, i) => E.clubOffers('cl' + i).some(c => c.club === 'Everton')).filter(Boolean).length;
    out.fav = offers > 0 && offers < 30;  // your club turns up sometimes, not every time
    const S = E.create('fx1', 'normal', 'yesman', {});
    const same = GM.players.filter(p => E.ovr(p) === 75).slice(0, 12).map(p => E.demand(S, p));
    out.wages = new Set(same).size >= 6;  // the same OVR doesn't mean the same wage
    S.week = 1; const i = 3, k = S.squad[i].k; E.sell(S, i, 10, 'Arsenal');
    out.noBuyBack = E.bid(S, k, 99).res === 'gone' && typeof E.sign(S, k, 1, 50) === 'string';
    out.paid = S.squad.every(x => x.paid > 0 && x.came);
    // development: a hot run lifts his OVR (and it shows up in the team's), values are tracked weekly
    const T = E.create('fx2', 'normal', 'yesman', {}); T.inbox = []; const x = T.squad[2], base = E.ovrNow(T, x);
    x.rt = [8.2, 8.0, 7.9, 8.4]; T.week = 4; E.endWeek(T);
    out.dev = E.ovrNow(T, x) === base + 1 && x.vh.length >= 2;
    return out;
  });
  ok(await pg.evaluate(() => { const E = GM.owner, S = E.create('cs', 'normal', 'yesman', {}); S.week = 1; const M = E.startMatch(S, E.fixture(S)); S.squad.forEach(x => { x.fit = 60; }); E.stepMatch(S, M, 62); E.coachSubs(S, M); return M.subs < 3 && M.ev.some(e => e.k === 'sub'); }), 'the coach makes subs when legs are tired');
  ok(fixes.fav, 'your favourite club is one of the three on offer sometimes, not every time');
  ok(fixes.wages, 'players with the same OVR want different wages (fame and their agent)');
  ok(fixes.noBuyBack, 'sell a player and you can’t buy him straight back');
  ok(fixes.paid, 'every player shows what he cost (the starting squad: what he was worth when you bought the club)');
  ok(fixes.dev, 'a good run of form lifts a player’s OVR, and his value is tracked every week');
  // sacking a coach unlocks a secret game
  await fresh({ homeTab: 'quick' });
  ok(/Sack a head coach/.test(await pg.textContent('.secret-tiles')), 'Reign Check starts locked: “Sack a head coach in Dodgy Owner”');
  await pg.goto(U + '#/owner'); await pg.waitForTimeout(300); await begin();
  await pg.click('[data-tab="team"]'); await pg.click('#owsack'); await pg.waitForTimeout(200);
  await pg.evaluate(() => [...document.querySelectorAll('.modal-wrap button')].find(b => /Sack/.test(b.textContent)).click()); await pg.waitForTimeout(200);
  await pg.evaluate(() => document.querySelector('.modal-wrap [data-coach]').click()); await pg.waitForTimeout(300);
  await pg.goto(U + '#/'); await pg.waitForTimeout(600);
  ok(/Secret game unlocked/.test(await pg.textContent('.modal-wrap')) && /Reign Check/.test(await pg.textContent('.modal-wrap')), 'sacking one unlocks it, with a celebration on Home');
  // balance: a coach who does nothing v an owner who buys upgrades (Normal)
  const sim = await pg.evaluate(() => {
    const E = GM.owner, run = (seed, active) => {
      const S = E.create(seed, 'normal', 'yesman');
      while (!S.over) {
        while (S.inbox.length) E.answer(S, S.inbox[0].id, S.inbox[0].id === 'sponsor' ? 0 : E.choicesFor(S, S.inbox[0]).length - 1);
        if (!S.coach) E.hire(S, 'yesman');
        S.offers = [];
        if (active && E.windowOpen(S) && S.week > 0) for (let t = 0; t < 3; t++) {
          const xi = E.readyXI(S), worst = xi.filter(s => s.i != null).sort((a, b) => E.ovr(GM.anyByPk(S.squad[a.i].k)) - E.ovr(GM.anyByPk(S.squad[b.i].k)))[0];
          const cur = E.ovr(GM.anyByPk(S.squad[worst.i].k)), old = S.squad[worst.i];
          const c = GM.players.filter(p => p.pos === worst.g && E.ovr(p) >= cur + 4 && !S.squad.some(x => x.k === p.pk)).map(p => ({ p, ask: E.askPrice(S, p), w: E.demand(S, p) }))
            .filter(c => c.ask <= S.cash + old.value * 0.8 && E.capRoom(S, c.w - old.wage)).sort((a, b) => (E.ovr(b.p) - b.ask / 3) - (E.ovr(a.p) - a.ask / 3))[0];
          if (!c) break;
          if (E.sell(S, worst.i, Math.round(old.value * 8) / 10, 'X')) E.sign(S, c.p.pk, c.ask, c.w);
        }
        const tie = E.cupTie(S); if (tie) E.simMatch(S, tie);
        const fx = E.fixture(S); if (fx) E.simMatch(S, fx);
        E.endWeek(S);
      }
      return E.position(S);
    };
    const avg = a => { let t = 0; for (let i = 0; i < 12; i++) t += run('bal' + i, a); return Math.round(t / 1.2) / 10; };
    return { passive: avg(false), active: avg(true) };
  });
  ok(sim.passive >= 10 && sim.active <= sim.passive - 1, `balance: a do-nothing owner finishes ~${sim.passive}th, one who buys upgrades ~${sim.active}th`);
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();

// Every badge can be earned: for each of the 100 a game (or a moment) that should earn it is played through the same
// calls the games make (GM.collectDraft, GM.checkGame, GM.checkOnline), and the badge must unlock. A new badge without
// a trigger here fails the test, so nothing can be added that's impossible to earn.   node allbadges.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase|fonts/, r => r.abort());
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('gm:seenVersion', '999'); localStorage.setItem('gm:welcomed', '1'); localStorage.setItem('gm:sfx', 'false'); });
  await pg.reload(); await pg.waitForTimeout(800);
  const res = await pg.evaluate(async () => {
    GM.toast = () => {}; GM.givePack = () => {};
    await GM.loadAll();  // (one-season players only exist among the 5,000+: Extreme / Purist drafts)
    const P = GM.players, by = f => P.filter(f);
    const pad = (xi, n = 11) => xi.concat(by(p => !xi.includes(p)).slice(0, Math.max(0, n - xi.length)));
    const fill = (xi, f) => xi.concat(by(p => !xi.includes(p) && f(p)).slice(0, 11 - xi.length));  // (the rest must fit the rule too)
    const clubOf = c => by(p => p.clubs.includes(c));
    const day = k => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const album = f => { const a = GM.store.get('album', null) || { players: {}, ach: {}, days: [], by: { goals: {}, assists: {}, apps: {} } }; f(a); GM.store.set('album', a); };
    const draft = ev => GM.collectDraft({ mode: 'classic', stat: 'goals', total: 100, points: 0, hard: false, xi: pad([]), rating: 60, pairs: 0, wildUsed: 0, coinWin: false,
      bull: false, closeness: null, treble: false, slots: [], manager: null, extreme: false, moments: [], rars: [], bigs: 0, clubs: null, fx: null, nat: null, liked: 0, ...ev });
    const game = (m, s, x) => GM.checkGame(m, s, x || {});
    let room = 0;
    const online = (o = {}) => GM.checkOnline({ code: 'R' + (++room), kind: 'duel', host: 'Me', guest: o.opp || 'Bob', result: { winner: o.won === false ? 'guest' : 'host' }, ...o }, 'host');
    const chaosX = ev => draft({ mode: 'chaos', ...ev });
    // finish cards until the Packed XI has all eleven (pack pieces on the players in each position)
    const packXI = () => { for (const p of P) { if (GM.packedXI().n === 11) break; for (let k = 0; k < 6; k++) { const x = GM.cardPackPiece(p); if (x.finished || x.spare) break; } } };
    const fin = t => { const p = by(q => GM.cardTier(q) === t)[0]; for (let k = 0; k < 6; k++) { if (GM.cardPackPiece(p).finished) break; } };
    const T = {
      first: () => draft({}),
      ult300: () => draft({ mode: 'ultimate', total: 300 }), ult400: () => draft({ mode: 'ultimate', total: 400 }), ult500: () => draft({ mode: 'ultimate', total: 500 }),
      ast250: () => draft({ mode: 'ultimate', stat: 'assists', total: 250 }), apps4000: () => draft({ mode: 'ultimate', stat: 'apps', total: 4000 }),
      bull: () => draft({ mode: 'target', bull: true }), treble: () => draft({ mode: 'treble', treble: true }), close: () => draft({ mode: 'target', closeness: 5 }),
      contenders: () => draft({ rating: 80 }), invincible: () => draft({ rating: 88 }), relegated: () => draft({ rating: 50 }), chem5: () => draft({ pairs: 5 }),
      hof3: () => draft({ xi: pad(by(p => p.hon.H).slice(0, 3)) }), wc2: () => draft({ xi: pad(by(p => p.hon.W).slice(0, 2)) }),
      club5: () => draft({ xi: pad(clubOf('Arsenal').slice(0, 5)) }), wild5: () => draft({ wildUsed: 5 }), coin: () => draft({ coinWin: true }),
      chaos: () => chaosX({ points: 500 }),
      fan6: () => { GM.store.set('club', 'Arsenal'); draft({ xi: pad(clubOf('Arsenal').slice(0, 6)) }); },
      lifers: () => draft({ xi: fill([], p => GM.plSeasons(p) >= 10) }),
      cx1000: () => chaosX({ points: 1000 }), cxsack: () => chaosX({ moments: ['Manager sacked!'] }), cxleg: () => chaosX({ rars: ['l'] }), cxmeter: () => chaosX({ bigs: 3 }), cxgaffer: () => chaosX({ liked: 6 }),
      daily3: () => { album(a => { a.days = [day(1), day(2)]; }); draft({ mode: 'daily' }); },
      daily7: () => { album(a => { a.days = [1, 2, 3, 4, 5, 6].map(day); }); draft({ mode: 'daily' }); },
      daily14: () => { album(a => { a.days = Array.from({ length: 13 }, (_, k) => day(k + 1)); }); draft({ mode: 'daily' }); },
      daily30: () => { album(a => { a.days = Array.from({ length: 29 }, (_, k) => day(k + 1)); }); draft({ mode: 'daily' }); },
      hop10: () => game('hopper', 10), hop20: () => game('hopperx', 20), hilo10: () => game('hiloh', 10), hilo25: () => game('hilo', 25),
      who3000: () => game('whoamix', 3000), grid: () => game('grid', 1, { full: true }), tally700: () => game('tally', 700),
      htwin: () => game('hattrick', 1, { won: true }), htnil: () => game('hattrickh', 1, { nil: true }),
      col100: () => { album(a => { P.slice(0, 100).forEach(p => { a.players[p.pk] = '2026-01-01'; }); }); draft({}); },
      col500: () => { album(a => { P.slice(0, 500).forEach(p => { a.players[p.pk] = '2026-01-01'; }); }); draft({}); },
      col1000: () => { album(a => { P.slice(0, 1000).forEach(p => { a.players[p.pk] = '2026-01-01'; }); }); draft({}); },
      hofall: () => { album(a => { P.forEach(p => { a.players[p.pk] = '2026-01-01'; }); }); draft({}); },
      gball: () => { album(a => { P.forEach(p => { a.players[p.pk] = '2026-01-01'; }); }); draft({}); },
      on1: () => online({ won: false }), onwin: () => online(),
      onwin10: () => { album(a => { a.online = { rooms: [], wins: 9, beat: [], kinds: [] }; }); online(); },
      onbeat5: () => { album(a => { a.online = { rooms: [], wins: 4, beat: ['A', 'B', 'C', 'D'], kinds: [] }; }); online({ opp: 'E' }); },
      onall: () => { online({ kind: 'duel' }); online({ kind: 'race' }); online({ kind: 'auction' }); },
      onchaos: () => online({ kind: 'race', variant: 'chaos' }),
      onwin25: () => { album(a => { a.online = { rooms: [], wins: 24, beat: [], kinds: [] }; }); online(); },
      s442: () => draft({ total: 442 }), saguero: () => draft({ xi: pad(by(p => p.name === 'Sergio Agüero')) }), sbus: () => draft({ total: 30 }),
      sloyal: () => draft({ xi: pad(clubOf('Manchester United').slice(0, 8)) }),
      sowl: () => { const h = Date.prototype.getHours; Date.prototype.getHours = () => 2; try { draft({}); } finally { Date.prototype.getHours = h; } },
      sonce: () => draft({ mode: 'extreme', extreme: true, xi: pad(GM.allPlayers.filter(p => GM.plSeasons(p) === 1).slice(0, 3)) }),
      cxslip: () => chaosX({ slots: [{ name: 'Steven Gerrard', g: 0 }] }),
      cxdilly: () => chaosX({ manager: 'ranieri', xi: pad(clubOf('Leicester City').slice(0, 3)) }),
      cxfergie: () => chaosX({ manager: 'fergie', xi: pad(clubOf('Manchester United').slice(0, 5)) }),
      cxaliens: () => chaosX({ moments: ['Alien abduction'] }), cxpigeon: () => chaosX({ moments: ['Pitch invader'] }),
      mdfirst: () => draft({ mode: 'match', fx: 'f1' }),
      mdboth: () => { const both = by(p => p.clubs.includes('Chelsea') && p.clubs.includes('Arsenal')).slice(0, 3); draft({ mode: 'match', fx: 'f2', clubs: ['Chelsea', 'Arsenal'], xi: pad(both) }); },
      md150: () => draft({ mode: 'match', fx: 'f3', total: 150 }),
      mdseason: () => { album(a => { a.md = ['a', 'b', 'c', 'd']; }); draft({ mode: 'match', fx: 'e' }); },
      mdpundit: () => game('mfootle', 3), mdderby: () => draft({ mode: 'match', fx: 'f4', clubs: ['Arsenal', 'Tottenham Hotspur'] }),
      ibfirst: () => draft({ mode: 'nation', nat: 'France' }), ib250: () => draft({ mode: 'nation', nat: 'France', total: 250 }),
      ibtour: () => { album(a => { a.nations = ['Spain', 'Italy', 'Brazil', 'Germany']; }); draft({ mode: 'nation', nat: 'Portugal' }); },
      ibhome: () => { album(a => { a.nations = ['England', 'Scotland', 'Wales']; }); draft({ mode: 'nation', nat: 'Northern Ireland' }); },
      mbprofit: () => game('money', 150), mbflip: () => game('money', 50, { flip: 2 }), mbmadrid: () => game('money', 50, { bid: true }),
      mbchamp: () => game('owner', 100, { pos: 1 }), mbinvincible: () => game('ownerh', 100, { unbeaten: true }), mbcup: () => game('ownerx', 100, { cup: true }),
      mbheat: () => game('owner', 10, { heat: 85, pos: 12 }), mbclean: () => game('owner', 10, { heat: 0, pos: 6 }), mbout: () => game('owner', 0, { sacked: true }),
      mbdream: () => game('owner', 10, { amb: true }),
      mbroyal: () => game('royale', 1, { res: 'win' }), mbarena: () => game('royale', 1, { arena: 3 }),
      mbreign: () => game('reign', 1, { weeks: 38 }), mbstatue: () => game('reign', 1, { end: 'f100' }),
      colpack: () => game('pack', 1), colwalk: () => game('pack', 2, { legend: true }),
      colgold: () => { fin('g'); game('pack', 3); }, collegend: () => { fin('l'); game('pack', 4); }, colxi: () => { packXI(); game('pack', 5); },
      g25: () => { GM.store.set('played', 25); game('hilo', 1); }, g100: () => { GM.store.set('played', 100); game('hilo', 1); }, g500: () => { GM.store.set('played', 500); game('hilo', 1); },
      lv10: () => { GM.store.set('xp', 5000); game('hilo', 1); }, lv30: () => { GM.store.set('xp', 30000); game('hilo', 1); }, lv50: () => { GM.store.set('xp', 1e7); game('hilo', 1); },
      daily100: () => { const d = {}; for (let k = 0; k < 100; k++) d[day(k)] = { daily: 1 }; GM.store.set('dlog', d); game('hilo', 1); },
      pk50: () => game('pack', 50),
      extreme: () => draft({ mode: 'extreme', extreme: true }),
    };
    const ids = GM.badgeIds(), out = { missing: ids.filter(i => !T[i]), extra: Object.keys(T).filter(i => !ids.includes(i)), failed: [], errors: [] };
    for (const id of ids) {
      if (!T[id]) continue;
      album(a => { a.ach = {}; });  // each one on its own
      try { T[id](); } catch (e) { out.errors.push(id + ': ' + e.message); }
      if (!(GM.store.get('album').ach || {})[id]) out.failed.push(id);
    }
    out.n = ids.length;
    return out;
  });
  ok(res.n === 100, `${res.n} badges`);
  ok(!res.missing.length, 'every badge has a way to earn it here' + (res.missing.length ? ': missing ' + res.missing.join(', ') : ''));
  ok(!res.extra.length, 'no triggers for badges that no longer exist' + (res.extra.length ? ': ' + res.extra.join(', ') : ''));
  ok(!res.errors.length, 'no trigger threw' + (res.errors.length ? ': ' + res.errors.join(' | ') : ''));
  ok(!res.failed.length, `every badge unlocks when it should (${res.n - res.failed.length - res.missing.length}/${res.n})` + (res.failed.length ? ': failed ' + res.failed.join(', ') : ''));
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

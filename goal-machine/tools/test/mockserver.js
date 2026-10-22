// A stand-in for the Supabase online_* functions (same rules as the SQL), shared by every test phone
module.exports = function makeServer() {
  const players = { alice: { username: 'Alice', key: 'a'.repeat(28) }, bob: { username: 'Bob', key: 'b'.repeat(28) }, cara: { username: 'Cara', key: 'c'.repeat(28) } };
  const scores = [], activity = [], referrals = []; let actN = 0;
  const rooms = {}, friends = new Set(), backups = {}, pics = {}, reports = [], nameReports = new Set(), hiddenNames = new Set(); let n = 0;
  const now = () => Date.now() / 1000;
  const auth = (u, k) => { const p = players[(u || '').toLowerCase()]; return p && p.key === k ? p.username : null; };
  const befriend = (a, b) => { friends.add(a + '|' + b); friends.add(b + '|' + a); };
  // (as the server's gm_finalise, 5.38: the bigger total wins; rating then time break a tie; `by` = who finished it)
  const finalise = (r, by) => {
    const h = r.race.host, g = r.race.guest;
    if (r.status === 'done' || !(h && h.done) || !(g && g.done)) return;
    const pick = (a, b, low) => (low ? a < b : a > b) ? 'host' : (low ? b < a : b > a) ? 'guest' : 'draw';
    let w;
    if (r.variant === 'hattrick') w = pick(h.t || 0, g.t || 0);
    else if (r.kind === 'race' && r.variant === 'target') w = pick(h.d ?? 1e9, g.d ?? 1e9, true);
    else if (r.kind === 'race' && (r.variant === 'chaos' || r.variant === 'szchaos')) w = pick(h.c || 0, g.c || 0);
    else { w = pick(h.t || 0, g.t || 0); if (w === 'draw') w = pick(h.r || 0, g.r || 0); if (w === 'draw' && r.kind === 'race') w = pick(h.ms ?? 1e12, g.ms ?? 1e12, true); }
    r.status = 'done'; r.turn = null; r.result = { host: w === 'host' ? 100 : w === 'draw' ? 50 : 0, guest: w === 'guest' ? 100 : w === 'draw' ? 50 : 0, winner: w, ...(by ? { by } : {}) };
  };
  const view = (r, me) => ({ reacts: r.reacts || {}, level: r.level || null, quick: !!r.quick, created: r.created, bids_in: Object.keys(r.secret || {}).filter(k => k === 'host' || k === 'guest'), code: r.code, kind: r.kind, variant: r.variant, stat: r.stat, seed: r.seed, host: r.host, guest: r.guest, moves: r.moves, race: hideXI(r, me), turn: r.turn, status: r.status, result: r.result, seen: r.seen, now: now(), updated: r.updated });
  const hideXI = (r, me) => { const s = r.host === me ? 'host' : r.guest === me ? 'guest' : null, o = s === 'host' ? 'guest' : 'host'; if (!s || r.kind !== 'race' || r.status === 'done' || (r.race[s] || {}).done || !r.race[o]) return r.race; const { x, ...rest } = r.race[o]; return { ...r.race, [o]: rest }; };
  // friend challenges (challenge_* in SQL)
  const chs = {}, plays = [], invites = [], flairs = {}; let pid = 0;
  const chName = (a) => auth(a.p_user, a.p_key) || (a.p_name && a.p_name.trim()) || 'A friend';
  const chUser = (a) => auth(a.p_user, a.p_key) || null;
  const tok = () => Math.random().toString(36).slice(2);
  const chView = c => c && ({ ...c, now: new Date().toISOString(), plays: plays.filter(p => p.code === c.code).map(({ token, ...p }) => p).sort((a, b) => (b.owner - a.owner) || a.id - b.id),
    chain: (() => { const out = []; let x = c; for (let i = 0; x && i < 20; i++) { out.unshift(x.code); x = chs[x.parent]; } return out; })() });
  const fns = {
    challenge_create(a) {
      const code = 'C' + String(Object.keys(chs).length + 1).padStart(5, '0'), u = chUser(a);
      let to = null; const par = chs[a.p_parent];
      if (par) to = par.owner_user !== u ? par.owner_user : (plays.filter(p => p.code === par.code && !p.owner && p.username && p.username !== u).pop() || {}).username || null;
      chs[code] = { code, mode: a.p_mode, stat: a.p_stat, seed: a.p_seed, hard: !!a.p_hard, extreme: !!a.p_extreme, club: a.p_club, nat: a.p_nat, owner: chName(a), owner_user: u, parent: par ? par.code : null, to_user: to, created: new Date().toISOString() };
      const p = { id: ++pid, code, name: chName(a), username: u, owner: true, status: 'done', score: a.p_score, total: a.p_total, game: a.p_game || {}, token: tok(), reaction: null, owner_reaction: null, finished: new Date().toISOString(), updated: new Date().toISOString() };
      plays.push(p); return { code, play: p.id, token: p.token };
    },
    challenge_get: a => chView(chs[(a.p_code || '').toUpperCase()]) || null,
    challenge_start(a) {
      const c = chs[(a.p_code || '').toUpperCase()]; if (!c) return { error: 'no_challenge' };
      const u = chUser(a);
      if (u) { const p = plays.filter(x => x.code === c.code && x.username === u).sort((x, y) => x.owner - y.owner)[0]; if (p && (p.owner || p.status === 'done')) return { error: p.owner ? 'own' : 'played', play: p.id }; if (p) return { play: p.id, token: p.token }; }
      const p = { id: ++pid, code: c.code, name: chName(a), username: u, owner: false, status: 'playing', score: null, total: null, game: {}, token: tok(), reaction: null, owner_reaction: null, started: new Date().toISOString(), updated: new Date().toISOString() };
      plays.push(p); return { play: p.id, token: p.token };
    },
    challenge_progress(a) {
      const p = plays.find(x => x.id === a.p_play && x.token === a.p_token); if (!p) return 'no_play'; if (p.status === 'done') return 'done';
      Object.assign(p, { score: a.p_score, total: a.p_total, game: a.p_game || p.game, updated: new Date().toISOString() + Math.random(), status: a.p_done ? 'done' : 'playing', finished: a.p_done ? new Date().toISOString() : null }); return 'ok';
    },
    challenge_react(a) {
      const p = plays.find(x => x.id === a.p_play); if (!p) return 'no_play';
      if (p.token === a.p_token && !p.owner) { p.reaction = a.p_reaction; return 'ok'; }
      if (plays.find(x => x.code === p.code && x.owner && x.token === a.p_token)) { p.owner_reaction = a.p_reaction; return 'ok'; }
      return 'no_play';
    },
    set_flair(a) { const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; flairs[u.toLowerCase()] = { name: u, f: a.p_frame || undefined, t: a.p_title || undefined }; return 'ok'; },
    get_flair(a) { const out = {}; (a.p_names || []).forEach(n => { const f = flairs[n.toLowerCase()]; if (f) out[f.name] = { f: f.f, t: f.t }; }); return out; },
    challenge_send(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return { error: 'auth' };
      const c = chs[(a.p_code || '').toUpperCase()]; if (!c || c.owner_user !== u) return { error: 'not_yours' };
      let sent = 0;
      (a.p_to || []).slice(0, 10).forEach(n => { const f = [...friends].find(x => x.toLowerCase() === (u + '|' + n).toLowerCase()); if (f && !invites.some(i => i.code === c.code && i.to === f.split('|')[1])) { invites.push({ code: c.code, to: f.split('|')[1], at: new Date().toISOString() }); sent++; } });
      return { sent };
    },
    challenge_mine(a) {
      const me = auth(a.p_user, a.p_key); if (!me) return [];
      const out = [];
      Object.values(chs).forEach(c => {
        const o = plays.find(p => p.code === c.code && p.owner), base = { code: c.code, mode: c.mode, stat: c.stat, hard: c.hard, extreme: c.extreme, club: c.club, nat: c.nat };
        const ts = plays.filter(t => t.code === c.code && !t.owner && t.score != null);
        if (o.username === me) {
          if (!ts.length) out.push({ ...base, sent: true, opp: null, pid: null, status: 'waiting', mine: o.score, theirs: null, at: c.created, sent_to: invites.filter(i => i.code === c.code).map(i => i.to) });
          ts.forEach(t => out.push({ ...base, sent: true, opp: t.username || t.name, pid: t.id, status: t.status, mine: o.score, theirs: t.score, at: t.finished || t.started }));
        }
        const inv = invites.find(i => i.code === c.code && i.to === me);
        if ((inv || c.to_user === me) && !plays.some(p => p.code === c.code && p.username === me)) out.push({ ...base, sent: false, opp: c.owner, pid: null, status: 'invited', mine: null, theirs: o.score, at: inv ? inv.at : c.created });
        plays.filter(t => t.code === c.code && !t.owner && t.username === me && o.username !== me).forEach(t => out.push({ ...base, sent: false, opp: o.name, pid: t.id, status: t.status, mine: t.score, theirs: o.score, at: t.finished || t.started }));
      });
      return out.reverse();
    },
    challenge_history(a) {
      const me = auth(a.p_user, a.p_key); if (!me) return [];
      const out = [];
      Object.values(chs).forEach(c => {
        const o = plays.find(p => p.code === c.code && p.owner);
        plays.filter(t => t.code === c.code && !t.owner && t.status === 'done' && t.username).forEach(t => {
          if (o.username === me && t.username !== me) out.push({ code: c.code, mode: c.mode, stat: c.stat, parent: c.parent, at: t.finished, opp: t.username, mine: o.score, theirs: t.score, my_hist: o.game.prog, their_hist: t.game.prog });
          else if (t.username === me && o.username && o.username !== me) out.push({ code: c.code, mode: c.mode, stat: c.stat, parent: c.parent, at: t.finished, opp: o.username, mine: t.score, theirs: o.score, my_hist: t.game.prog, their_hist: o.game.prog });
        });
      });
      return out.reverse();
    },
    claim_name: a => { const k = a.p_username.toLowerCase(); if (!players[k] && /fuck|shit/i.test(k)) return 'rude_name'; if (players[k] && players[k].key !== a.p_key) return 'taken'; players[k] = { username: a.p_username, key: a.p_key }; return 'ok'; }, name_available: a => /fuck|shit/i.test(a.p_username) ? null : !players[a.p_username.toLowerCase()], submit_score: a => 'ok',
    quick_match(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return { error: 'auth' };
      const v = a.p_variant || null, open = Object.values(rooms).find(r => r.quick && r.status === 'open' && !r.guest && r.kind === a.p_kind && (r.variant || null) === v && r.stat === a.p_stat && r.host !== u);
      if (open) { open.guest = u; open.status = 'playing'; return { code: open.code, seat: 'guest', matched: true, opp: open.host }; }
      const mine = Object.values(rooms).find(r => r.quick && r.status === 'open' && r.host === u && r.kind === a.p_kind && (r.variant || null) === v);
      if (mine) return { code: mine.code, seat: 'host', waiting: true };
      const c = fns.online_create({ ...a, p_opp: null }); rooms[c.code].quick = true; rooms[c.code].level = 'hard'; rooms[c.code].created = new Date().toISOString(); return { code: c.code, seat: 'host', waiting: true };
    },
    online_create(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return { error: 'auth' };
      let o = null; if (a.p_opp) { o = (players[a.p_opp.toLowerCase()] || {}).username; if (!o) return { error: 'no_user' }; if (o === u) return { error: 'self' }; }
      const code = 'R' + String(++n).padStart(4, '0');
      rooms[code] = { code, kind: a.p_kind, secret: {}, variant: a.p_variant || null, stat: a.p_stat, seed: 'online:' + code + ':t', host: u, guest: o, moves: [], race: {}, turn: a.p_kind === 'duel' ? 'guest' : a.p_kind === 'auction' ? 'both' : 'host', status: o ? 'playing' : 'open', result: null, seen: {}, level: a.p_level && a.p_level !== 'normal' ? a.p_level : null, updated: new Date().toISOString() };
      if (o) befriend(u, o); return { code, seat: 'host' };
    },
    online_join(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return { error: 'auth' }; const r = rooms[a.p_code]; if (!r) return { error: 'no_room' };
      if (r.host === u) return { code: r.code, seat: 'host' }; if (r.guest === u) return { code: r.code, seat: 'guest' };
      if (r.guest) return { error: 'full' }; r.guest = u; r.status = 'playing'; befriend(u, r.host); return { code: r.code, seat: 'guest' };
    },
    online_react(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; const r = rooms[a.p_code]; if (!r) return 'no_room';
      const st = r.host === u ? 'host' : r.guest === u ? 'guest' : null; if (!st) return 'not_yours'; if (r.status !== 'done') return 'not_done';
      r.reacts = { ...(r.reacts || {}), [st]: a.p_emoji }; return 'ok';
    },
    online_get(a) { const r = rooms[a.p_code]; if (!r) return null; const s = r.host === a.p_user ? 'host' : r.guest === a.p_user ? 'guest' : null; if (s) r.seen[s] = now(); return view(r, a.p_user); },
    online_move(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; const r = rooms[a.p_code]; if (!r) return 'no_room';
      const s = r.host === u ? 'host' : r.guest === u ? 'guest' : null; if (!s) return 'not_yours'; if (['done', 'declined'].includes(r.status)) return 'over';
      if (a.p_move) { if (r.moves.length !== a.p_seq) return 'conflict'; r.moves.push({ ...a.p_move, s }); }
      if (a.p_all && ['duel', 'auction'].includes(r.kind)) Object.assign(r.race, a.p_all); else if (a.p_sum) r.race[s] = a.p_sum;
      if (a.p_turn === 'none') r.turn = null; else if (['host', 'guest', 'both'].includes(a.p_turn)) r.turn = a.p_turn;
      r.updated = new Date().toISOString(); finalise(r, s); return 'ok';
    },
    online_bid(a) {
      const u = auth(a.p_user, a.p_key); const r = rooms[a.p_code]; const s = r.host === u ? 'host' : r.guest === u ? 'guest' : null;
      if (!s) return 'not_yours'; if (r.kind !== 'auction' || ['done', 'declined'].includes(r.status)) return 'over';
      if (a.p_lot !== r.moves.length) return 'stale';
      let sec = r.secret.lot === a.p_lot ? r.secret : { lot: a.p_lot };
      const need = sec.need || a.p_need || 'both'; if (need !== 'both' && need !== s) return 'not_needed';
      sec = { ...sec, need, [s]: a.p_bid };
      if ((need === 'both' && 'host' in sec && 'guest' in sec) || (need !== 'both' && need in sec)) {
        const bids = {}; if ('host' in sec) bids.host = sec.host; if ('guest' in sec) bids.guest = sec.guest;
        r.moves.push({ lot: a.p_lot, bids }); r.secret = {}; return 'sold';
      }
      r.secret = sec; return 'waiting';
    },
    friends_week(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return null;
      const names = [u, ...[...friends].filter(f => f.startsWith(u + '|')).map(f => f.split('|')[1])];
      return names.map(n => ({ name: n, score: n === 'Bob' ? 420 : n === u ? 380 : 0, games: n === u ? 2 : 1, me: n === u })).sort((x, y) => y.score - x.score);
    },
    save_backup(a) { const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; backups[u] = { data: a.p_data, updated: new Date().toISOString() }; return 'ok'; },
    // 5.32: scores, "someone beat your score", the 🔔 feed and Best Players (same rules as the SQL, simplified)
    submit_score(a) {
      const u = auth(a.p_username, a.p_key); if (!u) return 'not_yours';
      const best = n => Math.max(-1e9, ...scores.filter(x => x.mode === a.p_mode && x.name === n).map(x => x.score));
      const top = scores.filter(x => x.mode === a.p_mode).sort((x, y) => y.score - x.score || x.at - y.at)[0];
      if (!/:/.test(a.p_mode) && top && top.name !== u && a.p_score > top.score && best(u) < top.score) {
        const v = top.name, t = Date.now();
        if (!activity.some(x => x.username === v && x.kind === 'beaten' && x.mode === a.p_mode && t - x.t < 3600e3))
          activity.push({ id: ++actN, username: v, kind: 'beaten', mode: a.p_mode, title: `😬 ${u} beat your score`, body: `${a.p_score} v your ${top.score}: you've lost top spot. Tap to win it back`, link: 'https://x/goal-machine/#/leaderboard?m=' + a.p_mode, at: new Date(t).toISOString(), t });
        activity.push({ id: ++actN, username: u, kind: 'crown', mode: a.p_mode, title: '👑 You\'re top of a leaderboard', body: `You knocked ${v} off top spot`, link: 'https://x/goal-machine/#/leaderboard?m=' + a.p_mode, at: new Date(t).toISOString(), t });
      }
      scores.push({ name: u, mode: a.p_mode, score: a.p_score, meta: a.p_meta || null, at: Date.now() });
      return 'ok';
    },
    best_players(a) {
      // (5.39.1, the same sum as the SQL: every board you're on, 1 point + 1 per player below you, ×1 Easy, ×2 Normal, ×3 Hard/Extreme)
      const easy = m => /^(ultimatepure|ultimate|purist|chaos|szchaos|target|treble|mystery)(ast|apps)?e$/.test(m);
      const main = m => /^(ultimatepure|ultimate|extreme|purist|chaosx|chaos|szchaos|target|treble|mystery)x?(ast|apps)?h?$/.test(m);
      const w = m => easy(m) ? 1 : /h$/.test(m) || /^(extreme|purist|chaosx)/.test(m) || /^(ultimatepure|ultimate|szchaos|target|treble|mystery)x/.test(m) ? 3 : 2;
      const boards = {};
      scores.filter(x => main(x.mode) || easy(x.mode)).forEach(x => { const b = boards[x.mode] = boards[x.mode] || {}; if (!b[x.name] || b[x.name] < x.score) b[x.name] = x.score; });
      const per = {};
      Object.entries(boards).forEach(([m, b]) => { const l = Object.entries(b).sort((x, y) => y[1] - x[1]); l.forEach(([n, sc], i) => { const rk = l.findIndex(z => z[1] === sc); const p = per[n] = per[n] || { points: 0, crowns: 0, boards: 0 }; p.points += (l.length - rk) * w(m); p.boards++; if (rk === 0) p.crowns++; }); });
      const rows = Object.entries(per).map(([name, p]) => ({ name, ...p, level: null })).sort((x, y) => y.points - x.points || y.crowns - x.crowns);
      rows.forEach((r, i) => { r.rank = i && rows[i - 1].points === r.points && rows[i - 1].crowns === r.crowns ? rows[i - 1].rank : i + 1; });
      return rows.slice(0, a.p_limit || 50);
    },
    activity_feed(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return { error: 'auth' };
      const tops = () => { const out = []; [...new Set(scores.map(x => x.mode))].filter(m => !/:/.test(m)).forEach(m => { const t = scores.filter(x => x.mode === m).sort((x, y) => y.score - x.score || x.at - y.at)[0]; if (t && t.name === u) out.push(m); }); return out; };
      const bp = fns.best_players({ p_limit: 1e5 }).find(r => r.name === u) || null;
      return { items: activity.filter(x => x.username === u).slice().reverse(), crowns: tops(), mcrowns: tops(), best: bp, mbest: bp, now: new Date().toISOString() };
    },
    app_inbox(a) {
      const u = (players[(a.p_user || '').toLowerCase()] || {}).username;
      const pr = a.p_prefs || {};
      const seatOf = r => (r.host === u ? 'host' : r.guest === u ? 'guest' : null);
      // (as the server: games waiting on you, and results, except for whoever finished the game: they watched it happen)
      const games = Object.values(rooms).filter(r => seatOf(r)).flatMap(r => { const st = seatOf(r);
        if (r.status === 'done' && r.result && r.result.by !== st && pr.results !== false) return [{ id: 'r:' + r.code, title: r.result.winner === st ? '🏆 You won' : r.result.winner === 'draw' ? '🤝 A draw' : '😬 You lost', body: '', link: '#/online?room=' + r.code }];
        if (r.status === 'playing' && r.kind === 'race' && !(r.race[st] || {}).done && pr.move !== false) return [{ id: 'g:' + r.code + '@1', title: '⚔️ Your move', body: '', link: '#/online?room=' + r.code }];
        return []; });
      return games.concat(activity.filter(x => x.username === u && x.kind === 'beaten' && pr.beaten !== false).map(x => ({ id: 'b:' + x.id, title: x.title, body: x.body, link: x.link })));
    },
    // 5.33: profiles and invites (simplified)
    player_profile(a) {
      const pl = players[(a.p_name || '').toLowerCase()]; if (!pl) return null;
      const me = (players[(a.p_me || '').toLowerCase()] || {}).username;
      const mine = scores.filter(x => x.name === pl.username), modes = [...new Set(mine.map(x => x.mode))];
      const boards = modes.map(m => { const b = {}; scores.filter(x => x.mode === m).forEach(x => { if (!(x.name in b) || b[x.name] < x.score) b[x.name] = x.score; });
        const order = Object.entries(b).sort((x, y) => y[1] - x[1]); return { mode: m, score: b[pl.username], rk: order.findIndex(x => x[0] === pl.username) + 1, n: order.length }; });
      const xi = mine.filter(x => x.meta && x.meta.xi).sort((x, y) => y.score - x.score)[0];
      return { name: pl.username, level: 7, club: null, flair: {}, since: new Date().toISOString(), games: mine.length, boards, crowns: boards.filter(b => b.rk === 1).length,
        best: null, mbest: null, xi: xi ? { mode: xi.mode, score: xi.score, xi: xi.meta.xi } : null, mgr: (mine.find(x => x.meta && x.meta.mgr) || { meta: {} }).meta.mgr || null,
        vs: me && me !== pl.username ? { w: 0, d: 0, l: 0 } : null, friend: !!me && friends.has(me + '|' + pl.username) };
    },
    claim_referral(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return 'auth';
      const inv = (players[(a.p_ref || '').toLowerCase()] || {}).username; if (!inv) return 'no_user'; if (inv === u) return 'self';
      if (referrals.some(r => r.invitee === u)) return 'done';
      referrals.push({ inviter: inv, invitee: u }); befriend(u, inv);
      const t = Date.now();
      activity.push({ id: ++actN, username: inv, kind: 'referral', title: `🤝 ${u} joined from your invite`, body: 'A Referral pack for you both', link: '#/online', at: new Date(t).toISOString(), t });
      return 'ok';
    },
    load_backup(a) { const u = auth(a.p_user, a.p_key); if (!u) return null; return backups[u] || { none: true }; },
    delete_account(a) { const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; delete players[u.toLowerCase()]; return 'deleted'; },
    set_avatar(a) { const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; if (a.p_image && !/^data:image\/(jpeg|webp|png);base64,/.test(a.p_image)) return 'bad_image'; pics[u] = a.p_image; return 'ok'; },
    get_avatars(a) { const out = {}; (a.p_names || []).forEach(n => { const k = Object.keys(pics).find(x => x.toLowerCase() === n.toLowerCase()); if (k && pics[k]) out[k] = pics[k]; }); return out; },
    send_feedback(a) { (this._fb = this._fb || []).push(a); return a.p_body.trim().length >= 3 ? 'ok' : 'empty'; },
    report_name(a) { const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; nameReports.add(u + '|' + a.p_target); return [...nameReports].filter(r => r.endsWith('|' + a.p_target)).length >= 3 ? 'hidden' : 'ok'; },
    name_status(a) { return auth(a.p_user, a.p_key) ? (hiddenNames.has(a.p_user) ? 'hidden' : 'ok') : null; },
    rename_account(a) { const u = auth(a.p_user, a.p_key); if (!u) return 'auth'; if (/fuck|shit/i.test(a.p_new)) return 'rude_name'; const k = a.p_new.toLowerCase(); if (players[k] && k !== u.toLowerCase()) return 'taken'; players[k] = { ...players[u.toLowerCase()], username: a.p_new }; if (k !== u.toLowerCase()) delete players[u.toLowerCase()]; hiddenNames.delete(u); return 'ok'; },
    report_avatar(a) { reports.push([a.p_user, a.p_target]); return reports.filter(r => r[1] === a.p_target).length >= 3 ? 'removed' : 'ok'; },
    online_remove_friend(a) { const u = auth(a.p_user, a.p_key); friends.delete(u + '|' + a.p_friend); return 'ok'; },
    online_resign(a) {
      const u = auth(a.p_user, a.p_key); const r = rooms[a.p_code]; const s = r.host === u ? 'host' : 'guest';
      if (!r.guest) { delete rooms[a.p_code]; return 'cancelled'; }
      const played = r.race[s] || r.moves.some(m => m.s === s);
      if (!played) { r.status = 'declined'; return 'declined'; }
      r.status = 'done'; r.result = { host: s === 'host' ? 0 : 100, guest: s === 'guest' ? 0 : 100, winner: s === 'host' ? 'guest' : 'host', resigned: s }; return 'resigned';
    },
    online_games(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return null;
      return Object.values(rooms).filter(r => (r.host === u || r.guest === u) && r.status !== 'declined').reverse()
        .map(r => ({ quick: !!r.quick, bids_in: Object.keys(r.secret || {}).filter(k => k === 'host' || k === 'guest'), code: r.code, kind: r.kind, variant: r.variant, stat: r.stat, host: r.host, guest: r.guest, turn: r.turn, status: r.status, result: r.result, updated: r.updated, nmoves: r.moves.length,
          sums: Object.fromEntries(Object.entries(r.race).map(([k, v]) => { const { x, ...rest } = v; return [k, rest]; })) }));
    },
    online_friends(a) {
      const u = auth(a.p_user, a.p_key); if (!u) return null;
      return [...friends].filter(f => f.startsWith(u + '|')).map(f => f.split('|')[1]).map(name => {
        const done = Object.values(rooms).filter(r => r.status === 'done' && ((r.host === u && r.guest === name) || (r.guest === u && r.host === name)));
        const mine = r => (r.host === u ? 'host' : 'guest');
        return { name, w: done.filter(r => r.result.winner === mine(r)).length, d: done.filter(r => r.result.winner === 'draw').length, l: done.filter(r => r.result.winner !== 'draw' && r.result.winner !== mine(r)).length };
      });
    },
    online_add_friend(a) { const u = auth(a.p_user, a.p_key); const o = (players[a.p_friend.toLowerCase()] || {}).username; if (!o) return 'no_user'; if (o === u) return 'self'; friends.add(u + '|' + o); return 'ok'; },
    online_waiting(a) {
      const u = (players[a.p_user.toLowerCase()] || {}).username;
      return Object.values(rooms).filter(r => r.status === 'playing' && (r.host === u || r.guest === u)).filter(r => { const s = r.host === u ? 'host' : 'guest'; return r.kind === 'duel' ? r.turn === s : !(r.race[s] || {}).done; })
        .map(r => ({ code: r.code, kind: r.kind, variant: r.variant, opp: r.host === u ? r.guest : r.host }));
    },
  };
  return {
    rooms, fns, hiddenNames, chs, plays, scores,
    async attach(ctx) {
      await ctx.route('**/rest/v1/rpc/*', async route => {
        const fn = route.request().url().split('/rpc/')[1].split('?')[0], args = JSON.parse(route.request().postData() || '{}');
        if (!fns[fn]) return route.fulfill({ status: 404, body: 'no fn ' + fn });
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fns[fn](args) ?? null) });
      });
      await ctx.route('**/rest/v1/**', r => r.request().url().includes('/rpc/') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    },
  };
};

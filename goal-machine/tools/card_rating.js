const fs = require('fs'), vm = require('vm');
const R = __dirname + '/../';
const win = {}; vm.runInNewContext(fs.readFileSync(R + 'data/players.js', 'utf8'), { window: win });
const D = win.PL_DATA;
const GROUP = { GK: 'G', LB: 'D', CB: 'D', RB: 'D', LM: 'M', CM: 'M', RM: 'M', ST: 'F' };
const parseStints = str => { const out = {}; if (!str) return out; for (const part of str.split('|')) { const [ci, runs] = part.split(':'); const ys = new Set(); for (const run of runs.split('.')) { const [a, b] = run.split('-').map(Number); for (let y = a; y <= (isNaN(b) ? a : b); y++) ys.add(1992 + y); } out[D.clubs[+ci]] = ys; } return out; };
const parseHon = s => { const h = {}; for (const m of s.matchAll(/([A-Z])(\d+)/g)) h[m[1]] = +m[2]; return h; };
const P = D.players.map(r => ({ name: r[0], poss: r[1].split('/'), nat: r[2] >= 0 ? D.nats[r[2]] : null, clubs: r[3].map(c => D.clubs[c]), apps: r[4], goals: r[5], first: r[6], last: r[7], ast: r[9] || 0, stints: parseStints(r[10] || ''), hon: parseHon(r[11] || ''), cs: r[13] || 0 }));
P.forEach(p => { p.pos = GROUP[p.poss[0]]; p.fame = p.apps * (1 + p.goals / 30); });
const old = new Map(); P.slice().sort((a, b) => b.fame - a.fame).forEach((p, i) => old.set(p, p.hon.H || i < 25 ? 'l' : i < 225 ? 'g' : i < 725 ? 's' : 'b'));
const U = 'Manchester United', A = 'Arsenal', C = 'Chelsea', L = 'Liverpool', MC = 'Manchester City', T = 'Tottenham Hotspur', N = 'Newcastle United', AV = 'Aston Villa', LE = 'Leeds United';
const TOP4 = [[U, AV, 'Norwich City', 'Blackburn Rovers'], [U, 'Blackburn Rovers', N, A], ['Blackburn Rovers', U, 'Nottingham Forest', L], [U, N, L, AV], [U, N, A, L], [A, U, L, C], [U, A, C, LE], [U, A, LE, L], [U, A, L, LE], [A, L, U, N], [U, A, N, C], [A, C, U, L], [C, A, U, 'Everton'], [C, U, L, A], [U, C, L, A], [U, C, A, L], [U, L, C, A], [C, U, A, T], [U, C, MC, A], [MC, U, A, T], [U, MC, C, A], [MC, L, C, A], [C, MC, A, U], ['Leicester City', A, T, MC], [C, T, MC, L], [MC, U, T, L], [MC, L, C, T], [L, MC, U, C], [MC, U, L, C], [MC, L, C, T], [MC, A, U, N], [MC, A, L, AV], [L, A, MC, C]];
const top4 = p => { let n = 0; for (const [c, ys] of Object.entries(p.stints)) for (const y of ys) { const t = TOP4[y - 1992]; if (t && t.includes(c)) n++; } return n; };
// individual awards: PFA Players' Player and FWA Footballer of the Year (season ending in the year)
const AWARDS = ['Paul McGrath', 'Eric Cantona', 'Alan Shearer', 'Les Ferdinand', 'Alan Shearer', 'Dennis Bergkamp', 'David Ginola', 'Roy Keane', 'Teddy Sheringham', 'Ruud van Nistelrooy', 'Thierry Henry', 'Thierry Henry', 'John Terry', 'Steven Gerrard', 'Cristiano Ronaldo', 'Cristiano Ronaldo', 'Ryan Giggs', 'Wayne Rooney', 'Gareth Bale', 'Robin van Persie', 'Gareth Bale', 'Luis Suárez', 'Eden Hazard', 'Riyad Mahrez', "N'Golo Kanté", 'Mohamed Salah', 'Virgil van Dijk', 'Kevin De Bruyne', 'Kevin De Bruyne', 'Mohamed Salah', 'Erling Haaland', 'Phil Foden', 'Mohamed Salah',
  'Chris Waddle', 'Alan Shearer', 'Jürgen Klinsmann', 'Eric Cantona', 'Gianfranco Zola', 'Dennis Bergkamp', 'David Ginola', 'Roy Keane', 'Teddy Sheringham', 'Robert Pires', 'Thierry Henry', 'Thierry Henry', 'Frank Lampard', 'Thierry Henry', 'Cristiano Ronaldo', 'Cristiano Ronaldo', 'Steven Gerrard', 'Wayne Rooney', 'Scott Parker', 'Robin van Persie', 'Gareth Bale', 'Luis Suárez', 'Eden Hazard', 'Jamie Vardy', "N'Golo Kanté", 'Mohamed Salah', 'Raheem Sterling', 'Jordan Henderson', 'Rúben Dias', 'Mohamed Salah', 'Erling Haaland', 'Phil Foden', 'Mohamed Salah'];
const AW = new Map(); AWARDS.forEach(n => AW.set(n, (AW.get(n) || 0) + 1));
const miss = [...AW.keys()].filter(n => !P.some(p => p.name === n)); if (miss.length) console.error('award names not found:', miss);
const seasons = p => { const ys = new Set(); Object.values(p.stints).forEach(s => s.forEach(y => ys.add(y))); return ys.size || (p.last - p.first + 1) || 1; };
const rate = p => {
  const g = p.goals, a = p.ast, n = p.apps, h = p.hon, ss = seasons(p);
  const reg = Math.max(0.15, Math.min(1, n / (ss * 30))) ** 2;  // a regular, or a squad player
  const pg = p.pos === 'F' ? (g + 0.5 * a) / n : p.pos === 'M' ? (g + 0.8 * a) / n : p.pos === 'D' ? (g + a) / n : p.cs / n;
  const rateB = { F: 0.45, M: 0.25, D: 0.08, G: 0.3 }[p.pos];  // about a good regular's rate
  const out = p.pos === 'F' ? g + 0.5 * a : p.pos === 'M' ? (g + 0.8 * a) * 1.4 : p.pos === 'D' ? (g + a) * 0.6 : p.cs * 1.2;
  const s = 7 * Math.sqrt(Math.min(n, 450)) + out * Math.min(1.6, Math.max(0.6, pg / rateB))
    + (p.pos === 'D' ? 3 * Math.sqrt(Math.min(n, 500)) + reg * ((h.P || 0) * 8 + top4(p) * 5) : 0) + reg * ((h.P || 0) * 14 + top4(p) * 7) + (h.C || 0) * 14 + (h.W || 0) * 18 + (h.B || 0) * 30 + (AW.get(p.name) || 0) * 45 + (h.H ? 120 : 0);
  return { s, t4: top4(p) };
};
P.forEach(p => { const r = rate(p); p.q = r.s; p.t4 = r.t4; });
// 💎 Icons: the Premier League Hall of Fame, plus the six best-rated players not in it (yet)
const tier = new Map();
const icons = P.filter(p => p.hon.H).concat(P.filter(p => !p.hon.H).sort((a, b) => b.q - a.q).slice(0, 6));
icons.forEach(p => tier.set(p, 'i'));
// then within each position, the same share of each tier as across the whole set: 45 Legend, 190 Gold, 500 Silver
const rest = P.filter(p => !tier.has(p)), share = { l: 45 / rest.length, g: 190 / rest.length, s: 500 / rest.length };
for (const pos of 'GDMF') {
  const g = rest.filter(p => p.pos === pos).sort((a, b) => b.q - a.q), n = g.length;
  const cut = { l: Math.round(n * share.l), g: Math.round(n * (share.l + share.g)), s: Math.round(n * (share.l + share.g + share.s)) };
  g.forEach((p, i) => tier.set(p, i < cut.l ? 'l' : i < cut.g ? 'g' : i < cut.s ? 's' : 'b'));
}
P.forEach(p => { p.t = tier.get(p); p.o = old.get(p); });
module.exports = P;
if (require.main === module) {
  const N = { i: 'Icon', l: 'Legend', g: 'Gold', s: 'Silver', b: 'Bronze' };
  for (const t of ['i', 'l']) { console.log(`\n== ${N[t]} ==`); for (const pos of 'GDMF') console.log(pos + ': ' + P.filter(p => p.t === t && p.pos === pos).sort((a, b) => b.q - a.q).map(p => `${p.name}`).join(', ')); }
  const cnt = {}; P.forEach(p => cnt[p.t] = (cnt[p.t] || 0) + 1); console.log(cnt);
  const chk = ['Gareth Barry', 'James Milner', 'Peter Crouch', 'Cristiano Ronaldo', 'Erling Haaland', 'Kevin De Bruyne', 'David Silva', "N'Golo Kanté", 'Luis Suárez', 'Gareth Bale', 'Edwin van der Sar', 'David de Gea', 'Rúben Dias', 'Mohamed Salah', 'Virgil van Dijk', 'Thierry Henry', 'Kevin Davies', 'Emile Heskey', 'Darren Bent', 'Rio Ferdinand'];
  console.log(chk.map(n => { const p = P.find(x => x.name === n); return p ? `${n}: ${p.o}→${p.t}` : n + ' ?'; }).join('\n'));
}

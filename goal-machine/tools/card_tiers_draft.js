const P = require('./card_rating.js');
const N = { i: '💎 Icon', l: '🟣 Legend', g: '🟡 Gold', s: '⚪ Silver', b: '🟫 Bronze' }, RK = { b: 0, s: 1, g: 2, l: 3, i: 4 };
const POS = { G: 'Keepers', D: 'Defenders', M: 'Midfielders', F: 'Forwards' };
const mark = p => RK[p.t] > RK[p.o] ? ' ↑' : RK[p.t] < RK[p.o] ? ' ↓' : '';
let out = `# Card tiers: the new list (draft for checking)\n\nNothing in the game has changed yet. Finished cards stay finished whatever happens.\n\n`;
out += `**How it's worked out:** a rating for every player, then ranked *within his position*, so every tier has keepers, defenders, midfielders and forwards in the same share. The rating adds up:\n`;
out += `- how long he played (with diminishing returns: 400 games isn't twice as good as 200)\n- what he produced *per game* for his position (goals and assists for forwards and midfielders, clean sheets for keepers)\n- PL titles and seasons in a top-four side (counted less for squad players who didn't play much)\n- Champions League, World Cup, Golden Boots, and Player of the Year awards (PFA and FWA)\n\n`;
out += `**💎 Icon** (new, 7 pieces): the Premier League Hall of Fame, plus the six best-rated players not in it yet.\n\n`;
const cnt = t => P.filter(p => p.t === t).length, ocnt = t => P.filter(p => p.o === t).length;
out += `| Tier | Now | New |\n|---|---|---|\n` + ['i', 'l', 'g', 's', 'b'].map(t => `| ${N[t]} | ${ocnt(t) || '–'} | ${cnt(t)} |`).join('\n') + '\n\n';
out += `↑ = moving up, ↓ = moving down.\n\n`;
for (const t of ['i', 'l', 'g']) {
  out += `## ${N[t]} (${cnt(t)})\n\n`;
  for (const pos of 'GDMF') out += `**${POS[pos]}:** ${P.filter(p => p.t === t && p.pos === pos).sort((a, b) => b.q - a.q).map(p => p.name + mark(p)).join(', ')}\n\n`;
}
const fame = (a, b) => b.fame - a.fame;
const down = P.filter(p => RK[p.t] < RK[p.o]).sort(fame), up = P.filter(p => RK[p.t] > RK[p.o] && RK[p.t] >= 2).sort((a, b) => b.q - a.q);
out += `## Who moves down (${down.length})\n\n` + down.map(p => `${p.name} (${N[p.o].split(' ')[1]} → ${N[p.t].split(' ')[1]})`).join(', ') + '\n\n';
out += `## Who moves up to Gold or better (${up.length})\n\n` + up.map(p => `${p.name} (${N[p.o].split(' ')[1]} → ${N[p.t].split(' ')[1]})`).join(', ') + '\n\n';
out += `## Questions\n\n1. Icons: Hall of Fame plus six (Salah, Giggs, De Bruyne, Sterling, Ronaldo, Kane). Right people? More or fewer?\n2. Defenders and keepers are the hardest to rate (the data has no tackles or saves), so they lean on titles, top-four seasons and longevity. Anyone obviously in the wrong place?\n3. Tier sizes: 30 Icons + 45 Legends is more top cards than today's 42 Legends. Keep, or trim Legends to about 35?\n4. Anyone you'd swap by hand? I can pin a few.\n`;
require('fs').writeFileSync('' + __dirname + '/../../notes/card-tiers-draft.md', out);
console.log(out.length, down.length, up.length);

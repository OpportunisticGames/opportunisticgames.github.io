// Draws the 512x512 icons for the Play Games leaderboards and game stats (an emoji on a coloured disc).
// Run: node make_icons.js   (needs Playwright). Writes leaderboard-icons/*.png and stats-zip/*.png.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const C = { normal: ['#86efac', '#15803d'], hard: ['#fdba74', '#c2410c'], extreme: ['#d8b4fe', '#6b21a8'], blue: ['#93c5fd', '#1d4ed8'], gold: ['#fde68a', '#b45309'], pink: ['#f9a8d4', '#be185d'] };
const GAMES = { ultimate: '👑', chaos: '🌪️', purist: '💎' }, LEVELS = ['normal', 'hard', 'extreme'];
const icons = [];
for (const g of Object.keys(GAMES)) for (const l of LEVELS) icons.push([`leaderboard-icons/lb_${g}_${l}.png`, GAMES[g], l]);
for (const g of Object.keys(GAMES)) for (const l of LEVELS) icons.push([`stats-zip/best_${g}_${l}.png`, GAMES[g], l]);
[['games_played', '🎮', 'blue'], ['xis_built', '⚽', 'normal'], ['daily_games', '📅', 'gold'], ['packs_opened', '🎁', 'pink'], ['cards_finished', '🧩', 'blue'], ['legend_cards', '🟣', 'extreme'],
  ['badges_unlocked', '🏅', 'gold'], ['online_played', '🌐', 'blue'], ['online_won', '⚔️', 'hard'], ['level', '⬆️', 'gold']].forEach(([n, e, c]) => icons.push([`stats-zip/${n}.png`, e, c]));
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 512, height: 512 } });
  for (const [path, emoji, colour] of icons) {
    const [a, z] = C[colour];
    await pg.setContent(`<body style="margin:0;width:512px;height:512px;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,${a},${z});font-family:'Noto Color Emoji',sans-serif">
      <div style="width:456px;height:456px;border-radius:50%;box-shadow:inset 0 0 0 12px rgba(255,255,255,.55),inset 0 0 40px rgba(0,0,0,.25);display:grid;place-items:center;font-size:250px;line-height:1">${emoji}</div></body>`);
    await pg.screenshot({ path });
  }
  await b.close();
  console.log(icons.length + ' icons');
})();

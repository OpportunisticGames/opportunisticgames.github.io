// Draws the 512x512 achievement icons for Play Console: the badge's emoji on a coloured badge (green easy, blue
// moderate, gold heavy, purple hidden). Run: node make_icons.js badges.json  (needs Playwright)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const rows = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const BG = { L: ['#86efac', '#15803d'], M: ['#93c5fd', '#1d4ed8'], H: ['#fde68a', '#b45309'], S: ['#d8b4fe', '#6b21a8'] };
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 512, height: 512 } });
  for (const r of rows) {
    const [a, z] = BG[r.tier];
    await pg.setContent(`<body style="margin:0;width:512px;height:512px;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,${a},${z});font-family:'Noto Color Emoji',sans-serif">
      <div style="width:456px;height:456px;border-radius:50%;box-shadow:inset 0 0 0 12px rgba(255,255,255,.55),inset 0 0 40px rgba(0,0,0,.25);display:grid;place-items:center;font-size:250px;line-height:1">${r.icon}</div></body>`);
    await pg.screenshot({ path: `icons/${r.id}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();

const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 680, height: 800 } }); p.on('pageerror', e => console.log('err', e.message));
  const groups = process.argv.slice(2);
  for (const g of groups) { const [name, list] = g.split('='); await p.goto('http://localhost:8765/lotprev.html?n=' + list); await p.waitForFunction(() => window.DONE, null, { timeout: 30000 }); await p.waitForTimeout(500); await p.screenshot({ path: 'lay/lp_' + name + '.png', fullPage: true }); }
  await b.close(); })();

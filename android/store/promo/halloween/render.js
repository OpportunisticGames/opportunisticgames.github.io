// Renders the Halloween promo Lottie: the still (primary image) and preview frames.
//   node render.js [frame]      (needs the repo served on :8765: python3 -m http.server 8765 from the repo root)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const frame = +(process.argv[2] || 250), preview = process.argv.includes('--preview');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/android/store/promo/halloween/');
  await pg.setContent('<html><body style="margin:0;background:#000"><div id="a" style="width:1920px;height:1080px"></div></body></html>');
  await pg.addScriptTag({ url: 'http://localhost:8765/goal-machine/js/vendor/lottie_light.min.js' });
  const data = JSON.parse(fs.readFileSync(__dirname + '/halloween.json', 'utf8'));
  await pg.evaluate(d => { window.A = lottie.loadAnimation({ container: document.getElementById('a'), renderer: 'svg', loop: false, autoplay: false, animationData: d }); }, data);
  await pg.waitForTimeout(300);
  await pg.evaluate(f => A.goToAndStop(f, true), frame);
  await pg.screenshot({ path: __dirname + '/still.png' });
  if (preview) {
    fs.mkdirSync('/tmp/hwprev', { recursive: true });
    for (let f = 0; f < 360; f += 4) { await pg.evaluate(f => A.goToAndStop(f, true), f); await pg.screenshot({ path: `/tmp/hwprev/${String(f).padStart(3, '0')}.png` }); }
  }
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();

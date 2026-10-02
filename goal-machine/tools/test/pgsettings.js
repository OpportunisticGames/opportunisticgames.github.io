// Settings in the Play app: a Google Play Games section with the sign-in status and its buttons.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase|fonts/, r => r.abort());
  await pg.addInitScript(() => {
    window.__calls = [];
    window.AndroidApp = new Proxy({ pgsAvailable: () => true, pgsStatus: () => 'Signed in as Tester', pgsSignIn: () => window.__calls.push('in'), pgsShow: () => window.__calls.push('badges'), pgsBoards: () => window.__calls.push('boards'),
      channel: () => 'play', version: () => 99, nightMode: () => false, pushToken: () => '', notifyStatus: () => null, notificationsAllowed: () => true }, {});
  });
  await pg.goto(U);
  await pg.evaluate(() => { localStorage.clear(); const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v)); set('seenVersion', 999); set('welcomed', 1); set('sfx', false); });
  await pg.goto(U + '#/settings?s=notify'); await pg.waitForTimeout(800);
  ok(/Signed in as Tester/.test(await pg.textContent('#s-pgs')), 'Settings shows who you are signed in as');
  await pg.click('#s-pgsin'); await pg.click('#s-pgsbadges'); await pg.click('#s-pgsboards');
  ok(JSON.stringify(await pg.evaluate(() => window.__calls)) === '["in","badges","boards"]', 'the buttons call Sign in, achievements and leaderboards');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close();
})();

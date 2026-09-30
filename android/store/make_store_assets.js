// Makes the Google Play listing graphics: a 1024x500 feature graphic and seven 1080x1920 phone screenshots, each a
// real screen of the Play version (no PL/Transfermarkt photos) in a frame with a caption.
// Serve the repo root locally first (python3 -m http.server 8765), then: node android/store/make_store_assets.js
// No personal names anywhere (the player is "SuperSub"), and no "Premier League" in the graphics' own text.
const fs = require('fs'), path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = process.argv[2] || 'http://localhost:8765/goal-machine/', OUT = __dirname;
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Inter:wght@600;800&display=swap" rel="stylesheet">';
const BG = 'repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 24px,transparent 24px 48px),radial-gradient(circle at 30% 20%,#1d7a57,#07261d 70%)';

(async () => {
  const b = await chromium.launch();

  // feature graphic
  const icon = fs.readFileSync(path.join(OUT, '../../goal-machine/icons/icon.svg'), 'utf8');
  const fg = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await fg.setContent(`<html><head>${FONTS}</head>
    <body style="margin:0;width:1024px;height:500px;display:flex;align-items:center;gap:56px;padding:0 70px;box-sizing:border-box;font-family:Oswald,Impact,sans-serif;background:${BG}">
      <div style="width:300px;height:300px;flex-shrink:0;filter:drop-shadow(0 18px 30px rgba(0,0,0,.45))">${icon.replace('<svg ', '<svg width="300" height="300" ')}</div>
      <div><div style="font-size:112px;line-height:.9;color:#c8ff3d;text-shadow:0 6px 0 #0a2a1f">GOAL</div>
        <div style="font-size:64px;letter-spacing:14px;color:#fff">MACHINE</div>
        <div style="font:600 30px/1.3 Inter,sans-serif;color:#cfe9dc;margin-top:18px">Build the biggest-scoring XI<br>from 5,000+ real footballers</div></div></body></html>`);
  await fg.waitForTimeout(1200);
  await fg.screenshot({ path: path.join(OUT, 'feature-graphic.png') });
  fs.copyFileSync(path.join(OUT, '../../goal-machine/icons/icon-512.png'), path.join(OUT, 'icon-512.png'));

  // the raw screens, as the Play version on a phone
  const ctx = await b.newContext({ viewport: { width: 390, height: 740 }, deviceScaleFactor: 2 });
  await ctx.route(/premierleague|transfermarkt|supabase/, r => r.abort());
  await ctx.addInitScript(() => { window.AndroidApp = { channel: () => 'play', version: () => 999, share() { } }; });
  const pg = await ctx.newPage();
  await pg.goto(U);
  await pg.evaluate(() => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('gm:' + k, JSON.stringify(v));
    set('name', 'SuperSub'); set('seenVersion', 999); set('welcomed', 1); set('club', 'Everton'); set('sfx', false);
    // a fortnight of dailies, so Today shows a streak (not today's, so today's games still say Play)
    const log = {};
    for (let i = 1; i <= 13; i++) { const d = new Date(Date.now() - i * 864e5); log[d.toISOString().slice(0, 10)] = { daily: 420 + (i * 37) % 260, footle: 3 + i % 5 }; }
    set('dlog', log);
  });
  const close = () => pg.evaluate(() => document.querySelectorAll('.modal-wrap').forEach(m => m.remove()));
  const shots = {};
  const snap = async n => { await close(); await pg.waitForTimeout(400); shots[n] = (await pg.screenshot()).toString('base64'); };
  // make signings until there are n on the pitch (tapping through any CHAOS moment)
  const play = async n => {
    for (let k = 0; k < 90 && (await pg.evaluate(() => GM.draft.state().xi.filter(x => x.p != null).length)) < n; k++) {
      await pg.evaluate(() => { const cm = document.querySelector('.cm:not(.out)'); if (cm) { const mg = cm.querySelector('[data-mgr]'); if (mg) mg.click(); else cm.click(); } });
      const st = await pg.evaluate(() => {
        const sp = document.getElementById('spin'); if (sp && !sp.disabled) { sp.click(); return 'spin'; }
        const t = document.querySelector('.slot.target'); if (t) { t.click(); return 'place'; }
        const rs = [...document.querySelectorAll('.stage .reel[data-reel]')]; if (!rs.length) return 'wait';
        (rs.find(r => !r.classList.contains('is-wild')) || rs[0]).click(); return 'pick';
      });
      await pg.waitForTimeout(st === 'spin' ? 1500 : st === 'place' ? 1900 : 350);
    }
  };

  await pg.goto(U + '#/draft?m=ultimate&s=goals&seed=store7'); await pg.waitForTimeout(900); await play(7);
  await pg.evaluate(() => document.getElementById('spin').click()); await pg.waitForTimeout(1600); await snap('draft');
  await pg.goto(U + '#/'); await pg.goto(U + '#/draft?m=chaos&seed=store3'); await pg.waitForTimeout(1200); await snap('manager');
  await play(5); await pg.evaluate(() => { GM.draft.state().forceEv = 'tornado'; document.getElementById('spin').click(); }); await pg.waitForTimeout(1300); await snap('tornado');
  await pg.goto(U + '#/'); await pg.waitForTimeout(300);
  await pg.evaluate(() => localStorage.setItem('gm:ht:autostart', '1')); await pg.goto(U + '#/hattrick'); await pg.waitForTimeout(2500); await snap('hattrick');
  await pg.goto(U + '#/today'); await pg.waitForTimeout(1200); await snap('today');
  await pg.goto(U + '#/footle'); await pg.waitForTimeout(1200);
  for (const guess of ['Alan Shearer', 'Frank Lampard', 'Steven Gerrard']) {
    await pg.fill('#fg', guess); await pg.waitForTimeout(500);
    await pg.evaluate(() => { const s = document.querySelector('#fac .ac-item'); if (s) s.click(); }); await pg.waitForTimeout(900);
  }
  await snap('footle');
  await pg.goto(U + '#/'); await pg.waitForTimeout(1200); await snap('home');

  // frame each one: caption on top, the phone screen below
  const CAPTIONS = [
    ['draft', 'SPIN. PICK.', 'Build the biggest-scoring XI'],
    ['tornado', 'CHAOS MODE', 'Tornadoes, VAR and last-minute madness'],
    ['manager', 'PICK YOUR GAFFER', 'Every manager has a perk and a catch'],
    ['hattrick', 'HAT-TRICK', 'A football card game for four'],
    ['today', 'DAILY GAMES', 'New every day. Keep your streak going'],
    ['footle', 'FOOTLE', 'Guess the mystery player in 8'],
    ['home', '5,000+ PLAYERS', 'Every footballer since 1992'],
  ];
  const fr = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (let i = 0; i < CAPTIONS.length; i++) {
    const [key, big, small] = CAPTIONS[i];
    await fr.setContent(`<html><head>${FONTS}</head><body style="margin:0;width:1080px;height:1920px;overflow:hidden;background:${BG};font-family:Oswald,Impact,sans-serif;text-align:center">
      <div style="padding-top:78px;font-size:92px;line-height:1;color:#c8ff3d;text-shadow:0 5px 0 #0a2a1f">${big}</div>
      <div style="margin-top:18px;font:800 44px/1.2 Inter,sans-serif;color:#fff">${small}</div>
      <img src="data:image/png;base64,${shots[key]}" style="position:absolute;left:140px;top:350px;width:800px;border-radius:44px;border:10px solid #0a1f18;box-shadow:0 30px 70px rgba(0,0,0,.55)">
    </body></html>`);
    await fr.waitForTimeout(700);
    await fr.screenshot({ path: path.join(OUT, `screenshot-${i + 1}-${key}.png`) });
  }
  await b.close();
  console.log('store assets written to', OUT);
})();

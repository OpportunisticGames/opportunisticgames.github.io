// A player's card shows the club he's best known for (most Premier League seasons), not the first club he played for.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const U = 'http://localhost:8765/goal-machine/';
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/wikimedia|premierleague|transfermarkt|supabase|fonts/, r => r.abort());
  await pg.goto(U); await pg.waitForTimeout(800);
  const main = await pg.evaluate(() => Object.fromEntries(['Harry Kane', 'Rio Ferdinand', 'Alan Shearer', 'Eric Cantona', 'Frank Lampard', 'Ashley Cole', 'Thierry Henry'].map(n => [n, GM.players.find(p => p.name === n).main])));
  ok(main['Harry Kane'] === 'Tottenham Hotspur' && main['Rio Ferdinand'] === 'Manchester United' && main['Alan Shearer'] === 'Newcastle United' && main['Eric Cantona'] === 'Manchester United' && main['Frank Lampard'] === 'Chelsea' && main['Ashley Cole'] === 'Chelsea' && main['Thierry Henry'] === 'Arsenal', 'best-known club: ' + JSON.stringify(main));
  const card = await pg.evaluate(() => { const d = document.createElement('div'); d.innerHTML = GM.cardHtml({ p: GM.players.find(p => p.name === 'Harry Kane'), t: 'l', have: 0 }, { back: false }); return d.querySelector('.pc-club').textContent; });
  ok(await pg.evaluate(c => c === GM.clubShort('Tottenham Hotspur'), card), 'Kane’s card says ' + card);
  ok(await pg.evaluate(() => GM.players.every(p => p.main && p.clubs.includes(p.main))), 'every player has a best-known club that is one of his clubs');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close();
})();

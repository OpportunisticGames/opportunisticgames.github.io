/* Goal Machine – 💰 Moneyball: a season as chairman. £100m, room for five players, eight weeks.
   The market prices REPUTATION (honours, big clubs, fame: GM.market.price); a player's real WORTH is his output
   (goals, assists, clean sheets per game). Buy the undervalued, sell the overpriced, and your net worth at full time
   is your score.
   Each week: news (often a choice: a big bid for your star, an agent's tip…), a market of four, then the matchweek:
   every player you own plays, scoring/assisting/keeping clean sheets at his real PL rate. That earns prize money and
   moves his value; values also drift towards his real worth. Week 8 is Deadline Day: panic sellers, asking prices cut.
   🙂 Normal shows clubs, era and apps; 🥵 Hard names and positions only; ⚡ Extreme puts all 5,000+ PL players on the
   market. The Daily Moneyball is the same season for everyone (markets, news and matchweeks), Normal, one go.
   Boards: money, moneyh, moneyx and dmoney:<day> (net worth in £m). */
'use strict';

(function () {
  const START = 100, SQUAD = 5, WEEKS = 8, FEE = 0.1, DEADLINE = 0.7;
  const esc = GM.esc;
  const money = m => (m < 0 ? '−' : '') + '£' + (Math.round(Math.abs(m) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'm';
  const pct = x => (x >= 0 ? '+' : '−') + Math.round(Math.abs(x) * 100) + '%';
  const rt = (a, b) => (b ? a / b : 0);
  const round1 = x => Math.round(x * 10) / 10;
  const isDef = p => p.pos === 'G' || p.pos === 'D';
  // What he's really worth: what his reputation says, scaled by how his output compares with players of a similar
  // reputation (so every price band is fair on average, and the bargains are the ones who do more than their name).
  // Output: goals and assists a game (pulled towards the average over his first ~80 games, as a scout would: a hot
  // streak in a short career isn't proof), plus a clean-sheet share for defenders and keepers, and a longevity factor.
  const K = 80, shrunk = (n, apps, avg) => (n + avg * K) / (apps + K);
  const output = p => (160 * shrunk(p.goals, p.apps, 0.1) + 95 * shrunk(p.ast, p.apps, 0.07) + (isDef(p) ? 9 : 0)) * (0.55 + Math.min(0.9, p.apps / 350));
  const ratios = new Map();  // pool → Map(pk → output / the median output of his reputation band)
  function ratioFor(p) {
    const pool = GM.byPk.has(p.pk) ? GM.players : GM.allPlayers || GM.players;
    let m = ratios.get(pool);
    if (!m) {
      m = new Map();
      const rows = pool.map(q => ({ q, rep: GM.market.reputation(q), o: output(q) })).sort((a, b) => a.rep - b.rep), BAND = 25;
      for (let b = 0; b < BAND; b++) {
        const s = rows.slice(Math.floor(b * rows.length / BAND), Math.floor((b + 1) * rows.length / BAND)), os = s.map(x => x.o).sort((x, y) => x - y), med = os[os.length >> 1] || 1;
        s.forEach(x => m.set(x.q.pk, Math.max(0.5, Math.min(2, x.o / med))));
      }
      ratios.set(pool, m);
    }
    return m.get(p.pk) || 1;
  }
  const worth = p => GM.market.reputation(p) * ratioFor(p);
  GM.mbWorth = worth;
  const byPk = k => GM.anyByPk(k);

  // one player's matchweek, the same for everyone with the same season (seeded by season, week and player)
  function matchweek(p, seed, week) {
    const r = GM.rng(`${seed}|wk${week}|${p.pk}`);
    if (r() < 0.1) return { bench: true, cash: 0, change: -0.03 };
    const g = rt(p.goals, p.apps), a = rt(p.ast, p.apps), gc = Math.min(0.8, g * 1.25);
    let goals = 0;
    if (r() < gc) { goals = 1; if (r() < gc * 0.35) { goals = 2; if (r() < gc * 0.25) goals = 3; } }
    const assist = r() < Math.min(0.6, a * 1.3) ? 1 : 0;
    const cs = isDef(p) && r() < (p.pos === 'G' ? 0.34 : 0.3) + Math.min(0.1, p.apps / 3000);
    const cash = 0.1 + goals * 1.5 + assist * 0.8 + (cs ? (p.pos === 'G' ? 0.9 : 0.7) : 0);
    const change = goals * 0.08 + (goals === 3 ? 0.1 : 0) + assist * 0.05 + (cs ? 0.04 : 0) + (!goals && !assist && !cs ? -0.05 : 0) + (r() - 0.5) * 0.04;
    return { goals, assist, cs, cash, change };
  }
  GM.mbCore = { matchweek, worth, START, SQUAD, WEEKS, FEE, DEADLINE };  // for the balance checks in tools/test
  const resultText = o => o.injured ? '🚑 Injured' : o.away ? '🌍 Away with his country' : o.bench ? '🪑 Benched'
    : [o.goals === 3 ? '⚽⚽⚽ Hat-trick!' : o.goals === 2 ? '⚽⚽ Brace' : o.goals ? '⚽ Scored' : '', o.assist ? '🅰️ Assist' : '', o.cs ? '🧤 Clean sheet' : ''].filter(Boolean).join(' · ') || '😐 Quiet game';

  // the chairman's end-of-season report
  const VERDICTS = [[170, '🧠', 'Moneyball Genius', 'Other chairmen are ringing you for tips.', 'fanfare'], [140, '📈', 'Shrewd Operator', 'The board are drafting you a new contract.', 'bell'],
    [115, '👔', 'Safe Pair of Hands', 'Solid business. The fans are quietly happy.', 'good'], [100, '😐', 'Treading Water', 'Nobody’s getting a statue for this.', 'tricklose'],
    [85, '😬', 'Relegation Accountant', 'The supporters’ trust would like a meeting.', 'boo'], [0, '💀', 'Into Administration', 'The receivers have changed the locks.', 'sacked']];
  // the news: one story a week from week 2 (seeded, so the Daily's is everyone's); some ask you to choose
  const NEWS = {
    bid: { w: 22, need: S => S.squad.length > 0 },
    injury: { w: 12, need: S => S.squad.length > 0 },
    takeover: { w: 9 }, ffp: { w: 9 },
    agent: { w: 12, need: S => S.market.length > 0 },
    potm: { w: 10, need: S => S.squad.some(x => x.pts > 0) },
    tv: { w: 9 }, taxman: { w: 7, need: S => S.cash > 5 },
    intl: { w: 8, need: S => S.squad.length > 0 },
  };

  /* ---------------------------------------------------------------- the game */
  GM.moneyball = function (root, q = {}) {
    const daily = q.daily === '1', day = GM.today();
    const lv = daily ? 'normal' : GM.level();
    if (lv === 'extreme' && !GM.allPlayers) {
      root.innerHTML = `<div class="loading-all"><div class="splash-bar"><i></i></div><p class="muted">Loading every Premier League player…</p></div>`;
      GM.loadAll().then(() => GM.moneyball(root, q)).catch(() => { root.innerHTML += '<p class="center">Couldn’t load the player list.</p>'; });
      return;
    }
    const key = daily ? 'dmoney:' + day : lv === 'hard' ? 'moneyh' : lv === 'extreme' ? 'moneyx' : 'money';
    const title = daily ? 'Daily Moneyball' : 'Moneyball' + (lv === 'hard' ? ' · Hard' : lv === 'extreme' ? ' · Extreme' : '');
    const top = () => `<div class="topbar"><a href="#/" class="back">‹</a><h2>💰 ${title}</h2>${GM.lbButton(key)}</div>`;
    // the Daily: one go, carried on if you leave half-way
    const done = daily && GM.store.get('dmoney2:' + day);  // shown at the bottom, once everything's declared
    const pool = () => (lv === 'extreme' ? GM.allPlayers : GM.players);
    let S = daily && GM.store.get('dmoneyp:' + day);
    if (!S) {
      if (!daily && !q.go) return intro();
      S = { seed: daily ? 'dmoney:' + day : GM.newSeed(), week: 1, cash: START, mood: 1, squad: [], market: [], worthLog: [START], sold: [], news: [], bid: false, phase: 'market' };
      S.market = makeMarket(1);
    }
    const save = () => { if (daily) GM.store.set('dmoneyp:' + day, S); };
    GM.leaveGuard = () => location.hash.startsWith('#/moneyball') && S.week > 1 && S.phase !== 'over' && !daily;

    function intro() {
      root.innerHTML = `${top()}<div class="mb-intro">
        <div class="mb-hero">💼</div><h3>Chairman for a season</h3>
        <p>You’ve got <b>${money(START)}</b> and room for <b>${SQUAD}</b> players. The market prices <b>reputation</b>; what a player’s <b>really</b> worth is what he does on the pitch.</p>
        <ul class="how-list"><li>🛒 Buy four-a-week bargains. Sell any time (the agent takes 10%).</li>
          <li>⚽ Every week your players play: goals, assists and clean sheets earn prize money and push their value up.</li>
          <li>📰 News every week: bids for your stars, injuries, takeovers, tips…</li>
          <li>⏰ Week ${WEEKS} is Deadline Day. At full time your score is your <b>net worth</b>.</li></ul>
        ${lv === 'hard' ? '<p class="muted">🥵 Hard: names and positions only.</p>' : lv === 'extreme' ? '<p class="muted">⚡ Extreme: all 5,000+ PL players on the market. Penny stocks!</p>' : ''}
        <button class="btn big" id="mbgo">▶ Start the season</button></div>`;
      GM.$('#mbgo', root).onclick = () => GM.moneyball(root, { ...q, go: 1 });
    }

    function makeMarket(week) {
      const r = GM.rng(`${S.seed}|mk${week}`), owned = new Set(S.squad.map(x => x.k)), out = [], P = pool();
      for (let t = 0; t < 400 && out.length < 4; t++) {
        const p = P[r.int(P.length)];
        if (owned.has(p.pk) || out.some(o => o.k === p.pk) || p.apps < 3) continue;
        const full = round1(GM.market.price(p, S.seed) * S.mood);
        out.push({ k: p.pk, ask: week === WEEKS ? Math.max(1, round1(full * DEADLINE)) : full, full });
      }
      return out;
    }
    const squadValue = () => S.squad.reduce((t, x) => t + x.value, 0);
    const net = () => S.cash + squadValue();

    /* ---- the look: a counting net worth, line charts, sparks */
    let shown = null;  // the net worth last on screen, so the counter can count from it
    function countUp(el, from, to, ms = 900) {
      if (!el) return;
      const t0 = performance.now();
      const f = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = money(from + (to - from) * e); if (k < 1 && el.isConnected) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }
    let gid = 0;
    // a line chart of values (gold line, green or red fill against the £100m start)
    function chart(vals, w, h, opts = {}) {
      if (vals.length < 2) vals = [vals[0], vals[0]];
      const base = opts.base, all = base != null ? vals.concat(base) : vals, mx = Math.max(...all), mn = Math.min(...all), sp = Math.max(1e-6, mx - mn);
      const y = v => (h - 6 - (h - 12) * (v - mn) / sp).toFixed(1), x = i => (i * w / (vals.length - 1)).toFixed(1);
      const d = vals.map((v, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(v)).join(' '), up = vals[vals.length - 1] >= (base != null ? base : vals[0]), id = 'mbg' + (++gid);
      return `<svg class="mb-svg ${up ? 'up' : 'down'} ${opts.cls || ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".5"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
        ${base != null ? `<line x1="0" x2="${w}" y1="${y(base)}" y2="${y(base)}" class="mbs-base"/>` : ''}
        <path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/><path d="${d}" class="mbs-line"/>
        ${opts.dot ? `<circle cx="${x(vals.length - 1)}" cy="${y(vals[vals.length - 1])}" r="4" class="mbs-dot"/>` : ''}</svg>`;
    }
    function burst(el, n = 30, cols = ['#fde047', '#22c55e', '#fff', '#f59e0b']) {
      if (!el) return;
      const r = el.getBoundingClientRect(), fx = document.createElement('div');
      fx.className = 'mb-fx'; document.body.appendChild(fx);
      for (let k = 0; k < n; k++) {
        const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
        s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${cols[k % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
        fx.appendChild(s);
      }
      setTimeout(() => fx.remove(), 1200);
    }
    const shortName = p => { const w = p.name.split(' '); return w.length > 1 ? w.slice(-1)[0] : p.name; };

    /* ---- news at the start of each week: BREAKING NEWS, full screen */
    const RUMOURS = ['Agent spotted leaving the training ground', 'Fans protest outside the ground', 'Club statement expected at 5pm', 'Medical booked for a mystery signing',
      'Pundits split on the chairman’s strategy', 'Scouts seen at a Championship game', 'Director of football “relaxed” about deadline', 'Fax machine repaired ahead of the window'];
    function news(then) {
      const r = GM.rng(`${S.seed}|news${S.week}`);
      const kinds = Object.keys(NEWS).filter(k => !NEWS[k].need || NEWS[k].need(S));
      const k = r.weighted(kinds, x => NEWS[x].w);
      const best = S.squad.slice().sort((a, b) => b.value - a.value)[0], anyOf = () => S.squad[r.int(S.squad.length)];
      const ticker = r.shuffle(RUMOURS).slice(0, 4).concat(S.market.map(o => `${byPk(o.k).name} “open to a move”`)).join('  ·  ');
      const card = (icon, head, body, btns, tone = '') => {
        const el = document.createElement('div');
        el.className = 'mb-breaking ' + tone;
        el.innerHTML = `<div class="mbb-band"><span class="mbb-live"><i></i>BREAKING NEWS</span><span>Week ${S.week} of ${WEEKS}</span></div>
          <div class="mbb-body"><div class="mbb-icon">${icon}</div><h2>${head}</h2><p>${body}</p><div class="mbb-btns">${btns || '<button class="btn big" data-ok>Carry on</button>'}</div></div>
          <div class="mbb-ticker"><span>${esc(ticker)}  ·  ${esc(ticker)}</span></div>`;
        document.body.appendChild(el);
        GM.sound.play('newsflash');
        return { el, close: () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); } };
      };
      const after = n => setTimeout(() => GM.sound.play(n), 1300);  // each story's own sound, once the sting's done
      const done = (m, line) => { if (line) S.news.push(`Wk ${S.week}: ${line}`); if (m) m.close(); save(); then(); };
      if (k === 'bid') {
        const p = byPk(best.k), clubs = ['Real Madrid', 'Barcelona', 'PSG', 'Bayern Munich', 'Juventus', 'a Saudi Pro League club'];
        const who = r.pick(clubs), offer = round1(best.value * (1.4 + r() * 0.5));
        const m = card('📨', `${who} bid ${money(offer)} for ${esc(p.name)}`, `He’s worth ${money(best.value)} to the market. That’s <b>${pct(offer / best.value - 1)}</b>, and no agent’s fee on this one. Sell, or keep him?`,
          '<button class="btn ghost big" data-no>✋ Keep him</button><button class="btn big" data-yes>💰 Sell</button>', 'gold');
        GM.$('[data-yes]', m.el).onclick = () => { sell(best, offer, true); S.bid = true; GM.sound.play('cash'); burst(m.el.querySelector('[data-yes]')); setTimeout(() => done(m, `sold ${p.name} to ${who} for ${money(offer)}`), 500); };
        GM.$('[data-no]', m.el).onclick = () => {
          const sulk = r() < 0.35; if (sulk) best.value = round1(best.value * 0.9);
          done(m, `turned down ${who} for ${p.name}${sulk ? ' (he sulked: −10%)' : ''}`);
          if (sulk) GM.toast(`😤 ${esc(p.name)} wanted that move: value −10%`);
        };
        return;
      }
      if (k === 'agent') {
        const m = card('🕵️', 'An agent calls…', `For <b>${money(2)}</b> he’ll show you one of this week’s players’ real PL record. Who?`,
          `<div class="mbn-agent">${S.market.map((o, i) => `<button class="btn" data-a="${i}">${esc(byPk(o.k).name)}</button>`).join('')}</div><button class="btn ghost" data-no>No thanks</button>`, 'purple');
        GM.$$('[data-a]', m.el).forEach(b => b.onclick = () => {
          if (S.cash < 2) { GM.toast('Not enough cash'); return; }
          S.cash = round1(S.cash - 2); const o = S.market[+b.dataset.a]; o.tip = true; GM.sound.play('cash');
          done(m, `paid an agent to look at ${byPk(o.k).name}`);
        });
        GM.$('[data-no]', m.el).onclick = () => done(m, '');
        return;
      }
      let m, line;
      if (k === 'injury') {
        const x = anyOf(), p = byPk(x.k), wks = 1 + r.int(2);
        x.out = wks; x.value = round1(x.value * 0.85); after('ambulance');
        m = card('🚑', `${esc(p.name)} injured in training`, `Out for ${wks} week${wks > 1 ? 's' : ''}, and his value drops 15%.`, '', 'red'); line = `${p.name} injured`;
      } else if (k === 'takeover') {
        S.mood = round1(S.mood * 1.15 * 100) / 100; S.squad.forEach(x => { x.value = round1(x.value * 1.15); }); S.market.forEach(o => { o.ask = round1(o.ask * 1.15); o.full = round1(o.full * 1.15); });
        after('jackpot'); m = card('🤑', 'Takeover frenzy!', 'A billionaire’s bought a rival. <b>Every price in the league is up 15%</b>, yours included.', '', 'gold'); line = 'takeover frenzy: prices +15%';
      } else if (k === 'ffp') {
        S.mood = Math.round(S.mood * 0.88 * 100) / 100; S.squad.forEach(x => { x.value = round1(x.value * 0.88); }); S.market.forEach(o => { o.ask = round1(o.ask * 0.88); o.full = round1(o.full * 0.88); });
        after('bad'); m = card('📉', 'FFP crackdown', 'Clubs are selling to balance the books. <b>Every price is down 12%.</b> Bad for your squad, good for shopping.', '', 'red'); line = 'FFP crackdown: prices −12%';
      } else if (k === 'potm') {
        const x = S.squad.slice().sort((a, b) => b.pts - a.pts)[0], p = byPk(x.k);
        x.value = round1(x.value * 1.25); after('cheer');
        m = card('🏅', `${esc(p.name)} wins Player of the Month`, 'His value jumps <b>25%</b>.', '', 'gold'); line = `${p.name} Player of the Month`;
      } else if (k === 'tv') {
        const got = 1 + S.squad.length; S.cash = round1(S.cash + got); after('cash');
        m = card('📺', 'New TV deal signed', `Your share: <b>${money(got)}</b> (£1m, plus £1m for every player in your squad).`, '', 'gold'); line = `TV money +${money(got)}`;
      } else if (k === 'taxman') {
        const bill = round1(S.cash * 0.05); S.cash = round1(S.cash - bill); after('bad');
        m = card('🧾', 'The taxman calls', `Five percent of the cash in the bank: <b>${money(bill)}</b>.`, '', 'red'); line = `tax bill ${money(bill)}`;
      } else if (k === 'intl') {
        const x = anyOf(), p = byPk(x.k); x.away = 1; x.value = round1(x.value * 1.05); after('whistle');
        m = card('🌍', `${esc(p.name)} called up by his country`, 'He misses this week’s game, but the exposure puts <b>5%</b> on his value.'); line = `${p.name} on international duty`;
      }
      GM.$('[data-ok]', m.el).onclick = () => done(m, line);
    }

    /* ---- buying and selling */
    function buy(i) {
      const o = S.market[i];
      if (S.squad.length >= SQUAD) { GM.toast(`Your squad’s full (${SQUAD}). Sell someone first`); return; }
      if (o.ask > S.cash) { GM.toast('Not enough cash'); return; }
      S.cash = round1(S.cash - o.ask);
      S.squad.push({ k: o.k, paid: o.ask, value: o.full, pts: 0, out: 0, hist: [o.full], last: null });
      S.market.splice(i, 1);
      GM.sound.play('place'); GM.buzz();
      if (o.full > o.ask) GM.toast(`✍️ Signed for ${money(o.ask)}, worth ${money(o.full)} already`);
      save(); render();
    }
    function sell(x, amount, noFee) {
      const got = amount != null ? amount : round1(x.value * (1 - FEE));
      S.cash = round1(S.cash + got);
      S.sold.push({ k: x.k, paid: x.paid, got });
      S.squad = S.squad.filter(y => y !== x);
      return got;
    }

    /* ---- the matchweek: a live feed, minute by minute */
    function play() {
      if (S.phase !== 'market') return;
      S.phase = 'playing';
      const before = net();
      const rows = S.squad.map(x => {
        const p = byPk(x.k);
        let o;
        if (x.out > 0) { x.out--; o = { injured: true, cash: 0, change: -0.03 }; }
        else if (x.away) { x.away = 0; o = { away: true, cash: 0, change: 0 }; }
        else o = matchweek(p, S.seed, S.week);
        const was = x.value;
        x.value = round1(Math.max(0.5, x.value * (1 + o.change)));
        x.value = round1(x.value + (worth(p) * S.mood - x.value) * 0.1);  // the market slowly learns what he's worth
        x.pts += (o.goals || 0) * 3 + (o.assist || 0) * 2 + (o.cs ? 2 : 0);
        S.cash = round1(S.cash + o.cash);
        x.hist.push(x.value); x.last = o;
        return { x, p, o, delta: x.value - was };
      });
      S.worthLog.push(round1(net()));
      save();
      // the feed: goals and assists at their minutes, clean sheets at full time
      const feed = [];
      rows.forEach(w => {
        const r = GM.rng(`${S.seed}|min${S.week}|${w.x.k}`), nm = esc(shortName(w.p));
        if (w.o.injured) return feed.push({ m: 0, t: `🚑 ${nm} watches from the stands`, k: 'bad' });
        if (w.o.away) return feed.push({ m: 0, t: `🌍 ${nm} is away with his country`, k: '' });
        if (w.o.bench) return feed.push({ m: 0, t: `🪑 ${nm} left on the bench`, k: 'bad' });
        for (let g = 0; g < w.o.goals; g++) feed.push({ m: 2 + r.int(88), t: `⚽ GOAL! ${nm} scores`, k: 'goal' });
        if (w.o.assist) feed.push({ m: 2 + r.int(88), t: `🅰️ ${nm} sets one up`, k: 'good' });
        if (w.o.cs) feed.push({ m: 90, t: `🧤 Clean sheet for ${nm}`, k: 'good' });
        if (!w.o.goals && !w.o.assist && !w.o.cs) feed.push({ m: 90, t: `😐 A quiet afternoon for ${nm}`, k: '' });
        if (w.o.goals === 3) feed.push({ m: 91, t: `🎩 HAT-TRICK! The match ball goes home with ${nm}`, k: 'hat' });
      });
      feed.sort((a, b) => a.m - b.m);
      const step = 650, total = 400 + feed.length * step;
      const box = GM.$('#mbweek', root);
      box.innerHTML = `<div class="mb-live"><div class="mbl-head"><span><i class="rec"></i>LIVE</span><b>Matchweek ${S.week}</b><span id="mblclock">0'</span></div>
          <div class="mbl-feed">${feed.map((f, i) => `<div class="mbl-ev ${f.k}" style="--d:${400 + i * step}ms"><span>${f.m ? f.m + "'" : '–'}</span>${f.t}</div>`).join('') || '<div class="mbl-ev" style="--d:300ms"><span>–</span>No players, no matches. Sign some!</div>'}</div></div>
        <div class="mb-sum" style="--d:${total}ms">${rows.map((w, i) => `<div class="mbw-row ${w.delta >= 0 ? 'up' : 'down'}" style="--i:${i}">
          ${GM.avatar(w.p, '', lv === 'hard')}<span><b>${esc(w.p.name)}</b><small>${resultText(w.o)}</small></span>
          <span class="mbw-money">${w.o.cash ? '+' + money(w.o.cash) : ''}<small>${w.delta >= 0 ? '▲' : '▼'} ${money(Math.abs(w.delta))}</small></span></div>`).join('')}</div>`;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      GM.sound.play('whistle');
      const clock = GM.$('#mblclock', root);
      feed.forEach((f, i) => setTimeout(() => {
        if (!box.isConnected) return;
        if (clock) clock.textContent = (f.m || 1) + "'";
        GM.sound.play(f.k === 'goal' ? 'cheer' : f.k === 'hat' ? 'jackpot' : f.k === 'bad' ? 'bad' : f.k === 'good' ? 'good' : 'card');
        if (f.k === 'hat') burst(box.querySelectorAll('.mbl-ev')[i], 40);
      }, 400 + i * step));
      setTimeout(() => {
        if (!box.isConnected) return;
        if (clock) clock.textContent = 'FT';
        GM.sound.play('whistle');
        countUp(GM.$('#mbnet', root), before, net(), 1200); shown = net(); GM.sound.play('count', 1.1);
        const hud = GM.$('.mb-hud', root); if (hud) { hud.classList.remove('flash-up', 'flash-down'); void hud.offsetWidth; hud.classList.add(net() >= before ? 'flash-up' : 'flash-down'); }
        if (net() > before) GM.sound.play('cash');
      }, total);
      GM.$('#mbplay', root).outerHTML = `<button class="btn big" id="mbnext">${S.week === WEEKS ? '🏁 Full time' : `▶ Week ${S.week + 1}`}</button>`;
      GM.$('#mbnext', root).onclick = next;
    }
    function next() {
      if (S.week === WEEKS) return end();
      S.week++; S.phase = 'market';
      S.market = makeMarket(S.week);
      save(); render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (S.week === WEEKS) { GM.sound.play('siren'); GM.buzz(80); }
      setTimeout(() => news(render), S.week === WEEKS ? 1100 : 350);
    }

    /* ---- the screen: the boardroom */
    function render() {
      const n = net(), from = shown == null ? n : shown;
      const info = p => lv === 'hard' ? `<span class="dc-meta">${GM.posBadges(p)}</span>`
        : `<span class="dc-meta">${GM.posBadges(p)} ${GM.flag(p.nat)}</span><small>${GM.era(p)} · ${p.apps} apps</small><span class="chips">${p.clubs.slice(0, 3).map(c => GM.clubChip(c)).join('')}</span>`;
      const deadline = S.week === WEEKS;
      root.innerHTML = `${top()}
        <div class="mb-hud ${n >= START ? 'up' : 'down'}">
          <div class="mbh-main"><small>NET WORTH</small><b id="mbnet">${money(from)}</b><span class="mbh-ch">${pct(n / START - 1)} on ${money(START)}</span></div>
          ${chart(S.worthLog, 320, 70, { base: START, dot: true, cls: 'mbh-chart' })}
          <div class="mb-top"><div><small>Week</small><b>${S.week}/${WEEKS}</b></div><div><small>💷 Cash</small><b>${money(S.cash)}</b></div><div><small>🧑‍💼 Squad</small><b>${money(n - S.cash)}</b></div></div>
        </div>
        ${deadline ? `<div class="mb-deadline"><div class="mbd-top"><span class="mbd-yellow">DEADLINE DAY</span><span class="mbd-clock" id="mbclock">60:00 to go</span></div>
          <small>Asking prices slashed ${Math.round((1 - DEADLINE) * 100)}%. Last chance to do business.</small>
          <div class="mbb-ticker small"><span>🚁 Helicopter lands at the training ground  ·  📠 The fax machine is warming up  ·  🚗 Agent’s car spotted outside  ·  ⏰ The window shuts at 11pm</span></div></div>` : ''}
        <h3 class="section-title">🧑‍💼 Your squad <small>${S.squad.length}/${SQUAD}</small></h3>
        <div class="mb-cards">${S.squad.map((x, i) => { const p = byPk(x.k), ch = x.value / x.paid - 1;
          return `<div class="mb-card ${ch >= 0 ? 'up' : 'down'}" data-card="${i}">${GM.avatar(p, '', lv === 'hard')}
            <b class="mbc-name">${esc(shortName(p))}</b><span class="mbc-pos">${GM.posBadges(p)}</span>
            <div class="mbc-val">${money(x.value)}</div><small class="mbc-ch">${ch >= 0 ? '▲' : '▼'} ${pct(ch)} <i>paid ${money(x.paid)}</i></small>
            ${chart(x.hist, 120, 26, { base: x.paid, cls: 'mbc-spark' })}
            <small class="mbc-last">${x.out ? `🚑 out ${x.out}w` : x.away ? '🌍 away' : x.last ? resultText(x.last) : '✍️ new signing'}</small>
            <button class="mbc-sell" data-sell="${i}">Sell ${money(x.value * (1 - FEE))}</button></div>`; }).join('')}
          ${Array.from({ length: SQUAD - S.squad.length }, () => '<div class="mb-card empty"><span>+</span><small>Empty slot</small></div>').join('')}</div>
        <h3 class="section-title">🛒 Transfer market</h3>
        <div class="duel-cards mk4 mb-market">${S.market.map((o, i) => { const p = byPk(o.k), tip = o.tip ? `<small class="mb-tip">🕵️ ${p.goals} goals, ${p.ast} assists in ${p.apps}</small>` : '';
          return `<button class="duel-card mk-card" data-buy="${i}" ${o.ask > S.cash || S.squad.length >= SQUAD ? 'disabled' : ''}>${deadline ? `<span class="dc-tag">⏰ −${Math.round((1 - DEADLINE) * 100)}%</span>` : ''}
            ${GM.avatar(p, '', lv === 'hard')}<b>${esc(p.name)}</b>${info(p)}${tip}<span class="mk-price">${deadline ? `<s>${money(o.full)}</s> ` : ''}${money(o.ask)}</span></button>`; }).join('') || '<p class="muted center">Sold out this week.</p>'}</div>
        <div id="mbweek"></div>
        <div class="actions col"><button class="btn big" id="mbplay">⚽ Play matchweek ${S.week}</button></div>
        ${S.news.length ? `<details class="set mb-log"><summary><span>📰 The season so far</span></summary><ul>${S.news.slice().reverse().map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}`;
      if (from !== n) countUp(GM.$('#mbnet', root), from, n, 700);
      shown = n;
      GM.$$('[data-buy]', root).forEach(b => b.onclick = () => buy(+b.dataset.buy));
      GM.$$('[data-sell]', root).forEach(b => b.onclick = async () => {
        const x = S.squad[+b.dataset.sell], p = byPk(x.k), got = round1(x.value * (1 - FEE));
        if (!await GM.confirm(`Sell ${esc(p.name)} for ${money(got)}? (worth ${money(x.value)}, less the agent’s 10%; you paid ${money(x.paid)})`, '💰 Sell', 'Keep')) return;
        const card = b.closest('.mb-card'), profit = got - x.paid;
        sell(x); save();
        GM.sound.play('cash'); GM.buzz(30); setTimeout(() => GM.sound.play('stamp'), 120);
        if (card) { card.insertAdjacentHTML('beforeend', `<div class="mbc-stamp ${profit >= 0 ? 'up' : 'down'}">SOLD<small>${profit >= 0 ? '+' : '−'}${money(Math.abs(profit))}</small></div>`); if (profit > 0) burst(card, 20); }
        setTimeout(render, 900);
      });
      GM.$('#mbplay', root).onclick = play;
      // Deadline Day: the clock runs down to 11pm (for show)
      const clk = GM.$('#mbclock', root);
      if (clk) {
        const t0 = Date.now(), p2 = n => String(n).padStart(2, '0'), tick = () => {
          if (!clk.isConnected) return clearInterval(iv);
          const left = Math.max(0, 3600 - Math.floor((Date.now() - t0) / 1000) * 9);  // an hour to go, at nine times the speed
          clk.textContent = left ? `${p2(Math.floor(left / 60))}:${p2(left % 60)} to go` : 'WINDOW SHUT';
          if (left && left <= 90) GM.sound.play('clock');  // the last ten seconds tick
          if (!left && !clk.dataset.shut) { clk.dataset.shut = 1; GM.sound.play('slam'); GM.buzz(60); }
        };
        const iv = setInterval(tick, 1000); tick();
      }
    }

    async function end() {
      S.phase = 'over';
      const worthAt = round1(net()), cashIn = S.squad.map(x => ({ k: x.k, paid: x.paid, got: x.value }));
      const deals = S.sold.concat(cashIn).map(d => ({ ...d, r: d.got / d.paid }));
      const res = { worth: worthAt, log: S.worthLog, deals, news: S.news, lv };
      if (daily) { GM.store.set('dmoney2:' + day, res); GM.store.set('dmoneyp:' + day, null); GM.markDaily('moneyball', Math.round(worthAt), day); }
      const isBest = Math.round(worthAt) > GM.best(key);
      GM.sound.play('fulltime');
      if (isBest && !daily) setTimeout(() => GM.sound.play('cheer'), 1400);
      fullTime(res, false, isBest);  // before the score's posted (that can ask for your leaderboard name)
      GM.checkGame('money', Math.round(worthAt), { flip: Math.max(0, ...S.sold.map(s => s.got / s.paid)), bid: S.bid });
      await GM.recordScore(key, Math.round(worthAt), { t: Math.round(worthAt) });
    }

    function fullTime(res, seen, isBest) {
      const gain = res.worth / START - 1, best = res.deals.slice().sort((a, b) => b.r - a.r)[0], worst = res.deals.slice().sort((a, b) => a.r - b.r)[0];
      const v = VERDICTS.find(x => res.worth >= x[0]);
      const txt = `💰 Goal Machine – ${title}: turned ${money(START)} into ${money(res.worth)} (${pct(gain)}) ${gain >= 0 ? '📈' : '📉'}\n${v[1]} ${v[2]}${best ? `\nBest deal: ${byPk(best.k).name} ${pct(best.r - 1)}` : ''}`;
      const deal = (d, cls, label) => { const p = byPk(d.k); return `<div class="mb-deal ${cls}">${GM.avatar(p, '', lv === 'hard')}<span><small>${label}</small><b>${esc(p.name)}</b><i>${money(d.paid)} → ${money(d.got)}</i></span><em>${pct(d.r - 1)}</em></div>`; };
      root.innerHTML = `${top()}<div class="mb-report ${gain >= 0 ? 'up' : 'down'}">
        <span class="kicker">The chairman’s report · ${title}</span>
        <div class="mbr-verdict"><span>${v[1]}</span><b>${v[2]}</b><small>${v[3]}</small></div>
        <div class="result mb-result"><div class="result-score ${gain >= 0 ? 'up' : 'down'}"><span id="mbfinal">${money(seen ? res.worth : START)}</span><small>net worth · ${pct(gain)} on ${money(START)}</small></div>
          ${isBest ? '<div class="banner">🏆 New personal best!</div>' : ''}
          ${chart(res.log, 320, 90, { base: START, dot: true, cls: 'mbr-chart' })}
          ${best ? deal(best, 'good', '💎 Deal of the season') : ''}${worst && worst !== best ? deal(worst, 'bad', '💸 One to forget') : ''}
          ${res.news.length ? `<div class="mb-clips">${res.news.slice(-4).map(l => `<div class="mb-clip">📰 ${esc(l.replace(/^Wk (\d+): /, 'Week $1 · '))}</div>`).join('')}</div>` : ''}
          <div class="actions col">${daily ? `<div class="muted">A new season tomorrow (${GM.untilTomorrow()})</div>` : '<button class="btn big" id="mbagain">🔁 New season</button>'}
            <button class="btn ghost" id="mbshare">📤 Share</button><a class="btn ghost" href="#/leaderboard?m=${encodeURIComponent(key)}">🏆 Leaderboard</a></div></div></div>`;
      window.scrollTo(0, 0);
      if (!seen) { countUp(GM.$('#mbfinal', root), START, res.worth, 1600); GM.sound.play('count', 1.5); setTimeout(() => GM.sound.play(v[4]), 1600); if (gain > 0.3) setTimeout(() => burst(GM.$('.mbr-verdict', root), 50), 1500); }
      const again = GM.$('#mbagain', root); if (again) again.onclick = () => GM.moneyball(root, { ...q, go: 1 });
      GM.$('#mbshare', root).onclick = () => GM.share(txt, GM.baseUrl() + (daily ? '#/moneyball?daily=1' : '#/moneyball'));
    }

    if (done) return fullTime(done, true);
    render();
    if (S.phase === 'playing') next();  // left while a matchweek was showing: it's played, so on to the next week
  };
})();

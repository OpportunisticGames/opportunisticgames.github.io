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
    if (daily && GM.store.get('dmoney2:' + day)) return fullTime(GM.store.get('dmoney2:' + day), true);
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

    /* ---- news at the start of each week */
    function news(then) {
      const r = GM.rng(`${S.seed}|news${S.week}`);
      const kinds = Object.keys(NEWS).filter(k => !NEWS[k].need || NEWS[k].need(S));
      const k = r.weighted(kinds, x => NEWS[x].w);
      const best = S.squad.slice().sort((a, b) => b.value - a.value)[0], anyOf = () => S.squad[r.int(S.squad.length)];
      const card = (icon, head, body, btns) => {
        const m = GM.modal(`<div class="mb-news"><div class="mbn-icon">${icon}</div><span class="kicker">Week ${S.week} · News</span><h3>${head}</h3><p>${body}</p><div class="row">${btns || '<button class="btn big" data-ok>OK</button>'}</div></div>`);
        return m;
      };
      const done = (m, line) => { if (line) S.news.push(`Wk ${S.week}: ${line}`); if (m) m.close(); save(); then(); };
      if (k === 'bid') {
        const p = byPk(best.k), clubs = ['Real Madrid', 'Barcelona', 'PSG', 'Bayern Munich', 'Juventus', 'a Saudi Pro League club'];
        const who = r.pick(clubs), offer = round1(best.value * (1.4 + r() * 0.5));
        const m = card('📨', `${who} want ${esc(p.name)}`, `They’ve bid <b>${money(offer)}</b> (he’s worth ${money(best.value)} to the market). No agent’s fee on this one.`,
          '<button class="btn ghost" data-no>Keep him</button><button class="btn big" data-yes>💰 Sell</button>');
        GM.sound.play('cash');
        GM.$('[data-yes]', m.el).onclick = () => { sell(best, offer, true); S.bid = true; done(m, `sold ${p.name} to ${who} for ${money(offer)}`); };
        GM.$('[data-no]', m.el).onclick = () => {
          const sulk = r() < 0.35; if (sulk) best.value = round1(best.value * 0.9);
          done(m, `turned down ${who} for ${p.name}${sulk ? ' (he sulked: −10%)' : ''}`);
          if (sulk) GM.toast(`😤 ${esc(p.name)} wanted that move: value −10%`);
        };
        return;
      }
      if (k === 'agent') {
        const m = card('🕵️', 'An agent calls', `For <b>${money(2)}</b> he’ll show you one player’s real PL record. Who?`,
          `<div class="mbn-agent">${S.market.map((o, i) => `<button class="btn" data-a="${i}">${esc(byPk(o.k).name)}</button>`).join('')}</div><button class="btn ghost" data-no>No thanks</button>`);
        GM.$$('[data-a]', m.el).forEach(b => b.onclick = () => {
          if (S.cash < 2) { GM.toast('Not enough cash'); return; }
          S.cash = round1(S.cash - 2); const o = S.market[+b.dataset.a]; o.tip = true;
          done(m, `paid an agent to look at ${byPk(o.k).name}`);
        });
        GM.$('[data-no]', m.el).onclick = () => done(m, '');
        return;
      }
      let m, line;
      if (k === 'injury') {
        const x = anyOf(), p = byPk(x.k), wks = 1 + r.int(2);
        x.out = wks; x.value = round1(x.value * 0.85); GM.sound.play('bad');
        m = card('🚑', `${esc(p.name)} is injured`, `Out for ${wks} week${wks > 1 ? 's' : ''}, and his value drops 15%.`); line = `${p.name} injured`;
      } else if (k === 'takeover') {
        S.mood = round1(S.mood * 1.15 * 100) / 100; S.squad.forEach(x => { x.value = round1(x.value * 1.15); }); S.market.forEach(o => { o.ask = round1(o.ask * 1.15); o.full = round1(o.full * 1.15); });
        GM.sound.play('cash'); m = card('🤑', 'Takeover frenzy!', 'A billionaire’s bought a rival. Every price in the league is up 15%, yours included.'); line = 'takeover frenzy: prices +15%';
      } else if (k === 'ffp') {
        S.mood = Math.round(S.mood * 0.88 * 100) / 100; S.squad.forEach(x => { x.value = round1(x.value * 0.88); }); S.market.forEach(o => { o.ask = round1(o.ask * 0.88); o.full = round1(o.full * 0.88); });
        GM.sound.play('bad'); m = card('📉', 'FFP crackdown', 'Clubs are selling to balance the books. Every price is down 12%. Bad for your squad, good for shopping.'); line = 'FFP crackdown: prices −12%';
      } else if (k === 'potm') {
        const x = S.squad.slice().sort((a, b) => b.pts - a.pts)[0], p = byPk(x.k);
        x.value = round1(x.value * 1.25); GM.sound.play('cheer');
        m = card('🏅', `${esc(p.name)}: Player of the Month`, 'His value jumps 25%.'); line = `${p.name} Player of the Month`;
      } else if (k === 'tv') {
        const got = 1 + S.squad.length; S.cash = round1(S.cash + got); GM.sound.play('cash');
        m = card('📺', 'New TV deal', `Your share: <b>${money(got)}</b> (£1m, plus £1m for every player in your squad).`); line = `TV money +${money(got)}`;
      } else if (k === 'taxman') {
        const bill = round1(S.cash * 0.05); S.cash = round1(S.cash - bill); GM.sound.play('bad');
        m = card('🧾', 'The taxman calls', `Five percent of the cash in the bank: <b>${money(bill)}</b>.`); line = `tax bill ${money(bill)}`;
      } else if (k === 'intl') {
        const x = anyOf(), p = byPk(x.k); x.away = 1; x.value = round1(x.value * 1.05);
        m = card('🌍', `${esc(p.name)} called up`, 'He misses this week’s game on international duty, but the exposure puts 5% on his value.'); line = `${p.name} on international duty`;
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
      GM.sound.play('place'); GM.buzz(); save(); render();
    }
    function sell(x, amount, noFee) {
      const got = amount != null ? amount : round1(x.value * (1 - FEE));
      S.cash = round1(S.cash + got);
      S.sold.push({ k: x.k, paid: x.paid, got });
      S.squad = S.squad.filter(y => y !== x);
      if (!noFee) GM.sound.play('cash');
    }

    /* ---- the matchweek */
    function play() {
      if (S.phase !== 'market') return;
      S.phase = 'playing';
      const rows = S.squad.map(x => {
        const p = byPk(x.k);
        let o;
        if (x.out > 0) { x.out--; o = { injured: true, cash: 0, change: -0.03 }; }
        else if (x.away) { x.away = 0; o = { away: true, cash: 0, change: 0 }; }
        else o = matchweek(p, S.seed, S.week);
        const before = x.value;
        x.value = round1(Math.max(0.5, x.value * (1 + o.change)));
        x.value = round1(x.value + (worth(p) * S.mood - x.value) * 0.1);  // the market slowly learns what he's worth
        x.pts += (o.goals || 0) * 3 + (o.assist || 0) * 2 + (o.cs ? 2 : 0);
        S.cash = round1(S.cash + o.cash);
        x.hist.push(x.value); x.last = o;
        return { x, p, o, delta: x.value - before };
      });
      S.worthLog.push(round1(net()));
      save();
      const box = GM.$('#mbweek', root);
      box.innerHTML = `<h3 class="section-title">⚽ Matchweek ${S.week}</h3>` + (rows.length ? rows.map((w, i) => `<div class="mbw-row" style="--i:${i}">
          ${GM.avatar(w.p, '', lv === 'hard')}<span><b>${esc(w.p.name)}</b><small>${resultText(w.o)}</small></span>
          <span class="mbw-money">${w.o.cash ? '+' + money(w.o.cash) : ''}<small class="${w.delta >= 0 ? 'up' : 'down'}">${w.delta >= 0 ? '▲' : '▼'} ${money(Math.abs(w.delta))}</small></span></div>`).join('')
        : '<p class="muted center">No players, no matches. Sign some next week!</p>');
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      rows.forEach((w, i) => setTimeout(() => GM.sound.play(w.o.goals ? 'good' : w.o.injured || w.delta < 0 ? 'place' : 'card'), 300 + i * 450));
      GM.$('#mbplay', root).outerHTML = `<button class="btn big" id="mbnext">${S.week === WEEKS ? '🏁 Full time' : `▶ Week ${S.week + 1}`}</button>`;
      GM.$('#mbnext', root).onclick = next;
    }
    function next() {
      if (S.week === WEEKS) return end();
      S.week++; S.phase = 'market';
      S.market = makeMarket(S.week);
      save(); render();
      if (S.week === WEEKS) GM.toast(`⏰ <b>Deadline Day!</b> Asking prices down ${Math.round((1 - DEADLINE) * 100)}%`, 3000);
      setTimeout(() => news(render), S.week === WEEKS ? 900 : 300);
    }

    /* ---- the screen */
    function render() {
      const n = net(), mx = Math.max(...S.worthLog, n) || 1, mn = Math.min(...S.worthLog, n);
      const bars = S.worthLog.map(v => `<i style="height:${8 + 52 * (v - mn) / Math.max(1, mx - mn)}px" title="${money(v)}"></i>`).join('');
      const info = p => lv === 'hard' ? `<span class="dc-meta">${GM.posBadges(p)}</span>`
        : `<span class="dc-meta">${GM.posBadges(p)} ${GM.flag(p.nat)}</span><small>${GM.era(p)} · ${p.apps} apps</small><span class="chips">${p.clubs.slice(0, 3).map(c => GM.clubChip(c)).join('')}</span>`;
      root.innerHTML = `${top()}
        <div class="mb-top"><div><small>Week</small><b>${S.week}/${WEEKS}</b></div><div><small>💷 Cash</small><b>${money(S.cash)}</b></div>
          <div><small>📈 Net worth</small><b class="${n >= START ? 'up' : 'down'}">${money(n)}</b></div></div>
        <div class="mb-chart" aria-hidden="true">${bars}<i class="now" style="height:${8 + 52 * (n - mn) / Math.max(1, mx - mn)}px"></i></div>
        ${S.week === WEEKS ? '<div class="mb-deadline">⏰ DEADLINE DAY · asking prices slashed</div>' : ''}
        <h3 class="section-title">🧑‍💼 Your squad <small>${S.squad.length}/${SQUAD}</small></h3>
        <div class="mb-squad">${S.squad.map((x, i) => { const p = byPk(x.k), ch = x.value / x.paid - 1;
          return `<div class="mb-row">${GM.avatar(p, '', lv === 'hard')}<span class="mbr-name"><b>${esc(p.name)}</b><small>${GM.posBadges(p)} ${x.out ? `🚑 out ${x.out}w` : x.away ? '🌍 away' : x.last ? resultText(x.last) : 'new signing'}</small></span>
            <span class="mbr-val"><b>${money(x.value)}</b><small class="${ch >= 0 ? 'up' : 'down'}">paid ${money(x.paid)} · ${pct(ch)}</small></span>
            <button class="btn small ghost" data-sell="${i}">Sell ${money(x.value * (1 - FEE))}</button></div>`; }).join('') || '<p class="muted center">No players yet. Buy some below.</p>'}</div>
        <h3 class="section-title">🛒 Transfer market</h3>
        <div class="duel-cards mk4 mb-market">${S.market.map((o, i) => { const p = byPk(o.k), tip = o.tip ? `<small class="mb-tip">🕵️ ${p.goals} goals, ${p.ast} assists in ${p.apps}</small>` : '';
          return `<button class="duel-card mk-card" data-buy="${i}" ${o.ask > S.cash || S.squad.length >= SQUAD ? 'disabled' : ''}>${S.week === WEEKS ? '<span class="dc-tag">⏰ Cut-price</span>' : ''}
            ${GM.avatar(p, '', lv === 'hard')}<b>${esc(p.name)}</b>${info(p)}${tip}<span class="mk-price">${money(o.ask)}</span></button>`; }).join('') || '<p class="muted center">Sold out this week.</p>'}</div>
        <div id="mbweek"></div>
        <div class="actions col"><button class="btn big" id="mbplay">⚽ Play week ${S.week}</button></div>
        ${S.news.length ? `<details class="set mb-log"><summary><span>📰 The season so far</span></summary><ul>${S.news.slice().reverse().map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}`;
      GM.$$('[data-buy]', root).forEach(b => b.onclick = () => buy(+b.dataset.buy));
      GM.$$('[data-sell]', root).forEach(b => b.onclick = async () => {
        const x = S.squad[+b.dataset.sell], p = byPk(x.k), got = round1(x.value * (1 - FEE));
        if (!await GM.confirm(`Sell ${esc(p.name)} for ${money(got)}? (worth ${money(x.value)}, less the agent’s 10%; you paid ${money(x.paid)})`, '💰 Sell', 'Keep')) return;
        sell(x); save(); render();
      });
      GM.$('#mbplay', root).onclick = play;
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
      const mx = Math.max(...res.log), mn = Math.min(...res.log);
      const txt = `💰 Goal Machine – ${title}: turned ${money(START)} into ${money(res.worth)} (${pct(gain)}) ${gain >= 0 ? '📈' : '📉'}${best ? `\nBest deal: ${byPk(best.k).name} ${pct(best.r - 1)}` : ''}`;
      root.innerHTML = `${top()}<div class="result mb-result">
        <div class="result-score ${gain >= 0 ? 'up' : 'down'}">${money(res.worth)}<small>net worth · ${pct(gain)} on ${money(START)}</small></div>
        ${isBest ? '<div class="banner">🏆 New personal best!</div>' : ''}
        <div class="mb-chart big">${res.log.map(v => `<i style="height:${8 + 70 * (v - mn) / Math.max(1, mx - mn)}px" title="${money(v)}"></i>`).join('')}</div>
        ${best ? `<div class="verdict good">💎 Best deal: ${esc(byPk(best.k).name)}, ${money(best.paid)} → ${money(best.got)} (${pct(best.r - 1)})</div>` : ''}
        ${worst && worst !== best ? `<div class="verdict bad">💸 Worst: ${esc(byPk(worst.k).name)}, ${money(worst.paid)} → ${money(worst.got)} (${pct(worst.r - 1)})</div>` : ''}
        ${res.news.length ? `<details class="set mb-log"><summary><span>📰 Your season</span></summary><ul>${res.news.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}
        <div class="actions col">${daily ? `<div class="muted">A new season tomorrow (${GM.untilTomorrow()})</div>` : '<button class="btn big" id="mbagain">🔁 New season</button>'}
          <button class="btn ghost" id="mbshare">📤 Share</button><a class="btn ghost" href="#/leaderboard?m=${encodeURIComponent(key)}">🏆 Leaderboard</a></div></div>`;
      const again = GM.$('#mbagain', root); if (again) again.onclick = () => GM.moneyball(root, { ...q, go: 1 });
      GM.$('#mbshare', root).onclick = () => GM.share(txt, GM.baseUrl() + (daily ? '#/moneyball?daily=1' : '#/moneyball'));
    }

    render();
    if (S.phase === 'playing') next();  // left while a matchweek was showing: it's played, so on to the next week
  };
})();

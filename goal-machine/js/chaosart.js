/* Goal Machine – CHAOS artwork: drawn things for moments and wildcards (no emojis), the little scenes that play over
   the pitch, the weather and the drawn leftovers. draft.js uses GM.CFX; everything here is decoration only. */
'use strict';

(function () {
  // a little person (side on): skin, shirt, shorts/legs, extra classes; arms and legs swing while they're .walking
  const PERSON = (skin, top, legs, cls = '', head = '') => `<svg class="spr per ${cls}" viewBox="0 0 20 34" width="20" height="34"><circle cx="10" cy="5" r="4" fill="${skin}"/>${head}
    <path d="M10 9v12" stroke="${top}" stroke-width="5" stroke-linecap="round"/><g class="arm a1"><path d="M10 11l-6 6" stroke="${top}" stroke-width="2.4" stroke-linecap="round"/></g>
    <g class="arm a2"><path d="M10 11l6 6" stroke="${top}" stroke-width="2.4" stroke-linecap="round"/></g>
    <g class="leg l1"><path d="M10 21l-4 11" stroke="${legs}" stroke-width="2.8" stroke-linecap="round"/></g><g class="leg l2"><path d="M10 21l4 11" stroke="${legs}" stroke-width="2.8" stroke-linecap="round"/></g></svg>`;
  const BALACLAVA = '<path d="M6 5a4 4 0 0 1 8 0v2H6z" fill="#111"/><rect x="7" y="4" width="6" height="1.6" rx=".8" fill="#f2c4a0"/>';
  const WHEEL = x => `<g transform="translate(${x} 37)"><g class="whl"><circle r="7" fill="#1d1f24"/><circle r="3.4" fill="#c4c9d2"/><rect x="-0.9" y="-6.4" width="1.8" height="12.8" fill="#6b717c"/></g></g>`;
  const FLARE = '<svg viewBox="0 0 30 40" width="30" height="40"><circle class="smoke" cx="15" cy="12" r="11" fill="rgba(255,60,60,.45)"/><rect x="12" y="20" width="6" height="16" rx="2" fill="#d22"/><circle class="spark" cx="15" cy="20" r="4" fill="#ffd34d"/></svg>';
  const CARD = (fill, txt = '') => `<svg viewBox="0 0 20 28" width="20" height="28"><rect x="1" y="1" width="18" height="26" rx="2" fill="${fill}" stroke="rgba(0,0,0,.4)"/>${txt}</svg>`;

  // vehicles (side on, facing right, like the ones in draft.js)
  const SPRITE = {
    bus: `<svg class="spr" viewBox="0 0 120 46" width="120" height="46"><rect x="2" y="6" width="114" height="30" rx="6" fill="#1d4ed8" stroke="#163a9e"/>
      <rect x="2" y="24" width="114" height="5" fill="#f6d31e"/>${[8, 26, 44, 62, 80].map(x => `<rect x="${x}" y="10" width="15" height="11" rx="2" fill="#9fd8ff"/>`).join('')}
      <path d="M98 10h12q4 0 4 5v6H98z" fill="#9fd8ff"/><text x="50" y="34.5" font-size="5" font-weight="900" font-family="Arial" fill="#163a9e" text-anchor="middle">TEAM COACH</text>${WHEEL(22)}${WHEEL(96)}</svg>`,
    coach: `<svg class="spr" viewBox="0 0 120 46" width="120" height="46"><rect x="2" y="6" width="114" height="30" rx="6" fill="#f2f2ee" stroke="#9aa3ae"/>
      ${[8, 26, 44, 62, 80].map(x => `<rect x="${x}" y="10" width="15" height="10" rx="2" fill="#3b4a5c"/>`).join('')}<path d="M98 10h12q4 0 4 5v6H98z" fill="#8fd0ff"/>
      <rect x="10" y="23" width="80" height="9" rx="2" fill="#e3262f"/><text x="50" y="30" font-size="6.5" font-weight="900" font-family="Arial" fill="#fff" text-anchor="middle">BACK FROM LOAN</text>${WHEEL(22)}${WHEEL(96)}</svg>`,
    // the open-top victory bus
    parade: `<svg class="spr" viewBox="0 0 120 52" width="120" height="52"><rect x="2" y="16" width="114" height="26" rx="5" fill="#e3262f" stroke="#9a1219"/>
      <path d="M2 16h114" stroke="#fff" stroke-width="2"/><rect x="2" y="30" width="114" height="4" fill="#ffd34d"/>${[14, 30, 46, 62, 78, 94].map((x, k) => `<g class="fan f${k % 3}"><circle cx="${x}" cy="8" r="3.4" fill="#f2c4a0"/><path d="M${x} 11v6M${x} 12l-4-6M${x} 12l4-6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`).join('')}
      <path class="cup" d="M54 0h8l-1 6q-3 3-6 0z" fill="#ffd34d"/><text x="58" y="27" font-size="7" font-weight="900" font-family="Arial" fill="#fff" text-anchor="middle">CHAMPIONS</text>${WHEEL(22)}${WHEEL(96)}</svg>`,
    tvvan: `<svg class="spr" viewBox="0 0 90 50" width="90" height="50"><path d="M2 40V18q0-4 4-4h52v26z" fill="#fbfbf7" stroke="#9aa3ae"/><path d="M58 18h14l14 12v10H58z" fill="#fbfbf7" stroke="#9aa3ae"/>
      <path d="M61 21h10l9 8H61z" fill="#8fd0ff"/><rect x="8" y="22" width="44" height="10" rx="2" fill="#7c3aed"/><text x="30" y="29.5" font-size="7" font-weight="900" font-family="Arial" fill="#fff" text-anchor="middle">TV MONEY</text>
      <path d="M22 14l6-9 6 9" fill="none" stroke="#666" stroke-width="2"/><ellipse class="dish" cx="28" cy="5" rx="8" ry="3.2" fill="#ccd" stroke="#889"/>${WHEEL(16).replace('37', '41')}${WHEEL(72).replace('37', '41')}</svg>`,
  };

  // drawn leftovers and marks (key '#name' in draft.js's MESS / marks)
  const LEFT = {
    pants: () => `<svg viewBox="0 0 30 22" width="26" height="19"><path d="M2 3h26l-3 17-8-6-2 0-8 6z" fill="#ff5ec8" stroke="#a3206f"/><path d="M2 6h26" stroke="#fff" stroke-width="2"/></svg>`,
    paws: () => `<svg viewBox="0 0 40 22" width="36" height="20">${[[6, 14], [18, 6], [30, 14]].map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="3.4" ry="2.8" fill="#4a3424"/><circle cx="-3" cy="-1.5" r="1.2" fill="#4a3424"/><circle cx="0" cy="-2.6" r="1.2" fill="#4a3424"/><circle cx="3" cy="-1.5" r="1.2" fill="#4a3424"/></g>`).join('')}</svg>`,
    vuvu: () => `<svg viewBox="0 0 44 16" width="40" height="15"><path d="M2 7h8l30-6v14L10 9H2z" fill="#ffd400" stroke="#9a7a00"/><ellipse cx="40" cy="8" rx="2.5" ry="7" fill="#e3b800"/></svg>`,
    receipt: () => `<svg viewBox="0 0 22 30" width="19" height="26"><path d="M2 1h18v27l-3-2-3 2-3-2-3 2-3-2-3 2z" fill="#fff" stroke="#aaa"/><path d="M5 7h12M5 11h12M5 15h8M5 21h12" stroke="#999" stroke-width="1.4"/><text x="11" y="25" font-size="4" font-weight="900" font-family="Arial" fill="#e3262f" text-anchor="middle">TAX</text></svg>`,
    trophy: () => `<svg viewBox="0 0 30 32" width="24" height="26"><path d="M8 2h14v8q0 8-7 9-7-1-7-9z" fill="#ffd34d" stroke="#a67c00"/><path d="M8 4H3q0 7 6 8M22 4h5q0 7-6 8" fill="none" stroke="#a67c00" stroke-width="1.6"/><path d="M13 19h4v5h-4z" fill="#e2b33a"/><rect x="8" y="24" width="14" height="5" rx="1" fill="#7a4b22"/></svg>`,
    chute: () => `<svg viewBox="0 0 34 34" width="28" height="28"><path d="M2 14q15-16 30 0z" fill="#ff8a3d" stroke="#b24f12"/><path d="M2 14l15 14 15-14M10 14l7 14 7-14" fill="none" stroke="#777" stroke-width=".8"/><rect x="13" y="26" width="8" height="6" rx="1" fill="#8a6a44"/></svg>`,
    crate: () => `<svg viewBox="0 0 28 26" width="24" height="22"><rect x="2" y="6" width="24" height="18" fill="#b98a4e" stroke="#6b4a22"/><path d="M2 6l24 18M26 6L2 24" stroke="#6b4a22" stroke-width="1.6"/><path d="M0 4l12-4 16 4-12 3z" fill="#d5a565" stroke="#6b4a22"/></svg>`,
    shirt: () => `<svg viewBox="0 0 30 26" width="26" height="22"><path d="M9 2l-7 4 3 6 4-2v14h12V10l4 2 3-6-7-4q-2 3-6 3t-6-3z" fill="#7c3aed" stroke="#3b1a80"/><path d="M9 10h12M9 14h12M9 18h12" stroke="#ffd34d" stroke-width="1.6"/></svg>`,
    crown: () => `<svg viewBox="0 0 30 22" width="26" height="19"><path d="M2 18l2-14 7 7 4-9 4 9 7-7 2 14z" fill="#ffd34d" stroke="#a67c00"/><circle cx="15" cy="14" r="2" fill="#e3262f"/><circle cx="8" cy="15" r="1.4" fill="#2f7bff"/><circle cx="22" cy="15" r="1.4" fill="#2f7bff"/></svg>`,
    moneybag: () => `<svg viewBox="0 0 28 30" width="24" height="26"><path d="M10 6h8l-2 4h-4z" fill="#a67c00"/><path d="M12 10h4q10 6 9 14-1 5-11 5T3 24q-1-8 9-14z" fill="#e2b33a" stroke="#8a6406"/><text x="14" y="25" font-size="10" font-weight="900" font-family="Arial" fill="#6b4a00" text-anchor="middle">£</text></svg>`,
    mask: () => `<svg viewBox="0 0 30 18" width="26" height="16"><path d="M2 4q13-4 26 0-1 10-7 11-4 0-6-4-2 4-6 4-6-1-7-11z" fill="#111"/><ellipse cx="9" cy="8" rx="3" ry="2" fill="#f2c4a0"/><ellipse cx="21" cy="8" rx="3" ry="2" fill="#f2c4a0"/></svg>`,
    arrows: () => `<svg viewBox="0 0 30 22" width="26" height="19"><path d="M3 7h18l-4-4M27 15H9l4 4" fill="none" stroke="#5ec8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    suitcase: () => `<svg viewBox="0 0 30 26" width="26" height="22"><path d="M11 4h8v4h-2V6h-4v2h-2z" fill="#333"/><rect x="2" y="8" width="26" height="16" rx="3" fill="#2b6cb0" stroke="#163a6e"/><circle cx="9" cy="14" r="3" fill="#e3262f"/><rect x="15" y="12" width="7" height="5" rx="1" fill="#ffd34d"/><circle cx="20" cy="20" r="2.4" fill="#fff"/></svg>`,
    clock: () => `<svg viewBox="0 0 26 26" width="22" height="22"><circle cx="13" cy="13" r="11" fill="#fff" stroke="#333" stroke-width="2"/><path d="M13 6v7l5 3" stroke="#e3262f" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
    splat: () => `<svg viewBox="0 0 30 24" width="26" height="21"><path d="M15 3q4 4 7 1 1 5 6 5-3 4 0 7-5 0-6 5-3-3-7 0-1-5-6-4 2-4-1-7 5 0 6-5 3 2 1-2z" fill="#f2f2ea" stroke="#c8c8b8"/><circle cx="15" cy="13" r="3.5" fill="#d8d8c6"/></svg>`,
    burst: () => `<svg viewBox="0 0 30 30" width="26" height="26"><path d="M15 1l3 9 9-4-5 8 8 4-9 2 3 9-8-5-6 8-1-9-9 1 6-7-6-6 9-1z" fill="#ff8a3d" stroke="#b24f12"/><circle cx="15" cy="16" r="4" fill="#ffe14a"/></svg>`,
    mic: () => `<svg viewBox="0 0 16 30" width="13" height="26"><rect x="4" y="1" width="8" height="12" rx="4" fill="#333"/><path d="M2 10q0 7 6 7t6-7" fill="none" stroke="#666" stroke-width="1.5"/><path d="M8 17v10M4 28h8" stroke="#666" stroke-width="1.8"/></svg>`,
    note: () => `<svg viewBox="0 0 16 20" width="14" height="18"><path d="M6 15V3l8-2v12" fill="none" stroke="#fff" stroke-width="1.8"/><ellipse cx="4" cy="16" rx="3.4" ry="2.5" fill="#fff"/><ellipse cx="12" cy="14" rx="3.4" ry="2.5" fill="#fff"/></svg>`,
    snowman: () => `<svg viewBox="0 0 24 32" width="20" height="27"><circle cx="12" cy="22" r="8" fill="#fff" stroke="#cdd"/><circle cx="12" cy="10" r="5.5" fill="#fff" stroke="#cdd"/><path d="M12 10l5 1-5 1z" fill="#ff8a3d"/><circle cx="10" cy="8.5" r=".9"/><circle cx="14" cy="8.5" r=".9"/><path d="M7 14h10" stroke="#e3262f" stroke-width="2.4"/></svg>`,
    pie: () => `<svg viewBox="0 0 30 20" width="24" height="16"><path d="M2 10h26l-3 8H5z" fill="#c98a3c" stroke="#7a4b22"/><path d="M2 10q13-12 26 0z" fill="#e8b45a" stroke="#7a4b22"/><path d="M9 6l2 2M15 4v3M21 6l-2 2" stroke="#7a4b22" stroke-width="1.2"/></svg>`,
    glove: () => `<svg viewBox="0 0 24 28" width="20" height="24"><path d="M5 26V12q0-2 2-2V4q0-2 2-2t2 2v6V3q0-2 2-2t2 2v7V4q0-2 2-2t2 2v8l2-3q2-2 3 0l-4 9v8z" fill="#5ec8ff" stroke="#1d6fa3"/><rect x="5" y="22" width="14" height="5" fill="#1d6fa3"/></svg>`,
    sponge: () => `<svg viewBox="0 0 30 22" width="24" height="18"><rect x="2" y="4" width="26" height="15" rx="4" fill="#ffd34d" stroke="#b08a00"/><circle cx="8" cy="9" r="1.6" fill="#d4a800"/><circle cx="15" cy="13" r="2" fill="#d4a800"/><circle cx="22" cy="8" r="1.4" fill="#d4a800"/><path d="M6 1q2 2 0 3M14 0q2 2 0 3M22 1q2 2 0 3" stroke="#7fc8ff" stroke-width="1.4" fill="none"/></svg>`,
    fox: () => `<svg viewBox="0 0 30 26" width="24" height="21"><path d="M3 2l7 7h10l7-7-1 12q-3 9-11 11-8-2-11-11z" fill="#ff8a3d" stroke="#a84a10"/><path d="M8 15q7 9 14 0-2 8-7 9-5-1-7-9z" fill="#fff"/><circle cx="11" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/><circle cx="15" cy="19" r="1.6"/></svg>`,
    banana: () => `<svg viewBox="0 0 30 22" width="24" height="18"><path d="M3 6q4 13 24 10-3 3-10 4Q4 20 3 6z" fill="#ffe14a" stroke="#a88a00"/><path d="M3 6l-1-3 3 1z" fill="#6b4a22"/><path d="M12 18l-4 3M18 18l2 3" stroke="#e8c800" stroke-width="2"/></svg>`,
    poo: () => `<svg viewBox="0 0 30 24" width="24" height="19"><path d="M15 2q3 2 1 5 6 0 6 5 5 1 4 6-1 4-11 4T4 18q-1-5 4-6 0-5 6-5-2-3 1-5z" fill="#7a4b22" stroke="#4a2c10"/><circle cx="12" cy="13" r="1.4" fill="#fff"/><circle cx="18" cy="13" r="1.4" fill="#fff"/></svg>`,
    party: () => `<svg viewBox="0 0 30 30" width="26" height="26"><path d="M3 27l7-20 13 13z" fill="#ffd34d" stroke="#a67c00"/><path d="M6 19l7 6M8 13l10 9" stroke="#e3262f" stroke-width="2"/><circle cx="22" cy="5" r="2" fill="#5ec8ff"/><circle cx="27" cy="12" r="1.6" fill="#ff5ec8"/><path d="M16 3l2 3M24 18l3 1" stroke="#7dff6b" stroke-width="2"/></svg>`,
    bench: () => `<svg viewBox="0 0 40 18" width="36" height="16"><rect x="2" y="2" width="36" height="6" rx="2" fill="#7a4b22"/><path d="M6 8v8M34 8v8" stroke="#555" stroke-width="2"/></svg>`,
  };

  /* ---------------------------------------------------------------- scenes over the pitch
     They sit on the page over the pitch (not inside it, so redrawing the pitch on a tap doesn't cut them short) and
     tidy themselves away. In Calm (Settings → Look) they're skipped: the sound still plays. */
  function stage(pitch, cls, html, ms, sound) {
    if (sound) [].concat(sound).forEach((s, k) => setTimeout(() => GM.sound.play(s), k * 500));
    if (!pitch || (GM.calm && GM.calm())) return null;
    const r = pitch.getBoundingClientRect(), e = document.createElement('div');
    e.className = 'wfx ' + cls;
    Object.assign(e.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    e.style.setProperty('--pw', r.width + 'px'); e.style.setProperty('--ph', r.height + 'px');
    e.innerHTML = html; document.body.appendChild(e);
    const gone = () => { e.remove(); window.removeEventListener('hashchange', gone); };
    setTimeout(gone, ms); window.addEventListener('hashchange', gone);
    return e;
  }
  const walk = h => h.replace('class="spr per', 'class="spr per walking');
  const REF = walk(PERSON('#e8b48a', '#111', '#111', 'ref'));
  const SUIT = walk(PERSON('#e8b48a', '#555c66', '#2b2f36'));
  const MASKED = walk(PERSON('#f2c4a0', '#222', '#1a1a1a', '', BALACLAVA));
  const CLAPPER = (k, c) => PERSON('#f2c4a0', c, '#fff', 'clap c' + (k % 3));
  // what plays over the pitch for each thing (ms = how long it lasts)
  const SCENES = {
    // the referee runs on, shows a red card and jogs off
    ref: () => [`<div class="sc-ref">${REF}<i class="held">${CARD('#e3262f')}</i></div>`, 2800, ['redwhistle']],
    // a TV van pulls up, a bag of money is dropped off and the notes flutter up
    tvvan: () => [`<div class="sc-van">${SPRITE.tvvan.replace('class="spr"', 'class="spr moving"')}</div><div class="sc-bag">${LEFT.moneybag()}</div>${Array.from({ length: 8 }, (_, k) => `<i class="sc-cash k${k}">${LEFT.moneybag().replace('width="24"', 'width="14"')}</i>`).join('')}`, 3200, ['bus', 'cash']],
    // the taxman walks off with one of your cards
    taxman: icon => [`<div class="sc-tax">${SUIT}<i class="held">${CARD('#2b2f36', `<text x="10" y="18" font-size="11" text-anchor="middle">${icon || ''}</text>`)}</i></div>`, 2800, ['taxman']],
    // the golden ball bounces in towards your next signing
    golden: () => [`<div class="sc-gold"><i><svg viewBox="0 0 24 24" width="46" height="46"><circle cx="12" cy="12" r="10.5" fill="#ffe27a" stroke="#a67c00"/><path d="M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="#3a2a00"/><path d="M12 7.5V2M15.4 10l5-1.8M14.1 14l3 4.4M9.9 14l-3 4.4M8.6 10l-5-1.8" stroke="#3a2a00" stroke-width="1.1"/></svg></i></div>`, 2400, ['fanfare']],
    // a crate floats down on a parachute, lands with a thud and pops open
    box: () => [`<div class="sc-crate"><svg viewBox="0 0 60 70" width="70" height="82"><path class="chute" d="M4 22q26-30 52 0z" fill="#e3262f" stroke="#9a1219"/><path class="chute" d="M4 22q8-6 13 0 6-6 13 0 6-6 13 0 6-6 13 0" fill="#fff" opacity=".7"/>
      <path class="chute" d="M4 22l20 26M56 22L36 48M30 22v26" stroke="#777" stroke-width="1"/><g class="box"><rect x="16" y="46" width="28" height="22" fill="#b98a4e" stroke="#6b4a22"/><path d="M16 46l28 22M44 46L16 68" stroke="#6b4a22" stroke-width="1.6"/></g><g class="lid"><rect x="14" y="42" width="32" height="5" fill="#d5a565" stroke="#6b4a22"/></g></svg><i class="sparkle"></i></div>`, 2800, ['swoosh', 'thud', 'box']],
    // three men in balaclavas tiptoe across the pitch
    masked: () => [`<div class="sc-mask">${MASKED}${MASKED}${MASKED}</div>`, 3200, ['spooky']],
    // flares go off in both ends and red smoke drifts over
    derby: () => [`<div class="sc-flares">${[8, 28, 72, 92].map((x, k) => `<i class="fl" style="left:${x}%;top:${k % 2 ? 94 : 4}%">${FLARE}</i>`).join('')}<div class="smoke s1"></div><div class="smoke s2"></div></div>`, 3200, ['drumroll', 'cheer']],
    // the away end sings: scarves up along both touchlines, notes floating up
    chant: () => [`<div class="sc-scarves t">${Array.from({ length: 6 }, (_, k) => `<i style="animation-delay:${k * 0.12}s">${scarf()}</i>`).join('')}</div><div class="sc-scarves b">${Array.from({ length: 6 }, (_, k) => `<i style="animation-delay:${k * 0.12 + 0.06}s">${scarf()}</i>`).join('')}</div>${Array.from({ length: 8 }, (_, k) => `<i class="sc-note" style="left:${8 + k * 12}%;animation-delay:${(k % 4) * 0.35}s">${LEFT.note()}</i>`).join('')}`, 3200, ['chant']],
    // vuvuzelas poke in from both sides and the whole thing buzzes
    vuvuzela: () => [`<div class="sc-vuvu">${[12, 34, 56, 78].map((y, k) => `<i class="${k % 2 ? 'r' : 'l'}" style="top:${y}%">${LEFT.vuvu().replace('width="40"', 'width="80"').replace('height="15"', 'height="30"')}</i>`).join('')}</div>`, 2800, ['vuvuzela']],
    // the press conference: the sponsor board, a microphone and the flashbulbs
    press: () => [`<div class="sc-press"><div class="board">${Array.from({ length: 12 }, (_, k) => `<i>${['BET', 'GM', 'CHAOS', 'FIZZ'][k % 4]}</i>`).join('')}</div><div class="mic">${LEFT.mic().replace('width="13"', 'width="30"').replace('height="26"', 'height="60"')}</div>${Array.from({ length: 6 }, (_, k) => `<i class="flash" style="left:${10 + k * 15}%;animation-delay:${0.5 + k * 0.23}s"></i>`).join('')}</div>`, 3200, ['mic']],
    // rewind to the 90s: tape tracking lines and a spinning shirt
    vhs: (label = '1995') => [`<div class="sc-vhs"><b>◀◀ ${label}</b><div class="scan"></div><i class="shirt">${LEFT.shirt().replace('width="26"', 'width="80"').replace('height="22"', 'height="68"')}</i></div>`, 2600, ['rewind']],
    // the guard of honour: two lines clap a player through
    honour: () => [`<div class="sc-guard"><div class="row t">${Array.from({ length: 7 }, (_, k) => CLAPPER(k, '#fff')).join('')}</div><div class="row b">${Array.from({ length: 7 }, (_, k) => CLAPPER(k + 1, '#fff')).join('')}</div><div class="hero">${walk(PERSON('#e8b48a', '#e3262f', '#fff'))}</div></div>`, 3400, ['applause', 'cheer']],
    // the loan army's coach drives in, stops, honks and drives off
    coach: () => [`<div class="sc-coach">${SPRITE.coach.replace('class="spr"', 'class="spr moving"')}</div>`, 3400, ['bus', 'horn']],
    // the streaker legs it across, a steward after him
    streak: () => [`<div class="sc-streak">${walk(PERSON('#f2c4a0', '#f2c4a0', '#f2c4a0'))}<span class="gap"></span>${walk(PERSON('#e8b48a', '#ffd400', '#222'))}</div>`, 2600, ['whistle', 'cheer']],
    // the open-top bus crosses the pitch with the cup
    parade: () => [`<div class="sc-coach parade">${SPRITE.parade.replace('class="spr"', 'class="spr moving"')}</div>`, 3000, ['bus']],
    // parachutes drift down
    chutes: () => [`<div class="sc-rain slow">${Array.from({ length: 6 }, (_, k) => `<i style="left:${8 + k * 16}%;animation-delay:${k * 0.2}s">${LEFT.chute().replace('width="28"', 'width="44"').replace('height="28"', 'height="44"')}</i>`).join('')}</div>`, 3000, null],
    // drawn things raining down (trophies, bursts, money bags)
    shower: kind => [`<div class="sc-rain">${Array.from({ length: 10 }, (_, k) => `<i style="left:${5 + k * 9.5}%;animation-delay:${(k % 5) * 0.12}s">${(LEFT[kind] || LEFT.burst)().replace(/width="\d+"/, 'width="34"').replace(/height="\d+"/, 'height="34"')}</i>`).join('')}</div>`, 2200, null],
    // the sacked manager walks off with his box of things; the new one walks on, waving
    sacked: name => [`<div class="sc-walk off">${SUIT}<i class="held">${LEFT.crate()}</i></div><div class="sc-p45">P45${name ? `<small>${name}</small>` : ''}</div>`, 3000, ['sacked']],
    hired: () => [`<div class="sc-walk on">${walk(PERSON('#e8b48a', '#1d2a44', '#2b2f36', 'wave'))}</div>`, 2600, ['applause']],
  };
  const scarf = () => `<svg viewBox="0 0 54 16" width="54" height="16">${[0, 1, 2, 3, 4, 5].map(k => `<rect x="${3 + k * 8}" y="3" width="8" height="10" fill="${k % 2 ? '#fff' : '#d22'}"/>`).join('')}</svg>`;

  /* ---------------------------------------------------------------- wildcards: a short drawn flourish when you play one */
  const WILD = {
    scout: () => [`<div class="wc-binos"><svg viewBox="0 0 60 30" width="110" height="55"><circle cx="15" cy="15" r="12" fill="#222" stroke="#555" stroke-width="3"/><circle cx="45" cy="15" r="12" fill="#222" stroke="#555" stroke-width="3"/><rect x="24" y="10" width="12" height="8" fill="#333"/><circle cx="15" cy="15" r="7" fill="#5ec8ff" opacity=".7"/><circle cx="45" cy="15" r="7" fill="#5ec8ff" opacity=".7"/><circle cx="12" cy="12" r="2" fill="#fff"/><circle cx="42" cy="12" r="2" fill="#fff"/></svg></div>`, 1900, 'scribble'],
    respin: () => [`<div class="wc-lever"><svg viewBox="0 0 30 80" width="30" height="80"><rect x="11" y="20" width="8" height="58" rx="4" fill="#888"/><circle cx="15" cy="14" r="11" fill="#e3262f" stroke="#9a1219" stroke-width="2"/></svg></div>`, 1400, 'slotspin'],
    centurion: () => [`<div class="wc-100"><b>100</b><small>CENTURIONS</small></div>`, 2000, ['drumroll', 'cheer']],
    gegenpress: () => [`<div class="wc-press">${Array.from({ length: 9 }, (_, k) => `<i style="left:${6 + k * 11}%;animation-delay:${(k % 3) * 0.12}s"></i>`).join('')}</div>`, 1700, 'stampede'],
    bus: () => [`<div class="wc-bus">${SPRITE.bus.replace('class="spr"', 'class="spr moving"')}</div>`, 2300, 'bus'],
    captain: () => [`<div class="wc-band"><svg viewBox="0 0 70 30" width="120" height="52"><rect x="4" y="5" width="62" height="20" rx="6" fill="#ffd34d" stroke="#a67c00" stroke-width="2"/><text x="35" y="21" font-size="15" font-weight="900" font-family="Arial" fill="#3a2a00" text-anchor="middle">C</text></svg></div>`, 1700, 'velcro'],
    rotation: () => [`<div class="wc-rot"><svg viewBox="0 0 60 60" width="90" height="90"><path d="M30 6a24 24 0 1 1-20 11" fill="none" stroke="#ff8a3d" stroke-width="6" stroke-linecap="round"/><path d="M4 12l7 8 8-7z" fill="#ff8a3d"/></svg></div>`, 1500, 'swoosh'],
    coin: () => [`<div class="wc-coin"><svg viewBox="0 0 40 40" width="60" height="60"><circle cx="20" cy="20" r="17" fill="#f2c230" stroke="#8a6406" stroke-width="3"/><circle cx="20" cy="20" r="10" fill="none" stroke="#b98a0c" stroke-width="2"/></svg></div>`, 1500, 'coinflip'],
    deadline: () => [`<div class="wc-deadline"><b>DEADLINE DAY</b><i>${LEFT.clock().replace('width="22"', 'width="44"').replace('height="22"', 'height="44"')}</i></div>`, 2000, 'tick3'],
    oneclub: () => [`<div class="wc-heart"><svg viewBox="0 0 30 28" width="90" height="84"><path d="M15 26L3 13q-5-7 2-11 6-3 10 4 4-7 10-4 7 4 2 11z" fill="#e3262f" stroke="#9a1219"/></svg></div>`, 1700, 'applause'],
    journeyman: () => [`<div class="wc-case">${LEFT.suitcase().replace('width="26"', 'width="60"').replace('height="22"', 'height="50"')}</div>`, 1900, 'thud'],
    throwback: () => SCENES.vhs('1995'),
    magnet: () => [`<div class="wc-magnet"><svg viewBox="0 0 50 50" width="80" height="80"><path d="M10 6v20a15 15 0 0 0 30 0V6h-9v20a6 6 0 0 1-12 0V6z" fill="#e3262f" stroke="#9a1219" stroke-width="2"/><rect x="10" y="6" width="9" height="7" fill="#ddd"/><rect x="31" y="6" width="9" height="7" fill="#ddd"/></svg>${[0, 1, 2].map(k => `<i class="field f${k}"></i>`).join('')}</div>`, 1800, 'magnet'],
    trophy: () => [`<div class="wc-trophy">${LEFT.trophy().replace('width="24"', 'width="80"').replace('height="26"', 'height="86"')}<i class="glint"></i></div>`, 1900, 'fanfare'],
    storm: () => [`<div class="wc-storm">${Array.from({ length: 10 }, (_, k) => `<i style="--a:${k * 36}deg;animation-delay:${(k % 5) * 0.06}s">${CARD(['#7c3aed', '#e3262f', '#2b6cb0', '#ffd34d', '#1f8a4c'][k % 5])}</i>`).join('')}</div>`, 1900, 'wind'],
    hero: () => [`<div class="wc-hat"><svg viewBox="0 0 60 50" width="90" height="75"><ellipse cx="30" cy="42" rx="26" ry="6" fill="#111"/><path d="M14 42V12q16-6 32 0v30z" fill="#1a1a1a"/><rect x="14" y="32" width="32" height="6" fill="#e3262f"/></svg>${[0, 1, 2].map(k => `<i class="b b${k}"><svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#333"/><path d="M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="#222"/></svg></i>`).join('')}</div>`, 2000, 'cheer'],
    hot: () => [`<div class="wc-flames">${Array.from({ length: 12 }, (_, k) => `<i style="left:${k * 8.5}%;animation-delay:${(k % 4) * 0.1}s"></i>`).join('')}</div>`, 1900, 'whoosh'],
    joker: () => [`<div class="wc-joker"><svg viewBox="0 0 40 56" width="70" height="98"><rect x="2" y="2" width="36" height="52" rx="5" fill="#fff" stroke="#7c3aed" stroke-width="2.5"/><path d="M8 26l6-14 6 10 6-10 6 14z" fill="#7c3aed"/><circle cx="14" cy="12" r="2.4" fill="#ffd34d"/><circle cx="26" cy="12" r="2.4" fill="#e3262f"/><circle cx="20" cy="36" r="6" fill="#f2c4a0"/><path d="M16 40q4 4 8 0" stroke="#e3262f" stroke-width="1.6" fill="none"/></svg></div>`, 1700, 'shimmer'],
    sub: (a, b) => [`<div class="wc-board"><span class="out">${a || ''}</span><span class="in">${b || ''}</span></div>`, 1900, 'whistle'],
  };

  /* ---------------------------------------------------------------- the weather (set at kick-off, lasts the whole game) */
  const WEATHER = {
    sun: { icon: '☀️', name: 'Sunshine', note: 'Sun’s out: the terraces are in good voice and the money men are about.', ev: { chant: 2, windfall: 1.6, fairytale: 1.4 }, sound: 'sunny' },
    rain: { icon: '🌧️', name: 'Rain', note: 'Chucking it down: puddles and slips are more likely.', ev: { stoke: 2.5, slip: 2, hamstring: 1.3 }, sound: 'rain' },
    wind: { icon: '💨', name: 'Gale', note: 'Blowing a gale: tornadoes and the pigeon are more likely.', ev: { pigeon: 2, helicopter: 0.5 }, big: { tornado: 2 }, sound: 'wind' },
    snow: { icon: '❄️', name: 'Snow', note: 'Snow on the pitch: you can’t see the lines, and slips and pies are more likely.', ev: { slip: 2.5, pies: 1.6 }, sound: 'snow' },
    fog: { icon: '🌫️', name: 'Fog', note: 'Pea-souper: the names on the reels are hard to make out until you tap one, and spooky things are more likely.', ev: { aliens: 2, masked: 2 }, big: { blackhole: 1.5 }, sound: 'foghorn' },
  };
  const WX_W = { sun: 3, rain: 2.5, wind: 1.5, snow: 1.2, fog: 1.8 };
  // the weather's own layer on the pitch (rain streaks, falling snow, drifting fog, sunlight, gusts)
  const weatherHtml = w => WEATHER[w] ? `<div class="wx wx-${w}" aria-hidden="true">${w === 'wind' ? '<i class="leaf"></i><i class="leaf l2"></i>' : ''}</div>` : '';

  /* ---------------------------------------------------------------- the effects layer (js/fx.js) on top
     Lottie animations (fx/lottie/) stand in for the drawn vehicles and characters when the effects layer is on: how
     big each one is on the pitch and which way it faces as drawn (so it can be turned round to face where it's going). */
  const LOT = {
    ambulance: { w: 92, h: 70, faces: 'right' }, police: { w: 112, h: 56, faces: 'left' }, tank: { w: 124, h: 62, faces: 'right' },
    heli: { w: 140, h: 140, faces: 'right' }, ufo: { w: 190, h: 190, speed: 2 }, dog: { w: 74, h: 74, faces: 'left' }, pigeon: { w: 74, h: 74 },
    runner: { w: 76, h: 76, faces: 'left' }, trophy: { w: 170, h: 170 }, heartbreak: { w: 100, h: 100 }, tornado: { w: 170, h: 170 },
  };
  const FX = () => (GM.FX && GM.FX.on ? GM.FX : null);
  const at = (r, fx, fy) => [r.left + fx * r.width, r.top + fy * r.height];
  // PixiJS on top of a scene: particles, light and Lottie, played alongside the drawn scene (pitch = the pitch element)
  const PX = {
    tvvan: (f, r) => setTimeout(() => f.money(r, 40), 1300),
    derby: (f, r) => [[0.08, 0.04], [0.28, 0.96], [0.72, 0.04], [0.92, 0.96]].forEach(([x, y], k) => setTimeout(() => f.flare(...at(r, x, y), 2700), k * 160)),
    shower: (f, r, kind) => kind === 'burst' ? (f.flash(0xffd34d, 0.45), f.burst(...at(r, 0.5, 0.5), 0xff8a3d), setTimeout(() => f.burst(...at(r, 0.25, 0.3)), 250), setTimeout(() => f.burst(...at(r, 0.75, 0.7)), 450))
      : kind === 'trophy' ? (f.lottie('trophy', { x: r.left + r.width / 2, y: r.top + r.height * 0.42, w: LOT.trophy.w }), f.fireworks(r, 6), f.confetti(r, 160))
      : f.money(r, 36),
    golden: (f, r) => { for (let k = 0; k < 5; k++) setTimeout(() => f.sparks(...at(r, 0.1 + k * 0.17, 0.25 + (k % 2) * 0.4), { n: 18, tint: 0xffd34d, speed: 260 }), 200 + k * 380); },
    box: (f, r) => setTimeout(() => { f.sparks(...at(r, 0.5, 0.62), { n: 40, tint: 0xffe14a }); f.shockwave(...at(r, 0.5, 0.62), 0xffe14a, 0.8); }, 1900),
    ref: (f, r) => setTimeout(() => f.flash(0xff2a2a, 0.25), 1150),
    chant: (f, r) => f.confetti(r, 90),
    press: (f, r) => [0.6, 0.9, 1.2, 1.45, 1.7].forEach(t => setTimeout(() => f.flash(0xffffff, 0.35), t * 1000)),
    vhs: (f, r) => f.flash(0xa46bff, 0.3),
    parade: (f, r) => { f.confetti(r, 160); f.fireworks(r, 3); },
    honour: (f, r) => f.confetti(r, 70),
    chutes: (f, r) => f.smoke(...at(r, 0.5, 1), { ms: 1200, tint: 0xff8a3d, alpha: 0.25 }),
    sacked: (f, r) => setTimeout(() => f.sparks(...at(r, 0.5, 0.18), { n: 16, tint: 0xffffff, speed: 200 }), 300),
    hired: (f, r) => setTimeout(() => f.confetti({ left: r.left, top: r.top, width: r.width * 0.6, height: r.height }, 50), 1600),
    streak: () => {},
  };
  const PXW = {
    centurion: (f, r) => { f.burst(...at(r, 0.5, 0.5), 0xffd34d); f.sparks(...at(r, 0.5, 0.5), { n: 60, tint: 0xffd34d, speed: 520 }); },
    hot: (f, r) => { for (let k = 0; k < 7; k++) f.fire(...at(r, 0.07 + k * 0.143, 0.99), 1600); },
    coin: (f, r) => setTimeout(() => f.sparks(...at(r, 0.5, 0.45), { n: 24, tint: 0xf2c230 }), 600),
    storm: (f, r) => f.twister(r, 1900),
    trophy: (f, r) => { f.lottie('trophy', { x: r.left + r.width / 2, y: r.top + r.height / 2, w: 150 }); f.sparks(...at(r, 0.5, 0.5), { n: 30, tint: 0xffd34d }); },
    hero: (f, r) => setTimeout(() => f.sparks(...at(r, 0.5, 0.4), { n: 40, tint: 0xffffff }), 300),
    captain: (f, r) => setTimeout(() => f.sparks(...at(r, 0.5, 0.5), { n: 30, tint: 0xffd34d, speed: 300 }), 700),
    gegenpress: (f, r) => f.dust([0.15, 0.35, 0.55, 0.75, 0.9].map(x => at(r, x, 0.95))),
    oneclub: (f, r) => f.sparks(...at(r, 0.5, 0.5), { n: 30, tint: 0xff5e7a }),
    deadline: (f, r) => f.flash(0xffd400, 0.3),
    magnet: (f, r) => f.shockwave(...at(r, 0.5, 0.5), 0x5ec8ff, 1),
    joker: (f, r) => f.sparks(...at(r, 0.5, 0.5), { n: 30, tint: 0xa46bff }),
    bus: (f, r) => setTimeout(() => f.smoke(...at(r, 0.32, 0.86), { ms: 900, tint: 0x888888, alpha: 0.4 }), 400),
  };
  const fxOn = (table, kind, pitch, args) => { const f = FX(); if (f && pitch && table[kind]) try { table[kind](f, pitch.getBoundingClientRect(), ...args); } catch (e) { /* decoration only */ } };

  GM.CFX = { PERSON, SPRITE, LEFT, SCENES, WILD, WEATHER, WX_W, weatherHtml, LOT,
    // play a scene or a wildcard flourish over the pitch
    play(kind, pitch, ...args) {
      const f = SCENES[kind] || WILD[kind]; if (!f) return null;
      const [html, ms, sound] = f(...args);
      fxOn(PX, kind, pitch, args);
      return stage(pitch, 'scn-' + kind, html, ms, sound);
    },
    wild(kind, pitch, ...args) {
      const f = WILD[kind]; if (!f) return null;
      const [html, ms, sound] = f(...args);
      fxOn(PXW, kind, pitch, args);
      return stage(pitch, 'wc wc-' + kind, html, ms, sound);
    },
  };
})();

/* Goal Machine – sound effects and music, all synthesised with Web Audio (no audio files). */
'use strict';

(function () {
  const store = GM.store;
  // X is the "studio": the audio context plus its buses. It can be swapped for an OfflineAudioContext to render
  // sounds to a file (see GM.sound.renderDemo), so every sound is written against X rather than a global context.
  let X = null, live = null;
  const now = () => X.ctx.currentTime;

  function makeStudio(ctx) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    const master = ctx.createGain(), sfx = ctx.createGain(), bg = ctx.createGain();
    sfx.connect(master); bg.connect(master); master.connect(comp); comp.connect(ctx.destination);
    // two seconds of white noise, reused by every noisy sound
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return { ctx, master, sfx, bg, noise };
  }

  /* ---------------------------------------------------------------- building blocks */
  function env(g, t, vol, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(freq, o = {}) {
    const t = o.t != null ? o.t : now(), dur = o.dur || 0.2, c = X.ctx;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    let out = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); out = f; }
    out.connect(g); g.connect(o.dest || X.sfx);
    env(g, t, o.vol || 0.2, o.attack || 0.005, dur);
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  }
  function noise(o = {}) {
    const t = o.t != null ? o.t : now(), dur = o.dur || 0.2, c = X.ctx;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = X.noise; src.loop = true;
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1000, t); f.Q.value = o.q || 1;
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || X.sfx);
    env(g, t, o.vol || 0.2, o.attack || 0.005, dur);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  // A referee's pea whistle: a high tone warbled fast by the pea, with a little breath
  function blast(t, dur, vol = 0.17) {
    const c = X.ctx, osc = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), g = c.createGain();
    osc.type = 'sine'; osc.frequency.value = 2900;
    lfo.frequency.value = 38; depth.gain.value = 170;
    lfo.connect(depth); depth.connect(osc.frequency);
    osc.connect(g); g.connect(X.sfx);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); lfo.start(t); osc.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    noise({ t, dur, freq: 2900, q: 4, vol: vol * 0.35, attack: 0.02 });
  }

  // A crowd roar: noise through a bank of voice-range filters, each wobbling on its own
  function roar(t, hold = 1.2, vol = 0.35, dest) {
    [300, 520, 800, 1150, 1700, 2600].forEach((f, i) => {
      const c = X.ctx, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = X.noise; src.loop = true;
      bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(f * 0.85, t);
      bp.frequency.linearRampToValueAtTime(f * (1.05 + 0.1 * Math.random()), t + 0.6);  // the "whoa" rising
      const v = vol * (i < 3 ? 1 : 0.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.25 + Math.random() * 0.15);
      g.gain.setValueAtTime(v, t + 0.4 + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4 + hold + 2.2);
      src.connect(bp); bp.connect(g); g.connect(dest || X.sfx);
      src.start(t, Math.random() * 1.5); src.stop(t + hold + 3);
    });
  }

  // Brassy chord: detuned saws with a filter that opens as the note starts
  function brass(notes, t, dur, vol = 0.07) {
    notes.forEach(n => [-7, 7].forEach(dt => {
      const c = X.ctx, osc = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = midi(n); osc.detune.value = dt;
      f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(3200, t + 0.06);
      f.frequency.exponentialRampToValueAtTime(1200, t + dur);
      osc.connect(f); f.connect(g); g.connect(X.sfx);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.03);
      g.gain.setValueAtTime(vol * 0.8, t + dur - 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
      osc.start(t); osc.stop(t + dur + 0.2);
    }));
  }

  /* ---------------------------------------------------------------- the sound board */
  const SOUNDS = {
    // CHAOS: a crash for disasters, a siren for storms, a jackpot run for good fortune
    boom: t => { tone(140, { t, to: 38, glide: 0.45, dur: 0.55, vol: 0.34 }); noise({ t, dur: 0.45, freq: 500, vol: 0.2 }); },
    // CHAOS vehicles: a police wail, brakes, handcuffs and a flying saucer's wobble
    police: t => { for (let i = 0; i < 2; i++) { tone(620, { t: t + i * 0.9, to: 1250, glide: 0.42, dur: 0.45, type: 'sawtooth', lp: 2400, vol: 0.05 }); tone(1250, { t: t + i * 0.9 + 0.45, to: 620, glide: 0.42, dur: 0.45, type: 'sawtooth', lp: 2400, vol: 0.05 }); } },
    screech: t => { noise({ t, dur: 0.35, freq: 3200, to: 2200, q: 8, vol: 0.12 }); tone(2100, { t, to: 1700, dur: 0.3, type: 'sawtooth', lp: 3500, vol: 0.02 }); },
    cuffs: t => { [0, 0.09, 0.16].forEach(d => noise({ t: t + d, dur: 0.05, freq: 5200, q: 6, vol: 0.18 })); },
    ufo: t => { for (let i = 0; i < 6; i++) tone(520 + (i % 2) * 260, { t: t + i * 0.3, to: 820 - (i % 2) * 300, glide: 0.3, dur: 0.32, type: 'sine', vol: 0.07 }); tone(1600, { t: t + 1.4, to: 300, glide: 1.2, dur: 1.3, type: 'triangle', vol: 0.05 }); },
    siren: t => { tone(700, { t, to: 1400, glide: 0.3, dur: 0.32, type: 'sawtooth', lp: 2600, vol: 0.05 }); tone(1400, { t: t + 0.32, to: 700, glide: 0.3, dur: 0.32, type: 'sawtooth', lp: 2600, vol: 0.05 }); },
    jackpot: t => [72, 76, 79, 84, 88, 91].forEach((n, i) => tone(midi(n), { t: t + i * 0.06, dur: 0.18, type: 'square', lp: 3000, vol: 0.06 })),
    tap: t => tone(1100, { t, to: 800, dur: 0.05, vol: 0.06 }),
    // Hat-Trick: a soft card flick, and a gentle chime when your team takes a trick (a low note when it doesn't)
    card: t => { noise({ t, dur: 0.06, freq: 2400, to: 900, q: 1.2, vol: 0.12 }); tone(320, { t, to: 240, dur: 0.06, type: 'triangle', vol: 0.05 }); },
    trickwin: t => { tone(midi(79), { t, dur: 0.35, type: 'triangle', vol: 0.09 }); tone(midi(84), { t: t + 0.09, dur: 0.45, type: 'triangle', vol: 0.08 }); },
    tricklose: t => tone(midi(55), { t, dur: 0.3, type: 'triangle', vol: 0.07 }),
    tick: t => { tone(2100, { t, type: 'triangle', dur: 0.025, vol: 0.04 }); noise({ t, dur: 0.02, type: 'highpass', freq: 5000, vol: 0.015 }); },
    land: t => { tone(170, { t, to: 55, dur: 0.2, vol: 0.4 }); noise({ t, dur: 0.07, type: 'lowpass', freq: 900, vol: 0.18 }); },
    place: t => { noise({ t, dur: 0.14, freq: 700, to: 3800, q: 2, vol: 0.22 }); tone(520, { t: t + 0.07, to: 880, dur: 0.14, type: 'triangle', vol: 0.14 }); },
    swoosh: t => noise({ t, dur: 0.28, freq: 3500, to: 400, q: 1.5, vol: 0.2 }),
    wild: t => [84, 88, 91, 96, 100].forEach((n, i) => tone(midi(n), { t: t + i * 0.055, dur: 0.35, type: 'triangle', vol: 0.09 })),
    good: t => { tone(880, { t, dur: 0.5, vol: 0.16 }); tone(1320, { t: t + 0.07, dur: 0.6, vol: 0.13 }); tone(2640, { t: t + 0.07, dur: 0.2, vol: 0.03 }); },
    bad: t => { tone(140, { t, dur: 0.32, type: 'sawtooth', lp: 700, vol: 0.13 }); tone(148, { t, dur: 0.32, type: 'sawtooth', lp: 700, vol: 0.13 }); },
    clock: t => { tone(1750, { t, type: 'triangle', dur: 0.05, vol: 0.12 }); tone(1180, { t, dur: 0.03, vol: 0.06 }); },
    whistle: t => blast(t, 0.4),
    fulltime: t => { blast(t, 0.28); blast(t + 0.4, 0.28); blast(t + 0.8, 0.95); },
    sting: t => { brass([67, 71, 74], t, 0.12, 0.05); brass([72, 76, 79], t + 0.14, 0.35, 0.06); },
    horn: t => {
      [57, 61, 64, 69].forEach(n => tone(midi(n), { t, dur: 1.4, type: 'sawtooth', lp: 1500, attack: 0.05, vol: 0.06 }));
      roar(t + 0.1, 1.4, 0.3);
    },
    cheer: t => roar(t, 1.1, 0.28),
    /* CHAOS moments */
    // the meter: a note climbing with every charge (level 1-4), and an alarm building when it's full
    charge: (t, lv = 1) => { const n = [67, 71, 74, 79][Math.max(0, Math.min(3, lv - 1))]; tone(midi(n), { t, dur: 0.16, type: 'square', lp: 2400, vol: 0.06 }); tone(midi(n + 12), { t: t + 0.07, dur: 0.22, type: 'triangle', vol: 0.07 }); },
    meterfull: t => { for (let i = 0; i < 6; i++) tone(midi(64 + i * 3), { t: t + i * 0.07, dur: 0.14, type: 'square', lp: 3000, vol: 0.06 }); tone(300, { t: t + 0.4, to: 1500, glide: 0.6, dur: 0.65, type: 'sawtooth', lp: 3200, vol: 0.06 }); },
    // weather: wind that howls up and away, rain, a thunder rumble, and the crack of a strike
    wind: t => { noise({ t, dur: 2.6, freq: 280, to: 1100, q: 3, vol: 0.26, attack: 0.6 }); noise({ t: t + 0.3, dur: 2.2, freq: 600, to: 250, q: 5, vol: 0.14, attack: 0.5 }); },
    rain: t => noise({ t, dur: 3.2, type: 'highpass', freq: 3500, vol: 0.07, attack: 0.4 }),
    thunder: t => { noise({ t, dur: 2.4, type: 'lowpass', freq: 380, to: 90, vol: 0.5, attack: 0.03 }); tone(55, { t, to: 30, dur: 1.4, vol: 0.2, attack: 0.02 }); },
    crack: t => { noise({ t, dur: 0.12, type: 'highpass', freq: 2500, vol: 0.45, attack: 0.001 }); noise({ t: t + 0.05, dur: 1.6, type: 'lowpass', freq: 500, to: 80, vol: 0.4 }); },
    // match day: the ambulance, VAR's beeps, TV money, the taxman, the mystery box, the masks, a boo, a drum roll
    ambulance: t => { for (let i = 0; i < 4; i++) { tone(960, { t: t + i * 0.44, dur: 0.21, type: 'square', lp: 2200, vol: 0.05 }); tone(760, { t: t + i * 0.44 + 0.22, dur: 0.21, type: 'square', lp: 2200, vol: 0.05 }); } },
    var: t => { [0, 0.28, 0.56].forEach(d => tone(1320, { t: t + d, dur: 0.12, type: 'square', lp: 3000, vol: 0.05 })); tone(660, { t: t + 0.9, dur: 0.4, type: 'triangle', vol: 0.08 }); },
    cash: t => { noise({ t, dur: 0.08, type: 'lowpass', freq: 1200, vol: 0.2 }); [2637, 3136].forEach((f, i) => tone(f, { t: t + 0.08 + i * 0.09, dur: 0.6, type: 'triangle', vol: 0.08 })); for (let i = 0; i < 6; i++) tone(3000 + Math.random() * 1500, { t: t + 0.3 + i * 0.06, dur: 0.08, type: 'triangle', vol: 0.03 }); },
    taxman: t => [79, 76, 72, 67, 60].forEach((n, i) => tone(midi(n), { t: t + i * 0.1, dur: 0.18, type: 'square', lp: 1800, vol: 0.05 })),
    box: t => { noise({ t, dur: 0.1, freq: 900, q: 2, vol: 0.25 }); tone(300, { t, to: 900, dur: 0.15, type: 'triangle', vol: 0.1 }); [84, 88, 91, 96].forEach((n, i) => tone(midi(n), { t: t + 0.15 + i * 0.06, dur: 0.3, type: 'triangle', vol: 0.07 })); },
    spooky: t => { [57, 60, 63].forEach(n => { const o = tone(midi(n), { t, dur: 1.5, type: 'triangle', attack: 0.3, vol: 0.06 }); o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(-60, t + 1.5); }); },
    boo: t => { [220, 330, 480].forEach(f => noise({ t, dur: 1.4, freq: f, to: f * 0.7, q: 3, vol: 0.2, attack: 0.2 })); },
    drumroll: t => { for (let i = 0; i < 18; i++) noise({ t: t + i * 0.045, dur: 0.05, freq: 1800, q: 0.8, vol: 0.12 + i * 0.008 }); tone(80, { t: t + 0.82, to: 45, dur: 0.4, vol: 0.35 }); },
    // the coin: spinning pings that slow down, then the clink as it lands
    coinflip: t => { let d = 0; for (let i = 0; i < 12; i++) { tone(2800 + (i % 2) * 500, { t: t + d, dur: 0.05, type: 'triangle', vol: 0.05 }); d += 0.06 + i * 0.011; } },
    coinland: t => { tone(3100, { t, dur: 0.35, type: 'triangle', vol: 0.1 }); tone(4150, { t: t + 0.02, dur: 0.25, type: 'triangle', vol: 0.06 }); tone(3100, { t: t + 0.14, dur: 0.2, type: 'triangle', vol: 0.05 }); },
    sacked: t => { noise({ t, dur: 0.35, freq: 2500, to: 500, q: 1.2, vol: 0.2 }); roar(t + 0.2, 0.6, 0.2); tone(midi(50), { t: t + 0.3, dur: 0.8, type: 'sawtooth', lp: 900, vol: 0.06 }); },
    tick3: t => { for (let i = 0; i < 6; i++) tone(i % 2 ? 1180 : 1750, { t: t + i * 0.25, type: 'triangle', dur: 0.05, vol: 0.1 }); },
    fanfare: t => {
      brass([60, 64, 67], t, 0.16); brass([60, 64, 67], t + 0.2, 0.16); brass([60, 65, 69], t + 0.4, 0.16);
      brass([64, 67, 72], t + 0.6, 1.2, 0.08); roar(t + 0.5, 1.6, 0.3);
    },
    /* Packs and levels */
    // a pack for you: a ribbon being pulled and a sparkle
    packget: t => { noise({ t, dur: 0.25, freq: 1800, to: 4200, q: 1.5, vol: 0.12 }); [84, 88, 91, 96].forEach((n, i) => tone(midi(n), { t: t + 0.18 + i * 0.07, dur: 0.4, type: 'triangle', vol: 0.1 })); },
    // the cards dealt into a fan: a quick run of flicks
    deal: (t, n = 5) => { for (let i = 0; i < n; i++) { noise({ t: t + i * 0.08, dur: 0.05, freq: 2600, to: 1000, q: 1.2, vol: 0.1 }); tone(300 - i * 10, { t: t + i * 0.08, to: 220, dur: 0.05, type: 'triangle', vol: 0.04 }); } },
    // a card back starting to glow: a shimmer rising (bigger and longer for a Legend)
    shimmer: (t, big) => { const n = big ? 9 : 5; for (let i = 0; i < n; i++) tone(midi(84 + i * 2 + (big ? 3 : 0)), { t: t + i * 0.05, dur: 0.5, type: 'sine', vol: 0.055 }); if (big) tone(midi(60), { t, to: midi(72), glide: 0.6, dur: 0.9, type: 'sawtooth', lp: 1200, attack: 0.2, vol: 0.04 }); },
    // a Silver card turning over: the flick and a bright ping
    silver: t => { noise({ t, dur: 0.06, freq: 2400, to: 900, q: 1.2, vol: 0.12 }); tone(midi(88), { t: t + 0.04, dur: 0.35, type: 'triangle', vol: 0.07 }); tone(midi(95), { t: t + 0.08, dur: 0.25, type: 'sine', vol: 0.04 }); },
    // the last piece of a card clicking in: a snap, then a two-note "done"
    snap: t => { noise({ t, dur: 0.04, type: 'highpass', freq: 2000, vol: 0.14, attack: 0.001 }); tone(midi(76), { t: t + 0.08, dur: 0.25, type: 'triangle', vol: 0.1 }); tone(midi(83), { t: t + 0.2, dur: 0.5, type: 'triangle', vol: 0.1 }); },
    // the Legend walkout: floodlights clunking on, one bank at a time, the crowd building (step 0-3)
    walkstep: (t, i = 0) => { tone(90, { t, to: 40, dur: 0.35, vol: 0.4 }); noise({ t, dur: 0.12, type: 'lowpass', freq: 900, vol: 0.2, attack: 0.002 }); tone(midi(45 + i * 5), { t, dur: 0.8, type: 'sawtooth', lp: 700, vol: 0.05 }); roar(t + 0.05, 0.3, 0.05 + i * 0.04); },
    // levelling up: a quick climbing arpeggio with a sparkle on top
    levelup: t => { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(midi(n), { t: t + i * 0.055, dur: 0.16, type: 'square', lp: 3200, vol: 0.07 })); tone(midi(96), { t: t + 0.4, dur: 0.6, type: 'triangle', vol: 0.06 }); tone(midi(91), { t: t + 0.4, dur: 0.6, type: 'triangle', vol: 0.05 }); },
    /* Moneyball */
    // the TV news sting (two stabs and a big chord on a drum hit), then the teleprinter chattering
    newsflash: t => {
      brass([62, 65, 69], t, 0.09, 0.06); brass([62, 65, 69], t + 0.13, 0.09, 0.06); brass([67, 70, 74, 79], t + 0.28, 0.6, 0.07);
      tone(110, { t: t + 0.28, to: 50, dur: 0.5, vol: 0.35 }); noise({ t: t + 0.28, dur: 0.3, type: 'lowpass', freq: 800, vol: 0.2 });
      for (let i = 0; i < 14; i++) tone(2600 + (i % 3) * 350, { t: t + 0.95 + i * 0.055 + (i % 4 ? 0 : 0.03), dur: 0.02, type: 'square', lp: 5000, vol: 0.03 });
    },
    // the net worth counter rolling over: ticks that speed up and climb, for dur seconds
    count: (t, dur = 1) => { let d = 0, i = 0; while (d < dur) { tone(1400 + i * 45, { t: t + d, dur: 0.03, type: 'triangle', vol: 0.1 }); d += Math.max(0.03, 0.09 - i * 0.004); i++; } },
    // a rubber stamp coming down: a thud and a slap of paper
    stamp: t => { tone(120, { t, to: 45, dur: 0.18, vol: 0.45 }); noise({ t, dur: 0.09, type: 'lowpass', freq: 1400, vol: 0.3 }); noise({ t: t + 0.02, dur: 0.12, freq: 3000, q: 0.7, vol: 0.08 }); },
    // the window slamming shut: a heavy door and a low boom
    slam: t => { noise({ t, dur: 0.5, type: 'lowpass', freq: 600, to: 120, vol: 0.5, attack: 0.002 }); tone(80, { t, to: 35, dur: 0.6, vol: 0.4 }); tone(midi(40), { t: t + 0.05, dur: 1.2, type: 'sawtooth', lp: 300, vol: 0.06 }); },
    // the stock exchange bell: three rings of a bright, clangy bell
    bell: t => [0, 0.22, 0.44].forEach(d => [1, 2.76, 5.4].forEach((m, i) => tone(740 * m, { t: t + d, dur: 1.2 - i * 0.3, type: 'sine', vol: [0.13, 0.05, 0.025][i] }))),
  };
  // a blip that climbs as you close in on a target (frac 0..1)
  const rise = (t, frac) => tone(380 + 900 * Math.min(1, Math.max(0, frac)), { t, dur: 0.12, type: 'triangle', vol: 0.1 });

  /* ---------------------------------------------------------------- background music */
  let bgNodes = [], bgTimer = null, bgMode = 'off';

  // The music. Each game area has its own track, all played by the same little band (kick, clap, hats, bass, chord
  // stabs, pad, arpeggio and a lead tune with an echo). A track is a list of sections; the arpeggios and hi-hats pick
  // slightly different patterns on every pass, so they take a while to repeat exactly.
  const CH = {  // chords: notes (MIDI) and bass root
    Am: [[57, 60, 64], 45], F: [[53, 57, 60], 41], C: [[52, 55, 60], 48], G: [[55, 59, 62], 43], Em: [[52, 55, 59], 40],
    Dm: [[50, 53, 57], 38], Bb: [[53, 58, 62], 46], D: [[54, 57, 62], 50], B: [[54, 59, 63], 47],
    Cmaj7: [[55, 59, 60, 64], 48], Am7: [[55, 57, 60, 64], 45], Fmaj7: [[53, 57, 60, 64], 41], G7: [[53, 55, 59, 62], 43],
    Dm7: [[53, 57, 60, 62], 38], Em7: [[55, 59, 62, 64], 40], E7: [[52, 56, 59, 62], 40],
    Cm: [[51, 55, 60], 48], Ab: [[51, 56, 60], 44], Eb: [[51, 55, 58], 51], Fm: [[53, 56, 60], 41], Db: [[53, 56, 61], 49],
  };
  const _ = null;
  const TRACKS = {
    // Menus: 'Anthem', 122 bpm in A minor (the original track)
    anthem: {
      bpm: 122, inst: {},
      tunes: {
        lift: [[69, _, 72, _, 69, _, 65, _], [71, _, 74, _, 71, _, 67, _], [71, _, 76, _, 79, _, 76, _], [69, _, _, _, 72, 71, 69, _]],
        chorus: [[76, _, 79, _, 76, 74, 72, _], [74, _, 71, _, 74, _, 79, _], [72, _, 76, _, 81, _, 79, 76], [77, _, 76, _, 72, _, _, _],
          [76, _, 79, _, 76, 74, 72, _], [74, _, 71, _, 74, _, 79, 81], [84, _, 83, _, 81, _, 79, 76], [77, _, 79, _, 76, _, _, _]],
      },
      song: [
        { bars: 4, chords: ['Am', 'F', 'C', 'G'], pad: 1, hats: 8, bass: 'pulse', intro: 1 },
        { bars: 8, chords: ['Am', 'F', 'C', 'G'], pad: 1, kick: 1, clap: 1, hats: 8, bass: 'pulse', stab: 1 },
        { bars: 8, chords: ['F', 'G', 'Em', 'Am'], pad: 1, kick: 1, clap: 1, hats: 16, bass: 'pulse', arp: 1, tune: 'lift', fill: 1 },
        { bars: 8, chords: ['Dm', 'F', 'Am', 'G'], pad: 1, hats: 0, bass: 'long', arp: 1, roll: 1 },
        { bars: 8, chords: ['C', 'G', 'Am', 'F'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'pulse', stab: 1, tune: 'chorus' },
        { bars: 8, chords: ['Am', 'F', 'C', 'G'], pad: 1, kick: 1, clap: 1, hats: 8, bass: 'bounce', stab: 1, arp: 1 },
        { bars: 8, chords: ['C', 'G', 'Am', 'F'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'bounce', stab: 1, arp: 1, tune: 'chorus', fill: 1 },
        { bars: 4, chords: ['Am', 'F', 'G', 'G'], pad: 1, kick: 1, hats: 8, bass: 'pulse', roll: 1 },
      ],
    },
    // Team builders: 'Matchday', 128 bpm in D minor - driving, with a bigger bass and louder stabs
    matchday: {
      bpm: 128, inst: { bassType: 'square', bassLp: 520, stabVol: 0.03, leadSaw: 1 },
      tunes: {
        lift: [[70, _, 74, _, 77, _, 74, _], [72, _, 76, _, 79, _, 76, _], [74, _, 77, _, 81, _, 77, _], [74, _, _, _, 69, _, _, _]],
        chorus: [[74, _, 77, _, 81, _, 77, 74], [74, _, 70, _, 74, _, 77, _], [77, _, 81, _, 84, _, 81, 77], [76, _, 79, _, 76, _, 72, _],
          [81, _, 77, _, 74, _, 77, 81], [82, _, 81, _, 77, _, 74, _], [77, _, 81, _, 84, _, 86, _], [84, _, _, _, 79, _, 76, _]],
      },
      song: [
        { bars: 4, chords: ['Dm', 'Bb', 'F', 'C'], pad: 1, hats: 16, bass: 'pulse', intro: 1 },
        { bars: 8, chords: ['Dm', 'Bb', 'F', 'C'], kick: 1, clap: 1, hats: 8, bass: 'bounce', stab: 1 },
        { bars: 8, chords: ['Bb', 'C', 'Dm', 'Dm'], pad: 1, kick: 1, clap: 1, hats: 16, bass: 'pulse', arp: 1, tune: 'lift', fill: 1 },
        { bars: 4, chords: ['Bb', 'C', 'Bb', 'C'], pad: 1, bass: 'long', arp: 1, roll: 1 },
        { bars: 8, chords: ['Dm', 'Bb', 'F', 'C'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'bounce', stab: 1, tune: 'chorus' },
        { bars: 8, chords: ['Dm', 'F', 'C', 'Bb'], kick: 1, clap: 1, hats: 8, bass: 'drive', stab: 1, arp: 1 },
        { bars: 8, chords: ['Dm', 'Bb', 'F', 'C'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'bounce', stab: 1, arp: 1, tune: 'chorus', fill: 1 },
      ],
    },
    // Puzzles (Footle, grids, Who Am I?, Tally): 'Thinking Cap', 90 bpm with swing - soft keys, no claps, jazzy chords
    puzzle: {
      bpm: 90, inst: { swing: 0.18, kickVol: 0.22, rim: 1, bassType: 'triangle', bassLp: 700, keys: 1, arpType: 'sine', arpVol: 0.014, hatVol: 0.022, soft: 1 },
      tunes: {
        noodle: [[76, _, _, 79, _, _, 76, _], [72, _, _, _, 69, _, _, _], [74, _, _, 77, _, _, 81, _], [79, _, _, _, _, _, _, _],
          [76, _, 74, _, 72, _, _, _], [69, _, _, 72, _, _, 76, _], [77, _, _, 76, _, 74, _, _], [72, _, _, _, _, _, _, _]],
      },
      song: [
        { bars: 4, chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'], pad: 1, bass: 'long', hats: 8, intro: 1 },
        { bars: 8, chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'], pad: 1, kick: 1, clap: 1, hats: 8, bass: 'walk', stab: 1 },
        { bars: 8, chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'], pad: 1, kick: 1, clap: 1, hats: 8, bass: 'walk', arp: 1, tune: 'noodle' },
        { bars: 8, chords: ['Am7', 'Dm7', 'G7', 'Cmaj7'], pad: 1, bass: 'long', arp: 1 },
        { bars: 8, chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'], pad: 1, kick: 1, clap: 1, hats: 8, bass: 'walk', stab: 1, tune: 'noodle' },
      ],
    },
    // Head to Head and the quick-fire games: 'Derby', 140 bpm in E minor - tense and fast
    derby: {
      bpm: 140, inst: { bassType: 'sawtooth', bassLp: 460, stabVol: 0.026, arpVol: 0.02, leadSaw: 1 },
      tunes: {
        chorus: [[76, _, 79, _, 83, _, 79, 76], [76, _, 72, _, 76, _, 79, _], [78, _, 81, _, 78, _, 74, _], [75, _, 78, _, 83, _, _, _],
          [83, _, 81, _, 79, _, 76, _], [79, _, 76, _, 72, _, 76, _], [74, _, 78, _, 81, _, 86, _], [83, _, _, _, 78, _, 75, _]],
      },
      song: [
        { bars: 4, chords: ['Em', 'C', 'D', 'B'], hats: 16, bass: 'drive', intro: 1 },
        { bars: 8, chords: ['Em', 'C', 'D', 'B'], kick: 1, clap: 1, hats: 16, bass: 'drive', stab: 1, arp: 1 },
        { bars: 8, chords: ['Em', 'C', 'D', 'B'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'drive', stab: 1, tune: 'chorus', fill: 1 },
        { bars: 4, chords: ['C', 'D', 'Em', 'B'], pad: 1, bass: 'long', arp: 1, roll: 1 },
        { bars: 8, chords: ['Em', 'C', 'D', 'B'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'drive', stab: 1, arp: 1, tune: 'chorus', fill: 1 },
      ],
    },
  };
  // Moneyball: 'Boardroom', 112 bpm in F minor - slick and busy, with a stock ticker chattering away over the top
  TRACKS.boardroom = {
    bpm: 112, inst: { swing: 0.08, keys: 1, kickVol: 0.42, bassType: 'square', bassLp: 600, arpType: 'triangle', arpVol: 0.018, hatVol: 0.03 },
    tunes: {
      deal: [[72, _, _, 75, _, 72, _, 68], [70, _, _, _, 68, _, 65, _], [67, _, 70, _, 75, _, 72, _], [72, _, _, _, _, _, _, _],
        [77, _, 75, _, 72, _, 75, _], [73, _, 72, _, 70, _, 68, _], [70, _, 72, _, 75, _, 79, _], [75, _, _, _, 72, _, _, _]],
    },
    song: [
      { bars: 4, chords: ['Fm', 'Db', 'Eb', 'Cm'], pad: 1, hats: 8, bass: 'long', ticker: 1, intro: 1 },
      { bars: 8, chords: ['Fm', 'Db', 'Eb', 'Cm'], pad: 1, kick: 1, clap: 1, hats: 16, bass: 'bounce', stab: 1, ticker: 1 },
      { bars: 8, chords: ['Fm', 'Db', 'Eb', 'Cm'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'bounce', stab: 1, arp: 1, tune: 'deal' },
      { bars: 8, chords: ['Db', 'Eb', 'Cm', 'Fm'], pad: 1, bass: 'long', arp: 1, ticker: 1, roll: 1 },
      { bars: 8, chords: ['Fm', 'Db', 'Eb', 'Cm'], pad: 1, kick: 1, clap: 1, hats: 16, open: 1, bass: 'bounce', stab: 1, arp: 1, tune: 'deal', ticker: 1, fill: 1 },
    ],
  };
  // Ultimate Wildcard CHAOS: 'Mayhem', 150 bpm in C minor - a wobbling bass, police sirens, a cheeky chromatic hook
  TRACKS.chaos = {
    bpm: 150, inst: { bassType: 'sawtooth', bassLp: 600, stabVol: 0.03, arpVol: 0.022, arpType: 'sawtooth', leadSaw: 1 },
    tunes: {
      hook: [[72, _, 75, _, 79, 78, 79, _], [72, _, 75, _, 80, 79, 80, _], [84, _, 82, _, 80, _, 79, _], [75, 76, 77, 78, 79, _, _, _],
        [72, _, 75, _, 79, 78, 79, _], [72, _, 75, _, 80, 79, 80, _], [84, 86, 87, _, 86, 84, 82, _], [79, _, 83, _, 86, _, _, _]],
    },
    song: [
      { bars: 4, chords: ['Cm', 'Cm', 'Ab', 'Bb'], hats: 16, bass: 'wobble', siren: 1, intro: 1 },
      { bars: 8, chords: ['Cm', 'Ab', 'Eb', 'Bb'], kick: 1, clap: 1, hats: 16, bass: 'wobble', stab: 1, arp: 1 },
      { bars: 8, chords: ['Cm', 'Ab', 'Eb', 'Bb'], kick: 1, clap: 1, hats: 16, open: 1, bass: 'drive', stab: 1, tune: 'hook', fill: 1 },
      { bars: 4, chords: ['Fm', 'Db', 'Eb', 'G'], pad: 1, bass: 'long', siren: 1, roll: 1 },
      { bars: 8, chords: ['Cm', 'Ab', 'Eb', 'Bb'], kick: 1, clap: 1, hats: 16, open: 1, bass: 'wobble', stab: 1, arp: 1, tune: 'hook', siren: 1, fill: 1 },
      { bars: 4, chords: ['Ab', 'Bb', 'Cm', 'G'], kick: 1, hats: 16, bass: 'drive', roll: 1 },
    ],
  };
  // which track plays where
  const SCENES = {
    anthem: ['', 'today', 'leaderboard', 'album', 'players', 'updates', 'settings', 'about', 'credits'],
    matchday: ['draft', 'daily', 'owner'],
    boardroom: ['moneyball', 'window', 'reign'],
    puzzle: ['footle', 'clubfootle', 'grid', 'dailygrid', 'whoami', 'tally', 'hattrick'],
    derby: ['h2h', 'h2hplay', 'hilo', 'hopper', 'online', 'auction', 'royale'],
    chaos: ['chaos'],
  };
  const trackFor = path => Object.keys(SCENES).find(k => SCENES[k].includes(path)) || 'anthem';
  let scene = 'anthem';

  function startMusic(name, from, until) {
    const T = TRACKS[name] || TRACKS.anthem, I = T.inst, SONG = T.song, c = X.ctx;
    const BARS = SONG.reduce((a, x) => a + x.bars, 0);
    const step = 60 / T.bpm / 4;
    const out = c.createGain(); out.connect(X.bg);
    const t00 = (from || now()) + 0.1;
    out.gain.setValueAtTime(0.0001, t00); out.gain.linearRampToValueAtTime(1.5, t00 + 1.2);  // fade in
    // the tune gets a little echo
    const lead = c.createGain(), echo = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
    echo.delayTime.value = step * 3; fb.gain.value = 0.3; wet.gain.value = 0.35;
    lead.connect(out); lead.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(out);
    let s = 0, t0 = t00, pass = 0;
    const inst = {
      kick: t => tone(150, { t, to: 45, glide: 0.12, dur: 0.22, vol: I.kickVol || 0.5, dest: out }),
      clap: (t, v = 0.11) => I.rim ? tone(1900, { t, type: 'triangle', dur: 0.04, vol: v * 0.5, dest: out })
        : [0, 0.01, 0.022].forEach(j => noise({ t: t + j, dur: 0.12, freq: 1600, q: 0.9, vol: v, dest: out })),
      hat: (t, open) => noise({ t, dur: open ? 0.18 : 0.04, type: 'highpass', freq: 7500, vol: open ? 0.05 : (I.hatVol || 0.035), dest: out }),
      bass: (t, n, len) => tone(midi(n), { t, dur: step * len, type: I.bassType || 'sawtooth', lp: I.bassLp || 380, vol: I.bassType === 'triangle' ? 0.2 : 0.14, dest: out }),
      stab: (t, ch) => I.keys
        ? ch.forEach(n => tone(midi(n + 12), { t, dur: step * 3, type: 'triangle', attack: 0.01, vol: 0.02, dest: out }))
        : ch.forEach(n => [-9, 9].forEach(d => tone(midi(n + 12), { t, dur: step * 1.4, type: 'sawtooth', lp: 1700, detune: d, vol: I.stabVol || 0.022, dest: out }))),
      pad: (t, ch, bars) => ch.forEach(n => tone(midi(n), { t, dur: step * 16 * bars, type: 'triangle', attack: 0.4, vol: I.soft ? 0.024 : 0.03, dest: out })),
      arp: (t, n) => tone(midi(n + 24), { t, dur: step * 0.9, type: I.arpType || 'square', lp: 2600, vol: I.arpVol || 0.016, dest: out }),
      tune: (t, n) => {
        if (I.soft) { tone(midi(n), { t, dur: step * 3, type: 'sine', vol: 0.04, dest: lead }); tone(midi(n + 12), { t, dur: step * 1.5, type: 'sine', vol: 0.008, dest: lead }); return; }
        tone(midi(n), { t, dur: step * 1.7, type: 'square', lp: 2400, vol: 0.028, dest: lead });
        tone(midi(n), { t, dur: step * 1.7, type: 'sawtooth', lp: I.leadSaw ? 3600 : 3000, detune: 8, vol: I.leadSaw ? 0.024 : 0.018, dest: lead });
      },
    };
    const ARPS = [[0, 1, 2, 1], [0, 2, 1, 2], [2, 1, 0, 1], [0, 1, 2, 3]];
    function schedule(horizon) {
      while (t0 < horizon) {
        const barAll = Math.floor(s / 16) % BARS, b = s % 16;
        if (barAll === 0 && b === 0 && s > 0) pass++;
        let sec = SONG[0], start = 0;
        for (const x of SONG) { if (barAll < start + x.bars) { sec = x; break; } start += x.bars; }
        const bar = barAll - start, [ch, root] = CH[sec.chords[bar % 4]], last = bar === sec.bars - 1;
        const r = GM.rng(name + pass + ':' + barAll + ':' + b);
        const t = t0 + (I.swing && b % 2 ? step * I.swing : 0);  // swing pushes the off-beat 16ths late
        if (b === 0 && sec.pad) inst.pad(t, ch, 1);
        if (sec.kick && (I.soft ? b % 8 === 0 : b % 4 === 0) && !(last && sec.fill && b >= 8)) inst.kick(t);
        if (sec.clap && (b === 4 || b === 12)) inst.clap(t);
        // drum roll into the next section: the last bar (or two, for a roll) fills with rising claps
        if ((sec.fill && last && b >= 8) || (sec.roll && bar >= sec.bars - 2 && (bar === sec.bars - 1 || b % 2 === 0))) {
          inst.clap(t, 0.03 + 0.08 * ((bar === sec.bars - 1 ? 16 : 0) + b) / 32);
        }
        if (sec.hats === 8 && b % 4 === 2) inst.hat(t, sec.open && b === 14);
        if (sec.hats === 16 && (b % 2 === 0 || r() < 0.2)) inst.hat(t, sec.open && b === 14 && bar % 2 === 1);
        if (sec.bass === 'pulse' && b % 2 === 0) inst.bass(t, b === 6 || b === 14 ? root + 12 : root, 1.8);
        if (sec.bass === 'bounce' && [0, 3, 6, 8, 10, 11, 14].includes(b)) inst.bass(t, [6, 11].includes(b) ? root + 12 : b === 14 ? root + 7 : root, 1.4);
        if (sec.bass === 'drive' && b % 2 === 0) inst.bass(t, b % 8 === 6 ? root + 12 : root, 1.2);
        if (sec.bass === 'walk' && b % 4 === 0) inst.bass(t, root + [0, 4, 7, 9][b / 4], 3.6);  // a walking line up the chord
        if (sec.bass === 'long' && b === 0) inst.bass(t, root, 15);
        // wobble: every 16th, the filter opening and closing like a dubstep bass
        if (sec.bass === 'wobble') tone(midi(b % 8 === 6 ? root + 12 : root), { t, dur: step * 0.95, type: 'sawtooth', lp: [260, 700, 1600, 700][b % 4] * (b >= 8 ? 1.3 : 1), vol: 0.13, dest: out });
        // a police siren sweeping up every other bar
        if (sec.siren && b === 0 && bar % 2 === 0) tone(midi(79), { t, to: midi(91), glide: step * 6, dur: step * 7, type: 'sawtooth', lp: 3200, vol: 0.016, dest: out });
        // the stock ticker: faint, fast blips that skip about
        if (sec.ticker && r() < 0.5) tone(3000 + (b % 3) * 420, { t, dur: 0.018, type: 'square', lp: 6000, vol: 0.007, dest: out });
        if (sec.stab && (I.keys ? b === 0 || b === 10 : b === 2 || b === 6 || b === 10 || b === 13)) inst.stab(t, ch);
        if (sec.arp && !sec.intro) {
          const pat = ARPS[(pass + Math.floor(barAll / 4)) % ARPS.length], notes = ch.concat(ch[0] + 12);
          if (!I.soft || b % 2 === 0) inst.arp(t, notes[pat[b % 4] % notes.length] + (b >= 8 ? 12 : 0));
        }
        if (sec.tune && b % 2 === 0) {
          const tune = T.tunes[sec.tune], n = tune[bar % tune.length][b / 2];
          if (n) inst.tune(t, n);
        }
        s++; t0 += step;
      }
    }
    if (until) { schedule(until - 1); return; }
    schedule(now() + 0.25);
    const timer = setInterval(() => schedule(now() + 0.25), 60);
    bgNodes.push({ stop: () => {  // fade out, then let go
      clearInterval(timer);
      try { out.gain.cancelScheduledValues(now()); out.gain.setTargetAtTime(0.0001, now(), 0.15); } catch (e) { }
      setTimeout(() => { out.disconnect(); echo.disconnect(); }, 900);
    } });
  }

  function stopBg() {
    clearInterval(bgTimer); bgTimer = null;
    bgNodes.forEach(n => { try { n.stop(); } catch (e) { } });
    bgNodes = []; bgMode = 'off';
  }
  /* Soundtrack: real recorded songs from music/playlist.json, shuffled, instead of the made-up tracks.
     To add a song, drop the .mp3 into music/ and add a line to playlist.json; nothing else needs changing. */
  const tunes = { list: null, order: [], i: -1, el: null, on: false, loading: null };
  function loadTunes() {
    return tunes.loading || (tunes.loading = fetch('music/playlist.json', { cache: 'no-cache' }).then(r => r.json())
      .then(j => { tunes.list = (j.tracks || []).filter(t => t.file); })
      .catch(() => { tunes.list = []; tunes.loading = null; }));
  }
  function shuffled(n, avoid) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (n > 1 && a[0] === avoid) a.push(a.shift());  // don't play the same song twice in a row
    return a;
  }
  function tuneVolume() { if (tunes.el) tunes.el.volume = Math.min(1, GM.sound.settings().bgVol * 0.7); }
  function nextTune(announce = true) {
    if (!tunes.list || !tunes.list.length) return;
    if (!tunes.order.length) tunes.order = shuffled(tunes.list.length, tunes.i);
    tunes.i = tunes.order.shift();
    const t = tunes.list[tunes.i];
    if (!tunes.el) {
      tunes.el = new Audio();
      tunes.el.preload = 'auto';
      tunes.el.onended = () => nextTune();
      tunes.el.onerror = () => { if (tunes.on) setTimeout(() => nextTune(false), 1500); };
    }
    tunes.el.src = 'music/' + encodeURIComponent(t.file);
    tuneVolume();
    if (tunes.on) tunes.el.play().catch(() => { });
    if (announce && tunes.on) GM.toast(`🎧 ${GM.esc(t.title)}${t.artist ? ' · ' + GM.esc(t.artist) : ''}`, 2600);
    document.dispatchEvent(new CustomEvent('gm-tune'));
  }
  async function startTunes() {
    tunes.on = true;
    if (!tunes.list) await loadTunes();
    if (!tunes.on) return;
    clearInterval(tuneFade);
    if (!tunes.el || !tunes.el.src) nextTune();
    else { tuneVolume(); tunes.el.play().catch(() => { }); }
  }
  // fade the song out over a moment rather than cutting it dead (a hard stop pops)
  let tuneFade = null;
  function stopTunes() {
    tunes.on = false; clearInterval(tuneFade);
    const el = tunes.el; if (!el || el.paused) return;
    tuneFade = setInterval(() => {
      if (tunes.on) { clearInterval(tuneFade); tuneVolume(); return; }
      el.volume = Math.max(0, el.volume - 0.08);
      if (el.volume <= 0.01) { clearInterval(tuneFade); el.pause(); }
    }, 16);
  }

  function syncBg() {
    if (!live) return;
    const bg = GM.sound.settings().bg;
    const want = document.hidden || bg === 'off' ? 'off' : bg === 'tunes' ? 'tunes' : scene;
    if (want === bgMode) return;
    stopBg(); stopTunes();
    X = live;
    if (want === 'tunes') startTunes();
    else if (want !== 'off') startMusic(want);
    bgMode = want;
  }

  /* ---------------------------------------------------------------- public */
  function unlock() {
    if (!live) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      live = makeStudio(new AC());
      applyVolumes();
    }
    if (live.ctx.state === 'suspended') live.ctx.resume();
    syncBg();
  }
  function applyVolumes() {
    if (!live) return;
    const s = GM.sound.settings();
    live.sfx.gain.setTargetAtTime(s.sfx ? s.sfxVol : 0, live.ctx.currentTime, 0.02);
    live.bg.gain.setTargetAtTime(s.bgVol * 0.8, live.ctx.currentTime, 0.1);
    tuneVolume();
  }

  GM.sound = {
    // the Play version has no Soundtrack (its licence covers the website only), so it falls back to the game's own music,
    // and starts with that music on (elsewhere music starts off). Sound effects start on everywhere.
    settings: () => { const bg = store.get('bg', GM.playSafe ? 'music' : 'off'); return { sfx: store.get('sfx', true), sfxVol: store.get('sfxVol', 0.7), bg: bg === 'tunes' && GM.playSafe ? 'music' : ['music', 'tunes'].includes(bg) ? bg : 'off', bgVol: store.get('bgVol', 0.5) }; },
    set(k, v) { store.set(k, v); applyVolumes(); syncBg(); },
    // the router calls this on every page change; the music follows the game area
    scene(path) { const t = trackFor(path); if (t !== scene) { scene = t; syncBg(); } },
    TRACKS: Object.keys(TRACKS),
    // the Soundtrack song playing now (or next), and a skip button for Settings
    nowPlaying: () => (tunes.list && tunes.i >= 0 ? tunes.list[tunes.i] : null),
    skipTune() { if (bgMode === 'tunes') nextTune(); },
    tuneList: () => loadTunes().then(() => tunes.list),
    play(name, arg) {
      if (!live || !store.get('sfx', true) || document.hidden) return;
      if (live.ctx.state !== 'running') return;
      X = live;
      try { name === 'rise' ? rise(now(), arg) : SOUNDS[name] && SOUNDS[name](now(), arg); } catch (e) { }
    },
    // Renders every sound (and a few seconds of each background) to a WAV, for checking them without a speaker
    async renderDemo(names = Object.keys(SOUNDS), gap = 1.6, bgSeconds = 0) {
      const sfxEnd = names.length * gap + 2, rate = 44100;
      const bgTotal = typeof bgSeconds === 'object' ? bgSeconds.reduce((t, x) => t + x[1], 0) : bgSeconds;
      const ctx = new OfflineAudioContext(1, Math.ceil((sfxEnd + bgTotal + 1) * rate), rate);
      const prev = X; X = makeStudio(ctx);
      X.bg.gain.value = 0.4;
      names.forEach((n, i) => SOUNDS[n](i * gap + 0.1));
      const liveNodes = bgNodes;
      if (bgSeconds) (typeof bgSeconds === 'object' ? bgSeconds : [['anthem', bgSeconds]]).reduce((t0, [name, secs]) => { startMusic(name, t0, t0 + secs); return t0 + secs; }, sfxEnd);
      bgNodes = liveNodes;
      const buf = await ctx.startRendering();
      X = prev;
      return buf.getChannelData(0);
    },
  };

  // sound only starts after the first tap (browser rule); pause everything when the app goes to the background
  ['pointerdown', 'keydown'].forEach(e => document.addEventListener(e, unlock, { capture: true, passive: true }));
  let hideTimer = null;
  document.addEventListener('visibilitychange', () => {
    if (!live) return;
    // fade everything down before pausing, and back up on return: stopping mid-wave is what made it pop
    const c = live.ctx, t = c.currentTime;
    clearTimeout(hideTimer);
    if (document.hidden) {
      [live.bg, live.sfx].forEach(g => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.15); });
      stopBg(); stopTunes();
      hideTimer = setTimeout(() => { if (document.hidden) c.suspend(); }, 250);
    } else {
      [live.bg, live.sfx].forEach(g => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); });
      c.resume().then(applyVolumes, applyVolumes); syncBg();
    }
  });
  // a soft click on buttons and tiles (sounds tied to specific actions play on top)
  document.addEventListener('click', e => {
    if (e.target.closest('.btn, .tile, .stat-btn, .tabbar a, .icon-btn, .seg button, .hard-toggle > *, .tab, .h2h-banner')) GM.sound.play('tap');
  }, true);
})();

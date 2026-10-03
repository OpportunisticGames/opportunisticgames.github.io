/* Goal Machine – the effects layer, for every game. PixiJS draws particles, light and motion on a see-through canvas
   over the page (sparks, smoke, rain, confetti, a black hole, lightning…), and lottie-web plays proper animations from
   LottieFiles (fx/lottie/, credits in fx/lottie/credits.json). Both load the first time a game asks for an effect,
   so nothing is downloaded for players who never see one. Calm mode (Settings → Look) and phones without WebGL get
   none of it: every call is safe to make and simply resolves, so callers keep their own fallback.
   Coordinates are the page's (getBoundingClientRect); anything with a getBoundingClientRect can be passed instead. */
'use strict';

(function () {
  const VQ = ((document.currentScript && document.currentScript.src) || '').split('?')[1] || '';
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src + (VQ ? '?' + VQ : ''); s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const calm = () => !!(GM.calm && GM.calm());
  const rect = t => (t && t.getBoundingClientRect ? t.getBoundingClientRect() : t) || { left: 0, top: 0, width: innerWidth, height: innerHeight };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------------------------------------------------------- PixiJS: one canvas, one particle list */
  let app = null, appP = null, failed = false, layer = null, glow = null;
  const alive = [], T = {};
  async function pixi() {
    if (app || failed || calm()) return app;
    appP = appP || (async () => {
      try {
        if (!window.PIXI) await load('js/vendor/pixi.min.js');
        const a = new PIXI.Application();
        await a.init({ backgroundAlpha: 0, resizeTo: window, antialias: true, autoDensity: true, resolution: 1, preference: 'webgl', autoStart: false });
        a.canvas.className = 'fx-canvas'; a.canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(a.canvas);
        layer = new PIXI.Container(); glow = new PIXI.Container();
        a.stage.addChild(layer, glow);
        textures();
        a.ticker.add(step);
        app = a;
      } catch (e) { failed = true; }
      return app;
    })();
    return appP;
  }
  // the particle shapes, drawn once on a 2D canvas
  function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return PIXI.Texture.from(c); }
  function textures() {
    const radial = (g, w, h, stops) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); stops.forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, w, h); };
    T.dot = tex(64, 64, (g, w, h) => radial(g, w, h, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]));
    T.hard = tex(16, 16, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 7, 0, 7); g.fill(); });
    T.spark = tex(64, 8, (g) => { const l = g.createLinearGradient(0, 0, 64, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.7, 'rgba(255,255,255,.8)'); l.addColorStop(1, '#fff'); g.fillStyle = l; g.beginPath(); g.ellipse(32, 4, 32, 3, 0, 0, 7); g.fill(); });
    T.smoke = tex(128, 128, (g, w, h) => { for (let k = 0; k < 7; k++) { const x = 34 + Math.random() * 60, y = 34 + Math.random() * 60, r = 22 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    T.rect = tex(10, 6, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 10, 6); });
    T.drop = tex(4, 26, (g) => { const l = g.createLinearGradient(0, 0, 0, 26); l.addColorStop(0, 'rgba(210,230,255,0)'); l.addColorStop(1, 'rgba(225,240,255,.85)'); g.fillStyle = l; g.fillRect(1, 0, 2, 26); });
    T.ring = tex(256, 256, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 10; g.shadowColor = '#fff'; g.shadowBlur = 18; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.stroke(); });
    T.leaf = tex(24, 14, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(12, 7, 11, 5, 0.3, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(2, 9); g.lineTo(22, 5); g.stroke(); });
    T.chunk = tex(20, 16, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(2, 10); g.lineTo(8, 1); g.lineTo(18, 4); g.lineTo(16, 14); g.lineTo(6, 15); g.closePath(); g.fill(); });
    T.note = tex(44, 24, (g) => { g.fillStyle = '#5fae6e'; g.fillRect(0, 0, 44, 24); g.strokeStyle = '#2f7a42'; g.lineWidth = 2; g.strokeRect(1, 1, 42, 22); g.fillStyle = '#8fd39b'; g.beginPath(); g.arc(22, 12, 7, 0, 7); g.fill(); g.fillStyle = '#1e5a2e'; g.font = 'bold 11px Arial'; g.textAlign = 'center'; g.fillText('£', 22, 16); });
    T.coin = tex(28, 28, (g) => { g.fillStyle = '#f2c230'; g.beginPath(); g.arc(14, 14, 12, 0, 7); g.fill(); g.strokeStyle = '#8a6406'; g.lineWidth = 2.5; g.stroke(); g.strokeStyle = '#b98a0c'; g.beginPath(); g.arc(14, 14, 6, 0, 7); g.stroke(); });
    T.paper = tex(22, 28, (g) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 22, 28); g.fillStyle = '#999'; for (let k = 0; k < 5; k++) g.fillRect(3, 4 + k * 5, 16 - (k % 2) * 5, 2); });
    T.flake = tex(16, 16, (g, w, h) => radial(g, w, h, [[0, '#fff'], [0.5, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]));
  }
  // a particle: a sprite plus how it moves (v velocity, a acceleration, drag, spin, life in s, scale from s0 to s1)
  function add(o) {
    const s = new PIXI.Sprite(o.tex || T.dot);
    s.anchor.set(0.5); s.x = o.x; s.y = o.y; s.tint = o.tint == null ? 0xffffff : o.tint; s.rotation = o.rot || 0;
    if (o.add) s.blendMode = 'add';
    s.visible = false;
    (o.glow ? glow : layer).addChild(s);
    alive.push({ s, vx: o.vx || 0, vy: o.vy || 0, ax: o.ax || 0, ay: o.ay || 0, drag: o.drag || 0, vr: o.vr || 0, life: o.life || 1, t: -(o.delay || 0),
      s0: o.scale == null ? 1 : o.scale, s1: o.scale1 == null ? (o.scale == null ? 1 : o.scale) : o.scale1, sy: o.sy || 1, a0: o.alpha == null ? 1 : o.alpha,
      fin: o.fadeIn == null ? 0.08 : o.fadeIn, fout: o.fadeOut == null ? 0.35 : o.fadeOut, flip: o.flip || 0, sway: o.sway || 0, swf: o.swf || 3, ph: Math.random() * 6, fn: o.fn });
    if (!app.ticker.started) app.ticker.start();
  }
  function step(tk) {
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    for (let i = alive.length - 1; i >= 0; i--) {
      const p = alive[i], s = p.s;
      p.t += dt;
      if (p.t < 0) continue;
      const f = p.t / p.life;
      if (f >= 1) { s.destroy(); alive.splice(i, 1); continue; }
      s.visible = true;
      p.vx += p.ax * dt; p.vy += p.ay * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      if (p.fn) p.fn(p, dt, f);
      s.x += p.vx * dt + (p.sway ? Math.sin(p.t * p.swf + p.ph) * p.sway * dt : 0); s.y += p.vy * dt;
      s.rotation += p.vr * dt;
      const sc = p.s0 + (p.s1 - p.s0) * f;
      s.scale.set(sc, sc * p.sy * (p.flip ? Math.cos(p.t * p.flip + p.ph) : 1));
      s.alpha = p.a0 * Math.min(1, p.fin ? f / p.fin : 1, p.fout ? (1 - f) / p.fout : 1);
    }
    if (!alive.length) { app.ticker.stop(); app.render(); }  // nothing left: stop drawing (and leave it clear)
  }
  const clear = () => { alive.splice(0).forEach(p => p.s.destroy()); if (app) { app.ticker.stop(); app.render(); } lots.splice(0).forEach(l => l.remove()); };
  window.addEventListener('hashchange', clear);

  const COLOURS = [0xff5ec8, 0xffe14a, 0x5ec8ff, 0x7dff6b, 0xffffff, 0xff8a3d, 0xa46bff];
  // each effect returns a promise for when it's (mostly) over; nothing happens without the canvas
  const E = {
    // paper confetti fluttering down over an area
    confetti(t, n = 140) { const r = rect(t); for (let k = 0; k < n; k++) add({ tex: T.rect, x: r.left + rnd(0, r.width), y: r.top - rnd(10, 160), vx: rnd(-30, 30), vy: rnd(60, 160), ay: 30, drag: 0.4, vr: rnd(-8, 8), rot: rnd(0, 6), tint: pick(COLOURS), scale: rnd(0.8, 1.4), flip: rnd(6, 14), sway: rnd(30, 70), swf: rnd(2, 4), life: rnd(2.4, 3.6), fadeOut: 0.2 }); return wait(3000); },
    // banknotes and coins fluttering down
    money(t, n = 36) { const r = rect(t); for (let k = 0; k < n; k++) { const note = k % 3; add({ tex: note ? T.note : T.coin, x: r.left + rnd(0, r.width), y: r.top - rnd(10, 200), vy: rnd(70, 140), ay: note ? 20 : 220, drag: note ? 0.6 : 0, vr: rnd(-3, 3), rot: rnd(0, 6), scale: note ? rnd(0.7, 1) : rnd(0.6, 0.9), flip: note ? rnd(4, 8) : rnd(10, 18), sway: note ? rnd(30, 60) : 0, life: rnd(2.2, 3.2), fadeOut: 0.2 }); } return wait(3000); },
    // a downpour with splashes
    rain(t, ms = 3000) { const r = rect(t), n = Math.round(ms / 12); for (let k = 0; k < n; k++) { const d = rnd(0, ms / 1000 - 0.4), x = r.left + rnd(-30, r.width), vy = rnd(700, 900), l = (r.height + 30) * rnd(0.45, 1) / vy; add({ tex: T.drop, x, y: r.top - 30, vx: 90, vy, rot: -0.12, life: l, delay: d, alpha: rnd(0.4, 0.8), fadeOut: 0.1, scale: rnd(0.8, 1.2), sy: 1.4 }); if (k % 3 === 0) add({ tex: T.hard, x: x + 90 * l, y: r.top - 30 + vy * l, vx: rnd(-40, 40), vy: -rnd(40, 80), ay: 400, scale: 0.25, alpha: 0.7, tint: 0xd8ecff, life: 0.25, delay: d + l, fadeIn: 0 }); } return wait(ms); },
    // snow drifting down
    snow(t, ms = 3000) { const r = rect(t); for (let k = 0; k < ms / 30; k++) add({ tex: T.flake, x: r.left + rnd(0, r.width), y: r.top - 10, vy: rnd(30, 70), sway: rnd(20, 40), swf: rnd(1, 2), scale: rnd(0.3, 0.8), alpha: rnd(0.6, 1), life: rnd(3, 5), delay: rnd(0, ms / 1000) }); return wait(ms); },
    // a burst of hot sparks
    sparks(x, y, o = {}) { for (let k = 0; k < (o.n || 30); k++) { const a = rnd(0, 6.28), v = rnd(120, o.speed || 420); add({ tex: T.spark, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), ay: 500, drag: 1.2, rot: a, fn: p => { p.s.rotation = Math.atan2(p.vy, p.vx); }, tint: o.tint || pick([0xffe14a, 0xffb347, 0xffffff]), add: true, glow: true, scale: rnd(0.3, 0.6), life: rnd(0.4, 0.9), fadeIn: 0 }); } return wait(900); },
    // a plume of smoke rising (coloured for flares)
    smoke(x, y, o = {}) { const ms = o.ms || 2000; for (let k = 0; k < (o.n || ms / 90); k++) add({ tex: T.smoke, x: x + rnd(-6, 6), y, vx: rnd(-20, 20) + (o.wind || 0), vy: -rnd(30, 70), drag: 0.3, vr: rnd(-0.6, 0.6), tint: o.tint || 0xdddddd, scale: rnd(0.2, 0.3), scale1: rnd(0.6, 1), alpha: o.alpha || 0.5, life: rnd(1.6, 2.6), delay: rnd(0, ms / 1000), fadeIn: 0.15, fadeOut: 0.6 }); return wait(ms + 1500); },
    // a flare going off: a hot core, sparks spitting and red smoke
    flare(x, y, ms = 3000, tint = 0xff4a3d) { E.smoke(x, y, { ms, tint, alpha: 0.6 }); for (let k = 0; k < ms / 40; k++) add({ tex: T.spark, x, y, vx: rnd(-80, 80), vy: -rnd(150, 300), ay: 380, scale: 0.25, tint: 0xffd34d, add: true, glow: true, life: rnd(0.3, 0.6), delay: rnd(0, ms / 1000), fadeIn: 0, fn: p => { p.s.rotation = Math.atan2(p.vy, p.vx); } }); add({ tex: T.dot, x, y, tint: 0xff6a3d, add: true, glow: true, scale: 0.9, scale1: 1.1, alpha: 0.9, life: ms / 1000, fadeIn: 0.05, fadeOut: 0.1, fn: p => { p.s.alpha = 0.6 + Math.random() * 0.4; } }); return wait(ms); },
    // an expanding ring of light
    shockwave(x, y, tint = 0xffffff, size = 1.6) { add({ tex: T.ring, x, y, tint, add: true, glow: true, scale: 0.05, scale1: size, alpha: 0.9, life: 0.7, fadeIn: 0, fadeOut: 0.7 }); return wait(700); },
    // a big bang: flash, ring, sparks and smoke
    burst(x, y, tint = 0xffb347) { add({ tex: T.dot, x, y, tint: 0xffffff, add: true, glow: true, scale: 1, scale1: 4, alpha: 1, life: 0.35, fadeIn: 0, fadeOut: 0.9 }); E.shockwave(x, y, tint); E.sparks(x, y, { n: 40, speed: 600, tint }); E.smoke(x, y, { n: 14, ms: 300, tint: 0x666666, alpha: 0.5 }); return wait(1200); },
    // a lightning strike from the sky to a point: a jagged, glowing bolt that flickers, then sparks where it lands
    lightning(x, y, top = 0) {
      if (!app) return wait(0);
      const g = new PIXI.Graphics(), pts = [[x + rnd(-60, 60), top]];
      const seg = 9; for (let k = 1; k < seg; k++) pts.push([x + rnd(-28, 28) * (1 - k / seg), top + (y - top) * k / seg]); pts.push([x, y]);
      const path = (w, c, a) => { g.moveTo(...pts[0]); pts.slice(1).forEach(p => g.lineTo(...p)); g.stroke({ width: w, color: c, alpha: a, cap: 'round', join: 'round' }); };
      path(18, 0x9fc6ff, 0.25); path(8, 0xcfe2ff, 0.6); path(3, 0xffffff, 1);
      g.blendMode = 'add'; glow.addChild(g);
      let t = 0; const flick = () => { t++; g.alpha = t % 2 ? 0.25 : 1; if (t < 7) setTimeout(flick, 60); else { g.destroy(); if (app && !alive.length) app.render(); } };
      if (!app.ticker.started) app.ticker.start(); setTimeout(flick, 60);
      E.sparks(x, y, { n: 26, tint: 0xcfe2ff, speed: 380 }); add({ tex: T.dot, x, y, tint: 0xcfe2ff, add: true, glow: true, scale: 0.5, scale1: 2.5, life: 0.5, fadeIn: 0 });
      return wait(600);
    },
    // a black hole: a dark core with a glowing disc, everything nearby spiralling in, then it snaps shut
    vortex(x, y, ms = 3000, R = 150) {
      const life = ms / 1000;
      // glow, then the dark centre on top of it (in the same layer, so it really is dark), then the bright disc round it
      add({ tex: T.dot, x, y, tint: 0x6a2bd8, add: true, glow: true, scale: 0.3, scale1: 5.5, alpha: 0.85, life, fadeIn: 0.2, fadeOut: 0.15 });
      add({ tex: T.hard, x, y, tint: 0x05010c, glow: true, scale: 1.5, scale1: 7, alpha: 1, life, fadeIn: 0.2, fadeOut: 0.1 });
      add({ tex: T.ring, x, y, tint: 0xd6b8ff, add: true, glow: true, scale: 0.25, scale1: 1.05, sy: 0.38, alpha: 0.95, life, vr: 2.5, fadeIn: 0.2, fadeOut: 0.15 });
      // matter spiralling in
      for (let k = 0; k < ms / 14; k++) {
        const a0 = rnd(0, 6.28), r0 = rnd(R * 0.6, R * 1.4), w = rnd(2.5, 4.5), l = rnd(0.9, 1.6);
        add({ tex: k % 4 ? T.dot : T.spark, x: x + Math.cos(a0) * r0, y: y + Math.sin(a0) * r0 * 0.45, tint: pick([0xd6b8ff, 0xa46bff, 0xffffff, 0x7fd6ff]), add: true, glow: true,
          scale: rnd(0.08, 0.2), alpha: 0.9, life: l, delay: rnd(0, life - l), fadeIn: 0.15, fadeOut: 0.15,
          fn: (p, dt, f) => { const a = a0 + w * p.t * (1 + f * 3), rr = r0 * (1 - f) ** 1.4; p.s.x = x + Math.cos(a) * rr; p.s.y = y + Math.sin(a) * rr * 0.45; p.vx = p.vy = 0; } });
      }
      setTimeout(() => E.shockwave(x, y, 0xd6b8ff, 1.2), ms - 200);
      return wait(ms);
    },
    // a tornado: a dark column of dust with leaves, paper and turf whirling round it as it crosses the area
    twister(t, ms = 2400) {
      const r = rect(t), life = ms / 1000, x0 = r.left - 60, x1 = r.left + r.width + 60, top = r.top, h = r.height;
      const cx = tt => x0 + (x1 - x0) * Math.min(1, tt / life);
      for (let k = 0; k < ms / 14; k++) {
        const hy = rnd(0, 1), ph = rnd(0, 6.28), sp = rnd(7, 12), rad = 14 + hy * 70, kind = [0, 0, 2, 2, 3, 0, 2, 3, 0, 1][k % 10], d = rnd(0, life - 0.6);
        add({ tex: kind === 0 ? T.leaf : kind === 1 ? T.paper : kind === 2 ? T.chunk : T.smoke, x: x0, y: top + h * (1 - hy),
          tint: kind === 0 ? pick([0x7cb342, 0xa0c050, 0xc9a24a]) : kind === 2 ? 0x6b4a2a : kind >= 3 ? 0x9aa0a8 : 0xffffff,
          scale: kind >= 3 ? rnd(0.35, 0.6) : rnd(0.5, 0.9), alpha: kind >= 3 ? 0.35 : 1, vr: rnd(-8, 8), life: rnd(0.6, 1.2), delay: d, fadeIn: 0.2, fadeOut: 0.3,
          // whirling round the funnel, which is wherever the tornado has got to by now
          fn: p => { const a = ph + p.t * sp; p.s.x = cx(d + p.t) + Math.cos(a) * rad; p.s.y = top + h * (1 - hy) - p.t * 30 + Math.sin(a) * rad * 0.18; p.vx = p.vy = 0; } });
      }
      return wait(ms);
    },
    // dust thrown up along a line (an earthquake crack) and bits of turf flying
    dust(points) { points.forEach(([x, y], k) => { E.smoke(x, y, { n: 4, ms: 300, tint: 0xb59a74, alpha: 0.5 }); for (let j = 0; j < 4; j++) add({ tex: T.chunk, x, y, vx: rnd(-80, 80), vy: -rnd(120, 260), ay: 700, vr: rnd(-10, 10), tint: 0x6b4a2a, scale: rnd(0.4, 0.8), life: 0.9, delay: k * 0.04, fadeIn: 0 }); }); return wait(1200); },
    // flames licking up from a point
    fire(x, y, ms = 1800) { for (let k = 0; k < ms / 12; k++) add({ tex: T.dot, x: x + rnd(-14, 14), y, vx: rnd(-15, 15), vy: -rnd(60, 130), tint: pick([0xffe14a, 0xff8a3d, 0xff5a2d]), add: true, glow: true, scale: rnd(0.35, 0.6), scale1: 0.05, life: rnd(0.5, 0.9), delay: rnd(0, ms / 1000), fadeIn: 0.1 }); E.smoke(x, y - 30, { ms, tint: 0x444444, alpha: 0.35 }); return wait(ms); },
    // fireworks over an area
    fireworks(t, n = 5) { const r = rect(t); for (let k = 0; k < n; k++) setTimeout(() => { const x = r.left + rnd(0.15, 0.85) * r.width, y = r.top + rnd(0.1, 0.45) * r.height, c = pick(COLOURS); for (let j = 0; j < 46; j++) { const a = (j / 46) * 6.28, v = rnd(160, 230); add({ tex: T.dot, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 120, drag: 1.4, tint: c, add: true, glow: true, scale: 0.18, life: rnd(1, 1.4), fadeIn: 0 }); } E.shockwave(x, y, c, 0.6); }, k * 380); return wait(n * 380 + 1400); },
    // a flash of light over the whole screen
    flash(tint = 0xffffff, a = 0.7) { add({ tex: T.rect, x: innerWidth / 2, y: innerHeight / 2, tint, scale: Math.max(innerWidth, innerHeight) / 4, alpha: a, life: 0.35, fadeIn: 0, fadeOut: 1 }); return wait(350); },
  };

  /* ---------------------------------------------------------------- Lottie */
  let lotP = null; const DATA = {}, lots = [];
  const lottieLib = () => (window.lottie ? Promise.resolve(window.lottie) : (lotP = lotP || load('js/vendor/lottie_light.min.js').then(() => window.lottie)));
  const json = name => (DATA[name] = DATA[name] || fetch('fx/lottie/' + name + '.json' + (VQ ? '?' + VQ : '')).then(r => { if (!r.ok) throw new Error(name); return r.json(); }));
  // play an animation into a container (made here, fixed over the page, or the one passed as o.into); returns a handle
  async function lottiePlay(name, o = {}) {
    if (calm()) return null;
    let L, d;
    try { [L, d] = await Promise.all([lottieLib(), json(name)]); } catch (e) { return null; }
    let el = o.into;
    if (!el) {
      const r = o.rect ? rect(o.rect) : { left: o.x - (o.w || 120) / 2, top: o.y - (o.h || o.w || 120) / 2, width: o.w || 120, height: o.h || o.w || 120 };
      el = document.createElement('div'); el.className = 'fx-lottie ' + (o.cls || '');
      Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.appendChild(el);
    }
    const holder = document.createElement('div'); holder.className = 'fx-lot' + (o.flip ? ' flip' : ''); el.appendChild(holder);
    const anim = L.loadAnimation({ container: holder, renderer: 'svg', loop: !!o.loop, autoplay: true, animationData: JSON.parse(JSON.stringify(d)), rendererSettings: { preserveAspectRatio: o.fit || 'xMidYMid meet' } });
    if (o.speed) anim.setSpeed(o.speed);
    const h = { el, anim, remove() { try { anim.destroy(); } catch (e) { /* gone */ } if (!o.into) el.remove(); else holder.remove(); const i = lots.indexOf(h); if (i >= 0) lots.splice(i, 1); } };
    if (o.into) h.el = holder;  // (so it's let go once the thing it's in has gone)
    lots.push(h);
    h.done = new Promise(res => { if (o.loop) return; anim.addEventListener('complete', res); setTimeout(res, (d.op - d.ip) / (d.fr || 30) * 1000 / (o.speed || 1) + 500); });
    if (!o.keep && !o.loop) h.done.then(() => h.remove());
    return h;
  }

  // a still frame of an animation as SVG markup (for things that stay on screen and are redrawn often, like a parked
  // ambulance): made once, then GM.FX.still(name) returns it straight away (null until it's ready)
  const STILL = {};
  async function makeStill(name, at = 0.5) {
    if (STILL[name] !== undefined || calm()) return STILL[name];
    STILL[name] = null;
    try {
      const [L, d] = await Promise.all([lottieLib(), json(name)]);
      const div = document.createElement('div'); div.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px';
      document.body.appendChild(div);
      const a = L.loadAnimation({ container: div, renderer: 'svg', loop: false, autoplay: false, animationData: JSON.parse(JSON.stringify(d)) });
      a.goToAndStop(d.ip + (d.op - d.ip) * at, true);
      const svg = div.querySelector('svg'); svg.removeAttribute('style'); svg.setAttribute('class', 'spr lot-still');
      STILL[name] = svg.outerHTML.replace(/__lottie_element_(\d+)/g, 'lst' + name + '_$1');  // its own ids, so copies don't clash with a live one
      a.destroy(); div.remove();
    } catch (e) { STILL[name] = null; }
    return STILL[name];
  }

  // looping animations whose element has left the page (a vehicle on a redrawn pitch) are stopped and let go
  setInterval(() => { lots.slice().forEach(h => { if (!h.el.isConnected) h.remove(); }); }, 2000);

  GM.FX = {
    still: name => STILL[name] || null,
    makeStill,
    // true once the canvas is up (call ready() first); false in Calm mode, without WebGL, or if loading failed
    get on() { return !!app && !calm(); },
    // start loading in the background (a game calls this when it opens, so the first effect isn't late)
    ready: () => pixi(),
    preload(names) { if (calm()) return; pixi(); lottieLib().catch(() => {}); (names || []).forEach(n => json(n).catch(() => {})); },
    clear,
    _alive: () => alive.length, _app: () => app,  // (tests)
    lottie: lottiePlay,
    rect,
  };
  // every effect: waits for the canvas, then plays (or does nothing)
  Object.keys(E).forEach(k => { GM.FX[k] = async (...a) => { if (calm()) return; const ok = await pixi(); if (!ok) return; return E[k](...a); }; });
})();

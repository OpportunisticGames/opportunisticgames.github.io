"""Halloween CHAOS promotional content for Google Play (LiveOps): a hand-built Lottie animation (no text, no logos).
   python3 make_promo.py   ->   halloween.json (the animation; the still image is rendered from it by render.js)
Spec: 16:9 (1920x1080), 60fps, 6 s, seamless loop, under 200 KB."""
import json, math, random

W, H, FPS, N = 1920, 1080, 60, 360          # 6 seconds
random.seed(31)
R = lambda v: round(v, 1)


def hexc(h, a=1):
    h = h.lstrip('#')
    return [round(int(h[i:i + 2], 16) / 255, 3) for i in (0, 2, 4)] + [a]


def st(v):
    return {"a": 0, "k": v}


def kf(frames, hold=False):
    """frames: [(t, value)] -> animated property (eased; the last one ends it)."""
    out = []
    for i, (t, v) in enumerate(frames):
        v = v if isinstance(v, list) else [v]
        k = {"t": t, "s": v}
        if i < len(frames) - 1:
            if hold:
                k["h"] = 1
            else:
                k["i"] = {"x": [0.45], "y": [1]}; k["o"] = {"x": [0.55], "y": [0]}
        out.append(k)
    return {"a": 1, "k": out}


def lin(frames):
    """linear keyframes (steady movement)"""
    out = []
    for i, (t, v) in enumerate(frames):
        k = {"t": t, "s": v if isinstance(v, list) else [v]}
        if i < len(frames) - 1:
            k["i"] = {"x": [1], "y": [1]}; k["o"] = {"x": [0], "y": [0]}
        out.append(k)
    return {"a": 1, "k": out}


def tr(p=(0, 0), a=(0, 0), s=(100, 100), r=0, o=100):
    f = lambda v: v if isinstance(v, dict) else st(list(v) if isinstance(v, tuple) else v)
    return {"ty": "tr", "p": f(p), "a": f(a), "s": f(s), "r": f(r), "o": f(o), "sk": st(0), "sa": st(0)}


def el(cx, cy, w, h):
    return {"ty": "el", "p": st([R(cx), R(cy)]), "s": st([R(w), R(h)]), "d": 1}


def rc(cx, cy, w, h, r=0):
    return {"ty": "rc", "p": st([R(cx), R(cy)]), "s": st([R(w), R(h)]), "r": st(r), "d": 1}


def sh(pts, closed=True, smooth=0.0):
    n = len(pts)
    ins, outs = [], []
    for i in range(n):
        if smooth and (closed or 0 < i < n - 1):
            a, b = pts[(i - 1) % n], pts[(i + 1) % n]
            tx, ty = (b[0] - a[0]) * smooth, (b[1] - a[1]) * smooth
            ins.append([R(-tx), R(-ty)]); outs.append([R(tx), R(ty)])
        else:
            ins.append([0, 0]); outs.append([0, 0])
    return {"ty": "sh", "ks": st({"i": ins, "o": outs, "v": [[R(x), R(y)] for x, y in pts], "c": closed}), "d": 1}


def fl(c, o=100):
    return {"ty": "fl", "c": st(hexc(c)) if isinstance(c, str) else st(c), "o": o if isinstance(o, dict) else st(o), "r": 1}


def stroke(c, w, o=100):
    return {"ty": "st", "c": st(hexc(c)), "o": st(o), "w": st(w), "lc": 2, "lj": 2, "ml": 4}


def grad(stops, s, e, radial=False, alpha=None):
    """stops: [(pos, hex)]; alpha: [(pos, a)] (optional)"""
    k = []
    for p, h in stops:
        k += [p] + hexc(h)[:3]
    if alpha:
        for p, a in alpha:
            k += [p, a]
    return {"ty": "gf", "o": st(100), "r": 1, "g": {"p": len(stops), "k": st(k)}, "s": st(list(s)), "e": st(list(e)),
            "t": 2 if radial else 1, **({"h": st(0), "a": st(0)} if radial else {})}


def glow_el(cx, cy, w, h, col, a0, mid=None, t_o=None):
    """a soft glow: alpha a0 at the centre fading to nothing at the edge of a w x h ellipse"""
    al = [(0, a0)] + ([mid] if mid else []) + [(1, 0)]
    g = gr([el(0, 0, w, w), grad([(0, col), (1, col)], (0, 0), (w / 2, 0), radial=True, alpha=al)],
           tr(p=(cx, cy), s=(100, R(h / w * 100)), o=t_o if t_o is not None else 100))
    return g


def gr(items, t=None, nm="g"):
    return {"ty": "gr", "nm": nm, "it": items + [t or tr()]}


layers = []


def layer(nm, shapes, p=(0, 0), a=(0, 0), s=(100, 100), r=0, o=100):
    f = lambda v: v if isinstance(v, dict) else st(list(v) if isinstance(v, tuple) else v)
    layers.append({"ddd": 0, "ind": len(layers) + 1, "ty": 4, "nm": nm, "sr": 1,
                   "ks": {"o": f(o), "r": f(r), "p": f(p), "a": f(a), "s": f(s)},
                   "ao": 0, "shapes": shapes, "ip": 0, "op": N, "st": 0, "bm": 0})


# ------------------------------------------------------------------ the scene, front to back (Lottie draws the first layer on top)
SIL = '#07020f'   # silhouettes

# cobweb in the top-left corner, and a spider bobbing on its thread
web = []
cx0, cy0 = 0, 0
spokes = [math.radians(a) for a in (2, 18, 34, 50, 66, 82, 88)]
for a in spokes:
    web.append(gr([sh([(cx0, cy0), (cx0 + math.cos(a) * 330, cy0 + math.sin(a) * 330)], closed=False), stroke('#e9e3ff', 2.2, 45)]))
for rad in (70, 130, 190, 250, 310):
    pts = [(cx0 + math.cos(a) * rad * (0.93 if i % 2 else 1), cy0 + math.sin(a) * rad * (0.93 if i % 2 else 1)) for i, a in enumerate(spokes)]
    web.append(gr([sh(pts, closed=False, smooth=0.12), stroke('#e9e3ff', 1.8, 38)]))
layer('cobweb', web)
spider = [gr([sh([(0, -400), (0, 0)], closed=False), stroke('#e9e3ff', 1.5, 55)]),
          gr([el(0, 14, 26, 30), fl(SIL)]), gr([el(0, -2, 16, 16), fl(SIL)])]
for sgn in (-1, 1):
    for j, dy in enumerate((2, 10, 18, 24)):
        spider.append(gr([sh([(0, dy + 4), (sgn * 18, dy - 6), (sgn * (26 + j * 2), dy + 12)], closed=False), stroke(SIL, 3)]))
spider += [gr([el(-4, -3, 4, 4), fl('#ff9a3c')]), gr([el(4, -3, 4, 4), fl('#ff9a3c')])]
layer('spider', spider, p=kf([(0, [215, 170]), (180, [215, 285]), (360, [215, 170])]))

# fog drifting along the front (a tile of soft puffs that moves exactly one tile per loop)
def fog(y, op, nm, speed_tiles=1):
    puffs = []
    for k in range(-1, 4):
        for j, (dx, dy, w, h) in enumerate(((0, 0, 620, 120), (300, 25, 520, 100))):
            x = k * 640 + dx
            puffs.append(glow_el(x, y + dy, w, h, '#d8ccff', op))
    layer(nm, puffs, p=lin([(0, [0, 0]), (N, [640 * speed_tiles, 0])]))

fog(1030, 0.38, 'fog front')

# pumpkins (jack-o'-lanterns) with a flickering candle inside
def pumpkin(nm, x, y, size, phase):
    s = size
    body = []
    for dx, w in ((-0.42, 0.62), (0.42, 0.62), (-0.2, 0.7), (0.2, 0.7), (0, 0.66)):
        body.append(gr([el(dx * s, 0, w * s, 0.86 * s), grad([(0, '#ffb347'), (0.6, '#f97316'), (1, '#9a3412')],
                                                              (dx * s - 0.1 * s, -0.2 * s), (dx * s + 0.45 * s, 0.3 * s), radial=True)]))
    stem = gr([sh([(-0.05 * s, -0.4 * s), (0.06 * s, -0.4 * s), (0.12 * s, -0.62 * s), (0.02 * s, -0.6 * s)]), fl('#3f6212')])
    glow_o = kf([(0, 80), (40 + phase, 100), (90 + phase, 70), (150, 100), (230 - phase, 75), (300, 100), (360, 80)])
    face = gr([sh([(-0.3 * s, -0.08 * s), (-0.12 * s, -0.08 * s), (-0.21 * s, -0.26 * s)]),        # eyes
               sh([(0.12 * s, -0.08 * s), (0.3 * s, -0.08 * s), (0.21 * s, -0.26 * s)]),
               sh([(-0.05 * s, 0.03 * s), (0.05 * s, 0.03 * s), (0, -0.06 * s)]),                     # nose
               sh([(-0.34 * s, 0.1 * s), (-0.2 * s, 0.14 * s), (-0.14 * s, 0.08 * s), (-0.06 * s, 0.16 * s), (0.04 * s, 0.09 * s),
                   (0.12 * s, 0.16 * s), (0.2 * s, 0.08 * s), (0.34 * s, 0.1 * s), (0.22 * s, 0.27 * s), (-0.22 * s, 0.27 * s)]),  # grin
               fl('#ffe27a', glow_o)])
    halo = glow_el(0, 0.05 * s, 2.6 * s, 1.7 * s, '#ff8a1f', 0.5, t_o=glow_o)
    shadow = gr([el(0, 0.42 * s, 1.5 * s, 0.22 * s), fl('#000000', 45)])
    layer(nm, [face, stem] + body[::-1] + [shadow, halo], p=(x, y))

pumpkin('pumpkin left', 250, 960, 210, 0)
pumpkin('pumpkin goal', 1385, 905, 120, 25)
pumpkin('pumpkin right', 1760, 1000, 150, 50)

# the football, resting on the pitch, catching the moonlight
ball = []
pent = lambda cx, cy, r, rot: [(cx + r * math.cos(rot + i * 2 * math.pi / 5), cy + r * math.sin(rot + i * 2 * math.pi / 5)) for i in range(5)]
ball.append(gr([sh(pent(2, 2, 13, -1.57)), sh(pent(-27, -12, 10, -0.6)), sh(pent(26, -16, 10, 0.4)), sh(pent(-18, 26, 10, 1.2)),
                sh(pent(22, 24, 10, 2)), fl('#1f1633')]))
ball.append(gr([el(0, 0, 76, 76), grad([(0, '#ffffff'), (1, '#b9b4cc')], (12, -14), (40, 30), radial=True)]))
ball.append(gr([el(0, 0, 76, 76), stroke('#1f1633', 2, 60)]))
ball.insert(0, ball.pop())  # (the outline on top)
ball.append(gr([el(4, 40, 80, 14), fl('#000000', 40)]))
layer('ball', ball, p=(1080, 975))

# the goal: posts and net lit by the moon
goal = []
gx0, gx1, gtop, gbot = 1440, 1800, 760, 925
net = []
for i in range(1, 12):
    x = gx0 + (gx1 - gx0) * i / 12
    net.append(sh([(x, gtop + 6), (x + 18, gbot - 30)], closed=False))
for j in range(1, 6):
    y = gtop + (gbot - 30 - gtop) * j / 6
    net.append(sh([(gx0 + 8, y), (gx1 - 8, y + 6)], closed=False))
goal.append(gr(net + [stroke('#cfc6ee', 2, 35)]))
goal.append(gr([rc(gx0, (gtop + gbot) / 2, 14, gbot - gtop), rc(gx1, (gtop + gbot) / 2, 14, gbot - gtop), rc((gx0 + gx1) / 2, gtop, gx1 - gx0 + 14, 14),
                fl('#f3efff')]))
goal.append(gr([el((gx0 + gx1) / 2, gbot + 8, gx1 - gx0 + 60, 26), fl('#000000', 35)]))
layer('goal', goal)

# the pitch: moonlit stripes and the edge of the centre circle
pitch = [gr([el(760, 975, 900, 170), stroke('#e9f5ee', 5, 45)])]
for i in range(6):
    y0 = 840 + i * 42
    pitch.append(gr([rc(W / 2, y0 + 21, W + 40, 42), fl('#174d36' if i % 2 else '#13412e')]))
pitch.append(gr([rc(W / 2, 960, W + 40, 240), grad([(0, '#1a0c33'), (1, '#05020a')], (0, 840), (0, 1080), alpha=[(0, 0.15), (1, 0.55)])]))
layer('pitch', pitch[:1] + [pitch[-1]] + pitch[1:-1][::-1])

# fog behind the goal
fog(835, 0.32, 'fog back')

# graveyard on the hill: tombstones, crosses, a bare tree and railings
yard = [gr([sh([(0, 860), (0, 790), (240, 770), (520, 790), (820, 772), (1100, 790), (1400, 768), (1700, 785), (1920, 772), (1920, 860)], smooth=0.15), fl(SIL)])]
for x, w, h in ((560, 46, 70), (660, 36, 50), (900, 52, 82), (1180, 40, 58), (1260, 30, 44)):
    yard.append(gr([rc(x, 790 - h / 2 + 6, w, h, w / 2.2), rc(x, 790 - h / 2 + 18, w, h - 12), fl(SIL)]))
for x, h in ((760, 96), (1040, 80)):
    yard.append(gr([rc(x, 790 - h / 2, 14, h), rc(x, 790 - h * 0.68, 52, 13), fl(SIL)]))
for i in range(18):
    yard.append(gr([rc(380 + i * 14, 768, 4, 44), fl(SIL)]))
yard.append(gr([rc(442, 752, 128, 4), fl(SIL)]))
tree = [(118, 790), (126, 600), (70, 520), (40, 470), (82, 506), (130, 560), (138, 470), (110, 400), (150, 455), (160, 520),
        (210, 450), (250, 420), (215, 470), (176, 560), (176, 640), (190, 790)]
yard.append(gr([sh(tree), fl(SIL)]))
layer('graveyard', yard)

# floodlights on the far side of the ground, lamps glowing
lights = []
for x in (520, 1700):
    for k in range(4):
        lights.append(gr([el(x - 33 + k * 22, 512, 14, 14), fl('#fff7d6')]))
    lights.append(gr([rc(x, 512, 90, 30, 4), fl('#140a24')]))
    lights.append(gr([sh([(x - 8, 790), (x - 3, 520), (x + 3, 520), (x + 8, 790)]), fl('#140a24')]))
    lights.append(glow_el(x, 512, 420, 260, '#fff3c4', 0.4))
layer('floodlights', lights)

# a bat: body and two flapping wings
def bat(nm, size, frames_path, flap=18, flip=False):
    s = size / 100
    wing = lambda sg: [sh([(0, 0), (sg * 22 * s, -26 * s), (sg * 52 * s, -30 * s), (sg * 74 * s, -12 * s), (sg * 60 * s, -8 * s),
                           (sg * 50 * s, 4 * s), (sg * 38 * s, -4 * s), (sg * 28 * s, 8 * s), (sg * 16 * s, 0)], smooth=0.08), fl(SIL)]
    flaps = [(t, [100, 100 if (t // flap) % 2 == 0 else -35]) for t in range(0, N + 1, flap)]
    sc = kf(flaps)
    shapes = [gr(wing(-1), tr(s=sc)), gr(wing(1), tr(s=sc)),
              gr([el(0, 4 * s, 16 * s, 30 * s), el(0, -10 * s, 14 * s, 14 * s),
                  sh([(-6 * s, -14 * s), (-4 * s, -24 * s), (-1 * s, -15 * s)]), sh([(6 * s, -14 * s), (4 * s, -24 * s), (1 * s, -15 * s)]), fl(SIL)]),
              gr([el(-3 * s, -11 * s, 3 * s, 3 * s), el(3 * s, -11 * s, 3 * s, 3 * s), fl('#ff9a3c')])]
    layer(nm, shapes, p=frames_path, s=(-100, 100) if flip else (100, 100))


def across(x0, x1, y, wob, t0=0):
    """steady crossing; wraps round so the loop is seamless (t0 = how far through it is at frame 0)"""
    span = x1 - x0
    fr = []
    for t in range(0, N + 1, 30):
        u = ((t + t0) % N) / N
        fr.append((t, [R(x0 + span * u), R(y + math.sin(u * 2 * math.pi * 3) * wob)]))
    # the jump back to the start happens off screen: split there with a hold
    out = []
    for i, (t, v) in enumerate(fr):
        out.append((t, v))
    keys = []
    for i, (t, v) in enumerate(out):
        k = {"t": t, "s": v}
        if i < len(out) - 1:
            nxt = out[i + 1][1]
            if abs(nxt[0] - v[0]) > 1000:   # wrapped: hold (off screen), then appear on the other side
                k["h"] = 1
            else:
                k["i"] = {"x": [1], "y": [1]}; k["o"] = {"x": [0], "y": [0]}
        keys.append(k)
    return {"a": 1, "k": keys}


bat('bat 1', 120, across(-200, 2120, 150, 30, 0), flap=12)
bat('bat 2', 80, across(-200, 2120, 470, 24, 160), flap=10)
bat('bat 3', 60, across(2120, -200, 220, 18, 90), flap=9)
bat('bat 4', 95, across(2120, -200, 600, 26, 260), flap=11)

# the witch on her broomstick, crossing in front of the moon
witch = [gr([sh([(-110, 8), (120, -6)], closed=False), stroke(SIL, 7)]),                                  # broom
         gr([sh([(-110, 8), (-160, -14), (-172, 6), (-162, 26), (-150, 30)]), fl(SIL)]),               # bristles
         gr([sh([(-30, 2), (20, -2), (6, -70), (-22, -60)]), fl(SIL)]),                                # body and cloak
         gr([sh([(-26, -62), (-60, -40), (-30, -40)]), fl(SIL)]),                                      # cape flap
         gr([el(4, -84, 28, 28), fl(SIL)]),                                                             # head
         gr([sh([(-22, -92), (36, -96), (14, -104), (30, -150), (-6, -106)]), fl(SIL)]),               # hat
         gr([sh([(20, -20), (54, -10), (52, -4), (18, -10)]), fl(SIL)])]                               # arm
layer('witch', witch, p=across(-320, 2260, 330, 22, 0), r=kf([(0, -6), (90, -2), (180, -7), (270, -2), (360, -6)]))

# the moon (and its glow, breathing gently)
moon = [gr([el(0, 0, 330, 330), grad([(0, '#fffbe8'), (1, '#f3e3b0')], (-40, -50), (200, 160), radial=True)]),
        gr([el(-60, -40, 60, 50), el(50, 50, 80, 70), el(70, -60, 36, 32), el(-30, 80, 40, 36), fl('#e7d39c', 55)])]
glow = [gr([glow_el(0, 0, 1000, 1000, '#ffe9a8', 0.55, mid=(0.35, 0.18))],
           tr(o=kf([(0, 85), (180, 100), (360, 85)]), s=kf([(0, [100, 100]), (180, [106, 106]), (360, [100, 100])])))]
layer('moon', moon, p=(1340, 330))
layer('moon glow', glow, p=(1340, 330))

# stars, twinkling
stars = []
for i in range(34):
    x, y, r = random.uniform(20, 1900), random.uniform(20, 640), random.choice((3, 3, 4, 5))
    if (x - 1340) ** 2 + (y - 330) ** 2 < 260 ** 2:
        continue
    per = random.choice((60, 90, 120, 180))
    ph = random.randrange(per)
    o = kf([(t, 100 if ((t + ph) // (per // 2)) % 2 == 0 else 25) for t in range(0, N + 1, per // 2)])
    stars.append(gr([el(x, y, r, r), fl('#ffffff')], tr(o=o)))
layer('stars', stars)

# the sky: deep purple night, a pumpkin glow along the horizon
sky = [glow_el(W / 2, 800, 2200, 700, '#ff7a1a', 0.5),
       glow_el(380, 280, 1300, 800, '#7c2bd1', 0.4),
       gr([rc(W / 2, H / 2, W + 40, H + 40), grad([(0, '#0d0420'), (0.55, '#2a0b4d'), (1, '#4a1350')], (0, 0), (0, 860))])]
layer('sky', sky)

anim = {"v": "5.7.4", "fr": FPS, "ip": 0, "op": N, "w": W, "h": H, "nm": "Halloween CHAOS", "ddd": 0, "assets": [], "layers": layers}
out = json.dumps(anim, separators=(',', ':'))
open('halloween.json', 'w').write(out)
print(f'halloween.json: {len(out) / 1024:.1f} KB, {len(layers)} layers, {N / FPS:.0f} s at {FPS} fps')

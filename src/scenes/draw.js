// Rubber-hose drawing helpers: outlined noodle tubes, ellipses, beaks and eyes.
// Everything is drawn into a Phaser Graphics object each frame.

export const OUTLINE = 0x1d2b1f;
export const OW = 3; // outline width

const v = (x, y) => ({ x, y });

// Line boil: outlines jitter slightly and re-draw on a hand-drawn frame rate,
// like 1930s cels. The scene bumps the frame ~12 times a second.
let boilFrame = 0;
export const BOIL = { amp: 0.9 };
export function setBoilFrame(n) { boilFrame = n; }
function jit(i, k) {
  const h = Math.sin(i * 12.9898 + boilFrame * 78.233 + k * 37.719) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 2 * BOIL.amp;
}
const boil = (p, i) => ({ x: p.x + jit(i, 1), y: p.y + jit(i, 2) });
export const add = (a, b) => v(a.x + b.x, a.y + b.y);
export const sub = (a, b) => v(a.x - b.x, a.y - b.y);
export const mul = (a, s) => v(a.x * s, a.y * s);
export const len = (a) => Math.hypot(a.x, a.y);
export const rot = (a, r) => {
  const c = Math.cos(r), s = Math.sin(r);
  return v(a.x * c - a.y * s, a.x * s + a.y * c);
};
export const lerp = (a, b, t) => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

// Points along a quadratic bezier.
export function quad(p0, c, p1, n = 12) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push(v(u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y));
  }
  return pts;
}

// Chaikin smoothing: turns a jointed chain into a soft noodle. Keeps the ends.
export function smooth(pts, iters = 3) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      out.push(lerp(p[i], p[i + 1], 0.25), lerp(p[i], p[i + 1], 0.75));
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

function fillTube(g, pts, w, color) {
  const half = w / 2;
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let t = sub(b, a);
    const l = len(t) || 1;
    t = mul(t, 1 / l);
    const n = v(-t.y * half, t.x * half);
    left.push(boil(add(pts[i], n), i + w));
    right.push(boil(sub(pts[i], n), i + 50 + w));
  }
  g.fillStyle(color, 1);
  g.fillPoints(left.concat(right.reverse()), true);
  g.fillCircle(pts[0].x, pts[0].y, half);
  g.fillCircle(pts[pts.length - 1].x, pts[pts.length - 1].y, half);
}

// Outlined noodle along a list of points.
export function tube(g, pts, w, color) {
  fillTube(g, pts, w + OW * 2, OUTLINE);
  fillTube(g, pts, w, color);
}

function ellipsePts(c, w, h, r, n = 28) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(boil(add(c, rot(v(Math.cos(a) * w / 2, Math.sin(a) * h / 2), r)), i + w));
  }
  return pts;
}

// Outlined ellipse, rotated.
export function ellipse(g, c, w, h, r, color) {
  g.fillStyle(OUTLINE, 1);
  g.fillPoints(ellipsePts(c, w + OW * 2, h + OW * 2, r), true);
  g.fillStyle(color, 1);
  g.fillPoints(ellipsePts(c, w, h, r), true);
}

export function circle(g, c, radius, color) {
  g.fillStyle(OUTLINE, 1);
  g.fillCircle(c.x, c.y, radius + OW);
  g.fillStyle(color, 1);
  g.fillCircle(c.x, c.y, radius);
}

// Beak pointing along angle a from the head centre; open 0..1 (HONK).
export function beak(g, head, headR, a, open, color) {
  const base = add(head, rot(v(headR - 3, 0), a));
  const tipLen = 22;
  const spread = 0.12 + open * 0.55;
  const upper = [add(base, rot(v(0, -6), a)), add(base, rot(v(tipLen, 0), a - spread * 0.5)), add(base, rot(v(0, 1), a))];
  const lower = [add(base, rot(v(0, 6), a)), add(base, rot(v(tipLen * 0.85, 0), a + spread)), add(base, rot(v(0, 1), a))];
  for (const tri of [lower, upper]) {
    g.lineStyle(OW, OUTLINE, 1);
    g.fillStyle(color, 1);
    g.fillPoints(tri, true);
    g.strokePoints(tri, true);
  }
}

// Eye: big white, pupil looking along look angle. mode: 'normal' | 'x' | 'dazed'
export function eye(g, c, r, look, mode, t = 0) {
  if (mode === 'x') {
    g.lineStyle(3, OUTLINE, 1);
    g.lineBetween(c.x - r, c.y - r, c.x + r, c.y + r);
    g.lineBetween(c.x - r, c.y + r, c.x + r, c.y - r);
    return;
  }
  circle(g, c, r, 0xffffff);
  const p = mode === 'dazed'
    ? add(c, v(Math.cos(t * 14) * r * 0.45, Math.sin(t * 14) * r * 0.45))
    : add(c, rot(v(r * 0.4, 0), look));
  g.fillStyle(OUTLINE, 1);
  g.fillCircle(p.x, p.y, r * 0.5);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(p.x - 1, p.y - 1, r * 0.15);
}

// Little cartoon star.
export function star(g, c, r, a, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const ang = a + (i / 10) * Math.PI * 2;
    pts.push(add(c, v(Math.cos(ang) * rr, Math.sin(ang) * rr)));
  }
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
  g.lineStyle(2, OUTLINE, 1);
  g.strokePoints(pts, true);
}

// 1930s pie-cut eye: tall white oval, black pupil with a wedge cut out.
// mode: 'normal' | 'x' | 'dazed'
export function pieEye(g, c, w, h, look, mode, t = 0) {
  if (mode === 'x') {
    g.lineStyle(3.5, OUTLINE, 1);
    g.lineBetween(c.x - w * 0.5, c.y - h * 0.4, c.x + w * 0.5, c.y + h * 0.4);
    g.lineBetween(c.x - w * 0.5, c.y + h * 0.4, c.x + w * 0.5, c.y - h * 0.4);
    return;
  }
  ellipse(g, c, w, h, 0, 0xffffff);
  const reach = mode === 'dazed'
    ? v(Math.cos(t * 14) * w * 0.22, Math.sin(t * 14) * h * 0.22)
    : rot(v(w * 0.18, 0), look);
  const p = add(c, add(reach, v(0, h * 0.08)));
  const pw = w * 0.55, ph = h * 0.68;
  g.fillStyle(OUTLINE, 1);
  g.fillPoints(ellipsePts(p, pw, ph, 0, 20), true);
  // The pie wedge: a white slice cut from the upper right of the pupil.
  const a0 = -Math.PI * 0.42, a1 = -Math.PI * 0.12;
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(p.x, p.y,
    p.x + Math.cos(a0) * pw * 0.6, p.y + Math.sin(a0) * ph * 0.6,
    p.x + Math.cos(a1) * pw * 0.6, p.y + Math.sin(a1) * ph * 0.6);
}

// White cartoon glove at c, pointing along angle a.
export function glove(g, c, a, size = 1) {
  const r = 7 * size;
  const fingers = [-0.6, -0.1, 0.4].map((da) => add(c, rot(v(r * 0.9, 0), a + da)));
  for (const f of fingers) circle(g, f, r * 0.5, 0xffffff);
  circle(g, c, r, 0xffffff);
  // Stitch lines on the back of the glove.
  g.lineStyle(1.5, OUTLINE, 1);
  for (const d of [-0.3, 0, 0.3]) {
    const p0 = add(c, rot(v(-r * 0.3, d * r * 1.4), a)), p1 = add(c, rot(v(r * 0.3, d * r * 1.4), a));
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  // Cuff.
  ellipse(g, add(c, rot(v(-r * 1.05, 0), a)), r * 0.7, r * 1.7, a, 0xffffff);
}

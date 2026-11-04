// Rubber-hose goose: drawn fresh every frame from springs, so it squashes,
// stretches, overlaps and follows through like a classic cartoon.
// Purely presentation; fed by the rules each frame.

import { add, sub, mul, rot, quad, tube, ellipse, circle, beak, eye, star } from './draw.js';

const v = (x, y) => ({ x, y });

// Damped spring (semi-implicit Euler with substeps so stiff springs stay stable).
class Spring {
  constructor(value, k, c) { this.v = value; this.vel = 0; this.k = k; this.c = c; }
  step(target, dt) {
    const n = 4, h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vel += (this.k * (target - this.v) - this.c * this.vel) * h;
      this.v += this.vel * h;
    }
  }
}

export class GooseRig {
  constructor(scene, colors, cfg) {
    this.scene = scene;
    this.colors = colors;
    this.cfg = cfg;
    this.g = scene.add.graphics().setDepth(10);
    this.x = 0; this.y = 0;          // feet ground point (world px)
    this.headX = new Spring(10, cfg.neckStiffness, cfg.neckDamping); // head offset from shoulder
    this.headY = new Spring(-44, cfg.neckStiffness, cfg.neckDamping);
    this.squash = new Spring(0, 420, 13); // + = squashed flat, - = stretched tall
    this.tilt = new Spring(0, 160, 12);   // body lean (radians, + = nose down)
    this.prevSpeedPx = 0;
    this.time = 0;
    this.dazed = 0;
    this.visible = true;
  }

  // --- impulses from gameplay events ---
  step() { this.squash.vel += 2.2; this.headY.vel += 70; }
  jump() { this.squash.v = -0.22; this.squash.vel = -1; this.headY.vel += 260; }
  land() { this.squash.vel += 5.5; this.headY.vel += 220; }
  smack() { this.squash.v = 0.35; this.headX.vel += 400; }

  // Pop back up from a ragdoll pose: springs start where the ragdoll lay.
  getUpFrom(rag) {
    const shoulder = this.shoulderWorld();
    this.headX.v = rag.head.x - shoulder.x;
    this.headY.v = rag.head.y - shoulder.y;
    this.headX.vel = 0; this.headY.vel = -150;
    let a = rag.angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    this.tilt.v = Math.max(-1.4, Math.min(1.4, a));
    this.squash.v = 0.35;
    this.dazed = this.cfg.dazedTime;
  }

  shoulderWorld() {
    const body = this.bodyCentre(0);
    return add(body, rot(v(22, -10), this.tilt.v));
  }

  bodyCentre(bob) {
    return v(this.x, this.y - this.cfg.legLen - 14 - bob);
  }

  // s: { x, y, speedFrac, speedPx, phase, air, dt }
  update(s) {
    const dt = s.dt;
    this.time += dt;
    this.x = s.x; this.y = s.y;
    if (this.dazed > 0) this.dazed = Math.max(0, this.dazed - dt);
    const sf = s.speedFrac;

    // Inertia: speeding up throws the head back, slowing down throws it forward.
    const accel = (s.speedPx - this.prevSpeedPx) / Math.max(dt, 1e-3);
    this.prevSpeedPx = s.speedPx;
    this.headX.vel -= accel * dt * this.cfg.neckInertia;

    // Targets. At speed the neck flops right back and stretches like rubber.
    const flop = sf * this.cfg.neckFlop;
    const restLen = 46 * (1 + this.cfg.neckStretch * sf);
    const rest = rot(v(0.22 * restLen, -0.97 * restLen), -flop);
    this.headX.step(rest.x, dt);
    this.headY.step(rest.y, dt);
    this.squash.step(0, dt);
    this.squash.v = Math.max(-0.35, Math.min(0.4, this.squash.v));
    this.tilt.step(sf * 0.22, dt);

    this.s = s;
  }

  draw() {
    const g = this.g;
    g.clear();
    if (!this.visible) return;
    const { colors, cfg } = this;
    const s = this.s;
    const sf = s.speedFrac;
    const t = this.time;
    const moving = Math.min(1, s.speedPx / 80);

    const bob = s.air ? 0 : Math.abs(Math.sin(s.phase)) * moving * 6;
    const body = this.bodyCentre(bob);
    const tilt = this.tilt.v;
    const sq = this.squash.v;
    const bw = 64 * (1 + sq + sf * 0.08), bh = 40 * (1 - sq);

    // Legs: noodles from hip to a foot that loops round like a wheel.
    const legs = [0, Math.PI].map((off, i) => {
      const hip = add(body, rot(v(i ? 6 : -6, bh * 0.3), tilt));
      let foot;
      if (s.air) {
        // Cartoon scramble: legs keep pedalling in mid-air.
        const p = t * 26 + off;
        foot = add(hip, v(Math.cos(p) * 16, cfg.legLen * 0.75 + Math.sin(p) * 8));
      } else {
        const p = s.phase + off;
        const stride = (8 + 26 * sf) * moving;
        const lift = (6 + 20 * sf) * moving;
        foot = v(hip.x + Math.cos(p) * stride, this.y - Math.max(0, Math.sin(p)) * lift);
      }
      const d = sub(foot, hip);
      const l = Math.hypot(d.x, d.y) || 1;
      // Knees bow forward; more bend when the leg is scrunched up.
      const bend = 6 + Math.max(0, cfg.legLen - l) * 0.9;
      const ctrl = add(mul(add(hip, foot), 0.5), v((-d.y / l) * -bend + 4, (d.x / l) * bend * 0.2));
      return { hip, foot, ctrl, p: s.phase + off };
    });

    // Wings pump like arms; in the air they flap wildly.
    const wings = [0, Math.PI].map((off) => {
      const anchor = add(body, rot(v(4, -6), tilt));
      // Arm-pump: swings down-forward and back-up with the stride.
      const a = s.air
        ? -2.4 + Math.sin(t * 30 + off) * 0.8
        : Math.PI * 0.6 + Math.sin(s.phase + off + Math.PI) * (0.2 + 1.0 * sf) * moving;
      const tip = add(anchor, v(Math.cos(a) * 24, Math.sin(a) * 24));
      const ctrl = add(mul(add(anchor, tip), 0.5), rot(v(0, -7), a - Math.PI / 2));
      return quad(anchor, ctrl, tip, 8);
    });

    const shoulder = add(body, rot(v(bw * 0.34, -bh * 0.25), tilt));
    const head = add(shoulder, v(this.headX.v, this.headY.v));
    // Neck control: rises out of the shoulder, so a flopped head bends it into a curve.
    const neckCtrl = add(shoulder, rot(v(6, -30), tilt * 0.5));
    const neckPts = quad(shoulder, neckCtrl, head, 14);
    const tangent = sub(head, neckCtrl);
    // Beak follows the head's tilt but never points straight up or down.
    const beakA = Math.max(-1.0, Math.min(0.6, Math.atan2(tangent.y, tangent.x) + Math.PI / 2));

    const drawLeg = (L) => {
      tube(g, quad(L.hip, L.ctrl, L.foot, 10), 7, colors.leg);
      ellipse(g, add(L.foot, v(6, -2)), 20, 8, s.air ? 0.4 : Math.sin(L.p) * 0.3, colors.leg);
    };

    // Back leg + wing, neck, body, tail, head, front leg + wing.
    drawLeg(legs[1]);
    tube(g, wings[1], 10, colors.wing);
    tube(g, neckPts, 13, colors.body);
    const tail = add(body, rot(v(-bw * 0.48, -bh * 0.2), tilt));
    g.fillStyle(0x1d2b1f, 1);
    g.fillTriangle(tail.x - 18, tail.y - 9 - 3, tail.x + 4, tail.y - 5, tail.x + 4, tail.y + 9);
    g.fillStyle(colors.body, 1);
    g.fillTriangle(tail.x - 14, tail.y - 8, tail.x + 4, tail.y - 2, tail.x + 4, tail.y + 6);
    ellipse(g, body, bw, bh, tilt, colors.body);
    circle(g, head, 14, colors.body);
    const open = sf > 0.85 ? 0.55 + Math.sin(t * 28) * 0.25 : 0.06 + sf * 0.15;
    beak(g, head, 14, beakA, open, colors.beak);
    const eyeC = add(head, rot(v(2, -5), beakA));
    eye(g, eyeC, 6, beakA, this.dazed > 0 ? 'dazed' : 'normal', t);
    if (sf > 0.55 && this.dazed === 0) {
      // Determined brow.
      const b0 = add(eyeC, rot(v(-7, -9), beakA)), b1 = add(eyeC, rot(v(7, -5), beakA));
      g.lineStyle(3, 0x1d2b1f, 1);
      g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    }
    drawLeg(legs[0]);
    tube(g, wings[0], 10, colors.wing);

    if (this.dazed > 0) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + (i * Math.PI * 2) / 3;
        star(g, add(head, v(Math.cos(a) * 24, -20 + Math.sin(a) * 7)), 6, t * 4, 0xffd23f);
      }
    }
  }

  setVisible(on) { this.visible = on; if (!on) this.g.clear(); }
}

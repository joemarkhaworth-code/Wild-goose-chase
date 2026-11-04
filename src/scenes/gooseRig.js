// Rubber-hose goose: drawn fresh every frame from springs, so it squashes,
// stretches, overlaps and follows through like a classic cartoon.
// Purely presentation; fed by the rules each frame.

import {
  add, sub, mul, rot, quad, tube, ellipse, circle, beak, star, pieEye,
  flipper, featherFan, drop,
} from './draw.js';

const v = (x, y) => ({ x, y });
const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
    this.look = new Spring(0, 90, 11);    // 0 = looking ahead, 1 = looking back in panic
    this.prevSpeedPx = 0;
    this.time = 0;
    this.dazed = 0;
    this.visible = true;
    this.drops = [];                      // sweat drops (model space)
    this.dropTimer = 0;
  }

  // --- impulses from gameplay events ---
  step() { this.squash.vel += 2.2; this.headY.vel += 70; }
  jump() { this.squash.v = -0.22; this.squash.vel = -1; this.headY.vel += 260; }
  land() { this.squash.vel += 5.5; this.headY.vel += 220; }
  smack() { this.squash.v = 0.35; this.headX.vel += 400; }

  // Pop back up from a ragdoll pose: springs start where the ragdoll lay.
  getUpFrom(rag) {
    // Ragdoll positions are world space; the rig draws scaled about its feet.
    const S = this.cfg.drawScale;
    const shoulder = this.shoulderWorld();
    this.headX.v = this.x + (rag.head.x - this.x) / S - shoulder.x;
    this.headY.v = this.y + (rag.head.y - this.y) / S - shoulder.y;
    this.headX.vel = 0; this.headY.vel = -150;
    let a = rag.angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    this.tilt.v = Math.max(-1.4, Math.min(1.4, a));
    this.squash.v = 0.35;
    this.look.v = 0;
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
    const cfg = this.cfg;

    // Inertia: speeding up throws the head back, slowing down throws it forward.
    const accel = (s.speedPx - this.prevSpeedPx) / Math.max(dt, 1e-3);
    this.prevSpeedPx = s.speedPx;
    this.headX.vel -= accel * dt * cfg.neckInertia;

    // Targets. At speed the neck flops right back, nearly flat, and stretches
    // like rubber while the goose looks back over its shoulder in panic.
    const flop = Math.pow(sf, 1.3) * cfg.neckFlop;
    const restLen = 46 * (1 + cfg.neckStretch * sf);
    const rest = rot(v(0.22 * restLen, -0.97 * restLen), -flop);
    this.headX.step(rest.x, dt);
    this.headY.step(rest.y, dt);
    this.squash.step(0, dt);
    this.squash.v = Math.max(-0.35, Math.min(0.4, this.squash.v));
    this.tilt.step(sf * 0.12, dt);
    this.look.step(this.dazed > 0 ? 0 : smoothstep(cfg.panicFrom, cfg.panicFull, sf), dt);

    // Sweat drops fly off when panicking.
    this.dropTimer -= dt;
    if (this.look.v > 0.5 && this.dropTimer <= 0 && !s.air) {
      this.dropTimer = 0.09;
      const head = this.headModel ?? v(this.x, this.y - 100);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      this.drops.push({
        p: add(head, rot(v(18, 0), a)),
        vel: add(rot(v(140, 0), a), v(-120 * sf, 0)),
        life: 0.45,
      });
    }
    for (const d of this.drops) {
      d.vel.y += 600 * dt;
      d.p = add(d.p, mul(d.vel, dt));
      d.life -= dt;
    }
    this.drops = this.drops.filter((d) => d.life > 0);

    this.s = s;
  }

  draw() {
    const g = this.g;
    g.clear();
    if (!this.visible) return;
    // Draw in model space, scaled up about the feet so it stays on the ground.
    const S = this.cfg.drawScale;
    g.setScale(S).setPosition(this.x * (1 - S), this.y * (1 - S));
    const { colors, cfg } = this;
    const s = this.s;
    const sf = s.speedFrac;
    const t = this.time;
    const moving = Math.min(1, s.speedPx / 80);
    const panic = this.look.v;

    // Idle: bounce to the beat like a 1930s cartoon (everything's alive).
    const idle = s.air ? 0 : 1 - moving;
    const beat = t * (cfg.bpm / 60) * Math.PI;
    const bob = s.air ? 0 : Math.abs(Math.sin(s.phase)) * moving * 6 + idle * Math.abs(Math.sin(beat)) * 7;
    const body = this.bodyCentre(bob);
    const tilt = this.tilt.v + idle * Math.sin(beat) * 0.06;
    const sq = this.squash.v + idle * 0.09 * Math.cos(beat * 2);
    // Stretch long and low with speed.
    const bw = 64 * (1 + sq + sf * cfg.bodyStretch), bh = 40 * (1 - sq - sf * cfg.bodyStretch * 0.35);

    // Legs: noodles from hip to a foot that loops round like a wheel.
    const legs = [0, Math.PI].map((off, i) => {
      const hip = add(body, rot(v(i ? 8 : -4, bh * 0.3), tilt));
      let foot;
      if (s.air) {
        // Cartoon scramble: legs keep pedalling in mid-air.
        const p = t * 26 + off;
        foot = add(hip, v(Math.cos(p) * 16, cfg.legLen * 0.75 + Math.sin(p) * 8));
      } else {
        const p = s.phase + off;
        const stride = (8 + 34 * sf) * moving;
        const lift = (6 + 18 * sf) * moving;
        foot = v(hip.x + Math.cos(p) * stride, this.y - Math.max(0, Math.sin(p)) * lift);
      }
      const d = sub(foot, hip);
      const l = Math.hypot(d.x, d.y) || 1;
      // Knees bow forward; more bend when the leg is scrunched up.
      const bend = 6 + Math.max(0, cfg.legLen - l) * 0.9;
      const ctrl = add(mul(add(hip, foot), 0.5), v((d.y / l) * bend + 4, (-d.x / l) * bend * 0.2));
      return { hip, foot, ctrl, p: s.phase + off };
    });

    // Wings: arm-pump with the stride; flap wildly in the air; fling back in panic.
    const wings = [0, Math.PI].map((off) => {
      const anchor = add(body, rot(v(6, -8), tilt));
      let a = s.air
        ? -2.4 + Math.sin(t * 30 + off) * 0.8
        : Math.PI * 0.6 + Math.sin(s.phase + off + Math.PI) * (0.2 + 1.0 * sf) * moving
          + idle * Math.sin(beat + off) * 0.35;
      a += panic * (Math.PI * 0.35 - a) * 0.5 * (1 - (s.air ? 1 : 0));
      const tip = add(anchor, v(Math.cos(a) * 26, Math.sin(a) * 26));
      const ctrl = add(mul(add(anchor, tip), 0.5), rot(v(0, -7), a - Math.PI / 2));
      return { pts: quad(anchor, ctrl, tip, 8), tip, a };
    });

    const shoulder = add(body, rot(v(bw * 0.34, -bh * 0.25), tilt));
    const head = add(shoulder, v(this.headX.v, this.headY.v));
    this.headModel = head;
    // Neck control: rises out of the shoulder, so a flopped head bends it into a curve.
    const neckCtrl = add(shoulder, rot(v(10 + 10 * sf, -30 + 8 * sf), tilt * 0.5));
    const neckPts = quad(shoulder, neckCtrl, head, 16);
    const tangent = sub(head, neckCtrl);
    // Beak follows the head's tilt; in panic the head turns right round to look back.
    const fwd = Math.max(-1.0, Math.min(0.6, Math.atan2(tangent.y, tangent.x) + Math.PI / 2));
    const back = -Math.PI - 0.15;
    const beakA = fwd + (back - fwd) * panic;

    const drawLeg = (L) => {
      tube(g, quad(L.hip, L.ctrl, L.foot, 10), 7, colors.leg);
      flipper(g, L.foot, s.air ? 0.5 : Math.sin(L.p) * 0.35, 1.05, colors.leg);
    };
    const drawWing = (W) => {
      tube(g, W.pts, 10, colors.wing);
      featherFan(g, W.tip, W.a, 1, colors.wing);
    };

    // Back leg + wing, neck, body, tail, head, front leg + wing.
    drawLeg(legs[1]);
    drawWing(wings[1]);
    tube(g, neckPts, 14, colors.body);
    const tail = add(body, rot(v(-bw * 0.48, -bh * 0.2), tilt));
    g.fillStyle(0x1d2b1f, 1);
    g.fillTriangle(tail.x - 18, tail.y - 12, tail.x + 4, tail.y - 5, tail.x + 4, tail.y + 9);
    g.fillStyle(colors.body, 1);
    g.fillTriangle(tail.x - 14, tail.y - 8, tail.x + 4, tail.y - 2, tail.x + 4, tail.y + 6);
    ellipse(g, body, bw, bh, tilt, colors.body);

    const HR = 16 + panic * 2;
    circle(g, head, HR, colors.body);
    const open = Math.max(panic * (0.75 + Math.sin(t * 30) * 0.2), sf > 0.85 ? 0.55 : 0.06 + sf * 0.15);
    beak(g, head, HR, beakA, open, colors.beak);
    // Two tall pie-cut eyes, the far one peeking past the near one; huge in panic.
    const mode = this.dazed > 0 ? 'dazed' : 'normal';
    const ew = 10 + panic * 3, eh = 15 + panic * 4;
    const eyeFar = add(head, rot(v(9, -7), beakA));
    const eyeNear = add(head, rot(v(0, -6), beakA));
    pieEye(g, eyeFar, ew - 1, eh - 1, beakA, mode, t + 0.3);
    pieEye(g, eyeNear, ew, eh, beakA, mode, t);
    if (this.dazed === 0 && (panic > 0.3 || sf > 0.55)) {
      g.lineStyle(3, 0x1d2b1f, 1);
      for (const e of [eyeNear, eyeFar]) {
        // Determined brows slope down to the beak; worried brows slope up.
        const worried = panic > 0.3;
        const b0 = add(e, rot(v(-6, worried ? -13 : -11), beakA));
        const b1 = add(e, rot(v(5, worried ? -16 : -7), beakA));
        g.lineBetween(b0.x, b0.y, b1.x, b1.y);
      }
    }
    drawLeg(legs[0]);
    drawWing(wings[0]);

    for (const d of this.drops) drop(g, d.p, Math.atan2(d.vel.y, d.vel.x), 4);

    if (this.dazed > 0) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + (i * Math.PI * 2) / 3;
        star(g, add(head, v(Math.cos(a) * 26, -24 + Math.sin(a) * 7)), 6, t * 4, 0xffd23f);
      }
    }
  }

  setVisible(on) { this.visible = on; if (!on) this.g.clear(); }
}

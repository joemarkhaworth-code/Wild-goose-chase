// Rubber-hose goose ragdoll: invisible Matter.js bodies joined by constraints,
// drawn every frame as the same noodle goose (soft neck, bendy legs).
// Purely presentation: the rules (runner.js) decide where the goose ends up;
// the ragdoll is steered toward that so getting up doesn't teleport.

import { add, rot, smooth, tube, ellipse, circle, beak, pieEye, glove } from './draw.js';

const GROUP = -1; // negative group: ragdoll parts never collide with each other
const v = (x, y) => ({ x, y });

export function spawnRagdoll(scene, x, feetY, colors, launch, cfg, onImpact, drawScale = 1) {
  const M = scene.matter;
  const Body = Phaser.Physics.Matter.Matter.Body;
  const opts = (extra = {}) => ({
    collisionFilter: { group: GROUP },
    friction: cfg.friction,
    frictionAir: 0.01,
    restitution: cfg.restitution,
    ...extra,
  });

  const torso = M.add.rectangle(x, feetY - 52, 60, 36, opts({ chamfer: { radius: 16 }, density: 0.002 }));
  const neck = [0, 1, 2].map((i) => M.add.circle(x + 22 + i * 4, feetY - 72 - i * 13, 6, opts({ density: 0.0008 })));
  const head = M.add.circle(x + 32, feetY - 112, 14, opts({ density: 0.001 }));
  const wings = [0, 1].map(() => M.add.rectangle(x - 10, feetY - 60, 30, 10, opts({ density: 0.0005 })));
  const legs = [-6, 6].map((dx) => M.add.rectangle(x + dx, feetY - 19, 6, 38, opts({ density: 0.0008 })));
  const feet = [-1, 11].map((dx) => M.add.rectangle(x + dx, feetY, 18, 6, opts({ density: 0.0008 })));

  const s = cfg.stiffness;
  const joint = (a, b, pa, pb, k = s) => M.add.constraint(a, b, 0, k, { pointA: pa, pointB: pb, damping: 0.05 });
  const joints = [
    joint(torso, neck[0], { x: 20, y: -12 }, { x: 0, y: 5 }),
    joint(neck[0], neck[1], { x: 0, y: -6 }, { x: 0, y: 6 }, s * 0.6),
    joint(neck[1], neck[2], { x: 0, y: -6 }, { x: 0, y: 6 }, s * 0.6),
    joint(neck[2], head, { x: 0, y: -6 }, { x: -6, y: 9 }, s * 0.6),
    joint(torso, wings[0], { x: -2, y: -8 }, { x: 13, y: 0 }, s * 0.5),
    joint(torso, wings[1], { x: 2, y: -8 }, { x: 13, y: 0 }, s * 0.5),
    joint(torso, legs[0], { x: -6, y: 14 }, { x: 0, y: -17 }),
    joint(torso, legs[1], { x: 6, y: 14 }, { x: 0, y: -17 }),
    joint(legs[0], feet[0], { x: 0, y: 18 }, { x: -6, y: 0 }),
    joint(legs[1], feet[1], { x: 0, y: 18 }, { x: -6, y: 0 }),
  ];
  const bodies = [torso, ...neck, head, ...wings, ...legs, ...feet];

  // Fling it: forward with the goose's momentum, up, and spinning. Head, wings
  // and a foot get extra so everything flails at different rates.
  for (const b of bodies) Body.setVelocity(b, { x: launch.vx, y: -launch.up });
  Body.setAngularVelocity(torso, launch.spin);
  Body.setVelocity(head, { x: launch.vx * 1.6, y: -launch.up * 1.5 });
  Body.setVelocity(wings[0], { x: launch.vx * 0.5, y: -launch.up * 2 });
  Body.setVelocity(wings[1], { x: launch.vx * 1.4, y: -launch.up * 0.3 });
  Body.setVelocity(feet[0], { x: launch.vx * 1.5, y: -launch.up * 1.3 });

  const g = scene.add.graphics().setDepth(10);
  const wp = (b, lx, ly) => add(b.position, rot(v(lx, ly), b.angle));
  let prevVy = torso.velocity.y;
  let impactCool = 0;
  let squash = 0;

  // Drawn scaled about (torso x, floor) so it stays on the floor and centred on
  // the torso while looking as big as the running goose.
  const S = drawScale;
  const toWorld = (p) => ({ x: torso.position.x + (p.x - torso.position.x) * S, y: feetY + (p.y - feetY) * S });

  return {
    get head() { return toWorld(head.position); },
    get angle() { return torso.angle; },
    get torso() { return toWorld(torso.position); },

    // targetX: where the rules say the goose is (px); targetVx: rules speed (px per step).
    update(targetX, targetVx, dt) {
      // Steer the torso's horizontal velocity toward the rules' speed, plus a
      // little correction for drift. Everything else stays floppy physics.
      const want = targetVx + (targetX - torso.position.x) * 0.05;
      const vx = torso.velocity.x;
      Body.setVelocity(torso, { x: vx + (want - vx) * cfg.follow, y: torso.velocity.y });

      // Ground impacts: a big drop in downward speed means we just bounced.
      impactCool = Math.max(0, impactCool - dt);
      const vy = torso.velocity.y;
      if (prevVy > 3 && vy < prevVy - 4 && impactCool === 0) {
        const strength = Math.min(1, prevVy / 12);
        squash = 0.25 + strength * 0.25;
        impactCool = 0.15;
        const w = toWorld({ x: torso.position.x, y: torso.position.y + 18 });
        onImpact?.(w.x, w.y, strength);
      }
      prevVy = vy;
      squash = Math.max(0, squash - dt * 2.5);
    },

    draw(t) {
      g.clear();
      g.setScale(S).setPosition(torso.position.x * (1 - S), feetY * (1 - S));
      const vel = torso.velocity;
      const speed = Math.hypot(vel.x, vel.y);
      const stretch = Math.min(0.3, speed * 0.02);

      const drawLeg = (i) => {
        const pts = smooth([wp(torso, i ? 6 : -6, 14), legs[i].position, wp(legs[i], 0, 19)], 3);
        tube(g, pts, 7, colors.leg);
        ellipse(g, feet[i].position, 28, 11, feet[i].angle, colors.leg);
      };
      const drawWing = (i) => {
        const tip = wp(wings[i], -15, 0);
        tube(g, smooth([wp(torso, i ? 2 : -2, -8), wings[i].position, tip], 3), 9, colors.wing);
        glove(g, tip, wings[i].angle + Math.PI, 1);
      };

      drawLeg(1);
      drawWing(1);
      tube(g, smooth([wp(torso, 20, -12), ...neck.map((n) => n.position), head.position], 3), 13, colors.body);
      const tail = wp(torso, -34, -4);
      g.fillStyle(0x1d2b1f, 1).fillCircle(tail.x, tail.y, 9);
      g.fillStyle(colors.body, 1).fillCircle(tail.x, tail.y, 6);
      ellipse(g, torso.position, 64 * (1 + stretch + squash), 40 * (1 - stretch * 0.6 - squash),
        torso.angle, colors.body);
      circle(g, head.position, 16, colors.body);
      beak(g, head.position, 16, head.angle, 0.8, colors.beak); // screaming
      pieEye(g, add(head.position, rot(v(9, -7), head.angle)), 9, 14, 0, 'x', t);
      pieEye(g, add(head.position, rot(v(0, -6), head.angle)), 10, 15, 0, 'x', t);
      drawLeg(0);
      drawWing(0);
    },

    destroy() {
      for (const j of joints) M.world.removeConstraint(j);
      for (const b of bodies) M.world.remove(b);
      g.destroy();
    },
  };
}

// Feathers burst out and drift down, swaying.
export function featherBurst(scene, rng, x, y, count) {
  for (let i = 0; i < count; i++) {
    const f = scene.add.ellipse(x, y, 13, 5, 0xffffff).setStrokeStyle(1.5, 0x1d2b1f)
      .setDepth(25).setAngle(rng.range(0, 360));
    const dx = rng.range(-90, 140);
    const peak = y - rng.range(30, 110);
    scene.tweens.add({
      targets: f, x: x + dx, y: peak, duration: 260, ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({
        targets: f,
        y: peak + rng.range(90, 160),
        x: f.x + rng.range(-30, 30),
        angle: f.angle + rng.range(-200, 200),
        alpha: 0,
        duration: rng.range(1100, 1700),
        ease: 'Sine.easeInOut',
        onComplete: () => f.destroy(),
      }),
    });
  }
}

// A knocked hurdle becomes a physics object and cartwheels away.
export function launchHurdle(scene, x, groundY, hPx, vx) {
  const bar = scene.add.rectangle(x, groundY - hPx / 2, 16, hPx, 0xff4b3e)
    .setStrokeStyle(3, 0x1d2b1f).setDepth(8);
  const obj = scene.matter.add.gameObject(bar, {
    restitution: 0.5, friction: 0.05, frictionAir: 0.005, density: 0.0015,
  });
  obj.setVelocity(vx * 1.2, -6);
  obj.setAngularVelocity(0.35);
  scene.time.delayedCall(3500, () => {
    scene.tweens.add({ targets: bar, alpha: 0, duration: 400, onComplete: () => obj.destroy() });
  });
}

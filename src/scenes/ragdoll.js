// Greybox goose ragdoll: Matter.js bodies joined by constraints.
// Purely presentation: the rules (runner.js) decide where the goose ends up;
// the ragdoll is steered toward that so getting up doesn't teleport.

const GROUP = -1; // negative group: ragdoll parts never collide with each other

export function spawnRagdoll(scene, x, feetY, colors, launch, cfg) {
  const M = scene.matter;
  const opts = (extra = {}) => ({
    collisionFilter: { group: GROUP },
    friction: cfg.friction,
    frictionAir: 0.01,
    restitution: cfg.restitution,
    ...extra,
  });
  const mk = (shape, extra) => M.add.gameObject(shape, opts(extra));

  // Body
  const torso = mk(scene.add.ellipse(x, feetY - 52, 64, 40, colors.body).setDepth(10),
    { shape: { type: 'rectangle', width: 60, height: 36, chamfer: { radius: 16 } }, density: 0.002 });
  const tail = scene.add.triangle(0, 0, 0, 8, 14, 0, 14, 16, colors.body).setDepth(10);

  // Wobbly neck: three segments, so it whips and flops.
  const neckSegs = [];
  for (let i = 0; i < 3; i++) {
    neckSegs.push(mk(scene.add.rectangle(x + 20 + i * 4, feetY - 70 - i * 14, 12, 16, colors.body).setDepth(10)));
  }
  const head = mk(scene.add.circle(x + 32, feetY - 112, 14, colors.body).setDepth(11),
    { shape: { type: 'circle', radius: 14 } });
  const beak = scene.add.triangle(0, 0, 0, -5, 18, 0, 0, 5, colors.beak).setDepth(11);
  // Dazed X eye.
  const eye = scene.add.text(0, 0, 'x', {
    fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#1d2b1f',
  }).setOrigin(0.5).setDepth(12);

  // Flailing wings.
  const wingA = mk(scene.add.ellipse(x - 4, feetY - 60, 34, 12, 0xe4e0d2).setDepth(12),
    { shape: { type: 'rectangle', width: 30, height: 10 }, density: 0.0006 });
  const wingB = mk(scene.add.ellipse(x + 4, feetY - 60, 34, 12, 0xe4e0d2).setDepth(9),
    { shape: { type: 'rectangle', width: 30, height: 10 }, density: 0.0006 });

  // Legs with big flappy feet.
  const legA = mk(scene.add.rectangle(x - 6, feetY - 19, 6, 38, colors.leg).setDepth(9));
  const legB = mk(scene.add.rectangle(x + 6, feetY - 19, 6, 38, colors.leg).setDepth(9));
  const footA = mk(scene.add.rectangle(x - 1, feetY, 16, 5, colors.leg).setDepth(9));
  const footB = mk(scene.add.rectangle(x + 11, feetY, 16, 5, colors.leg).setDepth(9));

  const s = cfg.stiffness;
  const joint = (a, b, pa, pb, k = s) => M.add.constraint(a.body, b.body, 0, k, {
    pointA: pa, pointB: pb, damping: 0.05,
  });
  const joints = [
    joint(torso, neckSegs[0], { x: 20, y: -12 }, { x: 0, y: 7 }),
    joint(neckSegs[0], neckSegs[1], { x: 0, y: -7 }, { x: 0, y: 7 }, s * 0.7),
    joint(neckSegs[1], neckSegs[2], { x: 0, y: -7 }, { x: 0, y: 7 }, s * 0.7),
    joint(neckSegs[2], head, { x: 0, y: -7 }, { x: -6, y: 8 }, s * 0.7),
    joint(torso, wingA, { x: -2, y: -8 }, { x: 13, y: 0 }, s * 0.6),
    joint(torso, wingB, { x: 2, y: -8 }, { x: 13, y: 0 }, s * 0.6),
    joint(torso, legA, { x: -6, y: 14 }, { x: 0, y: -17 }),
    joint(torso, legB, { x: 6, y: 14 }, { x: 0, y: -17 }),
    joint(legA, footA, { x: 0, y: 18 }, { x: -5, y: 0 }),
    joint(legB, footB, { x: 0, y: 18 }, { x: -5, y: 0 }),
  ];

  // Fling it: forward with the goose's momentum, up, and spinning. The head and
  // wings get extra so the neck whips and the wings flap wildly.
  const parts = [torso, ...neckSegs, head, wingA, wingB, legA, legB, footA, footB];
  for (const p of parts) p.setVelocity(launch.vx, -launch.up);
  torso.setAngularVelocity(launch.spin);
  head.setVelocity(launch.vx * 1.5, -launch.up * 1.4);
  wingA.setVelocity(launch.vx * 0.6, -launch.up * 1.8);
  wingB.setVelocity(launch.vx * 1.3, -launch.up * 0.4);
  footA.setVelocity(launch.vx * 1.4, -launch.up * 1.2);

  return {
    torso, head, parts, joints,
    // targetX: where the rules say the goose is (px); targetVx: rules speed (px per step).
    update(targetX, targetVx) {
      // Steer the torso's horizontal velocity toward the rules' speed, plus a
      // little correction for drift. Everything else stays floppy physics.
      const want = targetVx + (targetX - torso.x) * 0.05;
      const vx = torso.body.velocity.x;
      torso.setVelocityX(vx + (want - vx) * cfg.follow);

      // Cosmetic bits ride on their bodies.
      const t = torso.rotation;
      tail.setPosition(torso.x - Math.cos(t) * 34, torso.y - Math.sin(t) * 34).setRotation(t);
      const a = head.rotation;
      const cos = Math.cos(a), sin = Math.sin(a);
      beak.setPosition(head.x + cos * 20, head.y + sin * 20).setRotation(a);
      eye.setPosition(head.x + cos * 4 + sin * 5, head.y + sin * 4 - cos * 5).setRotation(a);
    },
    destroy() {
      for (const j of joints) M.world.removeConstraint(j);
      for (const p of parts) p.destroy();
      beak.destroy();
      tail.destroy();
      eye.destroy();
    },
  };
}

// Feathers burst out and drift down, swaying.
export function featherBurst(scene, rng, x, y, count) {
  for (let i = 0; i < count; i++) {
    const f = scene.add.ellipse(x, y, 12, 5, 0xffffff).setDepth(25).setAngle(rng.range(0, 360));
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
    .setStrokeStyle(3, 0xffffff).setDepth(8);
  const obj = scene.matter.add.gameObject(bar, {
    restitution: 0.5, friction: 0.05, frictionAir: 0.005, density: 0.0015,
  });
  obj.setVelocity(vx * 1.2, -6);
  obj.setAngularVelocity(0.35);
  scene.time.delayedCall(3500, () => {
    scene.tweens.add({ targets: bar, alpha: 0, duration: 400, onComplete: () => obj.destroy() });
  });
}

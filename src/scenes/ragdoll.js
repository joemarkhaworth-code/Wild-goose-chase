// Greybox goose ragdoll: Matter.js bodies joined by constraints.
// Purely presentation: the rules (runner.js) decide where the goose ends up;
// the ragdoll is gently pulled toward that spot so get-up doesn't teleport.

const GROUP = -1; // negative group: ragdoll parts never collide with each other

export function spawnRagdoll(scene, x, feetY, colors, launch, cfg) {
  const M = scene.matter;
  const opts = (extra = {}) => ({
    collisionFilter: { group: GROUP },
    friction: 0.6,
    frictionAir: 0.01,
    restitution: 0.25,
    ...extra,
  });

  const mk = (shape, extra) => M.add.gameObject(shape, opts(extra));

  const torso = mk(scene.add.ellipse(x, feetY - 52, 64, 40, colors.body).setDepth(10),
    { shape: { type: 'rectangle', width: 60, height: 36, chamfer: { radius: 16 } }, density: 0.002 });
  const tail = scene.add.triangle(0, 0, 0, 8, 14, 0, 14, 16, colors.body).setDepth(10);
  const neck = mk(scene.add.rectangle(x + 22, feetY - 82, 12, 40, colors.body).setDepth(10));
  const head = mk(scene.add.circle(x + 30, feetY - 106, 13, colors.body).setDepth(11),
    { shape: { type: 'circle', radius: 13 } });
  const beak = scene.add.triangle(0, 0, 0, -5, 16, 0, 0, 5, colors.beak).setDepth(11);
  const eye = scene.add.circle(0, 0, 3, 0x1d2b1f).setDepth(12);
  const legA = mk(scene.add.rectangle(x - 6, feetY - 19, 6, 38, colors.leg).setDepth(9));
  const legB = mk(scene.add.rectangle(x + 6, feetY - 19, 6, 38, colors.leg).setDepth(9));

  const joint = (a, b, pa, pb) => M.add.constraint(a.body, b.body, 0, cfg.stiffness, {
    pointA: pa, pointB: pb,
  });
  const joints = [
    joint(torso, neck, { x: 20, y: -10 }, { x: 0, y: 18 }),
    joint(neck, head, { x: 0, y: -18 }, { x: -6, y: 6 }),
    joint(torso, legA, { x: -6, y: 14 }, { x: 0, y: -17 }),
    joint(torso, legB, { x: 6, y: 14 }, { x: 0, y: -17 }),
  ];

  // Fling it: forward with the goose's momentum, up, and spinning.
  const parts = [torso, neck, head, legA, legB];
  for (const p of parts) p.setVelocity(launch.vx, -launch.up);
  torso.setAngularVelocity(cfg.spin);
  head.setVelocity(launch.vx * 1.3, -launch.up * 1.2);

  return {
    torso, head, beak, eye, parts, joints,
    update(targetX) {
      // Pull the torso toward where the rules say the goose is.
      const dx = targetX - torso.x;
      torso.setVelocityX(torso.body.velocity.x + dx * cfg.follow * 0.1);
      // Tail rides on the torso; beak and eye ride on the head.
      const t = torso.rotation;
      tail.setPosition(torso.x - Math.cos(t) * 34, torso.y - Math.sin(t) * 34).setRotation(t);
      // Beak and eye ride on the head.
      const a = head.rotation;
      const cos = Math.cos(a), sin = Math.sin(a);
      beak.setPosition(head.x + cos * 18, head.y + sin * 18).setRotation(a);
      eye.setPosition(head.x + cos * 4 - sin * -4, head.y + sin * 4 + cos * -4);
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

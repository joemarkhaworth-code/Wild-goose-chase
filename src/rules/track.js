// Pure track rules: obstacle layout and collision. No Phaser in here.

// Lay out hurdles along the track with the seeded RNG.
export function generateHurdles(rng, trackCfg, trackLength) {
  const hurdles = [];
  let at = trackCfg.firstHurdleAt;
  while (at < trackLength) {
    hurdles.push({ type: 'hurdle', at, height: trackCfg.hurdleHeight, hit: false });
    at += rng.range(trackCfg.hurdleSpacingMin, trackCfg.hurdleSpacingMax);
  }
  return hurdles;
}

// Returns the first hurdle the runner's feet are inside this frame, or null.
export function findCollision(runner, hurdles, trackCfg) {
  const half = trackCfg.feetWidth / 2;
  const front = runner.distance + half;
  const back = runner.distance - half;
  for (const h of hurdles) {
    if (h.hit) continue;
    if (h.at > front + 1) break; // hurdles are in order; nothing further can touch
    const overlaps = front >= h.at && back <= h.at + trackCfg.hurdleThickness;
    if (overlaps && runner.height < h.height) return h;
  }
  return null;
}

// Pure running rules for one goose. No Phaser in here.
// A runner receives actions ('tapLeft' | 'tapRight' | 'jump') and is stepped by update(dt).

export function createRunner(runConfig) {
  return {
    cfg: runConfig,
    distance: 0,      // metres
    speed: 0,         // m/s
    lastSide: null,   // 'L' | 'R' | null
    stumble: 0,       // seconds left of stumble
    taps: 0,          // good taps (drives leg animation)
  };
}

export function applyAction(r, action) {
  if (action !== 'tapLeft' && action !== 'tapRight') return; // jump arrives in step 2
  if (r.stumble > 0) return;

  const side = action === 'tapLeft' ? 'L' : 'R';
  if (side === r.lastSide) {
    // Same side twice: stumble.
    r.speed *= r.cfg.stumbleSpeedFactor;
    r.stumble = r.cfg.stumbleTime;
    r.lastSide = null; // either foot can restart the rhythm
    return;
  }
  r.lastSide = side;
  r.taps += 1;
  r.speed = Math.min(r.cfg.maxSpeed, r.speed + r.cfg.speedPerTap);
}

export function updateRunner(r, dt) {
  if (r.stumble > 0) r.stumble = Math.max(0, r.stumble - dt);
  const loss = (r.cfg.decayLinear + r.cfg.decayDrag * r.speed) * dt;
  r.speed = Math.max(0, r.speed - loss);
  r.distance += r.speed * dt;
}

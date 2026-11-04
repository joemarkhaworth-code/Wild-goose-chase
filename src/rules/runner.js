// Pure running rules for one goose. No Phaser in here.
// A runner receives actions ('tapLeft' | 'tapRight' | 'jump') and is stepped by update(dt).

export function createRunner(runConfig) {
  return {
    cfg: runConfig,
    distance: 0,      // metres
    speed: 0,         // m/s
    height: 0,        // metres above the track (jumping)
    vy: 0,            // m/s upward
    lastSide: null,   // 'L' | 'R' | null
    stumble: 0,       // seconds left of stumble (taps ignored)
    down: 0,          // seconds left lying on the floor after a crash
    taps: 0,          // good taps (drives leg animation)
  };
}

export const isAirborne = (r) => r.height > 0;
export const isDown = (r) => r.down > 0;

// Returns what happened: 'step' | 'stumble' | 'jump' | null (ignored).
export function applyAction(r, action) {
  if (r.down > 0 || r.stumble > 0) return null;

  if (action === 'jump') {
    if (isAirborne(r)) return null;
    r.vy = r.cfg.jumpVelocity;
    r.height = 0.0001;
    return 'jump';
  }

  if (action !== 'tapLeft' && action !== 'tapRight') return null;
  if (isAirborne(r)) return null; // no grip in the air

  const side = action === 'tapLeft' ? 'L' : 'R';
  if (side === r.lastSide) {
    // Same side twice: stumble.
    r.speed *= r.cfg.stumbleSpeedFactor;
    r.stumble = r.cfg.stumbleTime;
    r.lastSide = null; // either foot can restart the rhythm
    return 'stumble';
  }
  r.lastSide = side;
  r.taps += 1;
  r.speed = Math.min(r.cfg.maxSpeed, r.speed + r.cfg.speedPerTap);
  return 'step';
}

// Returns 'land' | 'getUp' on the frame that happens, otherwise null.
export function updateRunner(r, dt) {
  if (r.stumble > 0) r.stumble = Math.max(0, r.stumble - dt);

  let event = null;
  if (r.down > 0) {
    // Sliding along the floor, then getting back up.
    r.speed = Math.max(0, r.speed - r.cfg.crashFriction * dt);
    r.down = Math.max(0, r.down - dt);
    if (r.down === 0) {
      r.speed = 0;
      r.stumble = r.cfg.getUpGrace;
      event = 'getUp';
    }
  } else if (isAirborne(r)) {
    // Momentum carries you through the air: no decay while airborne.
    r.vy -= r.cfg.gravity * dt;
    r.height += r.vy * dt;
    if (r.height <= 0) {
      r.height = 0;
      r.vy = 0;
      event = 'land';
    }
  } else {
    const loss = (r.cfg.decayLinear + r.cfg.decayDrag * r.speed) * dt;
    r.speed = Math.max(0, r.speed - loss);
  }
  r.distance += r.speed * dt;
  return event;
}

// Crash into an obstacle: the goose goes down (ragdoll) and slides.
export function crashRunner(r) {
  r.speed *= r.cfg.crashSpeedFactor;
  r.down = r.cfg.getUpTime;
  r.stumble = 0;
  r.lastSide = null;
  r.height = 0;
  r.vy = 0;
}

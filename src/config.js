// All tuning numbers live here.

export const CONFIG = {
  // Screen (landscape, scaled to fit)
  width: 960,
  height: 540,

  // World
  pixelsPerMetre: 40,
  verticalScale: 1.8,    // heights drawn bigger than distances so jumps and hurdles read on a phone
  groundY: 400,          // y of the track surface in world pixels
  trackLength: 400,      // metres (finish line comes in a later step)
  markerEvery: 10,       // metres between distance markers

  // Running (metres, seconds)
  // Top speed needs ~9-10 alternating taps/sec; ~6/sec settles around half speed.
  run: {
    speedPerTap: 1.2,      // m/s gained per good (alternating) tap
    maxSpeed: 14,          // m/s cap
    decayLinear: 4,        // m/s lost per second, always
    decayDrag: 0.5,        // extra loss per second, proportional to speed
    stumbleSpeedFactor: 0.5, // speed multiplied by this on a same-side tap
    stumbleTime: 0.35,     // seconds taps are ignored after a stumble
    jumpVelocity: 8.3,       // m/s upward on jump
    gravity: 29,           // m/s² (peak ~1.2 m, ~0.57 s in the air)
    crashSpeedFactor: 0.15, // speed multiplied by this when hitting an obstacle
    crashTime: 0.8,        // seconds before you can run again after a crash
  },

  // Track layout (metres)
  track: {
    firstHurdleAt: 25,
    hurdleSpacingMin: 14,
    hurdleSpacingMax: 30,
    hurdleHeight: 0.7,     // must be lower than jump peak
    hurdleThickness: 0.15,
    feetWidth: 0.4,        // the goose's collision width at the feet
  },

  // Goose greybox (pixels)
  goose: {
    screenX: 0.3,          // goose position on screen (fraction of width) when standing
    screenXFast: 0.18,     // ...and at top speed (camera looks ahead)
    legCycle: 3.2,         // leg swings per metre (higher = busier legs)
    bodyColor: 0xf4f1e6,
    beakColor: 0xf2a33a,
    legColor: 0xf2a33a,
    stumbleColor: 0xff8a80,
  },

  // Feel / feedback
  feel: {
    tapLurch: 6,           // px the goose jolts forward per tap
    meterSegments: 14,
    speedLinesFrom: 0.6,   // speed lines appear above this fraction of top speed
    maxSpeedShake: 0.0015, // camera shake intensity at top speed
    stumbleShake: 0.008,
    crashShake: 0.02,
  },

  // Controls
  buttonSize: 130,
  buttonGap: 12,        // px between the two run buttons
  buttonStagger: 40,    // RIGHT sits this much higher than LEFT (X/O layout)
  jumpButtonSize: 140,  // JUMP sits bottom-left for the other thumb
};

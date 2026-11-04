// All tuning numbers live here.

export const CONFIG = {
  // Screen (landscape, scaled to fit)
  width: 960,
  height: 540,

  // World
  pixelsPerMetre: 40,
  groundY: 400,          // y of the track surface in world pixels
  trackLength: 400,      // metres (finish line comes in a later step)
  markerEvery: 10,       // metres between distance markers

  // Running (metres, seconds)
  run: {
    speedPerTap: 0.9,      // m/s gained per good (alternating) tap
    maxSpeed: 12,          // m/s cap
    decayLinear: 2.5,      // m/s lost per second, always
    decayDrag: 0.25,       // extra loss per second, proportional to speed
    stumbleSpeedFactor: 0.5, // speed multiplied by this on a same-side tap
    stumbleTime: 0.35,     // seconds taps are ignored after a stumble
  },

  // Goose greybox (pixels)
  goose: {
    screenX: 0.3,          // camera keeps the goose at this fraction of screen width
    bodyColor: 0xf4f1e6,
    beakColor: 0xf2a33a,
    legColor: 0xf2a33a,
    stumbleColor: 0xff8a80,
  },

  // Controls
  buttonSize: 130,
  buttonGap: 12,        // px between the two run buttons
  buttonStagger: 40,    // RIGHT sits this much higher than LEFT (X/O layout)
};

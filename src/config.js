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
    stumbleSpeedFactor: 0.85, // speed kept when you trip (same-side tap) and faceplant
    stumbleDownTime: 0.8,  // seconds on the floor after a trip
    jumpVelocity: 8.3,       // m/s upward on jump
    gravity: 29,           // m/s² (peak ~1.2 m, ~0.57 s in the air)
    crashSpeedFactor: 0.95, // speed kept when you hit an obstacle: momentum carries the tumble
    crashFriction: 5,      // m/s² slowing your tumble while down
    getUpTime: 1.5,        // seconds on the floor after hitting an obstacle
    getUpKeep: 0.6,        // fraction of leftover tumble speed you keep when you get up
    getUpGrace: 0.2,       // seconds after getting up before taps count
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
    legLen: 38,            // px, hip to foot
    neckStiffness: 150,    // head spring (lower = floppier, more lag)
    neckDamping: 7,        // lower = more wobble/overshoot
    neckFlop: 0.8,         // radians the neck flops back at top speed
    neckStretch: 0.4,      // neck gets this much longer at top speed (rubber!)
    neckInertia: 0.35,     // how much speeding up/slowing down throws the head
    dazedTime: 0.9,        // seconds of spinning eyes after getting up
    bodyColor: 0xf4f1e6,
    wingColor: 0xffffff,
    beakColor: 0xf2a33a,
    legColor: 0xf2a33a,
  },

  // Feel / feedback
  feel: {
    tapLurch: 6,           // px the goose jolts forward per tap
    meterSegments: 14,
    speedLinesFrom: 0.6,   // speed lines appear above this fraction of top speed
    maxSpeedShake: 0.0015, // camera shake intensity at top speed
    stumbleShake: 0.008,
    crashShake: 0.02,
    hitStop: 0.09,         // freeze-frame on a crash (seconds)
    tripHitStop: 0.04,
    crashWords: ['BONK!', 'HONK!', 'OOF!', 'SPLAT!', 'THWACK!', 'KER-HONK!', 'NOT THE FACE!'],
    tripWords: ['WHOOPS!', 'OOPS!', 'HONK?', 'EEP!', 'FLAP!'],
  },

  // Ragdoll (Matter.js, pixels / Matter units)
  ragdoll: {
    crash: { up: 9, spin: 0.28 },  // hurdle hit: big launch and spin (px per step)
    trip: { up: 3, spin: 0.3 },    // same-side tap: low faceplant
    launchForward: 1.0,    // fraction of run speed carried into the ragdoll
    follow: 0.25,          // how hard the torso tracks the rules speed/position (0..1)
    friction: 0.05,        // low so it slides and rolls along the track
    restitution: 0.35,     // bounciness
    stiffness: 0.6,        // joint stiffness (lower = floppier)
  },

  // Controls
  buttonSize: 130,
  buttonGap: 12,        // px between the two run buttons
  buttonStagger: 40,    // RIGHT sits this much higher than LEFT (X/O layout)
  jumpButtonSize: 140,  // JUMP sits bottom-left for the other thumb
};

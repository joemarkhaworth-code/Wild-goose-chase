// Seeded RNG (mulberry32). Use this, never Math.random, for anything gameplay.

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
  };
}

// Seed from ?seed=123 in the URL, otherwise a fresh one.
export function pickSeed() {
  const fromUrl = new URLSearchParams(window.location.search).get('seed');
  if (fromUrl !== null && !Number.isNaN(Number(fromUrl))) return Number(fromUrl) >>> 0;
  return (Date.now() ^ (performance.now() * 1000)) >>> 0;
}

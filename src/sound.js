// Tiny synthesised sound effects (no audio files).
let ac = null;

export function unlockAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
}

function blip(freq, dur, type = 'square', gain = 0.05) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur, { gain = 0.2, from = 3000, to = 800, q = 0.8 } = {}) {
  if (!ac) return;
  const t = ac.currentTime;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t);
}

export const sfx = {
  tick: () => blip(1400, 0.025, 'square', 0.03),
  ding: () => { blip(880, 0.5, 'sine', 0.12); setTimeout(() => blip(1320, 0.6, 'sine', 0.08), 90); },
  chunk: () => { blip(90, 0.06, 'square', 0.08); noise(0.05, { gain: 0.08, from: 1500, to: 600 }); },
  strain: () => noise(0.08, { gain: 0.05, from: 2500, to: 2000, q: 3 }),
  rip: () => noise(0.35, { gain: 0.45, from: 4500, to: 700 }),
  whoosh: () => noise(0.4, { gain: 0.12, from: 600, to: 2400, q: 0.5 }),
  thud: () => blip(110, 0.15, 'sine', 0.2),
};

import { CONFIG } from './config.js';
import { pickSeed } from './rng.js';
import { RaceScene } from './scenes/RaceScene.js';

// Wait (briefly) for the cartoon font so text doesn't render in a fallback.
await Promise.race([
  document.fonts.load('40px "Luckiest Guy"').catch(() => {}),
  new Promise((r) => setTimeout(r, 2500)),
]);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: '#1d2b1f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'matter', matter: { gravity: { y: 1 }, debug: false } },
  input: { activePointers: 4 },
  scene: [],
});

game.scene.add('Race', RaceScene, true, { seed: pickSeed() });

// Handy for debugging from the browser console.
window.__game = game;

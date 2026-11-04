import { CONFIG } from './config.js';
import { pickSeed } from './rng.js';
import { RaceScene } from './scenes/RaceScene.js';

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

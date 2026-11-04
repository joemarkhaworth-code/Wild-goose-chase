import { CONFIG } from '../config.js';
import { makeRng } from '../rng.js';
import { createRunner, applyAction, updateRunner } from '../rules/runner.js';
import { createTouchAndKeyControls } from '../input/controls.js';

const PPM = CONFIG.pixelsPerMetre;
const START_X = 200; // world x (px) of the start line

export class RaceScene extends Phaser.Scene {
  constructor() { super('Race'); }

  init(data) {
    this.seed = data.seed;
    this.rng = makeRng(this.seed);
  }

  create() {
    const { width, height } = this.scale;
    this.worldWidth = START_X + (CONFIG.trackLength + 50) * PPM;

    this.cameras.main.setBackgroundColor('#8fd3ff');
    this.buildScenery();
    this.goose = this.buildGoose();

    this.runner = createRunner(CONFIG.run);
    this.actions = [];
    createTouchAndKeyControls(this, CONFIG, (a) => this.actions.push(a));

    // HUD: distance + speed bar
    this.hudText = this.add.text(width / 2, 16, '0 m', {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 6,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
    this.speedBarBg = this.add.rectangle(width / 2, 60, 240, 14, 0x000000, 0.35)
      .setScrollFactor(0).setDepth(100);
    this.speedBar = this.add.rectangle(width / 2 - 120, 60, 0, 14, 0xffd23f)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    this.buildDebugOverlay();
    this.cameras.main.setBounds(0, 0, this.worldWidth, height);
  }

  // ---------- scenery (greybox) ----------
  buildScenery() {
    const { height } = this.scale;
    const g = CONFIG.groundY;

    // Far hills (parallax)
    const hills = this.add.graphics().setScrollFactor(0.3).setDepth(-20);
    hills.fillStyle(0x7cc47f, 1);
    for (let x = -200; x < this.worldWidth * 0.3 + 1200; x += this.rng.range(160, 320)) {
      hills.fillCircle(x, g + 40, this.rng.range(120, 220));
    }

    // Trees (mid parallax)
    const trees = this.add.graphics().setScrollFactor(0.6).setDepth(-10);
    for (let x = 0; x < this.worldWidth * 0.6 + 1200; x += this.rng.range(120, 380)) {
      const h = this.rng.range(60, 120);
      trees.fillStyle(0x6b4a2b, 1).fillRect(x - 6, g - h, 12, h);
      trees.fillStyle(0x3f8f45, 1).fillCircle(x, g - h, this.rng.range(30, 50));
    }

    // Grass + track
    this.add.rectangle(0, g, this.worldWidth, height - g, 0x5aa65e).setOrigin(0, 0).setDepth(-5);
    this.add.rectangle(0, g, this.worldWidth, 60, 0xc8643c).setOrigin(0, 0).setDepth(-4);
    this.add.rectangle(0, g, this.worldWidth, 3, 0xffffff).setOrigin(0, 0).setDepth(-3);
    this.add.rectangle(0, g + 57, this.worldWidth, 3, 0xffffff).setOrigin(0, 0).setDepth(-3);

    // Start line
    this.add.rectangle(START_X, g, 6, 60, 0xffffff).setOrigin(0.5, 0).setDepth(-3);

    // Distance markers
    for (let m = CONFIG.markerEvery; m <= CONFIG.trackLength; m += CONFIG.markerEvery) {
      const x = START_X + m * PPM;
      this.add.rectangle(x, g, 2, 60, 0xffffff, 0.5).setOrigin(0.5, 0).setDepth(-3);
      this.add.text(x, g + 66, `${m}m`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff',
      }).setOrigin(0.5, 0).setDepth(-3);
    }
  }

  // ---------- goose (greybox shapes) ----------
  buildGoose() {
    const c = CONFIG.goose;
    const goose = this.add.container(START_X, CONFIG.groundY + 30).setDepth(10);

    const legBack = this.add.rectangle(-4, -38, 6, 38, c.legColor).setOrigin(0.5, 0);
    const legFront = this.add.rectangle(4, -38, 6, 38, c.legColor).setOrigin(0.5, 0);
    const body = this.add.ellipse(0, -52, 64, 40, c.bodyColor);
    const tail = this.add.triangle(-34, -58, 0, 8, 14, 0, 14, 16, c.bodyColor);
    const neck = this.add.rectangle(22, -82, 12, 44, c.bodyColor).setAngle(15);
    const head = this.add.circle(30, -104, 13, c.bodyColor);
    const eye = this.add.circle(34, -108, 3, 0x1d2b1f);
    const beak = this.add.triangle(48, -102, 0, -5, 16, 0, 0, 5, c.beakColor);

    goose.add([legBack, tail, body, neck, head, eye, beak, legFront]);
    goose.parts = { legBack, legFront, body, neck, head };
    return goose;
  }

  animateGoose(r) {
    const { legBack, legFront, body, neck, head } = this.goose.parts;
    const phase = r.distance * 2.2;
    const swing = Math.min(1, r.speed / 3) * 40;
    legFront.setAngle(Math.sin(phase) * swing);
    legBack.setAngle(-Math.sin(phase) * swing);
    const bob = Math.abs(Math.sin(phase)) * Math.min(1, r.speed / 4) * 5;
    this.goose.y = CONFIG.groundY + 30 - bob;

    // Lean forward with speed; flash and wobble on stumble.
    const lean = (r.speed / CONFIG.run.maxSpeed) * 14;
    const wobble = r.stumble > 0 ? Math.sin(this.time.now / 30) * 10 : 0;
    this.goose.setAngle(lean + wobble);
    const col = r.stumble > 0 ? CONFIG.goose.stumbleColor : CONFIG.goose.bodyColor;
    body.setFillStyle(col); neck.setFillStyle(col); head.setFillStyle(col);
  }

  // ---------- debug ----------
  buildDebugOverlay() {
    const { width } = this.scale;
    this.debugOn = false;
    this.debugText = this.add.text(10, 10, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(200).setVisible(false);

    const btn = this.add.text(width - 10, 10, 'DBG', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 8, y: 6 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200).setInteractive();
    const toggle = () => { this.debugOn = !this.debugOn; this.debugText.setVisible(this.debugOn); };
    btn.on('pointerdown', toggle);
    this.input.keyboard?.on('keydown-BACKTICK', toggle);
  }

  updateDebug(r) {
    if (!this.debugOn) return;
    this.debugText.setText([
      `FPS        ${this.game.loop.actualFps.toFixed(0)}`,
      `Round      -`,
      `Timer      -`,
      `Goose      ${r.distance.toFixed(1)} m  ${r.speed.toFixed(1)} m/s${r.stumble > 0 ? '  STUMBLE' : ''}`,
      `Gooseliath -`,
      `Seed       ${this.seed}`,
    ]);
  }

  // ---------- loop ----------
  update(_time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const r = this.runner;

    for (const a of this.actions) applyAction(r, a);
    this.actions.length = 0;
    updateRunner(r, dt);

    this.goose.x = START_X + r.distance * PPM;
    this.animateGoose(r);
    this.cameras.main.scrollX = this.goose.x - this.scale.width * CONFIG.goose.screenX;

    this.hudText.setText(`${Math.floor(r.distance)} m`);
    this.speedBar.width = 240 * (r.speed / CONFIG.run.maxSpeed);
    this.updateDebug(r);
  }
}

import { CONFIG } from '../config.js';
import { makeRng } from '../rng.js';
import { createRunner, applyAction, updateRunner, crashRunner, isAirborne } from '../rules/runner.js';
import { generateHurdles, findCollision } from '../rules/track.js';
import { createTouchAndKeyControls } from '../input/controls.js';

const PPM = CONFIG.pixelsPerMetre;
const START_X = 200; // world x (px) of the start line
const FONT = 'system-ui, sans-serif';
const HPX = PPM * CONFIG.verticalScale; // pixels per metre for heights (jumps, hurdles)

export class RaceScene extends Phaser.Scene {
  constructor() { super('Race'); }

  init(data) {
    this.seed = data.seed;
    this.rng = makeRng(this.seed);
  }

  create() {
    const { height } = this.scale;
    this.worldWidth = START_X + (CONFIG.trackLength + 50) * PPM;

    this.cameras.main.setBackgroundColor('#8fd3ff');
    this.buildScenery();
    this.hurdles = generateHurdles(this.rng, CONFIG.track, CONFIG.trackLength);
    this.buildHurdles();
    this.goose = this.buildGoose();
    this.crashAnim = 0;
    this.dust = [];
    this.lurch = 0;
    this.camLead = CONFIG.goose.screenX;

    this.runner = createRunner(CONFIG.run);
    this.actions = [];
    createTouchAndKeyControls(this, CONFIG, (a) => this.actions.push(a));

    this.buildHud();
    this.buildSpeedLines();
    this.buildDebugOverlay();
    this.cameras.main.setBounds(0, 0, this.worldWidth, height);
  }

  // ---------- scenery (greybox) ----------
  buildScenery() {
    const { width, height } = this.scale;
    const g = CONFIG.groundY;

    // Far hills (slow parallax)
    const hills = this.add.graphics().setScrollFactor(0.2).setDepth(-20);
    hills.fillStyle(0x7cc47f, 1);
    for (let x = -200; x < this.worldWidth * 0.2 + width + 400; x += this.rng.range(160, 320)) {
      hills.fillCircle(x, g + 40, this.rng.range(120, 220));
    }

    // Trees (mid parallax)
    const trees = this.add.graphics().setScrollFactor(0.6).setDepth(-10);
    for (let x = 0; x < this.worldWidth * 0.6 + width + 400; x += this.rng.range(120, 380)) {
      const h = this.rng.range(60, 120);
      trees.fillStyle(0x6b4a2b, 1).fillRect(x - 6, g - h, 12, h);
      trees.fillStyle(0x3f8f45, 1).fillCircle(x, g - h, this.rng.range(30, 50));
    }

    // Grass + track
    this.add.rectangle(0, g, this.worldWidth, height - g, 0x5aa65e).setOrigin(0, 0).setDepth(-5);
    this.add.rectangle(0, g, this.worldWidth, 60, 0xc8643c).setOrigin(0, 0).setDepth(-4);
    const lines = this.add.graphics().setDepth(-3);
    lines.fillStyle(0xffffff, 1);
    lines.fillRect(0, g, this.worldWidth, 3);
    lines.fillRect(0, g + 57, this.worldWidth, 3);

    // Dashes on the track every 2 m: strong motion cue at speed.
    lines.fillStyle(0xe58a5e, 1);
    for (let x = 0; x < this.worldWidth; x += 2 * PPM) lines.fillRect(x, g + 26, 30, 6);

    // Start line
    this.add.rectangle(START_X, g, 6, 60, 0xffffff).setOrigin(0.5, 0).setDepth(-3);

    // Distance markers
    for (let m = CONFIG.markerEvery; m <= CONFIG.trackLength; m += CONFIG.markerEvery) {
      const x = START_X + m * PPM;
      this.add.rectangle(x, g, 3, 60, 0xffffff, 0.7).setOrigin(0.5, 0).setDepth(-3);
      this.add.text(x, g + 66, `${m}m`, {
        fontFamily: FONT, fontSize: '16px', color: '#ffffff',
      }).setOrigin(0.5, 0).setDepth(-3);
    }

    // Foreground grass tufts: scroll faster than the track, so speed reads hard.
    const fg = this.add.graphics().setScrollFactor(1.6).setDepth(20);
    fg.fillStyle(0x3d7d40, 1);
    for (let x = 0; x < this.worldWidth * 1.6 + width + 400; x += this.rng.range(60, 200)) {
      const y = this.rng.range(height - 30, height + 10);
      const w = this.rng.range(14, 30);
      fg.fillTriangle(x, y, x + w / 2, y - this.rng.range(20, 40), x + w, y);
    }
  }

  // ---------- hurdles (greybox blocks) ----------
  buildHurdles() {
    const g = CONFIG.groundY + 30; // middle of the track, where the goose runs
    for (const h of this.hurdles) {
      const hPx = h.height * HPX;
      const x = START_X + h.at * PPM;
      const c = this.add.container(x, g).setDepth(8);
      c.add([
        this.add.rectangle(0, 0, 8, hPx, 0xffffff).setStrokeStyle(2, 0x1d2b1f).setOrigin(0.5, 1),
        this.add.rectangle(0, -hPx, 16, 22, 0xff4b3e).setStrokeStyle(2, 0x1d2b1f).setOrigin(0.5, 0),
        this.add.rectangle(0, -hPx + 7, 16, 6, 0xffffff).setOrigin(0.5, 0),
        this.add.rectangle(0, 0, 30, 6, 0x555555).setOrigin(0.5, 1),
      ]);
      h.view = c;
    }
  }

  knockOver(h) {
    this.tweens.add({ targets: h.view, angle: 85, duration: 220, ease: 'Quad.easeIn' });
  }

  // ---------- goose (greybox shapes) ----------
  buildGoose() {
    const c = CONFIG.goose;
    const goose = this.add.container(START_X, CONFIG.groundY + 30).setDepth(10);

    const legBack = this.add.rectangle(-4, -38, 6, 40, c.legColor).setOrigin(0.5, 0);
    const legFront = this.add.rectangle(4, -38, 6, 40, c.legColor).setOrigin(0.5, 0);
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
    const speedFrac = r.speed / CONFIG.run.maxSpeed;
    const phase = r.distance * CONFIG.goose.legCycle;
    const air = isAirborne(r);
    if (air) {
      // Legs tucked, hurdler style.
      legFront.setAngle(-70);
      legBack.setAngle(40);
    } else {
      const swing = Math.min(1, r.speed / 2) * (35 + 25 * speedFrac);
      legFront.setAngle(Math.sin(phase) * swing);
      legBack.setAngle(-Math.sin(phase) * swing);
    }
    const bob = air ? 0 : Math.abs(Math.sin(phase)) * Math.min(1, r.speed / 3) * 7;
    this.goose.y = CONFIG.groundY + 30 - bob - r.height * HPX;

    // Lean hard into it with speed; wobble on stumble; sprawl on a crash.
    const lean = speedFrac * 22;
    const wobble = r.stumble > 0 ? Math.sin(this.time.now / 30) * 14 : 0;
    let angle = lean + wobble;
    if (this.crashAnim > 0) {
      const t = this.crashAnim / CONFIG.run.crashTime; // 1 -> 0
      angle = 75 * Math.sin(Math.min(1, t * 1.4) * Math.PI / 2) + wobble * 0.3;
    }
    this.goose.setAngle(angle);
    const col = r.stumble > 0 ? CONFIG.goose.stumbleColor : CONFIG.goose.bodyColor;
    body.setFillStyle(col); neck.setFillStyle(col); head.setFillStyle(col);
  }

  // ---------- per-tap feedback ----------
  onStep() {
    this.lurch = CONFIG.feel.tapLurch;
    this.goose.setScale(1.06, 0.94);
    this.time.delayedCall(60, () => this.goose.setScale(1));
    this.spawnDust(this.goose.x - 6, CONFIG.groundY + 30);
  }

  onJump() {
    this.goose.setScale(0.9, 1.12);
    this.time.delayedCall(90, () => this.goose.setScale(1));
    for (let i = 0; i < 2; i++) this.spawnDust(this.goose.x - 10, CONFIG.groundY + 30);
  }

  onLand() {
    this.goose.setScale(1.12, 0.88);
    this.time.delayedCall(80, () => this.goose.setScale(1));
    for (let i = 0; i < 3; i++) this.spawnDust(this.goose.x + this.rng.range(-15, 15), CONFIG.groundY + 30);
  }

  onCrash(h) {
    this.knockOver(h);
    this.crashAnim = CONFIG.run.crashTime;
    this.cameras.main.shake(250, CONFIG.feel.crashShake);
    for (let i = 0; i < 7; i++) this.spawnDust(this.goose.x + this.rng.range(-25, 25), CONFIG.groundY + 30);
    const bonk = this.add.text(this.goose.x, this.goose.y - 130, 'BONK!', {
      fontFamily: FONT, fontSize: '30px', fontStyle: 'bold',
      color: '#ff4b3e', stroke: '#ffffff', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: bonk, y: bonk.y - 40, alpha: 0, duration: 700, onComplete: () => bonk.destroy(),
    });
  }

  onStumble() {
    this.cameras.main.shake(180, CONFIG.feel.stumbleShake);
    for (let i = 0; i < 4; i++) this.spawnDust(this.goose.x + this.rng.range(-20, 20), CONFIG.groundY + 30);
  }

  spawnDust(x, y) {
    const puff = this.add.circle(x, y, this.rng.range(5, 9), 0xe9d3b0, 0.9).setDepth(9);
    this.tweens.add({
      targets: puff,
      x: x - this.rng.range(20, 45),
      y: y - this.rng.range(8, 22),
      scale: 2.2,
      alpha: 0,
      duration: 380,
      onComplete: () => puff.destroy(),
    });
  }

  // ---------- HUD ----------
  buildHud() {
    const { width } = this.scale;
    this.hudText = this.add.text(width / 2, 10, '0 m', {
      fontFamily: FONT, fontSize: '34px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#1d2b1f', strokeThickness: 7,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Segmented power meter, Track & Field style.
    const n = CONFIG.feel.meterSegments;
    const segW = 20, segH = 22, gap = 4;
    const total = n * segW + (n - 1) * gap;
    const x0 = width / 2 - total / 2;
    this.add.rectangle(width / 2, 70, total + 12, segH + 12, 0x1d2b1f, 0.75)
      .setScrollFactor(0).setDepth(100);
    this.meter = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const color = t < 0.5 ? 0x4cd964 : t < 0.8 ? 0xffd23f : 0xff4b3e;
      const seg = this.add.rectangle(x0 + i * (segW + gap) + segW / 2, 70, segW, segH, color)
        .setScrollFactor(0).setDepth(101);
      seg.onColor = color;
      this.meter.push(seg);
    }
    this.maxText = this.add.text(width / 2 + total / 2 + 14, 70, 'MAX!', {
      fontFamily: FONT, fontSize: '26px', fontStyle: 'bold',
      color: '#ff4b3e', stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setVisible(false);
  }

  updateHud(r) {
    this.hudText.setText(`${Math.floor(r.distance)} m`);
    const frac = r.speed / CONFIG.run.maxSpeed;
    const lit = Math.round(frac * this.meter.length);
    this.meter.forEach((seg, i) => {
      if (i < lit) seg.setFillStyle(seg.onColor, 1);
      else seg.setFillStyle(0x555555, 0.6);
    });
    const atMax = frac > 0.95;
    this.maxText.setVisible(atMax && Math.floor(this.time.now / 120) % 2 === 0);
  }

  // ---------- speed lines ----------
  buildSpeedLines() {
    const { width } = this.scale;
    this.speedLines = [];
    for (let i = 0; i < 14; i++) {
      const line = this.add.rectangle(
        this.rng.range(0, width), this.rng.range(110, CONFIG.groundY - 10),
        this.rng.range(60, 160), 3, 0xffffff, 0,
      ).setScrollFactor(0).setDepth(15);
      this.speedLines.push(line);
    }
  }

  updateSpeedLines(r, dt) {
    const { width } = this.scale;
    const frac = r.speed / CONFIG.run.maxSpeed;
    const from = CONFIG.feel.speedLinesFrom;
    const alpha = frac < from ? 0 : ((frac - from) / (1 - from)) * 0.7;
    for (const line of this.speedLines) {
      line.x -= r.speed * PPM * 2.2 * dt;
      if (line.x < -line.width) {
        line.x = width + this.rng.range(0, 200);
        line.y = this.rng.range(110, CONFIG.groundY - 10);
      }
      line.setFillStyle(0xffffff, alpha);
    }
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
      `Goose      ${r.distance.toFixed(1)} m  ${r.speed.toFixed(1)} m/s  h ${r.height.toFixed(2)}${r.stumble > 0 ? '  STUMBLE' : ''}`,
      `Next hurdle ${(this.hurdles.find((h) => h.at > r.distance)?.at ?? 0).toFixed(1)} m`,
      `Gooseliath -`,
      `Seed       ${this.seed}`,
    ]);
  }

  // ---------- loop ----------
  update(_time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const r = this.runner;

    for (const a of this.actions) {
      const result = applyAction(r, a);
      if (result === 'step') this.onStep();
      else if (result === 'stumble') this.onStumble();
      else if (result === 'jump') this.onJump();
    }
    this.actions.length = 0;
    if (updateRunner(r, dt) === 'land') this.onLand();

    const hit = findCollision(r, this.hurdles, CONFIG.track);
    if (hit) {
      hit.hit = true;
      crashRunner(r);
      this.onCrash(hit);
    }
    this.crashAnim = Math.max(0, this.crashAnim - dt);

    // Lurch decays back to zero quickly after each tap.
    this.lurch = Math.max(0, this.lurch - 60 * dt);
    this.goose.x = START_X + r.distance * PPM + this.lurch;
    this.animateGoose(r);

    // Camera leads further ahead the faster you go.
    const frac = r.speed / CONFIG.run.maxSpeed;
    const g = CONFIG.goose;
    const targetLead = g.screenX + (g.screenXFast - g.screenX) * frac;
    this.camLead += (targetLead - this.camLead) * Math.min(1, 3 * dt);
    const cam = this.cameras.main;
    cam.scrollX = START_X + r.distance * PPM - this.scale.width * this.camLead;
    if (frac > 0.9 && !cam.shakeEffect.isRunning) cam.shake(100, CONFIG.feel.maxSpeedShake);

    this.updateSpeedLines(r, dt);
    this.updateHud(r);
    this.updateDebug(r);
  }
}

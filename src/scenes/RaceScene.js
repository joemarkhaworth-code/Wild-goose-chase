import { CONFIG } from '../config.js';
import { makeRng } from '../rng.js';
import { createRunner, applyAction, updateRunner, crashRunner, isAirborne, isDown } from '../rules/runner.js';
import { generateHurdles, findCollision } from '../rules/track.js';
import { createTouchAndKeyControls } from '../input/controls.js';
import { spawnRagdoll, featherBurst, launchHurdle } from './ragdoll.js';
import { GooseRig } from './gooseRig.js';
import { star, setBoilFrame, BOIL, OUTLINE } from './draw.js';
import { createFilmLook } from './filmLook.js';

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

    const L = CONFIG.look;
    this.cameras.main.setBackgroundColor(L.sky);
    BOIL.amp = L.boilAmp;
    this.buildScenery();
    this.hurdles = generateHurdles(this.rng, CONFIG.track, CONFIG.trackLength);
    this.buildHurdles();
    // Separate RNG for cosmetic effects so they never shift gameplay randomness.
    this.fx = makeRng((this.seed ^ 0x9e3779b9) >>> 0);
    const gc = CONFIG.goose;
    this.colors = { body: gc.bodyColor, wing: gc.wingColor, beak: gc.beakColor, leg: gc.legColor };
    this.rig = new GooseRig(this, this.colors, gc);
    this.rig.x = START_X; this.rig.y = CONFIG.groundY + 30;
    this.ragdoll = null;
    this.hitStop = 0;
    this.pendingRagdoll = null;
    // Physics floor for ragdolls: the running line in the middle of the track.
    const feetY = CONFIG.groundY + 30;
    this.matter.add.rectangle(this.worldWidth / 2, feetY + 50, this.worldWidth + 2000, 100, { isStatic: true });
    this.dust = [];
    this.lurch = 0;
    this.camLead = CONFIG.goose.screenX;

    this.runner = createRunner(CONFIG.run);
    this.actions = [];
    createTouchAndKeyControls(this, CONFIG, (a) => this.actions.push(a));

    this.film = CONFIG.look.film ? createFilmLook(this, CONFIG.look) : null;
    this.buildHud();
    this.buildSpeedLines();
    this.buildDebugOverlay();
    this.cameras.main.setBounds(0, 0, this.worldWidth, height);
  }

  // ---------- scenery (greybox) ----------
  buildScenery() {
    const { width, height } = this.scale;
    const g = CONFIG.groundY;
    const L = CONFIG.look;
    const O = OUTLINE;

    // Far hills (slow parallax), outlined.
    const far = this.add.graphics().setScrollFactor(0.12).setDepth(-22);
    for (let x = -200; x < this.worldWidth * 0.12 + width + 400; x += this.rng.range(220, 380)) {
      const r = this.rng.range(150, 230);
      far.fillStyle(O, 1).fillCircle(x, g + 10, r + 3);
      far.fillStyle(L.hillsFar, 1).fillCircle(x, g + 10, r);
    }
    const hills = this.add.graphics().setScrollFactor(0.25).setDepth(-20);
    for (let x = -200; x < this.worldWidth * 0.25 + width + 400; x += this.rng.range(160, 320)) {
      const r = this.rng.range(110, 200);
      hills.fillStyle(O, 1).fillCircle(x, g + 50, r + 3);
      hills.fillStyle(L.hills, 1).fillCircle(x, g + 50, r);
    }

    // Trees (mid parallax): each its own object so they can bounce to the beat.
    this.trees = [];
    for (let x = 0; x < this.worldWidth * 0.6 + width + 400; x += this.rng.range(140, 380)) {
      const h = this.rng.range(60, 110);
      const r = this.rng.range(28, 44);
      const t = this.add.graphics().setScrollFactor(0.6).setDepth(-10).setPosition(x, g);
      // Bendy rubber trunk.
      t.fillStyle(O, 1).fillRoundedRect(-9, -h, 18, h + 2, 6);
      t.fillStyle(L.trunk, 1).fillRoundedRect(-6, -h, 12, h, 5);
      // Puffy canopy of three blobs.
      for (const [dx, dy, rr] of [[-r * 0.6, 0, r * 0.75], [r * 0.6, 0, r * 0.75], [0, -r * 0.5, r]]) {
        t.fillStyle(O, 1).fillCircle(dx, -h + dy, rr + 3);
      }
      for (const [dx, dy, rr] of [[-r * 0.6, 0, r * 0.75], [r * 0.6, 0, r * 0.75], [0, -r * 0.5, r]]) {
        t.fillStyle(L.treeLeaf, 1).fillCircle(dx, -h + dy, rr);
      }
      t.beatOffset = this.rng.next() < 0.5 ? 0 : Math.PI / 2;
      this.trees.push(t);
    }

    // Grass + track
    this.add.rectangle(0, g, this.worldWidth, height - g, L.grass).setOrigin(0, 0).setDepth(-5);
    this.add.rectangle(0, g, this.worldWidth, 60, L.track).setOrigin(0, 0).setDepth(-4);
    const lines = this.add.graphics().setDepth(-3);
    lines.fillStyle(O, 1);
    lines.fillRect(0, g - 2, this.worldWidth, 3);
    lines.fillStyle(0xfff4dc, 1);
    lines.fillRect(0, g + 1, this.worldWidth, 3);
    lines.fillRect(0, g + 56, this.worldWidth, 3);
    lines.fillStyle(O, 1);
    lines.fillRect(0, g + 59, this.worldWidth, 2);

    // Dashes on the track every 2 m: strong motion cue at speed.
    lines.fillStyle(L.trackDash, 1);
    for (let x = 0; x < this.worldWidth; x += 2 * PPM) lines.fillRect(x, g + 26, 30, 6);

    // Start line
    this.add.rectangle(START_X, g, 6, 60, 0xfff4dc).setOrigin(0.5, 0).setDepth(-3);

    // Distance markers
    for (let m = CONFIG.markerEvery; m <= CONFIG.trackLength; m += CONFIG.markerEvery) {
      const x = START_X + m * PPM;
      this.add.rectangle(x, g, 3, 60, 0xfff4dc, 0.7).setOrigin(0.5, 0).setDepth(-3);
      this.add.text(x, g + 66, `${m}m`, {
        fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#fff4dc', stroke: '#1d2b1f', strokeThickness: 4,
      }).setOrigin(0.5, 0).setDepth(-3);
    }

    // Foreground grass tufts: scroll faster than the track, so speed reads hard.
    const fg = this.add.graphics().setScrollFactor(1.6).setDepth(20);
    for (let x = 0; x < this.worldWidth * 1.6 + width + 400; x += this.rng.range(60, 200)) {
      const y = this.rng.range(height - 30, height + 10);
      const w = this.rng.range(14, 30);
      const top = y - this.rng.range(20, 40);
      fg.fillStyle(O, 1).fillTriangle(x - 3, y + 2, x + w / 2, top - 4, x + w + 3, y + 2);
      fg.fillStyle(0x5f8a45, 1).fillTriangle(x, y, x + w / 2, top, x + w, y);
    }
  }

  // Trees squash and stretch to the beat, like everything in a 1930s cartoon.
  updateTrees(t) {
    const beat = t * (CONFIG.goose.bpm / 60) * Math.PI;
    const amt = CONFIG.look.treeBounce;
    const camX = this.cameras.main.scrollX * 0.6;
    for (const tree of this.trees) {
      if (tree.x < camX - 200 || tree.x > camX + this.scale.width + 200) continue;
      const k = Math.sin(beat * 2 + tree.beatOffset);
      tree.setScale(1 - k * amt * 0.6, 1 + k * amt);
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

  // The hurdle goes flying: swap the static view for a cartwheeling physics bar.
  knockOver(h, speed) {
    h.view.setVisible(false);
    launchHurdle(this, h.view.x, CONFIG.groundY + 30, h.height * HPX, (speed * PPM) / 60);
  }

  // Pop a random exclamation above the goose.
  popWord(words, color, size = 30) {
    const word = words[Math.floor(this.fx.next() * words.length)];
    const t = this.add.text(this.rig.x + this.fx.range(-20, 40), this.rig.y - 150, word, {
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold',
      color, stroke: '#ffffff', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(30).setAngle(this.fx.range(-15, 15)).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, y: t.y - 50, alpha: 0, delay: 350, duration: 650, onComplete: () => t.destroy(),
    });
  }

  // ---------- per-event feedback ----------
  onStep() {
    this.lurch = CONFIG.feel.tapLurch;
    this.rig.step();
    this.spawnDust(this.rig.x - 6, this.rig.y);
  }

  onJump() {
    this.rig.jump();
    for (let i = 0; i < 2; i++) this.spawnDust(this.rig.x - 10, this.rig.y);
  }

  onLand() {
    this.rig.land();
    for (let i = 0; i < 3; i++) this.spawnDust(this.rig.x + this.fx.range(-15, 15), this.rig.y);
  }

  // Freeze-frame, then swap the goose for a ragdoll. kind: CONFIG.ragdoll.crash | .trip
  goRagdoll(speed, kind, stop) {
    this.rig.smack();
    this.rig.draw(); // show the squashed smack during the freeze
    this.hitStop = stop;
    this.matter.world.pause();
    this.pendingRagdoll = { speed, kind };
    this.impactStar(this.rig.x + 30, this.rig.y - 40, kind === CONFIG.ragdoll.crash ? 1 : 0.6);
  }

  spawnPendingRagdoll() {
    const { speed, kind } = this.pendingRagdoll;
    this.pendingRagdoll = null;
    this.matter.world.resume();
    const rc = CONFIG.ragdoll;
    this.rig.setVisible(false);
    this.ragdoll = spawnRagdoll(
      this, this.rig.x, this.rig.y, this.colors,
      { vx: (speed * PPM / 60) * rc.launchForward, up: kind.up, spin: kind.spin },
      rc,
      (x, y, strength) => this.onRagdollImpact(x, y, strength),
      CONFIG.goose.drawScale,
    );
  }

  onRagdollImpact(x, y, strength) {
    for (let i = 0; i < 2 + Math.round(strength * 4); i++) this.spawnDust(x + this.fx.range(-25, 25), CONFIG.groundY + 30);
    if (strength > 0.4) this.cameras.main.shake(90, 0.006 * strength);
  }

  // Cartoon impact star that pops and fades.
  impactStar(x, y, size) {
    const g = this.add.graphics().setDepth(28);
    star(g, { x: 0, y: 0 }, 34 * size, this.fx.range(0, 1), 0xffffff);
    star(g, { x: 0, y: 0 }, 20 * size, this.fx.range(0, 1), 0xffd23f);
    g.setPosition(x, y).setScale(0.4);
    this.tweens.add({ targets: g, scale: 1.3, duration: 110, ease: 'Back.easeOut' });
    this.tweens.add({ targets: g, alpha: 0, delay: 160, duration: 200, onComplete: () => g.destroy() });
  }

  onCrash(h, speedBefore) {
    this.knockOver(h, speedBefore);
    this.goRagdoll(speedBefore, CONFIG.ragdoll.crash, CONFIG.feel.hitStop);
    this.cameras.main.shake(260, CONFIG.feel.crashShake);
    for (let i = 0; i < 7; i++) this.spawnDust(this.rig.x + this.fx.range(-25, 25), this.rig.y);
    featherBurst(this, this.fx, this.rig.x, this.rig.y - 50, 12);
    this.popWord(CONFIG.feel.crashWords, '#ff4b3e', 34);
  }

  onStumble() {
    this.goRagdoll(this.runner.speed, CONFIG.ragdoll.trip, CONFIG.feel.tripHitStop);
    featherBurst(this, this.fx, this.rig.x, this.rig.y - 50, 5);
    this.popWord(CONFIG.feel.tripWords, '#f2a33a', 26);
    this.cameras.main.shake(180, CONFIG.feel.stumbleShake);
    for (let i = 0; i < 4; i++) this.spawnDust(this.rig.x + this.fx.range(-20, 20), this.rig.y);
  }

  onGetUp() {
    if (this.ragdoll) {
      this.rig.getUpFrom(this.ragdoll);
      this.ragdoll.destroy();
      this.ragdoll = null;
    }
    this.rig.setVisible(true);
    this.rig.land();
    for (let i = 0; i < 4; i++) this.spawnDust(this.rig.x + this.fx.range(-20, 20), this.rig.y);
  }

  spawnDust(x, y) {
    const puff = this.add.circle(x, y, this.fx.range(5, 9), 0xe9d3b0, 0.9).setDepth(9);
    this.tweens.add({
      targets: puff,
      x: x - this.fx.range(20, 45),
      y: y - this.fx.range(8, 22),
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
        this.fx.range(0, width), this.fx.range(110, CONFIG.groundY - 10),
        this.fx.range(60, 160), 3, 0xffffff, 0,
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
        line.x = width + this.fx.range(0, 200);
        line.y = this.fx.range(110, CONFIG.groundY - 10);
      }
      line.setFillStyle(0x1d2b1f, alpha * 0.55);
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

    // Build version, bottom-centre, so you can tell a fresh deploy has loaded.
    this.add.text(width / 2, this.scale.height - 4, `v ${window.GAME_VERSION ?? 'dev'}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5, 1).setAlpha(0.6).setScrollFactor(0).setDepth(200);

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
      `Goose      ${r.distance.toFixed(1)} m  ${r.speed.toFixed(1)} m/s  h ${r.height.toFixed(2)}${r.stumble > 0 ? '  STUMBLE' : ''}${isDown(r) ? '  DOWN ' + r.down.toFixed(1) : ''}`,
      `Next hurdle ${(this.hurdles.find((h) => h.at > r.distance)?.at ?? 0).toFixed(1)} m`,
      `Gooseliath -`,
      `Seed       ${this.seed}`,
    ]);
  }

  // ---------- loop ----------
  update(_time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const r = this.runner;

    // Hand-drawn frame counter drives line boil and film flicker.
    const frame = Math.floor((this.time.now / 1000) * CONFIG.look.boilFps);
    setBoilFrame(frame);
    this.film?.update(frame);
    this.updateTrees(this.time.now / 1000);

    // Hit-stop: freeze everything for a beat on impact, then launch the ragdoll.
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.actions.length = 0;
      if (this.hitStop <= 0 && this.pendingRagdoll) this.spawnPendingRagdoll();
      return;
    }

    for (const a of this.actions) {
      const result = applyAction(r, a);
      if (result === 'step') this.onStep();
      else if (result === 'stumble') this.onStumble();
      else if (result === 'jump') this.onJump();
    }
    this.actions.length = 0;
    if (this.hitStop > 0) return; // a trip just started a freeze-frame

    const ev = updateRunner(r, dt);
    if (ev === 'land') this.onLand();
    else if (ev === 'getUp') this.onGetUp();

    const hit = isDown(r) ? null : findCollision(r, this.hurdles, CONFIG.track);
    if (hit) {
      hit.hit = true;
      const speedBefore = r.speed;
      crashRunner(r);
      this.onCrash(hit, speedBefore);
      return;
    }

    // Lurch decays back to zero quickly after each tap.
    this.lurch = Math.max(0, this.lurch - 60 * dt);
    const x = START_X + r.distance * PPM + this.lurch;
    const frac = r.speed / CONFIG.run.maxSpeed;
    this.rig.update({
      x,
      y: CONFIG.groundY + 30 - r.height * HPX,
      speedFrac: frac,
      speedPx: r.speed * PPM,
      phase: r.distance * CONFIG.goose.legCycle,
      air: isAirborne(r),
      dt,
    });
    this.rig.draw();
    if (this.ragdoll) {
      this.ragdoll.update(x, (r.speed * PPM) / 60, dt);
      this.ragdoll.draw(this.time.now / 1000);
    }

    // Camera leads further ahead the faster you go.
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

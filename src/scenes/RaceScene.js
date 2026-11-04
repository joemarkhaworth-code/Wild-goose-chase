import { CONFIG } from '../config.js';
import { makeRng } from '../rng.js';
import { createRunner, applyAction, updateRunner, crashRunner, isAirborne, isDown } from '../rules/runner.js';
import { generateHurdles, findCollision } from '../rules/track.js';
import { createTouchAndKeyControls } from '../input/controls.js';
import { spawnRagdoll, featherBurst, launchHurdle } from './ragdoll.js';
import { GooseRig } from './gooseRig.js';
import { star, setBoilFrame, BOIL, OUTLINE, puff, tube, quad, pieEye, ellipse, circle } from './draw.js';
import { createFilmLook } from './filmLook.js';

const PPM = CONFIG.pixelsPerMetre;
const START_X = 200; // world x (px) of the start line
const FONT = '"Luckiest Guy", system-ui, sans-serif';
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
    const rng = this.rng;

    // Sky clouds (very slow parallax).
    const clouds = this.add.graphics().setScrollFactor(0.06).setDepth(-30);
    for (let x = rng.range(-100, 200); x < this.worldWidth * 0.06 + width + 400; x += rng.range(260, 480)) {
      const r = rng.range(24, 40);
      puff(clouds, { x, y: rng.range(110, 210) }, r, L.cloud,
        [[-1.1, 0.2, 0.5], [-0.45, -0.15, 0.7], [0.3, -0.35, 0.8], [1.0, 0, 0.6], [0.2, 0.25, 0.6]]);
    }

    // Rolling hills in three layers, outlined, with a barn and fences far off.
    const layer = (sf, depth, color, y, rMin, rMax, stepMin, stepMax) => {
      const gr = this.add.graphics().setScrollFactor(sf).setDepth(depth);
      const tops = [];
      for (let x = -200; x < this.worldWidth * sf + width + 400; x += rng.range(stepMin, stepMax)) {
        const r = rng.range(rMin, rMax);
        gr.fillStyle(O, 1).fillCircle(x, y + r * 0.55, r + 3);
        tops.push({ x, y: y + r * 0.55 - r, r });
      }
      gr.fillStyle(color, 1);
      for (const t of tops) gr.fillCircle(t.x, t.y + t.r, t.r);
      return { gr, tops };
    };
    const far = layer(0.1, -26, L.hillsFar, g - 40, 140, 220, 240, 380);
    // A little red barn on some far hilltops.
    for (const t of far.tops) {
      if (rng.next() > 0.25) continue;
      const bx = t.x - 10, by = t.y + 6;
      far.gr.fillStyle(O, 1).fillRect(bx - 2, by - 22, 32, 24).fillTriangle(bx - 5, by - 20, bx + 14, by - 36, bx + 33, by - 20);
      far.gr.fillStyle(L.barn, 1).fillRect(bx, by - 20, 28, 20).fillTriangle(bx - 1, by - 21, bx + 14, by - 33, bx + 29, by - 21);
      far.gr.fillStyle(0xf1e3c2, 1).fillRect(bx + 10, by - 12, 8, 12);
      far.gr.fillStyle(O, 1).fillRect(bx + 32, by - 34, 9, 34);
      far.gr.fillStyle(0xc9c1a6, 1).fillRect(bx + 34, by - 32, 5, 32);
    }
    const mid = layer(0.25, -22, L.hillsMid, g - 10, 110, 190, 170, 300);
    // Wooden fences running over some mid hills.
    for (const t of mid.tops) {
      if (rng.next() > 0.35) continue;
      const fy = t.y + 30, x0 = t.x - 40, x1 = t.x + 70;
      const fg = mid.gr;
      for (const yy of [fy, fy + 9]) {
        fg.fillStyle(O, 1).fillRect(x0, yy - 1, x1 - x0, 5);
        fg.fillStyle(L.wood, 1).fillRect(x0, yy, x1 - x0, 3);
      }
      for (let x = x0; x <= x1; x += 18) {
        fg.fillStyle(O, 1).fillRect(x - 3, fy - 6, 6, 22);
        fg.fillStyle(L.wood, 1).fillRect(x - 1.5, fy - 5, 3, 20);
      }
    }
    layer(0.4, -18, L.hills, g + 20, 90, 160, 150, 260);

    // Trees (mid parallax): each its own object so they can bounce to the beat.
    // Every few trees has a grumpy face and fists on its hips.
    this.trees = [];
    let n = 0;
    for (let x = 0; x < this.worldWidth * 0.6 + width + 400; x += rng.range(160, 380)) {
      const face = ++n % L.faceTreeEvery === 0;
      const t = this.add.graphics().setScrollFactor(0.6).setDepth(-10).setPosition(x, g);
      this.drawTree(t, face, rng);
      t.beatOffset = rng.next() < 0.5 ? 0 : Math.PI / 2;
      this.trees.push(t);
    }

    // Grass + dirt track.
    this.add.rectangle(0, g, this.worldWidth, height - g, L.grass).setOrigin(0, 0).setDepth(-5);
    this.add.rectangle(0, g, this.worldWidth, 60, L.track).setOrigin(0, 0).setDepth(-4);
    const lines = this.add.graphics().setDepth(-3);
    lines.fillStyle(O, 1);
    lines.fillRect(0, g - 2, this.worldWidth, 3);
    lines.fillRect(0, g + 59, this.worldWidth, 3);
    // Pebbles and ruts.
    lines.fillStyle(0xbf8c52, 1);
    for (let x = 0; x < this.worldWidth; x += rng.range(20, 70)) {
      lines.fillEllipse(x, g + rng.range(8, 54), rng.range(6, 14), rng.range(2, 4));
    }
    // Dashes on the track every 2 m: strong motion cue at speed.
    lines.fillStyle(L.trackDash, 1);
    for (let x = 0; x < this.worldWidth; x += 2 * PPM) lines.fillRect(x, g + 27, 28, 5);

    // Start line
    this.add.rectangle(START_X, g, 6, 60, 0xfff4dc).setOrigin(0.5, 0).setDepth(-3);

    // Red-and-white posts along the back of the track, with distance markers.
    const posts = this.add.graphics().setDepth(-6);
    for (let m = CONFIG.markerEvery; m <= CONFIG.trackLength; m += CONFIG.markerEvery) {
      const x = START_X + m * PPM;
      posts.fillStyle(O, 1).fillRoundedRect(x - 9, g - 40, 18, 42, 7);
      posts.fillStyle(0xf4ead2, 1).fillRoundedRect(x - 6, g - 37, 12, 37, 5);
      posts.fillStyle(0xc0392b, 1).fillRect(x - 6, g - 30, 12, 8);
      this.add.text(x, g + 66, `${m}m`, {
        fontFamily: FONT, fontSize: '18px', color: '#fff4dc', stroke: '#1d2b1f', strokeThickness: 5,
      }).setOrigin(0.5, 0).setDepth(-3);
    }

    // NO GEESE signs, rickety and leaning.
    for (let m = 30 + rng.range(0, 30); m < CONFIG.trackLength; m += L.signEvery * rng.range(0.7, 1.3)) {
      this.drawSign(START_X + m * PPM + 60, g, rng);
    }

    // Foreground grass tufts and daisies: scroll faster than the track.
    const fg = this.add.graphics().setScrollFactor(1.6).setDepth(20);
    for (let x = 0; x < this.worldWidth * 1.6 + width + 400; x += rng.range(40, 140)) {
      const y = rng.range(height - 26, height + 6);
      // Tuft: a few outlined blades.
      for (let b = 0; b < 4; b++) {
        const bx = x + b * 6 + rng.range(-2, 2);
        const top = { x: bx + rng.range(-10, 10), y: y - rng.range(18, 34) };
        fg.fillStyle(O, 1).fillTriangle(bx - 5, y + 2, top.x, top.y - 3, bx + 5, y + 2);
        fg.fillStyle(0x6f9a48, 1).fillTriangle(bx - 3, y, top.x, top.y, bx + 3, y);
      }
      if (rng.next() < 0.3) {
        const d = { x: x + rng.range(-10, 30), y: y - rng.range(14, 26) };
        fg.fillStyle(O, 1).fillCircle(d.x, d.y, 9);
        fg.fillStyle(0xffffff, 1);
        for (let p = 0; p < 6; p++) {
          const a = (p / 6) * Math.PI * 2;
          fg.fillCircle(d.x + Math.cos(a) * 4.5, d.y + Math.sin(a) * 4.5, 3.6);
        }
        fg.fillStyle(0xf2c037, 1).fillCircle(d.x, d.y, 3);
      }
    }
  }

  // Draw a tree into graphics t with its base at (0, 0).
  drawTree(t, face, rng) {
    const L = CONFIG.look;
    const h = face ? rng.range(110, 140) : rng.range(60, 100);
    const r = face ? rng.range(52, 62) : rng.range(30, 44);
    const bw = face ? 22 : 9, tw = face ? 13 : 6;
    // Tapered trunk with flared roots.
    const trunk = [{ x: -bw - 8, y: 0 }, { x: -tw, y: -h }, { x: tw, y: -h }, { x: bw + 8, y: 0 }];
    t.fillStyle(OUTLINE, 1).fillPoints(trunk.map((p) => ({ x: p.x * 1.15 + (p.x > 0 ? 2 : -2), y: p.y + 2 })), true);
    t.fillStyle(L.trunk, 1).fillPoints(trunk, true);
    // Puffy canopy.
    const blobs = [[-0.75, 0.15, 0.6], [0.75, 0.15, 0.6], [-0.4, -0.4, 0.7], [0.4, -0.45, 0.7], [0, -0.1, 0.8]];
    puff(t, { x: 0, y: -h - r * 0.3 }, r, L.treeLeaf, blobs);
    t.fillStyle(L.treeLeafDark, 1);
    t.fillCircle(-r * 0.5, -h - r * 0.05, r * 0.25).fillCircle(r * 0.45, -h + r * 0.0, r * 0.22);
    if (!face) return;
    // Fists on hips: arms out from the trunk, elbows wide.
    for (const side of [-1, 1]) {
      const sh = { x: side * tw, y: -h * 0.62 };
      const elbow = { x: side * (bw + 26), y: -h * 0.55 };
      const hip = { x: side * (bw - 2), y: -h * 0.36 };
      tube(t, quad(sh, elbow, hip, 10), 9, L.trunk);
      circle(t, hip, 7, L.trunk);
    }
    // Grumpy face.
    const fy = -h * 0.72;
    pieEye(t, { x: -8, y: fy }, 11, 15, 0.2, 'normal');
    pieEye(t, { x: 8, y: fy }, 11, 15, Math.PI - 0.2, 'normal');
    t.lineStyle(4, OUTLINE, 1);
    t.lineBetween(-16, fy - 14, -2, fy - 8);
    t.lineBetween(16, fy - 14, 2, fy - 8);
    ellipse(t, { x: 0, y: fy + 20 }, 18, 12, 0, 0x5a2a1a);
    t.fillStyle(0xd9583b, 1).fillEllipse(0, fy + 23, 9, 4);
  }

  // A rickety NO GEESE sign standing behind the track.
  drawSign(x, g, rng) {
    const s = this.add.graphics().setDepth(-7).setPosition(x, g).setAngle(rng.range(-12, 12));
    const W = CONFIG.look.wood;
    s.fillStyle(OUTLINE, 1).fillRect(-6, -70, 12, 72);
    s.fillStyle(W, 1).fillRect(-3, -68, 6, 68);
    s.fillStyle(OUTLINE, 1).fillRoundedRect(-44, -112, 88, 58, 5);
    s.fillStyle(0xe8d4a8, 1).fillRoundedRect(-41, -109, 82, 52, 4);
    // No-goose symbol.
    s.lineStyle(4, 0xc0392b, 1).strokeCircle(26, -83, 13);
    s.fillStyle(OUTLINE, 1).fillEllipse(25, -80, 14, 8).fillCircle(31, -88, 3).fillRect(29, -88, 2, 7);
    s.lineStyle(4, 0xc0392b, 1).lineBetween(17, -92, 35, -74);
    const tx = this.add.text(x - 10, g - 83, 'NO\nGEESE', {
      fontFamily: FONT, fontSize: '15px', color: '#1d2b1f', align: 'center', lineSpacing: -4,
    }).setOrigin(0.5).setDepth(-7).setAngle(s.angle);
    // Keep text on the board when the sign leans.
    const a = Phaser.Math.DegToRad(s.angle);
    tx.setPosition(x + (-10) * Math.cos(a) - (-83) * Math.sin(a), g + (-10) * Math.sin(a) + (-83) * Math.cos(a));
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
      fontFamily: FONT, fontSize: `${size}px`,
      color, stroke: '#1d2b1f', strokeThickness: 7,
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

  // Outlined cartoon dust cloud that puffs up and drifts back.
  spawnDust(x, y) {
    const g = this.add.graphics().setDepth(9);
    const r = this.fx.range(7, 12);
    puff(g, { x: 0, y: 0 }, r, 0xf1e3c2);
    g.setPosition(x, y - r * 0.4).setScale(0.6);
    this.tweens.add({
      targets: g,
      x: x - this.fx.range(25, 60),
      y: y - this.fx.range(10, 26),
      scale: this.fx.range(1.3, 1.9),
      alpha: 0,
      duration: this.fx.range(380, 560),
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  // ---------- HUD ----------
  buildHud() {
    const { width } = this.scale;
    const ink = '#1d2b1f';
    // Character title card, top-left.
    this.add.text(18, 8, 'GOOSE\nWILLIS', {
      fontFamily: FONT, fontSize: '30px', color: '#fff4dc', stroke: ink, strokeThickness: 7,
      lineSpacing: -10, shadow: { offsetX: 3, offsetY: 3, color: ink, fill: true },
    }).setScrollFactor(0).setDepth(100).setAngle(-6);

    this.hudText = this.add.text(width / 2, 6, '0 m', {
      fontFamily: FONT, fontSize: '40px', color: '#fff4dc', stroke: ink, strokeThickness: 8,
      shadow: { offsetX: 3, offsetY: 3, color: ink, fill: true },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Segmented power meter in an inked frame.
    const n = CONFIG.feel.meterSegments;
    const segW = 18, segH = 16, gap = 3;
    const total = n * segW + (n - 1) * gap;
    const x0 = width / 2 - total / 2;
    const frame = this.add.graphics().setScrollFactor(0).setDepth(100);
    frame.fillStyle(OUTLINE, 1).fillRoundedRect(width / 2 - total / 2 - 8, 58, total + 16, segH + 14, 9);
    frame.fillStyle(0xe8dcb8, 1).fillRoundedRect(width / 2 - total / 2 - 5, 61, total + 10, segH + 8, 7);
    this.meter = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const color = t < 0.5 ? 0x9cc46a : t < 0.8 ? 0xe8c25a : 0xd9583b;
      const seg = this.add.rectangle(x0 + i * (segW + gap) + segW / 2, 73, segW, segH, color)
        .setStrokeStyle(1.5, OUTLINE).setScrollFactor(0).setDepth(101);
      seg.onColor = color;
      this.meter.push(seg);
    }
    this.maxText = this.add.text(width / 2 + total / 2 + 16, 73, 'MAX!', {
      fontFamily: FONT, fontSize: '28px', color: '#d9583b', stroke: ink, strokeThickness: 6,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setVisible(false).setAngle(-8);
  }

  updateHud(r) {
    this.hudText.setText(`${Math.floor(r.distance)} m`);
    const frac = r.speed / CONFIG.run.maxSpeed;
    const lit = Math.round(frac * this.meter.length);
    this.meter.forEach((seg, i) => {
      if (i < lit) seg.setFillStyle(seg.onColor, 1);
      else seg.setFillStyle(0xcfd6b4, 1);
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

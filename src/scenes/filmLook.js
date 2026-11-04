// Old-cartoon film look: warm sepia tone, vignette, grain, flicker and the odd
// scratch, all re-rolled on a hand-drawn frame rate. Screen-space overlays that
// sit above the world and below the HUD.

const DEPTH = 90;

export function createFilmLook(scene, cfg) {
  const { width, height } = scene.scale;

  // Vignette: radial gradient baked into a canvas texture.
  if (!scene.textures.exists('vignette')) {
    const c = scene.textures.createCanvas('vignette', width, height);
    const ctx = c.getContext();
    const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.62);
    grad.addColorStop(0, 'rgba(40,24,8,0)');
    grad.addColorStop(1, `rgba(40,24,8,${cfg.vignette})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    c.refresh();
  }
  // Grain: tileable noise.
  if (!scene.textures.exists('grain')) {
    const n = 128;
    const c = scene.textures.createCanvas('grain', n, n);
    const ctx = c.getContext();
    const img = ctx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const g = Math.random() * 255;
      img.data[i * 4] = g; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = g;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    c.refresh();
  }

  const tone = scene.add.rectangle(0, 0, width, height, cfg.toneColor, cfg.toneAlpha)
    .setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setBlendMode(Phaser.BlendModes.MULTIPLY);
  const vignette = scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 1);
  const grain = scene.add.tileSprite(0, 0, width, height, 'grain').setOrigin(0)
    .setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(cfg.grain).setBlendMode(Phaser.BlendModes.OVERLAY);
  const flicker = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
    .setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3);
  const scratch = scene.add.rectangle(0, 0, 2, height, 0x2a1a08, 0)
    .setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3);

  let last = -1;
  return {
    // frame: the current hand-drawn frame number (changes ~12x a second).
    update(frame) {
      if (frame === last) return;
      last = frame;
      grain.tilePositionX = Math.random() * 128;
      grain.tilePositionY = Math.random() * 128;
      flicker.setFillStyle(0x000000, Math.random() * cfg.flicker);
      if (Math.random() < cfg.scratchChance) {
        scratch.setPosition(Math.random() * width, 0).setAlpha(0.15 + Math.random() * 0.25)
          .setSize(1 + Math.random() * 2, height);
      } else {
        scratch.setAlpha(0);
      }
    },
    objects: [tone, vignette, grain, flicker, scratch],
  };
}

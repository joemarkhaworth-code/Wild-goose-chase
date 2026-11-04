// Input layer: turns touches and keys into actions ('tapLeft' | 'tapRight' | 'jump').
// Game code only ever sees actions, so AI or remote players can feed the same queue.

const INK = 0x1d2b1f;
const PAPER = 0xf1e3c2;
const FONT = '"Luckiest Guy", system-ui, sans-serif';

export function createTouchAndKeyControls(scene, cfg, onAction) {
  const { width, height } = scene.scale;
  const size = cfg.buttonSize;
  const pad = 20;
  scene.input.addPointer(3); // multitouch

  // Aged-paper button with an inked rim. label: 'left' | 'right' | text.
  const makeButton = (x, y, label, action, d = size) => {
    const bg = scene.add.circle(x, y, d / 2, PAPER, 0.55)
      .setStrokeStyle(4, INK, 0.9)
      .setScrollFactor(0).setDepth(100)
      .setInteractive();
    let fg;
    if (label === 'left' || label === 'right') {
      // Chunky hand-drawn arrow.
      const s = label === 'left' ? -1 : 1;
      fg = scene.add.graphics().setScrollFactor(0).setDepth(101).setPosition(x, y);
      const pts = [[-26, -9], [4, -9], [4, -22], [28, 0], [4, 22], [4, 9], [-26, 9]]
        .map(([px, py]) => ({ x: px * s, y: py }));
      fg.fillStyle(PAPER, 1).fillPoints(pts, true);
      fg.lineStyle(4, INK, 1).strokePoints(pts, true, true);
    } else {
      fg = scene.add.text(x, y, label, {
        fontFamily: FONT, fontSize: '30px', color: '#fff4dc', stroke: '#1d2b1f', strokeThickness: 6,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    }
    const press = () => {
      onAction(action);
      bg.setFillStyle(PAPER, 0.9);
      bg.setScale(0.88); fg.setScale(0.88);
      scene.time.delayedCall(70, () => {
        bg.setFillStyle(PAPER, 0.55);
        bg.setScale(1); fg.setScale(1);
      });
    };
    bg.on('pointerdown', press);
    return { bg, fg, press };
  };

  // Run buttons sit close together bottom-right, staggered like X and O on a
  // PlayStation pad, so you mash them with one or two fingers (Track & Field style).
  const gap = cfg.buttonGap;
  const rightX = width - size / 2 - pad;
  const rightY = height - size / 2 - pad - cfg.buttonStagger;
  const leftX = rightX - size - gap;
  const leftY = height - size / 2 - pad;
  const left = makeButton(leftX, leftY, 'left', 'tapLeft');
  const right = makeButton(rightX, rightY, 'right', 'tapRight');

  // JUMP bottom-left, for the other thumb.
  const js = cfg.jumpButtonSize;
  const jump = makeButton(js / 2 + pad, height - js / 2 - pad, 'JUMP', 'jump', js);

  // Keyboard for desktop testing: ←/A and →/D run, Space/↑/W jump.
  const kb = scene.input.keyboard;
  if (kb) {
    kb.on('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') left.press();
      if (e.code === 'ArrowRight' || e.code === 'KeyD') right.press();
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jump.press();
    });
  }

  return { left, right, jump };
}

// Input layer: turns touches and keys into actions ('tapLeft' | 'tapRight' | 'jump').
// Game code only ever sees actions, so AI or remote players can feed the same queue.

export function createTouchAndKeyControls(scene, cfg, onAction) {
  const { width, height } = scene.scale;
  const size = cfg.buttonSize;
  const pad = 20;
  scene.input.addPointer(3); // multitouch

  const makeButton = (x, y, label, action, d = size) => {
    const bg = scene.add.circle(x, y, d / 2, 0xffffff, 0.18)
      .setStrokeStyle(4, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(100)
      .setInteractive();
    const text = scene.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    const press = () => {
      onAction(action);
      bg.setFillStyle(0xffffff, 0.5);
      bg.setScale(0.88); text.setScale(0.88);
      scene.time.delayedCall(70, () => {
        bg.setFillStyle(0xffffff, 0.18);
        bg.setScale(1); text.setScale(1);
      });
    };
    bg.on('pointerdown', press);
    return { bg, text, press };
  };

  // Run buttons sit close together bottom-right, staggered like X and O on a
  // PlayStation pad, so you mash them with one or two fingers (Track & Field style).
  const gap = cfg.buttonGap;
  const rightX = width - size / 2 - pad;
  const rightY = height - size / 2 - pad - cfg.buttonStagger;
  const leftX = rightX - size - gap;
  const leftY = height - size / 2 - pad;
  const left = makeButton(leftX, leftY, 'LEFT', 'tapLeft');
  const right = makeButton(rightX, rightY, 'RIGHT', 'tapRight');

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

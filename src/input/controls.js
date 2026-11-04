// Input layer: turns touches and keys into actions ('tapLeft' | 'tapRight' | 'jump').
// Game code only ever sees actions, so AI or remote players can feed the same queue.

export function createTouchAndKeyControls(scene, cfg, onAction) {
  const { width, height } = scene.scale;
  const size = cfg.buttonSize;
  const pad = 20;
  scene.input.addPointer(3); // multitouch

  const makeButton = (x, y, label, action) => {
    const bg = scene.add.circle(x, y, size / 2, 0xffffff, 0.18)
      .setStrokeStyle(4, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(100)
      .setInteractive();
    const text = scene.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    const press = () => {
      onAction(action);
      bg.setFillStyle(0xffffff, 0.45);
      scene.time.delayedCall(80, () => bg.setFillStyle(0xffffff, 0.18));
    };
    bg.on('pointerdown', press);
    return { bg, text, press };
  };

  const y = height - size / 2 - pad;
  const left = makeButton(size / 2 + pad, y, 'LEFT', 'tapLeft');
  const right = makeButton(width - size / 2 - pad, y, 'RIGHT', 'tapRight');

  // Keyboard for desktop testing: ←/A and →/D.
  const kb = scene.input.keyboard;
  if (kb) {
    kb.on('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') left.press();
      if (e.code === 'ArrowRight' || e.code === 'KeyD') right.press();
    });
  }

  return { left, right };
}

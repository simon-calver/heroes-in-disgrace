function displayScore(scene, x, y, score, delay = 0, prefix = '') {
  if (score == 0) {
    return;
  }
  var text = prefix + (score > 0 ? `+${score}` : `${score}`);
  var bmt = scene.add.bitmapText(x, y, 'heroes-font', text, 42).setOrigin(0.5, 0.5).setTint(0xffff00).setDepth(20).setVisible(false);

  scene.tweens.addCounter({
    from: 2,
    to: 0.0,
    delay: delay,
    duration: 2500,
    onStart: function () {
      bmt.setVisible(true)
    },
    onUpdate: function (tween) {
      bmt.y -= 0.5;
      // Only starts fading once half way through tween, can this be done better?
      if (tween.getValue() <= 1.0) {
        bmt.setAlpha(tween.getValue());
      }
    },
    onComplete: function (tween) {
      bmt.destroy();
    }
  });
}

export default displayScore;

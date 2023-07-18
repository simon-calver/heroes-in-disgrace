export default class menuScene extends Phaser.Scene {

  constructor() {
    super('MenuScene');
  }

  preload() {
    this.load.html('instructions', 'assets/text/instructions.html');
    this.load.html('high-scores', 'assets/text/high-scores.html');
  }

  create(data = { playerScene: Phaser, menuType: String, wasPaused: Boolean }) {
    let { width, height } = this.sys.game.canvas;

    this.wasPaused = data.wasPaused;

    let imageWidth = this.textures.get('menu-top').getSourceImage().width;
    let imageScale = width / imageWidth;

    // Make menu background out of pngs
    let backgroundTop = this.add.image(width / 2, 0, 'menu-top').setOrigin(0.5, 0).setScale(imageScale).setInteractive();
    let backgroundMiddle = this.add.image(width / 2, backgroundTop.displayHeight, 'menu-middle').setOrigin(0.5, 0).setScale(imageScale).setInteractive();
    backgroundMiddle.displayHeight = height - 2 * backgroundTop.displayHeight - 40; // middleHeight;

    let backgroundBottom = this.add.image(width / 2, backgroundTop.displayHeight + backgroundMiddle.displayHeight, 'menu-top').setOrigin(0.5, 0).setScale(imageScale).setInteractive();
    backgroundBottom.flipY = true;

    // Button to return to game
    let cancelButton = this.add.image(width - 4, 4, 'icons', 'cross.png').setOrigin(1, 0).setScale(0.4).setInteractive({ cursor: 'pointer' });
    cancelButton.on('pointerdown', () => {
      data.playerScene.scene.resume('MainScene');
      data.playerScene.unBlurScreen();
      // If the game was paused when the menu was opened don't unpause it
      if (!data.wasPaused) data.playerScene.resumeGame();

      // Show HTML elements that were hidden by this menu
      if (data.playerScene.nameform) data.playerScene.nameform.setVisible(true);

      this.scene.stop();
    });

    // Title text
    let titleWords = data.menuType.split('_');
    let title = titleWords.map((word) => {
      return (word.length > 2) ? (word[0].toUpperCase() + word.substring(1)) : (word);
    }).join(' ');
    this.add.bitmapText(width / 2, 40, 'mont', title, 36).setOrigin(0.5, 0);

    this.setBodyText(data.menuType);

    data.playerScene.addSocialButtons(this);
  }

  setBodyText(menuType) {
    let { width, height } = this.sys.game.canvas;
    console.log(height)
    let lineHeight = 100;
    switch (menuType) {
      case 'how_to_play':
        this.add.dom(width / 2, 100).createFromCache('instructions').setOrigin(0.5, 0);
        break;
      case 'stats':
        this.gamesPlayedText = this.add.bitmapText(width / 2, 80 + lineHeight, 'mont', this.getGamesPlayedText(0), 30).setOrigin(0.5);
        this.gamesPlayedText.setCenterAlign();

        this.avgScoreText = this.add.bitmapText(width / 2, 80 + 2 * lineHeight, 'mont', this.getAvgScoreText(0), 30).setOrigin(0.5);
        this.avgScoreText.setCenterAlign();

        this.highScoreText = this.add.bitmapText(width / 2, 80 + 3 * lineHeight, 'mont', this.getHighScoreText(0), 30).setOrigin(0.5);
        this.highScoreText.setCenterAlign();

        this.displayScores();
        break;
      case 'high_scores':
        this.add.dom(width / 2, 100).createFromCache('high-scores').setOrigin(0.5, 0);
      default:
        break;
    }
  }

  displayScores() {
    getStats().then(stats => {
      this.gamesPlayedText.text = this.getGamesPlayedText(stats['played']);
      this.avgScoreText.text = this.getAvgScoreText(parseFloat(stats['average']).toFixed(2));
      this.highScoreText.text = this.getHighScoreText(stats['high']);
    });
  }

  getGamesPlayedText(gamesPlayed) {
    return `Times Played:\n${gamesPlayed}`;
  }

  getAvgScoreText(avgScore) {
    return `Average Score:\n${avgScore}`;
  }

  getHighScoreText(highScore) {
    return `High Score:\n${highScore}`;
  }
}

export default class UIScene extends Phaser.Scene {

  constructor() {
    super('UIScene');
  }

  preload() {
  }

  create(data) {
    this.player = data.player;
    this.isMoving = false;
    this.direction = 0;
    this.addScore();
    this.addController();
    this.addHealth();
    this.addLevelCount();
    this.addTokenCount(data.totalTokens);
    this.addHeroCount(data.totalHeroes);
  }

  addLevelCount() {
    let { width, height } = this.sys.game.canvas;
    this.levelText = this.add.bitmapText(width, 18, 'heroes-font', 'Level 0', 36).setOrigin(1, 0.5).setDepth(1001);
  }

  addTokenCount(totalTokens) {
    let { width, height } = this.sys.game.canvas;
    this.tokenCount = this.add.bitmapText(width, 18 + this.levelText.height, 'heroes-font', `00/${totalTokens}`, 36).setOrigin(1, 0.5).setDepth(1001);
    this.add.image(width - this.tokenCount.width - 5, 18 + this.levelText.height, 'star').setOrigin(1, 0.5).setScale(0.2).setDepth(1000);
  }

  addHeroCount(totalHeroes) {
    let { width, height } = this.sys.game.canvas;
    this.heroCount = this.add.bitmapText(width, 18 + this.levelText.height + this.tokenCount.height, 'heroes-font', `0/${totalHeroes}`, 36).setOrigin(1, 0.5).setDepth(1001);
    this.add.image(width - this.heroCount.width - 5, 18 + this.levelText.height + this.tokenCount.height, 'hero-icon').setOrigin(1, 0.5).setDepth(1000);
  }

  updateTokenCount(count) {
    let countString = count.toString();
    while (countString.length < 2) {
      countString = '0' + countString;
    }
    this.tokenCount.text = countString + this.tokenCount.text.slice(-3);
  }

  updateHeroCount(count, totalHeroes) {
    this.heroCount.text = `${count}/${totalHeroes}`;
  }

  updateLevelCount(level) {
    this.levelText.text = `Level ${level}`;
  }

  addHealth() {
    this.hearts = this.add.group();
    this.hearts.createMultiple({
      key: 'heart',
      repeat: 6,
      setXY: { x: 0, y: 50, stepX: 30 },
      setScale: { x: 0.25, y: 0.25 },
      setOrigin: { x: 0, y: 0.5 },
      setActive: false,
      setVisible: false,
    });

    this.resetHealth();
  }

  addScore() {
    this.scoreText = this.add.bitmapText(0, 18, 'heroes-font', 0, 42).setOrigin(0, 0.5).setDepth(1001);
  }

  updateScore(score) {
    this.scoreText.text = this.scoreToString(score);
  }

  scoreToString(score) {
    return Math.round(score);
  }

  resetHealth() {
    // Set all player hearts to active and visible and the rest to inactive and invisible
    const hearts = this.hearts.getChildren();
    for (let i = 0; i < this.player.health; i++) {
      hearts[i].setActive(true).setVisible(true);
    }
    for (let i = this.player.health; i < hearts.length; i++) {
      hearts[i].setActive(false).setVisible(false);
    }
  }

  loseHealth() {
    this.hearts.getChildren()[this.player.health].setActive(false).setVisible(false);
  }

  gainHealth() {
    this.hearts.getChildren()[this.player.health - 1].setActive(true).setVisible(true);
  }

  addController() {
    let { width, height } = this.sys.game.canvas;

    const joystickXOrigin = width / 2;
    const joystickYOrigin = height - 150;
    const joystickRadius = 100;
    const joystickDragRadius = 90;

    // Joystick background
    const joystickColour = 0x999999;
    this.add.circle(joystickXOrigin, joystickYOrigin, 100, 0x000000, 0.5).setOrigin(0.5).setStrokeStyle(4, joystickColour).setDepth(1000);
    const arrowWidth = 20;
    const arrowLength = 15;
    const arrowOffset = 10;
    this.add.triangle(0, 0, joystickXOrigin + joystickRadius - arrowLength - arrowOffset, joystickYOrigin - arrowWidth / 2, joystickXOrigin + joystickRadius - arrowLength - arrowOffset, joystickYOrigin + arrowWidth / 2, joystickXOrigin + joystickRadius - arrowOffset, joystickYOrigin, joystickColour).setOrigin(0).setDepth(1000);
    this.add.triangle(0, 0, joystickXOrigin - joystickRadius + arrowLength + arrowOffset, joystickYOrigin - arrowWidth / 2, joystickXOrigin - joystickRadius + arrowLength + arrowOffset, joystickYOrigin + arrowWidth / 2, joystickXOrigin - joystickRadius + arrowOffset, joystickYOrigin, joystickColour).setOrigin(0).setDepth(1000);
    this.add.triangle(0, 0, joystickXOrigin - arrowWidth / 2, joystickYOrigin + joystickRadius - arrowLength - arrowOffset, joystickXOrigin + arrowWidth / 2, joystickYOrigin + joystickRadius - arrowLength - arrowOffset, joystickXOrigin, joystickYOrigin + joystickRadius - arrowOffset, joystickColour).setOrigin(0).setDepth(1000);
    this.add.triangle(0, 0, joystickXOrigin - arrowWidth / 2, joystickYOrigin - joystickRadius + arrowLength + arrowOffset, joystickXOrigin + arrowWidth / 2, joystickYOrigin - joystickRadius + arrowLength + arrowOffset, joystickXOrigin, joystickYOrigin - joystickRadius + arrowOffset, joystickColour).setOrigin(0).setDepth(1000);

    // Joystick
    this.joystick = this.add.circle(joystickXOrigin, joystickYOrigin, 50, joystickColour).setOrigin(0.5).setDepth(1000).setInteractive();
    this.input.setDraggable(this.joystick);
    this.input.on('dragstart', function (pointer, obj) {
      this.isMoving = true;
    }, this);
    this.input.on('drag', function (pointer, obj, dragX, dragY) {
      const angle = Phaser.Math.Angle.Between(joystickXOrigin, joystickYOrigin, dragX, dragY);
      const distance = Phaser.Math.Distance.Between(joystickXOrigin, joystickYOrigin, dragX, dragY);

      if (distance > joystickDragRadius) {
        dragX = joystickXOrigin + Math.cos(angle) * joystickDragRadius;
        dragY = joystickYOrigin + Math.sin(angle) * joystickDragRadius;
      }

      obj.x = dragX;
      obj.y = dragY;

      // Make movement snap to one of 8 directions instead of varying continuously
      this.direction = Math.PI / 4 * Math.round(angle / (Math.PI / 4));
    }, this);
    this.input.on('dragend', function (pointer, obj) {
      this.isMoving = false;
      obj.x = joystickXOrigin;
      obj.y = joystickYOrigin;
    }, this);
  }

  update() {
    this.player.isMoving = this.isMoving;
    if (this.isMoving) {
      this.player.xSpeed = 250 * Math.cos(this.direction);
      this.player.ySpeed = 250 * Math.sin(this.direction);
      if (this.direction >= -Math.PI / 4 && this.direction < Math.PI / 4) {
        this.player.direction = 'right';
      } else if (this.direction >= Math.PI / 4 && this.direction < 3 * Math.PI / 4) {
        this.player.direction = 'down';
      } else if (this.direction >= -3 * Math.PI / 4 && this.direction < -Math.PI / 4) {
        this.player.direction = 'up';
      } else {
        this.player.direction = 'left';
      }
    }
  }
}

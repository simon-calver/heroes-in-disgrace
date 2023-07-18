export default class PlayerScene extends Phaser.Scene {

  constructor() {
    super('PlayerScene');
  }

  preload() {
    this.load.image('menu-top', 'assets/images/backgrounds/menu-top.png');
    this.load.image('menu-middle', 'assets/images/backgrounds/menu-middle.png');
    this.load.image('score-background', 'assets/images/backgrounds/score-background.png');

    this.load.bitmapFont('mont', `assets/fonts/mont-heavy/mont-heavy.png`, `assets/fonts/mont-heavy/mont-heavy.xml`);
    this.load.bitmapFont('mont-light', `assets/fonts/mont-light/mont-light.png`, `assets/fonts/mont-light/mont-light.xml`);
    this.load.bitmapFont('heroes-font', 'assets/fonts/blok/blok.png', 'assets/fonts/blok/blok.xml');

    this.load.multiatlas('icons', 'assets/images/icons/icons.json', 'assets/images/icons');

    this.load.plugin('rexkawaseblurpipelineplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexkawaseblurpipelineplugin.min.js', true);

    this.load.atlas('particles', 'assets/particles/particles.png', 'assets/particles/particles.json');

    this.load.html('nameform', 'assets/text/nameform.html');
  }

  create(params) {
    // I don't want the canvas to fill the screen on desktop, so set default size. This should only affect the 
    // aspect ratio since it is using scale.FIT
    if (this.sys.game.device.os.desktop) {
      this.scale.setGameSize(380, 720);
    }

    let { width, height } = this.sys.game.canvas;
    this.centre = new Phaser.Math.Vector2(width / 2, height / 2 - 50);

    this.sceneLoaded = false;
    this.songComplete = false;
    this.gamePaused = true;

    // Stop sound pausing when loose focus, will this work for all OS?
    this.sound.pauseOnBlur = false;
    this.sound.unlock();//???????????????????????????????? To fix IoS error?

    document.getElementById('instructions').addEventListener('click', () =>
      this.launchMenuScene('MenuScene', 'how_to_play')
    );
    document.getElementById('stats').addEventListener('click', () =>
      this.launchMenuScene('MenuScene', 'stats')
    );
    document.getElementById('leaderboard').addEventListener('click', () =>
      this.launchMenuScene('MenuScene', 'high_scores')
    );

    this.addMenuBars();
    this.pauseGame();

    // Show rotating loading wheel
    let loadingIcon = this.add.image(this.centre.x, this.centre.y, 'icons', 'loading.png').setDepth(1001);
    let loadingText = this.add.bitmapText(this.centre.x, this.centre.y + 100, 'mont', 'Loading...', 30).setOrigin(0.5, 0).setDepth(1001);

    this.loadingIconTween = this.tweens.add({
      targets: loadingIcon,
      rotation: Phaser.Math.PI2,
      duration: 900,
      repeat: -1,
      repeatDelay: 0,
    });
    this.loadingTextTween = this.tweens.add({
      targets: loadingText,
      alpha: 0.5,
      duration: 900,
      repeat: -1,
      repeatDelay: 0,
      yoyo: true
    });

    // Launch the main game scene, use stats to decide if to display help
    getStats().then(stats => {
      if (stats[['average']] > 0) {
        this.scene.launch(params['scene'], { pauseAtStart: true, firstGame: false });
      } else {
        this.scene.launch(params['scene'], { pauseAtStart: true, firstGame: true });
      }
    });

    this.scene.get(params['scene']).events.on('create', function () {
      if (!this.sceneLoaded) {
        this.gameScene = this.scene.get(params['scene']);
        this.gameScene.pauseGame();
        this.gameScene.scene.pause();
        loadingIcon.destroy();
        loadingText.destroy();
        this.loadingComplete();
      }
    }, this);

    this.blurPlugin = this.plugins.get('rexkawaseblurpipelineplugin');
  }

  addMenuBars() {
    let { width, height } = this.sys.game.canvas;

    this.add.rectangle(0, height - 40, width, 40, 0x000000).setOrigin(0, 0);
    let restartIcon = this.add.image(0, height - 20, 'icons', 'return.png').setOrigin(0, 0.5).setScale(0.5).setInteractive({ cursor: 'pointer' });
    this.playIcon = this.add.image(40, height - 20, 'icons', 'right.png').setOrigin(0, 0.5).setScale(0.5).setInteractive({ cursor: 'pointer' });

    let muteIcon = this.add.sprite(width, height - 40, 'icons', 'audioOn.png').setOrigin(1, 1).setScale(0.5).setInteractive({ cursor: 'pointer' }).setDepth(10);
    this.add.circle(width, height - 40, muteIcon.displayWidth / 2, 0x000000).setOrigin(1, 0).setAlpha(0.75).setDepth(0);

    restartIcon.on('pointerdown', this.restartGame, this); //
    this.playIcon.on('pointerdown', this.playGame, this)
    this.input.keyboard.on('keydown-SPACE', this.playGame, this)

    muteIcon.on('pointerdown', () => {
      if (this.sceneLoaded) {
        if (!this.gamePaused) {
          if (this.gameScene.song.volume > 0) {
            this.gameScene.song.setVolume(0);
            muteIcon.setTexture('icons', 'audioOff.png');
            this.gameScene.baseScore = -20;
            this.gameScene.updateScoreText();
          } else {
            this.gameScene.song.setVolume(1);
            muteIcon.setTexture('icons', 'audioOn.png');
            this.gameScene.baseScore = 0;
            this.gameScene.updateScoreText();
          }
        }
      }
    }, this);

    this.addTime();
  }

  addTime() {
    let { width, height } = this.sys.game.canvas;
    this.playTimeText = this.add.bitmapText(width - 85, height - 20, 'mont', this.timeToText(0), 28).setOrigin(0, 0.5);

    let startX = this.playIcon.x + this.playIcon.displayWidth;
    let endX = this.playTimeText.x - 10;
    this.timerWidth = endX - startX;
    this.add.rectangle(startX, height - 20, this.timerWidth, 2, 0x676767).setOrigin(0, 0.5);

    // Add extra invisible rect for interactions, could use existing graphics but they are too small?
    let playBar = this.add.rectangle(startX, height - 20, this.timerWidth, 15).setAlpha(0.1).setOrigin(0, 0.5).setInteractive({ cursor: 'pointer' });
    playBar.on('pointerdown', function (pointer) {
      if (this.sceneLoaded & !this.gamePaused) {
        const playBarPercent = (startX - pointer.x) / (startX - endX);
        this.setSongTime(playBarPercent);
      }
    }, this);

    this.add.rectangle(startX, height - 20, 2, 15, 0xffffff).setOrigin(0, 0.5);
    this.add.rectangle(endX, height - 20, 2, 15, 0xffffff).setOrigin(0, 0.5);

    this.timerBar = this.add.rectangle(startX, height - 20, 0, 10, 0xffffff).setOrigin(0, 0.5);
  }

  setSongTime(percent) {
    this.gameScene.setSongPercent(percent);
  }

  timeToText(time) {
    const minutes = Phaser.Utils.String.Pad(Math.floor(time / 60), 2, '0', 1); // The last argument is the side the padding is added,: 1 for left, 2 for right
    const seconds = Phaser.Utils.String.Pad(Math.floor(time % 60), 2, '0', 1);
    return `${minutes}:${seconds}`;
  }

  addScoreText() {
    let { width, height } = this.sys.game.canvas;
    this.add.image(width / 2, 0, 'score-background').setOrigin(0.5, 0).setDepth(1000);
    this.scoreText = this.add.bitmapText(width / 2, 18, 'mont', 0, 36).setOrigin(0.5).setDepth(1001);
  }

  updateScoreText(score) {
    // this.scoreText.text = this.scoreToString(score);
  }

  scoreToString(score) {
    return Math.round(score);
  }

  updateGameScore(oldScore, newScore, textColour) {
    // let playerScene = this.scene.get('PlayerScene');
    let { width, height } = this.sys.game.canvas;

    let emitter = this.particleEmitter(
      'particles',
      {
        frame: ['red', 'blue', 'white', 'yellow'],
        x: width / 2,
        y: 20,
        scale: { start: 0.4, end: 0.1 },
        speed: 200,
        lifespan: 1000,
        blendMode: 'ADD'
      }
    );

    // Increase the score by incrementing one point at a time in the display
    this.tweens.addCounter({
      from: oldScore,
      to: newScore,
      duration: 1000,
      onStart: function () {
        this.scoreText.setTint(textColour);
      }.bind(this),
      onUpdate: function (tween) {
        this.updateScoreText(tween.getValue());
      }.bind(this),
      onComplete: function () {
        this.scoreText.setTint(0xffffff);
        emitter.explode(10, width / 2, 18);
      }.bind(this)
    });
  }

  launchMenuScene(sceneName, menuType) {
    // Make other HTML elements invisible
    if (this.nameform) this.nameform.setVisible(false);

    // If menu scene is already running use pasuse status from that
    let wasPaused;
    if (this.scene.isActive('MenuScene')) {
      wasPaused = this.scene.get('MenuScene').wasPaused;
    } else {
      wasPaused = this.gamePaused;
    }
    this.scene.launch(sceneName, { playerScene: this, menuType: menuType, wasPaused: wasPaused });

    if (!this.gamePaused) this.pauseGame();
    // this.blurScreen();
  }

  dropDownMenu() {
    var x = document.getElementById('menu-items');
    if (x.style.display === 'block') {
      // Only pause the game if it wasn't already paused
      if (!this.gamePaused) {
        this.scene.pause();
        this.pauseGame();
      }
    } else {
      this.scene.resume();
      this.resumeGame()
    }
  }

  blurScreen() {
    this.blurPlugin.add(this.cameras.main, {
      blur: 4,
      quality: 3,
      pixelWidth: 1,
      pixelHeight: 1,
    });
  }

  unBlurScreen() {
    this.blurPlugin.remove(this.cameras.main);
  }

  loadingComplete() {
    this.sceneLoaded = true;
    this.loadingIconTween.remove();
    this.loadingTextTween.remove();

    this.playButton = this.add.image(this.centre.x, this.centre.y, 'icons', 'right.png').setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(1001);
    this.playButton.on('pointerdown', () => {
      this.resumeGame();
    }, this);
  }

  playGame() {
    // Stop the menu scene if it is running
    if (this.scene.isActive('MenuScene')) {
      this.scene.stop('MenuScene');
    }
    if (!this.songComplete) {
      if (this.gamePaused) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    } else {
      this.restartGame();
    }
  }

  pauseGame() {
    this.gamePaused = true;
    this.playIcon.setTexture('icons', 'right.png');

    let { width, height } = this.sys.game.canvas;

    // Set this to be interactive to block interacting with stuff underneath
    this.pauseScreen = this.add.rectangle(0, 0, width, height - 40, 0x000000).setOrigin(0, 0).setDepth(1000).setInteractive();
    this.pauseScreen.alpha = 0.6;

    this.pauseScreenDetail = this.add.circle(this.centre.x, this.centre.y, 80, 0x000000).setOrigin(0.5).setDepth(1001);
    this.pauseScreenDetail.setStrokeStyle(4, 0xffffff);

    this.pauseText = this.add.bitmapText(this.centre.x, this.centre.y - 190, 'mont', 'Killer Kowalski\nHeroes in Disgrace', 30).setOrigin(0.5, 0).setCenterAlign().setDepth(1001);

    this.addSocialButtons(this);

    if (this.sceneLoaded) {
      this.gameScene.pauseGame();
      this.gameScene.scene.pause();

      if (this.songComplete) {
        // Update cookie and db with score
        this.saveScore(this.gameScene.getTotalScore()).then(response => this.gameOverText(response['id']));

        this.playButton = this.add.image(this.centre.x, this.centre.y, 'icons', 'return.png').setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(1001);
        this.playButton.on('pointerdown', () => {
          this.restartGame();
        }, this);
      } else {
        this.playButton = this.add.image(this.centre.x, this.centre.y, 'icons', 'right.png').setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(1001);
        this.playButton.on('pointerdown', this.resumeGame, this);
      }
    }
  }

  resumeGame() {
    if (this.sceneLoaded) {
      this.playIcon.setTexture('icons', 'pause.png');

      this.gamePaused = false;
      this.gameScene.scene.resume();
      this.gameScene.resumeGame();

      this.pauseScreen.destroy();
      this.pauseScreenDetail.destroy();
      this.playButton.destroy();
      this.pauseText.destroy();
      if (this.songComplete) {
        this.victoryText.destroy();
        if (this.nameform) {
          this.nameform.destroy()
        }
      }

      this.instagramButton.destroy();
      this.twitterButton.destroy();
      this.spotifyButton.destroy();
    }
  }

  restartGame() {
    // Make sure keyboard input is enabled, is this neccessary?
    this.input.keyboard.manager.enabled = true;

    // Close the menu if it is being displayed
    if (this.scene.isActive('MenuScene')) {
      this.scene.stop('MenuScene');
    }
    this.scene.stop('UIScene');
    if (this.sceneLoaded) {
      if (this.gamePaused) this.resumeGame();
      this.gameScene.song.stop();
      this.songComplete = false;
      const muteSong = !(this.gameScene.song.volume > 0);
      this.gameScene.scene.restart({ pauseAtStart: false, muteSong: muteSong });
      this.updateScoreText(0);
    }
  }

  async endGame() {
    this.songComplete = true;
    this.pauseGame();
  }

  async gameOverText(scoreId) {
    const totalScore = this.gameScene.getTotalScore();
    const highScores = await getHighScores();
    const targetScore = highScores[highScores.length - 1]['score'];
    // if (highScores.length === 0) {
    //   targetScore = 0;
    // } else {
    //   targetScore = highScores[highScores.length - 1]['score'];
    // }

    let text;
    if (totalScore > targetScore | highScores.length < 20) {
      // text = `You scored ${totalScore} points. That's a new\nhigh score! What do we call you?`;
      text = `You scored ${totalScore} points.\nThat's a new high score!\nWhat do we call you?`;

      this.victoryText = this.add.bitmapText(this.centre.x, this.centre.y + 100, 'heroes-font', text, 42).setOrigin(0.5, 0).setCenterAlign().setDepth(1001).setDropShadow(1, 1, 0x000000);
      this.submitName(this.victoryText.height, scoreId, totalScore);
    } else {
      text = this.getVictoryText(totalScore);
      this.victoryText = this.add.bitmapText(this.centre.x, this.centre.y + 100, 'heroes-font', text, 42).setOrigin(0.5, 0).setCenterAlign().setDepth(1001).setDropShadow(1, 1, 0x000000);
    }
  }

  submitName(textHeight, scoreId, totalScore) {
    let { width, height } = this.sys.game.canvas;

    this.nameform = this.add.dom(width / 2, this.centre.y + 115 + textHeight).createFromCache('nameform').setOrigin(0.5, 0);
    this.nameform.addListener('click');
    this.nameform.on('click', function (event) {
      this.input.keyboard.manager.enabled = false; // Don't propagate keyboard input while the form is open
      if (event.target.name === 'submitButton') {
        var inputText = this.nameform.getChildByName('nameField');

        // Have they entered anything?
        if (inputText.value !== '') {
          // Check for swear words before submitting the score
          console.log(inputText.value)
          this.profanityTest(inputText.value).then(function (response) {
            if (response.containsprofanity) {
              // Add a class that defines an animation
              inputText.classList.add('error');

              // Do an alert if this is profane! 
              let warningBackground = this.add.rectangle(width / 2, this.centre.y + textHeight + 80, width, 50, 0x000000).setOrigin(0.5).setDepth(2000);
              let warningText = this.add.bitmapText(width / 2, this.centre.y + textHeight + 80, 'mont', 'That\'s inappropriate!', 30).setOrigin(0.5).setDepth(2000).setTint(0x8d0e0e);
              let tween = this.tweens.addCounter({
                from: 1,
                to: 0,
                delay: 1000,
                duration: 2500,
                onUpdate: function (tween) {
                  const value = tween.getValue();
                  // Remove this sooner if the game is unpaused
                  if (!this.gamePaused) {
                    tween.remove();
                    warningBackground.destroy();
                    warningText.destroy();
                  }
                  warningBackground.setAlpha(value);
                  warningText.setAlpha(value);
                }.bind(this),
                onComplete: function () {
                  warningBackground.destroy();
                  warningText.destroy();
                }
              });
              // remove the class after the animation completes
              setTimeout(function () {
                inputText.classList.remove('error');
              }, 300);
            } else {
              updateScore(inputText.value, scoreId);
              this.input.keyboard.manager.enabled = true; // Re-enable keyboard input
              this.nameform.destroy();
              this.victoryText.text = `You scored ${totalScore} points.\nThat's a new high score!`;
            }
          }.bind(this)).catch(function (err) {
            console.log('Error: \n', err)
          });
        }
      }
    }.bind(this))
  }

  profanityTest(text) {
    return get('/profanity-test', { text: text });
  }

  getVictoryText(score, target) {
    if (score > 250) {
      return `You scored ${score} points.\nWow!!!!`;
    } else if (score > 200) {
      return `You scored ${score} points.\nThat's awe inspiring!`;
    } else if (score > 150) {
      return `You scored ${score} points.\nThat's amazing!`;
    } else if (score > 100) {
      return `You scored ${score} points.\nGood job`;
    } else if (score > 50) {
      return `You scored ${score} points.\nNice`;
    } else if (score > 20) {
      return `You scored ${score} points.\nHave another go?`;
    } else if (score > 0) {
      return `You scored ${score} points.\nIt's a start`;
    } else if (score == 0) {
      return `You scored ${score} points.\nAre you still there?`
    } else if (score < 0) {
      return `You scored ${score} points.\nAt least you made\nit to the end!`
    }
  }

  addSocialButtons(scene, bottomHeight = 50) {
    let { width, height } = this.sys.game.canvas;

    let iconWidth = 60;
    scene.instagramButton = scene.add.image(width - 10, height - bottomHeight, 'icons', 'instagram.png').setScale(0.75).setOrigin(1, 1).setInteractive({ cursor: 'pointer' }).setDepth(1001);
    scene.twitterButton = scene.add.image(width - iconWidth - 10, height - bottomHeight, 'icons', 'twitter.png').setScale(0.75).setOrigin(1, 1).setInteractive({ cursor: 'pointer' }).setDepth(1001);
    scene.spotifyButton = scene.add.image(width - 2 * iconWidth - 10, height - bottomHeight, 'icons', 'spotify.png').setScale(0.75).setOrigin(1, 1).setInteractive({ cursor: 'pointer' }).setDepth(1001);

    scene.instagramButton.on('pointerdown', () => {
      this.openExternalLink('https://www.instagram.com/killer_kowalski__/');
    }, this);
    scene.twitterButton.on('pointerdown', () => {
      this.openExternalLink('https://twitter.com/killr_kowalski');
    }, this);
    scene.spotifyButton.on('pointerdown', () => {
      this.openExternalLink('https://open.spotify.com/artist/2PTSdpJctTWVACJdocakWe');
    }, this);
  }

  openExternalLink(url) {
    let s = window.open(url, '_blank');

    if (s && s.focus) {
      s.focus();
    } else if (!s) {
      window.location.href = url;
    }
  }

  async saveScore(score) {
    getStats().then(response => {
      let currentPlayed = parseInt(response['played']);
      let newAvg = (currentPlayed * parseFloat(response['average']) + score) / (currentPlayed + 1);
      let newHigh = Math.max(parseInt(response['high']), score);

      setScoreCookie({
        user: response['user'],
        played: currentPlayed + 1,
        average: newAvg,
        high: newHigh
      });
    });

    return getUser()
      .then(response => postScore(response, score))//.then(response => console.log(response.id)))
      .catch(error => console.log('Error:', error));
  }

  particleEmitter(particleSprite, config) {
    var particles = this.add.particles(particleSprite);
    particles.setDepth(2000);

    return particles.createEmitter(config);
  }

  updatePlayTime(time, percent) {
    this.playTimeText.text = this.timeToText(time);
    this.timerBar.width = percent * this.timerWidth;
  }

  update() {

  }
}

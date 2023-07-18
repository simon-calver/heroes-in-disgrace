import displayScore from './display-score.js'
import eventsCentre from './events-centre.js'
import Hero from './hero.js';
import MapBuilder from './map-builder.js';
import Player from './player.js';
import ScoreToken from './score-token.js';

const MAP_WIDTH = 8;
const MAP_HEIGHT = 8;
const TILE_SIZE = 64;

export default class HeroesScene extends Phaser.Scene {

  constructor() {
    super('HeroesScene');
  }

  preload() {
    this.load.spritesheet('player-walk', 'assets/sprites/player-walk.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player-idle', 'assets/sprites/player-idle.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player-death', 'assets/sprites/player-death.png', { frameWidth: 64, frameHeight: 64 });

    for (let i = 0; i < 6; i++) {
      this.load.spritesheet('hero-' + i + '-walk', 'assets/sprites/hero-' + i + '-walk.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('hero-' + i + '-idle', 'assets/sprites/hero-' + i + '-idle.png', { frameWidth: 64, frameHeight: 64 });
    }

    this.load.image('player', 'assets/sprites/black-hole.png');
    this.load.image('hero-icon', 'assets/sprites/hero-icon.png');
    this.load.image('star', 'assets/sprites/star.png');
    this.load.image('heart', 'assets/sprites/heart.png');
    // this.load.image('bonus-1', 'assets/sprites/bonus-1.png');

    // this.load.json('story-text', 'assets/json/story-text.json');

    this.load.image('tiles', 'assets/tilemaps/tileset.png');

    this.load.audio('heroes', 'assets/audio/heroes.mp3', { stream: true });
  }

  create(params = { 'pauseAtStart': true, 'muteSong': false, 'firstGame': false }) {
    // for testing!!
    this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.resetKey.on('down', function (event) {
      this.nextLevel();
    }, this);


    this.setupSong(params['muteSong']);
    const rooms = this.buildMap();

    // Variables for scores
    this.baseScore = 0;
    this.scores = [[0, 0]];
    this.level = 0;

    // Need to set bounds for physics world to match map size otherwise raycast will get wrong bounds
    this.physics.world.setBounds(0, 0, (2 * MAP_WIDTH + 1) * TILE_SIZE, (2 * MAP_HEIGHT + 1) * TILE_SIZE);

    this.setUpPathFinding();
    this.createAnimations();

    this.player = new Player(this, (2 * Math.floor(MAP_WIDTH / 2) + 0.5) * TILE_SIZE, (2 * Math.floor(MAP_HEIGHT / 2) + 0.5) * TILE_SIZE, 'walk')
    this.playerScene = this.scene.get('PlayerScene');

    this.tokens = this.physics.add.group({ classType: ScoreToken, runChildUpdate: true, maxSize: 200 });
    this.heroes = this.physics.add.group({ classType: Hero, runChildUpdate: true, maxSize: 8 });

    this.addTokens(MAP_WIDTH, MAP_HEIGHT, TILE_SIZE);
    this.addHeroes(rooms, TILE_SIZE);

    this.setupEvents();

    this.physics.add.overlap(this.player, this.tokens, this.collectToken, null, this);
    this.physics.add.overlap(this.player, this.heroes, this.meetHero, null, this);
    this.physics.add.collider(this.player, this.map.getLayer('mainLayer').tilemapLayer);

    const camera = this.cameras.main;
    camera.startFollow(this.player);
    camera.setZoom(0.8);

    this.raycaster = this.raycasterPlugin.createRaycaster({
      debug: {
        enabled: false, //enable debug mode
        maps: true, //enable maps debug
        rays: true, //enable rays debug
        graphics: {
          ray: 0x00ff00, //debug ray color; set false to disable
          rayPoint: 0xff00ff, //debug ray point color; set false to disable
          mapPoint: 0x00ffff, //debug map point color; set false to disable
          mapSegment: 0x0000ff, //debug map segment color; set false to disable
          mapBoundingBox: 0xff0000 //debug map bounding box color; set false to disable
        }
      }
    });
    this.ray = this.raycaster.createRay({
      origin: {
        x: 400,
        y: 300
      }
    });

    this.mapGameObjects();

    this.intersections = this.ray.castCircle();

    this.createFOV();
    this.fow.setDepth(1);

    // Visualise rays
    this.graphics = this.add.graphics({ lineStyle: { width: 1, color: 0x00ff00 }, fillStyle: { color: 0xffffff, alpha: 0.3 } });
    this.graphics.setDepth(4);

    this.draw();

    this.tokensCollected = 0;
    this.totalTokens = this.countTokens();
    this.heroesMet = 0;
    this.totalHeroes = this.countHeroes();

    this.scene.launch('UIScene', {
      player: this.player, totalTokens: this.totalTokens, totalHeroes: this.totalHeroes
    });

    this.chorus = false;
  }

  setupEvents() {
    eventsCentre.on('big-star-collected', this.revertHeroes, this); // needs to interupt run
    eventsCentre.on('bonus-1-collected', this.bonus1Collected, this);
    eventsCentre.on('player-death', this.playerDeath, this);
    eventsCentre.on('health-collected', this.healPlayer, this);
  }

  bonus1Collected() {
    this.tokens.children.iterate(function (child) {
      if (child.tokenType == 'small-star')
        child.body.setSize(1000, 1000, true);
    });
    this.time.delayedCall(8000, function () {
      this.tokens.children.iterate(function (child) {
        if (child.tokenType == 'small-star')
          child.body.setSize(128, 128, true);
      });
    }, [], this);

  }

  mapGameObjects() {
    this.raycaster.mapGameObjects(this.map.getLayer('mainLayer').tilemapLayer, false, {
      collisionTiles: [3, 4, 5, 6, 7, 8] // array of tile types which collide with rays
    });
  }

  createAnimations() {
    const direction = ['down', 'up', 'right', 'left'];

    // Player animations
    for (var i = 0; i < direction.length; i++) {
      this.anims.create({
        key: `player-walk-${direction[i]}`,
        frames: this.anims.generateFrameNumbers('player-walk', { start: 4 * i, end: 4 * i + 3 }),
        frameRate: 6
      });
      this.anims.create({
        key: `player-idle-${direction[i]}`,
        frames: this.anims.generateFrameNumbers('player-idle', { start: 2 * i, end: 2 * i + 1 }),
        frameRate: 2
      });
      this.anims.create({
        key: `player-death-${direction[i]}`,
        frames: [
          { key: 'player-death', frame: 4 * i },
          { key: 'player-death', frame: 4 * i + 1 },
          { key: 'player-death', frame: 4 * i + 2 },
          { key: 'player-death', frame: 4 * i + 3, duration: 500 },
        ],
        frameRate: 6,
        repeat: 0
      });
    }

    // Hero animations
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < direction.length; j++) {
        this.anims.create({
          key: `hero-${i}-walk-${direction[j]}`,
          frames: this.anims.generateFrameNumbers(`hero-${i}-walk`, { start: 4 * j, end: 4 * j + 3 }),
          frameRate: 6
        });
        this.anims.create({
          key: `hero-${i}-idle-${direction[j]}`,
          frames: this.anims.generateFrameNumbers(`hero-${i}-idle`, { start: 2 * j, end: 2 * j + 1 }),
          frameRate: 2
        });
      }
    }
  }

  createFOV() {
    // Put some of this in a different scene so it only fills the camera view
    this.maskGraphics = this.add.graphics({ fillStyle: { color: 0xffffff, alpha: 0 } });
    this.mask = new Phaser.Display.Masks.GeometryMask(this, this.maskGraphics);
    this.mask.setInvertAlpha();
    this.fow = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.75 } }).setDepth(29);
    this.fow.setMask(this.mask);
    this.fow.fillRect(0, 0, 400, 800);
  }

  draw() {
    this.maskGraphics.clear(); // clear field of view mask

    this.maskGraphics.fillPoints(this.intersections); // draw fov mask

    this.fow.clear();
    this.fow = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.75 } }).setDepth(29);
    this.fow.setMask(this.mask);

    let { width, height } = this.sys.game.canvas;

    // Make slightly bigger than canvas size ~ 1.05*width x 1.05*height, also need to take account of camera zoom
    this.fow.fillRect(this.player.x - 0.65 * width, this.player.y - 0.65 * height, 1.3 * width, 1.3 * height);
  }

  update() {
    this.playerScene.updatePlayTime(this.song.seek, this.getSongPercent());

    this.intersections = this.ray.castCircle();
    this.draw();

    this.ray.setOrigin(this.player.x, this.player.y);

    if (!this.chorus && this.song.seek >= 77 && this.song.seek < 101) {
      this.startChorus();
    } else if (this.chorus && this.song.seek >= 101 && this.song.seek < 159) {
      this.endChorus();
    } else if (!this.chorus && this.song.seek >= 159 && this.song.seek < 181) {
      this.startChorus();
    } else if (this.chorus && this.song.seek >= 181) {
      this.endChorus();
    }

    // chorus 1 1:14-1:17 buildup, finish at 1:41
    // chorus 2 2:36-2:39 buildup, finish at 3:00
    // bridge 3:22-4:32

    this.player.update();
  }

  startChorus() {
    this.cameras.main.shake(1000, 0.01);
    this.cameras.main.zoomTo(1.4, 1000);
    this.disgraceHeroes();
    this.chorus = true;
  }

  endChorus() {
    this.revertHeroes();
    this.cameras.main.zoomTo(0.8, 1000);
    this.chorus = false;
  }

  getSongPercent() {
    return this.song.seek / this.song.totalDuration;
  }

  setupSong(muteSong) {
    // How make song not play a little if pause at start?
    this.song = this.sound.add('heroes');
    this.song.on('complete', function () {
      this.playerScene.endGame();
    }, this);

    this.song.play();
    if (muteSong) {
      this.song.setVolume(0);
    }
  }

  setSongPercent(percent) {
    // Update scores to previous values, do nothing if time shifted forwards 
    const songTime = this.percentToSeconds(percent);
    if (songTime < this.song.seek) {
      this.revertScores(songTime);
    }

    this.song.seek = songTime;


    if (!(songTime >= 77 && songTime < 101) && !(songTime >= 159 && songTime < 181)) {
      this.endChorus();
    }
  }

  percentToSeconds(percent) {
    return percent * this.song.totalDuration
  }

  revertScores(songTime) {
    const index = this.scores.findIndex(n => n[0] > songTime);
    // An index of -1 means there are no values after this time so don't modify the array
    if (index >= 0) {
      // Ignore last elements after songTime by setting length of array, should be fastest?
      this.scores.length = index;
      this.updateScoreText();
      // Make sure the arrays are not being updated when you do this??
    }
  }

  buildMap() {
    const mapBuilder = new MapBuilder(this);

    this.map = mapBuilder.buildMap(MAP_WIDTH, MAP_HEIGHT);

    return mapBuilder.rooms;
  }

  rebuildMap() {
    console.log('the level is', this.level);
    const mapBuilder = new MapBuilder(this);
    const openness = Math.max((3 - this.level) / 3, 0);
    const minRoomSize = 2;
    const maxRoomSize = Math.max(4 - this.level, 2);

    var roomPlacement = 'corners'
    if (this.level > 1) {
      roomPlacement = 'all'
    }

    this.map = mapBuilder.rebuildMap(MAP_WIDTH, MAP_HEIGHT, this.map, openness, minRoomSize, maxRoomSize, roomPlacement);

    return mapBuilder.rooms;
  }

  setUpPathFinding() {
    this.finder = new EasyStar.js();

    // Easystar needs an array, so the data has to be extracted from the map
    var grid = [];
    for (var y = 0; y < this.map.height; y++) {
      var col = [];
      for (var x = 0; x < this.map.width; x++) {
        var tile = this.map.getTileAt(x, y)
        col.push(tile.index);
      }
      grid.push(col);
    }

    // Make central tile unwalkable?
    // grid[MAP_WIDTH / 2][MAP_HEIGHT / 2] = 1; // This doesn't seem to do it! 

    this.finder.setGrid(grid);
    this.finder.setAcceptableTiles([3, 4, 5, 6, 7, 8]);
    this.finder.disableCornerCutting();
  }

  addTokens(width, height, tileSize) {
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        let x = (2 * i + 1.5) * tileSize;
        let y = (2 * j + 1.5) * tileSize;
        this.tokens.get(x, y, 'small-star');
      }
    }

    this.setBonusTokens();
  }

  countTokens() {
    let count = 0;
    this.tokens.children.iterate(function (child) {
      if (child.tokenType == 'small-star') {
        count++;
      }
    });
    return count;
  }

  setBonusTokens() {
    // Generate array of random positions with no repetition
    let positions = Array.from(Array(this.tokens.children.entries.length).keys());
    Phaser.Utils.Array.Shuffle(positions);

    // Replace one at random with bonus
    // this.tokens.children.entries[positions[0]].setType('bonus-1');

    // Add big stars randomly
    const numBigStars = Math.floor(MAP_HEIGHT * MAP_WIDTH / 16);
    for (let i = 0; i < numBigStars; i++) {
      this.tokens.children.entries[positions[i + 1]].setType('big-star');
    }

    // Add health randomly
    for (let i = 0; i < 2; i++) {
      this.tokens.children.entries[positions[i + numBigStars + 1]].setType('health');
    }
  }

  resetTokens() {
    this.tokens.children.iterate(function (child) {
      child.enableBody(true, child.x, child.y, true, true);
      child.setType('small-star');
    });
    this.setBonusTokens();
    this.tokensCollected = 0;
    this.updateTokenCount();
  }

  collectToken(player, token) {
    this.scores.push([this.song.seek, this.getScore() + token.collect()]);
    this.updateScoreText();

    if (token.tokenType == 'small-star') {
      this.tokensCollected++;
      this.updateTokenCount();
      this.checkForLevelCompletion();
    }
  }

  checkForLevelCompletion() {
    if (this.tokensCollected >= this.totalTokens && this.heroesMet >= this.totalHeroes) {
      this.nextLevel();
    }
  }

  nextLevel() {
    // Fade in the scene
    this.player.isDying = true; // Use this to stop player moving while fading
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
      this.resetLevel();
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.player.isDying = false;
    });

    // this.level++;
    this.updateLevelCount();
  }

  resetLevel() {
    // Reset map
    const rooms = this.rebuildMap();
    this.setUpPathFinding();
    this.raycaster.removeMappedObjects(this.map.getLayer('mainLayer').tilemapLayer);
    this.mapGameObjects();

    // Reset heroes
    this.resetHeroes(rooms);

    // Reset tokens
    this.resetTokens();

    // Reset player
    this.player.respawn(this.player.health);
  }

  resetHeroes(rooms) {
    // Reset heroes, is it better to clear the group and rebuild or just reset each one?

    if (this.level < 4) {
      this.heroes.get(1, 1, 0);
    }

    var heroIds = [0, 1, 2, 3, 4, 5];
    heroIds = Phaser.Utils.Array.Shuffle(heroIds);

    this.heroes.children.iterate(function (child, index) {
      child.reset();
      let x = (rooms[index].corner.x + 0.5) * TILE_SIZE;
      let y = (rooms[index].corner.y + 0.5) * TILE_SIZE;
      child.setHome(x, y);
      child.setPosition(x, y);

      child.textureId = heroIds[index % heroIds.length];

    });
    this.heroesMet = 0;
    this.totalHeroes = this.countHeroes();
    this.updateHeroCount();
  }

  meetHero(player, hero) {
    if (!hero.hasMetPlayer) {
      if (hero.inDisgrace) {
        this.hitPlayer();
      } else if (hero.value == 10) {

        this.heroesMet++;
        this.updateHeroCount();
        this.checkForLevelCompletion();
      }

      this.scores.push([this.song.seek, this.getScore() + hero.meetPlayer()]);
      this.updateScoreText();
    }
  }


  hitPlayer() {
    this.player.loseHealth();
  }

  healPlayer() {
    this.player.gainHealth();
  }

  addHeroes(rooms, tileSize) {
    var heroIds = [0, 1, 2, 3, 4, 5];
    heroIds = Phaser.Utils.Array.Shuffle(heroIds);
    var index = 0;
    for (var i = 0; i < this.level + 3; i++) {
      let room = rooms[i];
      let x = (room.corner.x + 0.5) * tileSize;
      let y = (room.corner.y + 0.5) * tileSize;
      this.heroes.get(x, y, heroIds[index]);
      index = (index + 1) % heroIds.length;
    }
  }

  countHeroes() {
    return this.heroes.countActive(true);
  }

  revertHeroes() {
    for (let hero of this.heroes.children.entries) {
      hero.revertDisgrace();
    }
  }

  disgraceHeroes() {
    for (let hero of this.heroes.children.entries) {
      hero.disgrace();
    }
  }

  playerDeath() {
    console.log("Player died at " + this.song.seek);

    const pointsLost = Math.floor(0.2 * this.getScore()) + 5;
    displayScore(this, this.player.x, this.player.y, -pointsLost, 0);
    console.log("Points lost: " + pointsLost);
    this.scores.push([this.song.seek, this.getScore() - pointsLost]);
    this.updateScoreText();

    // Drops some of the lost tokens back into the scene
    var newTokens = this.physics.add.group({ classType: ScoreToken, runChildUpdate: true, maxSize: 24 });
    this.physics.add.collider(newTokens, this.map.getLayer('mainLayer').tilemapLayer);

    for (let i = 0; i < Math.min(24, Math.floor(pointsLost / 4)); i++) {
      var token = newTokens.get(this.player.x, this.player.y, 'small-star-dropped');
      var angle = Phaser.Math.Between(0, 360);
      token.setVelocity(200 * Math.cos(angle), 200 * Math.sin(angle));
      token.setDrag(200, 200);
    }

    // Stop them from being collectable immediately after they are dropped, coiuld also disable player body
    this.time.delayedCall(2000, function () {
      this.physics.add.overlap(newTokens, this.player, this.collectToken, null, this);
    }, [], this);

    // Remove new tokens after 12 seconds
    this.time.delayedCall(12000, function () {
      newTokens.clear(true, true);
    }, [], this);
  }

  pauseGame() {
    this.song.pause();
  }

  resumeGame() {
    this.song.resume();
  }

  endGame() {
  }

  updateHeroCount() {
    this.scene.get('UIScene').updateHeroCount(this.heroesMet, this.totalHeroes);
  }

  updateTokenCount() {
    this.scene.get('UIScene').updateTokenCount(this.tokensCollected);
  }

  updateLevelCount() {
    this.level++;
    this.scene.get('UIScene').updateLevelCount(this.level);
  }

  updateScoreText() {
    this.scene.get('UIScene').updateScore(this.getTotalScore());
  }

  getScore() {
    return this.scores[this.scores.length - 1][1];
  }

  getTotalScore() {
    return this.getScore() + this.baseScore;
  }
}


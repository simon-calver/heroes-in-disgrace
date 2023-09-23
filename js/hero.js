import displayScore from './display-score.js'

class Hero extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureId) {
    super(scene, x, y, `hero-${textureId}-walk`).setScale(1.25).setOrigin(0.5);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDrag(1000, 1000);
    this.setAngularDrag(100);

    this.body.setSize(24, 28, true);
    this.body.setOffset(22, 28);

    this.home = new Phaser.Math.Vector2(x, y);
    this.path = [];

    const rand = this.randomTarget();
    this.getPath(rand);
    
    this.speed = 160;
    
    this.inDisgrace = false;
    this.returningHome = false;
    this.isWaiting = false;
    
    this.direction = 'left'; 
    this.textureId = textureId;
    this.value = 10;
  }

  moveToTarget(currentTime) {
    this.targetAngle = this.angleToTarget(this.path[0]);

    // move in this direction 
    this.setVelocityX(this.speed * Math.cos(this.targetAngle)); // In pixels per second
    this.setVelocityY(this.speed * Math.sin(this.targetAngle));

    // Remove this path element once we are sufficiently close to it 
    if (Phaser.Math.Distance.BetweenPoints(this.getPosition(), this.path[0]) < 20) {
      this.path.shift();
    }

    // Stop moving if we have reached the end of the path
    if (this.path.length === 0) {
      this.setVelocity(0);
      if (this.returningHome) {
        this.homeReached();
      }
    }

    if (this.targetAngle > -Math.PI / 4 && this.targetAngle < Math.PI / 4) {
      this.direction = 'right'; 
    } else if (this.targetAngle > Math.PI / 4 && this.targetAngle < 3 * Math.PI / 4) {
      this.direction = 'down'; 
    } else if (this.targetAngle > -3 * Math.PI / 4 && this.targetAngle < -Math.PI / 4) {
      this.direction = 'up'; 
    } else {
      this.direction = 'left'; 
    }
  }

  getPosition() {
    return this.getCenter();
  }

  angleToTarget(target) {
    return Phaser.Math.Angle.BetweenPoints(this.getPosition(), target);
  }

  setNewPath() {
    if (this.inDisgrace) {
      this.getPath(this.scene.player.getCenter());
    } else {
      this.getPath(this.randomTarget());
    }
  }

  randomTarget() {
    // Barriers are only on even tiles so avoid these
    const x = 2 * Phaser.Math.Between(0, Math.floor(this.scene.map.width / 2) - 1) + 1;
    const y = 2 * Phaser.Math.Between(0, Math.floor(this.scene.map.height / 2) - 1) + 1;
    return this.tileToWorldPos(new Phaser.Math.Vector2(x, y));
  }

  getPath(target) {
    this.resetPath();

    // Locations in world coordinates need to be converted to the tilemap index
    const currentLocation = this.worldPosToTile(this.x, this.y);
    const targetLocation = this.worldPosToTile(target.x, target.y);

    this.pathId = this.scene.finder.findPath(currentLocation.x, currentLocation.y, targetLocation.x, targetLocation.y, function (path) {
      if (path === null) {
        console.warn(`Path was not found. Target: ${targetLocation.x}, ${targetLocation.y}`);
      } else {
        // The first path element is ignored since this is where you should be, a better transformation
        // to world coordinates might mean you don't need to do this. Similarly the last path element 
        // is taken to be the actual target
        for (var i = 1; i < path.length - 1; i++) {
          this.path.push(this.tileToWorldPos(path[i]));
        }
        this.path.push(target);
      }
    }.bind(this));

    this.scene.finder.calculate();
  }

  resetPath() {
    this.path = [];
  }

  tileToWorldPos(tile) {
    const tileSize = this.scene.map.tileWidth;

    // Use the middle of the tile as the world position
    const world_x = tileSize * (tile.x + 1 / 2);
    const world_y = tileSize * (tile.y + 1 / 2);

    return new Phaser.Math.Vector2(world_x, world_y);
  }

  worldPosToTile(worldX, worldY) {
    const tileSize = this.scene.map.tileWidth;

    // Clamp these values to ensure no points outside the grid are used
    const tile_x = Phaser.Math.Clamp(Math.floor(worldX / tileSize), 0, this.scene.map.width - 1);
    const tile_y = Phaser.Math.Clamp(Math.floor(worldY / tileSize), 0, this.scene.map.height - 1);

    return new Phaser.Math.Vector2(tile_x, tile_y);
  }

  update() {
    if (!this.isWaiting) {
      if (this.hasTarget()) {
        this.anims.play(`hero-${this.textureId}-walk-${this.direction}`, true);
        this.moveToTarget();
      } else {
        this.anims.play(`hero-${this.textureId}-idle-${this.direction}`, true);
        this.setNewPath();
      }
    } else {
      this.anims.play(`hero-${this.textureId}-idle-${this.direction}`, true);
    }
  }

  hasTarget() {
    return this.path.length > 0;
  }

  meetPlayer() {
    this.returningHome = true;

    this.speed = 300;
    this.resetPath();

    // Overlay text
    // this.speechBubble();

    // Pause before moving again
    this.pauseMovement();
    this.getPath(this.home);

    if (this.inDisgrace) {
      return 0;
    } else {
      const currentVal = this.value;
      this.value = Math.ceil(this.value / 2);
      displayScore(this.scene, this.x, this.y, currentVal, 0);
      return currentVal;
    }
  }

  pauseMovement() {
    this.isWaiting = true;
    this.setVelocity(0);
    this.scene.time.delayedCall(1000, this.resumeMovement, [], this);
  }

  resumeMovement() {
    this.isWaiting = false;
  }

  homeReached() {
    this.returningHome = false;
    
    // Always disgrace the hero when they return home
    this.disgrace();
  }

  setHome(x, y) {
    this.home = new Phaser.Math.Vector2(x, y);
  }

  speechBubble() {
    var speech = '';
    if (this.inDisgrace) {
      speech = 'I am in disgrace.';
    } else {
      speech = 'Hello.';
    }

    // var bubble = this.scene.add.image(this.x, this.y - 100, 'speech-bubble').setOrigin(0.5, 0.5).setDepth(20);
    var text = this.scene.add.bitmapText(this.x, this.y - 100, 'heroes-font', speech, 42, 1).setOrigin(0.5, 0.5).setDepth(30).setMaxWidth(300);
    var bubble = this.scene.add.rectangle(this.x, this.y - 100, text.width + 20, text.height, 0x000000, 0.5).setOrigin(0.5, 0.5).setDepth(29);

    this.scene.tweens.add({
      targets: [bubble, text],
      alpha: { from: 1, to: 0 },
      y: '-=50',
      ease: 'Linear',
      delay: 1000,
      duration: 2000,
      repeat: 0,
      onComplete: function () {
        bubble.destroy();
        text.destroy();
      }
    });
  }

  disgrace() {
    this.resetPath();
    this.inDisgrace = true;
    
    // do better than a tint!
    this.setTint(0xff6666);
    this.speed = 230;
  }

  revertDisgrace() {
    this.isWaiting = true;
    this.inDisgrace = false;
    this.returningHome = false;
    this.resetPath();
    this.clearTint();
    this.speed = 160;
    this.isWaiting = false;
  }

  switchState() {
    if (this.inDisgrace) {
      this.revertDisgrace();
    } else {
      this.disgrace();
    }
  }

  reset(revertDisgrace = true) {
    this.value = 10;
    this.resetPath();
    this.returningHome = false;
    this.isWaiting = false;
    if (revertDisgrace) {
      this.revertDisgrace();
    }
  }
}

export default Hero;

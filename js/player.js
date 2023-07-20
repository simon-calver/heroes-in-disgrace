// import displayScore from './display-score.js'
import eventsCentre from './events-centre.js';

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, spriteName) {
    super(scene, x, y, spriteName).setScale(1.25);

    // console.log('spriteName', spriteName);
    // this.spriteName = spriteName;

    this.respawnX = x;
    this.respawnY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDrag(1000, 1000);
    this.setAngularDrag(100);

    // this.body.setSize(12, 16, true); // Set size smaller than sprite so it overlaps things behind it. Can this be done another way?
    // this.body.setOffset(12, 14);

    this.body.setSize(24, 32, true); // Set size smaller than sprite so it overlaps things behind it. Can this be done another way?
    this.body.setOffset(22, 28);

    this.isMoving = false;
    this.direction = 'left';

    this.xSpeed = 0;
    this.ySpeed = 0;

    // this.runUpdate = true;
    this.health = 3;
    this.isDying = false;

    this.setDepth(10);

    // this.score = 0;
  }

  update() {
    if (!this.isDying) {
      if (this.isMoving) {
        this.setVelocityX(this.xSpeed);
        this.setVelocityY(this.ySpeed);
        this.anims.play(`player-walk-${this.direction}`, true);
      } else {
        this.setVelocity(0);
        this.anims.play(`player-idle-${this.direction}`, true);
      }
    }
  }

  die() { //spawnX, spawnY) {
    // console.log("Die")
    // if (!this.isDying) {
    this.isDying = true;
    // let deathAnim =
    this.anims.play(`player-death-${this.direction}`, true);

    // Lose points here, make thia na integer
    // const pointsLost = Math.floor(0.2 * currentScore) + 5; //   Math.floor(0.2 * this.score) + 5;
    eventsCentre.emit('player-death');//, pointsLost);

    // this.score -= pointsLost;

    // disable body
    // this.disableBody(true, true);
    // displayScore(this.scene, this.x, this.y, -pointsLost, 0);
    this.on(`animationcomplete-player-death-${this.direction}`, function () {
      // console.log('animationcomplete');

      this.respawn();
    }, this);

    // deathAnim.on('animationcomplete', function () {
    //   // wait for second

    //   // this.scene.time.delayedCall(1000, () => {
    //   console.log('animationcomplete');

    //   this.x = spawnX;
    //   this.y = spawnY;
    //   this.isDying = false;

    //   // deathAnim.de/
    //   // }, [], this);
    //   // console.log('animationcomplete');
    //   // this.x = spawnX;
    //   // this.y = spawnY;
    //   // {Player.anims.pause(Player.anims.currentAnim.frames[5])//;
    //   // this.isDying = false
    // }, this);
    // }
  }

  loseHealth() {
    if (!this.isDying) {
      this.health -= 1;
      this.scene.scene.get('UIScene').loseHealth();

      this.scene.cameras.main.shake(100, 0.04); // arguments are duration and intensity

      if (this.health <= 0) {
        this.die();//;(2 * Math.floor(MAP_WIDTH / 2) + 0.5) * TILE_SIZE, (2 * Math.floor(MAP_HEIGHT / 2) + 0.5) * TILE_SIZE);
      }
    }

    // else {
    //   this.player.health -= 1;
    //   this.scene.get('UIScene').loseHealth();
    // }

  }

  gainHealth() {
    // console.log('gainHealth');
    // console.log('this.health', this.health);
    if (!this.isDying && this.health < 7) {
      this.health += 1;
      this.scene.scene.get('UIScene').gainHealth();
    }
  }

  // addPoints(points) {
  //   this.score += points;
  //   this.scene.scene.get('UIScene').updateScore(this.score);
  // }

  respawn(health = 3) {//spawnX, spawnY) {
    this.x = this.respawnX;
    this.y = this.respawnY;

    this.health = health;
    this.scene.scene.get('UIScene').resetHealth();

    this.isDying = false;
  }
}

export default Player

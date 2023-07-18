import displayScore from './display-score.js'
import eventsCentre from './events-centre.js'

class ScoreToken extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, tokenType) {
    // var value;
    // var scale;
    // var icon;
    // switch (tokenType) {
    //   case 'small-star':
    //     value = 1//5;
    //     scale = 0.25;
    //     icon = 'star';
    //     break;
    //   case 'big-star':
    //     value = 2//10;
    //     scale = 0.4;
    //     icon = 'star';
    //     break;
    //   case 'bonus-1':
    //     value = 5//25;
    //     scale = 0.5;
    //     icon = 'bonus-1';
    //     break;
    //   default:
    //     value = 1//5;
    //     scale = 0.25;
    //     icon = 'star';
    // }

    // super(scene, x, y, icon).setScale(scale);
    super(scene, x, y);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setType(tokenType);

    // this.setDrag(1000, 1000);
    // this.setAngularDrag(100);

    // this.setDrag(0.1, 0.1);
    // this.setAngularDrag(0.1);

    // this.value = value;
    // this.tokenType = tokenType;
  }

  collect() {
    this.disableBody(true, true);
    // this.destroy();
    displayScore(this.scene, this.x, this.y, this.value, 0);
    // this.displayScore(this.x, this.y, this.value, 0);
    eventsCentre.emit(`${this.tokenType}-collected`);
    return this.value;
  }

  setType(tokenType) {
    var value;
    var scale;
    var icon;
    switch (tokenType) {
      case 'small-star':
        value = 1//5;
        scale = 0.25;
        icon = 'star';
        break;
      case 'big-star':
        value = 2//10;
        scale = 0.4;
        icon = 'star';
        break;
      case 'bonus-1':
        value = 5//25;
        scale = 0.5;
        icon = 'bonus-1';
        break;
      case 'health':
        value = 0;
        scale = 0.3;
        icon = 'heart';
        break;
      default:
        value = 1//5;
        scale = 0.25;
        icon = 'star';
    }

    this.setTexture(icon);
    this.setScale(scale);
    this.body.setSize();
    this.value = value;
    this.tokenType = tokenType;
  }
}

export default ScoreToken;

import Phaser from 'phaser';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d1d1d',
  scene: {
    preload,
    create,
    update,
  }
};

function preload() {
  this.load.setBaseURL('https://labs.phaser.io');
  this.load.image('sky', 'assets/skies/space3.png');
}

function create() {
  this.add.image(400, 300, 'sky');
}

function update() {}

new Phaser.Game(config);

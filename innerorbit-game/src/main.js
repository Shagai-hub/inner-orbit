import Phaser from 'phaser';

// Custom shader pipeline class
class WaveShaderPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  constructor(game) {
    const config = {
      game: game,
      renderer: game.renderer,
      fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        uniform float uTime;
        varying vec2 outTexCoord;
        void main() {
          vec2 uv = outTexCoord;
          gl_FragColor = texture2D(uMainSampler, uv);
        }
      `,
      vertShader: `
        precision mediump float;
        uniform mat4 uProjectionMatrix;
        uniform float uTime;
        attribute vec2 inPosition;
        attribute vec2 inTexCoord;
        varying vec2 outTexCoord;
        void main() {
          float wave = sin(inPosition.x * 0.05 + uTime) * 10.0;
          vec4 pos = vec4(inPosition.x, inPosition.y + wave, 0.0, 1.0);
          gl_Position = uProjectionMatrix * pos;
          outTexCoord = inTexCoord;
        }
      `
    };
    super(config);
    this.time = 0;
  }

  onPreRender() {
    this.set1f('uTime', this.time);
    this.time += 0.01;
  }
}

class ShaderScene extends Phaser.Scene {
  constructor() {
    super('ShaderScene');
  }

  preload() {
    this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.image('star', 'https://labs.phaser.io/assets/sprites/star.png');
    this.load.image('bomb', 'https://labs.phaser.io/assets/sprites/bomb.png');
    this.load.spritesheet('dude', 
      'https://labs.phaser.io/assets/sprites/dude.png',
      { frameWidth: 32, frameHeight: 48 }
    );
  }

  create() {
    // Add shader pipeline
    const renderer = this.game.renderer;
    this.waveShaderPipeline = renderer.pipelines.add('Wave', new WaveShaderPipeline(this.game));
    
    // Sky background with shader effect
    this.sky = this.add.image(400, 300, 'sky');
    this.sky.setPipeline('Wave');
    
    // Create platforms
    this.platforms = this.physics.add.staticGroup();
    const ground = this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    const platform1 = this.platforms.create(600, 400, 'ground');
    const platform2 = this.platforms.create(50, 250, 'ground');
    const platform3 = this.platforms.create(750, 220, 'ground');
    
    // Apply shader to platforms
    ground.setPipeline('Wave');
    platform1.setPipeline('Wave');
    platform2.setPipeline('Wave');
    platform3.setPipeline('Wave');
    
    // Create player
    this.player = this.physics.add.sprite(100, 450, 'dude');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.player.setPipeline('Wave');
    
    // Player animations
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'turn',
      frames: [{ key: 'dude', frame: 4 }],
      frameRate: 20
    });
    
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    
    // Add collision between player and platforms
    this.physics.add.collider(this.player, this.platforms);
    
    // Set up cursor keys
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Create stars
    this.stars = this.physics.add.group({
      key: 'star',
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    });
    
    this.stars.children.iterate((child) => {
      child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      child.setPipeline('Wave');
    });
    
    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    
    // Create bombs
    this.bombs = this.physics.add.group();
    this.physics.add.collider(this.bombs, this.platforms);
    this.physics.add.collider(this.player, this.bombs, this.hitBomb, null, this);
    
    // Score text
    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'Score: 0', { 
      fontSize: '32px', 
      fill: '#fff',
      fontFamily: 'Arial'
    });
    
    // Game over text (hidden initially)
    this.gameOver = false;
    this.gameOverText = this.add.text(400, 300, 'GAME OVER\nClick to Restart', {
      fontSize: '64px',
      fill: '#ff0000',
      fontFamily: 'Arial',
      align: 'center'
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.visible = false;
    
    // Add click handler for restart
    this.input.on('pointerdown', () => {
      if (this.gameOver) {
        this.scene.restart();
      }
    });
    
    // Shader controls
    this.add.text(16, 550, 'Press S to toggle shader', { 
      fontSize: '18px', 
      fill: '#fff' 
    });
    
    // Key for toggling shader
    this.shaderEnabled = true;
    this.input.keyboard.on('keydown-S', () => {
      this.shaderEnabled = !this.shaderEnabled;
      
      if (this.shaderEnabled) {
        this.sky.setPipeline('Wave');
        this.platforms.children.each(child => child.setPipeline('Wave'));
        this.stars.children.each(child => child.setPipeline('Wave'));
        this.player.setPipeline('Wave');
        this.bombs.children.each(child => child.setPipeline('Wave'));
      } else {
        this.sky.resetPipeline();
        this.platforms.children.each(child => child.resetPipeline());
        this.stars.children.each(child => child.resetPipeline());
        this.player.resetPipeline();
        this.bombs.children.each(child => child.resetPipeline());
      }
    });
  }
  
  update() {
    if (this.gameOver) {
      return;
    }
    
    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play('left', true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play('right', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('turn');
    }
    
    // Jump when up arrow or space is pressed and player is touching the ground
    if ((this.cursors.up.isDown || this.cursors.space.isDown) && this.player.body.touching.down) {
      this.player.setVelocityY(-350);
    }
    
    // Apply shader to new bombs
    if (this.shaderEnabled) {
      this.bombs.children.each(child => {
        if (!child.pipeline) {
          child.setPipeline('Wave');
        }
      });
    }
  }
  
  collectStar(player, star) {
    star.disableBody(true, true);
    
    // Update score
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
    
    // Create a new bomb when all stars are collected
    if (this.stars.countActive(true) === 0) {
      this.stars.children.iterate((child) => {
        child.enableBody(true, child.x, 0, true, true);
        if (this.shaderEnabled) {
          child.setPipeline('Wave');
        }
      });
      
      const x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
      const bomb = this.bombs.create(x, 16, 'bomb');
      bomb.setBounce(1);
      bomb.setCollideWorldBounds(true);
      bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
      
      if (this.shaderEnabled) {
        bomb.setPipeline('Wave');
      }
    }
  }
  
  hitBomb(player, bomb) {
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
    this.gameOver = true;
    this.gameOverText.visible = true;
  }
}

// More complex wave effect shader
class AdvancedWaveScene extends Phaser.Scene {
  constructor() {
    super('AdvancedWaveScene');
  }

  preload() {
    // Same preload as ShaderScene
    this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.image('star', 'https://labs.phaser.io/assets/sprites/star.png');
    this.load.image('bomb', 'https://labs.phaser.io/assets/sprites/bomb.png');
    this.load.spritesheet('dude', 
      'https://labs.phaser.io/assets/sprites/dude.png',
      { frameWidth: 32, frameHeight: 48 }
    );
  }

  create() {
    // Scene initialization would be similar to ShaderScene with a different shader
  }
}

const config = {
  type: Phaser.WEBGL,  // Make sure to use WebGL for shader support
  width: 800,
  height: 600,
  backgroundColor: '#000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  scene: [ShaderScene]
};

const game = new Phaser.Game(config);
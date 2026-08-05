import 'q5'
import 'q5play'

import Player from './nova.player.js'
import Soldier from './nova.soldier.js'
import Zombie from './nova.zombie.js'
import Human from './nova.human.js'
import Doctor from './nova.doctor.js'

let sound = {}
let images = {}
let displayFont = {}
const emojiFont = 'Arial'

// https://stackoverflow.com/a/67295678/41153
// a custom 'sleep' or wait' function, that returns a Promise that resolves only after a timeout
function sleep(millisecondsDuration)
{
  return new Promise((resolve) => {
    setTimeout(resolve, millisecondsDuration);
  })
}

function findBySprite (list, sprite) {
  return list.find(entity => entity.sprite === sprite)
}

new Q5(p => {
  p.preload = () => {
    images.player = { 
      normal: p.loadImage('images/u1f635_u1f922.png'),
      invuln: p.loadImage('images/u1fae5_u1f922.png')
    }

    displayFont = p.loadFont('fonts/CharriotDeluxe.ttf');

    sound.scream = p.loadSound('audio/64940__syna-max__wilhelm_scream.wav')
    sound.gunshot = p.loadSound('audio/128297__xenonn__layered-gunshot-7.wav')
    sound.crunch = p.loadSound('audio/524609__clearwavsound__bone-crunch.wav')
    sound.thing = p.loadSound('audio/425941__jarethorin__loopy-thing.wav')
    sound.heal = p.loadSound('audio/578581__nomiqbomi__tremolo-strings-2.mp3')
    sound.nomnom = p.loadSound('audio/543386__thedragonsspark__nom-noise.wav')
    sound.bite = p.loadSound('audio/353067__jofae__bite-cartoon-style.mp3')
    sound.nom = p.loadSound('audio/nom.smaller.mp3')
    sound.bell = p.loadSound('audio/taco-bell-bong-sfx-120135.mp3')
  }

  // other modes?
  // when you die?
  
  const gameMode = {
    HELP: 'help',
    PLAYING: 'playing',
    ROUND_OVER: 'round over',

    PAUSED: 'paused',
    GAME_OVER: 'game over',
    ATTRACT: 'attract'
  }

  let params = {
    mode: gameMode.ATTRACT,
    previousMode: gameMode.ATTRACT,
    score: 0,
    level: 0,
    livesMax: 3,
    humans: null,
    zombies: null,
    doctors: null,
    soldiers: null,
    player: {},
    doctorLimit: 1,
    humanLimit: 12,
    soldierLimit: 2,
    humanList: [],
    zombieList: [],
    soldierList: [],
    doctorList: []
  }

  function resetLevel () {
    // q5play Group#deleteAll() actually deletes each sprite (physics body +
    // membership in every group) — Group#removeAll() only detaches sprites
    // from THIS group without deleting them, which would leak sprites into
    // the world. Verified against node_modules/q5play/q5play.js (removeAll
    // is `this.splice(0, this.length)`; deleteAll calls `.at(-1).delete()`
    // per sprite). deleteAll() is what the original manual
    // `o.sprite.remove()` loop was trying to achieve.
    const groups = [params.humans, params.zombies, params.doctors, params.soldiers]
    groups.forEach(group => group.deleteAll())

    params.humanList = []
    params.zombieList = []
    params.soldierList = []
    params.doctorList = []

    for (let i = 0; i < params.humanLimit; i++) {
      params.humanList.push(new Human(p, null, null, undefined, undefined, params.humans))
    }
    for (let i = 0; i < params.soldierLimit; i++) {
      params.soldierList.push(new Soldier(p, null, null, -2.5, 0.02, params.soldiers))
    }
    for (let i = 0; i < params.doctorLimit; i++) {
      params.doctorList.push(new Doctor(p, null, null, -2.5, 0.001, params.doctors))
    }
    params.level++
    if (params.level % 2 === 0) {
      params.soldierLimit++
      params.humanLimit += 2
    }
    params.mode = gameMode.PLAYING
  }

  function startGame () {
    params.level = 0
    params.score = 0
    resetLevel()
    if (params.player.sprite) {
      params.player.sprite.delete()
    }
    params.player = new Player(p, null, null, params.livesMax, images.player)

    params.player.sprite.overlaps(params.humans, (playerSprite, humanSprite) => {
      const humanEntity = findBySprite(params.humanList, humanSprite)
      if (!humanEntity) return
      sound.bite.play()
      humanEntity.sprite.delete()
      params.humanList.splice(params.humanList.indexOf(humanEntity), 1)
      params.zombieList.push(new Zombie(p, humanEntity.x, humanEntity.y, undefined, undefined, params.zombies))
      params.score++
    })

    params.player.sprite.overlaps(params.soldiers, (playerSprite, soldier) => {
      if (params.player.invulnerable) return
      params.player.killed()
      sound.gunshot.play()
    })

    params.mode = gameMode.PLAYING
    if (sound.thing) {
      sound.thing.setVolume(1.0)
      sound.thing.loop = true
      sound.thing.play()
    }
  }

  function displayScore () {
    p.fill(0)
    p.textSize(12)
    p.textAlign(p.LEFT)
    p.textFont(displayFont)
    p.text('Score: ' + params.score, 10, 30)
    p.text('Round: ' + params.level, 10, 40)
    p.text(`Lives: ${params.player.lives}`, 10, 50)
    p.text(`Humans: ${params.humanList.length}`, 10, 60)
    p.text(`Zombies: ${params.zombieList.length}`, 10, 70)

    p.textFont(emojiFont)
  }

  async function playloop () {
    p.background(220)
    p.textFont(emojiFont)
    params.player.move()
    params.player.display() // needed until x/y directly references sprite

    if (params.player.lives <= 0) {
      params.mode = gameMode.GAME_OVER
      sound.scream.play()
      return
    }

    for (let human of params.humanList) {
      human.move(params.zombieList, params.player)
      human.display()
    }

    for (let zombie of params.zombieList) {
      zombie.move(params.soldierList, params.humanList, params.doctorList)
      zombie.display()
    }

    for (let soldier of params.soldierList) {
      soldier.move(params.player, params.zombieList)
      soldier.display()
    }

    for (let doctor of params.doctorList) {
      doctor.move(params.zombieList)
      doctor.display()
    }

    // Check for new round
    // TODO: pause briefly and say something?
    if (params.humanList.length === 0) {
      params.mode = gameMode.ROUND_OVER
      sound.bell.play()
      await sleep(1000)
      resetLevel()
    }

    displayScore()
  }

  p.setup = () => {
    // Create a container div for the game
    let gameContainer = p.createDiv('')
    gameContainer.id = 'game-container'
    
    let canvas = p.createCanvas(600, 600)
    canvas.parent(gameContainer)
    
    p.frameRate(30)
    p.noStroke()
    p.textStyle(p.BOLD)
    // p.textFont(font);
    p.textFont(emojiFont)

    params.humans = new p.Group()
    params.zombies = new p.Group()
    params.doctors = new p.Group()
    params.soldiers = new p.Group()

    params.humans.overlaps(params.zombies, (humanSprite, zombieSprite) => {
      const humanEntity = findBySprite(params.humanList, humanSprite)
      const zombieEntity = findBySprite(params.zombieList, zombieSprite)
      if (!humanEntity || !zombieEntity) return
      sound.nomnom.play()
      humanEntity.sprite.delete()
      params.humanList.splice(params.humanList.indexOf(humanEntity), 1)
      params.zombieList.push(new Zombie(p, humanEntity.x, humanEntity.y, undefined, undefined, params.zombies))
    })

    params.soldiers.overlaps(params.zombies, (soldierSprite, zombieSprite) => {
      const zombieEntity = findBySprite(params.zombieList, zombieSprite)
      if (!zombieEntity || zombieEntity.killed) return
      sound.gunshot.play()
      zombieEntity.kill()
      // stays in zombieList/group as a gravestone until resetLevel() clears it
    })

    params.doctors.overlaps(params.zombies, (doctorSprite, zombieSprite) => {
      const doctorEntity = findBySprite(params.doctorList, doctorSprite)
      const zombieEntity = findBySprite(params.zombieList, zombieSprite)
      if (!doctorEntity || !zombieEntity || zombieEntity.killed || doctorEntity.waiting) return
      doctorEntity.wait()
      sound.heal.play()
      zombieEntity.sprite.delete()
      params.zombieList.splice(params.zombieList.indexOf(zombieEntity), 1)
      params.humanList.push(new Human(p, zombieEntity.x, zombieEntity.y, undefined, undefined, params.humans))
    })

    let restartButton = p.createButton('Start')
    restartButton.parent(gameContainer)
    restartButton.mousePressed(startGame)
  }

  p.mousePressed = () => {
    if (params.mode === gameMode.ATTRACT) {
      startGame()
    }
  }

  function handleKeyInput () {
    // we need to debounce or something
    if (p.kb.presses('p') || p.kb.presses(' ')) {
      if (params.mode === gameMode.PLAYING) pauseGame()
      else if (params.mode === gameMode.PAUSED) unpauseGame()
    } else if (p.kb.presses('h')) {
      if (params.mode === gameMode.HELP) {
        params.mode = params.previousMode
        removeHelp()
      } else {
        params.previousMode = params.mode
        params.mode = gameMode.HELP
      }
    } else if (params.mode === gameMode.GAME_OVER) {
      startGame()
    }
  }

  const pauseGame = () => {
    params.mode = gameMode.PAUSED
    p.world.autoStep = false
  }

  const unpauseGame = () => {
    params.mode = gameMode.PLAYING
    p.world.autoStep = true
  }

  const hideGameObjects = () => {
    [params.humanList, params.zombieList, params.doctorList, params.soldierList]
      .forEach(list => list.forEach(o => (o.sprite.visible = false)))
    if (params.player.sprite) params.player.sprite.visible = false
  }

  const showGameObjects = () => {
    [params.humanList, params.zombieList, params.doctorList, params.soldierList]
      .forEach(list => list.forEach(o => (o.sprite.visible = true)))
    if (params.player.sprite) params.player.sprite.visible = true
  }

  const displayHelp = () => {
    hideGameObjects()

    p.clear()
    p.background(220)
    p.fill(0)
    p.textSize(32)
    p.textAlign(p.CENTER)
    p.textFont(emojiFont)

    p.text('😃', 70, 100)
    p.text('✭', 70, 130)
    p.text('🤢', 70, 160)
    p.text('⛑', 70, 190)

    p.imageMode(p.CENTER)
    p.image(images.player.normal, 70, 220, 32, 32)
    p.image(images.player.invuln, 70, 250, 32, 32)
    p.imageMode(p.CORNER)

    p.textAlign(p.LEFT)
    p.textSize(16)

    p.textFont(displayFont)
    p.text('Human: tasty!', 100, 105)
    p.text('Soldier: beware!', 100, 135)
    p.text('Zombie: your babies! (you can ignore them now)', 100, 165)
    p.text('Doctor: No worries, but heals zombies back to life', 100, 195)
    p.text('Player: Move with arrow keys, bite humans, avoid soldiers', 100, 225)
    p.text('Player: after being shot and returning to un-life,\nyou are briefly invulnerable', 100, 255)
    p.textFont(emojiFont)
  }

  const removeHelp = () => {
    showGameObjects()
  }

  p.draw = () => {
    handleKeyInput()
    // TODO: break out into functions or files

    if (params.mode === gameMode.ROUND_OVER) {
      return
    }

    if (params.mode === gameMode.ATTRACT) {
      displayTitleScreen(p)
      return
    }
    if (params.mode === gameMode.PAUSED) {
      p.background(220)
      displayScore()
      p.background(0, 50)
      p.fill(255)
      p.textSize(32)
      p.textAlign(p.CENTER)
      p.textFont(displayFont)
      p.text('Paused', p.width / 2, p.height / 2)
      p.text(`Press 'p' or 'space' to continue`, p.width / 2, p.height / 2 + 50)
      p.textFont(emojiFont)
      return
    }
    if (params.mode === gameMode.GAME_OVER) {
      p.background(220)
      displayScore()
      p.background(0, 50)
      p.fill(255)
      p.textSize(32)
      p.textAlign(p.CENTER)
      p.textFont(displayFont)
      p.text('Game Over', p.width / 2, p.height / 2)
      return
    }
    if (params.mode === gameMode.HELP) {
      displayHelp()
      return
    }
    if (params.mode !== gameMode.PLAYING) {
      return
    }
    playloop()
  }
})

function displayTitleScreen(ctx) {
  ctx.background(0)
  ctx.textAlign(ctx.CENTER)
  ctx.textFont(displayFont)
  ctx.textSize(40)
  ctx.textStyle(ctx.BOLD)

  ctx.fill(ctx.random(255), ctx.random(255), ctx.random(255))
  ctx.text('Nova Zombie Simulator', ctx.width / 2, ctx.height / 2 - 100)

  ctx.textStyle(ctx.NORMAL)
  ctx.fill(255)
  ctx.textSize(32)
  ctx.text('Click to Start', ctx.width / 2, ctx.height / 2 + 50)

  ctx.textSize(18)
  ctx.text('by Michael and Anthony Paulukonis', ctx.width / 2, ctx.height / 2 + 200)
  ctx.textFont(emojiFont)
}


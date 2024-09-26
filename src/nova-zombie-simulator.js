await import('p5js-wrapper')
window.planck = await import('planck')
await import('p5play')
await import('p5js-wrapper/sound')

import Player from './nova.player.js'
import Soldier from './nova.soldier.js'
import Zombie from './nova.zombie.js'
import Human from './nova.human.js'
import Doctor from './nova.doctor.js'

let sound = {}
let helpObjs = []
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

new p5(p => {
  p.preload = () => {
    images.player = { 
      normal: p.loadImage('images/u1f635_u1f922.png'),
      invuln: p.loadImage('images/u1fae5_u1f922.png')
    }

    displayFont = p.loadFont('/fonts/CharriotDeluxe.ttf');

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
    painted: false,
    humans: [],
    zombies: [],
    doctors: [],
    soldiers: [],
    player: {},
    gameObjs: [],
    doctorLimit: 1,
    humanLimit: 12,
    soldierLimit: 2,
    helpObjs: []
  }

  function resetLevel () {
    params.gameObjs = [params.humans, params.zombies, params.doctors, params.soldiers]
    params.gameObjs.forEach(objs => objs.forEach(o => o.sprite.remove()))

    params.humans = []
    params.zombies = []
    params.soldiers = []
    params.doctors = []
    for (let i = 0; i < params.humanLimit; i++) {
      params.humans.push(new Human(p, null, null))
    }
    for (let i = 0; i < params.soldierLimit; i++) {
      params.soldiers.push(new Soldier(p, null, null, -2.5, 0.02))
    }
    for (let i = 0; i < params.doctorLimit; i++) {
      params.doctors.push(new Doctor(p, null, null, -2.5, 0.001))
    }
    params.level++
    if (params.level % 2 === 0) {
      params.soldierLimit++
      params.humanLimit += 2
    }
    params.gameObjs = [params.humans, params.zombies, params.doctors, params.soldiers]
    params.mode = gameMode.PLAYING
  }

  function startGame () {
    params.level = 0
    params.score = 0
    resetLevel()
    if (params.player.sprite) {
      params.player.sprite.remove()
    }
    params.player = new Player(p, null, null, params.livesMax, images.player)
    params.mode = gameMode.PLAYING
    if (sound.thing) {
      sound.thing.setVolume(1.0)
      sound.thing.loop()
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
    p.text(`Humans: ${params.humans.length}`, 10, 60)
    p.text(`Zombies: ${params.zombies.length}`, 10, 70)

    p.textFont(emojiFont)
  }

  async function playloop () {
    params.painted = false
    p.background(220)
    p.textFont(emojiFont)
    params.player.move()
    params.player.display() // needed until x/y directly references sprite

    if (params.player.lives <= 0) {
      params.mode = gameMode.GAME_OVER
      sound.scream.play()
      return
    }

    for (let human of params.humans) {
      human.move(params.zombies, params.player)
      human.display()
      if (params.player.touches(human)) {
        sound.bite.play()
        human.sprite.remove()
        params.zombies.push(new Zombie(p, human.x, human.y))
        params.humans.splice(params.humans.indexOf(human), 1)
        params.score++
      }
    }

    for (let zombie of params.zombies) {
      zombie.move(params.soldiers, params.humans, params.doctors)
      zombie.display()
      for (let human of params.humans) {
        if (zombie.touches(human)) {
          sound.nomnom.play()
          human.sprite.remove()
          params.zombies.push(new Zombie(p, human.x, human.y))
          params.humans.splice(params.humans.indexOf(human), 1)
        }
      }
    }

    for (let soldier of params.soldiers) {
      soldier.move(params.player, params.zombies)
      soldier.display()
      if (soldier.touches(params.player) && !params.player.invulnerable) {
        params.player.killed()
        sound.gunshot.play()
      }
      for (let zombie of params.zombies.filter(z => !z.killed)) {
        if (soldier.touches(zombie)) {
          sound.gunshot.play()
          zombie.kill()
        }
      }
    }

    for (let doctor of params.doctors) {
      doctor.move(params.zombies)
      doctor.display()
      for (let zombie of params.zombies.filter(z => !z.killed)) {
        if (!doctor.waiting && doctor.touches(zombie)) {
          doctor.wait()
          sound.heal.play()
          zombie.sprite.remove()
          params.humans.push(new Human(p, zombie.x, zombie.y))
          params.zombies.splice(params.zombies.indexOf(zombie), 1)
        }
      }
    }

    // Check for new round
    // TODO: pause briefly and say something?
    if (params.humans.length === 0) {
      params.mode = gameMode.ROUND_OVER
      sound.bell.play()
      await sleep(1000)
      resetLevel()
    }

    displayScore()
  }

  p.setup = () => {
    let canvas = p.createCanvas(600, 600)
    p.frameRate(30)
    p.noStroke()
    p.textStyle(p.BOLD)
    // p.textFont(font);
    p.textFont(emojiFont)

    let restartButton = p.createButton('Start')
    // canvas positions are different inside of the animate loop. hrm.
    restartButton.position(
      canvas.offsetLeft,
      canvas.offsetTop + canvas.offsetHeight + 10
    )
    restartButton.mousePressed(startGame)
  }

  p.mousePressed = () => {
    if (params.mode === gameMode.ATTRACT) {
      startGame()
    }
  }

  function handleKeyInput () {
    // we need to debounce or something
    if (p.kb.pressed('p') || p.kb.pressed(' ')) {
      if (params.mode === gameMode.PLAYING) pauseGame()
      else if (params.mode === gameMode.PAUSED) unpauseGame()
    } else if (p.kb.pressed('h')) {
      if (params.mode === gameMode.HELP) {
        params.mode = params.previousMode
        removeHelp()
      } else {
        params.previousMode = params.mode
        params.mode = gameMode.HELP
        params.painted = false
      }
    } else if (params.mode === gameMode.GAME_OVER) {
      startGame()
    }
  }

  const pauseGame = () => {
    params.mode = gameMode.PAUSED
  }

  const unpauseGame = () => {
    params.mode = gameMode.PLAYING
    params.painted = false
  }

  const hideGameObjects = () => {
    params.gameObjs.forEach(objs => objs.forEach(o => o.sprite.visible = false))
    params.player.sprite.visible = false
  }

  const showGameObjects = () => {
    params.gameObjs.forEach(objs => objs.forEach(o => o.sprite.visible = true))
    params.player.sprite.visible = true
  }

  const displayHelp = () => {
    hideGameObjects()

    p.clear()
    p.background(220)
    p.fill(0)
    p.textSize(32)
    p.textAlign(p.CENTER)

    p.textFont(emojiFont)
    let h = new Human(p, 70,100)
    let s = new Soldier(p, 70,130)
    let z = new Zombie(p, 70,160)
    let d = new Doctor(p, 70,190)
    let pl = new Player(p, 70,220, 3, images.player)
    let plInv = new Player(p, 70,250, 3, images.player)
    plInv.invulnerable = true
    plInv.setSprite(plInv.sprites.invulnerable)

    pl.display()
    plInv.display()

    helpObjs = [h, s, z, d, pl, plInv]

    p.textAlign(p.LEFT)
    p.textSize(16)
    
    p.textFont(displayFont)
    p.text('Human: tasty!', 100, 105)
    p.text('Soldier: beware!', 100, 135)
    p.text('Zombie: your babies! (you can ignore them now)', 100, 165)
    p.text('Doctor: No worries, but heals zombies back to life', 100, 195)
    p.text('Player: Move with arrow keys, bite humans, avoid soldiers', 100, 225)
    p.text('Player: after being shot and returning to un-life, you are briefly invulnerable', 100, 255, 300)
    p.textFont(emojiFont)

    params.painted = true
  }

  const removeHelp = () => {
    helpObjs.forEach(o => o.sprite?.remove())
    helpObjs = []
    
    showGameObjects()
    params.painted = false
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
    if (params.mode === gameMode.PAUSED && !params.painted) {
      params.painted = true
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
    if (params.mode === gameMode.GAME_OVER && !params.painted) {
      params.painted = true
      p.background(0, 50)
      p.fill(255)
      p.textSize(32)
      p.textAlign(p.CENTER)
      p.textFont(displayFont)
      p.text('Game Over', p.width / 2, p.height / 2)
      return
    }
    if (params.mode === gameMode.HELP && !params.painted) {
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


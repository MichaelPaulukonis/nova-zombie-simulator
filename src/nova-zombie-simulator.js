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

new p5(p => {
  p.preload = () => {
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
    player: null,
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
  }

  function startGame () {
    params.level = 0
    params.score = 0
    resetLevel()
    params.player = new Player(p, null, null, params.livesMax)
    params.mode = gameMode.PLAYING
    if (sound.thing) {
      sound.thing.setVolume(1.0)
      sound.thing.loop()
    }
  }

  function displayScore () {
    p.fill(0)
    p.textSize(24)
    p.textAlign(p.LEFT)
    p.text('Score: ' + params.score, 10, 30)
    p.text('Round: ' + params.level, 10, 60)
    p.text(`Lives: ${params.player.lives}`, 10, 90)
  }

  function playloop () {
    params.painted = false
    p.background(220)
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
      for (let zombie of params.zombies) {
        if (soldier.touches(zombie)) {
          sound.gunshot.play()
          zombie.sprite.remove()
          params.zombies.splice(params.zombies.indexOf(zombie), 1)
        }
      }
    }

    for (let doctor of params.doctors) {
      doctor.move(params.zombies)
      doctor.display()
      for (let zombie of params.zombies) {
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
    if (params.humans.length === 0) {
      sound.bell.play()
      resetLevel()
    }

    displayScore()
  }

  p.setup = () => {
    let canvas = p.createCanvas(600, 600)
    p.frameRate(30)
    p.noStroke()
    p.textStyle(p.BOLD)

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
    p.text('Help', p.width / 2, p.height / 2)

    let h = new Human(p, 100, 100)
    let s = new Soldier(p, 100, 130)
    let z = new Zombie(p, 100, 160)
    let d = new Doctor(p, 100, 190)
    let pl = new Player(p, 100, 220)
    pl.display()

    helpObjs = [h, s, z, d, pl]

    p.textAlign(p.LEFT)
    p.textSize(16)

    p.text('Human: tasty!', 130, 105)
    p.text('Soldier: beware!', 130, 135)
    p.text('Zombie: your babies! (you can ignore them now)', 130, 165)
    p.text('Doctor: No worries, but heals zombies back to life', 130, 195)
    p.text('Player: Move with arrow keys, bite humans, avoid soldiers', 130, 225)

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
    if (params.mode === gameMode.ATTRACT) {
      p.background(0)
      p.fill(255)
      p.textSize(32)
      p.textAlign(p.CENTER)
      p.text('Nova Zombie Simulator', p.width / 2, p.height / 2)
      p.text('Click to Start', p.width / 2, p.height / 2 + 50)
      return
    }
    if (params.mode === gameMode.PAUSED && !params.painted) {
      params.painted = true
      p.background(0, 50)
      p.fill(255)
      p.textSize(32)
      p.textAlign(p.CENTER)
      p.text('Paused', p.width / 2, p.height / 2)
      p.text(`Press 'p' or 'space' to continue`, p.width / 2, p.height / 2 + 50)
      return
    }
    if (params.mode === gameMode.GAME_OVER && !params.painted) {
      params.painted = true
      p.background(0, 50)
      p.fill(255)
      p.textSize(32)
      p.textAlign(p.CENTER)
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

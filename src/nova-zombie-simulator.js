await import('p5js-wrapper')
window.planck = await import('planck')
await import('p5play')
await import('p5js-wrapper/sound')

import Player from './nova.player.js'
import Soldier from './nova.soldier.js'
import Zombie from './nova.zombie.js'
import Human from './nova.human.js'
import Doctor from './nova.doctor.js'

let player
let humans = []
let zombies = []
let soldiers = []
let doctors = []
let soldierLimit = 2
let humanLimit = 12
let doctorLimit = 1
let sound = {}

new p5(p => {
  p.preload = () => {
    sound.scream = p.loadSound('audio/64940__syna-max__wilhelm_scream.wav')
    sound.gunshot = p.loadSound('audio/128297__xenonn__layered-gunshot-7.wav')
    sound.crunch = p.loadSound('audio/524609__clearwavsound__bone-crunch.wav')
    sound.thing = p.loadSound('audio/425941__jarethorin__loopy-thing.wav')
    sound.heal = p.loadSound('audio/578581__nomiqbomi__tremolo-strings-2.mp3')
    sound.nomnom = p.loadSound('audio/543386__thedragonsspark__nom-noise.wav')
    sound.bite = p.loadSound('audio/353067__jofae__bite-cartoon-style.mp3')
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
    score: 0,
    level: 0,
    livesMax: 3,
    painted: false
  }

  function resetLevel () {
    let objs = [humans, zombies, doctors, soldiers]
    for (const arr of objs) {
      for (const p of arr) {
        p.sprite.remove()
      }
    }
    humans = []
    zombies = []
    soldiers = []
    doctors = []
    for (let i = 0; i < humanLimit; i++) {
      humans.push(new Human(p, null, null))
    }
    for (let i = 0; i < soldierLimit; i++) {
      soldiers.push(new Soldier(p, null, null, -2.5, 0.02))
    }
    for (let i = 0; i < doctorLimit; i++) {
      doctors.push(new Doctor(p, null, null, -2.5, 0.001))
    }
    params.level++
    if (params.level % 2 === 0) {
      soldierLimit++
      humanLimit += 2
    }
  }

  function startGame () {
    player = new Player(p, params.livesMax)
    params.level = 0
    params.score = 0
    resetLevel()
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
    p.text(`Lives: ${player.lives}`, 10, 90)
  }

  function playloop () {
    params.painted = false
    p.background(220)
    player.move()
    player.display()

    if (player.lives <= 0) {
      params.mode = gameMode.GAME_OVER
      sound.scream.play()
      return
    }

    for (let human of humans) {
      human.move(zombies, player)
      human.display()
      if (player.touches(human)) {
        sound.bite.play()
        human.sprite.remove()
        zombies.push(new Zombie(p, human.x, human.y))
        humans.splice(humans.indexOf(human), 1)
        params.score++
      }
    }

    for (let zombie of zombies) {
      zombie.move(soldiers, humans, doctors)
      zombie.display()
      for (let human of humans) {
        if (zombie.touches(human)) {
          sound.nomnom.play()
          human.sprite.remove()
          zombies.push(new Zombie(p, human.x, human.y))
          humans.splice(humans.indexOf(human), 1)
        }
      }
    }

    for (let soldier of soldiers) {
      soldier.move(player, zombies)
      soldier.display()
      if (soldier.touches(player) && !player.invulnerable) {
        player.killed()
      }
      for (let zombie of zombies) {
        if (soldier.touches(zombie)) {
          sound.gunshot.play()
          zombie.sprite.remove()
          zombies.splice(zombies.indexOf(zombie), 1)
        }
      }
    }

    for (let doctor of doctors) {
      doctor.move(zombies)
      doctor.display()
      for (let zombie of zombies) {
        if (!doctor.waiting && doctor.touches(zombie)) {
          doctor.wait()
          sound.heal.play()
          zombie.sprite.remove()
          humans.push(new Human(p, zombie.x, zombie.y))
          zombies.splice(zombies.indexOf(zombie), 1)
        }
      }
    }

    // Check for new round
    if (humans.length === 0) {
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
      else if (params.mode === gameMode.PAUSED)  unpauseGame()
    }
    else if (params.mode === gameMode.GAME_OVER) {
      startGame()
    } else if (params.mode === gameMode.HELP) {
      params.mode = gameMode.ATTRACT
    }
  }

  // p.keyTyped = () => {
  //   handleKeyInput()
  // }

  // p.keyPressed = () => {
  //   handleKeyInput()
  // }

  const pauseGame = () => {
    params.mode = gameMode.PAUSED
    console.log('PAUSED')
  }

  const unpauseGame = () => {
    params.mode = gameMode.PLAYING
    params.painted = false
    console.log('UNPAUSED')
  }

  const displayHelp = () => {
    let objs = [humans, zombies, doctors, soldiers]
    for (const arr of objs) {
      for (const p of arr) {
        p.sprite.visible = false
      }
    }

    p.background(0)
    p.fill(255)
    p.textSize(32)
    p.textAlign(p.CENTER)
    p.text('Help', p.width / 2, p.height / 2)
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
      params.painted = true
      displayHelp()
      return
    }
    if (params.mode !== gameMode.PLAYING) {
      return
    }
    playloop()
  }
})

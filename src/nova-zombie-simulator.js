import { sketch } from 'p5js-wrapper'
import 'p5js-wrapper/sound'

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

let sketch1 = new p5(p => {
  p.preload = () => {
    console.log('preload')
    sound.scream = p.loadSound(
      '/assets/audio/64940__syna-max__wilhelm_scream.wav'
    )
    sound.gunshot = p.loadSound(
      '/assets/audio/128297__xenonn__layered-gunshot-7.wav'
    )
    sound.crunch = p.loadSound(
      '/assets/audio/524609__clearwavsound__bone-crunch.wav'
    )
    sound.thing = p.loadSound(
      '/assets/audio/425941__jarethorin__loopy-thing.wav'
    )
    console.log('preload complete')
  }

  const gameMode = {
    HELP: 'help',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game over',
    ATTRACT: 'attract'
  }

  let config = {
    mode: gameMode.ATTRACT,
    score: 0,
    level: 0,
    livesMax: 3
  }

  function resetLevel () {
    humans = []
    zombies = []
    soldiers = []
    doctors = []
    for (let i = 0; i < humanLimit; i++) {
      humans.push(new Human(null, null, p))
    }
    for (let i = 0; i < soldierLimit; i++) {
      soldiers.push(new Soldier(p))
    }
    for (let i = 0; i < doctorLimit; i++) {
      doctors.push(new Doctor(p))
    }
    config.level++
    if (config.level % 2 === 0) {
      soldierLimit++
      humanLimit += 2
    }
  }

  function startGame () {
    console.log('start game')
    player = new Player(p, config.livesMax)
    config.level = 0
    config.score = 0
    resetLevel()
    config.mode = gameMode.PLAYING
    if (sound.thing) {
      sound.thing.setVolume(1.0)
      sound.thing.loop()
    }
  }

  function displayScore () {
    p.fill(0)
    p.textSize(24)
    p.text('Score: ' + config.score, 10, 30)
    p.text('Round: ' + config.level, 10, 60)
    p.text(`Lives: ${player.lives}`, 10, 90)
  }

  function playloop () {
    p.background(220)
    player.move()
    player.display()

    if (player.lives <= 0) {
      config.gameMode = gameMode.GAME_OVER
      sound.scream.play()
      // p.textSize(32)
      // p.text('Game Over', p.width / 2 - 100, p.height / 2)
      return
    }

    for (let human of humans) {
      human.move(zombies, player)
      human.display()
      if (player.touches(human)) {
        sound.crunch.play()
        zombies.push(new Zombie(human.x, human.y, p))
        humans.splice(humans.indexOf(human), 1)
        config.score++
      }
    }

    for (let zombie of zombies) {
      zombie.move(soldiers, humans, doctors)
      zombie.display()
      for (let human of humans) {
        if (zombie.touches(human)) {
          sound.crunch.play()
          zombies.push(new Zombie(human.x, human.y, p))
          humans.splice(humans.indexOf(human), 1)
          // config.score++Í
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
          zombies.splice(zombies.indexOf(zombie), 1)
        }
      }
    }

    for (let doctor of doctors) {
      doctor.move(zombies)
      doctor.display()
      for (let zombie of zombies) {
        if (doctor.touches(zombie)) {
          // sound.gunshot.play()
          humans.push(new Human(zombie.x, zombie.y, p))
          zombies.splice(zombies.indexOf(zombie), 1)
        }
      }
    }

    // Check for new round
    if (humans.length === 0) {
      // Start new round
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
    if (config.mode === gameMode.ATTRACT) {
      startGame()
    }
  }

  p.keyTyped = () => {
    if (config.mode === gameMode.PLAYING) {
      if (p.key === 'p' || p.key === ' ') {
        config.mode = gameMode.PAUSED
      }
    } else if (config.mode === gameMode.PAUSED) {
      if (p.key === 'p' || p.key === ' ') {
        config.mode = gameMode.PLAYING
      }
    } else if (config.mode === gameMode.GAME_OVER) {
      startGame()
    } else if (config.mode === gameMode.HELP) {
      config.mode = gameMode.ATTRACT
    }
  }

  p.draw = () => {
    if (config.mode === gameMode.ATTRACT) {
      p.background(0)
      p.fill(255)
      p.textSize(32)
      p.text('Nova Zombie Simulator', p.width / 2 - 200, p.height / 2)
      p.text('Click to Start', p.width / 2 - 100, p.height / 2 + 50)
      return
    }
    if (config.mode === gameMode.GAME_OVER) {
      p.background(0)
      p.fill(255)
      p.textSize(32)
      p.text('Game Over', p.width / 2 - 100, p.height / 2)
      return
    }
    if (config.mode === gameMode.HELP) {
      p.background(0)
      p.fill(255)
      p.textSize(32)
      p.text('Help', p.width / 2 - 100, p.height / 2)
      return
    }
    if (config.mode !== gameMode.PLAYING) {
      return
    }
    playloop()
  }
})

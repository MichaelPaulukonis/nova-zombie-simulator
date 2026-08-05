import Mobile from './nova.mobile.js'

export default class Zombie extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed, group) {
    super(ctx, x, y, speed, noiseSpeed, group)

    this.sprites = {
      normal: '🤢',
      dead: '🪦'
    }

    this.sprite.image = this.sprites.normal
    this.killed = false
  }

  kill () {
    this.killed = true
    this.sprite.image = this.sprites.dead
    // kinematic bodies keep integrating position from their last velocity
    // every physics step regardless of move() - without this the tombstone
    // drifts forever instead of staying put.
    this.sprite.vel = { x: 0, y: 0 }
  }

  move (soldiers, humans, doctors) {
    if (this.killed) return

    super.move()

    for (let soldier of soldiers) {
      if (this.proximityTo(soldier) < 50) {
        this.steerAway(soldier, 2)
        break
      }
    }

    for (let doctor of doctors) {
      if (this.proximityTo(doctor) < 50) {
        this.steerAway(doctor, 2)
        break
      }
    }

    for (let human of humans) {
      if (this.proximityTo(human) < 100) {
        this.steerToward(human, 3)
        break
      }
    }
  }
}
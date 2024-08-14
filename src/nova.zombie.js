import Mobile from './nova.mobile.js'

export default class Zombie extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed) {
    super(ctx, x, y, speed, noiseSpeed)

    this.sprites = {
      normal: '🤢',
      dead: '🪦'
    }

    this.sprite.image = this.sprites.normal
    this.killed = false

    return this
  }

  kill() {
    this.killed = true
    this.sprite.image = this.sprites.dead
  }

  // something like "world" would be a better reference....
  move (soldiers, humans, doctors) {
    if (this.killed) return

    super.move()

    // Avoid soldiers
    for (let soldier of soldiers) {
      if (this.proximityTo(soldier) < 50) {
        let angle = this.ctx.atan2(this.y - soldier.y, this.x - soldier.x)
        this.x += this.ctx.cos(angle) * 2
        this.y += this.ctx.sin(angle) * 2
        break
      }
    }

    // Avoid doctors
    for (let doctor of doctors) {
      if (this.proximityTo(doctor) < 50) {
        let angle = this.ctx.atan2(this.y - doctor.y, this.x - doctor.x)
        this.x += this.ctx.cos(angle) * 2
        this.y += this.ctx.sin(angle) * 2
        break
      }
    }

    // move towards humans
    for (let human of humans) {
      if (this.proximityTo(human) < 100) {
        let angle = this.ctx.atan2(human.y - this.y, human.x - this.x)
        this.x += this.ctx.cos(angle) * 3
        this.y += this.ctx.sin(angle) * 3
        break
      }
    }
  }
}
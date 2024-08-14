import Mobile from './nova.mobile.js'

export default class Doctor extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed) {
    super(ctx, x, y, speed, noiseSpeed)

    this.x = this.ctx.random(this.ctx.width)
    this.y = this.ctx.random(this.ctx.height)

    this.sprite.image = '⛑'
    this.waiting = false
  }

  move (zombies) {
    if (this.waiting) return

    super.move()

    const targetDistance = 100

    // move towards a zombie
    for (let zombie of zombies.filter(z => !z.killed)) {
      if (this.proximityTo(zombie) < 100) {
        let angle = this.ctx.atan2(this.y - zombie.y, this.x - zombie.x)
        this.x -= this.ctx.cos(angle) * 5
        this.y -= this.ctx.sin(angle) * 5
        break
      }
    }
  }

  wait () {
    this.waiting = true
    setTimeout(() => (this.waiting = false), 3000)
  }
}

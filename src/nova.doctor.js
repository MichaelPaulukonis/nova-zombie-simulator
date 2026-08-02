import Mobile from './nova.mobile.js'

export default class Doctor extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed, group) {
    super(ctx, x, y, speed, noiseSpeed, group)

    this.sprite.image = '⛑'
    this.waiting = false
  }

  move (zombies) {
    if (this.waiting) return

    super.move()

    for (let zombie of zombies.filter(z => !z.killed)) {
      if (this.proximityTo(zombie) < 100) {
        this.steerToward(zombie, 5)
        break
      }
    }
  }

  wait () {
    this.waiting = true
    setTimeout(() => (this.waiting = false), 3000)
  }
}

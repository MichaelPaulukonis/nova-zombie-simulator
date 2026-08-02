import Mobile from './nova.mobile.js'

export default class Human extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed, group) {
    super(ctx, x, y, speed, noiseSpeed, group)

    this.sprite.image = '😃'
  }

  move (zombies, player) {
    super.move()

    for (let zombie of zombies.filter(z => !z.killed)) {
      if (this.proximityTo(zombie) < 50) {
        this.steerAway(zombie, 2)
        break
      }
    }
    if (this.proximityTo(player) < 50) {
      this.steerAway(player, 2)
    }
  }
}

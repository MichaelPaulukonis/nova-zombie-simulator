import Mobile from './nova.mobile.js'

export default class Soldier extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed, group) {
    super(ctx, x, y, speed, noiseSpeed, group)

    this.sprite.text = '✭'
    this.sprite.textSize = 20
    this.sprite.textColor = 'yellow'
    this.sprite.color = 'olive'
  }

  move (player, zombies) {
    super.move()

    if (this.proximityTo(player) < 200) {
      this.steerToward(player, 2)
    } else {
      for (let zombie of zombies.filter(z => !z.killed)) {
        if (this.proximityTo(zombie) < 200) {
          this.steerToward(zombie, 2)
          break
        }
      }
    }
  }
}

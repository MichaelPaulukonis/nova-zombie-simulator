import Mobile from './nova.mobile.js'

export default class Soldier extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed) {
    super(ctx, x, y, speed, noiseSpeed)

    // mmmmm hrm
    this.x = this.ctx.random(this.ctx.width)
    this.y = this.ctx.random(this.ctx.height)

    this.sprite.text = '✭'
    this.sprite.textSize = 20
    this.sprite.textColor = 'yellow'
    this.sprite.color = 'olive'
  }

  move (player, zombies) {
    super.move()

    // TODO: we can concievable move twice now, towards 2 things
    // this is like an illegal speed up

    // Move towards player 
    if (this.proximityTo(player) < 200) {
      let angle = this.ctx.atan2(player.y - this.y, player.x - this.x)
      this.x += this.ctx.cos(angle) * 2
      this.y += this.ctx.sin(angle) * 2
    }

    // Move towards a zombie
    for (let zombie of zombies.filter(z => !z.killed)) {
      if (this.proximityTo(zombie) < 200) {
        let angle = this.ctx.atan2(this.y - zombie.y, this.x - zombie.x)
        this.x -= this.ctx.cos(angle) * 2
        this.y -= this.ctx.sin(angle) * 2
        break
      }
    }
  }
}

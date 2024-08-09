import Mobile from './nova.mobile.js'

export default class Human extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed) {
    super(ctx, x, y, speed, noiseSpeed)

    this.sprite.image = '😃'
  }

  move (zombies, player) {
    super.move()
    
    this.x += this.ctx.map(this.ctx.noise(this.noiseOffsetX), 0, 1, -2, 2)
    this.y += this.ctx.map(this.ctx.noise(this.noiseOffsetY), 0, 1, -2, 2)
    this.noiseOffsetX += 0.001
    this.noiseOffsetY += 0.001

    // Wrap-around logic
    if (this.x < 0) this.x = this.ctx.width
    if (this.x > this.ctx.width) this.x = 0
    if (this.y < 0) this.y = this.ctx.height
    if (this.y > this.ctx.height) this.y = 0

    // Avoid player and zombies
    for (let zombie of zombies) {
      if (this.ctx.dist(this.x, this.y, zombie.x, zombie.y) < 50) {
        this.x += (this.x - zombie.x) * 0.05
        this.y += (this.y - zombie.y) * 0.05
        break
      }
    }
    if (this.ctx.dist(this.x, this.y, player.x, player.y) < 50) {
      this.x += (this.x - player.x) * 0.05
      this.y += (this.y - player.y) * 0.05
    }
  }

  display () {
    this.sprite.x = this.x
    this.sprite.y = this.y
  }
}

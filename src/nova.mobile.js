export default class Mobile {
  constructor (ctx, x, y, speed = 2, noiseSpeed = 0.001) {
    this.ctx = ctx
    this.x = x || this.ctx.random(this.ctx.width)
    this.y = y || this.ctx.random(this.ctx.height)
    this.noiseOffsetX = this.ctx.random(1000)
    this.noiseOffsetY = this.ctx.random(1000)
    this.speed = speed
    this.noiseSpeed = noiseSpeed
    this.sprite = new ctx.Sprite(this.x, this.y, 20)
  }

  move () {
    this.x += this.ctx.map(
      this.ctx.noise(this.noiseOffsetX),
      0,
      1,
      -this.speed,
      this.speed
    )
    this.y += this.ctx.map(
      this.ctx.noise(this.noiseOffsetY),
      0,
      1,
      -this.speed,
      this.speed
    )
    this.noiseOffsetX += this.noiseSpeed
    this.noiseOffsetY += this.noiseSpeed

    // Wrap-around logic
    if (this.x < 0) this.x = this.ctx.width
    if (this.x > this.ctx.width) this.x = 0
    if (this.y < 0) this.y = this.ctx.height
    if (this.y > this.ctx.height) this.y = 0
  }

  display () {
    this.sprite.x = this.x
    this.sprite.y = this.y
  }

  touches (other) {
    return this.ctx.dist(this.x, this.y, other.x, other.y) < 20
  }

  proximityTo (sprite) {
    return this.ctx.dist(this.x, this.y, sprite.x, sprite.y)
  }
}

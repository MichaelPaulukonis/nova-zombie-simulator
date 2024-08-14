import Mobile from './nova.mobile.js'

export default class Player extends Mobile {
  constructor (ctx, x, y, livesMax, imgs) {
    super(ctx, x, y, null, null) // hunh, what will Mobile do now ....
    this.livesMax = livesMax
    this.reset()
    this.x = x || this.x
    this.y = y || this.y

    this.sprites = {
      normal: imgs.normal,
      invulnerable: imgs.invuln
    }

    this.setSprite(this.sprites.normal)
    // this.sprite.diameter = 20
    // this.sprite.image = this.sprites.normal
    // this.sprite.image.width = 20
    // this.sprite.image.height = 20
    // this.sprite.debug = true
  }

  setSprite (img) {
    this.sprite.image = img
    // this.sprite.diameter = 20
    this.sprite.image.width = 20
    this.sprite.image.height = 20
  }

  reset () {
    this.x = this.ctx.width / 2
    this.y = this.ctx.height / 2
    this.lives = this.livesMax
    this.invulnerable = false
  }

  move () {
    if (this.ctx.keyIsDown(this.ctx.LEFT_ARROW)) this.x -= 5
    if (this.ctx.keyIsDown(this.ctx.RIGHT_ARROW)) this.x += 5
    if (this.ctx.keyIsDown(this.ctx.UP_ARROW)) this.y -= 5
    if (this.ctx.keyIsDown(this.ctx.DOWN_ARROW)) this.y += 5

    // Wrap-around logic
    if (this.x < 0) this.x = this.ctx.width
    if (this.x > this.ctx.width) this.x = 0
    if (this.y < 0) this.y = this.ctx.height
    if (this.y > this.ctx.height) this.y = 0
  }

  killed () {
    this.lives--
    this.invulnerable = true
    // this.sprite.image = this.sprites.invulnerable
    this.setSprite(this.sprites.invulnerable)

    setTimeout(() => {
      // this.sprite.image = this.sprites.normal
      this.setSprite(this.sprites.normal)
      this.invulnerable = false
    }, 2000)
  }
}

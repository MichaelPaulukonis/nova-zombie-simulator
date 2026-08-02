import Mobile from './nova.mobile.js'

export default class Player extends Mobile {
  constructor (ctx, x, y, livesMax, imgs, group) {
    super(ctx, x, y, null, null, group)
    this.livesMax = livesMax
    this.reset()
    this.x = x || this.x
    this.y = y || this.y
    this.invulnerable = false

    this.sprites = {
      normal: imgs.normal,
      invulnerable: imgs.invuln
    }

    this.setSprite(this.sprites.normal)
  }

  setSprite (img) {
    this.sprite.image = img
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
    let dx = 0
    let dy = 0
    if (this.ctx.kb.pressing('left')) dx -= 5
    if (this.ctx.kb.pressing('right')) dx += 5
    if (this.ctx.kb.pressing('up')) dy -= 5
    if (this.ctx.kb.pressing('down')) dy += 5

    this.sprite.vel = { x: dx, y: dy }
  }

  killed () {
    this.lives--
    this.invulnerable = true
    this.setSprite(this.sprites.invulnerable)

    setTimeout(() => {
      this.setSprite(this.sprites.normal)
      this.invulnerable = false
    }, 2000)
  }
}

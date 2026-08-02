export default class Mobile {
  constructor (ctx, x, y, speed = 2, noiseSpeed = 0.001, group = null) {
    this.ctx = ctx
    this.x = x || this.ctx.random(this.ctx.width)
    this.y = y || this.ctx.random(this.ctx.height)
    this.noiseOffsetX = this.ctx.random(1000)
    this.noiseOffsetY = this.ctx.random(1000)
    this.speed = speed
    this.noiseSpeed = noiseSpeed
    const SpriteCtor = group ? group.Sprite : ctx.Sprite
    this.sprite = new SpriteCtor(this.x, this.y, 20, 'kinematic')
  }

  move () {
    const dx = this.ctx.map(
      this.ctx.noise(this.noiseOffsetX),
      0,
      1,
      -this.speed,
      this.speed
    )
    const dy = this.ctx.map(
      this.ctx.noise(this.noiseOffsetY),
      0,
      1,
      -this.speed,
      this.speed
    )
    this.noiseOffsetX += this.noiseSpeed
    this.noiseOffsetY += this.noiseSpeed

    this.sprite.vel = { x: dx, y: dy }
  }

  // Adds a nudge on top of whatever velocity move() already set this frame.
  // Used by subclasses for proximity-based seek/avoid AI.
  steerToward (target, speed) {
    const angle = this.ctx.atan2(target.y - this.y, target.x - this.x)
    const v = this.sprite.vel
    this.sprite.vel = {
      x: v.x + this.ctx.cos(angle) * speed,
      y: v.y + this.ctx.sin(angle) * speed
    }
  }

  steerAway (target, speed) {
    const angle = this.ctx.atan2(this.y - target.y, this.x - target.x)
    const v = this.sprite.vel
    this.sprite.vel = {
      x: v.x + this.ctx.cos(angle) * speed,
      y: v.y + this.ctx.sin(angle) * speed
    }
  }

  display () {
    // Sync entity position from the sprite AFTER q5play's physics step has
    // moved it — this is now the source of truth (reversed from the old
    // direct this.x -> sprite.x write).
    this.x = this.sprite.x
    this.y = this.sprite.y

    // Screen wrap is an intentional exception to "never teleport a sprite":
    // it's a rare edge event (once per screen-width traversal), not a
    // per-frame position write, so the brief overlap-detection gap at the
    // wrap instant is an acceptable tradeoff.
    if (this.x < 0) this.sprite.x = this.x = this.ctx.width
    if (this.x > this.ctx.width) this.sprite.x = this.x = 0
    if (this.y < 0) this.sprite.y = this.y = this.ctx.height
    if (this.y > this.ctx.height) this.sprite.y = this.y = 0
  }

  touches (other) {
    return this.ctx.dist(this.x, this.y, other.x, other.y) < 20
  }

  proximityTo (sprite) {
    return this.ctx.dist(this.x, this.y, sprite.x, sprite.y)
  }
}

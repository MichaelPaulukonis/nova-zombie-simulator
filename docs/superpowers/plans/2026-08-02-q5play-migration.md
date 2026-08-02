# q5play Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace p5.js/p5play/planck with q5.js/q5play across Nova Zombie Simulator, converting hand-rolled position mutation to velocity-driven kinematic movement and the 5 gameplay-critical `touches()` checks to q5play group `overlaps()` callbacks, while folding in the applicable bug fixes/cleanups from `docs/plans/03.src-code-review.md`.

**Architecture:** Every `Mobile` entity becomes a `kinematic`-type q5play Sprite belonging to a per-type `Group` (`humans`, `zombies`, `soldiers`, `doctors`). Perlin-noise wander and proximity-based steering AI are preserved unchanged in *behavior*, but now write to `sprite.vel` instead of mutating `x`/`y` directly (required so q5play's physics-based overlap detection works — direct position writes break it). The 5 real contact events (bite, shoot, heal) move from nested `for` loops with `dist()` checks to `group.overlaps(otherGroup, callback)`.

**Tech Stack:** q5 (^4.7), q5play (^4.3), Vite (existing). No test framework exists in this project (per `CLAUDE.md`) and none is being introduced — verification at each task is a manual `npm run dev` playtest, per the design doc's own testing strategy.

**Design doc:** `docs/plans/04.q5play-migration.md` — read this first for the *why* behind every decision below. This plan is the *how*.

---

## Confirmed q5play API (verified against q5play 4.3.0 / q5 4.7.5 source, since context7 coverage is thin)

- `new group.Sprite(x, y, diameter, physicsType)` — circle-shorthand constructor, same shape as today's `new ctx.Sprite(x, y, 20)`, with a group prefix and physics type added.
- `sprite.vel = { x, y }` — **must assign the whole object.** The getter returns a plain (non-reactive) object; `sprite.vel.x = 5` does NOT update physics velocity. Confirmed in `q5play.js`: `set vel(val) { this._setVel(val[0] ?? val.x, val[1] ?? val.y) }`.
- `new q.Group()` creates a group; sprites created via `new someGroup.Sprite(...)` are auto-added to it.
- `group.overlaps(target, callback)` where `target` is another Group or a single Sprite; callback receives `(spriteFromThisGroup, spriteFromTarget)`.
- `q.kb.presses('p')` — one-shot on key-down, equivalent to old `p.kb.pressed('p')`. (q5play's `kb.pressed()` means something different — "on release" — confirmed in source: `pressed(inp) { return this.released(inp) }`. Do not use `pressed()`.)
- `sprite.image = '🤢'` (emoji string) works unchanged — q5play auto-wraps any string without a `.` into a built-in `EmojiImage`. No change needed to existing emoji-as-image assignments in Human/Zombie/Doctor.
- World gravity defaults to `(0, 0)` — no explicit setup needed for this top-down game.
- `sprite.remove()` exists, removes the sprite from its group(s) and the world.
- Both `q` and `q5play` packages are global-attach side-effect scripts (`window.Q5 = ...`), imported the same way as today's `p5js-wrapper`/`p5play`.

---

## Task 1: Dependency and bootstrap swap

**Files:**
- Modify: `package.json`
- Modify: `src/nova-zombie-simulator.js:1-4` (imports only)
- Modify: `src/nova-zombie-simulator.js:27` (`new p5` → `new Q5`)

- [ ] **Step 1: Swap dependencies**

Edit `package.json` dependencies block from:

```json
  "dependencies": {
    "p5": "^1.10.0",
    "p5js-wrapper": "^1.2.3",
    "p5play": "^3.22.11",
    "planck": "^1.0.2"
  }
```

to:

```json
  "dependencies": {
    "q5": "^4.7.5",
    "q5play": "^4.3.0"
  }
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: lockfile updates, no peer-dependency errors. `node_modules/q5` and `node_modules/q5play` exist.

- [ ] **Step 3: Swap the import block**

In `src/nova-zombie-simulator.js`, replace lines 1-4:

```js
await import('p5js-wrapper')
window.planck = await import('planck')
await import('p5play')
await import('p5js-wrapper/sound')
```

with:

```js
await import('q5')
await import('q5play')
```

- [ ] **Step 4: Swap the instance constructor**

In `src/nova-zombie-simulator.js`, change line 27 from:

```js
new p5(p => {
```

to:

```js
new Q5(p => {
```

(Keep the parameter name `p` for now — every reference to `p.` inside the closure stays valid since q5play mirrors p5's instance-mode API. Renaming to `q` is cosmetic and out of scope for this migration.)

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Expected: dev server starts, browser opens, title screen ("Nova Zombie Simulator" / "Click to Start") renders on a 600x600 canvas, same as before the change. Entities won't move correctly yet (Task 2 handles that) — clicking Start may show static or oddly-behaving sprites, that's expected at this checkpoint.

Check the browser console for errors. `Uncaught Error: q5play requires q5.js to be loaded first` means the import order in Step 3 is wrong — `q5` must load before `q5play`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/nova-zombie-simulator.js
git commit -m "chore: swap p5/p5play/planck for q5/q5play"
```

---

## Task 2: `Mobile` base class — kinematic sprites, velocity movement, steering helpers

**Files:**
- Modify: `src/nova.mobile.js` (full rewrite)

This is the structural core of the migration. Every subclass's `move()` currently mutates `this.x`/`this.y` directly for both wander and steer-toward/away AI; this task converts both to velocity, and centralizes the screen-wrap and steering math that's currently duplicated across `Human`, `Zombie`, `Soldier`, `Doctor`.

- [ ] **Step 1: Rewrite `nova.mobile.js`**

```js
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
```

Note the constructor now accepts an optional `group` argument — Task 7 passes the appropriate q5play Group when constructing each entity type; when omitted (e.g. HELP screen preview sprites, if any remain), it falls back to `ctx.Sprite` same as today.

`touches()` stays — it's still used by nothing after Task 7 removes the 5 gameplay call sites, but leaving it costs nothing and keeps `proximityTo()`'s sibling intact for reference. (If you want it gone, that's a `03` §7 follow-on, not required here.)

- [ ] **Step 2: Manual verification**

This class alone won't visibly change anything until subclasses are updated in Tasks 3-6 (they still call the old duplicated wrap/steer code, which will now run alongside the new velocity-based `move()` and produce double-counted movement). **Do not run the dev server for a meaningful check until Task 6 is done** — just confirm no syntax errors:

Run: `node --check src/nova.mobile.js`
Expected: no output (valid syntax).

- [ ] **Step 3: Commit**

```bash
git add src/nova.mobile.js
git commit -m "refactor: Mobile uses kinematic velocity movement, adds steerToward/steerAway"
```

---

## Task 3: `Human` — fix double-movement bug, drop redundant `display()`

**Files:**
- Modify: `src/nova.human.js` (full rewrite)

**Files:**

- [ ] **Step 1: Rewrite `nova.human.js`**

```js
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
```

This removes the pre-existing bug (`03` §7 #2): the old code called `super.move()` — which already applied noise wander — then repeated the *same* noise-offset math inline, doubling wander speed and burning the noise offset twice per frame. It also removes the custom `display()` override, which was byte-identical to `Mobile.display()` and no longer needed now that `Mobile.display()` does the sprite-to-entity sync.

The original avoid-zombie/avoid-player logic used a different formula (`this.x += (this.x - zombie.x) * 0.05`, a proportional pull-away rather than a fixed-speed steer) — this plan intentionally normalizes it to the same `steerAway(target, speed)` helper used by Zombie/Soldier/Doctor for consistency (`03` §7 #3, dedup steer math). Speed `2` approximates the original's effect at typical distances; treat exact feel-matching as a playtest tuning pass, not a blocking requirement — see Task 8 checklist.

- [ ] **Step 2: Commit**

```bash
git add src/nova.human.js
git commit -m "fix: remove double-movement bug in Human, dedupe steer/display via Mobile"
```

---

## Task 4: `Soldier` — drop redundant re-randomize, use `steerToward`

**Files:**
- Modify: `src/nova.soldier.js` (full rewrite)

- [ ] **Step 1: Rewrite `nova.soldier.js`**

```js
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
```

Two things folded in from `03` §7:
- **#5**: deleted the redundant `this.x = this.ctx.random(...)` / `this.y = ...` lines right after `super()` — dead code the original author flagged with `// mmmmm hrm`, since `super()` already randomizes when `x`/`y` are null.
- **#3**: the original "move towards zombie" branch used a `-=` formula (`angle = atan2(this.y - zombie.y, this.x - zombie.x); this.x -= cos(angle)*2`) — this is mathematically identical to `steerToward(zombie, 2)` (negating a from-target angle equals a to-target angle), just written differently. Verified equivalent before collapsing it into the shared helper.

- [ ] **Step 2: Commit**

```bash
git add src/nova.soldier.js
git commit -m "refactor: Soldier uses steerToward, drops redundant re-randomize"
```

---

## Task 5: `Doctor` — drop redundant re-randomize, use `steerToward`

**Files:**
- Modify: `src/nova.doctor.js` (full rewrite)

- [ ] **Step 1: Rewrite `nova.doctor.js`**

```js
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
```

Same two fixes as Soldier: dropped the redundant re-randomize (`03` §7 #5), collapsed the `-=`-formula seek-zombie branch into `steerToward(zombie, 5)` (verified mathematically equivalent, `03` §7 #3).

- [ ] **Step 2: Commit**

```bash
git add src/nova.doctor.js
git commit -m "refactor: Doctor uses steerToward, drops redundant re-randomize"
```

---

## Task 6: `Zombie` — use `steerToward`/`steerAway`

**Files:**
- Modify: `src/nova.zombie.js` (full rewrite)

- [ ] **Step 1: Rewrite `nova.zombie.js`**

```js
import Mobile from './nova.mobile.js'

export default class Zombie extends Mobile {
  constructor (ctx, x, y, speed, noiseSpeed, group) {
    super(ctx, x, y, speed, noiseSpeed, group)

    this.sprites = {
      normal: '🤢',
      dead: '🪦'
    }

    this.sprite.image = this.sprites.normal
    this.killed = false
  }

  kill () {
    this.killed = true
    this.sprite.image = this.sprites.dead
  }

  move (soldiers, humans, doctors) {
    if (this.killed) return

    super.move()

    for (let soldier of soldiers) {
      if (this.proximityTo(soldier) < 50) {
        this.steerAway(soldier, 2)
        break
      }
    }

    for (let doctor of doctors) {
      if (this.proximityTo(doctor) < 50) {
        this.steerAway(doctor, 2)
        break
      }
    }

    for (let human of humans) {
      if (this.proximityTo(human) < 100) {
        this.steerToward(human, 3)
        break
      }
    }
  }
}
```

Dropped the stray `return this` at the end of the old constructor (had no effect — constructors return `this` implicitly — dead code, safe to remove while rewriting this file).

Zombie's `kill()` still only flags `this.killed = true` — the actual removal-from-group/array happens in the `soldiers.overlaps(zombies, ...)` callback in Task 7 (`03` §7 #4, the leak fix).

- [ ] **Step 2: Commit**

```bash
git add src/nova.zombie.js
git commit -m "refactor: Zombie uses steerToward/steerAway helpers"
```

---

## Task 7: `Player` — velocity-based movement

**Files:**
- Modify: `src/nova.player.js` (full rewrite)

- [ ] **Step 1: Rewrite `nova.player.js`**

```js
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
```

Player does not call `super.move()` — it never did (arrow-key control replaces wander entirely, same as the original). Screen wrap for the player is inherited via `Mobile.display()`, same as every other entity — the original `Player.move()` had its own copy of the wrap block; this rewrite removes that duplication (`03` §7 #3) since `Mobile.display()` now owns it exclusively.

Switched from `ctx.keyIsDown(ctx.LEFT_ARROW)` to `ctx.kb.pressing('left')` — q5play's `kb` object is already being loaded (Task 1) and used elsewhere (Task 9's pause/help toggle), so this keeps input handling on one consistent API instead of mixing q5-core `keyIsDown` and q5play's `kb`. `pressing()` returns a truthy frame-count while held, matching the original `keyIsDown`'s "true every frame while held" semantics (confirmed in q5play source: `pressing(inp) { ... return v == -3 ? 1 : v > 0 ? v : 0 }`).

- [ ] **Step 2: Commit**

```bash
git add src/nova.player.js
git commit -m "refactor: Player uses velocity-based movement via kb.pressing"
```

---

## Task 8: `nova-zombie-simulator.js` — groups, overlaps, kb rename, HELP screen fix

**Files:**
- Modify: `src/nova-zombie-simulator.js`

This is the largest task: entity arrays become q5play Groups, the 5 `touches()` call sites become `overlaps()` callbacks, `p.kb.pressed` becomes `p.kb.presses`, the dead double-build of `gameObjs` is removed, and the HELP screen stops instantiating real entities.

- [ ] **Step 1: Add group creation in `p.setup`**

In `src/nova-zombie-simulator.js`, find `p.setup` and add group creation right after canvas setup (before the restart button), storing them on `params`:

```js
  p.setup = () => {
    let gameContainer = p.createDiv('')
    gameContainer.id('game-container')

    let canvas = p.createCanvas(600, 600)
    canvas.parent(gameContainer)

    p.frameRate(30)
    p.noStroke()
    p.textStyle(p.BOLD)
    p.textFont(emojiFont)

    params.humans = new p.Group()
    params.zombies = new p.Group()
    params.doctors = new p.Group()
    params.soldiers = new p.Group()

    let restartButton = p.createButton('Start')
    restartButton.parent(gameContainer)
    restartButton.mousePressed(startGame)
  }
```

- [ ] **Step 2: Update `params` initial object**

Change the `params` object literal (around line 60) so the four entity fields start as `null` instead of `[]` — they're created as Groups in `p.setup` now, not plain arrays, and `p.setup` always runs before `resetLevel()`/`startGame()` can be called:

```js
  let params = {
    mode: gameMode.ATTRACT,
    previousMode: gameMode.ATTRACT,
    score: 0,
    level: 0,
    livesMax: 3,
    painted: false,
    humans: null,
    zombies: null,
    doctors: null,
    soldiers: null,
    player: {},
    doctorLimit: 1,
    humanLimit: 12,
    soldierLimit: 2,
    helpObjs: []
  }
```

Note `gameObjs` is removed entirely from `params` — it was only ever a throwaway array-of-arrays for iterating during hide/show/reset, and its "build it twice" bug (`03` §7 #6) goes away naturally once we replace it with a plain local array of the four groups wherever it's needed (Step 3 below).

- [ ] **Step 3: Rewrite `resetLevel()`**

```js
  function resetLevel () {
    const groups = [params.humans, params.zombies, params.doctors, params.soldiers]
    groups.forEach(group => group.removeAll())

    for (let i = 0; i < params.humanLimit; i++) {
      new Human(p, null, null, undefined, undefined, params.humans)
    }
    for (let i = 0; i < params.soldierLimit; i++) {
      new Soldier(p, null, null, -2.5, 0.02, params.soldiers)
    }
    for (let i = 0; i < params.doctorLimit; i++) {
      new Doctor(p, null, null, -2.5, 0.001, params.doctors)
    }
    params.level++
    if (params.level % 2 === 0) {
      params.soldierLimit++
      params.humanLimit += 2
    }
    params.mode = gameMode.PLAYING
  }
```

`group.removeAll()` replaces the manual `objs.forEach(o => o.sprite.remove())` loop — it's a q5play Group method that removes every sprite currently in the group. Entities are no longer tracked in a parallel JS array (`params.humans` etc. used to be `[]` of `Human` instances) — the Group itself holds the sprites, and each entity instance is reachable via the group's sprite collection. This is a deliberate simplification enabled by moving to groups: iteration in `playloop()` (Step 5) walks `params.humans.sprites` — wait, **q5play doesn't wrap sprites back into your JS class instances.** See the important caveat in Step 4 before proceeding.

- [ ] **Step 4: Reconcile group membership with entity-instance tracking (important caveat)**

q5play Groups hold `Sprite` instances, not your `Human`/`Zombie`/etc. wrapper objects. The existing code needs the wrapper objects (for `.move()`, `.x`/`.y`, `.killed`, `.waiting`, etc.), not just their sprites. Keep parallel JS arrays **alongside** the groups — the group's only job is enabling `overlaps()`; the array is still what `playloop()` iterates to call `.move()`/`.display()`.

Revise `resetLevel()` from Step 3 to populate both:

```js
  function resetLevel () {
    const groups = [params.humans, params.zombies, params.doctors, params.soldiers]
    groups.forEach(group => group.removeAll())

    params.humanList = []
    params.zombieList = []
    params.soldierList = []
    params.doctorList = []

    for (let i = 0; i < params.humanLimit; i++) {
      params.humanList.push(new Human(p, null, null, undefined, undefined, params.humans))
    }
    for (let i = 0; i < params.soldierLimit; i++) {
      params.soldierList.push(new Soldier(p, null, null, -2.5, 0.02, params.soldiers))
    }
    for (let i = 0; i < params.doctorLimit; i++) {
      params.doctorList.push(new Doctor(p, null, null, -2.5, 0.001, params.doctors))
    }
    params.level++
    if (params.level % 2 === 0) {
      params.soldierLimit++
      params.humanLimit += 2
    }
    params.mode = gameMode.PLAYING
  }
```

`params.zombieList` starts empty each level (zombies only appear via human conversion during play, same as today) — no zombie creation loop needed here, matching the original code.

Add the four list arrays to the initial `params` object from Step 2 as well: `humanList: [], zombieList: [], soldierList: [], doctorList: []`.

- [ ] **Step 5: Rewrite `playloop()` — arrays for iteration/AI, groups for overlap events**

```js
  async function playloop () {
    params.painted = false
    p.background(220)
    p.textFont(emojiFont)
    params.player.move()
    params.player.display()

    if (params.player.lives <= 0) {
      params.mode = gameMode.GAME_OVER
      sound.scream.play()
      return
    }

    for (let human of params.humanList) {
      human.move(params.zombieList, params.player)
      human.display()
    }

    for (let zombie of params.zombieList) {
      zombie.move(params.soldierList, params.humanList, params.doctorList)
      zombie.display()
    }

    for (let soldier of params.soldierList) {
      soldier.move(params.player, params.zombieList)
      soldier.display()
    }

    for (let doctor of params.doctorList) {
      doctor.move(params.zombieList)
      doctor.display()
    }

    if (params.humanList.length === 0) {
      params.mode = gameMode.ROUND_OVER
      sound.bell.play()
      await sleep(1000)
      resetLevel()
    }

    displayScore()
  }
```

All five `touches()`-driven state changes move out of this loop entirely — they're now event-driven via the `overlaps()` callbacks registered once in `p.setup` (Step 6), not polled every frame inside nested loops. This is the direct fix for `03` §7 #9/#10 (library underuse, O(n⁴) loops): `playloop()` no longer does any pairwise distance checking for contact events, only for AI steering (which stays in each entity's own `move()`, using `proximityTo()`, unchanged).

- [ ] **Step 6: Register the 5 overlap callbacks in `p.setup`**

Add this block to `p.setup`, after the group creation from Step 1:

```js
    params.humans.overlaps(params.zombies, (human, zombie) => {
      const humanEntity = params.humanList.find(h => h.sprite === human)
      const zombieEntity = params.zombieList.find(z => z.sprite === zombie)
      if (!humanEntity || zombieEntity.killed) return
      sound.nomnom.play()
      humanEntity.sprite.remove()
      params.humanList.splice(params.humanList.indexOf(humanEntity), 1)
      params.zombieList.push(new Zombie(p, humanEntity.x, humanEntity.y, undefined, undefined, params.zombies))
    })

    params.soldiers.overlaps(params.zombies, (soldier, zombie) => {
      const zombieEntity = params.zombieList.find(z => z.sprite === zombie)
      if (!zombieEntity || zombieEntity.killed) return
      sound.gunshot.play()
      zombieEntity.kill()
      params.zombieList.splice(params.zombieList.indexOf(zombieEntity), 1)
      zombieEntity.sprite.remove()
    })

    params.doctors.overlaps(params.zombies, (doctor, zombie) => {
      const doctorEntity = params.doctorList.find(d => d.sprite === doctor)
      const zombieEntity = params.zombieList.find(z => z.sprite === zombie)
      if (!doctorEntity || !zombieEntity || zombieEntity.killed || doctorEntity.waiting) return
      doctorEntity.wait()
      sound.heal.play()
      zombieEntity.sprite.remove()
      params.zombieList.splice(params.zombieList.indexOf(zombieEntity), 1)
      params.humanList.push(new Human(p, zombieEntity.x, zombieEntity.y, undefined, undefined, params.humans))
    })
```

Player-involved overlaps use `sprite.overlaps(target, callback)` on the individual sprite rather than a group (player is a single entity, not a group member):

```js
    // player.sprite isn't created until startGame() runs, so wire these up
    // lazily the first time startGame() creates the player — see Step 7.
```

Move to Step 7 for the player-specific wiring, since `params.player.sprite` doesn't exist until `startGame()` constructs it.

Note on `03` §7 #4 (the killed-zombie leak): the `soldiers.overlaps(zombies, ...)` callback above splices the zombie entity out of `params.zombieList` immediately on kill, instead of leaving it flagged-but-present forever. This is the fix — `Zombie.kill()` itself still just flags `killed = true` (Task 6), but nothing reads that flag as "leave it in the array" anymore since it's removed here directly.

- [ ] **Step 7: Wire up player overlaps and array/list bookkeeping in `startGame()`**

```js
  function startGame () {
    params.level = 0
    params.score = 0
    resetLevel()
    if (params.player.sprite) {
      params.player.sprite.remove()
    }
    params.player = new Player(p, null, null, params.livesMax, images.player)

    params.player.sprite.overlaps(params.humans, (playerSprite, human) => {
      const humanEntity = params.humanList.find(h => h.sprite === human)
      if (!humanEntity) return
      sound.bite.play()
      humanEntity.sprite.remove()
      params.humanList.splice(params.humanList.indexOf(humanEntity), 1)
      params.zombieList.push(new Zombie(p, humanEntity.x, humanEntity.y, undefined, undefined, params.zombies))
      params.score++
    })

    params.player.sprite.overlaps(params.soldiers, (playerSprite, soldier) => {
      if (params.player.invulnerable) return
      params.player.killed()
      sound.gunshot.play()
    })

    params.mode = gameMode.PLAYING
    if (sound.thing) {
      sound.thing.setVolume(1.0)
      sound.thing.loop()
    }
  }
```

- [ ] **Step 8: Rename `kb.pressed` to `kb.presses` in `handleKeyInput`**

```js
  function handleKeyInput () {
    if (p.kb.presses('p') || p.kb.presses(' ')) {
      if (params.mode === gameMode.PLAYING) pauseGame()
      else if (params.mode === gameMode.PAUSED) unpauseGame()
    } else if (p.kb.presses('h')) {
      if (params.mode === gameMode.HELP) {
        params.mode = params.previousMode
        removeHelp()
      } else {
        params.previousMode = params.mode
        params.mode = gameMode.HELP
        params.painted = false
      }
    } else if (params.mode === gameMode.GAME_OVER) {
      startGame()
    }
  }
```

- [ ] **Step 9: Fix `hideGameObjects`/`showGameObjects` for group-based tracking**

```js
  const hideGameObjects = () => {
    [params.humanList, params.zombieList, params.doctorList, params.soldierList]
      .forEach(list => list.forEach(o => (o.sprite.visible = false)))
    if (params.player.sprite) params.player.sprite.visible = false
  }

  const showGameObjects = () => {
    [params.humanList, params.zombieList, params.doctorList, params.soldierList]
      .forEach(list => list.forEach(o => (o.sprite.visible = true)))
    if (params.player.sprite) params.player.sprite.visible = true
  }
```

- [ ] **Step 10: Rewrite `displayHelp()` to stop instantiating real entities**

This is `03` §7 #8 — the HELP screen used to construct real `Human`/`Soldier`/`Zombie`/`Doctor`/`Player` instances (each now a real kinematic Sprite with a Box2D body) purely to draw a static legend icon. Replace with direct emoji/text drawing:

```js
  const displayHelp = () => {
    hideGameObjects()

    p.clear()
    p.background(220)
    p.fill(0)
    p.textSize(32)
    p.textAlign(p.CENTER)
    p.textFont(emojiFont)

    p.text('😃', 70, 100)
    p.text('✭', 70, 130)
    p.text('🤢', 70, 160)
    p.text('⛑', 70, 190)
    p.text('🥵', 70, 220)
    p.text('🥵', 70, 250)

    p.textAlign(p.LEFT)
    p.textSize(16)

    p.textFont(displayFont)
    p.text('Human: tasty!', 100, 105)
    p.text('Soldier: beware!', 100, 135)
    p.text('Zombie: your babies! (you can ignore them now)', 100, 165)
    p.text('Doctor: No worries, but heals zombies back to life', 100, 195)
    p.text('Player: Move with arrow keys, bite humans, avoid soldiers', 100, 225)
    p.text('Player: after being shot and returning to un-life, you are briefly invulnerable', 100, 255, 300)
    p.textFont(emojiFont)

    params.painted = true
  }
```

`helpObjs` and `removeHelp()`'s `helpObjs.forEach(o => o.sprite?.remove())` loop are no longer needed since nothing is instantiated — simplify `removeHelp()`:

```js
  const removeHelp = () => {
    showGameObjects()
    params.painted = false
  }
```

Remove the `helpObjs` field from `params` and the `let helpObjs = []` module-level declaration — both are now dead.

The player emoji placeholder (`🥵`) approximates the original image-based player sprite for the legend only; the actual player still renders with the real image assets everywhere else. If you'd rather show the real player image files here instead of an emoji, that's a cosmetic follow-up, not a migration blocker.

- [ ] **Step 11: Manual verification**

Run: `npm run dev`, click Start, and walk through the full checklist from `docs/plans/04.q5play-migration.md`'s Testing Strategy section:

- All 5 overlap events fire (player bites human, zombie bites human, soldier kills player, soldier kills zombie, doctor heals zombie)
- Wander movement looks the same as pre-migration `main` (no jitter, no doubled human speed)
- Screen wrap works for every entity type
- Player arrow-key movement feels the same (no lag/drift)
- HELP screen (`h` key) shows the legend without constructing real entities — check browser dev tools' console for absence of new Sprite-creation-related warnings when opening HELP
- PAUSED / GAME_OVER / ATTRACT screens still work
- Round-over/reset correctly clears and repopulates each level
- Killed zombies (tombstone emoji) disappear rather than persisting forever — leave a soldier near a zombie for several rounds and confirm the zombie count doesn't include stale kills

- [ ] **Step 12: Commit**

```bash
git add src/nova-zombie-simulator.js
git commit -m "feat: migrate collision detection to q5play groups/overlaps, fix HELP screen entity waste"
```

---

## Task 9: Attribution element CSS accommodation

**Files:**
- Modify: `css/style.css`

q5play's Creator License requires an attribution element (`#made-with-q5play`) injected into the page at runtime. Confirm what it looks like once Task 1 is verified working, then adjust layout.

- [ ] **Step 1: Inspect the injected element**

Run: `npm run dev`, open browser dev tools, inspect the DOM for an element with id `made-with-q5play` (or search for "q5play" in the Elements panel if the id differs from what's expected).

- [ ] **Step 2: Add a layout rule**

Add to `css/style.css` (exact selector/positioning depends on what Step 1 finds — this is a placeholder for the *rule*, not the content, since the actual DOM structure can only be confirmed once q5play is running):

```css
#made-with-q5play {
  position: fixed;
  bottom: 8px;
  right: 8px;
}
```

Adjust `position`/`bottom`/`right` values based on where the element actually lands relative to the centered `#game-container` from the existing flexbox layout (`html, body { display: flex; ... }`) — the goal is "visible and not overlapping the canvas or Start button," not a specific pixel position.

- [ ] **Step 3: Manual verification**

Confirm visually: canvas and Start button remain centered as before (commit `7c13f74`'s centering isn't broken), and the attribution element is visible somewhere on the page without covering game content.

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "style: accommodate q5play attribution element in layout"
```

---

## Task 10: Delete dead file

**Files:**
- Delete: `src/single_sketch.js`

- [ ] **Step 1: Confirm it's unreferenced**

Run: `grep -rn "single_sketch" --include=*.html --include=*.js .`
Expected: no matches (already confirmed during planning — this is a re-check before deleting).

- [ ] **Step 2: Delete it**

```bash
git rm src/single_sketch.js
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove orphaned single_sketch.js"
```

---

## Task 11: Build and deploy verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: succeeds, `dist/` contains bundled output including any WASM assets Box2D needs.

- [ ] **Step 2: Preview the production build**

Run: `npm run preview`
Expected: same manual checklist as Task 8 Step 11, run against the built output instead of the dev server — this catches asset-path issues (like Box2D's WASM binary) that only show up in a bundled build.

- [ ] **Step 3: GH Pages base-path check**

Run: `DEPLOY_ENV=GH_PAGES npm run build`
Expected: succeeds. Then run: `npx serve dist -l 4173` (or any static server) and manually verify the game loads and plays correctly when served from a path prefix — this specifically checks that Box2D's WASM binary (loaded via `import.meta.resolve('box2d3-wasm')` at runtime, per the design doc's risk section) resolves correctly under a non-root base path, not just at `/`.

If this fails, the fix is likely a Vite `optimizeDeps`/`assetsInclude` adjustment for the WASM file — do not proceed to an actual `npm run deploy` until this checks out locally.

- [ ] **Step 4: Do not run `npm run deploy` as part of this plan**

Actually publishing to GH Pages is a separate, explicit user decision (it pushes to a public branch) — stop here and hand back to the user once Steps 1-3 pass.

---

## Plan self-review notes

- **Spec coverage:** every numbered design decision in `04.q5play-migration.md` (§1 deps, §2 bootstrap, §3 movement, §4 collision, §5 input, §6 attribution) has a corresponding task. All of §7's carried-in `03` fixes (#2, #3, #4, #5, #6, #8, #9, #10, #11) are addressed in Tasks 2-10 as noted inline.
- **Type/name consistency:** `steerToward`/`steerAway` (Task 2) are used with identical signatures in Tasks 3-6. `params.humanList`/`zombieList`/`soldierList`/`doctorList` (introduced Task 8 Step 4) are used consistently through Steps 5-9 — the earlier `params.humans` (Step 1) is reserved exclusively for the q5play Group, never mixed with the List arrays.
- **No test framework introduced** — every verification step is a manual playtest instruction, matching this project's actual state (no Vitest/Playwright configured, per `CLAUDE.md`) rather than inventing test infrastructure this plan wasn't asked to add.

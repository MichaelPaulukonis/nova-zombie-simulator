# Auto-versioning on Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-bump `package.json` version from conventional commits on deploy, embed it at build time, and display it on the attract screen and HELP overlay.

**Architecture:** A zero-dependency Node script (`scripts/bump-version.js`) classifies the bump level (major/minor/patch) from `git log` since the last tag, bumps `package.json`, and commits+tags locally. It runs as the first step of the existing `predeploy` npm script. `vite.config.js` reads the (possibly just-bumped) version and injects it as a `define`d global `__APP_VERSION__`, available in both `npm run dev` and `npm run build`. Two small render additions in `src/nova-zombie-simulator.js` display it.

**Tech Stack:** Plain Node.js (`fs`, `child_process`), no new dependencies. Project has no test framework configured (per `CLAUDE.md` — don't assume Vitest/Playwright exist), so verification steps below are manual: run the script/build and inspect actual output, per task.

**Git policy note:** This repo's convention (`CLAUDE.md`) is: never commit unless explicitly asked. The tasks below do **not** end with a commit step — instead, after all tasks are done, stage changes and report them, and wait for the user to explicitly say "commit." This is separate from `bump-version.js` itself creating a `chore(release):` commit — that's the feature's own designed runtime behavior when a developer later actually runs `npm run deploy`, not something this plan's execution should trigger. **Do not run `npm run deploy` or `npm run predeploy` for real during implementation/testing** — either would create a real, irreversible-ish version-bump commit and git tag. Test `bump-version.js` only via its `--dry-run` flag (Task 1).

---

### Task 1: `bump-version.js` script

**Files:**
- Create: `scripts/bump-version.js`

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PKG_PATH = path.join(__dirname, '..', 'package.json')
const DRY_RUN = process.argv.includes('--dry-run')

function run (cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function assertCleanWorkingTree () {
  const status = run('git status --porcelain')
  if (status.length > 0) {
    console.error('bump-version: working tree is dirty, refusing to bump.\n' + status)
    process.exit(1)
  }
}

function lastTag () {
  try {
    return run('git describe --tags --abbrev=0')
  } catch (err) {
    return null
  }
}

// Records are separated by \x03, hash/message within a record by \x00 -
// both are control chars that won't appear in normal commit messages.
function commitMessagesSince (tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD'
  const raw = run(`git log ${range} --pretty=format:%H%x00%B%x03`)
  if (!raw) return []
  return raw.split('\x03').filter(Boolean).map(entry => {
    const [hash, message] = entry.split('\x00')
    return { hash, message: message.trim() }
  })
}

function classifyBump (messages) {
  let hasFeat = false
  for (const { message } of messages) {
    const firstLine = message.split('\n')[0]
    if (/^\w+(\(.+\))?!:/.test(firstLine) || /BREAKING CHANGE/.test(message)) {
      return 'major'
    }
    if (/^feat(\(.+\))?:/.test(firstLine)) {
      hasFeat = true
    }
  }
  return hasFeat ? 'minor' : 'patch'
}

function bumpVersion (version, level) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (level === 'major') return `${major + 1}.0.0`
  if (level === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function main () {
  assertCleanWorkingTree()

  const tag = lastTag()
  const messages = commitMessagesSince(tag)

  if (messages.length === 0) {
    console.log('bump-version: nothing to release, skipping.')
    return
  }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
  const level = classifyBump(messages)
  const newVersion = bumpVersion(pkg.version, level)

  console.log(`bump-version: ${pkg.version} -> ${newVersion} (${level}, ${messages.length} commit(s) since ${tag || 'repo start'})`)

  if (DRY_RUN) {
    console.log('bump-version: --dry-run, not writing changes.')
    return
  }

  pkg.version = newVersion
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n')

  run('git add package.json')
  run(`git commit -m "chore(release): v${newVersion}"`)
  run(`git tag -a v${newVersion} -m "v${newVersion}"`)

  console.log(`bump-version: tagged v${newVersion}. Push with: git push --follow-tags`)
}

main()
```

- [ ] **Step 2: Verify dry-run against real repo history**

Run: `node scripts/bump-version.js --dry-run`

Expected: prints a line like `bump-version: 0.1.0 -> 0.1.1 (patch, 16 commit(s) since repo start)` (exact count/level depends on current `git log`, since this repo has zero tags today — every commit on the branch counts as "since repo start"). Then `bump-version: --dry-run, not writing changes.` `package.json` must be unchanged (`git status --porcelain` shows nothing).

- [ ] **Step 3: Verify dirty-tree guard**

Run:
```bash
echo '// scratch' >> scripts/bump-version.js
node scripts/bump-version.js --dry-run
git checkout -- scripts/bump-version.js
```

Expected: second command exits non-zero and prints `bump-version: working tree is dirty, refusing to bump.` followed by the `git status --porcelain` output showing the modified file. Third command restores the clean script (this is a scratch-file check, not a real edit — reverting it is expected and safe).

Note: until `scripts/bump-version.js` itself is committed, it's an untracked file, so `assertCleanWorkingTree()` correctly reports the tree as dirty even before the `// scratch` line is appended (this is intentional — the guard catches any uncommitted state, not just modifications to tracked files). `git checkout -- scripts/bump-version.js` only works once the file is tracked; on an untracked file, remove the appended line manually instead (`sed -i '' '$ d' scripts/bump-version.js` or equivalent).

- [ ] **Step 4: Verify "nothing to release" path**

Run: `node scripts/bump-version.js --dry-run` a second time immediately after Step 2 (no new commits made in between).

Expected: same output as Step 2 — commits since the last tag haven't changed, so this doesn't hit the zero-commit path yet (there is no tag yet in this repo, so "nothing to release" can't be exercised until after a real tag exists — that's expected, not a bug; the check will be exercised naturally the first time someone runs a real deploy twice in a row without new commits).

---

### Task 2: Wire `bump-version.js` into `predeploy`

**Files:**
- Modify: `package.json:8`

- [ ] **Step 1: Update the `predeploy` script**

Change line 8 of `package.json` from:
```json
    "predeploy": "DEPLOY_ENV=GH_PAGES npm run build",
```
to:
```json
    "predeploy": "node scripts/bump-version.js && DEPLOY_ENV=GH_PAGES npm run build",
```

- [ ] **Step 2: Verify the wiring without triggering a real bump**

Do **not** run `npm run predeploy` or `npm run deploy` (both would perform a real commit+tag via the now-live script). Instead confirm the composed command is correct by reading it back:

Run: `node -e "console.log(require('./package.json').scripts.predeploy)"`

Expected output: `node scripts/bump-version.js && DEPLOY_ENV=GH_PAGES npm run build`

---

### Task 3: Inject `__APP_VERSION__` via Vite

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Read `package.json` and add the `define` block**

Replace the full contents of `vite.config.js` with:
```js
// vite.config.js
const { resolve } = require('path')
const { defineConfig } = require('vite')
const pkg = require('./package.json')

module.exports = defineConfig({
  base: process.env.DEPLOY_ENV === 'GH_PAGES' ? '/nova-zombie-simulator/' : '',
  assetsInclude: ['**/**/*.wav'],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    port: 5173, // Vite's new default port (less likely to conflict)
    strictPort: false, // automatically find next available port if busy
    open: true, // automatically open browser
    host: true // listen on all addresses, helps with port detection
  },
  build: {
    target: 'esnext', //browsers can handle the latest ES features
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
  }
})
```

- [ ] **Step 2: Verify the define is picked up by a build**

Run: `npm run build`

Expected: build succeeds (exit 0). Then run:
```bash
grep -r "0.1.0" dist/assets/*.js | head -1
```
Expected: at least one match — the literal current `package.json` version string appears in the built JS bundle, confirming `define` substituted `__APP_VERSION__` at build time rather than leaving it as an undefined global.

---

### Task 4: Show version on the attract screen

**Files:**
- Modify: `src/nova-zombie-simulator.js` (inside `displayTitleScreen`, currently ending around line 435)

- [ ] **Step 1: Add the corner stamp**

Find the end of `displayTitleScreen(ctx)`:
```js
  ctx.textSize(18)
  ctx.text('by Michael and Anthony Paulukonis', ctx.width / 2, ctx.height / 2 + 200)
  ctx.textFont(emojiFont)
}
```
Replace with:
```js
  ctx.textSize(18)
  ctx.text('by Michael and Anthony Paulukonis', ctx.width / 2, ctx.height / 2 + 200)

  ctx.textFont(displayFont)
  ctx.textSize(12)
  ctx.textAlign(ctx.RIGHT, ctx.BOTTOM)
  ctx.fill(150)
  ctx.text(`v${__APP_VERSION__}`, ctx.width - 10, ctx.height - 10)

  ctx.textFont(emojiFont)
}
```

- [ ] **Step 2: Verify via build output**

Run: `npm run build`

Expected: exit 0, no errors about `__APP_VERSION__` being undefined (it's a build-time `define`, so an undefined reference would be a ReferenceError only at *runtime* in the browser, not at build time — this build-succeeds check confirms syntax only; Step 3 confirms runtime behavior).

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`, open the app (auto-opens), and on the attract/title screen confirm a small dim `v0.1.0` (or current version) appears in the bottom-right corner. Click elsewhere on the screen to confirm it doesn't interfere with the existing "Click to Start" behavior.

---

### Task 5: Show version on the HELP overlay

**Files:**
- Modify: `src/nova-zombie-simulator.js:323-357` (`displayHelp`)

- [ ] **Step 1: Add the version line after the existing rows loop**

Find:
```js
    for (const row of helpRows) {
      // both icon types share the same (x, y) center so rows line up
      // regardless of whether the icon is emoji text or an image
      if (row.image) {
        p.imageMode(p.CENTER)
        p.image(row.image(), iconX, y, 32, 32)
      } else {
        p.textAlign(p.CENTER, p.CENTER)
        p.textSize(32)
        p.textFont(emojiFont)
        p.text(row.icon, iconX, y)
      }

      p.textAlign(p.LEFT, p.CENTER)
      p.textSize(16)
      p.textFont(displayFont)
      p.text(row.text, textX, y)

      y += rowHeight
    }

    p.textFont(emojiFont)
  }
```
Replace with:
```js
    for (const row of helpRows) {
      // both icon types share the same (x, y) center so rows line up
      // regardless of whether the icon is emoji text or an image
      if (row.image) {
        p.imageMode(p.CENTER)
        p.image(row.image(), iconX, y, 32, 32)
      } else {
        p.textAlign(p.CENTER, p.CENTER)
        p.textSize(32)
        p.textFont(emojiFont)
        p.text(row.icon, iconX, y)
      }

      p.textAlign(p.LEFT, p.CENTER)
      p.textSize(16)
      p.textFont(displayFont)
      p.text(row.text, textX, y)

      y += rowHeight
    }

    p.textAlign(p.LEFT, p.CENTER)
    p.textSize(14)
    p.textFont(displayFont)
    p.fill(100)
    p.text(`Version: v${__APP_VERSION__}`, textX, y + 10)
    p.fill(0)

    p.textFont(emojiFont)
  }
```

- [ ] **Step 2: Verify in the browser**

With `npm run dev` still running (from Task 4 Step 3), press `h` to open the HELP overlay and confirm a `Version: v0.1.0` line (dimmer than the other rows) appears below the existing entity rows. Press `h` again to confirm it still closes and restores gameplay correctly (`removeHelp()` path untouched).

---

### Task 6: Wrap up

- [ ] **Step 1: Full manual pass**

With `npm run dev` running: confirm attract screen shows the version stamp (Task 4), press `h` to confirm HELP shows the version line (Task 5), press `h` again and confirm gameplay resumes normally, confirm `npm run build` (Task 3 Step 2) still exits 0.

- [ ] **Step 2: Stage changes and report — do not commit**

Run: `git status --porcelain` and `git diff --stat`

Report to the user: files changed (`scripts/bump-version.js` created; `package.json`, `vite.config.js`, `src/nova-zombie-simulator.js` modified), confirmation all manual verification steps passed, and that no commit was made — per repo convention, wait for explicit "commit this" before running `git add`/`git commit`.

- [ ] **Step 3: Close the beads issue (after user confirms and commits)**

Once the user has reviewed and committed: `bd close nova-zombie-simulator-2p0 --reason="auto-versioning on deploy + display on attract/HELP screens"`. Do not close before the user has actually committed the work — a closed issue with uncommitted/discarded code would be a false "done."

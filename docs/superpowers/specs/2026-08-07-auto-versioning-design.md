# Auto-versioning on deploy

Status: approved
Related issue: nova-zombie-simulator-2p0 (Add semver display to help/launch screen)

## Problem

No way to tell which build is deployed. `package.json` version (`0.1.0`) is
never bumped and never shown anywhere in the running game. Bumping is
currently entirely manual (i.e. never happens).

## Prior art

`genart-monorepo` solves this with Nx release: independent per-app
versioning, conventional-commits-driven bump (feat → minor, fix/other →
patch, BREAKING CHANGE → major), git tag per project, invoked manually (not
on every commit, not in CI). Per-app vite plugin
(`apps/dragline/vite.config.js`) generates a `version-constants.js` from
`package.json` at build time for the UI to import.

nova-zombie-simulator is a single-package repo with no Nx and minimal
tooling (only `vite`, `gh-pages`, `q5`, `q5play` as deps today). Full Nx is
too heavy for one small game — this design reuses the same *logic*
(conventional-commits bump, tag per release) with a small zero-dependency
script instead of Nx, and vite's built-in `define` instead of a generated
file.

## Design

### 1. Bump script — `scripts/bump-version.js` (new, Node built-ins only)

Run manually via `predeploy`, not on every commit and not in CI.

Steps:
1. Abort if the working tree is dirty (anything already uncommitted before
   the script runs) — a bump commit should only ever contain the version
   change.
2. Find last release tag: `git describe --tags --abbrev=0`. If none exists
   (true today — repo has zero tags), treat "since last tag" as "since the
   beginning of history."
3. Collect commit subjects since that point: `git log <tag>..HEAD --pretty=%s`.
4. Classify the bump level:
   - any subject contains `!:` (e.g. `feat!:`) or a commit body contains
     `BREAKING CHANGE` → **major**
   - else any subject starts with `feat:` → **minor**
   - else → **patch** (covers `fix:`, `chore:`, `docs:`, `refactor:`, etc.,
     and is the fallback when nothing else matches)
5. If there are zero commits since the last tag (deploy re-run on unchanged
   code), skip entirely: print "nothing to release," exit 0, no file
   changes, no tag.
6. Bump `package.json`'s `version` field in place (manual
   major/minor/patch increment — no semver dependency).
7. `git add package.json && git commit -m "chore(release): vX.Y.Z"`, then
   `git tag -a vX.Y.Z -m "vX.Y.Z"` (annotated, not lightweight — required
   for `git push --follow-tags` in step 8 to actually push it).
8. Does **not** push. Commit and tag stay local. Pushing to origin (and
   thus sharing the release tag) stays a manual `git push --follow-tags`
   step the developer runs deliberately — this script automates the
   version *decision*, not publishing.

### 2. Wiring — `package.json` `predeploy`

```json
"predeploy": "node scripts/bump-version.js && DEPLOY_ENV=GH_PAGES npm run build"
```

Bump happens before build, so the bumped version is what's embedded in the
built bundle that `deploy` publishes.

### 3. Injection — `vite.config.js`

```js
import fs from 'fs'
// ...
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)))

export default defineConfig({
  // ...
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
})
```

No generated file (unlike genart's dragline plugin) — `define` is a plain
build-time string substitution, available in both `npm run dev` and
`npm run build`. In dev it reflects whatever's currently in `package.json`
(not "bumped," since bumping only happens in `predeploy`).

### 4. Display

- **Attract screen** (`displayTitleScreen()` in
  `src/nova-zombie-simulator.js`): one small, dim line in the bottom-right
  corner, e.g. `v0.1.0`.
- **HELP overlay** (`helpRows` array, same file): one more row rendered
  after the existing loop (or appended as a row-like entry), e.g.
  `Version: v0.1.0`.

Both read from the same `__APP_VERSION__` global — no duplicate version
logic.

## Error handling

- Dirty working tree at script start → abort, non-zero exit, deploy fails
  loudly rather than bumping over unrelated changes.
- No commits since last tag → skip silently (exit 0), deploy proceeds with
  unchanged version.
- `git describe` failure (no tags yet) is the expected first-run case, not
  an error — handled by treating it as "since beginning of history."

## Out of scope

- Pushing tags/commits to origin (stays manual).
- CHANGELOG generation (genart has this via Nx; not requested here).
- CI-triggered releases.

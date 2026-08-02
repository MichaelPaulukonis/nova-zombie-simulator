# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Nova Zombie Simulator - browser p5.js/p5play game. Player controls zombie, converts humans, avoids soldiers (shoot), evades/uses doctors (heal zombies back to human). Designed by Anthony, coded by Michael (+ LLM assists).

## Commands

```bash
npm install       # setup
npm run dev       # vite dev server (port 5173, auto-open)
npm run build     # production build to dist/
npm run preview   # serve dist/ locally
npm run deploy    # build + gh-pages publish (DEPLOY_ENV=GH_PAGES sets base path)
```

No lint, no test suite currently configured (despite aspirational testing section in `.github/copilot-instructions.md` — don't assume Vitest/Playwright exist until actually set up).

## Architecture

Single p5.js sketch, instance mode, entry `src/nova-zombie-simulator.js`. Everything else is entity classes imported into that one file — there is no game-engine layer, no build-time entity registry.

**Entity hierarchy**: `nova.mobile.js` (`Mobile` base class) → extended by `nova.human.js`, `nova.zombie.js`, `nova.soldier.js`, `nova.doctor.js`, `nova.player.js`. `Mobile` owns position (`x`/`y`), Perlin-noise wander movement, screen wrap, a p5play `Sprite`, and `touches()`/`proximityTo()` distance checks. Entities keep their own `x`/`y` as source of truth and copy into `sprite.x`/`sprite.y` in `display()` — don't assume the sprite position is authoritative.

**Game loop and state**: all mutable game state lives in one `params` object inside the `new p5(p => {...})` closure in `nova-zombie-simulator.js` (score, level, lives, and parallel arrays `humans`/`zombies`/`doctors`/`soldiers`/`player`). No sprite groups or ECS — collision/interaction is plain nested-loop `for` iteration with `.touches()` checks and manual `.splice()`/`.push()` between the arrays each frame in `playloop()`.

**Game modes**: a `gameMode` string-enum object (`ATTRACT`, `PLAYING`, `PAUSED`, `ROUND_OVER`, `GAME_OVER`, `HELP`) drives a big if-chain in `p.draw()`. `params.previousMode` lets `HELP` overlay any state and restore it on exit. `params.painted` is a manual dirty flag so static screens (paused/game-over/help) only render once instead of every frame.

**Entity transformation, not destruction**: humans becoming zombies, zombies being healed back to humans, etc. are modeled as: remove old sprite, `new` the other class at the same x/y, splice old array / push new array — not a state field on one persistent object.

**Round/level flow**: `resetLevel()` clears and respawns humans/soldiers/doctors (not the player), increments `level`, and every even level raises `soldierLimit`/`humanLimit` for difficulty ramp. `startGame()` additionally resets score/level to 0 and recreates the player.

**Async pause**: round-over transition (`playloop`) does `await sleep(1000)` before `resetLevel()` — the sketch draw loop is async-tolerant here, not standard p5 pattern.

**p5play/planck loaded via dynamic import** at the top of `nova-zombie-simulator.js` (`p5js-wrapper`, `planck` as `window.planck`, `p5play`, sound plugin) before the p5 instance is constructed — order matters, don't reorder these imports.

## Docs conventions (from `.github/copilot-instructions.md`)

- `docs/overview.md` — architecture/feature reference, keep in sync with real structure.
- `docs/plans/NN.semantic-name.md` — refactor/design plans, two-digit prefix, kebab-case name. When a plan changes mid-implementation, append reasoning to the same file rather than rewriting history.
- Module-specific AI-context docs (if added) go in `docs/src/`, mirroring `src/` structure.
- Commit messages: Conventional Commits style (`docs:`, `feat:`, `fix:`, etc.).

## Notes

- No persistent state / save system yet.
- No TypeScript yet (plain JS throughout; `.github/copilot-instructions.md` notes a possible future migration).
- No CSS framework currently in use, styling is `css/style.css`.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

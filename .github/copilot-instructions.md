## Copilot Instructions for Nova Zombie Simulator

# Project Context

- This is a p5.js and p5play game focused on canvas rendering performance and game mechanics.
- Currently no persistent state management (future consideration for game saves).
- Security is minimal (no sensitive data, no authentication).

# Documentation

- **Project Architecture and Features:**  
  Reference `../docs/overview.md`.
- **Module Documentation:**  
  Place concise, context-focused overviews for AI-assisted development in `../docs/src/`, mirroring the module folder structure.
- **Plans and Refactor Documentation:**  
  Save all refactor plans, implementation outlines, and significant design changes in `docs/plans/` (e.g., `docs/plans/game-entity-refactor.md`).  
  - When a plan changes during implementation, append the reasons and changes to the same markdown file; do not erase the original plan.

# Copilot Guidance

- **Never assume missing context or make guesses. If any part of the request is unclear or ambiguous, ask the user for clarification before proceeding.**
- **Always specify the target file or files for any code or modification suggestions.**
- **Write modular, reusable code.** Split logic into distinct functions, classes, or modules as appropriate.
- **All code must be fully optimized:**  
  - Maximize algorithmic efficiency (runtime and memory).  
  - Follow project style conventions.  
  - Avoid unnecessary code and technical debt.
- **Do not agree with me by default.** Your role is to assist by providing the best technical guidance, even if it means constructively challenging my assumptions or requests.
- **When generating code, first outline your plan in pseudocode or comments, then provide the code.**  
  - Save these plans and any refactor documentation according to the Documentation section above.
- **Keep responses concise and focused.** Use Markdown formatting for clarity.
- **Never generate or suggest code that violates copyright or project policies.**

# Technology Preferences

- Use **JavaScript** for all development (TypeScript migration planned for future).
- Use **p5.js** and **p5play** for all game rendering and physics.
- Use **Vite** for build tooling and development server.
- Use **Conventional Commits** for commit messages.
- Use Node.js v22 LTS for best compatibility.
  - Current date: July 9, 2025

# Code Style

- Use JavaScript for all files.
- Use p5.js and p5play idioms: instance mode, `setup()`/`draw()` lifecycle, event handlers (`mousePressed`, `keyPressed`), sprite groups, collision detection.
- Prefer pure functions and immutable data where possible.
- Use relative imports for project modules.
- camelCase for variables/functions, PascalCase for classes/components.
- Document complex game mechanics and physics interactions.
- Handle canvas and game state errors gracefully.

# Game Patterns

- Use p5play sprite groups for entity management (zombies, humans, soldiers, etc.).
- Implement game state management for different screens (menu, game, game over).
- Use collision detection for game interactions.
- Optimize for game loop performance in `draw()` function.

# Accessibility

- Use semantic HTML for UI controls.
- Ensure keyboard accessibility for canvas controls.
- Maintain WCAG 2.1 AA color contrast for UI.

# Testing

- Test utility functions (color, coordinates, text).
- Mock p5.js for canvas logic tests.
- Validate UI parameter ranges.
- Test localStorage save/load.
- Use Vitest (preferred) or Jest for utility tests.
- Use Playwright for end-to-end game testing.
- Prioritize visual consistency during refactoring. Create unit tests for parameter handling after refactoring is complete.

# Linting & Style

- Use Standard Style with Vitest globals configured.
- Recommended VS Code extensions: `standard.vscode-standard`, `vitest.explorer`.

# Commit Messages

- Follow Conventional Commits (see `./copilot-commit-message-instructions.md`).
- Use commit messages like: `docs: refactor copilot instructions for improved AI coding guidance`
  - Reorganize instructions into clear sections (Context, Documentation, Guidance)
  - Add TypeScript migration preferences and p5.js canvas optimization focus
  - Include module extraction patterns with canvas-transforms example
  - Specify testing frameworks (Vitest preferred) and Node.js v22 LTS requirement
  - Clarify accessibility requirements for canvas controls and UI
  - Add linting configuration details for Standard Style with Vitest globals

# Module Extraction Example: Game Entities

- Extract game entity logic from main game file to dedicated modules (e.g., `nova.zombie.js`, `nova.human.js`, `nova.soldier.js`).
- Use factory pattern for entity creation with shared behaviors.
- Isolate pure functions for movement, collision detection, and state changes for testing.
- Export constants for entity types, states, and configuration.
- File structure:
  ```
  src/
    nova.zombie.js
    nova.human.js
    nova.soldier.js
    nova.player.js
    nova.doctor.js
    nova.mobile.js
  ```
- Ensure sprite groups are managed at game level, not entity level.
- Instantiate entities after p5play is available in `setup()`.

# Module Extraction Example: Game Systems

- Extract game system code (collision handling, AI behaviors, weapon systems) into separate modules.
- Focus on clean separation between rendering, game logic, and entity management.
- Ensure functions are testable for future automated testing.
- Create modular systems that can be easily extended for new game features.

# Documentation for Modules

- Create a concise overview `.md` file for each major module.
- Optimize the overview to provide context for AI-assisted development rather than human readers.
- Place into  '../docs/src/' in a folder structure that parallels the module structure.
- Create documentation structure that parallels the module structure.

# Dependencies

- Use Node.js v22 LTS.
- If `standard-js` errors occur, update to latest version and reconfigure for Vitest.


---

**Note:** For CSS, prefer TailwindCSS with Flexbox/Grid (under consideration).

---

This file is for Copilot and other AI coding assistants only. Do not display to end users or include in documentation.

# Nova Zombie Simulator - Project Overview

## Project Description
Nova Zombie Simulator is a browser-based zombie survival game where players control a zombie character with the objective of converting humans to zombies while avoiding hostile entities like doctors and military personnel. The game features real-time physics, collision detection, and increasing difficulty as players progress through rounds.

## Web Framework
This project uses **Vite** as the build tool and development server, providing fast development builds and optimized production bundles. Vite handles ES module bundling and serves the application during development.

## Key JavaScript Libraries

### p5.js (v1.10.0)
- **Purpose**: Primary graphics rendering and canvas management
- **Functionality**: Handles all visual rendering, animation loops, canvas creation, and basic game loop management
- **Role in Game**: Renders all game entities, manages the main game loop, handles user input, and provides drawing utilities for sprites and text

### p5.play (v3.22.11)
- **Purpose**: Game physics and sprite management
- **Functionality**: Provides sprite-based collision detection, physics simulation, and entity management
- **Role in Game**: Manages collisions between zombies/humans/soldiers/doctors, handles sprite movement and positioning, and provides touch detection for game interactions

### planck (v1.0.2)  
- **Purpose**: Advanced physics engine
- **Functionality**: Provides robust 2D physics simulation capabilities
- **Role in Game**: Works alongside p5.play to handle complex physics interactions and movement calculations

### p5js-wrapper (v1.2.3)
- **Purpose**: Enhanced p5.js functionality and sound management
- **Functionality**: Extends p5.js with additional utilities and provides sound loading/playback capabilities
- **Role in Game**: Manages game audio including bite sounds, gunshots, screams, and background music

## Core Files

### `/src/nova-zombie-simulator.js`
Main game controller and entry point. Manages game states (attract, playing, paused, game over), handles the main game loop, coordinates all game entities, manages scoring and level progression, and handles user input and audio.

### `/src/nova.mobile.js`
Base class for all moving entities. Provides common movement functionality using Perlin noise for realistic movement patterns, sprite initialization, and basic collision detection framework.

### `/src/nova.player.js`
Player character implementation extending Mobile. Handles zombie player movement via arrow keys, manages player lives and invulnerability states, and implements sprite switching between normal and invulnerable states.

### `/src/nova.human.js`
Human NPC implementation. Manages human behavior including fleeing from zombies and the player, implements conversion to zombie when caught, and handles removal from the game world.

### `/src/nova.zombie.js`
AI zombie implementation. Controls zombie behavior including pursuing humans and avoiding hostile entities, manages zombie lifecycle including death and removal, and implements pack behavior for zombie groups.

### `/src/nova.soldier.js`
Hostile military NPC. Implements aggressive behavior targeting zombies and the player, manages shooting mechanics and collision detection, and provides increasing difficulty as the primary threat to the player.

### `/src/nova.doctor.js`
Support NPC that heals zombies back to humans. Implements healing mechanics with cooldown periods, manages conversion of zombies back to humans, and provides strategic gameplay complexity.

### `/index.html`
Main HTML entry point that loads the game and required stylesheets.

### `/css/style.css`
Game styling and layout definitions.

### `/vite.config.js`
Vite build configuration with GitHub Pages deployment settings and asset handling for audio files.

## Game Mechanics
- **Objective**: Convert all humans to zombies to advance to the next round
- **Controls**: Arrow keys for movement
- **Threats**: Soldiers (shoot zombies), Doctors (heal zombies back to humans)
- **Lives System**: Player has multiple lives with brief invulnerability after being shot
- **Progression**: Increasing numbers of enemies and humans with each round
- **Audio**: Sound effects for bites, gunshots, healing, and ambient music
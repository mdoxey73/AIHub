# Zombie Route Shooter

A self-contained HTML5 game that plays the way the *Z Route: Redemption* ads pretend the app plays: a squad lane-runner with numbered gates, numbered weapon barrels, zombies with HP numbers, and a giant boss at the end of every road. Canvas 2D, no build step, no external assets, no network calls.

## Run

- **Open `index.html` directly** in a browser (the scripts are classic scripts, so `file://` works), or
- serve the folder: `python -m http.server 8000` and open `http://localhost:8000/`.
- **On a phone**: serve the folder on your LAN, open the address in Safari or Chrome, and use "Add to Home Screen" for a full-screen launch.

The playfield is a 9:16 portrait canvas letterboxed into whatever window it gets. Desktop Chrome with device emulation set to a phone is a fine test rig.

## Controls

- **Drag left / right** (touch or mouse) to steer the squad. Everything else is automatic: running, firing, gates, barrels.
- Desktop: **arrow keys** or **A / D** steer, **Space / Enter** taps, **M** mutes.
- Tap the speaker icon (top right) to mute.

## Debug

- `index.html?debug=1` shows FPS and entity counts and enables keys: **n** adds 10 soldiers, **k** kills the boss, **l** skips to the next level, **g** toggles god mode.
- `index.html?level=7` starts the title screen on level 7.
- Progress (highest unlocked level, mute) is stored in `localStorage` under `zrs.save.v1`.

## Files

```
index.html            script load order
css/style.css
js/config.js          every tunable constant: speeds, caps, weapons, zombie and boss stats, colors
js/render/camera.js   pseudo-3D projection (road distance + lane position -> screen x, y, scale)
js/render/sprites.js  code-drawn units, icons, gates, backdrop; sprite and text caches
js/render/road.js     scrolling highway, median, barriers, hazard stripes, posts, roadside props
js/audio.js           WebAudio-synthesized sound effects
js/fx.js              particles, floating numbers, screen shake, flash, hit-stop, banners
js/entities/bullets.js  projectiles, hit resolution, aim assist, area damage
js/entities/gates.js    +k / xk / -k / ÷k gates, chains, shoot-to-upgrade
js/entities/barrels.js  numbered weapon barrels and explosive barrels
js/entities/zombies.js  walker / runner / brute, HP bars and numbers, contact kills
js/entities/boss.js     end-of-level boss, skull HP bar, burn, giant variant
js/entities/squad.js    squad count, formation, drag steering, weapons, drone, vehicle
js/levels.js          levels 1-3 hand-laid; 4-12 from hand-tuned parameter rows; 13+ scaled
js/save.js            localStorage
js/input.js           pointer drag, taps, keyboard
js/main.js            fixed-step loop, level flow, HUD, title / win / lose screens
```

## Tuning

Start in `js/config.js`. Squad speed, perspective (`NEAR`), formation spacing, gate upgrade pacing, weapon damage and fire rates, zombie HP and speed, boss speed and contact damage, pool caps and shake magnitudes are all there. Level layouts and boss HP are in `js/levels.js`: edit the segment lists for levels 1-3 directly, or the parameter rows for 4-12.

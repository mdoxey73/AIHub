---
title: Handoff Prompt — Zombie Route Shooter
date: 2026-10-28
status: current
tags:
  - game-dev
  - handoff
  - zombie-route-shooter
related:
  - "[[build-plan-2026-10-28]]"
  - "[[build-prompt-2026-10-28]]"
---

# Handoff prompt for a new session

> Paste everything below the line as the first message of a new Claude Code cloud session on the mdoxey73/AIHub repository.

---

You are continuing work on **Zombie Route Shooter**, a self-contained HTML5 / Canvas 2D mobile web game that plays the way the *Z Route: Redemption* ads pretend that app plays: a squad lane-runner with numbered gates, numbered barrels, zombies with HP numbers, and a giant boss at the end of every road. It is Dr. Doxey's side project; the real app is a base-builder and this game is deliberately the honest version of the ad.

## Where things are

- Repo `mdoxey73/AIHub`, branch `claude/kind-feynman-vrqk85`. Everything lives under `zombie-route-shooter/`. `main` does not have it yet. Do not merge to `main` unless asked.
- `zombie-route-shooter/game/` is the game. `index.html` + `css/` + `js/` (classic scripts, no build step, runs from `file://`), `manifest.webmanifest` + `sw.js` + `icons/` (installable PWA, offline after first load), `build-single.py` (bundles to `dist/zombie-route-shooter.html`), `test/` (Playwright scripts, see its README).
- Read in this order before touching code: `game/README.md` (run, controls, mechanics, file map), `build-plan-2026-10-28.md` (research evidence, the five locked decisions, and a build log with the whole tuning history), `build-prompt-2026-10-28.md` (the original spec; its numeric tables are superseded by the build log and by `js/config.js` / `js/levels.js`).
- A private playable copy is published at https://claude.ai/artifact/52PVnVuXyQekqi1qR3fbUy (republish from `game/index.html` with the `files` map of every js/css/manifest/icon file to update it; never include `sw.js` there). QR code: `zombie-route-shooter/zombie-route-shooter-qr.png`.

## How the game works now

- Squad auto-runs up a two-lane highway and auto-fires straight ahead. Drag left/right steers. Count `N` is the resource, capped at 9999. 64 soldiers are drawn; damage per bullet carries the whole squad: `effective = min(N,64) + (N-64)^0.75`, spread over the drawn soldiers (`squad.dmgMult`).
- Gates `+k xk -k ÷k`, one lane wide, 12 m apart in chains (never stacked). **Gates absorb bullets** (classic ad behavior) and are pumped by hits: 12 hits for the first upgrade, +10 per further upgrade, uncapped except `+60` / `x4`. So pumping a gate costs the fire that would hit zombies.
- Layout rule (enforced by `fixLayout` in `levels.js` and checked statically): no pack or horde sits 22–46 m behind a gate in its lane (it would still be behind the gate when the squad arrives). Barrels are exempt (they do not move). The runtime trickle spawner (`trickleLane` in `main.js`) obeys the same rule.
- Barrels show HP as a number and must be shot to zero: weapon barrels (pistol, rifle, shotgun, minigun, rpg, drone, vehicle), bonus barrels (`+N` squad, `RATE+` +20% fire rate to 2x, `DMG+` +20% damage to 2x), explosive barrels (area blast, chain, cost 4 soldiers if run into). Barrel HP scales with level (x3 in generated levels). Every level ends with a "boss choice": a high-HP barrel in one lane and a pumpable gate in the other, met while the boss walks in.
- Zombies: walker, runner (from level 3), brute (from level 5). Packs, hordes up to 64 in rows of 10 across both lanes (late hordes mix runners and brutes), and a trickle stream. Contact kills scale by level (x2 from 5, x3 from 9). Zombies home toward the squad over the last 22 m.
- Boss every level, Giant on 5 and 10 with escort hordes; drains `max(10, 15% of N)` soldiers per second on contact; RPG hits set it burning.
- Levels: 1–3 hand-laid in `levels.js`; 4–12 from hand-tuned parameter rows through a seeded generator; 13+ scaled from row 12.

## Verification method (use it before every push)

From `game/test/`: `node ai.js <level>` runs a steering AI (best gate lane, nearby barrels) and prints win/lose, peak N, boss kill time, max zombies. `node dumb.js` runs no-steering levels 1, 3, 6 (should lose). `node run.js` covers the full flow, lose path, stress scene and frame timing. `node phone.js`, `node pwa.js`, `node single.js` cover touch, offline install and the single-file build. Static layout check (no stacked gates, nothing in a gate shadow):

```
cd game && node -e "global.window=global;require('./js/config.js');require('./js/levels.js');const L=ZRS.levels;let bad=0;for(let n=1;n<=15;n++){const lv=L.get(n),g=L.gateList(lv.segs);lv.segs.forEach(s=>{if(s[0]==='pack'&&L.shadowed(g,s[1],s[2]))bad++;if(s[0]==='horde'&&L.shadowed(g,s[1],'B'))bad++;});}console.log('violations',bad)"
```

State at handoff: steering AI wins all twelve levels (level 1 boss in about 11 s, level 10 Giant in about 20 s, 48 to 201 zombies on screen); no-steering runs lose levels 3 and 6 and win the tutorial level 1; static layout check reports 0 gate-shadow violations and 0 stacked gates across levels 1 to 15; single-file build and offline install verified.

## Conventions that matter

- The user is Dr. Doxey (Professor of Accounting, University of Alabama). Address them as Dr. Doxey. Be direct, no preamble, no emojis. Flag errors immediately. Ask one focused question on real ambiguity; otherwise decide and state the assumption.
- Commit and push to `claude/kind-feynman-vrqk85` when work is complete (a stop hook in this account requires untracked files to be committed and pushed). Never commit screenshots from the store or the marketing art. Never add project dependencies without asking (Playwright is pre-installed in the cloud container; the game itself has none).
- Markdown deliverables use Obsidian conventions (YAML frontmatter, `[[links]]`, `#tags`) and kebab-case names with dates.
- When the game files change: bump `VERSION` in `sw.js`, rerun `python3 build-single.py`, republish the artifact, and add an entry to the build log in `build-plan-2026-10-28.md`.

## Open work, in priority order

1. Difficulty tuning by a human. The steering AI is crude (it ignores barrels unless they are close and does not weigh absorbing gates), so its results are a floor, not the truth. Dr. Doxey's feedback drove the last pass: gates were capped and stacked, barrels lacked variety, too few enemies, and zombies hid behind gates. All four are addressed; the feel still needs a hands-on pass.
2. Real-device profiling (never done): check 150+ zombies and 400+ bullets on a mid-range phone; caches and pooling are in place.
3. Visual polish beyond the current pass (outlined sprites, blood decals, debris, sun/clouds, gate glow, vignette): richer boss, muzzle smoke, a desert backdrop skin like the App Store creative, better roadside props.
4. Boss damage pops aggregate over 120 ms and read "-3000"; the ads show "-80". Optional cosmetic cap.
5. GitHub Pages for the installable version is pending Dr. Doxey's decision to merge into `main`.

## Work in progress, 2026-10-31 (three-lane rework, not tuned, not published)

Dr. Doxey asked for: bonuses, enemies and gates each in their own lane (per reference videos "Screen_Recording_20261031_0812xx_YouTube.mp4" to "..._081648_YouTube.mp4" in the mdoxey73 Google Drive, not yet viewed); more enemies with less health; static bonuses in the left lane; more level variety; better art.

Committed so far (runs without errors, balance NOT tuned; the old steering AI is not lane-aware and loses level 1 at about 38 m):
- `config.js`: three lanes (`LANES`, `LANE_X`, `LANE_ROLE`: supply L, enemy M, gate R); zombie HP cut to about a third (walker 9, runner 6, brute 70) plus a new `crawler` (hp 4); `MAX_ZOMBIES` 640; five `THEMES` (city, desert, night, snow, toxic). `GATE_SHADOW` removed.
- `levels.js`: rewritten. All levels come from parameter rows through one generator that fills each lane as its own stream (gate runs with negatives in the breaks, packs/hordes/explosives in the enemy lane, stands in the supply lane). Each level has a theme (cycles by level) and a modifier (swarm, rush, siege, gauntlet, supply). New segment forms are documented at the top of the file. `L.stackedGates(lv)` replaces the old shadow check.
- `zombies.js`: lane-based packs (rows of 4) and hordes (rows of 5, or `'ALL'` for boss escorts), mix fractions incl. crawler, a per-step depth index for bullet hit tests, three skins per type, white hit flash.
- `gates.js`: gates span the gate lane; new drawing (gradient panel, chevron beam, pump progress bar).
- `barrels.js`: supply stands are static plinths (no bob) with the reward mounted on top; explosives spawn at an x inside the enemy lane.
- `main.js`: spawns by lane role; trickle is enemy-lane only; boss escorts span the road; level intro banner (theme title + modifier); contact multiplier now 1x, 2x from level 9.
- `road.js` / `sprites.js`: three lanes with role tints and markings, themed palettes, backdrops and props (cactus, pine, lamp, rock), crawler and stand sprites, shaded soldier helmet, brute armor.
- `squad.js`: squad starts in the middle lane.

Next: view the videos and confirm lane order and enemy density; make `test/ai.js` lane-aware (use `CONFIG.LANE_X` / `LANE_ROLE`); tune levels 1-12; bump `sw.js` VERSION; rebuild single file; republish the artifact. Playwright browsers cannot be downloaded in the current cloud environment (PLAYWRIGHT_DOWNLOAD_HOST is blocked); a Node harness using @napi-rs/canvas in a scratch folder (not a repo dependency) ran levels headlessly and rendered screenshots.

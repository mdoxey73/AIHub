---
title: Handoff Prompt — Zombie Route Shooter
date: 2026-10-28
updated: 2026-10-31
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

You are continuing work on **Zombie Route Shooter**, a self-contained HTML5 / Canvas 2D mobile web game that plays the way the mobile zombie-runner ads pretend those apps play: a three-lane squad runner with a supply lane, an enemy lane and a gate lane, swarms of weak zombies, and a giant boss at the end of every road. It is Dr. Doxey's side project; the real app is a base-builder and this game is deliberately the honest version of the ad.

## Where things are

- Repo `mdoxey73/AIHub`, branch `claude/kind-feynman-vrqk85`. Everything lives under `zombie-route-shooter/`. `main` does not have it yet. Do not merge to `main` unless asked.
- `zombie-route-shooter/game/` is the game. `index.html` + `css/` + `js/` (classic scripts, no build step, runs from `file://`), `manifest.webmanifest` + `sw.js` + `icons/` (installable PWA, offline after first load), `build-single.py` (bundles to `dist/zombie-route-shooter.html`), `test/` (Playwright scripts, see its README).
- Read in this order before touching code: `game/README.md` (run, controls, mechanics, file map), `build-plan-2026-10-28.md` (research evidence, the five locked decisions, and a build log with the whole tuning history), `build-prompt-2026-10-28.md` (the original spec; its numeric tables are superseded by the build log and by `js/config.js` / `js/levels.js`).
- A private playable copy is published at https://claude.ai/artifact/52PVnVuXyQekqi1qR3fbUy (republish from `game/index.html` with the `files` map of every js/css/manifest/icon file to update it; never include `sw.js` there). QR code: `zombie-route-shooter/zombie-route-shooter-qr.png`.

## How the game works now

- Three lanes, each with one job, separated by low walls (green rail on the left divider, blue on the right). **Left = supply**: static crate-stack stands with a big HP number and the reward on top (weapons, `+N` squad, `RATE+`, `DMG+`); they do not move or roll and must be shot to zero. **Middle = enemies**: dense packs and hordes of small, weak zombies (crawler 3 HP, walker 5, runner 4, brute 60), plus explosive barrels and a trickle stream; a pack of 10 or more shows one shared red count chip instead of per-zombie numbers. **Right = gates**: long runs of consecutive `+1` (later `+2`) tiles at 1.7 m spacing that apply as you pass them, each run capped by a big pumpable gate (`+k`, sometimes `x2`, `x3` only late), with red `-` tiles or a `÷`/`-` gate in the breaks.
- Squad auto-runs and auto-fires; drag steers across all three lanes. `N` capped at 9999; damage per bullet carries `min(N,64) + (N-64)^0.75` effective shooters. Bullets **pierce**: a kill passes the leftover damage on, up to 6 zombies per bullet (`BULLET_PIERCE`); RPG rockets plow through small zombies and explode on a brute, boss, stand or when spent. Big gates still absorb bullets and are pumped by hits; tiles do not absorb.
- Zombies home toward the squad inside 13 m. Contact kills 1x, 2x from level 9 (brutes 4).
- Six themes cycle by level (city, desert, Rust River Bridge with water and girders, night, snow, toxic) and each level has a modifier (swarm, rush, siege, gauntlet, supply, flood). Level 7 is FLOOD: one giant horde past the halfway mark.
- Boss every level, Giant on 5 and 10 with full-width escort hordes; the trickle stops once the boss spawns.
- All levels come from per-level parameter rows through one seeded generator in `levels.js` that fills each lane as its own stream; 13+ scale from row 12.

## Verification method (use it before every push)

Headless Chrome: Playwright's own browser download is blocked in the cloud container. Fetch Chrome for Testing into a scratch folder (not a repo dependency) and point the tests at it:

```
npx @puppeteer/browsers install chrome-headless-shell@131.0.6778.204 --base-url https://storage.googleapis.com/chrome-for-testing-public
export CHROME_PATH=<path printed above> NODE_PATH=/opt/node-tools/node_modules
```

From `game/test/`: `node ai.js <level>` runs a lane-aware steering AI (supply lane when a stand can be broken in time, gate lane otherwise, dodges negative gates into the enemy lane) and prints win/lose, N at boss, boss kill time, max zombies. Each run takes 90 to 140 s in real time; run four in parallel. `node dumb.js` runs no-steering levels 1, 3, 6 (should lose). `node run.js`, `phone.js`, `pwa.js`, `single.js` cover full flow, touch, offline install and the single-file build. Static check for stacked gates:

```
cd game && node -e "global.window=global;require('./js/config.js');require('./js/levels.js');const L=ZRS.levels;let bad=0;for(let n=1;n<=14;n++)bad+=L.stackedGates(L.get(n));console.log('stacked',bad)"
```

State at handoff (2026-10-31): lane-aware AI wins all twelve levels (level 1 boss in about 13 s, Giants on 5 and 10 in about 17 s, 129 to 530 zombies on screen at peak); no-steering runs lose levels 1, 3 and 6; 0 stacked gates across levels 1 to 14; `run.js`, `phone.js`, `pwa.js` and `single.js` pass with no errors; stress scene holds 60 fps headless.

## Conventions that matter

- The user is Dr. Doxey (Professor of Accounting, University of Alabama). Address them as Dr. Doxey. Be direct, no preamble, no emojis. Flag errors immediately. Ask one focused question on real ambiguity; otherwise decide and state the assumption.
- Commit and push to `claude/kind-feynman-vrqk85` when work is complete (a stop hook in this account requires untracked files to be committed and pushed). Never commit screenshots from the store or the marketing art. Never add project dependencies without asking (Playwright is pre-installed in the cloud container; the game itself has none).
- Markdown deliverables use Obsidian conventions (YAML frontmatter, `[[links]]`, `#tags`) and kebab-case names with dates.
- When the game files change: bump `VERSION` in `sw.js`, rerun `python3 build-single.py`, republish the artifact, and add an entry to the build log in `build-plan-2026-10-28.md`.

## Open work, in priority order

1. Hands-on difficulty pass by Dr. Doxey on the three-lane build (2026-10-31). The AI results are a floor, not the truth.
2. Real-device profiling (never done): the swarms put 130 to 520 zombies on screen; check frame rate on a mid-range phone and lower `MAX_ZOMBIES` or pack sizes if it drops.
3. More art: richer boss, muzzle smoke, more stand and prop variety per theme.
4. Boss damage pops aggregate over 120 ms; optional cosmetic cap.
5. GitHub Pages for the installable version is pending Dr. Doxey's decision to merge into `main`.

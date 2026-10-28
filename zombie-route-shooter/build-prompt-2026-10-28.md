---
title: Build Prompt — Zombie Route Shooter (Z Route ad-style lane runner)
date: 2026-10-28
status: draft-v1
tags:
  - game-dev
  - prompt
  - zombie-route-shooter
related:
  - "[[build-plan-2026-10-28]]"
---

# Build Prompt — Zombie Route Shooter

> Paste everything below the line into a fresh Claude Code session. It is self-contained. The research behind the numbers and the stage plan live in [[build-plan-2026-10-28]].

---

Build me a mobile web game that plays the way the **Z Route: Redemption** playable ads and "barrel shooter" video ads pretend the game plays. I do not want the real app (a 4X base-builder). I want the ad: a squad lane-runner where my squad auto-runs up a highway, auto-fires, grows through numbered gates, breaks numbered barrels to unlock weapons, mows down zombies with HP numbers over their heads, and kills a giant boss with a big HP bar at the end of the road.

Everything below describes that ad format precisely. Match it.

## 1. The reference: what the ads show

**Scene and camera.** Portrait 9:16. Third-person chase camera, elevated about 35–40°, looking straight up a long, dead-straight highway that converges to a horizon roughly a fifth of the way down the screen. Concrete barriers with yellow/black hazard stripes run along both road edges. The road is split by a raised concrete median into **two lanes** (left and right). Dashed white center lines in each lane. Backdrop is a quarantine zone: biohazard signs, "ZONE 7", "QUARANTINE", tanks, cranes, chimneys with green smoke. A second skin is a desert highway with cacti and wrecked cars. Bright, saturated, high-contrast colors.

**The player.** Level 1 starts as a **single survivor** (dark vest, pistol) running up the road and firing straight ahead with a muzzle flash and an orange tracer. As gates add members, the survivor becomes a **squad**: a packed blob of soldiers in a tight grid formation, all firing simultaneously, so dozens of orange tracers stream up the lane at once. The squad slides left/right as a unit. Its count is the core resource.

**Gates.** Translucent colored panels one lane wide, with thin posts on each side, standing at a point on the road. Big, bold, white text with a dark outline: `+1`, `+2`, `+3`, `x3`. Gates come in **chains**: five to ten gates spaced closely in one lane (`+1 +1 +1 +1 …` or `x3 x3 x3 …` or alternating `+3 +2 +1 +3`). Passing through one fires a golden burst with up-arrows around the squad and the squad visibly grows. Gates show bullet-hole decals when shot. Colors in the ads: blue for `+N`, gold for `xN`, magenta as a second "+N" color. For our clone, keep it legible: **blue = add, gold = multiply, red = subtract/divide.**

**Barrels and crates.** Wooden barrels and crates sitting in a lane with a **big number on the front** (`5`, `9`, `168`, `500`, `800`, `999`, `9999`). The number is its HP. Shooting ticks it down. At zero the barrel bursts open. Three kinds:
- **Weapon crate**: a weapon icon hovers above the barrel in a green outline with a yellow ring on the ground (minigun, heavy machine gun, rocket launcher, drone). Break it → the whole squad switches to that weapon.
- **Explosive barrel**: red barrel with sparks. Break it → area explosion that damages zombies around it.
- **Big crate**: very high number (`800`, `9999`), holds the drone or an armored vehicle. Late-level flourish.

**Zombies.** Groups of three to a few dozen shamble down the lane toward the squad. Each has a thin **red HP bar** and red **floating damage numbers** (`-15`, `-25`, `-35`) popping off it as bullets land. Far up the road there are dense hordes. Zombies that reach the squad kill soldiers; the squad shrinks.

**Boss.** A giant zombie (the ads use a huge woman in a red polka-dot dress carrying a spiked mace) walking down the road at the end of the level. It carries a **skull-icon HP bar with a number** above its head (`998`, `932`, `839`, `758`, `678`) and takes big floating hits (`-45`, `-50`, `-80`). Rocket hits cause a large explosion and set the boss on fire.

**Lane logic (the "choose wisely" beat).** The level designer puts a gate chain in one lane and zombies plus a weapon barrel in the other. The player drags to choose: safe growth or risky reward. Negative gates (`-5`, `÷2`) get paired next to positive ones so a careless drag costs you half your squad.

**HUD in the ads is minimal.** A small back/pause icon top-left, the boss bar world-anchored over the boss, a count label under the squad. We will add level number and weapon icon, nothing more.

## 2. Core rules

**Movement.** The squad auto-runs forward at constant speed (the road scrolls toward the camera). Touch-drag or mouse-drag moves the squad horizontally. The squad follows the finger's x with smoothing (critically damped, about 80 ms lag), clamped to the road edges. No tap-to-shoot, no buttons during play. Everything else is automatic.

**Squad count `N`.** The real number can grow into the hundreds or thousands. Draw `min(N, MAX_DRAWN_SOLDIERS)` soldiers in a packed hexagonal formation that widens as N grows; the label under the blob shows the true `N`. New members pop in with a scale-bounce; losses fly off as ragdoll silhouettes.

**Firing.** Every drawn soldier fires straight up the road at the current weapon's fire rate, with a small random phase so the volley shimmers rather than pulses. Bullets are pooled sprites that travel up the lane and hit the first thing they overlap in their column: zombie, barrel, boss, or gate. Damage comes from the weapon. Effective shooters = `min(N, MAX_DRAWN_SOLDIERS) + OVERFLOW_FIRE_FACTOR * max(0, N - MAX_DRAWN_SOLDIERS)` so a 999-soldier squad is strong but not 999x. Make this a config knob.

**Gates.** A gate is one lane wide at a given road position. When the squad's center crosses it: apply its op to N (`+k`, `×k`, `−k`, `÷k`, floor at 1 for ÷, floor at 0 for −). Positive gates can be **shot up**: every `GATE_SHOT_HITS` bullet hits raise `+k` by 1 and `×k` by 0.5, up to a cap. Gates also show bullet-hole decals. Passing a positive gate: gold burst, up-arrows, rising bleep, screen flash. Passing a negative gate: red flash, descending bleep, soldiers fly off.

**Zombies.** Spawned in packs at a road position and lane, shambling toward the squad at their speed. Each has HP; show an HP number above the head and a thin red bar; floating damage numbers on every hit. HP 0 → death pose + blood splat + bleep. A zombie that touches the squad kills `contactKills` soldiers and dies (that's the 1-for-1 clash). Types: **Walker** (base), **Runner** (fast, low HP, appears from level 7), **Brute** (slow, high HP, kills 5 on contact, level 8+). Hordes are just big packs with staggered rows.

**Barrels.** Number = HP. Bullets reduce it; at 0 it bursts (wood splinters). Weapon crate grants the weapon shown above it. Explosive barrel deals `EXPLOSION_DAMAGE` in `EXPLOSION_RADIUS` and chains to other explosive barrels. Big crate holds a drone (companion that auto-targets the nearest zombie) or vehicle (cosmetic plus a damage multiplier).

**Boss.** Appears at the end of every level and walks toward the squad. Skull HP bar with number, world-anchored above its head, plus a copy at the top of the screen when it is on-screen. HP 0 → win. If it reaches the squad it kills `BOSS_CONTACT_KILLS_PER_SEC` soldiers per second until it dies or N hits 0. Levels 5, 10, 15 use the **Giant** variant: 3–5× HP, bigger sprite, an escort horde, and a stomp that shakes the screen.

**Win / lose.** Win when the boss dies. Lose when N reaches 0. Win screen: "ROUTE CLEARED", level number, next-level button. Lose screen: "OVERRUN", retry button. Progress (highest unlocked level) persists in localStorage. No level select needed beyond "continue from highest".

## 3. Weapons

| Weapon | How you get it | Damage per bullet | Fire rate per soldier (shots/s) | Notes |
|---|---|---|---|---|
| Pistol | Level 1 start | 15 | 2.0 | Single tracer |
| Rifle | Start from level 2 | 20 | 3.5 | Thin fast tracers |
| Shotgun | Crate (HP ≈ 25) | 12 × 5 pellets | 1.5 | Fan spread, great vs hordes |
| Minigun | Crate (HP `5` on level 1, scaling with level) | 25 | 8.0 | Thick tracer stream, barrel-spin sound |
| RPG | Crate (HP ≈ 100) | 180 area | 0.8 | Explosion on impact, sets boss on fire (burn DoT) |
| Drone | Big crate (HP ≈ 168) | 30 | 4.0 | Companion, auto-aims at nearest zombie, stacks with squad weapon |

Weapons replace each other except Drone, which is additive. A weapon pickup shows a big "MINIGUN!" banner for 0.8 s.

## 4. Levels

Twelve levels, data-driven. Each level is a **track**: a list of segments placed by road distance (meters) and lane (`L`, `R`, or `BOTH`). Level length 450–750 m at `SQUAD_SPEED` 7 m/s (about 65–105 s). Use this curve, then tune:

| Level | Start N | Zombie HP (walker) | Pack size | Negative gates | Weapon crate | Boss HP | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 1 (hero, pistol) | 20 | 3 | none | Minigun `5` | 300 | Tutorial: `+2`, `+1` chain, hint hand |
| 2 | 3 (rifle) | 30 | 5 | none | Explosive `9` | 600 | First `x2` |
| 3 | 3 | 40 | 6 | `-3`, `÷2` paired with positives | Shotgun `25` | 900 | First lane trap |
| 4 | 4 | 55 | 8 + first horde (15) | yes | Minigun `40` | 1200 | `x3` chain |
| 5 | 4 | 70 | 10 | yes | RPG `100` | 5000 GIANT | Escort horde, stomp shake |
| 6 | 5 | 90 | 12 | yes | Drone `168` | 2000 | Explosive barrel chains |
| 7 | 5 | 110 + Runners | 14 | yes | Shotgun `60` | 2600 | Runners from both lanes |
| 8 | 6 | 140 + Brutes | 16 | yes | Minigun `120` | 3400 | Brute walls |
| 9 | 6 | 170 | 20 | yes | RPG `200` | 4300 | Mixed hordes |
| 10 | 7 | 200 | 24 | yes | Drone `300` | 15000 GIANT | Two escort hordes |
| 11 | 8 | 240 | 28 | yes | Vehicle `800` | 6000 | |
| 12 | 8 | 280 | 32 | yes | RPG `400` | 8000 | |

Beyond 12, generate levels procedurally from the level-12 track with +15% HP and +1 pack size per level.

**Track segment types** (each is an entry in the level's segment array): `gatePair` (one gate per lane, values given), `gateChain` (lane, count, op, value), `zombiePack` (lane, type, count, formation rows), `horde` (both lanes, count), `barrel` (lane, kind, hp, weapon), `boss` (variant, hp). Put the level data in one file so I can edit tracks by hand.

## 5. Look and feel (no external assets)

- **Canvas 2D, pseudo-3D.** The road is a trapezoid: bottom edge about 92% of screen width, top edge about 10% at the horizon placed about 22% from the top. Map road distance to a depth `t` in [0, 1] with a perspective curve (`screenY = horizonY + (bottomY − horizonY) * near / (near + distanceAhead)`), scale sprites by the same factor, and draw back-to-front. The median, lane lines, barrier stripes, and roadside props scroll with the road.
- **Everything is drawn with code**: soldiers (dark capsule body, skin-tone head, gun rectangle, two-frame leg run cycle), zombies (grey-green capsule, arms forward, hunched, two-frame shamble), boss (large rounded body, red polka-dot dress as a pattern, mace), gates (translucent colored rect, posts, cached text glyphs), barrels (wooden cylinder with bands and a cached number glyph), tracers (short bright orange lines with a glow), muzzle flashes, explosions (expanding ring + particles), blood splats, wood splinters, floating numbers.
- **Cache sprites.** Pre-render each unit type at 6–8 depth scales into offscreen canvases and `drawImage` them; cache number glyphs so `fillText` is never called per entity per frame. This is what keeps 60 fps with a few hundred zombies and hundreds of tracers on a phone.
- **Juice.** Screen shake on boss hits, explosions, and squad losses. Hit-stop of 30 ms when a boss dies. Gate pass flash. Count label scale-bounce on change. Giant boss stomp shake on each step.
- **Sound.** WebAudio synthesized only: a short noise-burst for shots (throttled to a max of 12 shot sounds per second regardless of soldier count), rising arpeggio for positive gate, falling for negative, wood-crack for barrel, boom for explosions, low drone for the boss walk, fanfare for win, sting for lose. Mute toggle in the HUD. Audio context unlocks on the first touch.
- **Tutorial hint.** On level 1, a drawn hand icon drags left/right for 2 s with "DRAG TO MOVE" text, then fades.

## 6. HUD and screens

- Top-left: level number ("LEVEL 3"). Top-right: current weapon icon and name, mute button.
- Boss bar: skull icon + red bar + HP number, world-anchored above the boss; mirrored at the top of the screen while the boss is alive.
- Squad count label under the blob, large bold white with dark outline, bounces on change.
- Title screen: game name, "TAP TO START", highest level reached.
- Win and lose screens as specified in §2. Both have a restart option.

## 7. Technical requirements

- Single self-contained project: `index.html`, `css/style.css`, `js/` modules (ES modules via `<script type="module">`). No build step, no bundler, no external libraries, no network calls. Must run from a plain static server (`python -m http.server`) and, if ES modules block `file://`, provide a one-line note on serving it.
- Portrait 9:16 playfield letterboxed into any window; on a phone it should fill the screen. Handle `devicePixelRatio` up to 3 but cap the internal resolution (e.g., 540×960 logical, render at ≤ 2×) for performance. Prevent page scroll and pinch-zoom on the canvas.
- Fixed-timestep simulation (60 Hz) with interpolated rendering; `requestAnimationFrame`.
- Object pooling for soldiers, zombies, bullets, particles, floating numbers, gates, barrels. Hard caps: `MAX_DRAWN_SOLDIERS` 64, zombies 150 active, bullets 400, particles 300, floating numbers 60.
- Collision: bullets vs targets by lane column and road distance (sort targets by distance, bullets check the nearest few). Squad vs zombies, gates, and barrels by road distance and x-overlap. No per-pair N² loops.
- Module layout: `config.js` (every tunable constant and all weapon/zombie/boss stats in one exported object at the top), `main.js` (loop, state machine, resize), `input.js`, `render/road.js`, `render/sprites.js` (sprite cache), `entities/squad.js`, `entities/zombies.js`, `entities/gates.js`, `entities/barrels.js`, `entities/boss.js`, `entities/bullets.js`, `fx.js` (particles, shake, floating numbers), `audio.js`, `levels.js` (track data), `save.js` (localStorage).
- Comment each module's responsibilities and every config constant.

## 8. Config object (start from this)

```js
export const CONFIG = {
  // Playfield
  LOGICAL_W: 540, LOGICAL_H: 960, HORIZON_Y_FRAC: 0.22, ROAD_BOTTOM_W_FRAC: 0.92, ROAD_TOP_W_FRAC: 0.10,
  // Movement
  SQUAD_SPEED: 7, DRAG_SMOOTHING: 0.08,
  // Squad
  MAX_DRAWN_SOLDIERS: 64, OVERFLOW_FIRE_FACTOR: 0.1, FORMATION_SPACING: 0.55,
  // Gates
  GATE_SHOT_HITS: 8, GATE_PLUS_CAP: 50, GATE_MULT_CAP: 5,
  // Zombies
  ZOMBIE: { walker: { hp: 20, speed: 1.8, contactKills: 1 }, runner: { hp: 12, speed: 4.5, contactKills: 1 }, brute: { hp: 150, speed: 1.2, contactKills: 5 } },
  // Barrels
  EXPLOSION_DAMAGE: 120, EXPLOSION_RADIUS: 3.0,
  // Boss
  BOSS: { speed: 1.0, contactKillsPerSec: 6, giantMultiplier: 4 },
  // Weapons (see §3)
  WEAPONS: { /* pistol, rifle, shotgun, minigun, rpg, drone */ },
  // Caps
  MAX_ZOMBIES: 150, MAX_BULLETS: 400, MAX_PARTICLES: 300, MAX_FLOATERS: 60,
  // Feel
  SHAKE_BOSS_HIT: 4, SHAKE_EXPLOSION: 8, HITSTOP_BOSS_DEATH_MS: 30,
};
```

## 9. Build order

Work in stages. After each stage, stop and tell me (a) how to run it and (b) a short test checklist. Do not move to the next stage until I say so.

1. **Scaffold and road.** Canvas sizing, 9:16 letterbox, pseudo-3D scrolling road with median, lane lines, barriers, roadside props. A squad of `N` soldiers in formation that drag-moves across the road and auto-fires pooled tracers. Count label. Nothing to shoot yet.
2. **Gates.** All four ops, gate chains, shoot-to-raise, growth/loss animations, gate flash and sounds. Debug key to spawn gates.
3. **Zombies.** Packs, HP numbers and bars, floating damage numbers, death splats, contact kills, lose screen. Walker type only.
4. **Barrels and weapons.** Weapon crates, explosive barrels with chains, all six weapons with distinct tracers and sounds, weapon banner.
5. **Boss.** Approach, world-anchored and top-anchored HP bar, burn state, contact kills, win screen, hit-stop, Giant variant with stomp shake.
6. **Levels.** Track data format, the 12 levels from §4, procedural levels beyond, runner and brute zombies, localStorage progress, title screen, HUD.
7. **Polish and performance.** Sprite caches, glyph caches, pooling audit, phone profiling at 150 zombies and 400 bullets, tutorial hand, mute toggle, final tuning pass.

Start with stage 1.

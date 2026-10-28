---
title: Build Plan — Zombie Route Shooter (Z Route ad-style lane runner)
date: 2026-10-28
status: locked-v1
tags:
  - game-dev
  - plan
  - zombie-route-shooter
related:
  - "[[build-prompt-2026-10-28]]"
---

# Build Plan — Zombie Route Shooter

Companion to [[build-prompt-2026-10-28]]. This file holds the evidence, the design decisions, the risks, the stage-by-stage test plan, and the open questions. The prompt is the thing you paste; this is the thing you argue with.

## 1. What changed from Muse's prompt, and why

Muse's draft fused two ad formats: the **Mob Control** cannon (you steer a cannon that launches stickmen up a lane toward an enemy cannon and a base tower) and a **zombie shooter** layer. The Z Route: Redemption ads do not use a cannon, an enemy cannon, or a base tower. They use the **squad lane-runner** format that Last War: Survival made famous, reskinned with zombies, numbered barrels, weapon unlocks, and a giant boss. So the rewrite keeps every mechanic Muse listed and changes the *framing* so the mechanics land where the ads put them:

| Muse's mechanic | Where it lives in the rewrite |
|---|---|
| Drag left/right to move the cannon | Drag left/right to move the squad |
| Cannon continuously launches stickmen | Squad continuously fires tracers; the squad *is* the mob |
| Blue mob runs through multiplier gates (`x2`, `x3`, `+20`) and red gates (`÷2`, `-15`) | Identical gate ops, applied to squad count `N`; plus the ads' "gate chains" and shoot-to-raise |
| Red stickmen cancel blue 1-for-1 on contact | Zombies that reach the squad kill `contactKills` soldiers and die |
| Base tower with HP number; destroy it to win | Boss with HP bar and number; kill it to win (the ads end every run on the boss) |
| Zombies with HP numbers, numbered barrels, fire-rate gates, giant boss | Kept as-is; fire-rate upgrades come from weapon crates rather than gates, because that is what the ads show |
| 10+ levels, boss every 5th, win/lose/restart, localStorage, HUD, WebAudio, pooling, config object, staged build | Kept; 12 levels, Giant boss on 5 and 10 |

If you still want the cannon mode, it can be added later as a second game mode on the same engine (see §7). I recommend not mixing it into the first build, because no Z Route ad shows it.

## 2. Evidence

### 2.1 What I could verify

- **The store screenshots are the ad creative.** Both the Google Play and App Store listings for Z Route: Redemption (developer: BUILDING-BLOCKS NETWORK TECHNOLOGY CO., LIMITED) use the same art and the same scenes as the video ads: single survivor → squad, numbered gates, numbered barrels with weapons above them, zombies with HP bars and damage pops, the polka-dot giant boss with a skull HP bar. I downloaded all 18 Play screenshots and 6 App Store screenshots and read them at full resolution. Everything in §1 of the prompt comes from those images. See §3 below for the per-screenshot notes.
- **The ad gameplay exists in the app for only the first few levels.** Multiple user reviews on the App Store and Google Play say the ad-style shooting lasts "3 rounds" or "the first 5 minutes" before it becomes a base-builder; one reviewer: "the zombie aspect (the levels they advertise) stops after a certain level. Then it's literally battling other players with troops." A third-party review called it "another cookie-cutter 4X zombie strategy template."
- **Genre rules for gates and barrels.** Guides to Last War: Survival's "Doomsday" / "Frontline Breakthrough" mode (the format Z Route copies) describe translucent multiplier gates (`+10`, `x3`), red deduction gates, gate ops `+15 / x3 / -20 / ÷2`, explosive barrels and spikes that cost troops, and the trick that shooting a positive gate raises its value. The Fake Ad Games archive entry for Last War describes the canonical "wrong door" beat: a `+50` door next to a `x3` door, the player hesitates, picks wrong, the squad shrinks, zombies overwhelm it.

### 2.2 What I could not verify

- I could not play or watch the actual **playable ads** or **video ads** from this environment (YouTube and TikTok block fetching; ad-intelligence libraries need logins). The prompt is built from the store creative, which reuses the ad art, plus the genre's documented rules and user descriptions. If you can screen-record one playable and one video ad on your phone, I can diff the prompt against them in a follow-up and tighten timings, gate values, and the end-card flow.
- I could not confirm whether the ads let you shoot gates to raise their value. The "GRAB THE BOOST" screenshot shows bullet holes on a `+2` gate while the hero fires at it, which is the standard visual for that mechanic in this genre, so I included it as a config-gated feature.
- Zombie HP values in the ads are not shown directly; only damage pops (`-15`, `-25`, `-35`) and boss HP (`998` down to `678`). The level table's HP numbers are my tuning starting points, not observed values.

## 3. Reference notes from the store screenshots

Read from the Play Store set (industrial quarantine skin) and the App Store set (desert highway skin). Same scenes, different backdrops.

1. **"Blast your way" / "Against zombie."** Single survivor in a dark vest runs up the left lane firing a pistol. Two zombies just ahead with thin red HP bars and `-15`, `-25`, `-35` floating in red. Behind them a wooden barrel marked `5` with a minigun hovering above it in a green outline and a yellow ground ring. Further up: a blue `+2` gate, a crate marked `100`, more zombies, a crate `800`, a horde, and the boss walking down the right lane with a `998` skull bar. The right lane holds an unbroken chain of blue `+1` gates to the horizon.
2. **"Grab the boost" / "Think quickly."** Survivor fires at a blue `+2` gate that shows bullet-hole decals. Beyond: a weapon barrel, a blue `+3` gate, a zombie pack, the boss at `932`.
3. **"Break it down" / "Unlock weapon."** Squad of four soldiers with miniguns fires at a glowing red barrel marked `9` with sparks (explosive barrel); a heavy machine gun hovers above it. Beyond: a zombie horde, `+3` gate, boss at `839` and now on fire. The right lane shows a long magenta/gold chain of `+1`/`+2`/`+3` gates.
4. **"Focus fire" / "Choose wisely."** Squad of six in the left lane streams dozens of tracers up the lane at the boss. The right lane has a chain of large magenta `+2` gates followed by blue `+1` gates. Ahead on the left: a horde and a crate `800`.
5. **"Triple your force" / "Fight together."** A squad of about twenty passes through a gold `x3` gate; golden burst and up-arrows around the squad. Ahead in the same lane: a stacked chain of `x3` gates in gold, then red, then magenta, going to the horizon. Boss at `758` with a crate `800` and a tank-topped crate `999` behind it.
6. **"Crush the boss" / "Challenge boss."** A squad of about thirty-six fills the lane and fires a wall of tracers at the boss (`678`), with `-50`, `-80`, `-45` popping. A rocket launcher hovers over a crate marked `9` (desert version: `168`), a drone over a crate `800`, a tank over `9999` far back. Desert version shows the RPG hit: large explosion at the boss's feet, boss engulfed in fire.

Visual constants worth copying: boss HP numbers in the ~1000 range; squad grows 1 → 4 → 6 → 20 → 36 across the six scenes; gate text is white with a dark outline, bold, about one third of the gate's height; the gate chain lane is always the "safe" lane and the zombie lane is always the one with the weapon barrel.

## 4. Design decisions

- **N is a number, the blob is a drawing.** The ads multiply a squad to 999 and draw maybe forty soldiers. Separating the count from the drawn units keeps the fantasy and the frame rate. Fire scaling uses a capped-linear rule so `x3 x3 x3` feels huge without making the boss trivial.
- **Two lanes, continuous x.** The ads use a median-split road with one gate per lane, but the squad slides continuously rather than snapping. Gates are one lane wide; the squad's center decides which gate it hits. This also gives the "half my squad clipped the `÷2`" moment the ads sell.
- **Every level ends on a boss.** Each of the six ad scenes has the boss in frame. A plain "finish line" would not read as this ad. Non-giant levels use a scaled boss; levels 5 and 10 use the Giant variant with escorts.
- **Weapons come from barrels, not gates.** The ads label this "BREAK IT DOWN / UNLOCK WEAPON." Fire-rate gates (from Muse's draft) are dropped; the weapon ladder covers the same progression and is more legible.
- **Gate colors.** The ads alternate blue, gold, and magenta for positive gates and use red for the `x3` chain's far end, which is decorative. We fix the semantics (blue add, gold multiply, red subtract/divide) because the player has to read them at a glance while dragging.
- **Pseudo-3D in Canvas 2D.** A single perspective curve maps road distance to screen y and scale. Painter's order by distance. Sprite caches at discrete depth scales avoid per-frame vector drawing of hundreds of units. This is the standard way to fake the ads' look without WebGL.
- **No external assets.** Everything drawn in code, as Muse specified. The boss's polka-dot dress is a cached pattern fill; zombies and soldiers are capsule figures with two-frame cycles.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Frame drops with hundreds of zombies and tracers on a mid-range phone | Sprite and glyph caches, pooled entities with hard caps, lane-bucketed collision, fixed 60 Hz sim with interpolation, logical resolution capped at 540×960 rendered at ≤ 2× |
| `fillText` per entity per frame is slow | Pre-render number glyphs 0–9 and `+ x − ÷` at a few sizes; compose numbers from cached glyphs |
| Too many shot sounds | Throttle to 12 shot sounds/s; one minigun loop instead of per-bullet sounds |
| `file://` blocks ES modules in some browsers | Document `python -m http.server`; optionally ship a concatenated single-file build script later |
| Audio does not start on iOS until a user gesture | Create and resume the AudioContext on the first touch on the title screen |
| Page scroll and pinch-zoom on drag | `touch-action: none` on the canvas, `preventDefault` on touchmove, `user-scalable=no` in the viewport meta |
| Difficulty curve is guesswork | Everything lives in `config.js` and `levels.js`; stage 7 is a tuning pass with a debug overlay (level skip, N edit, god mode) |

## 6. Stage plan and test checklist

Each stage ends with "how to run" and a checklist. Run with `python -m http.server 8000` from the project folder and open `http://localhost:8000` in a phone browser on the same Wi-Fi or in desktop Chrome with device emulation set to a 9:16 phone.

1. **Scaffold and road.** Test: canvas letterboxes correctly in portrait and landscape windows; road scrolls smoothly; drag moves the squad with slight lag and clamps at the barriers; tracers stream upward; the count label matches `N` set in the debug overlay; 60 fps with `N` = 64 drawn.
2. **Gates.** Test: `+3` adds three with pop animation; `x3` triples; `-5` removes five with fly-off; `÷2` halves and floors at 1; a gate chain of ten `+1` gates adds ten; shooting a `+2` gate for 8 hits turns it into `+3`; wrong-lane gate is not applied; sounds and flashes fire once per gate.
3. **Zombies.** Test: a pack of five walkers advances at walker speed; HP numbers tick down and damage pops appear; death splat and sound; a zombie reaching the squad removes exactly `contactKills` soldiers and dies; `N` → 0 shows the lose screen; retry restarts the level; 150 zombies on screen stays at 60 fps.
4. **Barrels and weapons.** Test: barrel number ticks down; at 0 it bursts; weapon crate switches the whole squad's tracers and fire rate; explosive barrel damages zombies within radius and chains to a neighbor; drone follows the squad and shoots the nearest zombie; weapon banner shows once.
5. **Boss.** Test: boss walks down, HP bar and number update, floating hits appear, RPG hit ignites the burn state, boss reaching the squad drains `N` at the configured rate, boss death triggers hit-stop, shake, and the win screen; Giant variant stomps with shake and brings an escort horde.
6. **Levels.** Test: all 12 levels load from data; level 1 shows the hint hand; progress persists across reload; level 13+ generates; runners appear from level 7 and brutes from level 8; the HUD shows the level and weapon.
7. **Polish and performance.** Test: Chrome performance profile on a throttled CPU (4× slowdown) stays above 50 fps at 150 zombies and 400 bullets; no allocations in the hot loop (check the memory timeline for sawtooth GC); mute toggle works; audio starts on first touch on iOS Safari.

## 7. Decisions (interview, 2026-10-28)

All five open questions were answered by Dr. Doxey on 2026-10-28. The prompt in [[build-prompt-2026-10-28]] already reflects every answer, so it is unchanged.

| # | Question | Decision |
|---|---|---|
| 1 | Mob Control cannon mode | **Dropped entirely.** First build is purely the Z Route squad lane-runner. |
| 2 | Art fidelity | **Code-drawn vector art.** Capsule figures, pattern-filled boss, pseudo-3D Canvas 2D road. No assets, no build step. |
| 3 | Scripted "fake fail" beat | **None.** Purely player-driven; the only fails are the player's. |
| 4 | Ad reference captures | **Not needed.** Store screenshots plus the genre's documented rules are the reference; tune by feel in the polish stage. |
| 5 | Level ladder scope | **12 hand-tuned levels, Giant bosses on 5 and 10, procedural scaling beyond 12.** |

Status: spec locked. Next action is stage 1 of the build order in the prompt.

## 8. Sources

- [Z Route: Redemption on Google Play](https://play.google.com/store/apps/details?id=com.zroute.global&hl=en_US) — screenshots and reviews
- [Z Route: Redemption on the App Store](https://apps.apple.com/us/app/z-route-redemption/id6762268182) — screenshots, developer name, reviews
- [Z Route: Redemption on mwm.ai](https://mwm.ai/apps/z-route-redemption/6762268182) — screenshot alt-text ("interactive barrels," "multiplier gates," "Boss Battle Unleashed")
- [iofreeonline review and user quotes](https://www.iofreeonline.com/IOS/game/Z-Route-Redemption.html) — "More base building than the shooting game ad," "For the first 5 minutes it matches the ads"
- [BlueStacks Z Route beginner's guide](https://www.bluestacks.com/blog/game-guides/z-route-redemption/zrr-beginners-guide-en.html) and [tips guide](https://www.bluestacks.com/blog/game-guides/z-route-redemption/zrr-tips-tricks-en.html) — resource gates vs. combat gates, boss stages
- [Fake Ad Games: Last War: Survival](https://fakeadgames.com/archive/last-war-survival) — the canonical door-runner ad beat
- [Last War: Survival browser description](https://www.twoplayergames.org/game/last-war-survival) — multiplier gates, shooting gates to raise their value
- [Godlikebots: Frontline Breakthrough guide](https://godlikebots.com/last-war-survival-frontline-breakthrough-guides-a-practical-playbook-that-actually-wins-runs/) — penalty gates
- [Resetera thread on fake barrel-shooter ads](https://www.resetera.com/threads/those-fake-mobile-game-ads-i-desire-to-play-to-one.823191/) — Evony barrel minigame context

The downloaded store screenshots are in this session's scratchpad only (`/tmp/claude-0/-home-user-AIHub/863e9b50-ed09-53e5-9ed3-f24cadccec1e/scratchpad/zroute/shots/`) and are not committed, since they are the publisher's marketing art. Re-download from the store links above if the coding session needs them for reference.

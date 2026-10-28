/* config.js — every tunable constant in one place.
   Units: road distance (z) in meters; lateral position (x) in "lane units"
   where -1 is the left road edge, 0 the median and +1 the right road edge.
   The left lane is x in [-1, 0], the right lane is x in [0, 1]. */
window.ZRS = window.ZRS || {};
ZRS.CONFIG = {
  // ---- Playfield (logical 9:16 canvas, letterboxed into the window) ----
  LOGICAL_W: 540,
  LOGICAL_H: 960,
  MAX_LOGICAL_H: 1200,      // taller phones extend the playfield instead of letterboxing
  MAX_DPR: 2,               // cap devicePixelRatio for performance
  HORIZON_Y_FRAC: 0.22,     // horizon line, fraction of height from the top
  SQUAD_Y_FRAC: 0.80,       // screen row of the squad's center
  ROAD_HALF_W_FRAC: 0.42,   // half road width at the squad row, fraction of width
  NEAR: 14,                 // perspective constant (meters); scale = NEAR/(NEAR+dz)
  FAR: 220,                 // farthest road distance drawn
  DRAW_FAR: 120,            // entities beyond this are simulated but not drawn
  CULL_BEHIND: 6,           // entities this far behind the squad are freed

  // ---- Movement ----
  SQUAD_SPEED: 7,           // m/s forward
  DRAG_SENS: 1.15,          // lane units per (road half-width) of finger travel
  DRAG_SMOOTH: 16,          // x smoothing rate (1/s); higher = snappier
  KEY_SPEED: 2.2,           // lane units per second with arrow keys

  // ---- Squad ----
  MAX_DRAWN_SOLDIERS: 64,   // visual cap; the count label shows the true N
  SQUAD_MAX_N: 9999,        // the ads' ceiling; multiply chains stop here
  FIRE_EXP: 0.75,           // beyond the drawn soldiers, extra squad strength scales as (N-64)^FIRE_EXP (applied per bullet)
  FORMATION_DX: 0.075,      // lateral spacing (lane units)
  FORMATION_DZ: 0.6,        // depth spacing (meters)
  AIM_ASSIST: 0.22,         // bullets snap to a target within this lateral window
  LOSS_FX_CAP: 8,           // max ragdoll bursts per loss event

  // ---- Gates ----
  GATE_SHOT_HITS: 12,       // hits for the first upgrade
  GATE_SHOT_HITS_STEP: 10,  // each further upgrade needs this many more hits (linear, uncapped)
  GATE_PLUS_CAP: 60,        // highest value an add gate can be pumped to
  GATE_MULT_CAP: 4,         // highest multiplier a multiply gate can be pumped to
  GATE_MULT_STEP: 0.1,      // multiplier gained per upgrade
  GATES_ABSORB_BULLETS: true, // classic: shooting a gate pumps it and stops the bullet (pumping costs fire)
  GATE_SHADOW: [22, 46],    // a pack this far behind a gate (same lane) would still be behind it when the squad arrives; layouts avoid it
  GATE_CHAIN_SPACING: 12,   // meters between gates in a chain (never stacked)
  GATE_H: 84,               // gate height in px at scale 1
  SPAWN_AHEAD: 95,          // meters ahead at which track segments spawn

  // ---- Zombies (hp is multiplied by the level's hpMult) ----
  ZOMBIE: {
    walker: { hp: 25,  speed: 2.3, contactKills: 1, w: 0.12, size: 1.0 },
    runner: { hp: 14,  speed: 5.2, contactKills: 1, w: 0.10, size: 0.9 },
    brute:  { hp: 180, speed: 1.5, contactKills: 6, w: 0.18, size: 1.5 },
  },
  ZOMBIE_HOMING: 0.35,      // lateral drift toward the squad (lane units/s) when close
  ZOMBIE_HOMING_RANGE: 22,  // meters

  // ---- Barrels ----
  EXPLOSION_DAMAGE: 160,
  EXPLOSION_RADIUS: 3.0,    // meters (lateral radius is EXPLOSION_RADIUS * 0.2 lane units)
  EXPLOSION_SQUAD_KILLS: 4, // soldiers lost when the squad runs into a live explosive barrel
  BARREL_W: 0.22,           // lateral half width (lane units)
  BARREL_D: 0.8,            // depth half extent (meters)

  // ---- Boss ----
  BOSS: {
    speed: 1.4,             // m/s toward the squad
    homing: 0.5,            // lateral drift toward the squad (lane units/s)
    contactKillsPerSec: 10,
    contactFrac: 0.15,      // or this fraction of the squad per second, whichever is larger
    giantMultiplier: 1.0,   // hp multiplier applied on top of the level's boss hp for giants
    spawnAhead: 75,         // meters ahead of the squad when it appears
    w: 0.38,                // lateral half width (lane units), giant uses 1.5x
    burnDps: 30,
    burnSeconds: 4,
    stepPeriod: 0.9,        // giant stomp interval (s)
    popInterval: 0.12,      // damage numbers on the boss are aggregated over this window
  },

  // ---- Weapons ----
  WEAPONS: {
    pistol:  { name: 'PISTOL',  dmg: 15,  rate: 2.0, speed: 46, range: 60, kind: 'tracer', color: '#ffb347', width: 2 },
    rifle:   { name: 'RIFLE',   dmg: 20,  rate: 3.0, speed: 52, range: 65, kind: 'tracer', color: '#ffc966', width: 2 },
    shotgun: { name: 'SHOTGUN', dmg: 10,  rate: 1.5, speed: 40, range: 30, kind: 'pellet', color: '#ffd27a', width: 2, pellets: 5, spread: 0.14 },
    minigun: { name: 'MINIGUN', dmg: 12,  rate: 6.0, speed: 55, range: 55, kind: 'tracer', color: '#ff9a2e', width: 3 },
    rpg:     { name: 'RPG',     dmg: 150, rate: 0.6, speed: 26, range: 80, kind: 'rocket', color: '#ff6a2e', width: 5, aoe: 2.5 },
    drone:   { name: 'DRONE',   dmg: 30,  rate: 4.0, speed: 70, range: 70, kind: 'laser',  color: '#6af0ff', width: 2 },
  },
  WEAPON_ORDER: ['pistol', 'rifle', 'shotgun', 'minigun', 'rpg'],
  VEHICLE_DMG_MULT: 1.5,

  // ---- Bonus barrels (break to collect; reset every level) ----
  BONUS: {
    rateStep: 0.2, rateCap: 2.0,   // each RATE barrel: +20% fire rate, up to 2x
    dmgStep: 0.2,  dmgCap: 2.0,    // each DMG barrel: +20% damage, up to 2x
  },

  // ---- Pools / caps ----
  MAX_ZOMBIES: 320,
  MAX_BULLETS: 600,
  MAX_PARTICLES: 300,
  MAX_FLOATERS: 60,
  MAX_GATES: 48,
  MAX_BARRELS: 32,
  MAX_DECALS: 80,

  // ---- Feel ----
  SHAKE_BOSS_HIT: 1.2,
  SHAKE_EXPLOSION: 9,
  SHAKE_STOMP: 6,
  SHAKE_LOSS: 4,
  HITSTOP_BOSS_DEATH_MS: 30,
  SFX_SHOT_PER_SEC: 12,     // throttle for shot sounds

  // ---- Colors ----
  COLORS: {
    gatePlus: '#2f7cff', gateMult: '#ffb800', gateMinus: '#ff2d2d', gateDiv: '#ff2d2d',
    tracer: '#ffb347', hp: '#ff3030', hpBack: '#3a0a0a', count: '#ffffff',
    sky1: '#66b3d6', sky2: '#d9e7ec', asphalt: '#4b4d55', asphaltFar: '#6a6d78',
    median: '#8c8f99', lane: '#e9e9e9', barrier: '#a7a9b2', barrierDark: '#7c7e88',
    ground: '#6f6b63', hazardY: '#f2c230', hazardK: '#1d1d1d', led: '#4fd6ff',
  },
};

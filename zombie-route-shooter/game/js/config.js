/* config.js — every tunable constant in one place.
   Units: road distance (z) in meters; lateral position (x) in "lane units"
   where -1 is the left road edge, 0 the road center and +1 the right road edge.
   The road has three lanes, each with one job (see LANE_ROLE):
     L  x in [-1, -1/3]   supply lane: static weapon and bonus stands
     M  x in [-1/3, 1/3]  enemy lane: zombie packs, hordes, explosive barrels
     R  x in [1/3, 1]     gate lane: +k / xk / -k / ÷k gates
   Zombies home toward the squad when close, so they spill out of their lane. */
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

  // ---- Lanes ----
  LANES: {
    L: { c: -2 / 3, min: -1, max: -1 / 3 },
    M: { c: 0, min: -1 / 3, max: 1 / 3 },
    R: { c: 2 / 3, min: 1 / 3, max: 1 },
  },
  LANE_X: { L: -2 / 3, M: 0, R: 2 / 3 },
  LANE_ROLE: { supply: 'L', enemy: 'M', gate: 'R' },

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
  GATE_CHAIN_SPACING: 12,   // meters between gates in a chain (never stacked)
  GATE_H: 84,               // gate height in px at scale 1
  SPAWN_AHEAD: 95,          // meters ahead at which track segments spawn

  // ---- Zombies (hp is multiplied by the level's hpMult) ----
  ZOMBIE: {
    // many weak zombies: a walker falls to one or two pistol rounds at the level's hpMult
    crawler: { hp: 4,   speed: 1.8, contactKills: 1, w: 0.08, size: 0.75 },
    walker:  { hp: 9,   speed: 2.3, contactKills: 1, w: 0.09, size: 1.0 },
    runner:  { hp: 6,   speed: 5.0, contactKills: 1, w: 0.08, size: 0.9 },
    brute:   { hp: 70,  speed: 1.5, contactKills: 4, w: 0.15, size: 1.5 },
  },
  ZOMBIE_HOMING: 0.32,      // lateral drift toward the squad (lane units/s) when close
  ZOMBIE_HOMING_RANGE: 22,  // meters

  // ---- Barrels ----
  EXPLOSION_DAMAGE: 160,
  EXPLOSION_RADIUS: 3.0,    // meters (lateral radius is EXPLOSION_RADIUS * 0.2 lane units)
  EXPLOSION_SQUAD_KILLS: 4, // soldiers lost when the squad runs into a live explosive barrel
  BARREL_W: 0.2,           // lateral half width (lane units)
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
  MAX_ZOMBIES: 640,
  MAX_BULLETS: 600,
  MAX_PARTICLES: 300,
  MAX_FLOATERS: 60,
  MAX_GATES: 48,
  MAX_BARRELS: 32,
  MAX_DECALS: 120,

  // ---- Feel ----
  SHAKE_BOSS_HIT: 1.2,
  SHAKE_EXPLOSION: 9,
  SHAKE_STOMP: 6,
  SHAKE_LOSS: 4,
  HITSTOP_BOSS_DEATH_MS: 30,
  SFX_SHOT_PER_SEC: 12,     // throttle for shot sounds

  // ---- Themes (one per level, cycling): palette, backdrop and roadside props ----
  THEMES: {
    city:   { sky1: '#66b3d6', sky2: '#d9e7ec', ground: '#6f6b63', asphalt: '#4b4d55', asphaltFar: '#6a6d78', asphaltNear: '#43454d', barrier: '#a7a9b2', barrierDark: '#7c7e88', haze: '217,231,236', led: '#4fd6ff', lane: '#e9e9e9', skyline: '#5f6a73', hills: '#9fb6c4', sun: '255,240,200', props: ['silo', 'sign', 'truck', 'chimney', 'lamp', 'wreck'] },
    desert: { sky1: '#e9a25a', sky2: '#fbe2b2', ground: '#c99a5c', asphalt: '#5b5048', asphaltFar: '#7e6f60', asphaltNear: '#51473f', barrier: '#cdb38a', barrierDark: '#a88f68', haze: '251,226,178', led: '#ffb347', lane: '#f3e6c8', skyline: '#a0623a', hills: '#c98d5a', sun: '255,236,180', props: ['cactus', 'wreck', 'sign', 'rock', 'cactus', 'truck'] },
    night:  { sky1: '#070c22', sky2: '#27325e', ground: '#24252c', asphalt: '#26272e', asphaltFar: '#33364a', asphaltNear: '#1f2026', barrier: '#5a5d70', barrierDark: '#3d4050', haze: '39,50,94', led: '#ff4fd8', lane: '#c9c9d9', skyline: '#141a33', hills: '#1d2547', sun: '220,230,255', props: ['lamp', 'wreck', 'sign', 'lamp', 'truck', 'chimney'], night: true },
    snow:   { sky1: '#9db9cf', sky2: '#eef3f7', ground: '#e6edf2', asphalt: '#555a63', asphaltFar: '#7d838d', asphaltNear: '#4b5058', barrier: '#cdd7df', barrierDark: '#a4afb9', haze: '238,243,247', led: '#7ae0ff', lane: '#ffffff', skyline: '#7f93a6', hills: '#c7d6e2', sun: '255,255,240', props: ['pine', 'pine', 'sign', 'truck', 'pine', 'rock'], snow: true },
    toxic:  { sky1: '#6f7a3e', sky2: '#c9d199', ground: '#4e573a', asphalt: '#3e4339', asphaltFar: '#5d6352', asphaltNear: '#373b32', barrier: '#8b9270', barrierDark: '#666c50', haze: '201,209,153', led: '#9dff4f', lane: '#e6eccc', skyline: '#3f4a2c', hills: '#7c8a52', sun: '230,255,170', props: ['chimney', 'silo', 'sign', 'wreck', 'chimney', 'rock'] },
  },

  // ---- Colors ----
  COLORS: {
    gatePlus: '#2f7cff', gateMult: '#ffb800', gateMinus: '#ff2d2d', gateDiv: '#ff2d2d',
    tracer: '#ffb347', hp: '#ff3030', hpBack: '#3a0a0a', count: '#ffffff',
    sky1: '#66b3d6', sky2: '#d9e7ec', asphalt: '#4b4d55', asphaltFar: '#6a6d78',
    median: '#8c8f99', lane: '#e9e9e9', barrier: '#a7a9b2', barrierDark: '#7c7e88',
    ground: '#6f6b63', hazardY: '#f2c230', hazardK: '#1d1d1d', led: '#4fd6ff',
  },
};

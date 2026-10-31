/* levels.js — level data. Every level is built by a deterministic generator
   (seeded per level) from a hand-tuned parameter row. Levels 1–12 have their
   own rows; levels beyond 12 scale row 12.

   The road has three lanes, each with one job (CONFIG.LANE_ROLE):
     supply lane (left)   static weapon / bonus stands with HP numbers
     enemy lane (middle)  zombie packs, hordes and explosive barrels
     gate lane (right)    long runs of +1 tiles, then a big gate (x2 or a
                          pumpable +k); negative gates in some breaks
   The generator fills each lane as its own stream, so the three never stack
   on top of each other. Zombies home toward the squad when close, so a squad
   parked in the supply or gate lane still has to fight.

   Each level also has a theme (palette, backdrop, roadside props) and a
   modifier that changes its mix:
     swarm     bigger packs and hordes with more crawlers
     rush      runners in most packs
     siege     brutes in packs, bigger hordes, fewer packs
     gauntlet  more negative gates in the gate lane
     supply    extra stands in the supply lane
     flood     one huge crawler horde fills the enemy lane mid-level

   Segment forms (z is road distance in meters):
     ['gate',      z, op, value]                      gate lane (big gate)
     ['gate',      z, op, value, 1]                   gate lane (tile)
     ['pack',      z, type, count]                    enemy lane, rows of 4
     ['horde',     z, count, mix]                     enemy lane, rows of 5; mix = { crawler, runner, brute } fractions
     ['explosive', z, hp]                             enemy lane
     ['supply',    z, kind, hp, payload, amount]      supply lane; kind weapon|bonus
   A level also has trickle: { from, every, count, type } — a steady stream of
   small packs in the enemy lane once the squad passes `from`.
   ops: '+', 'x', '-', '/' */
(function () {
  const C = ZRS.CONFIG;
  const L = {};
  const SP = C.GATE_CHAIN_SPACING;

  const THEME_ORDER = ['city', 'desert', 'bridge', 'night', 'snow', 'toxic'];
  const THEME_NAMES = { city: 'OUTER RING ROAD', desert: 'DUST BOWL HIGHWAY', bridge: 'RUST RIVER BRIDGE', night: 'BLACKOUT BOULEVARD', snow: 'FROZEN PASS', toxic: 'SPILL ZONE' };
  const MOD_NAMES = { swarm: 'SWARM', rush: 'RUNNER RUSH', siege: 'SIEGE', gauntlet: 'GATE GAUNTLET', supply: 'SUPPLY RUN', flood: 'FLOOD', none: '' };
  const TSP = C.TILE_SPACING;

  // Hand-tuned parameter rows.
  // pack / horde: base zombie counts. neg: negative gates in the gate lane.
  // gateRun: positive gates between breaks; every multEvery-th gate is a multiplier.
  // stands: [kind, hp, payload, amount, at(0..1)]; hp x STAND_HP_MULT at build time unless raw.
  const STAND_HP_MULT = 3;
  const ROWS = {
    1:  { len: 440, startN: 1,  weapon: 'pistol',  hpMult: 1.2, bossHp: 70000,   giant: false, mod: 'none',     pack: 10, horde: 30, neg: 0, gateRun: 4, multEvery: 3, trickle: { from: 120, every: 4.0, count: 6 }, choice: { kind: 'bonus', hp: 60, payload: 'dmg', gate: 5 },
          stands: [['weapon', 8, 'minigun', 0, 0.08], ['bonus', 12, 'squad', 5, 0.25], ['bonus', 20, 'squad', 8, 0.45], ['bonus', 30, 'rate', 0, 0.62], ['bonus', 30, 'squad', 12, 0.8]], raw: true },
    2:  { len: 500, startN: 3,  weapon: 'rifle',   hpMult: 2.0, bossHp: 150000,  giant: false, mod: 'swarm',    pack: 14, horde: 44, neg: 1, gateRun: 4, multEvery: 3, trickle: { from: 60, every: 3.2, count: 8 }, choice: { kind: 'weapon', hp: 90, payload: 'rpg', gate: 6 },
          stands: [['bonus', 12, 'squad', 6, 0.1], ['weapon', 30, 'minigun', 0, 0.25], ['bonus', 36, 'squad', 8, 0.42], ['bonus', 50, 'rate', 0, 0.6], ['bonus', 50, 'squad', 12, 0.78]], raw: true },
    3:  { len: 540, startN: 3,  weapon: 'rifle',   hpMult: 2.4, bossHp: 220000,  giant: false, mod: 'rush',     pack: 16, horde: 48, neg: 2, gateRun: 4, multEvery: 3, trickle: { from: 50, every: 3.0, count: 8 }, choice: { kind: 'bonus', hp: 120, payload: 'dmg', gate: 6 },
          stands: [['weapon', 60, 'shotgun', 0, 0.12], ['bonus', 60, 'squad', 10, 0.3], ['weapon', 90, 'minigun', 0, 0.48], ['bonus', 90, 'dmg', 0, 0.66], ['bonus', 90, 'squad', 14, 0.82]], raw: true },
    4:  { len: 560, startN: 12, weapon: 'rifle',   hpMult: 2.8,  bossHp: 200000,  giant: false, mod: 'gauntlet', pack: 18, horde: 50, neg: 4, gateRun: 3, multEvery: 3, trickle: { from: 90, every: 2.8, count: 9 }, choice: { kind: 'weapon', hp: 150, payload: 'rpg' },
          stands: [['weapon', 40, 'minigun', 0, 0.15], ['bonus', 20, 'squad', 12, 0.3], ['bonus', 40, 'rate', 0, 0.6], ['weapon', 60, 'shotgun', 0, 0.75], ['bonus', 50, 'dmg', 0, 0.88]] },
    5:  { len: 580, startN: 12, weapon: 'rifle',   hpMult: 3.2,  bossHp: 260000,  giant: true,  mod: 'siege',    pack: 18, horde: 56, neg: 3, gateRun: 4, multEvery: 3, trickle: { from: 90, every: 2.6, count: 9 }, choice: { kind: 'bonus', hp: 200, payload: 'dmg' },
          stands: [['weapon', 50, 'minigun', 0, 0.14], ['bonus', 30, 'squad', 15, 0.28], ['weapon', 100, 'rpg', 0, 0.55], ['bonus', 60, 'rate', 0, 0.7], ['bonus', 70, 'dmg', 0, 0.9]] },
    6:  { len: 600, startN: 16, weapon: 'minigun', hpMult: 3.6,  bossHp: 450000,  giant: false, mod: 'supply',   pack: 22, horde: 60, neg: 4, gateRun: 4, multEvery: 3, trickle: { from: 90, every: 2.4, count: 10 }, choice: { kind: 'weapon', hp: 260, payload: 'drone' },
          stands: [['weapon', 60, 'minigun', 0, 0.12], ['bonus', 40, 'squad', 20, 0.3], ['bonus', 40, 'squad', 20, 0.42], ['weapon', 168, 'drone', 0, 0.55], ['bonus', 80, 'rate', 0, 0.68], ['weapon', 140, 'rpg', 0, 0.8], ['bonus', 90, 'dmg', 0, 0.9]] },
    7:  { len: 620, startN: 20, weapon: 'minigun', hpMult: 4.0,  bossHp: 330000,  giant: false, mod: 'flood',    pack: 24, horde: 70, neg: 4, gateRun: 4, multEvery: 3, trickle: { from: 90, every: 2.6, count: 12 }, choice: { kind: 'bonus', hp: 300, payload: 'rate' },
          stands: [['weapon', 60, 'shotgun', 0, 0.12], ['bonus', 50, 'squad', 25, 0.26], ['weapon', 90, 'minigun', 0, 0.4], ['bonus', 90, 'rate', 0, 0.55], ['weapon', 180, 'rpg', 0, 0.78], ['bonus', 100, 'dmg', 0, 0.9]] },
    8:  { len: 640, startN: 24, weapon: 'minigun', hpMult: 4.5,   bossHp: 640000,  giant: false, mod: 'rush',     pack: 26, horde: 70, neg: 5, gateRun: 4, multEvery: 3, trickle: { from: 90, every: 2.4, count: 12 }, choice: { kind: 'weapon', hp: 400, payload: 'rpg' },
          stands: [['weapon', 120, 'minigun', 0, 0.12], ['bonus', 60, 'squad', 30, 0.26], ['weapon', 200, 'drone', 0, 0.52], ['bonus', 110, 'rate', 0, 0.64], ['weapon', 220, 'rpg', 0, 0.78], ['bonus', 120, 'dmg', 0, 0.9]] },
    9:  { len: 660, startN: 36, weapon: 'minigun', hpMult: 5.0,   bossHp: 750000,  giant: false, mod: 'gauntlet', pack: 28, horde: 76, neg: 7, gateRun: 3, multEvery: 2, trickle: { from: 90, every: 2.3, count: 13 }, choice: { kind: 'bonus', hp: 450, payload: 'dmg' },
          stands: [['weapon', 120, 'shotgun', 0, 0.1], ['bonus', 70, 'squad', 35, 0.24], ['weapon', 160, 'minigun', 0, 0.36], ['bonus', 130, 'rate', 0, 0.6], ['weapon', 200, 'rpg', 0, 0.72], ['bonus', 140, 'dmg', 0, 0.9]] },
    10: { len: 700, startN: 44, weapon: 'minigun', hpMult: 5.5,   bossHp: 700000,  giant: true,  mod: 'siege',    pack: 28, horde: 80, neg: 5, gateRun: 4, multEvery: 3, trickle: { from: 90, every: 2.2, count: 14 }, choice: { kind: 'weapon', hp: 600, payload: 'rpg' },
          stands: [['weapon', 150, 'minigun', 0, 0.1], ['bonus', 80, 'squad', 40, 0.22], ['weapon', 300, 'drone', 0, 0.34], ['bonus', 150, 'rate', 0, 0.58], ['weapon', 280, 'rpg', 0, 0.68], ['bonus', 160, 'dmg', 0, 0.9]] },
    11: { len: 740, startN: 50, weapon: 'minigun', hpMult: 6.0,   bossHp: 700000,  giant: false, mod: 'supply',   pack: 30, horde: 80, neg: 6, gateRun: 4, multEvery: 3, trickle: { from: 90, every: 2.1, count: 14 }, choice: { kind: 'bonus', hp: 700, payload: 'dmg' },
          stands: [['weapon', 180, 'minigun', 0, 0.1], ['weapon', 800, 'vehicle', 0, 0.26], ['bonus', 90, 'squad', 45, 0.38], ['bonus', 90, 'squad', 45, 0.48], ['bonus', 170, 'rate', 0, 0.6], ['weapon', 320, 'rpg', 0, 0.7], ['weapon', 360, 'drone', 0, 0.82], ['bonus', 180, 'dmg', 0, 0.9]] },
    12: { len: 780, startN: 56, weapon: 'minigun', hpMult: 6.5,   bossHp: 850000,  giant: false, mod: 'swarm',    pack: 32, horde: 90, neg: 7, gateRun: 4, multEvery: 3, trickle: { from: 90, every: 2.0, count: 15 }, choice: { kind: 'weapon', hp: 800, payload: 'rpg' },
          stands: [['weapon', 200, 'minigun', 0, 0.08], ['bonus', 100, 'squad', 50, 0.2], ['weapon', 400, 'rpg', 0, 0.44], ['bonus', 190, 'rate', 0, 0.56], ['weapon', 420, 'drone', 0, 0.68], ['bonus', 200, 'dmg', 0, 0.9]] },
  };

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Zombie type for a pack, by modifier and level progress.
  function packType(p, rnd, frac) {
    const r = rnd();
    if (p.mod === 'swarm') return r < 0.35 ? 'crawler' : r < 0.55 && p.n >= 3 ? 'runner' : 'walker';
    if (p.mod === 'rush') return r < 0.6 ? 'runner' : 'walker';
    if (p.mod === 'siege' && frac > 0.25 && r < 0.3) return 'brute';
    if (p.n >= 5 && frac > 0.3 && r < 0.12) return 'brute';
    if (p.n >= 3 && r < 0.3) return 'runner';
    if (r > 0.85) return 'crawler';
    return 'walker';
  }
  function hordeMix(p) {
    if (p.mod === 'flood') return { crawler: 0.5, runner: 0.15 };
    if (p.mod === 'swarm') return { crawler: 0.35, runner: p.n >= 3 ? 0.15 : 0 };
    if (p.mod === 'rush') return { runner: 0.5 };
    if (p.mod === 'siege') return { brute: 0.12, runner: 0.15 };
    if (p.n >= 5) return { runner: 0.25, brute: 0.08, crawler: 0.2 };
    if (p.n >= 3) return { runner: 0.25, crawler: 0.2 };
    return { crawler: 0.3 };
  }

  function build(p, n) {
    const rnd = mulberry32(1000 + n * 7919);
    p.n = n;
    const segs = [];
    const zEnd = p.len - 60;
    const ramp = z => (z < p.len * 0.25 ? 0.5 : z < p.len * 0.5 ? 0.8 : 1);

    // ---- gate lane: tile runs (+1 blocks packed close), each followed by a big gate;
    //      negatives (a big ÷/- gate or a short red tile run) sit in some of the breaks
    const tMin = p.tileMin || 5 + Math.floor(n / 3), tMax = p.tileMax || 9 + n;
    const tVal = p.tileVal || (n >= 8 ? 2 : 1);
    let z = 16, k = 0, negLeft = p.neg, blocks = 0;
    const estBlocks = Math.max(1, Math.floor((zEnd - 60) / ((tMin + tMax) / 2 * TSP + SP + 16)));
    const negEvery = p.neg > 0 ? Math.max(1, Math.floor(estBlocks / (p.neg + 1))) : 0;
    while (z < zEnd - 40) {
      const run = tMin + Math.floor(rnd() * (tMax - tMin + 1));
      for (let i = 0; i < run && z < zEnd - 40; i++) { segs.push(['gate', z, '+', tVal, 1]); z += TSP; }
      z += SP - TSP;
      if (z >= zEnd - 40) break;
      k++;
      if (k % (p.multEvery + 1) === 0 && z > 40) segs.push(['gate', z, 'x', n >= 6 && z > p.len * 0.75 && rnd() < 0.25 ? 3 : 2]);
      else segs.push(['gate', z, '+', 2 + Math.floor(rnd() * (z > p.len * 0.5 ? 5 : 3))]);
      z += SP;
      blocks++;
      if (negLeft > 0 && negEvery && blocks % negEvery === 0 && z > 50) {
        negLeft--;
        if (rnd() < 0.5) { segs.push(['gate', z, rnd() < 0.5 ? '/' : '-', rnd() < 0.5 ? 2 : 3 + Math.floor(rnd() * 6)]); z += SP + 4; }
        else { const r = 3 + Math.floor(rnd() * 3); for (let i = 0; i < r; i++) { segs.push(['gate', z, '-', 1 + Math.floor(n / 4), 1]); z += TSP; } z += SP; }
      } else z += 6 + Math.floor(rnd() * 8);
    }

    // ---- enemy lane: packs every 9–14 m, a horde every ~60 m, explosives in between
    const packMul = 1.6 * (p.mod === 'siege' ? 0.8 : p.mod === 'swarm' ? 1.3 : 1);
    const hordeMul = 2 * (p.mod === 'siege' ? 1.25 : p.mod === 'swarm' ? 1.3 : 1);
    z = 40;
    let since = 0, floodDone = false;
    while (z < zEnd) {
      const frac = z / p.len;
      if (p.mod === 'flood' && !floodDone && z > p.len * 0.5) {
        floodDone = true;
        segs.push(['horde', z, Math.round(p.horde * 3.5), { crawler: 0.4, runner: 0.15 }]);
        z += 50; since = 0; continue;
      }
      if (since >= 60 && z > 90) {
        const cnt = Math.round(p.horde * hordeMul * ramp(z));
        segs.push(['horde', z, cnt, hordeMix(p)]);
        z += 12 + Math.ceil(cnt / 7) * 0.5; since = 0; continue;
      }
      const t = packType(p, rnd, frac);
      const base = t === 'brute' ? Math.max(2, Math.round(p.pack * 0.15)) : t === 'crawler' ? Math.round(p.pack * 1.3) : p.pack;
      segs.push(['pack', z, t, Math.max(4, Math.round(base * packMul * ramp(z)))]);
      if (rnd() < 0.18 && z > 70) segs.push(['explosive', z + 5, Math.round(18 * (1 + n * 0.6))]);
      const step = 11 + Math.floor(rnd() * 6);
      z += step; since += step;
    }

    // ---- supply lane: the row's stands, plus extra squad stands on supply runs
    const stands = p.stands.slice();
    if (p.mod === 'supply') for (let i = 0; i < 4; i++) stands.push(['bonus', 30 + n * 12, 'squad', 8 + n * 3, 0.18 + i * 0.2]);
    stands.forEach(s => {
      const hp = p.raw ? s[1] : Math.round(s[1] * STAND_HP_MULT);
      segs.push(['supply', Math.round(50 + (zEnd - 70) * s[4]), s[0], hp, s[2], s[3]]);
    });

    // ---- boss choice: a high-HP stand in the supply lane and a pumpable gate, met as the boss walks in
    const ch = p.choice;
    segs.push(['supply', p.len - 32, ch.kind, ch.hp, ch.payload, ch.amount || 0]);
    segs.push(['gate', p.len - 32, '+', ch.gate || 5 + Math.floor(n / 2)]);

    fixLayout(segs);
    const theme = THEME_ORDER[(n - 1) % THEME_ORDER.length];
    return {
      len: p.len, startN: p.startN, weapon: p.weapon, hpMult: p.hpMult, boss: { hp: p.bossHp, giant: !!p.giant },
      trickle: Object.assign({ type: p.mod === 'swarm' ? 'crawler' : p.mod === 'rush' ? 'runner' : null }, p.trickle),
      theme: theme, mod: p.mod, title: THEME_NAMES[theme], modName: MOD_NAMES[p.mod] || '', segs: segs,
    };
  }

  // Keep same-lane items apart: big gates SP from anything in the gate lane (never
  // stacked), tiles TILE_SPACING from each other, stands 10 m apart.
  function fixLayout(segs) {
    segs.sort((a, b) => a[1] - b[1]);
    let lastGate = -1e9, lastTile = false, lastStand = -1e9;
    segs.forEach(s => {
      if (s[0] === 'gate') {
        const gap = s[4] && lastTile ? TSP : SP;
        if (s[1] - lastGate < gap - 1e-6) s[1] = lastGate + gap;
        lastGate = s[1]; lastTile = !!s[4];
      }
      else if (s[0] === 'supply') { if (s[1] - lastStand < 10) s[1] = lastStand + 10; lastStand = s[1]; }
    });
    segs.sort((a, b) => a[1] - b[1]);
    return segs;
  }

  function scaledRow(n) {
    const base = ROWS[12], k = n - 12;
    const row = JSON.parse(JSON.stringify(base));
    const mods = ['rush', 'gauntlet', 'flood', 'siege', 'supply', 'swarm'];
    row.mod = mods[k % mods.length];
    row.len = Math.min(900, base.len + k * 15);
    row.startN = 56 + k * 4;
    row.hpMult = +(base.hpMult * Math.pow(1.1, k)).toFixed(2);
    row.bossHp = Math.round(base.bossHp * Math.pow(1.08, k) * (n % 5 === 0 ? 1.5 : 1));
    row.giant = n % 5 === 0;
    row.pack = Math.min(48, base.pack + k);
    row.horde = Math.min(120, base.horde + k * 2);
    row.neg = Math.min(12, base.neg + Math.floor(k / 2));
    row.trickle = { from: 90, every: Math.max(1.4, base.trickle.every - k * 0.05), count: Math.min(20, base.trickle.count + Math.floor(k / 2)) };
    row.choice = { kind: k % 2 ? 'bonus' : 'weapon', hp: Math.round(800 * Math.pow(1.12, k)), payload: k % 2 ? 'dmg' : 'rpg' };
    row.stands = row.stands.map(c => [c[0], Math.round(c[1] * Math.pow(1.12, k)), c[2], c[3] ? Math.round(c[3] * Math.pow(1.1, k)) : 0, c[4]]);
    return row;
  }

  const cache = {};
  L.get = function (n) {
    n = Math.max(1, Math.floor(n));
    if (!cache[n]) cache[n] = build(ROWS[n] ? JSON.parse(JSON.stringify(ROWS[n])) : scaledRow(n), n);
    return cache[n];
  };
  // Static check used by the handoff notes: count stacked gates (closer than SP).
  L.stackedGates = function (lv) {
    let bad = 0, last = -1e9, lastTile = false;
    lv.segs.forEach(s => { if (s[0] === 'gate') { const gap = s[4] && lastTile ? TSP : SP; if (s[1] - last < gap - 1e-6) bad++; last = s[1]; lastTile = !!s[4]; } });
    return bad;
  };
  L.THEME_ORDER = THEME_ORDER;
  ZRS.levels = L;
})();

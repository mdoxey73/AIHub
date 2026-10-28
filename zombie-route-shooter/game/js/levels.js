/* levels.js — level data. Levels 1–3 are laid out by hand segment by segment.
   Levels 4–12 are built from hand-tuned parameter rows by a deterministic
   generator (seeded per level). Levels beyond 12 scale those rows.

   Layout rules enforced by fixLayout() on every level:
     - gates are never stacked: chains are spaced GATE_CHAIN_SPACING apart
     - no zombie pack, horde or barrel sits in a gate's shadow (18–60 m behind
       a gate in the same lane), because gates absorb bullets
     - every level ends with a "boss choice": a high-HP barrel in one lane and a
       pumpable gate in the other, met while the boss walks in

   Segment forms (z is road distance in meters, lane is 'L', 'R' or 'B'):
     ['chain',  z, lane, op, value, count, spacing]      run of identical gates
     ['pair',   z, opL, valL, opR, valR]                 one gate per lane
     ['gate',   z, lane, op, value]
     ['pack',   z, lane, type, count]                    zombies in rows of 4
     ['horde',  z, count, type]                          both lanes, rows of 10
     ['barrel', z, lane, kind, hp, payload, amount]      kind weapon|bonus|explosive;
                                                         payload = weapon name or bonus type (squad|rate|dmg)
   A level also has trickle: { from, every, count } — a steady stream of small
   packs spawned ahead every `every` seconds once the squad passes `from`.
   ops: '+', 'x', '-', '/' */
(function () {
  const C = ZRS.CONFIG;
  const L = {};
  const SP = C.GATE_CHAIN_SPACING;
  const SH = C.GATE_SHADOW;
  const other = l => l === 'L' ? 'R' : 'L';

  function gateList(segs) {
    const g = [];
    segs.forEach(s => {
      if (s[0] === 'chain') { for (let i = 0; i < s[5]; i++) g.push({ z: s[1] + i * (s[6] || SP), lane: s[2] }); }
      else if (s[0] === 'pair') { g.push({ z: s[1], lane: 'L' }); g.push({ z: s[1], lane: 'R' }); }
      else if (s[0] === 'gate') g.push({ z: s[1], lane: s[2] });
    });
    return g;
  }
  function shadowed(gates, z, lane) {
    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      if (lane !== 'B' && g.lane !== 'B' && g.lane !== lane) continue;
      const d = z - g.z;
      if (d > SH[0] && d < SH[1]) return g;
    }
    return null;
  }
  // Move packs and hordes out of gate shadows: try the other lane, else push them
  // farther up the road (in 4 m steps) until no gate shadows them.
  function fixLayout(segs, len) {
    const gates = gateList(segs);
    const clear = (z, lane) => !shadowed(gates, z, lane);
    segs.forEach(s => {
      if (s[0] !== 'pack' && s[0] !== 'horde') return;
      const lane = s[0] === 'horde' ? 'B' : s[2];
      if (clear(s[1], lane)) return;
      if (lane !== 'B' && clear(s[1], other(lane))) { s[2] = other(lane); return; }
      let z = s[1], tries = 0;
      while (tries++ < 80 && !clear(z, lane)) z += 4;
      s[1] = Math.min(z, len - 45);
    });
    segs.sort((a, b) => a[1] - b[1]);
    return segs;
  }

  function lvl(len, startN, weapon, hpMult, bossHp, giant, trickle, bossChoice, segs) {
    // boss choice: barrel in one lane, pumpable gate in the other, met as the boss walks in
    const bl = bossChoice.lane || 'L';
    segs.push(['barrel', len - 32, bl, bossChoice.kind, bossChoice.hp, bossChoice.payload, bossChoice.amount || 0]);
    segs.push(['gate', len - 32, other(bl), '+', bossChoice.gate || 5]);
    fixLayout(segs, len);
    return { len: len, startN: startN, weapon: weapon, hpMult: hpMult, boss: { hp: bossHp, giant: !!giant }, trickle: trickle, segs: segs };
  }

  const HAND = {
    1: lvl(440, 1, 'pistol', 1.2, 70000, false, { from: 120, every: 4.5, count: 4 }, { lane: 'L', kind: 'bonus', hp: 60, payload: 'dmg', gate: 5 }, [
      ['chain', 18, 'R', '+', 1, 3, SP],
      ['pair', 62, '+', 3, '+', 1],
      ['pack', 72, 'L', 'walker', 3], ['barrel', 80, 'L', 'weapon', 8, 'minigun'],
      ['pack', 112, 'L', 'walker', 8],
      ['pack', 118, 'R', 'walker', 5], ['barrel', 126, 'R', 'bonus', 12, 'squad', 5],
      ['horde', 136, 26],
      ['chain', 150, 'L', '+', 1, 3, SP],
      ['pack', 190, 'L', 'walker', 8],
      ['pair', 198, 'x', 2, '+', 4],
      ['pack', 206, 'R', 'walker', 8], ['barrel', 214, 'R', 'explosive', 9],
      ['horde', 266, 34],
      ['pack', 292, 'R', 'walker', 6], ['barrel', 300, 'R', 'bonus', 30, 'rate'],
      ['pack', 310, 'L', 'walker', 8],
      ['chain', 318, 'L', '+', 2, 2, SP],
      ['pack', 338, 'R', 'walker', 10],
      ['pair', 364, '+', 5, 'x', 2],
      ['pack', 372, 'R', 'walker', 8], ['pack', 376, 'L', 'walker', 6],
    ]),
    2: lvl(500, 3, 'rifle', 2.6, 150000, false, { from: 60, every: 3.5, count: 5 }, { lane: 'R', kind: 'weapon', hp: 90, payload: 'rpg', gate: 6 }, [
      ['chain', 18, 'L', '+', 1, 4, SP],
      ['pack', 60, 'R', 'walker', 8],
      ['pair', 76, '+', 2, 'x', 2],
      ['pack', 86, 'L', 'walker', 8], ['pack', 90, 'R', 'walker', 6],
      ['pack', 130, 'L', 'walker', 7], ['barrel', 138, 'L', 'explosive', 12],
      ['pack', 134, 'R', 'walker', 7], ['barrel', 142, 'R', 'weapon', 30, 'minigun'],
      ['chain', 154, 'L', '+', 2, 3, SP],
      ['pack', 186, 'L', 'walker', 6],
      ['horde', 212, 36],
      ['pair', 222, 'x', 2, '+', 4],
      ['pack', 230, 'R', 'walker', 8], ['barrel', 238, 'R', 'bonus', 36, 'squad', 8],
      ['pack', 234, 'L', 'walker', 10],
      ['chain', 274, 'R', '+', 1, 4, SP],
      ['pack', 300, 'L', 'walker', 8], ['barrel', 308, 'L', 'bonus', 50, 'rate'],
      ['pack', 326, 'R', 'walker', 8],
      ['horde', 346, 44],
      ['pair', 364, '+', 5, 'x', 2],
      ['pack', 372, 'R', 'walker', 10], ['barrel', 380, 'R', 'explosive', 20],
      ['pack', 376, 'L', 'walker', 12],
      ['pack', 414, 'L', 'walker', 8],
      ['chain', 420, 'L', '+', 2, 2, SP],
    ]),
    3: lvl(540, 3, 'rifle', 3.4, 220000, false, { from: 50, every: 3.0, count: 6 }, { lane: 'L', kind: 'bonus', hp: 120, payload: 'dmg', gate: 6 }, [
      ['chain', 18, 'R', '+', 1, 4, SP],
      ['pack', 52, 'L', 'walker', 8], ['pack', 60, 'R', 'runner', 4],
      ['pair', 80, '+', 4, '-', 3],
      ['pack', 90, 'R', 'walker', 9],
      ['pack', 94, 'L', 'walker', 8], ['barrel', 102, 'L', 'weapon', 60, 'shotgun'],
      ['pack', 134, 'R', 'runner', 8],
      ['pair', 142, '/', 2, 'x', 2],
      ['pack', 152, 'L', 'walker', 8],
      ['chain', 166, 'L', '+', 2, 3, SP],
      ['pack', 196, 'R', 'walker', 10], ['barrel', 204, 'R', 'explosive', 18],
      ['horde', 222, 44],
      ['pair', 228, 'x', 2, '-', 5],
      ['pack', 238, 'L', 'walker', 8], ['barrel', 246, 'L', 'bonus', 60, 'squad', 10],
      ['pack', 292, 'L', 'walker', 10],
      ['chain', 302, 'R', '+', 1, 4, SP],
      ['pack', 350, 'L', 'walker', 12], ['pack', 352, 'R', 'runner', 8],
      ['pair', 364, '-', 4, '+', 5],
      ['pack', 372, 'L', 'walker', 8], ['barrel', 380, 'L', 'weapon', 90, 'minigun'],
      ['pack', 410, 'R', 'walker', 8],
      ['pair', 418, 'x', 3, '/', 2],
      ['pack', 426, 'R', 'walker', 8], ['barrel', 434, 'R', 'bonus', 90, 'dmg'],
      ['horde', 470, 52],
      ['pack', 482, 'L', 'walker', 8],
      ['chain', 488, 'L', '+', 2, 2, SP],
    ]),
  };

  // Hand-tuned parameter rows for levels 4–12.
  // crates: [kind, hp, payload, amount, at(0..1)]; hp is multiplied by BARREL_HP_MULT at build time
  const BARREL_HP_MULT = 3;
  const ROWS = {
    4:  { len: 560, startN: 12, weapon: 'rifle',   hpMult: 4.0,  bossHp: 200000,  giant: false, pack: 12, horde: 36, neg: 3, runners: true,  brutes: false, trickle: { from: 90, every: 2.8, count: 6 }, choice: { kind: 'weapon', hp: 150, payload: 'rpg' },
          crates: [['weapon', 40, 'minigun', 0, 0.15], ['bonus', 20, 'squad', 12, 0.3], ['explosive', 18, null, 0, 0.45], ['bonus', 40, 'rate', 0, 0.6], ['weapon', 60, 'shotgun', 0, 0.75], ['bonus', 50, 'dmg', 0, 0.88]] },
    5:  { len: 580, startN: 12, weapon: 'rifle',   hpMult: 5.2,  bossHp: 600000,  giant: true,  pack: 14, horde: 40, neg: 3, runners: true,  brutes: true,  trickle: { from: 90, every: 2.6, count: 6 }, choice: { kind: 'bonus', hp: 200, payload: 'dmg' },
          crates: [['weapon', 50, 'minigun', 0, 0.14], ['bonus', 30, 'squad', 15, 0.28], ['explosive', 24, null, 0, 0.4], ['weapon', 100, 'rpg', 0, 0.55], ['bonus', 60, 'rate', 0, 0.7], ['explosive', 30, null, 0, 0.82], ['bonus', 70, 'dmg', 0, 0.9]] },
    6:  { len: 600, startN: 16, weapon: 'minigun', hpMult: 6.5,  bossHp: 450000,  giant: false, pack: 16, horde: 44, neg: 4, runners: true,  brutes: true,  trickle: { from: 90, every: 2.4, count: 7 }, choice: { kind: 'weapon', hp: 260, payload: 'drone' },
          crates: [['weapon', 60, 'minigun', 0, 0.12], ['explosive', 30, null, 0, 0.3], ['bonus', 40, 'squad', 20, 0.42], ['weapon', 168, 'drone', 0, 0.55], ['bonus', 80, 'rate', 0, 0.68], ['weapon', 140, 'rpg', 0, 0.8], ['bonus', 90, 'dmg', 0, 0.9]] },
    7:  { len: 620, startN: 20, weapon: 'minigun', hpMult: 8.0,  bossHp: 520000,  giant: false, pack: 18, horde: 48, neg: 4, runners: true,  brutes: true,  trickle: { from: 90, every: 2.8, count: 8 }, choice: { kind: 'bonus', hp: 300, payload: 'rate' },
          crates: [['weapon', 60, 'shotgun', 0, 0.12], ['bonus', 50, 'squad', 25, 0.26], ['weapon', 90, 'minigun', 0, 0.4], ['bonus', 90, 'rate', 0, 0.55], ['explosive', 40, null, 0, 0.66], ['weapon', 180, 'rpg', 0, 0.78], ['bonus', 100, 'dmg', 0, 0.9]] },
    8:  { len: 640, startN: 24, weapon: 'minigun', hpMult: 10,   bossHp: 640000,  giant: false, pack: 20, horde: 52, neg: 5, runners: true,  brutes: true,  trickle: { from: 90, every: 2.6, count: 8 }, choice: { kind: 'weapon', hp: 400, payload: 'rpg' },
          crates: [['weapon', 120, 'minigun', 0, 0.12], ['bonus', 60, 'squad', 30, 0.26], ['explosive', 50, null, 0, 0.4], ['weapon', 200, 'drone', 0, 0.52], ['bonus', 110, 'rate', 0, 0.64], ['weapon', 220, 'rpg', 0, 0.78], ['bonus', 120, 'dmg', 0, 0.9]] },
    9:  { len: 660, startN: 36, weapon: 'minigun', hpMult: 12,   bossHp: 750000,  giant: false, pack: 24, horde: 56, neg: 5, runners: true,  brutes: true,  trickle: { from: 90, every: 2.5, count: 9 }, choice: { kind: 'bonus', hp: 450, payload: 'dmg' },
          crates: [['weapon', 120, 'shotgun', 0, 0.1], ['bonus', 70, 'squad', 35, 0.24], ['weapon', 160, 'minigun', 0, 0.36], ['explosive', 60, null, 0, 0.48], ['bonus', 130, 'rate', 0, 0.6], ['weapon', 200, 'rpg', 0, 0.72], ['explosive', 60, null, 0, 0.82], ['bonus', 140, 'dmg', 0, 0.9]] },
    10: { len: 700, startN: 44, weapon: 'minigun', hpMult: 14,   bossHp: 1400000, giant: true,  pack: 28, horde: 60, neg: 6, runners: true,  brutes: true,  trickle: { from: 90, every: 2.3, count: 10 }, choice: { kind: 'weapon', hp: 600, payload: 'rpg' },
          crates: [['weapon', 150, 'minigun', 0, 0.1], ['bonus', 80, 'squad', 40, 0.22], ['weapon', 300, 'drone', 0, 0.34], ['explosive', 80, null, 0, 0.46], ['bonus', 150, 'rate', 0, 0.58], ['weapon', 280, 'rpg', 0, 0.68], ['explosive', 80, null, 0, 0.8], ['bonus', 160, 'dmg', 0, 0.9]] },
    11: { len: 740, startN: 50, weapon: 'minigun', hpMult: 15,   bossHp: 950000,  giant: false, pack: 30, horde: 56, neg: 6, runners: true,  brutes: true,  trickle: { from: 90, every: 2.2, count: 10 }, choice: { kind: 'bonus', hp: 700, payload: 'dmg' },
          crates: [['weapon', 180, 'minigun', 0, 0.1], ['weapon', 800, 'vehicle', 0, 0.26], ['bonus', 90, 'squad', 45, 0.38], ['explosive', 90, null, 0, 0.5], ['bonus', 170, 'rate', 0, 0.6], ['weapon', 320, 'rpg', 0, 0.7], ['weapon', 360, 'drone', 0, 0.82], ['bonus', 180, 'dmg', 0, 0.9]] },
    12: { len: 780, startN: 56, weapon: 'minigun', hpMult: 17,   bossHp: 1200000, giant: false, pack: 32, horde: 60, neg: 7, runners: true,  brutes: true,  trickle: { from: 90, every: 2.1, count: 10 }, choice: { kind: 'weapon', hp: 800, payload: 'rpg' },
          crates: [['weapon', 200, 'minigun', 0, 0.08], ['bonus', 100, 'squad', 50, 0.2], ['explosive', 100, null, 0, 0.3], ['weapon', 400, 'rpg', 0, 0.44], ['bonus', 190, 'rate', 0, 0.56], ['weapon', 420, 'drone', 0, 0.68], ['explosive', 120, null, 0, 0.8], ['bonus', 200, 'dmg', 0, 0.9]] },
  };

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function build(p, seed, n) {
    const rnd = mulberry32(seed);
    const segs = [];
    const lane = () => rnd() < 0.5 ? 'L' : 'R';
    const zEnd = p.len - 100;
    const crates = p.crates.map(c => ({ z: Math.round(64 + (zEnd - 64) * c[4]), kind: c[0], hp: Math.round(c[1] * (c[0] === 'explosive' ? 1.5 : BARREL_HP_MULT)), payload: c[2], amount: c[3] }));
    let negLeft = p.neg, k = 0;
    // safe runway: a chain and an all-positive pair before the first zombie
    segs.push(['chain', 18, lane(), '+', 1, 3, SP]);
    segs.push(['pair', 62, '+', 3, '+', 1]);
    let z = 72;
    const early = c => (z < p.len * 0.3 ? Math.ceil(c * 0.35) : z < p.len * 0.5 ? Math.ceil(c * 0.7) : c);
    while (z < zEnd) {
      const phase = k % 8; k++;
      p._z = z;
      const l = lane();
      switch (phase) {
        case 0: { const cnt = 2 + Math.floor(rnd() * 2); segs.push(['chain', z, l, '+', 1 + Math.floor(rnd() * 2), cnt, SP]); segs.push(['pack', z - 8, other(l), pickType(p, rnd, false), early(Math.ceil(p.pack * 0.8))]); z += cnt * SP + 10; break; }
        case 1: segs.push(['pack', z, l, pickType(p, rnd, false), early(p.pack)]); segs.push(['pack', z + 3, other(l), 'walker', early(Math.ceil(p.pack * 0.7))]); z += 22; break;
        case 2: {
          const good = rnd() < 0.5 ? ['x', 2] : ['+', 3 + Math.floor(rnd() * 4)];
          let bad;
          if (negLeft > 0) { negLeft--; bad = rnd() < 0.5 ? ['-', 3 + Math.floor(rnd() * 5)] : ['/', 2]; } else bad = ['+', 1 + Math.floor(rnd() * 2)];
          segs.push(['pack', z - 8, lane(), pickType(p, rnd, true), early(Math.ceil(p.pack * 0.9))]);
          if (l === 'L') segs.push(['pair', z, good[0], good[1], bad[0], bad[1]]); else segs.push(['pair', z, bad[0], bad[1], good[0], good[1]]);
          z += 24; break;
        }
        case 3: segs.push(['pack', z, l, pickType(p, rnd, true), early(p.pack)]); segs.push(['pack', z + 5, other(l), pickType(p, rnd, false), early(p.pack)]); z += 24; break;
        case 4: { const mult = p.brutes && rnd() < 0.35; const cnt = 2; segs.push(['chain', z, l, mult ? 'x' : '+', 2, cnt, SP]); segs.push(['pack', z - 8, other(l), 'walker', early(p.pack)]); z += cnt * SP + 10; break; }
        case 5: segs.push(['horde', z, p.horde, 'walker']); z += 36; break;
        case 6: {
          const good = ['x', rnd() < 0.3 ? 3 : 2];
          const alt = negLeft > 0 && rnd() < 0.6 ? (negLeft--, ['/', 2]) : ['+', 2 + Math.floor(rnd() * 3)];
          segs.push(['pack', z - 8, lane(), 'runner', early(Math.ceil(p.pack * 0.8))]);
          if (l === 'L') segs.push(['pair', z, good[0], good[1], alt[0], alt[1]]); else segs.push(['pair', z, alt[0], alt[1], good[0], good[1]]);
          z += 24; break;
        }
        default: segs.push(['pack', z, 'L', 'walker', early(p.pack)]); segs.push(['pack', z + 2, 'R', pickType(p, rnd, true), early(p.pack)]); z += 26;
      }
    }
    crates.forEach(c => {
      const l = lane();
      segs.push(['barrel', c.z, l, c.kind, c.hp, c.payload, c.amount]);
      segs.push(['pack', c.z - 7, l, 'walker', c.z < p.len * 0.3 ? Math.ceil(p.pack * 0.4) : Math.ceil(p.pack * 0.6)]);
    });
    const choice = Object.assign({ lane: n % 2 ? 'L' : 'R', gate: 5 + Math.floor(n / 2) }, p.choice);
    return lvl(p.len, p.startN, p.weapon, p.hpMult, p.bossHp, p.giant, p.trickle, choice, segs);
  }
  function pickType(p, rnd, allowBrute) {
    if (allowBrute && p.brutes && p._z > p.len * 0.3 && rnd() < 0.4) return 'brute';
    if (p.runners && rnd() < 0.4) return 'runner';
    return 'walker';
  }
  function scaledRow(n) {
    const base = ROWS[12], k = n - 12;
    const row = JSON.parse(JSON.stringify(base));
    row.len = Math.min(900, base.len + k * 15);
    row.startN = 56 + k * 4;
    row.hpMult = +(base.hpMult * Math.pow(1.1, k)).toFixed(2);
    row.bossHp = Math.round(base.bossHp * Math.pow(1.08, k) * (n % 5 === 0 ? 1.5 : 1));
    row.giant = n % 5 === 0;
    row.pack = Math.min(48, base.pack + k);
    row.horde = Math.min(80, base.horde + k * 2);
    row.neg = Math.min(10, base.neg + Math.floor(k / 2));
    row.trickle = { from: 90, every: Math.max(1.4, base.trickle.every - k * 0.05), count: Math.min(14, base.trickle.count + Math.floor(k / 2)) };
    row.choice = { kind: k % 2 ? 'bonus' : 'weapon', hp: Math.round(800 * Math.pow(1.12, k)), payload: k % 2 ? 'dmg' : 'rpg' };
    row.crates = row.crates.map(c => [c[0], Math.round(c[1] * Math.pow(1.12, k)), c[2], c[3] ? Math.round(c[3] * Math.pow(1.1, k)) : 0, c[4]]);
    return row;
  }

  L.get = function (n) {
    n = Math.max(1, Math.floor(n));
    if (HAND[n]) return HAND[n];
    const row = ROWS[n] || scaledRow(n);
    return build(row, 1000 + n * 7919, n);
  };
  L.gateList = gateList; L.shadowed = shadowed;
  ZRS.levels = L;
})();

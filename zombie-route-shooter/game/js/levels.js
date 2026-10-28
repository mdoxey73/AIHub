/* levels.js — level data. Levels 1–3 are laid out by hand segment by segment.
   Levels 4–12 are built from hand-tuned parameter rows by a deterministic
   generator (seeded per level). Levels beyond 12 scale those rows.

   Segment forms (z is road distance in meters, lane is 'L', 'R' or 'B'):
     ['chain',  z, lane, op, value, count, spacing]   run of identical gates
     ['pair',   z, opL, valL, opR, valR]              one gate per lane
     ['gate',   z, lane, op, value]
     ['pack',   z, lane, type, count]                 zombies in rows of 4
     ['horde',  z, count, type]                       both lanes, rows of 8
     ['barrel', z, lane, kind, hp, weapon]            kind 'weapon' | 'explosive'
   ops: '+', 'x', '-', '/' */
(function () {
  const L = {};
  L.HAND_COUNT = 12;

  function lvl(len, startN, weapon, hpMult, bossHp, giant, segs) {
    segs.sort((a, b) => a[1] - b[1]);
    return { len: len, startN: startN, weapon: weapon, hpMult: hpMult, boss: { hp: bossHp, giant: !!giant }, segs: segs };
  }

  const HAND = {
    1: lvl(420, 1, 'pistol', 1.0, 12000, false, [
      ['chain', 28, 'R', '+', 1, 5, 2.5],
      ['pair', 58, '+', 2, '+', 1],
      ['pack', 74, 'L', 'walker', 3],
      ['barrel', 92, 'L', 'weapon', 5, 'minigun'],
      ['chain', 110, 'R', '+', 1, 4, 2.5],
      ['pack', 128, 'R', 'walker', 4],
      ['pair', 150, 'x', 2, '+', 3],
      ['pack', 168, 'L', 'walker', 5],
      ['pack', 172, 'R', 'walker', 3],
      ['barrel', 192, 'R', 'explosive', 9],
      ['pack', 194, 'R', 'walker', 4],
      ['chain', 212, 'L', '+', 2, 3, 3],
      ['horde', 240, 10],
      ['pair', 272, '+', 3, 'x', 2],
      ['pack', 300, 'L', 'walker', 6],
      ['chain', 322, 'R', '+', 1, 6, 2.5],
      ['pack', 350, 'R', 'walker', 5],
    ]),
    2: lvl(470, 3, 'rifle', 1.5, 18000, false, [
      ['chain', 25, 'L', '+', 1, 6, 2.5],
      ['pack', 40, 'R', 'walker', 5],
      ['pair', 62, '+', 2, 'x', 2],
      ['pack', 80, 'L', 'walker', 5],
      ['barrel', 96, 'L', 'explosive', 9],
      ['pack', 98, 'L', 'walker', 4],
      ['barrel', 118, 'R', 'weapon', 12, 'minigun'],
      ['pack', 120, 'R', 'walker', 5],
      ['chain', 140, 'L', '+', 2, 4, 3],
      ['pack', 165, 'L', 'walker', 6],
      ['pack', 168, 'R', 'walker', 6],
      ['pair', 190, 'x', 2, '+', 4],
      ['horde', 215, 12],
      ['chain', 245, 'R', '+', 1, 8, 2.2],
      ['pack', 270, 'L', 'walker', 8],
      ['barrel', 290, 'R', 'explosive', 15],
      ['pack', 292, 'R', 'walker', 6],
      ['pair', 315, '+', 5, 'x', 2],
      ['horde', 340, 14],
      ['chain', 370, 'L', '+', 2, 5, 2.5],
      ['pack', 395, 'R', 'walker', 8],
    ]),
    3: lvl(500, 3, 'rifle', 2.0, 24000, false, [
      ['chain', 25, 'R', '+', 1, 6, 2.5],
      ['pack', 45, 'L', 'walker', 5],
      ['pair', 66, '+', 4, '-', 3],
      ['pack', 85, 'R', 'walker', 6],
      ['barrel', 100, 'L', 'weapon', 25, 'shotgun'],
      ['pack', 102, 'L', 'walker', 5],
      ['pair', 125, '/', 2, 'x', 2],
      ['chain', 145, 'L', '+', 2, 4, 3],
      ['pack', 150, 'R', 'walker', 7],
      ['barrel', 172, 'R', 'explosive', 14],
      ['pack', 174, 'R', 'walker', 6],
      ['pair', 195, 'x', 2, '-', 5],
      ['horde', 220, 14],
      ['chain', 250, 'R', '+', 1, 8, 2.2],
      ['pack', 255, 'L', 'walker', 8],
      ['pair', 285, '-', 4, '+', 5],
      ['pack', 300, 'L', 'walker', 7],
      ['pack', 303, 'R', 'walker', 7],
      ['barrel', 325, 'L', 'weapon', 30, 'minigun'],
      ['pair', 350, 'x', 3, '/', 2],
      ['horde', 375, 16],
      ['chain', 405, 'L', '+', 2, 5, 2.5],
      ['pack', 430, 'R', 'walker', 9],
    ]),
  };

  // Hand-tuned parameter rows for levels 4–12.
  //  len, startN, weapon, hpMult, bossHp, giant, pack, horde, negGates, runners, brutes, crates [[kind, hp, weapon, at(0..1)]]
  const ROWS = {
    4:  { len: 520, startN: 4, weapon: 'rifle', hpMult: 2.75, bossHp: 58000,  giant: false, pack: 8,  horde: 15, neg: 3, runners: false, brutes: false, crates: [['weapon', 40, 'minigun', 0.2], ['explosive', 18, null, 0.45], ['weapon', 60, 'shotgun', 0.7]], mult3: true },
    5:  { len: 540, startN: 4, weapon: 'rifle', hpMult: 3.5,  bossHp: 60000,  giant: true,  pack: 10, horde: 18, neg: 3, runners: false, brutes: false, crates: [['weapon', 50, 'minigun', 0.18], ['explosive', 24, null, 0.4], ['weapon', 100, 'rpg', 0.62], ['explosive', 30, null, 0.8]], mult3: true },
    6:  { len: 560, startN: 5, weapon: 'rifle', hpMult: 4.5,  bossHp: 40000,  giant: false, pack: 12, horde: 20, neg: 4, runners: false, brutes: false, crates: [['weapon', 60, 'minigun', 0.15], ['explosive', 30, null, 0.35], ['explosive', 30, null, 0.37], ['weapon', 168, 'drone', 0.55], ['weapon', 140, 'rpg', 0.78]], mult3: true },
    7:  { len: 580, startN: 5, weapon: 'rifle', hpMult: 5.5,  bossHp: 46000,  giant: false, pack: 14, horde: 22, neg: 4, runners: true,  brutes: false, crates: [['weapon', 60, 'shotgun', 0.15], ['weapon', 90, 'minigun', 0.4], ['explosive', 40, null, 0.6], ['weapon', 180, 'rpg', 0.8]], mult3: true },
    8:  { len: 600, startN: 6, weapon: 'rifle', hpMult: 7.0,  bossHp: 52000,  giant: false, pack: 16, horde: 24, neg: 5, runners: true,  brutes: true,  crates: [['weapon', 120, 'minigun', 0.15], ['explosive', 50, null, 0.4], ['weapon', 200, 'drone', 0.55], ['weapon', 220, 'rpg', 0.78]], mult3: true },
    9:  { len: 620, startN: 6, weapon: 'rifle', hpMult: 8.5,  bossHp: 58000,  giant: false, pack: 20, horde: 28, neg: 5, runners: true,  brutes: true,  crates: [['weapon', 120, 'shotgun', 0.12], ['weapon', 160, 'minigun', 0.35], ['explosive', 60, null, 0.5], ['weapon', 200, 'rpg', 0.7], ['explosive', 60, null, 0.85]], mult3: true },
    10: { len: 650, startN: 7, weapon: 'rifle', hpMult: 10,   bossHp: 110000, giant: true,  pack: 24, horde: 32, neg: 6, runners: true,  brutes: true,  crates: [['weapon', 150, 'minigun', 0.12], ['weapon', 300, 'drone', 0.35], ['explosive', 80, null, 0.5], ['weapon', 280, 'rpg', 0.68], ['explosive', 80, null, 0.82]], mult3: true },
    11: { len: 680, startN: 8, weapon: 'rifle', hpMult: 12,   bossHp: 70000,  giant: false, pack: 28, horde: 36, neg: 6, runners: true,  brutes: true,  crates: [['weapon', 180, 'minigun', 0.12], ['weapon', 800, 'vehicle', 0.3], ['explosive', 90, null, 0.5], ['weapon', 320, 'rpg', 0.68], ['weapon', 360, 'drone', 0.84]], mult3: true },
    12: { len: 720, startN: 8, weapon: 'rifle', hpMult: 14,   bossHp: 80000,  giant: false, pack: 32, horde: 40, neg: 7, runners: true,  brutes: true,  crates: [['weapon', 200, 'minigun', 0.1], ['explosive', 100, null, 0.3], ['weapon', 400, 'rpg', 0.5], ['weapon', 420, 'drone', 0.7], ['explosive', 120, null, 0.88]], mult3: true },
  };

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function build(p, seed, levelNum) {
    const rnd = mulberry32(seed);
    const segs = [];
    const lane = () => rnd() < 0.5 ? 'L' : 'R';
    const other = l => l === 'L' ? 'R' : 'L';
    const zEnd = p.len - 95;
    let z = 22;
    // crates at their fractional positions
    const crates = p.crates.map(c => ({ z: Math.round(22 + (zEnd - 22) * c[3]), kind: c[0], hp: c[1], weapon: c[2] }));
    let negLeft = p.neg, k = 0;
    while (z < zEnd) {
      const phase = k % 8; k++;
      const l = lane();
      switch (phase) {
        case 0: segs.push(['chain', z, l, '+', 1 + Math.floor(rnd() * 2), 5 + Math.floor(rnd() * 4), 2.3]); z += 26; break;
        case 1: segs.push(['pack', z, l, pickType(p, rnd, false), p.pack]); if (rnd() < 0.5) segs.push(['pack', z + 3, other(l), 'walker', Math.ceil(p.pack * 0.6)]); z += 24; break;
        case 2: {
          const good = rnd() < 0.5 ? ['x', 2] : ['+', 3 + Math.floor(rnd() * 4)];
          let bad;
          if (negLeft > 0) { negLeft--; bad = rnd() < 0.5 ? ['-', 3 + Math.floor(rnd() * 5)] : ['/', 2]; } else bad = ['+', 1 + Math.floor(rnd() * 2)];
          if (l === 'L') segs.push(['pair', z, good[0], good[1], bad[0], bad[1]]); else segs.push(['pair', z, bad[0], bad[1], good[0], good[1]]);
          z += 24; break;
        }
        case 3: segs.push(['pack', z, l, pickType(p, rnd, true), p.pack]); z += 24; break;
        case 4: segs.push(['chain', z, l, p.mult3 && rnd() < 0.35 ? 'x' : '+', p.mult3 && rnd() < 0.35 ? (rnd() < 0.5 ? 2 : 3) : 2, 3 + Math.floor(rnd() * 3), 3]); z += 26; break;
        case 5: segs.push(['horde', z, p.horde, 'walker']); z += 34; break;
        case 6: {
          const good = ['x', rnd() < 0.3 ? 3 : 2];
          const alt = negLeft > 0 && rnd() < 0.6 ? (negLeft--, ['/', 2]) : ['+', 2 + Math.floor(rnd() * 3)];
          if (l === 'L') segs.push(['pair', z, good[0], good[1], alt[0], alt[1]]); else segs.push(['pair', z, alt[0], alt[1], good[0], good[1]]);
          z += 24; break;
        }
        default: segs.push(['pack', z, 'L', 'walker', Math.ceil(p.pack * 0.7)]); segs.push(['pack', z + 2, 'R', pickType(p, rnd, false), Math.ceil(p.pack * 0.7)]); z += 28;
      }
    }
    // crates go next to zombies so the lane choice matters
    crates.forEach(c => {
      const l = lane();
      segs.push(['barrel', c.z, l, c.kind, c.hp, c.weapon]);
      segs.push(['pack', c.z + 2, l, 'walker', Math.ceil(p.pack * 0.5)]);
    });
    return lvl(p.len, p.startN, p.weapon, p.hpMult, p.bossHp, p.giant, segs);
  }
  function pickType(p, rnd, allowBrute) {
    if (allowBrute && p.brutes && rnd() < 0.45) return 'brute';
    if (p.runners && rnd() < 0.4) return 'runner';
    return 'walker';
  }
  function scaledRow(n) {
    const base = ROWS[12], k = n - 12;
    const row = JSON.parse(JSON.stringify(base));
    row.len = Math.min(900, base.len + k * 15);
    row.startN = 8 + Math.floor(k / 2);
    row.hpMult = +(base.hpMult * Math.pow(1.15, k)).toFixed(2);
    row.bossHp = Math.round(base.bossHp * Math.pow(1.08, k) * (n % 5 === 0 ? 1.5 : 1));
    row.giant = n % 5 === 0;
    row.pack = Math.min(48, base.pack + k);
    row.horde = Math.min(64, base.horde + k * 2);
    row.neg = Math.min(10, base.neg + Math.floor(k / 2));
    row.crates = row.crates.map(c => [c[0], Math.round(c[1] * Math.pow(1.15, k)), c[2], c[3]]);
    return row;
  }

  L.get = function (n) {
    n = Math.max(1, Math.floor(n));
    if (HAND[n]) return HAND[n];
    const row = ROWS[n] || scaledRow(n);
    return build(row, 1000 + n * 7919, n);
  };
  ZRS.levels = L;
})();

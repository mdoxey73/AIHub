/* barrels.js — numbered barrels and crates. The number is HP; it must be shot
   to zero to collect what sits on top. Kinds:
     weapon    unlocks the weapon hovering above it (pistol..rpg, drone, vehicle)
     bonus     squad (+N soldiers), rate (+fire rate) or dmg (+damage)
     explosive area blast that chains; running into one alive costs soldiers
   Reaching an unbroken weapon/bonus barrel shoves it aside with no reward. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, F = ZRS.fx, A = ZRS.audio;
  const R = {};
  const pool = [];
  for (let i = 0; i < C.MAX_BARRELS; i++) pool.push({ a: false, z: 0, x: 0, lane: 'L', kind: 'weapon', hp: 1, maxHp: 1, weapon: null, bonus: null, amount: 0, big: false, broken: false, hitT: 0, bob: 0 });
  let next = 0;
  R.items = pool;
  const pa = {};

  R.reset = function () { pool.forEach(b => b.a = false); };
  // spawn(z, lane, kind, hp, payload, amount): payload is a weapon name or a bonus type
  R.spawn = function (z, lane, kind, hp, payload, amount) {
    const b = pool[next]; next = (next + 1) % pool.length;
    b.a = true; b.z = z; b.lane = lane; b.x = lane === 'L' ? -0.5 : lane === 'R' ? 0.5 : 0;
    b.kind = kind; b.hp = b.maxHp = hp; b.broken = false; b.hitT = 0; b.bob = Math.random() * 6;
    b.weapon = kind === 'weapon' ? payload : null;
    b.bonus = kind === 'bonus' ? payload : null;
    b.amount = amount || 0;
    b.big = kind !== 'explosive' && hp >= 150;
    return b;
  };
  R.hitTest = function (prevZ, z, x) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const b = pool[i]; if (!b.a || b.broken) continue;
      if (b.z + C.BARREL_D < prevZ || b.z - C.BARREL_D > z) continue;
      if (Math.abs(x - b.x) > C.BARREL_W) continue;
      if (!best || b.z < best.z) best = b;
    }
    return best;
  };
  R.damage = function (b, dmg, src, squadZ) {
    if (b.broken) return;
    b.hp -= dmg; b.hitT = 0.08;
    if (b.hp <= 0) { b.hp = 0; R.breakIt(b, squadZ, false); }
  };
  R.breakIt = function (b, squadZ, byContact) {
    b.broken = true;
    cam.project(b.z - squadZ, b.x, pa);
    if (b.kind === 'explosive') {
      ZRS.bullets.explodeAt(b.z, b.x, C.EXPLOSION_DAMAGE, C.EXPLOSION_RADIUS, squadZ);
      if (byContact) ZRS.squad.lose(C.EXPLOSION_SQUAD_KILLS, 'explosion');
      return;
    }
    F.splinters(pa.x, pa.y - 20 * pa.s, Math.max(0.3, pa.s), b.big ? '#c9a461' : '#a8743c');
    A.barrel();
    if (byContact) return;
    if (b.kind === 'weapon' && b.weapon) ZRS.squad.grant(b.weapon);
    else if (b.kind === 'bonus' && b.bonus) ZRS.squad.grantBonus(b.bonus, b.amount);
  };
  R.update = function (dt, squad) {
    for (let i = 0; i < pool.length; i++) {
      const b = pool[i]; if (!b.a) continue;
      if (b.hitT > 0) b.hitT -= dt;
      b.bob += dt * 3;
      if (!b.broken) {
        const dz = b.z - squad.z;
        if (dz < 0.9 && dz > -0.9 && Math.abs(b.x - squad.x) < squad.halfW + C.BARREL_W) R.breakIt(b, squad.z, true);
      }
      if (b.z - squad.z < -C.CULL_BEHIND) b.a = false;
    }
  };
  function bonusLabel(b) {
    if (b.bonus === 'squad') return '+' + b.amount;
    if (b.bonus === 'rate') return 'RATE+';
    return 'DMG+';
  }
  R.drawOne = function (g, b, squadZ) {
    if (b.broken) return;
    const dz = b.z - squadZ;
    cam.project(dz, b.x, pa);
    const s = pa.s;
    const kind = b.big ? 'crate' : 'barrel';
    const sc = b.big ? s * 1.15 : s;
    if (b.kind === 'explosive' && s > 0.1) { g.fillStyle = 'rgba(255,80,40,0.25)'; S.ell(g, pa.x, pa.y - 28 * s, 42 * s, 36 * s); g.fill(); }
    S.drawUnit(g, kind, b.kind === 'explosive' ? 'explosive' : 'wood', 0, pa.x, pa.y, b.hitT > 0 ? sc * 1.06 : sc);
    const bodyH = (b.big ? 70 * 1.15 : 64) * s;
    if (s > 0.08) S.drawText(g, String(Math.ceil(b.hp)), pa.x, pa.y - bodyH * 0.5, 40, '#ffffff', '#3a1a05', s * (b.big ? 1.1 : 1));
    if (s <= 0.07 || b.kind === 'explosive') return;
    const top = pa.y - bodyH;
    const bob = Math.sin(b.bob) * 4 * s;
    g.fillStyle = 'rgba(255,214,80,0.55)'; S.ell(g, pa.x, top - 6 * s, 34 * s, 9 * s); g.fill();
    if (b.kind === 'weapon') {
      S.drawIcon(g, b.weapon, pa.x, top - 26 * s + bob, s * 1.1, true);
      S.drawText(g, (C.WEAPONS[b.weapon] ? C.WEAPONS[b.weapon].name : b.weapon.toUpperCase()), pa.x, top - 50 * s + bob, 14, '#7dff7a', '#0a3a10', Math.min(1.2, s * 1.1));
    } else {
      const col = b.bonus === 'squad' ? '#7ab8ff' : b.bonus === 'rate' ? '#ffd24a' : '#ff8a5a';
      S.drawChip(g, bonusLabel(b), pa.x, top - 26 * s + bob, 22, col, Math.min(1.3, s * 1.2));
    }
  };
  ZRS.barrels = R;
})();

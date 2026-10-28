/* barrels.js — numbered barrels and crates. The number is HP. Weapon barrels
   unlock the weapon hovering above them; explosive barrels blow up in an area
   (and chain). Running into a live explosive barrel costs soldiers. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, F = ZRS.fx, A = ZRS.audio;
  const R = {};
  const pool = [];
  for (let i = 0; i < C.MAX_BARRELS; i++) pool.push({ a: false, z: 0, x: 0, lane: 'L', kind: 'weapon', hp: 1, maxHp: 1, weapon: 'minigun', big: false, broken: false, hitT: 0, bob: 0 });
  let next = 0;
  R.items = pool;
  const pa = {}, pb = {};

  R.reset = function () { pool.forEach(b => b.a = false); };
  R.spawn = function (z, lane, kind, hp, weapon) {
    const b = pool[next]; next = (next + 1) % pool.length;
    b.a = true; b.z = z; b.lane = lane; b.x = lane === 'L' ? -0.5 : lane === 'R' ? 0.5 : 0;
    b.kind = kind; b.hp = b.maxHp = hp; b.weapon = weapon || null; b.big = kind === 'weapon' && hp >= 150; b.broken = false; b.hitT = 0; b.bob = Math.random() * 6;
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
    } else {
      F.splinters(pa.x, pa.y - 20 * pa.s, Math.max(0.3, pa.s), b.big ? '#c9a461' : '#a8743c');
      A.barrel();
      if (!byContact && b.weapon) ZRS.squad.grant(b.weapon);
    }
  };
  R.update = function (dt, squad) {
    for (let i = 0; i < pool.length; i++) {
      const b = pool[i]; if (!b.a) continue;
      if (b.hitT > 0) b.hitT -= dt;
      b.bob += dt * 3;
      if (!b.broken) {
        const dz = b.z - squad.z;
        if (dz < 0.9 && dz > -0.9 && Math.abs(b.x - squad.x) < squad.halfW + C.BARREL_W) {
          if (b.kind === 'explosive') R.breakIt(b, squad.z, true);
          else { b.broken = true; cam.project(dz, b.x, pa); F.splinters(pa.x, pa.y - 20, 1, '#8c5a2b'); A.barrel(); }
        }
      }
      if (b.z - squad.z < -C.CULL_BEHIND) b.a = false;
    }
  };
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
    if (b.kind === 'weapon' && b.weapon && s > 0.07) {
      const iy = pa.y - bodyH - 26 * s + Math.sin(b.bob) * 4 * s;
      g.fillStyle = 'rgba(255,214,80,0.55)'; S.ell(g, pa.x, pa.y - bodyH - 6 * s, 34 * s, 9 * s); g.fill();
      S.drawIcon(g, b.weapon, pa.x, iy, s * 1.1, true);
    }
  };
  ZRS.barrels = R;
})();

/* bullets.js — pooled projectiles, hit resolution, aim assist and area damage.
   A bullet hits the nearest thing it crosses in its lane column: a positive
   gate (absorbs and upgrades), a barrel, the boss, or a zombie. A bullet that
   kills a zombie keeps flying with its leftover damage (up to BULLET_PIERCE
   kills), so a stream of fire mows through a swarm of weak zombies. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, F = ZRS.fx, A = ZRS.audio;
  const B = {};
  const pool = [];
  for (let i = 0; i < C.MAX_BULLETS; i++) pool.push({ a: false, z: 0, x: 0, prevZ: 0, vz: 0, dmg: 0, kind: 'tracer', color: '#fff', width: 2, range: 0, travel: 0, tx: NaN, aoe: 0, weapon: 'pistol', pierce: 0 });
  let next = 0, active = 0;
  const pa = {}, pb = {};

  B.reset = function () { pool.forEach(b => b.a = false); active = 0; };
  B.count = function () { return active; };

  // Nearest target x within the aim-assist window ahead of (x, zFrom); NaN if none.
  B.aimX = function (x, zFrom, window, maxDist) {
    let best = NaN, bestZ = Infinity;
    const Z = ZRS.zombies.items;
    for (let i = 0; i < Z.length; i++) {
      const zb = Z[i]; if (!zb.a || zb.dead) continue;
      const dz = zb.z - zFrom; if (dz < 0.5 || dz > maxDist || dz >= bestZ) continue;
      if (Math.abs(zb.x - x) <= window) { best = zb.x; bestZ = dz; }
    }
    const R = ZRS.barrels.items;
    for (let i = 0; i < R.length; i++) {
      const b = R[i]; if (!b.a || b.broken) continue;
      const dz = b.z - zFrom; if (dz < 0.5 || dz > maxDist || dz >= bestZ) continue;
      if (Math.abs(b.x - x) <= window + C.BARREL_W * 0.5) { best = b.x; bestZ = dz; }
    }
    const bo = ZRS.boss;
    if (bo.active && !bo.dying) {
      const dz = bo.z - zFrom;
      if (dz > 0.5 && dz < maxDist && dz < bestZ && Math.abs(bo.x - x) <= window + bo.halfW() * 0.6) best = bo.x;
    }
    return best;
  };

  B.spawn = function (z, x, weaponKey, dmgMult, tx) {
    const w = C.WEAPONS[weaponKey];
    const b = pool[next]; next = (next + 1) % pool.length;
    if (!b.a) active++;
    b.a = true; b.z = z; b.prevZ = z; b.x = x; b.vz = w.speed; b.dmg = w.dmg * (dmgMult || 1);
    b.kind = w.kind; b.color = w.color; b.width = w.width; b.range = w.range; b.travel = 0;
    b.tx = tx == null ? NaN : tx; b.aoe = w.aoe || 0; b.weapon = weaponKey; b.pierce = 0;
    return b;
  };

  function free(b) { if (b.a) { b.a = false; active--; } }

  // Area damage at (z, x). Hurts zombies, the boss and chains explosive barrels.
  B.explodeAt = function (z, x, dmg, radius, squadZ) {
    const lat = radius * 0.2;
    const Z = ZRS.zombies.items;
    for (let i = 0; i < Z.length; i++) {
      const zb = Z[i]; if (!zb.a || zb.dead) continue;
      if (Math.abs(zb.z - z) <= radius && Math.abs(zb.x - x) <= lat + zb.w) ZRS.zombies.damage(zb, dmg, 'aoe', squadZ);
    }
    const bo = ZRS.boss;
    if (bo.active && !bo.dying && Math.abs(bo.z - z) <= radius + 1 && Math.abs(bo.x - x) <= lat + bo.halfW()) bo.damage(dmg, 'aoe', squadZ);
    const R = ZRS.barrels.items;
    for (let i = 0; i < R.length; i++) {
      const bb = R[i]; if (!bb.a || bb.broken) continue;
      if (Math.abs(bb.z - z) <= radius * 1.2 && Math.abs(bb.x - x) <= lat + C.BARREL_W) ZRS.barrels.damage(bb, dmg, 'aoe', squadZ);
    }
    cam.project(z - squadZ, x, pa);
    F.explosion(pa.x, pa.y, Math.max(0.25, pa.s));
    A.explosion();
  };

  B.update = function (dt, squadZ) {
    for (let i = 0; i < pool.length; i++) {
      const b = pool[i]; if (!b.a) continue;
      b.prevZ = b.z;
      const step = b.vz * dt;
      b.z += step; b.travel += step;
      if (!isNaN(b.tx)) b.x += (b.tx - b.x) * Math.min(1, 9 * dt);
      if (b.travel > b.range || b.z - squadZ > C.FAR) { free(b); continue; }
      // --- gates: upgrade on hit; absorb the bullet only if configured ---
      const gt = ZRS.gates.hitTest(b.prevZ, b.z, b.x);
      if (gt) { ZRS.gates.onShot(gt, b, squadZ); if (C.GATES_ABSORB_BULLETS) { free(b); continue; } }
      // --- hit resolution: nearest object crossed in [from, z]; pierce through killed zombies ---
      let from = b.prevZ;
      while (b.a) {
        let hitZ = Infinity, hitKind = 0, hitObj = null;
        const br = ZRS.barrels.hitTest(from, b.z, b.x);
        if (br && br.z < hitZ) { hitZ = br.z; hitKind = 2; hitObj = br; }
        const bo = ZRS.boss;
        if (bo.hitTest(from, b.z, b.x) && bo.z < hitZ) { hitZ = bo.z; hitKind = 3; hitObj = bo; }
        const zb = ZRS.zombies.hitTest(from, b.z, b.x);
        if (zb && zb.z < hitZ) { hitZ = zb.z; hitKind = 4; hitObj = zb; }
        if (!hitKind) break;
        // rockets plow through small zombies and burst on anything big (brute, boss, stand) or when spent
        if (b.kind === 'rocket' && !(hitKind === 4 && hitObj.type !== 'brute')) { B.explodeAt(hitZ, b.x, b.dmg, b.aoe, squadZ); free(b); break; }
        if (hitKind === 2) { ZRS.barrels.damage(hitObj, b.dmg, b, squadZ); free(b); break; }
        if (hitKind === 3) { bo.damage(b.dmg, b, squadZ); free(b); break; }
        const left = ZRS.zombies.damage(hitObj, b.dmg, b, squadZ);
        b.pierce++;
        if (left < 0.5 || b.pierce >= C.BULLET_PIERCE * (b.kind === 'rocket' ? 2 : 1)) {
          if (b.kind === 'rocket') B.explodeAt(hitZ, b.x, Math.max(left, b.dmg * 0.5), b.aoe, squadZ);
          free(b); break;
        }
        b.dmg = left; from = hitZ;
      }
    }
  };

  B.draw = function (g, squadZ) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    for (let i = 0; i < pool.length; i++) {
      const b = pool[i]; if (!b.a) continue;
      const dz = b.z - squadZ; if (dz < -3 || dz > C.DRAW_FAR) continue;
      const len = b.kind === 'rocket' ? 1.2 : b.kind === 'pellet' ? 0.6 : 1.4;
      cam.project(dz - len * 0.5, b.x, pa); cam.project(dz + len * 0.5, b.x, pb);
      const yOff = 30 * pa.s; // bullets fly at chest height
      g.strokeStyle = b.color; g.lineWidth = Math.max(1, b.width * pa.s);
      g.beginPath(); g.moveTo(pa.x, pa.y - yOff); g.lineTo(pb.x, pb.y - yOff); g.stroke();
      if (b.kind === 'rocket') { g.fillStyle = '#ffd27a'; ZRS.sprites.circ(g, pa.x, pa.y - yOff, 4 * pa.s); g.fill(); }
    }
    g.restore();
  };
  ZRS.bullets = B;
})();

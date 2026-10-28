/* zombies.js — pooled zombies (walker, runner, brute) with HP numbers, bars,
   damage pops, death splats and contact kills against the squad. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, F = ZRS.fx, A = ZRS.audio;
  const Z = {};
  const pool = [];
  for (let i = 0; i < C.MAX_ZOMBIES; i++) pool.push({ a: false, type: 'walker', z: 0, x: 0, hp: 1, maxHp: 1, speed: 1, w: 0.12, contactKills: 1, dead: false, deadT: 0, anim: 0, hitT: 0 });
  let next = 0, alive = 0;
  Z.items = pool;
  const pa = {};

  Z.reset = function () { pool.forEach(z => z.a = false); alive = 0; };
  Z.aliveCount = function () { return alive; };
  Z.contactMult = 1; // set per level by main.js
  Z.spawn = function (type, z, x, hpMult) {
    const def = C.ZOMBIE[type] || C.ZOMBIE.walker;
    // find a free slot; if the pool is full, reuse the farthest one
    let zb = null;
    for (let i = 0; i < pool.length; i++) { const k = (next + i) % pool.length; if (!pool[k].a) { zb = pool[k]; next = (k + 1) % pool.length; break; } }
    if (!zb) return null;
    zb.a = true; zb.type = type; zb.z = z; zb.x = Math.max(-0.95, Math.min(0.95, x));
    zb.hp = zb.maxHp = Math.max(1, Math.round(def.hp * (hpMult || 1)));
    zb.speed = def.speed * (0.9 + Math.random() * 0.2); zb.w = def.w; zb.contactKills = Math.round(def.contactKills * Z.contactMult);
    zb.dead = false; zb.deadT = 0; zb.anim = Math.random() * 10; zb.hitT = 0;
    alive++;
    return zb;
  };
  Z.spawnPack = function (lane, z, type, count, hpMult) {
    const cx = lane === 'L' ? -0.5 : lane === 'R' ? 0.5 : 0;
    const cols = 4;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = cx - 0.3 + col * 0.2 + (Math.random() - 0.5) * 0.08 + (row % 2) * 0.1;
      Z.spawn(type, z + row * 1.3 + Math.random() * 0.4, x, hpMult);
    }
  };
  // mix: { runner: 0.3, brute: 0.2 } fractions; the rest are walkers
  Z.spawnHorde = function (z, count, hpMult, type, mix) {
    const cols = 10;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = -0.9 + col * 0.2 + (Math.random() - 0.5) * 0.08 + (row % 2) * 0.1;
      let t = type || 'walker';
      if (mix) { const r = Math.random(); if (r < (mix.brute || 0)) t = 'brute'; else if (r < (mix.brute || 0) + (mix.runner || 0)) t = 'runner'; }
      Z.spawn(t, z + row * 1.2 + Math.random() * 0.5, x, hpMult);
    }
  };

  Z.hitTest = function (prevZ, z, x) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const zb = pool[i]; if (!zb.a || zb.dead) continue;
      if (zb.z + 0.35 < prevZ || zb.z - 0.35 > z) continue;
      if (Math.abs(x - zb.x) > zb.w) continue;
      if (!best || zb.z < best.z) best = zb;
    }
    return best;
  };
  Z.damage = function (zb, dmg, src, squadZ) {
    if (zb.dead) return;
    zb.hp -= dmg; zb.hitT = 0.07;
    cam.project(zb.z - squadZ, zb.x, pa);
    if (pa.s > 0.12) F.floater(pa.x, pa.y - 44 * pa.s, '-' + Math.round(dmg), '#ff3b3b', 15 + 10 * Math.min(1, pa.s));
    if (zb.hp <= 0) Z.kill(zb, squadZ);
  };
  Z.kill = function (zb, squadZ) {
    zb.hp = 0; zb.dead = true; zb.deadT = 0.55; alive--;
    cam.project(zb.z - squadZ, zb.x, pa);
    if (pa.s > 0.1) F.splat(pa.x, pa.y - 10 * pa.s, pa.s);
    F.decal(zb.z, zb.x, zb.type === 'brute' ? 1.6 : 1);
    A.zombieDie();
  };

  Z.update = function (dt, squad) {
    for (let i = 0; i < pool.length; i++) {
      const zb = pool[i]; if (!zb.a) continue;
      if (zb.dead) { zb.deadT -= dt; if (zb.deadT <= 0 || zb.z - squad.z < -C.CULL_BEHIND) zb.a = false; continue; }
      zb.anim += dt * (zb.type === 'runner' ? 12 : 5);
      zb.z -= zb.speed * dt;
      if (zb.hitT > 0) zb.hitT -= dt;
      const dz = zb.z - squad.z;
      if (dz < C.ZOMBIE_HOMING_RANGE && dz > 0) {
        const d = squad.x - zb.x;
        if (Math.abs(d) > 0.02) zb.x += Math.sign(d) * Math.min(Math.abs(d), C.ZOMBIE_HOMING * dt);
      }
      if (dz < 0.7 && dz > -0.7 && Math.abs(zb.x - squad.x) < squad.halfW + zb.w) {
        squad.lose(zb.contactKills, 'zombie');
        Z.kill(zb, squad.z);
        continue;
      }
      if (dz < -C.CULL_BEHIND) { zb.a = false; alive--; }
    }
  };

  Z.drawOne = function (g, zb, squadZ) {
    const dz = zb.z - squadZ;
    cam.project(dz, zb.x, pa);
    const s = pa.s;
    if (zb.dead) {
      const t = zb.deadT / 0.55;
      g.globalAlpha = t;
      g.save(); g.translate(pa.x, pa.y); g.scale(1.3, 0.35);
      S.drawUnit(g, zb.type, 0, 0, 0, 0, s);
      g.restore(); g.globalAlpha = 1;
      return;
    }
    const frame = Math.floor(zb.anim) % 2;
    S.drawUnit(g, zb.type, 0, frame, pa.x, pa.y, zb.hitT > 0 ? s * 1.08 : s);
    if (s > 0.1) {
      const base = S.BASE[zb.type], h = base[1] * s, w = Math.max(14, base[0] * s);
      const by = pa.y - h - 8 * s;
      g.fillStyle = C.COLORS.hpBack; g.fillRect(pa.x - w / 2, by, w, Math.max(2, 3.5 * s));
      g.fillStyle = C.COLORS.hp; g.fillRect(pa.x - w / 2, by, w * (zb.hp / zb.maxHp), Math.max(2, 3.5 * s));
      if (s > 0.2) S.drawText(g, String(Math.ceil(zb.hp)), pa.x, by - 9 * s - 2, 18, '#ffffff', '#3a0a0a', Math.min(1, s));
    }
  };
  ZRS.zombies = Z;
})();

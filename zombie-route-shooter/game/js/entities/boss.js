/* boss.js — the end-of-level giant zombie. Walks down the road, carries a
   skull HP bar with a number, burns when rocketed, eats soldiers on contact. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, F = ZRS.fx, A = ZRS.audio;
  const Bo = { active: false, dead: false, dying: false, hp: 0, maxHp: 0, z: 0, x: 0.5, giant: false, burnT: 0, stepT: 0, popAcc: 0, popT: 0, anim: 0, hitT: 0, dyingT: 0, killAcc: 0, attacking: false };
  const pa = {};
  Bo.reset = function () { Bo.active = false; Bo.dead = false; Bo.dying = false; Bo.attacking = false; Bo.burnT = 0; Bo.popAcc = 0; Bo.killAcc = 0; };
  Bo.halfW = function () { return C.BOSS.w * (Bo.giant ? 1.5 : 1); };
  Bo.spawn = function (hp, giant, z, x) {
    Bo.reset();
    Bo.active = true; Bo.hp = Bo.maxHp = Math.round(hp * (giant ? C.BOSS.giantMultiplier : 1)); Bo.giant = !!giant;
    Bo.z = z; Bo.x = x == null ? 0.5 : x; Bo.stepT = C.BOSS.stepPeriod; Bo.anim = 0; Bo.popT = 0;
  };
  Bo.hitTest = function (prevZ, z, x) {
    if (!Bo.active || Bo.dying) return false;
    const d = Bo.giant ? 1.6 : 1.1;
    if (Bo.z + d < prevZ || Bo.z - d > z) return false;
    return Math.abs(x - Bo.x) <= Bo.halfW();
  };
  Bo.damage = function (dmg, src, squadZ) {
    if (!Bo.active || Bo.dying) return;
    Bo.hp -= dmg; Bo.popAcc += dmg; Bo.hitT = 0.06;
    if (src && src.kind === 'rocket') Bo.burnT = C.BOSS.burnSeconds;
    F.shake(C.SHAKE_BOSS_HIT); A.bossHit();
    if (Bo.hp <= 0) { Bo.hp = 0; Bo.die(squadZ); }
  };
  Bo.die = function (squadZ) {
    Bo.dying = true; Bo.dyingT = 1.1; Bo.attacking = false;
    cam.project(Bo.z - squadZ, Bo.x, pa);
    F.explosion(pa.x, pa.y - 60 * pa.s, 1.6);
    F.hitstop(C.HITSTOP_BOSS_DEATH_MS); F.flash('#ffffff', 0.5); F.shake(14);
    A.bossDie();
  };
  Bo.update = function (dt, squad) {
    if (!Bo.active) return;
    if (Bo.dying) {
      Bo.dyingT -= dt;
      if (Bo.dyingT <= 0) { Bo.active = false; Bo.dead = true; }
      return;
    }
    Bo.anim += dt * (Bo.giant ? 2.2 : 3);
    if (Bo.hitT > 0) Bo.hitT -= dt;
    // damage number aggregation (big "-80" pops like the ads)
    Bo.popT -= dt;
    if (Bo.popT <= 0 && Bo.popAcc > 0) {
      cam.project(Bo.z - squad.z, Bo.x, pa);
      F.floater(pa.x + (Math.random() - 0.5) * 60 * pa.s, pa.y - 110 * pa.s, '-' + Math.round(Bo.popAcc), '#ff3b3b', 24 + 10 * Math.min(1, pa.s));
      Bo.popAcc = 0; Bo.popT = C.BOSS.popInterval;
    }
    if (Bo.burnT > 0) { Bo.burnT -= dt; Bo.hp -= C.BOSS.burnDps * dt; Bo.popAcc += C.BOSS.burnDps * dt; if (Bo.hp <= 0) { Bo.hp = 0; Bo.die(squad.z); return; } }
    const dz = Bo.z - squad.z;
    if (!Bo.attacking) {
      Bo.z -= C.BOSS.speed * dt;
      const d = squad.x - Bo.x;
      if (Math.abs(d) > 0.02) Bo.x += Math.sign(d) * Math.min(Math.abs(d), C.BOSS.homing * dt);
      if (dz < 1.4) Bo.attacking = true;
    } else {
      Bo.z = squad.z + 1.2;
      Bo.x += (squad.x - Bo.x) * Math.min(1, 4 * dt);
      Bo.killAcc += Math.max(C.BOSS.contactKillsPerSec, squad.n * C.BOSS.contactFrac) * dt;
      while (Bo.killAcc >= 1) { Bo.killAcc -= 1; squad.lose(1, 'boss'); }
    }
    if (Bo.giant) {
      Bo.stepT -= dt;
      if (Bo.stepT <= 0) { Bo.stepT = C.BOSS.stepPeriod; if (dz < 60) { F.shake(C.SHAKE_STOMP * Math.min(1, 25 / Math.max(1, dz))); A.stomp(); } }
    }
  };
  Bo.drawOne = function (g, squadZ) {
    if (!Bo.active) return;
    const dz = Bo.z - squadZ;
    cam.project(dz, Bo.x, pa);
    const s = pa.s * (Bo.giant ? 1.6 : 1);
    const frame = Math.floor(Bo.anim) % 2;
    let sc = s;
    if (Bo.dying) { const t = Bo.dyingT / 1.1; g.globalAlpha = t; sc = s * (0.6 + 0.4 * t); }
    if (Bo.hitT > 0) sc *= 1.03;
    S.drawUnit(g, 'boss', Bo.burnT > 0 ? 'burn' : 'normal', frame, pa.x, pa.y, sc);
    g.globalAlpha = 1;
    if (Bo.burnT > 0 && !Bo.dying) {
      F.burst(pa.x + (Math.random() - 0.5) * 80 * s, pa.y - Math.random() * 140 * s, 2, Math.random() < 0.5 ? '#ff7a2e' : '#ffd24a', 60 * s, 0.35, 7 * s, -260 * s);
    }
    if (!Bo.dying) Bo.drawBar(g, pa.x, pa.y - 178 * s, Math.max(0.35, Math.min(1.1, s)));
  };
  // Skull icon + red bar + number. Used above the boss and mirrored at the top of the screen.
  Bo.drawBar = function (g, cx, cy, sc) {
    const w = 150 * sc, h = 14 * sc, r = 13 * sc;
    const x0 = cx - w / 2 + r;
    g.fillStyle = '#2a0a0a'; S.rr(g, x0, cy - h / 2, w - r, h, h / 2); g.fill();
    g.fillStyle = '#ff2a2a'; S.rr(g, x0, cy - h / 2, Math.max(0, (w - r) * (Bo.hp / Bo.maxHp)), h, h / 2); g.fill();
    g.strokeStyle = '#5a1a1a'; g.lineWidth = Math.max(1, 1.5 * sc); S.rr(g, x0, cy - h / 2, w - r, h, h / 2); g.stroke();
    // skull
    g.fillStyle = '#1a0a0a'; S.circ(g, x0 - 2 * sc, cy, r + 2 * sc); g.fill();
    g.fillStyle = '#ff2a2a'; S.circ(g, x0 - 2 * sc, cy, r); g.fill();
    g.fillStyle = '#ffffff'; S.circ(g, x0 - 2 * sc, cy - 1.5 * sc, r * 0.62); g.fill(); g.fillRect(x0 - 2 * sc - r * 0.38, cy + r * 0.1, r * 0.76, r * 0.42);
    g.fillStyle = '#1a0a0a'; S.circ(g, x0 - 2 * sc - r * 0.25, cy - 2 * sc, r * 0.18); g.fill(); S.circ(g, x0 - 2 * sc + r * 0.25, cy - 2 * sc, r * 0.18); g.fill();
    S.drawText(g, String(Math.ceil(Bo.hp)), cx + r / 2, cy - 18 * sc, 26, '#ffffff', '#5a0a0a', sc);
  };
  ZRS.boss = Bo;
})();

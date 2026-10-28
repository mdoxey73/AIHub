/* squad.js — the player's squad: true count N, a drawn formation capped at
   MAX_DRAWN_SOLDIERS, drag-steered x, automatic fire, weapons, drone, vehicle. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, F = ZRS.fx, A = ZRS.audio;
  const Q = { n: 0, z: 0, prevZ: 0, x: 0, targetX: 0, halfW: 0.08, depth: 0.5, weapon: 'pistol', drone: false, vehicle: false, rateMult: 1, dmgBonus: 1, soldiers: [], labelPop: 0, overflowAcc: 0, droneT: 0, droneX: 0, time: 0, god: false };
  const pa = {}, pb = {};

  // Hex-lattice formation offsets, sorted so the blob stays round as it grows.
  const FORM = (function () {
    const pts = [];
    const R = 9;
    for (let r = -R; r <= R; r++) for (let c = -R; c <= R; c++) {
      const dx = (c + (r & 1 ? 0.5 : 0)) * C.FORMATION_DX, dz = r * C.FORMATION_DZ;
      pts.push({ dx: dx, dz: dz, d: Math.hypot((c + (r & 1 ? 0.5 : 0)) * 1.0, r * 0.95) });
    }
    pts.sort((a, b) => a.d - b.d);
    return pts.slice(0, C.MAX_DRAWN_SOLDIERS);
  })();

  Q.reset = function (n, weapon) {
    Q.n = n; Q.z = 0; Q.prevZ = 0; Q.x = -0.5; Q.targetX = -0.5; Q.weapon = weapon || 'pistol';
    Q.drone = false; Q.vehicle = false; Q.rateMult = 1; Q.dmgBonus = 1; Q.soldiers.length = 0; Q.labelPop = 0; Q.overflowAcc = 0; Q.time = 0; Q.droneX = -0.5;
    syncSoldiers(false);
  };

  function syncSoldiers(fx) {
    const want = Math.min(Q.n, C.MAX_DRAWN_SOLDIERS);
    while (Q.soldiers.length < want) {
      const o = FORM[Q.soldiers.length];
      Q.soldiers.push({ dx: o.dx, dz: o.dz, fireT: Math.random() * 0.4, flashT: 0, pop: fx ? 0.35 : 0, seed: Math.random() });
    }
    let fxCount = 0;
    while (Q.soldiers.length > want) {
      const s = Q.soldiers.pop();
      if (fx && fxCount < C.LOSS_FX_CAP) { fxCount++; cam.project(s.dz, Q.x + s.dx, pa); F.ragdoll(pa.x, pa.y - 20, 1); }
    }
    let hw = 0.05, dp = 0.3;
    for (let i = 0; i < Q.soldiers.length; i++) { hw = Math.max(hw, Math.abs(Q.soldiers[i].dx) + 0.05); dp = Math.max(dp, Math.abs(Q.soldiers[i].dz) + 0.2); }
    Q.halfW = hw; Q.depth = dp;
  }

  Q.setN = function (n, fx) {
    n = Math.min(C.SQUAD_MAX_N, Math.max(0, Math.floor(n)));
    if (n === Q.n) return 0;
    const delta = n - Q.n;
    Q.n = n; Q.labelPop = 0.3;
    syncSoldiers(fx !== false);
    return delta;
  };
  Q.applyGate = function (op, value) {
    let n = Q.n;
    if (op === '+') n += value;
    else if (op === 'x') n = Math.floor(n * value);
    else if (op === '-') n -= value;
    else if (op === '/') n = Math.max(1, Math.floor(n / value));
    return Q.setN(n, true);
  };
  Q.lose = function (k, why) {
    if (Q.god && Q.n - k < 1) k = Math.max(0, Q.n - 1);
    if (k <= 0) return;
    Q.setN(Q.n - k, true);
    F.shake(Math.min(C.SHAKE_LOSS, 1 + k * 0.6)); F.flash('#ff2d2d', 0.12); A.loss();
  };
  Q.grant = function (weapon) {
    if (weapon === 'drone') { Q.drone = true; F.banner('DRONE!', 0.9); }
    else if (weapon === 'vehicle') { Q.vehicle = true; F.banner('ARMORED!', 0.9); }
    else { Q.weapon = weapon; F.banner(C.WEAPONS[weapon].name + '!', 0.9); }
    F.flash('#ffe27a', 0.25); A.pickup();
  };
  // Damage per bullet carries the whole squad's strength: N^FIRE_EXP shooters' worth spread over the drawn soldiers.
  Q.effective = function () { const d = C.MAX_DRAWN_SOLDIERS; return Math.min(Q.n, d) + Math.pow(Math.max(0, Q.n - d), C.FIRE_EXP); };
  Q.dmgMult = function () { return (Q.vehicle ? C.VEHICLE_DMG_MULT : 1) * Q.dmgBonus * (Q.effective() / Math.max(1, Q.soldiers.length)); };
  // Bonus barrels: squad (+N soldiers), rate (+fire rate), dmg (+damage)
  Q.grantBonus = function (type, amount) {
    if (type === 'squad') { Q.setN(Q.n + amount, true); F.banner('+' + amount + ' SQUAD!', 0.9); }
    else if (type === 'rate') { Q.rateMult = Math.min(C.BONUS.rateCap, Q.rateMult + C.BONUS.rateStep); F.banner('FIRE RATE UP!', 0.9); }
    else if (type === 'dmg') { Q.dmgBonus = Math.min(C.BONUS.dmgCap, Q.dmgBonus + C.BONUS.dmgStep); F.banner('DAMAGE UP!', 0.9); }
    F.flash('#7dff7a', 0.2); A.pickup();
  };

  function fireFrom(dz, dx, sol) {
    const w = C.WEAPONS[Q.weapon];
    const z = Q.z + dz, x = Q.x + dx;
    if (w.kind === 'pellet') {
      for (let p = 0; p < w.pellets; p++) ZRS.bullets.spawn(z, x + (p - (w.pellets - 1) / 2) * w.spread * 0.5, Q.weapon, Q.dmgMult(), x + (p - (w.pellets - 1) / 2) * w.spread);
    } else {
      const tx = ZRS.bullets.aimX(x, z, C.AIM_ASSIST, 60);
      ZRS.bullets.spawn(z, x, Q.weapon, Q.dmgMult(), isNaN(tx) ? null : tx);
    }
    if (sol) sol.flashT = 0.05;
    A.shot(Q.weapon);
  }

  Q.update = function (dt, dxLane, keyDir) {
    Q.time += dt;
    Q.prevZ = Q.z; Q.z += C.SQUAD_SPEED * dt;
    Q.targetX += dxLane + keyDir * C.KEY_SPEED * dt;
    const lim = 1 - Q.halfW - 0.04;
    if (Q.targetX > lim) Q.targetX = lim; if (Q.targetX < -lim) Q.targetX = -lim;
    Q.x += (Q.targetX - Q.x) * Math.min(1, C.DRAG_SMOOTH * dt);
    if (Q.labelPop > 0) Q.labelPop -= dt;
    if (Q.n <= 0) return;
    const w = C.WEAPONS[Q.weapon];
    const period = 1 / (w.rate * Q.rateMult);
    for (let i = 0; i < Q.soldiers.length; i++) {
      const s = Q.soldiers[i];
      if (s.flashT > 0) s.flashT -= dt; if (s.pop > 0) s.pop -= dt;
      s.fireT -= dt;
      if (s.fireT <= 0) { fireFrom(s.dz, s.dx, s); s.fireT += period * (0.9 + s.seed * 0.2); }
    }
    if (Q.drone) {
      Q.droneX += ((Q.x + Math.sin(Q.time * 1.7) * 0.25) - Q.droneX) * Math.min(1, 3 * dt);
      Q.droneT -= dt;
      if (Q.droneT <= 0) {
        Q.droneT = 1 / (C.WEAPONS.drone.rate * Q.rateMult);
        const tx = ZRS.bullets.aimX(Q.droneX, Q.z + 1.5, 1.2, 70);
        if (!isNaN(tx)) { ZRS.bullets.spawn(Q.z + 1.5, Q.droneX, 'drone', (Q.vehicle ? C.VEHICLE_DMG_MULT : 1) * Q.dmgBonus * Math.max(1, Q.effective() / 8), tx); A.shot('laser'); }
      }
    }
  };

  // Drawing: each soldier is a separate drawable so zombies interleave correctly.
  Q.drawSoldier = function (g, s, squadZ) {
    cam.project(s.dz, Q.x + s.dx, pa);
    const frame = Math.floor(Q.time * 8 + s.seed * 2) % 2;
    const sc = pa.s * (s.pop > 0 ? 1 + s.pop * 0.8 : 1);
    S.drawUnit(g, 'soldier', Q.weapon, frame, pa.x, pa.y, sc);
    if (s.flashT > 0) { g.fillStyle = '#ffe27a'; S.circ(g, pa.x + 8 * sc, pa.y - 45 * sc, 4.5 * sc); g.fill(); g.fillStyle = '#ff9a2e'; S.circ(g, pa.x + 8 * sc, pa.y - 45 * sc, 2.5 * sc); g.fill(); }
  };
  Q.drawDrone = function (g) {
    cam.project(1.5, Q.droneX, pa);
    const bob = Math.sin(Q.time * 6) * 4;
    g.fillStyle = 'rgba(0,0,0,0.2)'; S.ell(g, pa.x, pa.y, 18 * pa.s, 5 * pa.s); g.fill();
    S.drawUnit(g, 'drone', 0, 0, pa.x, pa.y - 70 * pa.s + bob, pa.s);
  };
  Q.drawVehicle = function (g) {
    cam.project(-Q.depth - 1.2, Q.x, pa);
    S.drawUnit(g, 'vehicle', 0, 0, pa.x, pa.y, pa.s * 0.9);
  };
  Q.drawLabel = function (g) {
    cam.project(-Q.depth - 0.2, Q.x, pa);
    const sc = 1 + (Q.labelPop > 0 ? Q.labelPop * 1.2 : 0);
    S.drawText(g, String(Q.n), pa.x, pa.y + 16, 30, '#ffffff', '#102040', sc);
  };
  ZRS.squad = Q;
})();

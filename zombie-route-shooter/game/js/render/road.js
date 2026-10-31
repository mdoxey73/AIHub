/* road.js — scrolling pseudo-3D highway: ground, asphalt, three lanes with
   colored lane edges (supply / enemy / gate), barrier walls with hazard stripes
   and LED posts, themed roadside props, far haze. setTheme() switches palette. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites;
  let K = Object.assign({}, C.COLORS, C.THEMES.city), themeName = 'city';
  const R = {};
  const DZ_NEAR = -C.NEAR * 0.6; // far enough behind the squad to reach the screen bottom
  const pa = {}, pb = {}, pc = {}, pd = {};

  // Fill a quad between two road distances and two lateral extents, optionally lifted (px at scale 1).
  function quad(g, dz0, x0a, x0b, dz1, x1a, x1b, lift0, lift1) {
    cam.project(dz0, x0a, pa); cam.project(dz0, x0b, pb); cam.project(dz1, x1b, pc); cam.project(dz1, x1a, pd);
    const l0 = (lift0 || 0) * pa.s, l1 = (lift1 || 0) * pc.s;
    g.beginPath(); g.moveTo(pa.x, pa.y - l0); g.lineTo(pb.x, pb.y - l0); g.lineTo(pc.x, pc.y - l1); g.lineTo(pd.x, pd.y - l1); g.closePath(); g.fill();
  }

  const PROP_PERIOD = 30;
  const SIGNS = ['q', 'z', 'b'];
  R.setTheme = function (name) {
    themeName = C.THEMES[name] ? name : 'city';
    K = Object.assign({}, C.COLORS, C.THEMES[themeName]);
    S.setTheme(themeName);
  };
  R.theme = function () { return K; };
  const LN = C.LANES, ROLE = C.LANE_ROLE;
  const laneTint = { supply: 'rgba(80,220,110,0.10)', enemy: 'rgba(255,60,60,0.06)', gate: 'rgba(60,140,255,0.10)' };

  R.draw = function (g, squadZ) {
    const W = cam.W, H = cam.H, far = C.FAR;
    g.drawImage(S.backdrop(), 0, 0);
    // ground
    g.fillStyle = K.ground; g.fillRect(0, cam.horizonY, W, H - cam.horizonY);
    // asphalt (slightly lighter far away)
    const asph = g.createLinearGradient(0, cam.horizonY, 0, H);
    asph.addColorStop(0, K.asphaltFar); asph.addColorStop(0.35, K.asphalt); asph.addColorStop(1, K.asphaltNear);
    g.fillStyle = asph; quad(g, DZ_NEAR, -1.1, 1.1, far, -1.1, 1.1);
    // lane tints: each lane has one job, so color it faintly by role
    for (const role in ROLE) { const ln = LN[ROLE[role]]; g.fillStyle = laneTint[role]; quad(g, DZ_NEAR, ln.min, ln.max, far, ln.min, ln.max); }
    // solid edge lines and dashed lane dividers (period 6 m, dash 3 m)
    g.fillStyle = K.lane;
    quad(g, DZ_NEAR, -0.985, -0.97, far, -0.985, -0.97); quad(g, DZ_NEAR, 0.97, 0.985, far, 0.97, 0.985);
    const k0 = Math.floor((squadZ + DZ_NEAR) / 6), k1 = Math.floor((squadZ + far) / 6);
    const ld1 = LN.L.max, ld2 = LN.M.max;
    for (let k = k0; k <= k1; k++) {
      let dz0 = k * 6 - squadZ, dz1 = dz0 + 3;
      if (dz1 < DZ_NEAR) continue;
      if (dz0 < DZ_NEAR) dz0 = DZ_NEAR;
      quad(g, dz0, ld1 - 0.012, ld1 + 0.012, dz1, ld1 - 0.012, ld1 + 0.012);
      quad(g, dz0, ld2 - 0.012, ld2 + 0.012, dz1, ld2 - 0.012, ld2 + 0.012);
    }
    // lane role markings painted on the asphalt every 48 m: a plus in the supply lane, a chevron in the gate lane
    const m0 = Math.floor((squadZ + 4) / 48), m1 = Math.floor((squadZ + 100) / 48);
    for (let m = m0; m <= m1; m++) {
      const dz = m * 48 + 20 - squadZ; if (dz < 2) continue;
      cam.project(dz, LN[ROLE.supply].min + (LN[ROLE.supply].max - LN[ROLE.supply].min) / 2, pa);
      g.fillStyle = 'rgba(120,255,150,0.35)';
      g.fillRect(pa.x - 14 * pa.s, pa.y - 2 * pa.s, 28 * pa.s, 4 * pa.s); g.fillRect(pa.x - 3 * pa.s, pa.y - 8 * pa.s, 6 * pa.s, 16 * pa.s * 0.6);
      cam.project(dz, LN[ROLE.gate].min + (LN[ROLE.gate].max - LN[ROLE.gate].min) / 2, pa);
      g.strokeStyle = 'rgba(120,180,255,0.4)'; g.lineWidth = Math.max(1, 4 * pa.s);
      g.beginPath(); g.moveTo(pa.x - 18 * pa.s, pa.y + 3 * pa.s); g.lineTo(pa.x, pa.y - 4 * pa.s); g.lineTo(pa.x + 18 * pa.s, pa.y + 3 * pa.s); g.stroke();
    }
    // debris, oil stains and cracks (deterministic per road position)
    const d0 = Math.floor((squadZ + DZ_NEAR) / 5), d1 = Math.floor((squadZ + 100) / 5);
    for (let k = d0; k <= d1; k++) {
      const h = ((k * 2654435761) >>> 0) % 1000;
      if (h % 7 > 3) continue;
      const dz = k * 5 + (h % 50) / 10 - squadZ; if (dz < DZ_NEAR) continue;
      const x = -0.92 + (h % 184) / 100;
      cam.project(dz, x, pa);
      if (h % 3 === 0) { g.fillStyle = 'rgba(0,0,0,0.28)'; S.ell(g, pa.x, pa.y, (10 + h % 12) * pa.s, (3 + h % 4) * pa.s); g.fill(); }
      else if (h % 3 === 1) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = Math.max(1, 1.5 * pa.s); g.beginPath(); g.moveTo(pa.x - 12 * pa.s, pa.y); g.lineTo(pa.x - 2 * pa.s, pa.y - 7 * pa.s); g.lineTo(pa.x + 6 * pa.s, pa.y - 2 * pa.s); g.lineTo(pa.x + 14 * pa.s, pa.y - 9 * pa.s); g.stroke(); }
      else { g.fillStyle = '#6b6050'; g.fillRect(pa.x - 3 * pa.s, pa.y - 3 * pa.s, 6 * pa.s, 3 * pa.s); g.fillStyle = '#8a8070'; g.fillRect(pa.x + 4 * pa.s, pa.y - 2 * pa.s, 4 * pa.s, 2 * pa.s); }
    }
    ZRS.fx.drawDecals(g, squadZ);
    // barrier walls
    for (let side = -1; side <= 1; side += 2) {
      const xi = side * 1.0, xo = side * 1.09;
      g.fillStyle = K.barrier;
      // inner face: from ground to lifted top
      cam.project(DZ_NEAR, xi, pa); cam.project(far, xi, pc);
      g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pc.x, pc.y); g.lineTo(pc.x, pc.y - 55 * pc.s); g.lineTo(pa.x, pa.y - 55 * pa.s); g.closePath(); g.fill();
      // top surface
      g.fillStyle = K.barrierDark; quad(g, DZ_NEAR, xi, xo, far, xi, xo, 55, 55);
      // hazard stripes along the base (2 m blocks), near only
      const b0 = Math.floor((squadZ + DZ_NEAR) / 2), b1 = Math.floor((squadZ + 90) / 2);
      for (let b = b0; b <= b1; b++) {
        let dz0 = b * 2 - squadZ, dz1 = dz0 + 2;
        if (dz1 < DZ_NEAR) continue; if (dz0 < DZ_NEAR) dz0 = DZ_NEAR;
        g.fillStyle = (b & 1) ? K.hazardY : K.hazardK;
        cam.project(dz0, xi, pa); cam.project(dz1, xi, pc);
        g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pc.x, pc.y); g.lineTo(pc.x, pc.y - 18 * pc.s); g.lineTo(pa.x, pa.y - 18 * pa.s); g.closePath(); g.fill();
      }
      // far strip where stripes are too small to matter
      g.fillStyle = K.hazardY; cam.project(90 - 0.0001, xi, pa); cam.project(far, xi, pc);
      if (pa.s > 0) { g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pc.x, pc.y); g.lineTo(pc.x, pc.y - 18 * pc.s); g.lineTo(pa.x, pa.y - 18 * pa.s); g.closePath(); g.fill(); }
      // posts with LEDs every 8 m
      const q0 = Math.floor((squadZ + DZ_NEAR) / 8), q1 = Math.floor((squadZ + 110) / 8);
      for (let q = q0; q <= q1; q++) {
        const dz = q * 8 - squadZ; if (dz < DZ_NEAR) continue;
        cam.project(dz, side * 1.045, pa);
        g.fillStyle = '#5a5c66'; g.fillRect(pa.x - 1.5 * pa.s, pa.y - 82 * pa.s, 3 * pa.s, 28 * pa.s);
        g.fillStyle = K.led; S.circ(g, pa.x, pa.y - 84 * pa.s, 2.6 * pa.s); g.fill();
      }
    }
    // far haze
    const hz = g.createLinearGradient(0, cam.horizonY, 0, cam.horizonY + 70);
    hz.addColorStop(0, 'rgba(' + K.haze + ',0.95)'); hz.addColorStop(1, 'rgba(' + K.haze + ',0)');
    g.fillStyle = hz; g.fillRect(0, cam.horizonY, W, 70);
    // roadside props (themed), alternating sides
    const P = K.props, np = P.length;
    const i0 = Math.floor((squadZ - 4) / PROP_PERIOD), i1 = Math.floor((squadZ + C.DRAW_FAR) / PROP_PERIOD);
    for (let i = i1; i >= i0; i--) {
      const dz = i * PROP_PERIOD + 18 - squadZ;
      if (dz < -2 || dz > C.DRAW_FAR) continue;
      const il = ((i % np) + np) % np, ir = (((i + 3) % np) + np) % np;
      cam.project(dz, -1.55, pa); S.drawUnit(g, P[il], P[il] === 'sign' ? SIGNS[((i % 3) + 3) % 3] : themeName, 0, pa.x, pa.y, pa.s);
      cam.project(dz + PROP_PERIOD / 2, 1.55, pb); if (dz + PROP_PERIOD / 2 <= C.DRAW_FAR) S.drawUnit(g, P[ir], P[ir] === 'sign' ? SIGNS[((i + 1) % 3 + 3) % 3] : themeName, 0, pb.x, pb.y, pb.s);
    }
    // night: street-light pools on the road
    if (K.night) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = i0; i <= i1; i++) {
        const dz = i * PROP_PERIOD + 18 - squadZ; if (dz < -2 || dz > 90) continue;
        cam.project(dz, -0.75, pa);
        g.fillStyle = 'rgba(255,200,120,0.10)'; S.ell(g, pa.x, pa.y, 110 * pa.s, 22 * pa.s); g.fill();
      }
      g.restore();
    }
  };
  ZRS.road = R;
})();

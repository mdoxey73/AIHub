/* road.js — scrolling pseudo-3D highway: ground, asphalt, median, lane dashes,
   barrier walls with hazard stripes and LED posts, roadside props, far haze. */
(function () {
  const C = ZRS.CONFIG, K = C.COLORS, cam = ZRS.cam, S = ZRS.sprites;
  const R = {};
  const DZ_NEAR = -C.NEAR * 0.6; // far enough behind the squad to reach the screen bottom
  const pa = {}, pb = {}, pc = {}, pd = {};

  // Fill a quad between two road distances and two lateral extents, optionally lifted (px at scale 1).
  function quad(g, dz0, x0a, x0b, dz1, x1a, x1b, lift0, lift1) {
    cam.project(dz0, x0a, pa); cam.project(dz0, x0b, pb); cam.project(dz1, x1b, pc); cam.project(dz1, x1a, pd);
    const l0 = (lift0 || 0) * pa.s, l1 = (lift1 || 0) * pc.s;
    g.beginPath(); g.moveTo(pa.x, pa.y - l0); g.lineTo(pb.x, pb.y - l0); g.lineTo(pc.x, pc.y - l1); g.lineTo(pd.x, pd.y - l1); g.closePath(); g.fill();
  }

  const PROPS_L = [['silo', 0], ['sign', 'q'], ['truck', 0], ['chimney', 0], ['sign', 'b'], ['wreck', 0]];
  const PROPS_R = [['chimney', 0], ['sign', 'z'], ['tankprop', 0], ['silo', 0], ['sign', 'q'], ['truck', 0]];
  const PROP_PERIOD = 36;

  R.draw = function (g, squadZ) {
    const W = cam.W, H = cam.H, far = C.FAR;
    g.drawImage(S.backdrop(), 0, 0);
    // ground
    g.fillStyle = K.ground; g.fillRect(0, cam.horizonY, W, H - cam.horizonY);
    // asphalt (slightly lighter far away)
    const asph = g.createLinearGradient(0, cam.horizonY, 0, H);
    asph.addColorStop(0, K.asphaltFar); asph.addColorStop(0.35, K.asphalt); asph.addColorStop(1, '#43454d');
    g.fillStyle = asph; quad(g, DZ_NEAR, -1.1, 1.1, far, -1.1, 1.1);
    // lane dashes (period 6 m, dash 3 m) in both lane centers
    g.fillStyle = K.lane;
    const k0 = Math.floor((squadZ + DZ_NEAR) / 6), k1 = Math.floor((squadZ + far) / 6);
    for (let k = k0; k <= k1; k++) {
      let dz0 = k * 6 - squadZ, dz1 = dz0 + 3;
      if (dz1 < DZ_NEAR) continue;
      if (dz0 < DZ_NEAR) dz0 = DZ_NEAR;
      quad(g, dz0, -0.513, -0.487, dz1, -0.513, -0.487);
      quad(g, dz0, 0.487, 0.513, dz1, 0.487, 0.513);
    }
    // median (raised strip)
    g.fillStyle = '#5b5e68'; quad(g, DZ_NEAR, -0.05, 0.05, far, -0.05, 0.05);
    g.fillStyle = K.median; quad(g, DZ_NEAR, -0.045, 0.045, far, -0.045, 0.045, 9, 9);
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
    hz.addColorStop(0, 'rgba(217,231,236,0.95)'); hz.addColorStop(1, 'rgba(217,231,236,0)');
    g.fillStyle = hz; g.fillRect(0, cam.horizonY, W, 70);
    // roadside props
    const i0 = Math.floor((squadZ - 4) / PROP_PERIOD), i1 = Math.floor((squadZ + C.DRAW_FAR) / PROP_PERIOD);
    for (let i = i0; i <= i1; i++) {
      const dz = i * PROP_PERIOD + 18 - squadZ;
      if (dz < -2 || dz > C.DRAW_FAR) continue;
      const pl = PROPS_L[((i % 6) + 6) % 6], pr = PROPS_R[((i % 6) + 6) % 6];
      cam.project(dz, -1.55, pa); S.drawUnit(g, pl[0], pl[1], 0, pa.x, pa.y, pa.s);
      cam.project(dz, 1.55, pb); S.drawUnit(g, pr[0], pr[1], 0, pb.x, pb.y, pb.s);
    }
  };
  ZRS.road = R;
})();

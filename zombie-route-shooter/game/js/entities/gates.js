/* gates.js — numbered gates (+k, xk, -k, ÷k), one lane wide, all in the gate
   lane. Positive gates absorb bullets and grow when shot. Crossing a gate
   applies its op to N. Tiles are a second, low form: long runs of +1 (or +2)
   blocks packed close together in the gate lane; each one run through adds
   its value. Tiles are not shot (bullets fly over them). */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, F = ZRS.fx, A = ZRS.audio;
  const G = {};
  const pool = [];
  for (let i = 0; i < C.MAX_GATES; i++) pool.push({ a: false, z: 0, lane: 'L', xmin: 0, xmax: 0, op: '+', value: 1, hits: 0, need: 10, ups: 0, passed: false, holes: [], flashT: 0, tile: false, popT: 0 });
  let next = 0;
  G.items = pool;
  const pa = {}, pb = {};

  G.reset = function () { pool.forEach(x => { x.a = false; x.holes.length = 0; }); };
  G.spawn = function (z, lane, op, value, tile) {
    const gt = pool[next]; next = (next + 1) % pool.length;
    gt.tile = !!tile; gt.popT = 0;
    gt.a = true; gt.z = z; gt.lane = lane; gt.op = op; gt.value = value; gt.hits = 0; gt.need = C.GATE_SHOT_HITS; gt.ups = 0; gt.passed = false; gt.holes.length = 0; gt.flashT = 0;
    const ln = C.LANES[lane] || C.LANES[C.LANE_ROLE.gate];
    gt.xmin = ln.min; gt.xmax = ln.max;
    return gt;
  };
  G.isPositive = function (gt) { return gt.op === '+' || gt.op === 'x'; };

  G.hitTest = function (prevZ, z, x) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const gt = pool[i]; if (!gt.a || gt.passed || gt.tile || !G.isPositive(gt)) continue;
      if (gt.z < prevZ || gt.z > z) continue;
      if (x < gt.xmin || x > gt.xmax) continue;
      if (!best || gt.z < best.z) best = gt;
    }
    return best;
  };
  G.onShot = function (gt, bullet, squadZ) {
    gt.hits++;
    if (gt.holes.length < 14) gt.holes.push({ dx: (bullet.x - (gt.xmin + gt.xmax) / 2) / ((gt.xmax - gt.xmin) / 2), dy: Math.random() * 0.8 + 0.1 });
    if (gt.hits >= gt.need) {
      gt.hits = 0; gt.need += C.GATE_SHOT_HITS_STEP; gt.ups++;
      if (gt.op === '+') gt.value = Math.min(C.GATE_PLUS_CAP, gt.value + 1);
      else gt.value = Math.min(C.GATE_MULT_CAP, Math.round((gt.value + C.GATE_MULT_STEP) * 10) / 10);
      gt.flashT = 0.25;
    }
  };

  let tileSfxT = 0;
  G.update = function (dt, squad) {
    if (tileSfxT > 0) tileSfxT -= dt;
    for (let i = 0; i < pool.length; i++) {
      const gt = pool[i]; if (!gt.a) continue;
      if (gt.flashT > 0) gt.flashT -= dt;
      if (gt.popT > 0) gt.popT -= dt;
      if (!gt.passed && squad.prevZ < gt.z && squad.z >= gt.z) {
        gt.passed = true;
        if (gt.tile) {
          if (squad.x >= gt.xmin - 0.04 && squad.x <= gt.xmax + 0.04) {
            squad.applyGate(gt.op, gt.value); gt.popT = 0.3;
            cam.project(gt.z - squad.z, (gt.xmin + gt.xmax) / 2, pa);
            F.sparkle(pa.x, pa.y - 20, 0.5, '#7ab8ff');
            if (tileSfxT <= 0) { A.gateUp(); tileSfxT = 0.12; }
          }
        } else if (squad.x >= gt.xmin && squad.x <= gt.xmax) {
          const delta = squad.applyGate(gt.op, gt.value);
          cam.project(gt.z - squad.z, (gt.xmin + gt.xmax) / 2, pa);
          if (delta >= 0) { F.sparkle(pa.x, pa.y - 30, 1, gt.op === 'x' ? '#ffd24a' : '#7ab8ff'); F.flash(gt.op === 'x' ? '#ffd24a' : '#7ab8ff', 0.18); A.gateUp(); }
          else { F.flash('#ff2d2d', 0.3); F.shake(C.SHAKE_LOSS); A.gateDown(); }
        }
      }
      if (gt.z - squad.z < -C.CULL_BEHIND) gt.a = false;
    }
  };

  // A tile: a low glowing block with its value on the front face.
  function drawTile(g, gt, dz) {
    if (gt.passed && gt.popT <= 0) return;
    cam.project(dz, gt.xmin + 0.05, pa); cam.project(dz, gt.xmax - 0.05, pb);
    const s = pa.s, x0 = pa.x, x1 = pb.x, w = x1 - x0, y = pa.y;
    const h = C.TILE_H * s, depth = 7 * s;
    const pop = gt.passed ? gt.popT / 0.3 : 1;
    g.globalAlpha = pop;
    const lift = gt.passed ? (1 - pop) * 24 * s : 0;
    const neg = gt.op === '-' || gt.op === '/';
    // top face, front face, rim
    g.fillStyle = neg ? '#ff8a8a' : '#a9d4ff'; g.fillRect(x0 + 2 * s, y - h - depth - lift, w - 4 * s, depth);
    g.drawImage(S.tileFace(neg), x0, y - h - lift, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, 1.5 * s); g.strokeRect(x0, y - h - lift, w, h);
    if (s > 0.09) S.drawText(g, S.gateLabel(gt.op, gt.value), (x0 + x1) / 2, y - h * 0.5 - lift, 24, '#ffffff', neg ? '#400a0a' : '#0c2a5a', s);
    g.globalAlpha = 1;
  }

  G.drawOne = function (g, gt, squadZ) {
    const dz = gt.z - squadZ;
    if (gt.tile) { drawTile(g, gt, dz); return; }
    cam.project(dz, gt.xmin + 0.04, pa); cam.project(dz, gt.xmax - 0.04, pb);
    const s = pa.s, h = C.GATE_H * s, y = pa.y, x0 = pa.x, x1 = pb.x, w = x1 - x0;
    const color = S.gateColor(gt.op), good = G.isPositive(gt);
    const fade = gt.passed ? 0.35 : 1;
    // ground glow
    g.globalAlpha = 0.22 * fade; g.fillStyle = color; S.ell(g, (x0 + x1) / 2, y, w * 0.6, 8 * s); g.fill();
    // translucent panel with a vertical sheen
    g.globalAlpha = (0.5 + (gt.flashT > 0 ? 0.3 : 0)) * fade;
    g.drawImage(S.gatePanel(gt.op), x0, y - h, w, h);
    g.globalAlpha = fade;
    // frame + posts
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1, 2 * s); g.strokeRect(x0, y - h, w, h);
    g.fillStyle = S.gatePost(gt.op); g.fillRect(x0 - 4 * s, y - h - 8 * s, 7 * s, h + 8 * s); g.fillRect(x1 - 3 * s, y - h - 8 * s, 7 * s, h + 8 * s);
    g.fillStyle = '#ffffff'; g.fillRect(x0 - 4 * s, y - h - 8 * s, 7 * s, 3 * s); g.fillRect(x1 - 3 * s, y - h - 8 * s, 7 * s, 3 * s);
    // top beam with chevrons (up for good gates, down for bad)
    g.fillStyle = color; g.fillRect(x0 - 4 * s, y - h - 14 * s, w + 8 * s, 8 * s);
    if (s > 0.2) {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      const n = Math.max(2, Math.round(w / (22 * s)));
      for (let i = 0; i < n; i++) {
        const cx = x0 + (i + 0.5) * w / n, cy = y - h - 10 * s;
        g.beginPath();
        if (good) { g.moveTo(cx - 4 * s, cy + 2.5 * s); g.lineTo(cx, cy - 2.5 * s); g.lineTo(cx + 4 * s, cy + 2.5 * s); }
        else { g.moveTo(cx - 4 * s, cy - 2.5 * s); g.lineTo(cx, cy + 2.5 * s); g.lineTo(cx + 4 * s, cy - 2.5 * s); }
        g.closePath(); g.fill();
      }
    }
    // bullet holes
    if (gt.holes.length && s > 0.15) {
      const cx = (x0 + x1) / 2, hw = w / 2;
      g.fillStyle = 'rgba(20,20,30,0.7)';
      for (let i = 0; i < gt.holes.length; i++) { const ho = gt.holes[i]; S.circ(g, cx + ho.dx * hw * 0.9, y - h + ho.dy * h, 2.2 * s); g.fill(); }
    }
    // pump progress bar on positive gates
    if (good && !gt.passed && s > 0.18 && gt.value < (gt.op === '+' ? C.GATE_PLUS_CAP : C.GATE_MULT_CAP)) {
      const bw = w * 0.7, bx = (x0 + x1) / 2 - bw / 2, by = y - 9 * s;
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(bx, by, bw, 4 * s);
      g.fillStyle = '#ffffff'; g.fillRect(bx, by, bw * Math.min(1, gt.hits / gt.need), 4 * s);
    }
    // label
    if (s > 0.06) S.drawText(g, S.gateLabel(gt.op, gt.value), (x0 + x1) / 2, y - h * 0.52, 36, '#ffffff', good ? '#102040' : '#400a0a', s * (gt.flashT > 0 ? 1.25 : 1));
    g.globalAlpha = 1;
  };
  ZRS.gates = G;
})();

/* gates.js — numbered gates (+k, xk, -k, ÷k), one lane wide. Positive gates
   absorb bullets and grow when shot. Crossing a gate applies its op to N. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, F = ZRS.fx, A = ZRS.audio;
  const G = {};
  const pool = [];
  for (let i = 0; i < C.MAX_GATES; i++) pool.push({ a: false, z: 0, lane: 'L', xmin: 0, xmax: 0, op: '+', value: 1, hits: 0, need: 10, ups: 0, passed: false, holes: [], flashT: 0 });
  let next = 0;
  G.items = pool;
  const pa = {}, pb = {};

  G.reset = function () { pool.forEach(x => { x.a = false; x.holes.length = 0; }); };
  G.spawn = function (z, lane, op, value) {
    const gt = pool[next]; next = (next + 1) % pool.length;
    gt.a = true; gt.z = z; gt.lane = lane; gt.op = op; gt.value = value; gt.hits = 0; gt.need = C.GATE_SHOT_HITS; gt.ups = 0; gt.passed = false; gt.holes.length = 0; gt.flashT = 0;
    gt.xmin = lane === 'L' ? -1 : lane === 'R' ? 0 : -1;
    gt.xmax = lane === 'L' ? 0 : lane === 'R' ? 1 : 1;
    return gt;
  };
  G.isPositive = function (gt) { return gt.op === '+' || gt.op === 'x'; };

  G.hitTest = function (prevZ, z, x) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const gt = pool[i]; if (!gt.a || gt.passed || !G.isPositive(gt)) continue;
      if (gt.z < prevZ || gt.z > z) continue;
      if (x < gt.xmin || x > gt.xmax) continue;
      if (!best || gt.z < best.z) best = gt;
    }
    return best;
  };
  G.onShot = function (gt, bullet, squadZ) {
    gt.hits++;
    if (gt.holes.length < 14) gt.holes.push({ dx: (bullet.x - (gt.xmin + gt.xmax) / 2) / ((gt.xmax - gt.xmin) / 2), dy: Math.random() * 0.8 + 0.1 });
    if (gt.ups < C.GATE_MAX_UPGRADES && gt.hits >= gt.need) {
      gt.hits = 0; gt.need *= 2; gt.ups++;
      if (gt.op === '+') gt.value = Math.min(C.GATE_PLUS_CAP, gt.value + 1);
      else gt.value = Math.min(C.GATE_MULT_CAP, Math.round((gt.value + 0.2) * 10) / 10);
      gt.flashT = 0.25;
    }
  };

  G.update = function (dt, squad) {
    for (let i = 0; i < pool.length; i++) {
      const gt = pool[i]; if (!gt.a) continue;
      if (gt.flashT > 0) gt.flashT -= dt;
      if (!gt.passed && squad.prevZ < gt.z && squad.z >= gt.z) {
        gt.passed = true;
        if (squad.x >= gt.xmin && squad.x <= gt.xmax) {
          const delta = squad.applyGate(gt.op, gt.value);
          cam.project(gt.z - squad.z, (gt.xmin + gt.xmax) / 2, pa);
          if (delta >= 0) { F.sparkle(pa.x, pa.y - 30, 1, gt.op === 'x' ? '#ffd24a' : '#7ab8ff'); F.flash(gt.op === 'x' ? '#ffd24a' : '#7ab8ff', 0.18); A.gateUp(); }
          else { F.flash('#ff2d2d', 0.3); F.shake(C.SHAKE_LOSS); A.gateDown(); }
        }
      }
      if (gt.z - squad.z < -C.CULL_BEHIND) gt.a = false;
    }
  };

  G.drawOne = function (g, gt, squadZ) {
    const dz = gt.z - squadZ;
    cam.project(dz, gt.xmin + 0.03, pa); cam.project(dz, gt.xmax - 0.03, pb);
    const s = pa.s, h = C.GATE_H * s, y = pa.y;
    const color = S.gateColor(gt.op);
    const alpha = gt.passed ? 0.18 : 0.42;
    g.globalAlpha = alpha + (gt.flashT > 0 ? 0.3 : 0);
    g.fillStyle = color; g.fillRect(pa.x, y - h, pb.x - pa.x, h);
    g.globalAlpha = Math.min(1, alpha + 0.4);
    g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, 1.5 * s); g.strokeRect(pa.x, y - h, pb.x - pa.x, h);
    g.globalAlpha = 1;
    // posts
    g.fillStyle = color; g.fillRect(pa.x - 3 * s, y - h - 6 * s, 5 * s, h + 8 * s); g.fillRect(pb.x - 2 * s, y - h - 6 * s, 5 * s, h + 8 * s);
    g.fillStyle = '#ffffff'; g.fillRect(pa.x - 3 * s, y - h - 6 * s, 5 * s, 3 * s); g.fillRect(pb.x - 2 * s, y - h - 6 * s, 5 * s, 3 * s);
    // bullet holes
    if (gt.holes.length && s > 0.15) {
      const cx = (pa.x + pb.x) / 2, hw = (pb.x - pa.x) / 2;
      g.fillStyle = 'rgba(20,20,30,0.7)';
      for (let i = 0; i < gt.holes.length; i++) { const ho = gt.holes[i]; S.circ(g, cx + ho.dx * hw * 0.9, y - h + ho.dy * h, 2.2 * s); g.fill(); }
    }
    // label
    if (s > 0.06) S.drawText(g, S.gateLabel(gt.op, gt.value), (pa.x + pb.x) / 2, y - h * 0.5, 34, '#ffffff', '#102040', s * (gt.flashT > 0 ? 1.25 : 1));
  };
  ZRS.gates = G;
})();

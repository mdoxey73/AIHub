/* camera.js — pseudo-3D projection shared by every renderer.
   project(dz, x): dz = meters ahead of the squad, x = lane units.
   Returns screen x/y and a scale s (1 at the squad row, smaller farther away). */
(function () {
  const C = ZRS.CONFIG;
  const cam = {
    W: C.LOGICAL_W, H: C.LOGICAL_H,
    cx: C.LOGICAL_W / 2,
    horizonY: C.LOGICAL_H * C.HORIZON_Y_FRAC,
    squadY: C.LOGICAL_H * C.SQUAD_Y_FRAC,
    halfW: C.LOGICAL_W * C.ROAD_HALF_W_FRAC,
    near: C.NEAR,
  };
  // Taller windows extend the logical height (up to MAX_LOGICAL_H) so phones fill the screen.
  cam.setHeight = function (H) {
    cam.H = H; cam.horizonY = H * C.HORIZON_Y_FRAC; cam.squadY = H * C.SQUAD_Y_FRAC;
  };
  cam.scale = function (dz) { return cam.near / (cam.near + dz); };
  cam.project = function (dz, x, out) {
    const s = cam.near / (cam.near + dz);
    out = out || {};
    out.s = s;
    out.y = cam.horizonY + (cam.squadY - cam.horizonY) * s;
    out.x = cam.cx + x * cam.halfW * s;
    return out;
  };
  // Lane-unit distance that corresponds to one screen pixel at scale s.
  cam.pxToLane = function (px, s) { return px / (cam.halfW * s); };
  ZRS.cam = cam;
})();

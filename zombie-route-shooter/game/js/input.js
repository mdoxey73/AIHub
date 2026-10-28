/* input.js — pointer drag (touch or mouse) for steering, taps for menus,
   keyboard arrows for desktop testing. Drag distance is accumulated in
   logical pixels and consumed once per simulation step. */
(function () {
  const I = { dx: 0, down: false, keyL: false, keyR: false, scale: 1, lastX: 0, moved: 0, tap: null, keyHandlers: [] };
  let canvas = null;
  I.setScale = function (s) { I.scale = s; };
  I.attach = function (c) {
    canvas = c;
    c.addEventListener('pointerdown', function (e) {
      ZRS.audio.init();
      I.down = true; I.lastX = e.clientX; I.moved = 0;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('pointermove', function (e) {
      if (!I.down) return;
      const d = (e.clientX - I.lastX) / I.scale;
      I.dx += d; I.moved += Math.abs(d); I.lastX = e.clientX;
      e.preventDefault();
    }, { passive: false });
    function up(e) {
      if (!I.down) return;
      I.down = false;
      if (I.moved < 10) {
        const r = c.getBoundingClientRect();
        I.tap = { x: (e.clientX - r.left) / I.scale, y: (e.clientY - r.top) / I.scale };
      }
      e.preventDefault();
    }
    c.addEventListener('pointerup', up, { passive: false });
    c.addEventListener('pointercancel', up, { passive: false });
    c.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    c.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    c.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') I.keyL = true;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') I.keyR = true;
      else if (e.key === ' ' || e.key === 'Enter') { ZRS.audio.init(); I.tap = { x: ZRS.cam.W / 2, y: ZRS.cam.H / 2 }; }
      I.keyHandlers.forEach(h => h(e.key));
    });
    window.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') I.keyL = false;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') I.keyR = false;
    });
  };
  I.consumeDX = function () { const d = I.dx; I.dx = 0; return d; };
  I.keyDir = function () { return (I.keyR ? 1 : 0) - (I.keyL ? 1 : 0); };
  I.consumeTap = function () { const t = I.tap; I.tap = null; return t; };
  I.onKey = function (fn) { I.keyHandlers.push(fn); };
  ZRS.input = I;
})();

/* fx.js — pooled particles, floating damage numbers, screen shake, flashes,
   hit-stop and the weapon banner. Particles and floaters live in screen space. */
(function () {
  const C = ZRS.CONFIG, S = ZRS.sprites;
  const F = {};
  const particles = [], floaters = [];
  for (let i = 0; i < C.MAX_PARTICLES; i++) particles.push({ a: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', grav: 0, kind: 0 });
  for (let i = 0; i < C.MAX_FLOATERS; i++) floaters.push({ a: false, x: 0, y: 0, vy: 0, life: 0, max: 1, text: '', color: '#fff', px: 16 });
  let pi = 0, fi = 0;
  const decals = [];
  for (let i = 0; i < C.MAX_DECALS; i++) decals.push({ a: false, z: 0, x: 0, size: 1, seed: 0 });
  let di = 0;
  let shakeMag = 0, shakeX = 0, shakeY = 0;
  let flashA = 0, flashColor = '#fff';
  let hitstop = 0;
  let banner = null, bannerT = 0, bannerMax = 0;

  F.decal = function (z, x, size) {
    const d = decals[di]; di = (di + 1) % decals.length;
    d.a = true; d.z = z; d.x = x; d.size = size || 1; d.seed = Math.random();
  };
  F.drawDecals = function (g, squadZ) {
    const cam = ZRS.cam, p = {};
    for (let i = 0; i < decals.length; i++) {
      const d = decals[i]; if (!d.a) continue;
      const dz = d.z - squadZ;
      if (dz < -C.CULL_BEHIND) { d.a = false; continue; }
      if (dz > C.DRAW_FAR) continue;
      cam.project(dz, d.x, p);
      g.fillStyle = 'rgba(110,14,14,0.55)';
      S.ell(g, p.x, p.y, 16 * p.s * d.size, 6 * p.s * d.size); g.fill();
      S.ell(g, p.x + 9 * p.s * d.size * (d.seed - 0.5), p.y - 3 * p.s, 6 * p.s * d.size, 3 * p.s * d.size); g.fill();
    }
  };
  F.reset = function () {
    particles.forEach(p => p.a = false); floaters.forEach(f => f.a = false); decals.forEach(d => d.a = false);
    shakeMag = 0; flashA = 0; hitstop = 0; banner = null;
  };

  F.burst = function (x, y, n, color, speed, life, size, grav, kind) {
    for (let k = 0; k < n; k++) {
      const p = particles[pi]; pi = (pi + 1) % particles.length;
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      p.a = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - speed * 0.3;
      p.life = p.max = life * (0.6 + Math.random() * 0.6); p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color; p.grav = grav || 0; p.kind = kind || 0;
    }
  };
  F.ring = function (x, y, size, color, life) {
    const p = particles[pi]; pi = (pi + 1) % particles.length;
    p.a = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.life = p.max = life; p.size = size; p.color = color; p.grav = 0; p.kind = 1;
  };
  F.explosion = function (x, y, s) {
    F.ring(x, y, 70 * s, '#ffd27a', 0.35);
    F.burst(x, y, 18, '#ff9a2e', 260 * s, 0.5, 6 * s, 300 * s);
    F.burst(x, y, 10, '#ffe27a', 320 * s, 0.35, 4 * s, 200 * s);
    F.burst(x, y - 10 * s, 8, 'rgba(60,60,60,0.8)', 90 * s, 0.9, 10 * s, -60 * s);
    F.shake(C.SHAKE_EXPLOSION * Math.min(1, s * 1.3));
  };
  F.splat = function (x, y, s) { F.burst(x, y, 7, '#8b1a1a', 140 * s, 0.4, 4 * s, 400 * s); };
  F.splinters = function (x, y, s, color) { F.burst(x, y, 12, color || '#a8743c', 200 * s, 0.5, 4 * s, 500 * s); };
  F.ragdoll = function (x, y, s) { F.burst(x, y, 1, '#252a3b', 220 * s, 0.7, 9 * s, 700 * s, 2); F.burst(x, y, 3, '#9b1a1a', 150 * s, 0.4, 3 * s, 400 * s); };
  F.sparkle = function (x, y, s, color) { F.burst(x, y, 14, color || '#ffe27a', 160 * s, 0.6, 5 * s, -120 * s, 3); };

  F.floater = function (x, y, text, color, px) {
    const f = floaters[fi]; fi = (fi + 1) % floaters.length;
    f.a = true; f.x = x + (Math.random() - 0.5) * 10; f.y = y; f.vy = -60; f.life = f.max = 0.75; f.text = text; f.color = color; f.px = px || 16;
  };
  F.shake = function (mag) { shakeMag = Math.max(shakeMag, mag); };
  F.flash = function (color, a) { flashColor = color; flashA = Math.max(flashA, a); };
  F.hitstop = function (ms) { hitstop = Math.max(hitstop, ms / 1000); };
  F.banner = function (text, sec) { banner = text; bannerT = bannerMax = sec || 0.9; };
  F.consumeHitstop = function (dt) { if (hitstop > 0) { hitstop -= dt; return true; } return false; };

  F.update = function (dt) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]; if (!p.a) continue;
      p.life -= dt; if (p.life <= 0) { p.a = false; continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 1) p.size += 160 * dt;
    }
    for (let i = 0; i < floaters.length; i++) {
      const f = floaters[i]; if (!f.a) continue;
      f.life -= dt; if (f.life <= 0) { f.a = false; continue; }
      f.y += f.vy * dt; f.vy *= 0.96;
    }
    if (shakeMag > 0) { shakeX = (Math.random() - 0.5) * 2 * shakeMag; shakeY = (Math.random() - 0.5) * 2 * shakeMag; shakeMag = Math.max(0, shakeMag - 28 * dt); }
    else { shakeX = shakeY = 0; }
    if (flashA > 0) flashA = Math.max(0, flashA - 3.2 * dt);
    if (bannerT > 0) bannerT -= dt;
  };
  F.offsetX = function () { return shakeX; };
  F.offsetY = function () { return shakeY; };

  F.drawParticles = function (g) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]; if (!p.a) continue;
      const t = p.life / p.max;
      g.globalAlpha = Math.min(1, t * 1.5);
      if (p.kind === 1) { g.strokeStyle = p.color; g.lineWidth = Math.max(1, 6 * t); S.circ(g, p.x, p.y, p.size); g.stroke(); }
      else if (p.kind === 2) { g.fillStyle = p.color; S.rr(g, p.x - p.size * 0.35, p.y - p.size * 0.6, p.size * 0.7, p.size * 1.2, p.size * 0.3); g.fill(); }
      else if (p.kind === 3) { g.fillStyle = p.color; g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      else { g.fillStyle = p.color; S.circ(g, p.x, p.y, p.size * (0.5 + t * 0.5)); g.fill(); }
    }
    g.globalAlpha = 1;
  };
  F.drawFloaters = function (g) {
    for (let i = 0; i < floaters.length; i++) {
      const f = floaters[i]; if (!f.a) continue;
      const t = f.life / f.max;
      g.globalAlpha = Math.min(1, t * 2);
      const sc = 1 + (1 - t) * 0.15;
      S.drawText(g, f.text, f.x, f.y, f.px, f.color, '#1a0505', sc);
    }
    g.globalAlpha = 1;
  };
  F.drawOverlay = function (g) {
    if (flashA > 0) { g.globalAlpha = flashA; g.fillStyle = flashColor; g.fillRect(0, 0, ZRS.cam.W, ZRS.cam.H); g.globalAlpha = 1; }
    if (banner && bannerT > 0) {
      const t = bannerT / bannerMax, pop = t > 0.85 ? 1 + (1 - (t - 0.85) / 0.15) * 0.3 : 1;
      g.globalAlpha = Math.min(1, t * 4);
      S.drawText(g, banner, ZRS.cam.W / 2, ZRS.cam.H * 0.42, 44, '#ffe27a', '#4a2a00', pop);
      g.globalAlpha = 1;
    }
  };
  ZRS.fx = F;
})();

/* main.js — canvas setup, fixed-step loop, level flow, HUD and screens. */
(function () {
  const C = ZRS.CONFIG, cam = ZRS.cam, S = ZRS.sprites, A = ZRS.audio, F = ZRS.fx;
  const Q = ZRS.squad, Zb = ZRS.zombies, Bu = ZRS.bullets, Ga = ZRS.gates, Ba = ZRS.barrels, Bo = ZRS.boss;
  const I = ZRS.input, L = ZRS.levels, SV = ZRS.save, Road = ZRS.road;
  const canvas = document.getElementById('game');
  const g = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const game = ZRS.game = {
    state: 'title', level: 1, data: null, time: 0, endT: 0, segIdx: 0, bossSpawned: false,
    debug: params.get('debug') === '1', fps: 0, frames: 0, fpsT: 0, scale: 1, px: 1, hintT: 0, blink: 0,
  };
  SV.load();
  A.setMuted(!!SV.data.muted);
  game.level = Math.max(1, parseInt(params.get('level') || SV.data.highestLevel, 10) || 1);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, C.MAX_DPR);
    const iw = Math.max(1, window.innerWidth), ih = Math.max(1, window.innerHeight);
    // 9:16 by default; taller windows extend the logical height so the playfield fills the screen
    const H = Math.max(C.LOGICAL_H, Math.min(C.MAX_LOGICAL_H, Math.round(C.LOGICAL_W * ih / iw)));
    cam.setHeight(H);
    const sc = Math.min(iw / C.LOGICAL_W, ih / H);
    game.scale = sc; game.px = sc * dpr;
    canvas.style.width = Math.floor(C.LOGICAL_W * sc) + 'px';
    canvas.style.height = Math.floor(H * sc) + 'px';
    canvas.width = Math.round(C.LOGICAL_W * sc * dpr);
    canvas.height = Math.round(H * sc * dpr);
    I.setScale(sc);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 100); });
  resize();
  I.attach(canvas);
  Q.reset(1, 'pistol');

  // ------------------------------------------------------------ level flow
  function startLevel(n) {
    game.level = n; game.data = L.get(n);
    Q.reset(game.data.startN, game.data.weapon);
    Zb.reset(); Bu.reset(); Ga.reset(); Ba.reset(); Bo.reset(); F.reset();
    game.segIdx = 0; game.bossSpawned = false; game.state = 'playing'; game.time = 0; game.endT = 0;
    game.hintT = n === 1 ? 3.2 : 0;
  }
  game.start = startLevel;

  function spawnSeg(s) {
    const hp = game.data.hpMult;
    switch (s[0]) {
      case 'chain': for (let i = 0; i < s[5]; i++) Ga.spawn(s[1] + i * (s[6] || 2.5), s[2], s[3], s[4]); break;
      case 'pair': Ga.spawn(s[1], 'L', s[2], s[3]); Ga.spawn(s[1], 'R', s[4], s[5]); break;
      case 'gate': Ga.spawn(s[1], s[2], s[3], s[4]); break;
      case 'pack': Zb.spawnPack(s[2], s[1], s[3], s[4], hp); break;
      case 'horde': Zb.spawnHorde(s[1], s[2], hp, s[3]); break;
      case 'barrel': Ba.spawn(s[1], s[2], s[3], s[4], s[5]); break;
    }
  }

  function updatePlaying(dt) {
    game.time += dt;
    if (game.hintT > 0) game.hintT -= dt;
    const dxLane = I.consumeDX() * C.DRAG_SENS / cam.halfW;
    Q.update(dt, dxLane, I.keyDir());
    const segs = game.data.segs;
    while (game.segIdx < segs.length && segs[game.segIdx][1] <= Q.z + C.SPAWN_AHEAD) { spawnSeg(segs[game.segIdx]); game.segIdx++; }
    if (!game.bossSpawned && Q.z >= game.data.len - C.BOSS.spawnAhead) {
      game.bossSpawned = true;
      const bz = Q.z + C.BOSS.spawnAhead, hp = game.data.hpMult;
      Bo.spawn(game.data.boss.hp, game.data.boss.giant, bz, 0.5);
      if (game.data.boss.giant) { Zb.spawnHorde(bz - 6, 16, hp); Zb.spawnHorde(bz + 8, 16, hp); }
      else Zb.spawnPack('L', bz - 4, 'walker', 4, hp);
    }
    Ga.update(dt, Q); Ba.update(dt, Q); Zb.update(dt, Q); Bo.update(dt, Q); Bu.update(dt, Q.z); F.update(dt);
    if (Q.n <= 0) { game.state = 'dying'; game.endT = 1.1; A.lose(); F.flash('#ff2d2d', 0.55); F.shake(10); }
    else if (Bo.dead) { game.state = 'winning'; game.endT = 1.5; A.win(); SV.unlock(game.level + 1); }
  }
  function updateEnding(dt) {
    game.endT -= dt;
    Q.prevZ = Q.z; if (game.state === 'winning') Q.z += C.SQUAD_SPEED * dt;
    Zb.update(dt, Q); Bo.update(dt, Q); Bu.update(dt, Q.z); F.update(dt);
    if (game.endT <= 0) game.state = game.state === 'dying' ? 'lose' : 'win';
  }
  function updateTitle(dt) {
    Q.prevZ = Q.z; Q.z += C.SQUAD_SPEED * 0.5 * dt; Q.time += dt; F.update(dt);
  }

  function update(dt) {
    game.blink += dt;
    const tap = I.consumeTap();
    if (tap) {
      if (tap.x > cam.W - 56 && tap.y < 56) { const m = !A.isMuted(); A.setMuted(m); SV.setMuted(m); A.tap(); }
      else if (game.state === 'title') { A.tap(); startLevel(game.level); }
      else if (game.state === 'win') { A.tap(); startLevel(game.level + 1); }
      else if (game.state === 'lose') { A.tap(); startLevel(game.level); }
    }
    switch (game.state) {
      case 'playing': updatePlaying(dt); break;
      case 'dying': case 'winning': updateEnding(dt); break;
      case 'title': updateTitle(dt); break;
      default: F.update(dt);
    }
  }

  // ------------------------------------------------------------ rendering
  const drawList = [];
  let drawCount = 0;
  function push(dz, kind, ref) {
    if (dz < -C.CULL_BEHIND || dz > C.DRAW_FAR) return;
    let e = drawList[drawCount];
    if (!e) { e = { dz: 0, kind: 0, ref: null }; drawList[drawCount] = e; }
    e.dz = dz; e.kind = kind; e.ref = ref; drawCount++;
  }
  function byDepth(a, b) { return b.dz - a.dz; }

  function renderWorld() {
    const sz = Q.z;
    Road.draw(g, sz);
    drawCount = 0;
    const G = Ga.items; for (let i = 0; i < G.length; i++) if (G[i].a) push(G[i].z - sz, 0, G[i]);
    const R = Ba.items; for (let i = 0; i < R.length; i++) if (R[i].a && !R[i].broken) push(R[i].z - sz, 1, R[i]);
    const Z = Zb.items; for (let i = 0; i < Z.length; i++) if (Z[i].a) push(Z[i].z - sz, 2, Z[i]);
    if (Bo.active) push(Bo.z - sz, 3, Bo);
    if (game.state !== 'lose' && game.state !== 'dying') { const So = Q.soldiers; for (let i = 0; i < So.length; i++) push(So[i].dz, 4, So[i]); }
    if (Q.drone) push(1.5, 5, null);
    if (Q.vehicle) push(-Q.depth - 1.2, 6, null);
    const list = drawList.length === drawCount ? drawList : drawList.slice(0, drawCount);
    list.sort(byDepth);
    for (let i = 0; i < drawCount; i++) {
      const e = list[i];
      switch (e.kind) {
        case 0: Ga.drawOne(g, e.ref, sz); break;
        case 1: Ba.drawOne(g, e.ref, sz); break;
        case 2: Zb.drawOne(g, e.ref, sz); break;
        case 3: Bo.drawOne(g, sz); break;
        case 4: Q.drawSoldier(g, e.ref, sz); break;
        case 5: Q.drawDrone(g); break;
        case 6: Q.drawVehicle(g); break;
      }
    }
    Bu.draw(g, sz);
    F.drawParticles(g);
    if (game.state === 'playing' || game.state === 'winning') Q.drawLabel(g);
    F.drawFloaters(g);
  }

  function drawMute() {
    const x = cam.W - 30, y = 28;
    g.fillStyle = 'rgba(0,0,0,0.35)'; S.rr(g, x - 20, y - 20, 40, 40, 8); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(x - 12, y - 5, 7, 10);
    g.beginPath(); g.moveTo(x - 5, y - 5); g.lineTo(x + 3, y - 12); g.lineTo(x + 3, y + 12); g.lineTo(x - 5, y + 5); g.closePath(); g.fill();
    if (A.isMuted()) { g.strokeStyle = '#ff3b3b'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 14, y - 14); g.lineTo(x + 14, y + 14); g.stroke(); }
    else { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(x + 6, y, 7, -0.9, 0.9); g.stroke(); }
  }
  function drawHUD() {
    S.drawText(g, 'LEVEL ' + game.level, 16, 30, 22, '#ffffff', '#102040', 1, 'left');
    drawMute();
    // weapon
    S.drawIcon(g, Q.weapon, cam.W - 40, 78, 0.8, false);
    S.drawText(g, C.WEAPONS[Q.weapon].name, cam.W - 72, 78, 14, '#ffe27a', '#3a2a00', 1, 'right');
    if (Q.drone) S.drawText(g, '+DRONE', cam.W - 72, 98, 12, '#6af0ff', '#103040', 1, 'right');
    if (Bo.active && !Bo.dying) Bo.drawBar(g, cam.W / 2, 66, 1.0);
    if (game.hintT > 0 && game.state === 'playing') {
      const t = Math.min(1, game.hintT / 0.5);
      g.globalAlpha = t;
      const hx = cam.W / 2 + Math.sin(game.time * 3) * 90, hy = cam.H * 0.6;
      S.drawText(g, 'DRAG TO MOVE', cam.W / 2, hy - 60, 26, '#ffffff', '#102040');
      g.fillStyle = 'rgba(0,0,0,0.3)'; S.ell(g, hx, hy + 26, 16, 6); g.fill();
      g.fillStyle = '#ffe3c8'; S.rr(g, hx - 12, hy - 8, 24, 30, 8); g.fill(); S.rr(g, hx - 6, hy - 26, 10, 26, 5); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cam.W / 2 - 110, hy + 50); g.lineTo(cam.W / 2 + 110, hy + 50); g.stroke();
      g.globalAlpha = 1;
    }
    if (game.debug) {
      const txt = 'fps ' + game.fps + '  N ' + Q.n + '  zb ' + Zb.aliveCount() + '  bu ' + Bu.count() + '  cache ' + S.cacheSize() + '  z ' + Q.z.toFixed(0) + '/' + (game.data ? game.data.len : 0) + '  ' + game.state;
      g.font = '12px monospace'; g.fillStyle = '#0f0'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(txt, 8, cam.H - 10);
    }
  }
  function overlay(alpha) { g.fillStyle = 'rgba(5,8,16,' + alpha + ')'; g.fillRect(0, 0, cam.W, cam.H); }
  function drawScreens() {
    const blink = (Math.sin(game.blink * 4) + 1) / 2;
    if (game.state === 'title') {
      overlay(0.45);
      S.drawText(g, 'ZOMBIE ROUTE', cam.W / 2, cam.H * 0.30, 54, '#ffe27a', '#3a1a00');
      S.drawText(g, 'SHOOTER', cam.W / 2, cam.H * 0.30 + 62, 54, '#ff3b3b', '#3a0a0a');
      S.drawText(g, 'LEVEL ' + game.level, cam.W / 2, cam.H * 0.50, 24, '#ffffff', '#102040');
      g.globalAlpha = 0.5 + blink * 0.5; S.drawText(g, 'TAP TO START', cam.W / 2, cam.H * 0.60, 30, '#ffffff', '#102040'); g.globalAlpha = 1;
      S.drawText(g, 'Drag left / right to steer the squad.', cam.W / 2, cam.H * 0.70, 15, '#dddddd', '#101820');
      S.drawText(g, 'Everything else is automatic.', cam.W / 2, cam.H * 0.70 + 22, 15, '#dddddd', '#101820');
    } else if (game.state === 'win') {
      overlay(0.5);
      S.drawText(g, 'ROUTE CLEARED', cam.W / 2, cam.H * 0.36, 48, '#7dff7a', '#0a3a10');
      S.drawText(g, 'LEVEL ' + game.level + ' COMPLETE', cam.W / 2, cam.H * 0.36 + 56, 24, '#ffffff', '#102040');
      S.drawText(g, 'SQUAD ' + Q.n, cam.W / 2, cam.H * 0.36 + 90, 22, '#ffe27a', '#3a2a00');
      g.globalAlpha = 0.5 + blink * 0.5; S.drawText(g, 'TAP FOR NEXT LEVEL', cam.W / 2, cam.H * 0.62, 28, '#ffffff', '#102040'); g.globalAlpha = 1;
    } else if (game.state === 'lose') {
      overlay(0.55);
      S.drawText(g, 'OVERRUN', cam.W / 2, cam.H * 0.36, 64, '#ff3b3b', '#3a0a0a');
      S.drawText(g, 'LEVEL ' + game.level, cam.W / 2, cam.H * 0.36 + 60, 24, '#ffffff', '#102040');
      g.globalAlpha = 0.5 + blink * 0.5; S.drawText(g, 'TAP TO RETRY', cam.W / 2, cam.H * 0.62, 28, '#ffffff', '#102040'); g.globalAlpha = 1;
    }
  }

  function render() {
    g.setTransform(game.px, 0, 0, game.px, 0, 0);
    g.save(); g.translate(F.offsetX(), F.offsetY());
    renderWorld();
    g.restore();
    drawHUD();
    F.drawOverlay(g);
    drawScreens();
  }

  // ------------------------------------------------------------ loop
  const STEP = 1 / 60;
  let last = performance.now(), acc = 0;
  let errorLogged = false;
  function frame(now) {
    requestAnimationFrame(frame); // schedule first so one bad frame never stops the game
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) { if (!F.consumeHitstop(STEP)) update(STEP); acc -= STEP; steps++; }
    if (steps === 5) acc = 0;
    render();
    game.frames++; game.fpsT += dt;
    if (game.fpsT >= 1) { game.fps = game.frames; game.frames = 0; game.fpsT -= 1; }
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------ debug keys
  I.onKey(function (k) {
    if (k === 'm' || k === 'M') { const m = !A.isMuted(); A.setMuted(m); SV.setMuted(m); }
    if (!game.debug) return;
    if (k === 'n') Q.setN(Q.n + 10, true);
    if (k === 'k' && Bo.active) Bo.damage(Bo.hp + 1, null, Q.z);
    if (k === 'l') startLevel(game.level + 1);
    if (k === 'g') Q.god = !Q.god;
  });
})();

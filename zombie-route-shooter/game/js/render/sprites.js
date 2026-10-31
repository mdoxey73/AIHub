/* sprites.js — everything is drawn with code, then cached in offscreen canvases
   per (kind, variant, frame, scale bucket) so the hot loop only calls drawImage.
   Text is cached the same way (string, size, colors). */
(function () {
  const C = ZRS.CONFIG;
  const S = {};
  const cache = new Map();
  const MAX_CACHE = 1200;
  const FONT = "'Arial Black', Impact, 'Helvetica Neue', Arial, sans-serif";

  // Quantize a scale factor so a handful of cached sizes cover every depth.
  S.bucket = function (s) {
    const q = Math.round(Math.log(Math.max(s, 0.03)) / Math.log(1.16));
    return Math.pow(1.16, q);
  };

  function getCanvas(key, w, h, drawFn) {
    let c = cache.get(key);
    if (c) return c;
    if (cache.size > MAX_CACHE) cache.clear();
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d');
    drawFn(g, c.width, c.height);
    cache.set(key, c);
    return c;
  }

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }
  function ell(g, cx, cy, rx, ry) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.closePath(); }
  function circ(g, cx, cy, r) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath(); }
  S.rr = rr; S.ell = ell; S.circ = circ;

  // ---------------------------------------------------------------- text
  S.text = function (str, px, fill, stroke, sw) {
    px = Math.max(6, Math.round(px));
    sw = sw == null ? Math.max(1, Math.round(px * 0.14)) : sw;
    const key = 't|' + str + '|' + px + '|' + fill + '|' + stroke + '|' + sw;
    let c = cache.get(key);
    if (c) return c;
    const m = document.createElement('canvas').getContext('2d');
    m.font = '900 ' + px + 'px ' + FONT;
    const w = m.measureText(str).width + sw * 2 + 6;
    const h = px * 1.35 + sw * 2;
    return getCanvas(key, w, h, function (g, W, H) {
      g.font = '900 ' + px + 'px ' + FONT;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round';
      if (stroke && sw > 0) { g.lineWidth = sw * 2; g.strokeStyle = stroke; g.strokeText(str, W / 2, H / 2); }
      g.fillStyle = fill; g.fillText(str, W / 2, H / 2);
    });
  };
  // Draw cached text centered at (x, y); optional scale multiplies the cached size.
  S.drawText = function (g, str, x, y, px, fill, stroke, scale, align) {
    const c = S.text(str, px, fill, stroke);
    scale = scale || 1;
    const w = c.width * scale, h = c.height * scale;
    let dx = x - w / 2;
    if (align === 'left') dx = x; else if (align === 'right') dx = x - w;
    g.drawImage(c, dx, y - h / 2, w, h);
    return w;
  };

  // ---------------------------------------------------------------- units
  // Base sizes at scale 1; sprites are anchored at bottom-center.
  const BASE = {
    soldier: [28, 46], walker: [28, 44], runner: [24, 40], brute: [44, 66], crawler: [30, 22],
    boss: [130, 170], barrel: [60, 64], crate: [72, 70], stand: [76, 58], drone: [48, 28], vehicle: [120, 64],
    sign: [70, 92], truck: [110, 62], silo: [84, 124], chimney: [44, 156], wreck: [100, 52], tankprop: [100, 52],
    cactus: [50, 96], pine: [70, 130], lamp: [60, 150], rock: [80, 46],
  };
  S.BASE = BASE;

  const drawers = {};

  drawers.soldier = function (g, variant, frame) {
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, 14, 44, 10, 3.5); g.fill();
    // legs
    g.fillStyle = '#2a3048';
    if (frame === 0) { g.fillRect(8, 30, 5, 13); g.fillRect(15, 32, 5, 11); }
    else { g.fillRect(8, 32, 5, 11); g.fillRect(15, 30, 5, 13); }
    g.fillStyle = '#14161f'; g.fillRect(8, 41, 5, 3); g.fillRect(15, 41, 5, 3);
    // arms
    g.fillStyle = '#394266'; g.fillRect(3, 18, 4, 11); g.fillRect(21, 18, 4, 11);
    g.fillStyle = '#e3b58d'; g.fillRect(3, 28, 4, 3); g.fillRect(21, 28, 4, 3);
    // torso + vest + belt + pack
    g.fillStyle = '#394266'; rr(g, 6, 16, 16, 16, 4); g.fill();
    g.fillStyle = '#6b85c4'; g.fillRect(6, 20, 16, 6);
    g.fillStyle = '#1a1c26'; g.fillRect(6, 29, 16, 3);
    g.fillStyle = '#8a7a5a'; rr(g, 9, 17, 10, 7, 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(7, 17, 3, 12);
    // head + helmet
    g.fillStyle = '#e3b58d'; circ(g, 14, 11, 5.5); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; circ(g, 15.5, 12.5, 4); g.fill();
    g.fillStyle = '#2a3148'; g.beginPath(); g.arc(14, 11, 6.2, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = '#4a5578'; g.beginPath(); g.arc(12.5, 8.5, 3, Math.PI * 1.1, Math.PI * 1.7); g.lineTo(12.5, 8.5); g.closePath(); g.fill();
    g.fillStyle = '#8a94b8'; g.fillRect(7.5, 10.5, 13, 2);
    // gun (points up the road)
    switch (variant) {
      case 'rifle': g.fillStyle = '#6a6a6a'; g.fillRect(20, 1, 4, 18); g.fillStyle = '#3a3a3a'; g.fillRect(19, 12, 6, 4); break;
      case 'shotgun': g.fillStyle = '#6b4a2a'; g.fillRect(19, 2, 3, 16); g.fillStyle = '#8a8a8a'; g.fillRect(22, 0, 2, 18); g.fillRect(19, 0, 2, 18); break;
      case 'minigun': g.fillStyle = '#9a9a9a'; g.fillRect(17, 0, 2, 18); g.fillRect(20.5, 0, 2, 18); g.fillRect(24, 0, 2, 18); g.fillStyle = '#4a4a4a'; g.fillRect(16, 13, 11, 6); break;
      case 'rpg': g.fillStyle = '#6b7f3a'; g.fillRect(19, 2, 6, 18); g.fillStyle = '#e03a30'; g.beginPath(); g.moveTo(18, 3); g.lineTo(22, -0.5); g.lineTo(26, 3); g.closePath(); g.fill(); break;
      default: g.fillStyle = '#7a7a7a'; g.fillRect(21, 5, 3, 12); g.fillStyle = '#4a4a4a'; g.fillRect(20, 14, 5, 3);
    }
  };

  function zombieBody(g, shirt, skin, frame, lean) {
    g.fillStyle = 'rgba(0,0,0,0.33)'; ell(g, 14, 42, 10, 3.5); g.fill();
    g.fillStyle = '#4a4552';
    if (frame === 0) { g.fillRect(8, 29, 5, 13); g.fillRect(15, 31, 5, 11); }
    else { g.fillRect(8, 31, 5, 11); g.fillRect(15, 29, 5, 13); }
    g.fillStyle = '#2b2830'; g.fillRect(8, 40, 5, 2); g.fillRect(15, 40, 5, 2);
    // arms reaching toward the camera
    g.fillStyle = shirt; g.fillRect(1 + lean, 18, 5, 12); g.fillRect(22 + lean, 18, 5, 12);
    g.fillStyle = skin; g.fillRect(1 + lean, 29, 5, 4); g.fillRect(22 + lean, 29, 5, 4);
    g.fillStyle = shirt; rr(g, 6, 16, 16, 15, 3); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(9, 22, 2, 7); g.fillRect(17, 19, 2, 9);
    g.fillStyle = '#7a1414'; g.fillRect(12, 24, 5, 4);
    g.fillStyle = skin; circ(g, 14 + lean, 11, 6); g.fill();
    g.fillStyle = '#141414'; circ(g, 11.5 + lean, 10, 1.3); g.fill(); circ(g, 16.5 + lean, 10, 1.3); g.fill();
    g.fillStyle = '#3a1010'; g.fillRect(11 + lean, 14, 6, 2);
    g.fillStyle = '#8b1a1a'; g.fillRect(16 + lean, 12, 4, 3);
  }
  // three shirt / skin variants per type so a crowd does not look cloned
  const ZSKIN = {
    walker:  [['#6d7a58', '#a7b792'], ['#5a6b8a', '#9fb39a'], ['#7a6a52', '#b0b88e']],
    runner:  [['#8a4a3a', '#b7a98a'], ['#9a6a2a', '#a9b88a'], ['#6a3a5a', '#b5ae92']],
    brute:   [['#3b3b45', '#7f8c75'], ['#4a3a30', '#86927a'], ['#2f4038', '#7a8a70']],
    crawler: [['#5d6a4a', '#98a882'], ['#4f5a6a', '#90a08a'], ['#6a5a48', '#a2a888']],
  };
  function zs(kind, v) { const a = ZSKIN[kind]; return a[(v | 0) % a.length]; }
  drawers.walker = function (g, variant, frame) { const k = zs('walker', variant); zombieBody(g, k[0], k[1], frame, 0); };
  drawers.runner = function (g, variant, frame) { const k = zs('runner', variant); g.save(); g.scale(24 / 28, 40 / 44); zombieBody(g, k[0], k[1], frame, 2); g.restore(); };
  drawers.brute = function (g, variant, frame) {
    const k = zs('brute', variant);
    g.save(); g.scale(44 / 28, 66 / 44); zombieBody(g, k[0], k[1], frame, 0); g.restore();
    // shoulder plates and a rebar club so brutes read as heavies
    g.fillStyle = '#5a5a62'; rr(g, 0, 24, 14, 9, 3); g.fill(); rr(g, 30, 24, 14, 9, 3); g.fill();
    g.fillStyle = '#7a7a82'; g.fillRect(2, 25, 10, 2); g.fillRect(32, 25, 10, 2);
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 48); g.lineTo(43, 18); g.stroke();
  };
  // crawler: low, wide, on all fours
  drawers.crawler = function (g, variant, frame) {
    const k = zs('crawler', variant), sh = k[0], sk = k[1];
    g.fillStyle = 'rgba(0,0,0,0.33)'; ell(g, 15, 20, 13, 3); g.fill();
    const a = frame ? 2 : -2;
    g.fillStyle = sk; g.fillRect(2, 12 + a, 4, 8 - a); g.fillRect(24, 12 - a, 4, 8 + a);
    g.fillStyle = '#4a4552'; g.fillRect(6, 14 - a, 4, 6 + a); g.fillRect(20, 14 + a, 4, 6 - a);
    g.fillStyle = sh; rr(g, 4, 7, 22, 9, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(9, 9, 2, 6); g.fillRect(17, 8, 2, 6);
    g.fillStyle = sk; circ(g, 15, 7, 5); g.fill();
    g.fillStyle = '#141414'; circ(g, 13, 6.5, 1.1); g.fill(); circ(g, 17, 6.5, 1.1); g.fill();
    g.fillStyle = '#7a1414'; g.fillRect(13, 9, 4, 1.6);
  };

  drawers.boss = function (g, variant, frame) {
    const skin = variant === 'burn' ? '#f0a070' : '#ecc2a5';
    const dress = variant === 'burn' ? '#ff5a2a' : '#cf2030';
    g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, 65, 165, 52, 9); g.fill();
    // legs, socks, shoes
    g.fillStyle = skin;
    const lo = frame === 0 ? 0 : 4;
    g.fillRect(38, 118 - lo, 20, 40 + lo); g.fillRect(72, 118 - (4 - lo), 20, 40 + (4 - lo));
    g.fillStyle = '#ffffff'; g.fillRect(38, 146, 20, 8); g.fillRect(72, 146, 20, 8);
    g.fillStyle = '#c21f2b'; rr(g, 34, 154, 26, 11, 4); g.fill(); rr(g, 70, 154, 26, 11, 4); g.fill();
    // arms
    g.fillStyle = skin; ell(g, 18, 84, 15, 22); g.fill(); ell(g, 112, 84, 15, 22); g.fill();
    // body
    ell(g, 65, 86, 52, 50); g.fill();
    // dress with polka dots
    g.fillStyle = dress;
    g.beginPath(); g.moveTo(30, 58); g.lineTo(100, 58); g.lineTo(120, 136); g.lineTo(10, 136); g.closePath(); g.fill();
    g.save(); g.beginPath(); g.moveTo(30, 58); g.lineTo(100, 58); g.lineTo(120, 136); g.lineTo(10, 136); g.closePath(); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let y = 64; y < 136; y += 14) for (let x = 12 + ((y / 14) % 2) * 7; x < 122; x += 14) { circ(g, x, y, 3.2); g.fill(); }
    g.restore();
    g.fillStyle = '#ffffff'; g.fillRect(10, 132, 110, 6);
    g.fillStyle = dress; g.fillRect(40, 38, 10, 24); g.fillRect(80, 38, 10, 24);
    // head
    g.fillStyle = skin; circ(g, 65, 34, 24); g.fill();
    g.fillStyle = '#3a2a22'; g.beginPath(); g.arc(65, 30, 24, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
    g.fillStyle = '#1a1a1a'; circ(g, 56, 31, 3); g.fill(); circ(g, 74, 31, 3); g.fill();
    g.strokeStyle = '#a02020'; g.lineWidth = 1.5; circ(g, 56, 31, 5); g.stroke(); circ(g, 74, 31, 5); g.stroke();
    g.fillStyle = '#3a1010'; rr(g, 52, 42, 26, 9, 3); g.fill();
    g.fillStyle = '#f4f4f4'; for (let i = 0; i < 5; i++) g.fillRect(54 + i * 5, 43, 3, 3);
    // mace
    g.strokeStyle = '#6b6b6b'; g.lineWidth = 5; g.beginPath(); g.moveTo(114, 76); g.lineTo(126, 22); g.stroke();
    g.fillStyle = '#777'; circ(g, 127, 16, 12); g.fill();
    g.strokeStyle = '#999'; g.lineWidth = 3;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { g.beginPath(); g.moveTo(127 + Math.cos(a) * 10, 16 + Math.sin(a) * 10); g.lineTo(127 + Math.cos(a) * 17, 16 + Math.sin(a) * 17); g.stroke(); }
  };

  drawers.barrel = function (g, variant) {
    const wood = variant === 'explosive' ? '#c62828' : '#8c5a2b';
    const band = variant === 'explosive' ? '#5a0f0f' : '#3d2814';
    const top = variant === 'explosive' ? '#a51f1f' : '#a8743c';
    g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, 30, 61, 24, 5); g.fill();
    g.fillStyle = wood; rr(g, 8, 14, 44, 46, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(19, 14, 1.5, 46); g.fillRect(30, 14, 1.5, 46); g.fillRect(41, 14, 1.5, 46);
    g.fillStyle = band; g.fillRect(8, 22, 44, 4); g.fillRect(8, 52, 44, 4);
    if (variant === 'explosive') {
      g.fillStyle = '#f2c230'; g.fillRect(8, 36, 44, 9);
      g.fillStyle = '#1d1d1d'; for (let x = 10; x < 52; x += 10) { g.beginPath(); g.moveTo(x, 36); g.lineTo(x + 5, 36); g.lineTo(x + 1, 45); g.lineTo(x - 4, 45); g.closePath(); g.fill(); }
    } else { g.fillStyle = band; g.fillRect(8, 37, 44, 4); }
    g.fillStyle = top; ell(g, 30, 14, 22, 7); g.fill();
    g.fillStyle = wood; ell(g, 30, 14, 17, 4.5); g.fill();
  };
  drawers.crate = function (g) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, 36, 67, 32, 5); g.fill();
    g.fillStyle = '#dcb878'; g.beginPath(); g.moveTo(6, 22); g.lineTo(66, 22); g.lineTo(72, 10); g.lineTo(12, 10); g.closePath(); g.fill();
    g.fillStyle = '#c9a461'; g.fillRect(6, 22, 60, 44);
    g.fillStyle = 'rgba(0,0,0,0.15)'; for (let y = 32; y < 66; y += 11) g.fillRect(6, y, 60, 1.5);
    g.fillStyle = '#5c5c66'; g.fillRect(6, 22, 6, 44); g.fillRect(60, 22, 6, 44); g.fillRect(6, 22, 60, 4); g.fillRect(6, 62, 60, 4);
  };
  drawers.drone = function (g) {
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(8, 6); g.lineTo(40, 22); g.moveTo(8, 22); g.lineTo(40, 6); g.stroke();
    g.fillStyle = 'rgba(106,240,255,0.45)'; [[8, 6], [40, 6], [8, 22], [40, 22]].forEach(p => { circ(g, p[0], p[1], 6); g.fill(); });
    g.fillStyle = '#222'; circ(g, 24, 14, 6); g.fill();
    g.fillStyle = '#ff3030'; circ(g, 24, 17, 1.8); g.fill();
  };
  drawers.vehicle = function (g) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, 60, 60, 52, 6); g.fill();
    g.fillStyle = '#2a2a2a'; rr(g, 6, 44, 108, 14, 5); g.fill();
    g.fillStyle = '#4f6b3a'; rr(g, 10, 28, 100, 20, 4); g.fill();
    g.fillStyle = '#44603a'; rr(g, 38, 12, 44, 20, 5); g.fill();
    g.fillStyle = '#333'; g.fillRect(58, 0, 5, 16);
    g.fillStyle = '#5f7f48'; g.fillRect(14, 32, 92, 4);
  };
  // supply stand: steel plinth with a lit top and a colored band by reward type
  drawers.stand = function (g, variant) {
    const band = variant === 'weapon' ? '#39c95a' : variant === 'squad' ? '#2f7cff' : variant === 'rate' ? '#e0a400' : '#e0562a';
    g.fillStyle = 'rgba(0,0,0,0.38)'; ell(g, 38, 55, 34, 5); g.fill();
    const gr = g.createLinearGradient(6, 0, 70, 0);
    gr.addColorStop(0, '#3e434d'); gr.addColorStop(0.45, '#6b7280'); gr.addColorStop(1, '#353941');
    g.fillStyle = gr; rr(g, 8, 14, 60, 40, 5); g.fill();
    g.fillStyle = band; g.fillRect(8, 44, 60, 6);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(8, 14, 60, 4);
    g.fillStyle = '#23262c'; g.fillRect(8, 50, 60, 4);
    // lit top
    g.fillStyle = '#8b93a0'; ell(g, 38, 14, 30, 7); g.fill();
    g.fillStyle = band; g.globalAlpha = 0.55; ell(g, 38, 13, 22, 4.5); g.fill(); g.globalAlpha = 1;
    // corner bolts
    g.fillStyle = '#9aa2ae'; [[13, 22], [63, 22], [13, 40], [63, 40]].forEach(p => { circ(g, p[0], p[1], 1.6); g.fill(); });
  };
  drawers.cactus = function (g) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 25, 93, 18, 4); g.fill();
    g.fillStyle = '#3f7a3a'; rr(g, 18, 14, 14, 80, 7); g.fill();
    rr(g, 4, 40, 10, 30, 5); g.fill(); g.fillRect(8, 60, 12, 8);
    rr(g, 36, 30, 10, 28, 5); g.fill(); g.fillRect(30, 50, 12, 8);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(21, 18, 3, 72);
  };
  drawers.pine = function (g, variant) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 35, 127, 26, 4); g.fill();
    g.fillStyle = '#5a3a22'; g.fillRect(31, 100, 8, 28);
    const col = ['#244a34', '#2c5a3e', '#336846'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = col[i]; g.beginPath(); g.moveTo(35, 6 + i * 26); g.lineTo(66 - i * 4, 62 + i * 22); g.lineTo(4 + i * 4, 62 + i * 22); g.closePath(); g.fill();
      if (variant === 'snow') { g.fillStyle = '#f4f8fb'; g.beginPath(); g.moveTo(35, 6 + i * 26); g.lineTo(46 - i, 26 + i * 26); g.lineTo(24 + i, 26 + i * 26); g.closePath(); g.fill(); }
    }
  };
  drawers.lamp = function (g, variant) {
    g.fillStyle = '#4a4d56'; g.fillRect(8, 20, 5, 130);
    g.fillRect(8, 18, 40, 4);
    g.fillStyle = '#2d2f36'; rr(g, 38, 16, 18, 8, 3); g.fill();
    g.fillStyle = variant === 'night' ? '#ffe7a8' : '#d8dde4'; g.fillRect(40, 23, 14, 3);
    if (variant === 'night') { g.fillStyle = 'rgba(255,220,140,0.35)'; g.beginPath(); g.moveTo(40, 26); g.lineTo(54, 26); g.lineTo(60, 60); g.lineTo(34, 60); g.closePath(); g.fill(); }
  };
  drawers.rock = function (g, variant) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 40, 43, 36, 4); g.fill();
    g.fillStyle = variant === 'desert' ? '#a8754a' : variant === 'snow' ? '#8a96a2' : '#6e6a62';
    g.beginPath(); g.moveTo(4, 44); g.lineTo(14, 18); g.lineTo(34, 6); g.lineTo(58, 12); g.lineTo(76, 44); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(14, 18); g.lineTo(34, 6); g.lineTo(36, 22); g.closePath(); g.fill();
    if (variant === 'snow') { g.fillStyle = '#f4f8fb'; g.beginPath(); g.moveTo(14, 18); g.lineTo(34, 6); g.lineTo(58, 12); g.lineTo(46, 18); g.lineTo(26, 16); g.closePath(); g.fill(); }
  };
  // roadside props
  drawers.sign = function (g, variant) {
    g.fillStyle = '#666'; g.fillRect(33, 44, 5, 48);
    g.fillStyle = '#d8d2c0'; rr(g, 4, 6, 62, 42, 3); g.fill();
    g.strokeStyle = '#444'; g.lineWidth = 2; rr(g, 4, 6, 62, 42, 3); g.stroke();
    if (variant === 'q') {
      g.drawImage(S.text('QUARANTINE', 9, '#222', null, 0), 35 - 30, 10, 60, 14);
      g.drawImage(S.text('ZONE 7', 9, '#a02020', null, 0), 35 - 20, 28, 40, 14);
    } else if (variant === 'z') {
      g.drawImage(S.text('ROUTE', 11, '#222', null, 0), 35 - 22, 10, 44, 16);
      g.drawImage(S.text('ZZZ', 11, '#a02020', null, 0), 35 - 18, 28, 36, 16);
    } else {
      // biohazard-ish symbol
      g.fillStyle = '#e0b000'; rr(g, 4, 6, 62, 42, 3); g.fill();
      g.fillStyle = '#222'; for (let a = -Math.PI / 2; a < Math.PI * 1.5; a += Math.PI * 2 / 3) { circ(g, 35 + Math.cos(a) * 9, 27 + Math.sin(a) * 9, 8); g.fill(); }
      g.fillStyle = '#e0b000'; circ(g, 35, 27, 5); g.fill();
    }
  };
  drawers.truck = function (g) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 55, 59, 50, 5); g.fill();
    g.fillStyle = '#4e5a3c'; rr(g, 28, 10, 78, 36, 4); g.fill();
    g.fillStyle = '#3b4630'; rr(g, 4, 22, 28, 26, 4); g.fill();
    g.fillStyle = '#9fc2d6'; g.fillRect(8, 26, 18, 10);
    g.fillStyle = '#222'; [16, 44, 90].forEach(x => { circ(g, x, 50, 8); g.fill(); });
  };
  drawers.wreck = function (g) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 50, 49, 46, 5); g.fill();
    g.fillStyle = '#8a4a28'; rr(g, 4, 20, 92, 22, 6); g.fill();
    g.fillStyle = '#6e3a1e'; rr(g, 26, 6, 44, 18, 6); g.fill();
    g.fillStyle = '#222'; [20, 80].forEach(x => { circ(g, x, 42, 8); g.fill(); });
  };
  drawers.silo = function (g) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 42, 121, 40, 5); g.fill();
    g.fillStyle = '#9a9ba4'; rr(g, 6, 12, 72, 108, 10); g.fill();
    g.fillStyle = '#7d7e88'; g.fillRect(6, 40, 72, 4); g.fillRect(6, 80, 72, 4);
    g.fillStyle = '#b4b5bd'; ell(g, 42, 12, 36, 8); g.fill();
    g.fillStyle = '#e0b000'; circ(g, 42, 62, 16); g.fill();
    g.fillStyle = '#222'; for (let a = -Math.PI / 2; a < Math.PI * 1.5; a += Math.PI * 2 / 3) { circ(g, 42 + Math.cos(a) * 7, 62 + Math.sin(a) * 7, 6); g.fill(); }
    g.fillStyle = '#e0b000'; circ(g, 42, 62, 4); g.fill();
  };
  drawers.chimney = function (g) {
    g.fillStyle = '#6f727c'; g.fillRect(14, 30, 16, 126);
    g.fillStyle = '#56596a'; g.fillRect(12, 28, 20, 6);
    g.fillStyle = 'rgba(120,200,120,0.55)'; circ(g, 22, 18, 10); g.fill(); circ(g, 30, 8, 8); g.fill(); circ(g, 14, 10, 7); g.fill();
  };
  drawers.tankprop = function (g) { g.save(); g.scale(100 / 120, 52 / 64); drawers.vehicle(g); g.restore(); };

  const OUTLINED = { soldier: 1, walker: 1, runner: 1, brute: 1, crawler: 1, boss: 1, drone: 1, stand: 1 };
  // Returns a cached canvas for the unit at scale bucket b. Units get a dark
  // 1px outline (drawn once into the cache) so they read against the asphalt.
  S.unit = function (kind, variant, frame, s) {
    const b = S.bucket(s);
    const base = BASE[kind];
    const key = 'u|' + kind + '|' + variant + '|' + frame + '|' + b.toFixed(3);
    const w = base[0] * b + 2, h = base[1] * b + 2;
    return getCanvas(key, w, h, function (g, W, H) {
      if (variant === 'hit') { // white silhouette for the hit flash
        g.save(); g.translate(1, 1); g.scale(b, b); drawers[kind](g, 0, frame || 0); g.restore();
        g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        return;
      }
      if (OUTLINED[kind] && b > 0.25) {
        const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
        const tg = tmp.getContext('2d');
        tg.save(); tg.translate(1, 1); tg.scale(b, b); drawers[kind](g === tg ? g : tg, variant, frame || 0); tg.restore();
        const sil = document.createElement('canvas'); sil.width = W; sil.height = H;
        const sg = sil.getContext('2d');
        sg.drawImage(tmp, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(10,10,18,0.9)'; sg.fillRect(0, 0, W, H);
        const o = Math.max(1, Math.round(b));
        g.drawImage(sil, o, 0); g.drawImage(sil, -o, 0); g.drawImage(sil, 0, o); g.drawImage(sil, 0, -o);
        g.drawImage(tmp, 0, 0);
      } else {
        g.save(); g.translate(1, 1); g.scale(b, b);
        drawers[kind](g, variant, frame || 0);
        g.restore();
      }
    });
  };
  // Draw a unit anchored at bottom-center (sx, sy) with exact scale s.
  S.drawUnit = function (g, kind, variant, frame, sx, sy, s) {
    const c = S.unit(kind, variant, frame, s);
    const base = BASE[kind];
    const w = base[0] * s + 2, h = base[1] * s + 2;
    g.drawImage(c, sx - w / 2, sy - h + 1, w, h);
  };

  // ---------------------------------------------------------------- weapon icons
  const iconDrawers = {
    pistol: function (g) {
      g.fillStyle = '#4a4a4a'; g.fillRect(10, 10, 26, 6);
      g.fillStyle = '#333'; g.fillRect(12, 15, 7, 11);
      g.fillStyle = '#6a6a6a'; g.fillRect(30, 8, 8, 4);
    },
    minigun: function (g) {
      g.fillStyle = '#555'; rr(g, 4, 10, 18, 10, 2); g.fill();
      g.strokeStyle = '#8a8a8a'; g.lineWidth = 2.5; [11, 15, 19].forEach(y => { g.beginPath(); g.moveTo(22, y); g.lineTo(46, y); g.stroke(); });
      g.fillStyle = '#3a3a3a'; g.fillRect(6, 19, 10, 7);
    },
    rifle: function (g) {
      g.fillStyle = '#6b4a2a'; g.fillRect(0, 10, 9, 8);
      g.fillStyle = '#4a4a4a'; g.fillRect(6, 12, 30, 5);
      g.fillStyle = '#6a6a6a'; g.fillRect(34, 13, 13, 3);
      g.fillStyle = '#333'; g.fillRect(16, 17, 6, 8);
    },
    shotgun: function (g) {
      g.fillStyle = '#6b4a2a'; g.fillRect(0, 10, 12, 9);
      g.fillStyle = '#3f3f3f'; g.fillRect(12, 11, 10, 7);
      g.fillStyle = '#5a5a5a'; g.fillRect(22, 11, 25, 3); g.fillRect(22, 15, 25, 3);
    },
    rpg: function (g) {
      g.fillStyle = '#5a6b2f'; g.fillRect(4, 11, 34, 8);
      g.fillStyle = '#c9302c'; g.beginPath(); g.moveTo(38, 8); g.lineTo(48, 15); g.lineTo(38, 22); g.closePath(); g.fill();
      g.fillStyle = '#3a4620'; g.fillRect(0, 8, 6, 14);
    },
    drone: function (g) { g.save(); g.scale(1, 1); drawers.drone(g); g.restore(); },
    vehicle: function (g) { g.save(); g.scale(48 / 120, 28 / 64); drawers.vehicle(g); g.restore(); },
  };
  // Icon with a green glow outline (the ads' "unlockable" look).
  S.icon = function (name, s, glow) {
    if (!iconDrawers[name]) name = 'rifle';
    const b = S.bucket(s);
    const key = 'i|' + name + '|' + (glow ? 1 : 0) + '|' + b.toFixed(3);
    const w = 48 * b + 12, h = 28 * b + 12;
    return getCanvas(key, w, h, function (g) {
      g.save(); g.translate(6, 6); g.scale(b, b);
      if (glow) { g.shadowColor = '#39ff6a'; g.shadowBlur = 6 / b; iconDrawers[name](g); iconDrawers[name](g); g.shadowBlur = 0; }
      iconDrawers[name](g);
      g.restore();
    });
  };
  S.drawIcon = function (g, name, sx, sy, s, glow) {
    const c = S.icon(name, s, glow);
    const w = 48 * s + 12, h = 28 * s + 12;
    g.drawImage(c, sx - w / 2, sy - h / 2, w, h);
  };

  // Rounded label chip with cached text, centered at (x, y); scale multiplies size.
  S.drawChip = function (g, str, x, y, px, color, scale) {
    scale = scale || 1;
    const t = S.text(str, px, '#ffffff', '#102040');
    const w = t.width * scale + 10 * scale, h = t.height * scale + 2 * scale;
    g.fillStyle = color; rr(g, x - w / 2, y - h / 2, w, h, 6 * scale); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, 1.5 * scale); rr(g, x - w / 2, y - h / 2, w, h, 6 * scale); g.stroke();
    g.drawImage(t, x - t.width * scale / 2, y - t.height * scale / 2, t.width * scale, t.height * scale);
  };
  // Vignette overlay (cached per size).
  let vig = null, vigKey = '';
  S.vignette = function (W, H) {
    const key = W + 'x' + H;
    if (vig && vigKey === key) return vig;
    vig = document.createElement('canvas'); vig.width = W; vig.height = H; vigKey = key;
    const g = vig.getContext('2d');
    const gr = g.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.85);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return vig;
  };

  // ---------------------------------------------------------------- gates (drawn live; text cached)
  S.gateColor = function (op) {
    const K = C.COLORS;
    return op === '+' ? K.gatePlus : op === 'x' ? K.gateMult : K.gateMinus;
  };
  // Cached gate panel: vertical gradient with a diagonal sheen.
  S.gatePanel = function (op) {
    const good = op === '+' || op === 'x';
    const key = 'gp|' + op;
    return getCanvas(key, 64, 64, function (g, W, H) {
      const c = S.gateColor(op);
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, c); gr.addColorStop(1, good ? 'rgba(20,40,120,0.6)' : 'rgba(120,10,10,0.6)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.beginPath(); g.moveTo(8, 0); g.lineTo(22, 0); g.lineTo(6, H); g.lineTo(-8, H); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(28, 0); g.lineTo(32, 0); g.lineTo(16, H); g.lineTo(12, H); g.closePath(); g.fill();
    });
  };
  S.gatePost = function (op) { return op === 'x' ? '#c98f00' : op === '+' ? '#1f58c9' : '#b81f1f'; };
  S.gateLabel = function (op, value) {
    if (op === 'x') return 'x' + (Number.isInteger(value) ? value : value.toFixed(1));
    if (op === '/') return '÷' + value;
    if (op === '-') return '-' + value;
    return '+' + value;
  };

  // ---------------------------------------------------------------- backdrop (per theme)
  let theme = 'city', backdrop = null, backdropKey = '';
  S.setTheme = function (name) { theme = name; };
  S.backdrop = function () {
    const cam = ZRS.cam, T = C.THEMES[theme] || C.THEMES.city;
    const W = cam.W, H = Math.ceil(cam.horizonY + 40);
    const key = theme + '|' + H;
    if (backdrop && backdropKey === key) return backdrop;
    backdropKey = key;
    backdrop = document.createElement('canvas'); backdrop.width = W; backdrop.height = H;
    const g = backdrop.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, T.sky1); sky.addColorStop(1, T.sky2);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (T.night) {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 70; i++) { g.fillRect(rnd() * W, rnd() * (H - 80), rnd() < 0.2 ? 2 : 1, rnd() < 0.2 ? 2 : 1); }
      g.fillStyle = '#f2f4ff'; circ(g, W * 0.78, H * 0.22, 18); g.fill();
      g.fillStyle = T.sky1; circ(g, W * 0.78 + 7, H * 0.22 - 4, 15); g.fill();
    } else {
      const sun = g.createRadialGradient(W * 0.78, H * 0.22, 4, W * 0.78, H * 0.22, 120);
      sun.addColorStop(0, 'rgba(' + T.sun + ',0.95)'); sun.addColorStop(0.15, 'rgba(' + T.sun + ',0.6)'); sun.addColorStop(1, 'rgba(' + T.sun + ',0)');
      g.fillStyle = sun; g.fillRect(0, 0, W, H);
      g.fillStyle = theme === 'toxic' ? 'rgba(200,220,150,0.55)' : 'rgba(255,255,255,0.75)';
      [[60, 50, 28], [95, 40, 22], [130, 52, 18], [300, 30, 24], [335, 24, 18], [365, 34, 20], [470, 62, 20], [500, 56, 16]].forEach(c => { circ(g, c[0], c[1], c[2]); g.fill(); });
    }
    // far hills / mesas / peaks
    g.fillStyle = T.hills; g.beginPath(); g.moveTo(0, H - 60);
    if (theme === 'desert') {
      [[0, 80], [60, 80], [70, 110], [150, 110], [160, 78], [260, 78], [280, 124], [340, 124], [350, 84], [450, 84], [462, 104], [W, 104]].forEach(p => g.lineTo(p[0], H - p[1]));
    } else if (theme === 'snow') {
      for (let x = 0; x <= W; x += 45) { g.lineTo(x + 22, H - 150 - (x % 90 ? 20 : 50)); g.lineTo(x + 45, H - 80); }
    } else {
      for (let x = 0; x <= W; x += 30) g.lineTo(x, H - 70 - Math.abs(Math.sin(x * 0.05) * 40 + Math.sin(x * 0.013) * 30));
    }
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    if (theme === 'snow') { // snow caps
      g.fillStyle = '#f6f9fc';
      for (let x = 0; x <= W; x += 45) { const py = H - 150 - (x % 90 ? 20 : 50); g.beginPath(); g.moveTo(x + 22, py); g.lineTo(x + 34, py + 22); g.lineTo(x + 10, py + 22); g.closePath(); g.fill(); }
    }
    // skyline
    g.fillStyle = T.skyline;
    const bl = [[0, 70, 30], [40, 40, 60], [90, 30, 120], [130, 60, 40], [200, 20, 150], [240, 60, 55], [320, 40, 90], [370, 30, 130], [420, 80, 45], [500, 40, 95]];
    if (theme !== 'desert' && theme !== 'snow') {
      bl.forEach(b => { g.fillRect(b[0], H - 30 - b[2], b[1], b[2] + 30); });
      g.fillStyle = T.night ? 'rgba(255,220,120,0.8)' : 'rgba(255,220,120,0.55)';
      bl.forEach(b => { for (let y = H - 22 - b[2]; y < H - 36; y += 12) for (let x = b[0] + 5; x < b[0] + b[1] - 4; x += 9) if (((x * 7 + y * 13) % 5) < 2) g.fillRect(x, y, 3, 4); });
      g.strokeStyle = T.skyline; g.lineWidth = 3; g.beginPath(); g.moveTo(455, H - 20); g.lineTo(455, H - 150); g.lineTo(530, H - 140); g.stroke();
    } else if (theme === 'desert') { // low town and a water tower
      [[30, 60, 22], [100, 40, 16], [380, 70, 24], [460, 50, 18]].forEach(b => g.fillRect(b[0], H - 30 - b[2], b[1], b[2] + 30));
      g.fillRect(300, H - 110, 4, 80); g.fillRect(330, H - 110, 4, 80); rr(g, 292, H - 140, 50, 34, 8); g.fill();
    } else { // snow: a cabin row
      [[40, 50, 24], [140, 40, 20], [400, 60, 26]].forEach(b => { g.fillRect(b[0], H - 30 - b[2], b[1], b[2] + 30); g.fillStyle = '#f6f9fc'; g.fillRect(b[0] - 3, H - 34 - b[2], b[1] + 6, 6); g.fillStyle = T.skyline; });
    }
    if (theme === 'toxic' || theme === 'city') {
      g.fillStyle = theme === 'toxic' ? 'rgba(160,255,80,0.55)' : 'rgba(120,200,120,0.5)';
      [[100, 110], [215, 140], [385, 120]].forEach(p => { circ(g, p[0], H - 30 - p[1] - 10, 12); g.fill(); circ(g, p[0] + 10, H - 30 - p[1] - 24, 10); g.fill(); });
    }
    // haze toward the road
    const hz = g.createLinearGradient(0, H - 50, 0, H); hz.addColorStop(0, 'rgba(' + T.haze + ',0)'); hz.addColorStop(1, 'rgba(' + T.haze + ',0.9)');
    g.fillStyle = hz; g.fillRect(0, H - 50, W, 50);
    return backdrop;
  };

  S.cacheSize = function () { return cache.size; };
  ZRS.sprites = S;
})();

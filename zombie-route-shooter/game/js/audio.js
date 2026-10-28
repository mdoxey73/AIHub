/* audio.js — WebAudio-synthesized sound effects. No files. The context is
   created on the first user gesture (required on iOS). */
(function () {
  const C = ZRS.CONFIG;
  const A = {};
  let ctx = null, master = null, noiseBuf = null, muted = false;
  let lastShot = 0, lastZombie = 0, lastBoss = 0, lastHit = 0;

  function now() { return ctx ? ctx.currentTime : 0; }

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.45; master.connect(ctx.destination);
      const len = ctx.sampleRate * 1.0;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
  };
  A.setMuted = function (m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.45; };
  A.isMuted = function () { return muted; };
  A.ready = function () { return !!ctx; };

  function tone(freq, type, dur, vol, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    const t0 = now() + (opts.delay || 0);
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.01, dur * 0.2));
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, filterFreq, type, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    const t0 = now() + (opts.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = opts.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = filterFreq;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(gn); gn.connect(master);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
  }

  A.shot = function (weapon) {
    if (!ctx) return;
    const t = now();
    if (t - lastShot < 1 / C.SFX_SHOT_PER_SEC) return;
    lastShot = t;
    switch (weapon) {
      case 'minigun': noise(0.05, 0.25, 1800, 'bandpass'); tone(140, 'square', 0.04, 0.08, { slideTo: 70 }); break;
      case 'shotgun': noise(0.16, 0.5, 900, 'lowpass'); tone(110, 'sawtooth', 0.12, 0.15, { slideTo: 40 }); break;
      case 'rpg': noise(0.25, 0.4, 500, 'lowpass'); tone(90, 'sawtooth', 0.3, 0.2, { slideTo: 35 }); break;
      case 'laser': tone(1600, 'sine', 0.06, 0.08, { slideTo: 900 }); break;
      default: noise(0.07, 0.3, 2500, 'highpass'); tone(200, 'square', 0.05, 0.1, { slideTo: 60 });
    }
  };
  A.gateUp = function () { [523, 659, 784, 1046].forEach((f, i) => tone(f, 'sine', 0.14, 0.25, { delay: i * 0.05 })); };
  A.gateDown = function () { tone(420, 'sawtooth', 0.25, 0.25, { slideTo: 110 }); noise(0.2, 0.15, 600, 'lowpass'); };
  A.barrel = function () { noise(0.1, 0.5, 1200, 'highpass'); tone(160, 'square', 0.08, 0.12, { slideTo: 60 }); };
  A.explosion = function () { noise(0.55, 0.8, 380, 'lowpass'); tone(70, 'sine', 0.45, 0.5, { slideTo: 25 }); };
  A.zombieDie = function () {
    if (!ctx) return; const t = now(); if (t - lastZombie < 0.12) return; lastZombie = t;
    tone(230, 'sawtooth', 0.13, 0.12, { slideTo: 80 }); noise(0.08, 0.15, 1500, 'bandpass');
  };
  A.bossHit = function () {
    if (!ctx) return; const t = now(); if (t - lastBoss < 0.1) return; lastBoss = t;
    tone(120, 'triangle', 0.08, 0.15, { slideTo: 80 });
  };
  A.bossDie = function () {
    tone(90, 'sawtooth', 0.8, 0.5, { slideTo: 25 }); noise(0.9, 0.8, 300, 'lowpass');
    [392, 523, 659, 784].forEach((f, i) => tone(f, 'square', 0.25, 0.2, { delay: 0.4 + i * 0.1 }));
  };
  A.pickup = function () { [660, 880, 1320].forEach((f, i) => tone(f, 'square', 0.12, 0.2, { delay: i * 0.07 })); };
  A.loss = function () {
    if (!ctx) return; const t = now(); if (t - lastHit < 0.08) return; lastHit = t;
    tone(170, 'square', 0.1, 0.18, { slideTo: 70 });
  };
  A.stomp = function () { tone(48, 'sine', 0.3, 0.6, { slideTo: 28 }); noise(0.2, 0.4, 250, 'lowpass'); };
  A.win = function () { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 'square', 0.22, 0.22, { delay: i * 0.12 })); };
  A.lose = function () { [440, 370, 311, 220].forEach((f, i) => tone(f, 'sawtooth', 0.35, 0.22, { delay: i * 0.25 })); };
  A.tap = function () { tone(880, 'sine', 0.06, 0.15); };

  ZRS.audio = A;
})();

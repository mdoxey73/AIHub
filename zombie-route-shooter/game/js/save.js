/* save.js — localStorage persistence (highest unlocked level, mute). */
(function () {
  const KEY = 'zrs.save.v1';
  const save = { data: { highestLevel: 1, muted: false } };
  save.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (d && typeof d === 'object') Object.assign(save.data, d); }
    } catch (e) { /* storage unavailable: play without persistence */ }
    return save.data;
  };
  save.write = function () {
    try { localStorage.setItem(KEY, JSON.stringify(save.data)); } catch (e) { /* ignore */ }
  };
  save.unlock = function (level) {
    if (level > save.data.highestLevel) { save.data.highestLevel = level; save.write(); }
  };
  save.setMuted = function (m) { save.data.muted = !!m; save.write(); };
  ZRS.save = save;
})();

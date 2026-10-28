/* sw.js — service worker: caches the whole game on first visit so it runs
   offline once added to the home screen. Bump VERSION whenever a file changes. */
const VERSION = 'zrs-v2';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/config.js', './js/render/camera.js', './js/render/sprites.js', './js/render/road.js',
  './js/audio.js', './js/fx.js', './js/entities/bullets.js', './js/entities/gates.js',
  './js/entities/barrels.js', './js/entities/zombies.js', './js/entities/boss.js', './js/entities/squad.js',
  './js/levels.js', './js/save.js', './js/input.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});

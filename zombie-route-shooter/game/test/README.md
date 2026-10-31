# Headless test scripts

Playwright drives Chromium. Run from this folder with Node. If Playwright's own browser is not installed, point `CHROME_PATH` at any Chrome or chrome-headless-shell binary (for example one fetched with `npx @puppeteer/browsers install chrome-headless-shell@131.0.6778.204`); the scripts pass it to `chromium.launch`.

- `node ai.js 3` — a lane-aware steering AI plays one level (rides the gate lane, crosses to the supply lane when a stand can be broken in time, steps around negative gates) and reports win/lose, peak squad, boss kill time, max zombies.
- `node dumb.js` — no-steering runs of levels 1, 3 and 6 (should lose).
- `node run.js` — full flow: title, drag, level 1 with the AI, win screen, next level, lose path, stress scene, frame timing, giant boss. Writes screenshots here.
- `node phone.js` — iPhone-sized viewport with touch drag; writes p1.png / p2.png.
- `node pwa.js` — serves the game on localhost, checks the service worker caches everything and the game plays offline.
- `node single.js` — smoke test of the single-file build in dist/.

Screenshots and other outputs land in this folder and are git-ignored.

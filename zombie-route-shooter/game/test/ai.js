// Steering-AI playthrough of one level: node ai.js <level>
const { chromium } = require('playwright');
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
const level = parseInt(process.argv[2] || '1', 10);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(GAME + '?level=' + level);
  await page.waitForTimeout(600);
  await page.mouse.click(270, 480);
  const t0 = Date.now();
  let result = null, peakN = 0, maxZb = 0, bossSeen = null, bossT0 = 0, bossTtk = null, minN = 1e9, nAtBoss = null, weapons = new Set();
  for (let i = 0; i < 1500; i++) {
    const r = await page.evaluate(() => {
      const Q = ZRS.squad, G = ZRS.gates.items, Ba = ZRS.barrels.items;
      let best = null;
      for (const gt of G) { if (!gt.a || gt.passed) continue; if (!best || gt.z < best.z) best = gt; }
      let target = Q.targetX;
      if (best) {
        const same = G.filter(g => g.a && !g.passed && Math.abs(g.z - best.z) < 0.5);
        const score = g => (g.op === 'x' ? Q.n * (g.value - 1) : g.op === '+' ? g.value : g.op === '-' ? -g.value : -Q.n / 2);
        same.sort((a, b) => score(b) - score(a));
        target = same[0].lane === 'L' ? -0.5 : same[0].lane === 'R' ? 0.5 : 0;
      }
      for (const b of Ba) { if (b.a && !b.broken && b.kind !== 'explosive' && b.z - Q.z < 30 && b.z - Q.z > 2 && (!best || b.z < best.z + 10)) target = b.x; }
      Q.targetX = target;
      return { state: ZRS.game.state, n: Q.n, z: Q.z, w: Q.weapon, rate: Q.rateMult, dmg: Q.dmgBonus, boss: ZRS.boss.active ? ZRS.boss.hp : -1, bossDead: ZRS.boss.dead, zb: ZRS.zombies.aliveCount(), fps: ZRS.game.fps };
    });
    peakN = Math.max(peakN, r.n); maxZb = Math.max(maxZb, r.zb); weapons.add(r.w);
    if (r.z > 40) minN = Math.min(minN, r.n);
    if (r.boss > 0 && bossSeen === null) { bossSeen = r.boss; bossT0 = Date.now(); nAtBoss = r.n; }
    if (bossSeen !== null && bossTtk === null && (r.bossDead || r.state === 'winning' || r.state === 'win')) bossTtk = (Date.now() - bossT0) / 1000;
    if (r.state === 'win' || r.state === 'lose') { result = r; break; }
    await page.waitForTimeout(100);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(JSON.stringify({ level, result: result ? result.state : 'timeout', secs, z: result ? Math.round(result.z) : null, peakN, minNAfter40m: minN === 1e9 ? null : minN, nAtBoss, bossHp: bossSeen, bossKillSecs: bossTtk, maxZombies: maxZb, weapons: [...weapons], rate: result && result.rate, dmg: result && result.dmg, errors: errors.length }));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

const { chromium } = require('playwright');
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  for (const level of [1, 3, 6]) {
    const ctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(GAME + '?level=' + level);
    await page.waitForTimeout(600);
    await page.mouse.click(270, 480);
    let maxZ = 0, result = null, peakN = 0;
    for (let i = 0; i < 1100; i++) {
      const r = await page.evaluate(() => ({ state: ZRS.game.state, n: ZRS.squad.n, z: Math.round(ZRS.squad.z), zb: ZRS.zombies.aliveCount(), boss: ZRS.boss.active ? Math.round(ZRS.boss.hp) : -1 }));
      maxZ = Math.max(maxZ, r.zb); peakN = Math.max(peakN, r.n);
      if (r.state === 'win' || r.state === 'lose') { result = r; break; }
      await page.waitForTimeout(100);
    }
    console.log('no-steer level', level, '->', result ? result.state : 'timeout', 'z=' + (result ? result.z : '?'), 'peakN=' + peakN, 'maxZombies=' + maxZ, 'errors=' + errors.length);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

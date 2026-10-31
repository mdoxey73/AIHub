const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'dist', 'zombie-route-shooter.html'));
  await page.waitForTimeout(800);
  await page.touchscreen.tap(195, 420);
  await page.waitForTimeout(4000);
  console.log('single-file:', await page.evaluate(() => JSON.stringify({ state: ZRS.game.state, n: ZRS.squad.n, z: Math.round(ZRS.squad.z), fps: ZRS.game.fps, sw: !!navigator.serviceWorker })));
  await page.screenshot({ path: __dirname + '/single.png' });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

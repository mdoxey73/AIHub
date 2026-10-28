const { chromium } = require('playwright');
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  // iPhone-sized viewport, touch, DPR 2
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(GAME + '?level=2');
  await page.waitForTimeout(800);
  const dims = await page.evaluate(() => { const c = document.getElementById('game'); return { cssW: c.style.width, cssH: c.style.height, w: c.width, h: c.height, dpr: devicePixelRatio }; });
  console.log('canvas:', JSON.stringify(dims));
  await page.touchscreen.tap(195, 420);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: __dirname + '/p1.png' });
  // touch drag
  const x0 = await page.evaluate(() => ZRS.squad.targetX);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600 }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195 + i * 12, y: 600 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  const x1 = await page.evaluate(() => ZRS.squad.targetX);
  console.log('touch drag targetX', x0.toFixed(3), '->', x1.toFixed(3));
  await page.waitForTimeout(5000);
  await page.screenshot({ path: __dirname + '/p2.png' });
  console.log('state', await page.evaluate(() => ZRS.game.state + ' N=' + ZRS.squad.n + ' z=' + ZRS.squad.z.toFixed(0)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

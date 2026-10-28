const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8791', '--bind', '127.0.0.1'], { cwd: require('path').resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8791/');
  await page.waitForTimeout(2500);
  const reg = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); const keys = await caches.keys(); const c = keys.length ? await caches.open(keys[0]) : null; const n = c ? (await c.keys()).length : 0; return { registered: !!r, scope: r && r.scope, caches: keys, cached: n }; });
  console.log('sw:', JSON.stringify(reg));
  const manifest = await page.evaluate(async () => { const r = await fetch('manifest.webmanifest'); const j = await r.json(); return { name: j.name, display: j.display, icons: j.icons.length }; });
  console.log('manifest:', JSON.stringify(manifest));
  // go offline and reload: the game must still load from the cache
  await page.reload(); await page.waitForTimeout(1000);
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(1500);
  const off = await page.evaluate(() => ({ state: ZRS.game.state, controlled: !!navigator.serviceWorker.controller, title: document.title }));
  console.log('offline reload:', JSON.stringify(off));
  await page.touchscreen.tap(195, 420); await page.waitForTimeout(2500);
  console.log('offline play:', await page.evaluate(() => ZRS.game.state + ' N=' + ZRS.squad.n + ' z=' + Math.round(ZRS.squad.z)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close(); srv.kill();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

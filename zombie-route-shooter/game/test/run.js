const { chromium } = require('playwright');
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = __dirname;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto(GAME + '?debug=1&level=1');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 's0_title.png') });
  const st0 = await page.evaluate(() => ZRS.game.state);
  console.log('title state:', st0);
  // tap to start
  await page.mouse.click(270, 480);
  await page.waitForTimeout(300);
  console.log('after tap state:', await page.evaluate(() => ZRS.game.state));
  // drag right
  const x0 = await page.evaluate(() => ZRS.squad.targetX);
  await page.mouse.move(270, 700); await page.mouse.down(); await page.mouse.move(370, 700, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(200);
  const x1 = await page.evaluate(() => ZRS.squad.targetX);
  console.log('drag targetX', x0.toFixed(3), '->', x1.toFixed(3));
  // AI steering loop for level 1
  const t0 = Date.now();
  let log = [];
  for (let i = 0; i < 900; i++) {
    const r = await page.evaluate(() => {
      const Q = ZRS.squad, G = ZRS.gates.items, Bz = ZRS.zombies.items, Ba = ZRS.barrels.items;
      // find nearest gate(s) ahead
      let best = null;
      for (const gt of G) { if (!gt.a || gt.passed) continue; if (!best || gt.z < best.z) best = gt; }
      let target = Q.targetX;
      if (best) {
        const same = G.filter(g => g.a && !g.passed && Math.abs(g.z - best.z) < 0.5);
        const score = g => (g.op === 'x' ? Q.n * (g.value - 1) : g.op === '+' ? g.value : g.op === '-' ? -g.value : -Q.n / 2);
        same.sort((a, b) => score(b) - score(a));
        const pick = same[0];
        target = pick.lane === 'L' ? -0.5 : pick.lane === 'R' ? 0.5 : 0;
        // prefer a weapon barrel lane if it is close and unbroken
        for (const b of Ba) { if (b.a && !b.broken && b.kind !== 'explosive' && b.z - Q.z < 30 && b.z - Q.z > 2 && b.z < best.z + 10) target = b.x; }
      }
      Q.targetX = target;
      return { state: ZRS.game.state, n: Q.n, z: Q.z, w: Q.weapon, boss: ZRS.boss.active ? ZRS.boss.hp : -1, fps: ZRS.game.fps, zb: ZRS.zombies.aliveCount(), bu: ZRS.bullets.count() };
    });
    if (i % 25 === 0) log.push(JSON.stringify(r));
    if (i === 40) await page.screenshot({ path: path.join(OUT, 's1_early.png') });
    if (i === 160) await page.screenshot({ path: path.join(OUT, 's2_mid.png') });
    if (r.boss > 0 && !log.bossShot) { log.bossShot = true; await page.waitForTimeout(800); await page.screenshot({ path: path.join(OUT, 's3_boss.png') }); }
    if (r.state === 'win' || r.state === 'lose') { await page.screenshot({ path: path.join(OUT, 's4_end.png') }); console.log('END', r.state, 'after', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(r)); break; }
    await page.waitForTimeout(100);
  }
  console.log(log.join('\n'));
  // win path -> next level via tap
  let st = await page.evaluate(() => ZRS.game.state);
  if (st === 'win') {
    await page.mouse.click(270, 480); await page.waitForTimeout(300);
    console.log('after win tap:', await page.evaluate(() => ZRS.game.state + ' level ' + ZRS.game.level + ' saved ' + localStorage.getItem('zrs.save.v1')));
  }
  // lose path
  await page.evaluate(() => { ZRS.game.start(3); ZRS.squad.setN(0, true); });
  await page.waitForTimeout(1600);
  console.log('lose path state:', await page.evaluate(() => ZRS.game.state));
  await page.screenshot({ path: path.join(OUT, 's5_lose.png') });
  await page.mouse.click(270, 480); await page.waitForTimeout(300);
  console.log('after lose tap:', await page.evaluate(() => ZRS.game.state + ' level ' + ZRS.game.level));
  // stress: level 12 with max squad, hordes
  await page.evaluate(() => { ZRS.game.start(12); ZRS.squad.setN(999, false); ZRS.squad.grant('minigun'); ZRS.squad.grant('drone'); for (let k = 0; k < 5; k++) ZRS.zombies.spawnHorde(ZRS.squad.z + 20 + k * 12, 30, 14); });
  await page.waitForTimeout(2500);
  const stress = await page.evaluate(() => ({ fps: ZRS.game.fps, zb: ZRS.zombies.aliveCount(), bu: ZRS.bullets.count(), cache: ZRS.sprites.cacheSize(), n: ZRS.squad.n }));
  console.log('stress:', JSON.stringify(stress));
  await page.screenshot({ path: path.join(OUT, 's6_stress.png') });
  // frame time measurement
  const ft = await page.evaluate(() => new Promise(res => { const t = []; let last = performance.now(); let n = 0; function f(now) { t.push(now - last); last = now; if (++n < 120) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ median: t[60].toFixed(1), p95: t[114].toFixed(1), max: t[119].toFixed(1) }); } } requestAnimationFrame(f); }));
  console.log('frame ms:', JSON.stringify(ft));
  // giant boss level 5 quick check
  await page.evaluate(() => { ZRS.game.start(5); ZRS.squad.z = ZRS.levels.get(5).len - 80; ZRS.squad.setN(60, false); ZRS.squad.grant('rpg'); });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 's7_giant.png') });
  console.log('giant:', await page.evaluate(() => JSON.stringify({ active: ZRS.boss.active, giant: ZRS.boss.giant, hp: ZRS.boss.hp, burn: ZRS.boss.burnT.toFixed(1), state: ZRS.game.state })));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

// Automated playtest: builds nothing, expects `npm run dev` or a preview server URL in $URL (default http://localhost:5173).
// START_LEVEL=n begins at level n. Loads the game on a phone-sized viewport, taps Play, holds and drags, and saves screenshots to playtest-output/.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5173';
const out = 'playtest-output';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url);
await page.evaluate(start => {
  localStorage.clear();
  if (start) {
    // later levels expect upgrades bought with gold: give roughly what a player would have by then
    const k = Math.sqrt(Number(start) - 1);
    localStorage.setItem('boonty-blaster-level', start);
    localStorage.setItem('boonty-blaster-gold', '0');
    localStorage.setItem('boonty-blaster-upgrades', JSON.stringify({ rate: Math.round(2 * k), power: Math.round(1.5 * k), charge: 0, hearts: 0 }));
  }
}, process.env.START_LEVEL ?? null);
await page.reload();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/1-title.png` });
await page.click('#play', { force: true });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/2-hint.png` });

// Play level 1: hold, sweep toward threats like the balance bot would.
await page.mouse.move(195, 700);
await page.mouse.down();
const t0 = Date.now();
let shot = 3;
while (Date.now() - t0 < 90000) {
  const s = await page.evaluate(() => {
    const st = window.__boonty();
    const threat = st.grumps.reduce((a, e) => (e.y > 480 && (!a || e.y > a.y) ? e : a), null);
    const gate = st.gates.filter(g => !g.mega).reduce((a, g) => (g.mul > a.mul ? g : a));
    return { phase: st.phase, aimX: threat ? threat.x : gate.x + gate.w / 2, minis: st.minis.length, hp: st.castle.hp };
  });
  if (s.phase !== 'playing') break;
  // world 540 wide → 390 css px, letterboxed vertically
  await page.mouse.move(s.aimX * (390 / 540), 700, { steps: 3 });
  if (Date.now() - t0 > shot * 3000 - 6000 && shot <= 4) await page.screenshot({ path: `${out}/${shot++}-play.png` });
  await page.waitForTimeout(100);
}
await page.mouse.up();
await page.waitForTimeout(1600);
const phase = await page.evaluate(() => window.__boonty().phase);
await page.screenshot({ path: `${out}/5-end.png` });
const winVisible = await page.isVisible('#win');
console.log(JSON.stringify({ phase, winVisible, seconds: Math.round((Date.now() - t0) / 1000), errors }));

if (winVisible) {
  await page.click('#next', { force: true });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/6-level2.png` });
  console.log('level after next:', await page.evaluate(() => window.__boonty().level));
}
await browser.close();
if (errors.length || phase !== 'won') process.exit(1);

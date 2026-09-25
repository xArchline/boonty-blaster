import { audio } from './audio';
import { biomeFor } from './biomes';
import { Renderer, SUPER_BTN } from './render';
import { createState, HEROES, step, triggerSuper, type Hero, type State } from './sim';
import { fmt, goldReward, NO_UPGRADES, UPGRADES, type UpgradeId, type Upgrades } from './upgrades';

const KEY = { level: 'boonty-blaster-level', best: 'boonty-blaster-best', hero: 'boonty-blaster-hero', gold: 'boonty-blaster-gold', up: 'boonty-blaster-upgrades' };
const STEP = 1 / 120;
const HERO_ORDER: Hero[] = ['knight', 'party', 'crown', 'cool'];

const $ = (id: string) => document.getElementById(id)!;
const canvas = $('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);

function load(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function save(key: string, value: string | number) {
  try { localStorage.setItem(key, String(value)); } catch { /* storage blocked: progress just isn't kept */ }
}

let level = Math.max(1, parseInt(load(KEY.level, '1'), 10) || 1);
let best = Math.max(level, parseInt(load(KEY.best, '1'), 10) || 1); // highest level reached: unlocks heroes
let hero = (HERO_ORDER.includes(load(KEY.hero, 'knight') as Hero) ? load(KEY.hero, 'knight') : 'knight') as Hero;
if (HEROES[hero].unlock > best) hero = 'knight';

let gold = Math.max(0, parseInt(load(KEY.gold, '0'), 10) || 0);
const up: Upgrades = { ...NO_UPGRADES };
try {
  const saved = JSON.parse(load(KEY.up, '{}')) as Record<string, unknown>;
  // never trust storage: whole numbers in a sane range only
  for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
    const v = Math.floor(Number(saved[id]));
    up[id] = Number.isFinite(v) ? Math.max(0, Math.min(1000, v)) : 0;
  }
} catch { /* keep defaults */ }
if (load(KEY.gold, '') === '' && load(KEY.up, '') === '' && best > 1) {
  // save from before the shop existed: grant the gold those levels would have paid
  for (let i = 1; i < best; i++) gold += Math.round(0.8 * goldReward(i, true, 1, i % 5 === 0));
  save(KEY.gold, gold);
}
save(KEY.gold, gold);
save(KEY.up, JSON.stringify(up));
let lastBought: UpgradeId | null = null;

let state: State = createState(level, hero, undefined, up);
let running = false; // false while a menu is up
let paused = false; // a level is in progress but frozen behind the pause menu
let endTimer = 0;
let touched = false;
let activePointer: number | null = null;
let shownAt = 0;

type Screen = 'title' | 'win' | 'lose' | 'pause' | 'settings';
/** Menus take the colours of the current land instead of a fixed purple. */
function tintMenus(n: number) {
  const b = biomeFor(n);
  const root = document.documentElement.style;
  root.setProperty('--menu-top', b.ui.top);
  root.setProperty('--menu-bottom', b.ui.bottom);
  root.setProperty('--menu-accent', b.ui.accent);
}

function show(id: Screen | null) {
  tintMenus(level);
  for (const s of ['title', 'win', 'lose', 'pause', 'settings']) $(s).hidden = s !== id;
  $('mute').hidden = id === null || id === 'settings';
  $('settings-btn').hidden = id !== 'title';
  $('pause-btn').hidden = id !== null;
  shownAt = performance.now();
  countToken++; // stop any gold count-up still running on the previous screen
  if (id === 'title') renderTitle();
  if (id) renderShops();
}

// The upgrade shop sits on every menu screen: spend gold between tries.
function renderShops() {
  for (const el of document.querySelectorAll<HTMLElement>('.shop')) {
    const cards = (Object.keys(UPGRADES) as UpgradeId[]).map(id => {
      const u = UPGRADES[id], k = up[id], maxed = u.maxed(k), cost = u.cost(k);
      const cls = ['upgrade', !maxed && gold >= cost ? 'affordable' : '', lastBought === id ? 'bought' : ''].join(' ');
      return `<button type="button" class="${cls}" data-up="${id}" ${maxed || gold < cost ? 'disabled' : ''}>
        <b>${u.name}</b>
        <span class="fx">${maxed ? u.effect(k) : `${u.effect(k)} → ${u.effect(k + 1)}`}</span>
        <span class="row"><span class="cost">${maxed ? 'MAX' : `<span class="coin"></span>${fmt(cost)}`}</span><span class="lv">Lv ${k}</span></span></button>`;
    }).join('');
    el.innerHTML = `<div class="gold-line"><span class="coin"></span><span class="gold-val">${fmt(gold)}</span> gold</div><div class="cards">${cards}</div>`;
  }
  lastBought = null;
}
document.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-up]');
  if (!b || b.disabled) return;
  const id = b.dataset.up as UpgradeId, cost = UPGRADES[id].cost(up[id]);
  if (gold < cost || UPGRADES[id].maxed(up[id])) return;
  gold -= cost;
  up[id]++;
  save(KEY.gold, gold);
  save(KEY.up, JSON.stringify(up));
  audio.play('gate', { pitch: 1.4 });
  lastBought = id;
  renderShops();
});
// Taps still landing from gameplay must not skip the result screen.
const guarded = (fn: () => void) => () => { if (performance.now() - shownAt > 600) fn(); };

// Gold count-up on the result screens: 0 -> earned, and the balance from its old value -> new.
let countToken = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function countUp(el: Element | null, from: number, to: number, text: (n: number) => string, onDone?: () => void) {
  if (!el) return;
  const token = countToken, t0 = performance.now() + 250, ms = 1000; // start once the screen has popped in
  const tick = (now: number) => {
    if (token !== countToken) return;
    const k = Math.max(0, Math.min(1, (now - t0) / ms));
    el.textContent = text(from + (to - from) * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(tick);
    else onDone?.();
  };
  if (reducedMotion.matches) { el.textContent = text(to); return; }
  el.textContent = text(from);
  requestAnimationFrame(tick);
}
function showGold(screen: 'win' | 'lose', earned: number) {
  const box = $(`${screen}-gold`);
  box.classList.remove('pop');
  countUp(box.querySelector('.amount'), 0, earned, n => '+' + fmt(Math.round(n)), () => {
    box.classList.add('pop');
    if (screen === 'win') audio.play('gate', { pitch: 1.8 });
  });
  countUp($(screen).querySelector('.gold-val'), gold - earned, gold, n => fmt(Math.round(n)));
}

function renderTitle() {
  const list = $('heroes');
  list.innerHTML = '';
  for (const h of HERO_ORDER) {
    const info = HEROES[h];
    const locked = info.unlock > best;
    const b = document.createElement('button');
    b.className = 'hero-pick' + (h === hero ? ' selected' : '') + (locked ? ' locked' : '');
    b.type = 'button';
    b.innerHTML = `<img src="assets/boonty-${h}.webp" alt=""><span>${locked ? `Level ${info.unlock}` : info.name}</span>`;
    b.addEventListener('click', () => {
      audio.play('click');
      if (locked) return;
      hero = h;
      save(KEY.hero, h);
      renderTitle();
    });
    list.appendChild(b);
  }
  $('hero-power').textContent = HEROES[hero].power;
  $('play').textContent = level > 1 ? `CONTINUE · LEVEL ${level}` : 'PLAY';
  $('new-game').hidden = level === 1;
}

function start(n: number) {
  level = n;
  save(KEY.level, n);
  state = createState(n, hero, undefined, up);
  activePointer = null;
  renderer.parts = [];
  renderer.banner = null;
  renderer.slow = 0;
  renderer.showHint = n === 1 && !touched;
  const newLand = n > 1 && biomeFor(n).id !== biomeFor(n - 1).id;
  if (newLand) { renderer.say(biomeFor(n).name.toUpperCase(), state.def.intro ?? 'A new land to conquer!', '#3817AF'); audio.play('newTwist'); }
  else if (state.def.intro) { renderer.say(state.def.boss ? 'BOSS!' : 'NEW!', state.def.intro, '#FF4A18'); audio.play('newTwist'); }
  audio.startMusic(0);
  running = true;
  paused = false;
  endTimer = 0;
  acc = 0;
  show(null);
}

// Pause: freeze the sim, drop the finger, show the pause menu. Also when the tab is hidden.
function pause() {
  if (!running || paused || state.phase !== 'playing') return;
  paused = true;
  state.firing = false;
  if (activePointer !== null && canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer);
  activePointer = null;
  audio.stopMusic();
  show('pause');
}
function resume() {
  if (!paused) return;
  paused = false;
  last = performance.now(); // no time jump after the break
  acc = 0;
  audio.startMusic();
  show(null);
}
function toMenu() {
  running = false;
  paused = false;
  audio.menuMusic();
  show('title');
}
$('pause-btn').addEventListener('click', () => { audio.play('click'); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
$('resume').addEventListener('click', guarded(resume));
$('restart-level').addEventListener('click', guarded(() => start(level)));
$('menu-pause').addEventListener('click', guarded(toMenu));

// Settings: sound + a full progress reset (two taps, since confirm() isn't allowed).
let resetArmed = 0;
function disarmReset() {
  clearTimeout(resetArmed);
  resetArmed = 0;
  $('reset').textContent = 'RESET ALL PROGRESS';
  $('reset').classList.remove('armed');
}
$('settings-btn').addEventListener('click', () => { audio.play('click'); disarmReset(); $('reset-done').hidden = true; show('settings'); });
$('settings-back').addEventListener('click', guarded(() => { disarmReset(); show('title'); }));
$('mute-2').addEventListener('click', () => { audio.toggleMute(); syncMute(); });
$('reset').addEventListener('click', guarded(() => {
  if (!resetArmed) {
    $('reset').textContent = 'TAP AGAIN TO CONFIRM';
    $('reset').classList.add('armed');
    resetArmed = setTimeout(disarmReset, 3000);
    return;
  }
  disarmReset();
  level = 1; best = 1; gold = 0; hero = 'knight';
  Object.assign(up, NO_UPGRADES);
  // write every key (gold/upgrades included) so the old-save gold grant never fires again
  save(KEY.level, 1); save(KEY.best, 1); save(KEY.hero, hero); save(KEY.gold, 0); save(KEY.up, JSON.stringify(up));
  state = createState(1, hero, undefined, up);
  $('reset-done').hidden = false;
}));

// Browsers only allow sound after a user gesture.
document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
function syncMute() { $('mute').textContent = $('mute-2').textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON'; }
$('mute').addEventListener('click', () => { audio.toggleMute(); syncMute(); });
syncMute();
for (const id of ['play', 'next', 'retry', 'new-game', 'restart', 'menu-win', 'menu-lose', 'resume', 'restart-level', 'menu-pause', 'settings-back', 'reset', 'mute-2']) $(id).addEventListener('pointerdown', () => audio.play('click'));
audio.menuMusic();

$('play').addEventListener('click', guarded(() => start(level)));
$('new-game').addEventListener('click', guarded(() => start(1)));
$('next').addEventListener('click', guarded(() => start(level)));
$('retry').addEventListener('click', guarded(() => start(level)));
$('restart').addEventListener('click', guarded(() => start(1)));
for (const id of ['menu-win', 'menu-lose']) $(id).addEventListener('click', guarded(() => show('title')));
show('title');

// Input: anywhere on screen. Finger down = fire, x = aim. The SUPER button works with any finger.
function aim(e: PointerEvent) {
  state.targetX = Math.max(20, Math.min(520, renderer.toWorld(e.clientX, e.clientY).x));
}
function onSuperButton(e: PointerEvent) {
  const p = renderer.toWorld(e.clientX, e.clientY);
  return (p.x - SUPER_BTN.x) ** 2 + (p.y - SUPER_BTN.y) ** 2 < (SUPER_BTN.r + 12) ** 2;
}
canvas.addEventListener('pointerdown', e => {
  if (!running || state.phase !== 'playing') return;
  if (onSuperButton(e)) { triggerSuper(state); return; }
  if (activePointer !== null) return;
  activePointer = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  touched = true;
  renderer.showHint = false;
  state.firing = true;
  aim(e);
});
canvas.addEventListener('pointermove', e => { if (e.pointerId === activePointer && state.firing) aim(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
  canvas.addEventListener(ev, e => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    state.firing = false;
  });
}
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && running && !paused) triggerSuper(state);
  if (e.code === 'Escape' || e.code === 'KeyP') { if (paused) resume(); else pause(); }
});

// Keep the pause button pinned to the top centre of the (letterboxed) world, clear of the HUD.
function resize() {
  renderer.resize();
  document.documentElement.style.setProperty('--world-top', `${renderer.oy}px`);
  document.documentElement.style.setProperty('--world-scale', String(renderer.scale));
}
window.addEventListener('resize', resize);
resize();

function playSounds(s: State) {
  if (s.firing) audio.play('fire');
  const hurt = s.king ? 1 - s.king.hp / s.king.maxHp : 1 - s.castle.hp / s.castle.maxHp;
  for (const e of s.events) {
    switch (e.type) {
      case 'pop': case 'rollerHit': audio.play('pop'); break;
      case 'bigPop': case 'blast': audio.play('bigPop'); break;
      case 'trap': audio.play('heart', { pitch: 1.8 }); break;
      case 'gate': audio.play('gate', { pitch: e.value === 3 ? 1.25 : 1 }); break;
      case 'castleHit': audio.play('castleHit', { pitch: 1 + hurt * 0.6 }); break;
      case 'shieldHit': audio.play('castleHit', { pitch: 2.2 }); break;
      case 'shield': audio.play('heart', { pitch: 0.7 }); break;
      case 'heart': audio.play('heart'); break;
      case 'superReady': audio.play('gate', { pitch: 1.6 }); break;
      case 'rush': case 'boss': case 'enrage': case 'super': case 'finale': audio.play('newTwist'); break;
      case 'gateUp': audio.play('gate', { pitch: 1 + (e.value ?? 2) * 0.12 }); break;
      case 'mega': audio.play('gate', { pitch: 0.7 }); break;
      case 'wallBreak': case 'split': audio.play('bigPop'); break;
      case 'wallHit': case 'lockHit': audio.play('castleHit', { pitch: 0.6 }); break;
      case 'unlock': audio.play('newTwist'); audio.play('bigPop'); break;
      case 'teleport': audio.play('gate', { pitch: 0.6 }); break;
      case 'dash': audio.play('heart', { pitch: 0.8 }); break;
      case 'wallChew': audio.play('pop', { pitch: 0.5 }); break;
      case 'bump': audio.play('click'); break;
      case 'bossDown': audio.play('bigPop'); audio.play('newTwist'); break;
      case 'won': audio.stopMusic(); audio.play('win'); break;
      case 'lost': audio.stopMusic(); audio.play('lose'); break;
    }
  }
  // the music builds as the target weakens and as levels get harder
  if (s.phase === 'playing') audio.setIntensity(Math.min(1, hurt * 0.75 + Math.min(1, s.level / 12) * 0.35 + (s.def.boss ? 0.3 : 0)));
}

function finish() {
  running = false;
  const menuMusicSoon = () => setTimeout(() => { if (!running) audio.menuMusic(); }, 1200);
  const target = state.king ?? state.castle;
  const progress = 1 - Math.max(0, target.hp) / target.maxHp;
  const earned = goldReward(level, state.phase === 'won', progress, state.def.boss);
  gold += earned;
  save(KEY.gold, gold);
  if (state.phase === 'won') {
    const unlockedBefore = HERO_ORDER.filter(h => HEROES[h].unlock <= best);
    best = Math.max(best, level + 1);
    save(KEY.best, best);
    save(KEY.level, level + 1);
    const fresh = HERO_ORDER.find(h => HEROES[h].unlock <= best && !unlockedBefore.includes(h));
    $('win-title').textContent = state.def.boss ? 'King Grump defeated!' : `Level ${level} cleared!`;
    level++; // "Next" and "Continue" both go on from here
    $('win-sub').textContent = fresh
      ? `NEW HERO UNLOCKED: ${HEROES[fresh].name}! Pick them in the menu.`
      : state.def.boss ? `Boss beaten in ${Math.round(state.time)}s.` : `Castle flattened in ${Math.round(state.time)}s.`;
    $('win-sub').classList.toggle('unlock', !!fresh);
    ($('win-img') as HTMLImageElement).src = `assets/boonty-${fresh ?? 'party'}.webp`;
    show('win');
    showGold('win', earned);
  } else {
    const pct = Math.max(1, Math.round((target.hp / target.maxHp) * 100));
    $('lose-sub').textContent = state.def.boss
      ? `King Grump had ${pct}% left. Upgrade, then hit him when his shield drops!`
      : pct <= 50 ? `The castle only had ${pct}% left. One more try!` : 'Tip: drag to shoot the Grumps before they cross the line.';
    $('retry').textContent = `TRY AGAIN · LEVEL ${level}`;
    $('restart').hidden = level === 1;
    show('lose');
    showGold('lose', earned);
  }
  menuMusicSoon();
}

let last = performance.now();
let acc = 0;
function frame(now: number) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // slow motion after a big moment (King down)
  if (paused) dt = 0; // frozen behind the pause menu
  if (renderer.slow > 0) { renderer.slow -= dt; dt *= 0.3; }
  if (running && !paused) {
    acc += dt;
    while (acc >= STEP) { step(state, STEP); acc -= STEP; }
    if (state.phase !== 'playing') {
      endTimer += dt;
      if (endTimer > 1.1 && renderer.slow <= 0) finish();
    }
  }
  playSounds(state);
  renderer.consume(state);
  renderer.draw(state, dt);
  requestAnimationFrame(frame);
}

document.fonts.load('900 20px Delight').finally(() => requestAnimationFrame(frame));

// Read-only hook for the automated playtest script.
(window as unknown as { __boonty: () => State }).__boonty = () => state;

// Offline play once installed (production builds only; the service worker lives in public/sw.js)
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

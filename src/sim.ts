import { levelDef, type LevelDef } from './levels';
import { chargeMul, damage, expectedUpgrades, fireInterval, type Upgrades } from './upgrades';

// Pure game logic. No DOM here, so tests and the balance bot can run it headless.
export const W = 540;
export const H = 960;
export const CANNON_Y = 850;
export const DANGER_Y = 800;
export const MINI_R = 13;
export const MINI_SPEED = 520;
export const MAX_MINIS = 350;
const HOMING_Y = 330; // above this line minis curve toward the castle (not in boss duels)

export type Hero = 'knight' | 'party' | 'crown' | 'cool';
export interface Mini { x: number; y: number; vx: number; mask: number; alive: boolean; power: number; pierce?: number; hits?: Grump[] }
export type GrumpKind = 'grump' | 'big' | 'zippy' | 'king' | 'splitter' | 'shield' | 'thief' | 'healer';
export interface Grump { x: number; y: number; laneX: number; r: number; hp: number; maxHp: number; speed: number; kind: GrumpKind; alive: boolean; hitT: number; armor?: number; maxArmor?: number; target?: Gate; healCd?: number; carry?: Gate; guard?: Grump }
export interface Gate { x: number; y: number; w: number; h: number; mul: number; speed: number; minX: number; maxX: number; dir: number; flash: number; count: number; grow: boolean; mega: boolean; lockHp: number; lockMax: number; blocked?: boolean; carriers?: number }
export interface Wall { x: number; y: number; w: number; h: number; hp: number; maxHp: number; flash: number }
export interface Bumper { x: number; y: number; r: number; flash: number }
export interface Castle { x: number; y: number; w: number; h: number; hp: number; maxHp: number; flash: number }
export interface Roller { x: number; y: number; r: number; hit: Grump[] }
export interface Balloon { x: number; y: number; sx: number; sy: number; tx: number; ty: number; t: number }
export interface BossAI { shieldT: number; shieldCd: number; moveCd: number; enraged: boolean; t: number; tele: number; targetX: number }

export type Phase = 'playing' | 'won' | 'lost';
export type GameEvent = {
  type: 'pop' | 'bigPop' | 'gate' | 'trap' | 'castleHit' | 'heart' | 'rush' | 'boss' | 'bossDown' | 'won' | 'lost'
    | 'super' | 'superReady' | 'blast' | 'shield' | 'shieldHit' | 'enrage' | 'rollerHit'
    | 'gateUp' | 'mega' | 'wallHit' | 'wallBreak' | 'bump' | 'split' | 'finale' | 'lockHit' | 'unlock' | 'wallChew'
    | 'thaw' | 'armorHit' | 'armorBreak' | 'steal' | 'heal' | 'carrier' | 'capture' | 'gateLost' | 'teleport' | 'dash';
  x: number; y: number; value?: number;
};

export interface State {
  level: number;
  def: LevelDef;
  hero: Hero;
  fireInterval: number;
  damage: number;
  chargeMul: number;
  maxHearts: number;
  phase: Phase;
  time: number;
  cannonX: number;
  targetX: number;
  firing: boolean;
  fireCd: number;
  minis: Mini[];
  grumps: Grump[];
  gates: Gate[];
  walls: Wall[];
  bumpers: Bumper[];
  finaleDone: boolean;
  castle: Castle;
  hearts: number;
  spawnCd: number;
  groups: number;
  rushCd: number;
  carrierCd: number;
  charge: number; // super meter 0..1
  goldT: number; // King Boonty's golden rush time left
  freezeT: number; // Cool Boonty's freeze time left
  rollers: Roller[];
  balloons: Balloon[];
  king: Grump | null; // the boss in a duel level
  boss: BossAI;
  events: GameEvent[];
  rand: () => number;
}

export const HEROES: Record<Hero, { name: string; power: string; unlock: number }> = {
  knight: { name: 'Sir Boonty', power: 'SUPER: a giant knight charges up the field', unlock: 1 },
  party: { name: 'Party Boonty', power: 'SUPER: balloon bombs blast the closest Grumps', unlock: 4 },
  crown: { name: 'King Boonty', power: 'SUPER: 6 s of golden double-power rapid fire', unlock: 8 },
  cool: { name: 'Cool Boonty', power: 'SUPER: freeze every Grump for 4 s. Frozen ones take double damage', unlock: 13 },
};

export function createState(level: number, hero: Hero = 'knight', seed = level * 7919, up: Upgrades = expectedUpgrades(level)): State {
  const def = levelDef(level, up);
  let s = seed % 2147483647 || 1;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const st: State = {
    level, def, hero, phase: 'playing', time: 0,
    fireInterval: fireInterval(up.rate), damage: damage(up.power), chargeMul: chargeMul(up.charge), maxHearts: def.hearts + up.hearts,
    cannonX: W / 2, targetX: W / 2, firing: false, fireCd: 0,
    minis: [], grumps: [],
    gates: def.gates.map(g => ({
      x: g.x, y: g.y, w: g.w, h: 42, mul: g.mul, speed: g.speed ?? 0,
      minX: g.x, maxX: g.x + (g.range ?? 0), dir: 1, flash: 0, count: 0, grow: !!g.grow, mega: !!g.mega, lockHp: g.lock ?? 0, lockMax: g.lock ?? 0,
    })),
    walls: [
      ...(def.walls ?? []).map(w => ({ ...w, hp: w.hp, maxHp: w.hp, flash: 0 })),
      // Twin Lanes divider: unbreakable, stops minis only (Grumps keep to their side anyway)
      ...(def.twin ? [{ x: W / 2 - 9, y: 340, w: 18, h: DANGER_Y - 340, hp: Infinity, maxHp: Infinity, flash: 0 }] : []),
    ],
    bumpers: (def.bumpers ?? []).map(b => ({ ...b, flash: 0 })),
    finaleDone: false,
    castle: { x: W / 2, y: 84, w: 230, h: 130, hp: def.castleHp, maxHp: def.castleHp, flash: 0 },
    hearts: def.hearts + up.hearts,
    spawnCd: 1.5, groups: 0, rushCd: def.rushEvery * 0.7, carrierCd: (def.carrierEvery ?? 0) * 0.5,
    charge: 0, goldT: 0, freezeT: 0, rollers: [], balloons: [],
    king: null, boss: { shieldT: 0, shieldCd: def.bossShieldEvery, moveCd: 1.5, enraged: false, t: 0, tele: 0, targetX: W / 2 },
    events: [], rand,
  };
  if (def.boss) {
    spawn(st, 'king', W / 2);
    st.king = st.grumps[0];
    st.events.push({ type: 'boss', x: W / 2, y: st.castle.y + st.castle.h });
  }
  return st;
}

const KIND = {
  grump: { r: 14, speed: 1 },
  zippy: { r: 11, speed: 1.75 },
  big: { r: 26, speed: 0.6 },
  king: { r: 50, speed: 0 }, // the King's pace comes from the level (bossSpeed)
  splitter: { r: 21, speed: 0.75 },
  shield: { r: 16, speed: 0.85 },
  thief: { r: 15, speed: 1.1 },
  healer: { r: 16, speed: 0.9 },
};

function spawn(s: State, kind: GrumpKind, laneX: number, dy = 0) {
  const k = KIND[kind];
  const hp = kind === 'big' ? s.def.bigHp : kind === 'king' ? s.def.bossHp
    // special Grumps are measured in "regular Grumps", so they stay in proportion as levels scale
    : kind === 'splitter' || kind === 'thief' || kind === 'healer' ? Math.max(3, (s.def.minionHp ?? 1) * 3)
    : kind === 'zippy' ? Math.max(1, (s.def.minionHp ?? 1) * 0.5) // fast OR tough, not both
    : (s.def.minionHp ?? 1);
  s.grumps.push({
    x: s.castle.x + (kind === 'king' ? 0 : (s.rand() - 0.5) * 60), laneX, y: s.castle.y + s.castle.h + (kind === 'king' ? 40 : 10) + dy,
    r: k.r, hp, maxHp: hp,
    speed: kind === 'king' ? s.def.bossSpeed : s.def.grumpSpeed * k.speed * (kind === 'grump' ? 0.9 + s.rand() * 0.2 : 1),
    kind, alive: true, hitT: 0,
  });
  const e = s.grumps[s.grumps.length - 1];
  if (kind === 'shield') e.armor = e.maxArmor = Math.max(6, Math.round((s.def.minionHp ?? 1) * 5)); // an iron plank in front
  if (kind === 'healer') e.healCd = 1;
  if (kind === 'thief') {
    // heads for your best working gate and sits on it
    const good = s.gates.filter(g => g.mul > 1 && !g.mega && g.lockHp <= 0);
    e.target = good.sort((a, b) => b.mul - a.mul)[0];
    if (e.target) e.laneX = e.target.x + e.target.w / 2;
  }
}

// With Twin Lanes, Grumps pick a side and stay clear of the divider in the middle
const randomLane = (s: State) => {
  if (!s.def.twin) return 40 + s.rand() * (W - 80);
  const x = 40 + s.rand() * (W / 2 - 90);
  return s.rand() < 0.5 ? x : W - x;
};

function spawnCarriers(s: State) {
  // two Grumps carry a x3 gate down the field; pop both and the gate stays where it is, working for you
  if (s.gates.length >= 12) return;
  const w = 150, x = 40 + s.rand() * (W - 80 - w);
  const gate: Gate = { x, y: 0, w, h: 42, mul: 3, speed: 0, minX: x, maxX: x, dir: 1, flash: 0, count: 0, grow: false, mega: false, lockHp: 0, lockMax: 0, carriers: 2 };
  s.gates.push(gate);
  for (const cx of [x + 18, x + w - 18]) {
    spawn(s, 'grump', cx);
    const e = s.grumps[s.grumps.length - 1];
    e.x = cx; e.laneX = cx; e.carry = gate;
    e.speed *= 0.6;
    e.hp = e.maxHp = e.hp * 2;
  }
  gate.y = s.grumps[s.grumps.length - 1].y + 20;
  s.events.push({ type: 'carrier', x: x + w / 2, y: gate.y });
}

/** Share of a crate's max HP each Grump chews per second. */
const CHEW: Record<GrumpKind, number> = { grump: 0.02, zippy: 0.015, splitter: 0.04, big: 0.08, king: 0.25, shield: 0.03, thief: 0.02, healer: 0.02 };

function spawnGroup(s: State) {
  const d = s.def;
  s.groups++;
  if (d.bigEvery > 0 && s.groups % d.bigEvery === 0) { spawn(s, 'big', randomLane(s)); return; }
  if (d.splitterEvery && s.groups % d.splitterEvery === 0) { spawn(s, 'splitter', randomLane(s)); return; }
  for (const x of d.extras ?? []) {
    if (s.groups % x.every !== 0) continue;
    if (x.kind === 'thief' && s.grumps.some(e => e.kind === 'thief' && e.alive)) continue; // one thief at a time
    const lane = randomLane(s);
    if (x.kind === 'healer') {
      // healers hide behind an Iron Grump's plank: break the guard or aim around it
      spawn(s, 'shield', lane, 36);
      spawn(s, 'healer', lane);
      s.grumps[s.grumps.length - 1].guard = s.grumps[s.grumps.length - 2];
      return;
    }
    spawn(s, x.kind, lane);
    return;
  }
  for (let i = 0; i < d.groupSize; i++) spawn(s, s.rand() < d.zippyChance ? 'zippy' : 'grump', randomLane(s), i * 18);
}

function spawnRush(s: State, announce = true) {
  // an evenly spaced wall across the whole field: the player has to sweep
  const n = s.def.rushSize;
  for (let i = 0; i < n; i++) {
    spawn(s, 'grump', 40 + ((W - 80) * (i + 0.5)) / n, (i % 2) * 14);
    const e = s.grumps[s.grumps.length - 1];
    e.hp = e.maxHp = Math.max(1, e.hp * 0.35); // a rush is about numbers, not toughness: a sweep, not a wall
    e.speed *= 0.85;
  }
  if (announce) s.events.push({ type: 'rush', x: W / 2, y: s.castle.y + s.castle.h });
}

// Popping Grumps also damages the castle, so strong defence still moves the level forward (no stalemates).
const POP_DAMAGE = { grump: 3, zippy: 4, big: 15, king: 0, splitter: 6, shield: 10, thief: 8, healer: 8 };
const POP_CHARGE = { grump: 0.025, zippy: 0.032, big: 0.08, king: 0, splitter: 0.04, shield: 0.06, thief: 0.05, healer: 0.05 };

function addCharge(s: State, n: number) {
  if (s.charge >= 1) return;
  s.charge = Math.min(1, s.charge + n * s.chargeMul);
  if (s.charge >= 1) s.events.push({ type: 'superReady', x: s.cannonX, y: CANNON_Y });
}

function damageCastle(s: State, n: number) {
  if (s.def.boss) return; // in a duel only the King matters
  const c = s.castle;
  c.hp = Math.max(0, c.hp - n);
  c.flash = 1;
  if (c.hp === 0 && s.phase === 'playing') { end(s, 'won'); return; }
  if (s.def.finale && !s.finaleDone && c.hp < c.maxHp * 0.15) {
    // LAST STAND: the castle throws everything it has left, so the level ends on a climax
    s.finaleDone = true;
    spawnRush(s, false);
    spawn(s, 'big', 120);
    spawn(s, 'big', W - 120);
    s.events.push({ type: 'finale', x: W / 2, y: c.y + c.h });
  }
}

/** Returns false when the hit was blocked by the King's shield. */
function hurt(s: State, e: Grump, dmg: number, fromShot = true) {
  const charges = fromShot && s.goldT <= 0 && s.freezeT <= 0; // supers never refill their own meter
  if (e.kind === 'king' && s.boss.shieldT > 0) {
    s.events.push({ type: 'shieldHit', x: e.x, y: e.y - e.r });
    return false;
  }
  if (e.armor && e.armor > 0) {
    // the iron plank soaks hits first
    e.armor -= dmg;
    e.hitT = 0.12;
    if (e.armor <= 0) { e.armor = 0; s.events.push({ type: 'armorBreak', x: e.x, y: e.y + e.r }); }
    else if (s.rand() < 0.15) s.events.push({ type: 'armorHit', x: e.x, y: e.y + e.r });
    return true;
  }
  e.hp -= s.freezeT > 0 && e.kind !== 'king' ? dmg * 2 : dmg; // the King shrugs off the frostbite
  e.hitT = 0.12;
  if (e.kind === 'big') e.y -= 3; // big ones get nudged back a little
  if (e.kind === 'king' && charges) addCharge(s, 0.003 * dmg);
  if (e.kind === 'king' && !s.boss.enraged && e.hp < e.maxHp / 2) {
    s.boss.enraged = true;
    s.events.push({ type: 'enrage', x: e.x, y: e.y });
  }
  if (e.hp <= 0 && e.alive) {
    e.alive = false;
    if (e.carry && e.carry.carriers && --e.carry.carriers === 0) s.events.push({ type: 'capture', x: e.carry.x + e.carry.w / 2, y: e.carry.y });
    s.events.push({ type: e.kind === 'king' ? 'bossDown' : e.kind === 'big' || e.kind === 'splitter' ? 'bigPop' : 'pop', x: e.x, y: e.y });
    if (e.kind === 'splitter') {
      // pops into three Zippies right where it was: pop it high up!
      for (const dx of [-30, 0, 30]) {
        spawn(s, 'zippy', Math.max(40, Math.min(W - 40, e.x + dx * 3)));
        const z = s.grumps[s.grumps.length - 1];
        z.x = e.x + dx; z.y = e.y;
      }
      s.events.push({ type: 'split', x: e.x, y: e.y });
    }
    if (charges) addCharge(s, POP_CHARGE[e.kind]);
    damageCastle(s, POP_DAMAGE[e.kind]);
    if (e.kind === 'king' && s.phase === 'playing') end(s, 'won');
  }
  return true;
}

function end(s: State, phase: Phase) {
  s.phase = phase;
  s.firing = false;
  s.events.push({ type: phase === 'won' ? 'won' : 'lost', x: s.castle.x, y: s.castle.y });
}

/** Fires the hero's super if the meter is full. Returns whether it fired. */
export function triggerSuper(s: State) {
  if (s.phase !== 'playing' || s.charge < 1) return false;
  s.charge = 0;
  s.events.push({ type: 'super', x: s.cannonX, y: CANNON_Y - 60 });
  if (s.hero === 'knight') {
    s.rollers.push({ x: s.cannonX, y: CANNON_Y - 50, r: 46, hit: [] });
  } else if (s.hero === 'party') {
    // aim at the most dangerous Grumps (closest to the line), or the castle when the field is clear
    const targets = s.grumps.filter(e => e.alive).sort((a, b) => b.y - a.y).slice(0, 5);
    for (let i = 0; i < 5; i++) {
      const t = targets[i % Math.max(1, targets.length)];
      const tx = t ? t.x : s.castle.x + (i - 2) * 50;
      const ty = t ? t.y + t.speed * 0.7 : s.castle.y + s.castle.h;
      s.balloons.push({ x: s.cannonX, y: CANNON_Y - 50, sx: s.cannonX, sy: CANNON_Y - 50, tx, ty, t: -i * 0.08 });
    }
  } else if (s.hero === 'cool') {
    s.freezeT = 4;
    s.boss.shieldT = 0; // the freeze cracks the King's shield
  } else {
    s.goldT = 6;
  }
  return true;
}

function updateKing(s: State, e: Grump, dt: number) {
  const b = s.boss, d = s.def;
  const rage = b.enraged ? 1.4 : 1;
  b.shieldCd -= dt;
  if (b.shieldT > 0) {
    b.shieldT -= dt;
    e.y += e.speed * 2.2 * dt; // shielded stomp forward: the scary moment
  } else {
    e.y += e.speed * rage * dt;
    if (b.shieldCd <= 0 && d.bossShieldEvery > 0) {
      b.shieldT = 1.3;
      b.shieldCd = d.bossShieldEvery / rage;
      s.events.push({ type: 'shield', x: e.x, y: e.y });
    }
  }
  b.t += dt;
  const style = d.bossStyle ?? 'classic';
  if (style === 'sweep') {
    // THE SWEEPER: smooth, predictable side-to-side sway; lead your shots
    e.x = W / 2 + 200 * Math.sin(b.t * (2 * Math.PI / 6) * rage);
    return;
  }
  if (style === 'dash' || style === 'teleport') {
    // THE CHARGER / THE TRICKSTER: pick a spot, show it (tele), then go there fast / blink there
    if (b.tele > 0) {
      b.tele -= dt;
      if (b.tele <= 0) {
        if (style === 'teleport') { e.x = b.targetX; s.events.push({ type: 'teleport', x: e.x, y: e.y }); }
        else { e.laneX = b.targetX; e.y += 20; s.events.push({ type: 'dash', x: e.x, y: e.y }); }
      }
    } else if ((b.moveCd -= dt) <= 0) {
      // never pick a spot too close to where he is, so every move matters
      let x = 70 + s.rand() * (W - 140);
      if (Math.abs(x - e.x) < 120) x = e.x < W / 2 ? Math.min(W - 70, x + 180) : Math.max(70, x - 180);
      b.targetX = x;
      b.tele = style === 'teleport' ? 0.7 : 0.55;
      b.moveCd = (style === 'teleport' ? 2.8 : 2.2) / rage;
    }
    const dx = e.laneX - e.x;
    if (style === 'dash') e.x += Math.sign(dx) * Math.min(Math.abs(dx), 620 * dt);
    return;
  }
  // CLASSIC: strafe to a new spot every so often so the player has to track him
  b.moveCd -= dt;
  if (b.moveCd <= 0) {
    e.laneX = 70 + s.rand() * (W - 140);
    b.moveCd = (1.8 + s.rand() * 1.4) / rage;
  }
  const dx = e.laneX - e.x;
  e.x += Math.sign(dx) * Math.min(Math.abs(dx), d.bossStrafe * rage * dt);
}

export function step(s: State, dt: number) {
  for (const g of s.gates) g.flash = Math.max(0, g.flash - dt * 4);
  for (const w of s.walls) w.flash = Math.max(0, w.flash - dt * 6);
  for (const b of s.bumpers) b.flash = Math.max(0, b.flash - dt * 5);
  s.castle.flash = Math.max(0, s.castle.flash - dt * 6);
  if (s.phase !== 'playing') return;
  s.time += dt;

  // Cannon follows the finger with a little lag so it feels weighty, not jittery.
  s.cannonX += (s.targetX - s.cannonX) * Math.min(1, dt * 20);

  const gold = s.goldT > 0;
  s.goldT = Math.max(0, s.goldT - dt);
  const frozen = s.freezeT > 0;
  const prevFreeze = s.freezeT;
  s.freezeT = Math.max(0, s.freezeT - dt);
  // ice cracks: the King thaws after 1.5 s, everyone else when the freeze ends
  for (const e of s.grumps) {
    if (!e.alive) continue;
    const t = e.kind === 'king' ? 2.5 : 0;
    if (prevFreeze > t && s.freezeT <= t) s.events.push({ type: 'thaw', x: e.x, y: e.y, value: e.r });
  }
  if (s.firing) {
    s.fireCd -= dt;
    while (s.fireCd <= 0) {
      if (s.minis.length < MAX_MINIS) {
        s.minis.push({ x: s.cannonX + (s.rand() - 0.5) * 8, y: CANNON_Y - 44, vx: 0, mask: 0, alive: true, power: s.damage * (gold ? 2 : 1) });
      }
      s.fireCd += s.fireInterval / (gold ? 2.5 : 1);
    }
  } else {
    s.fireCd = Math.max(0, s.fireCd - dt);
  }

  for (const g of s.gates) g.blocked = !!g.carriers; // a carried gate works for nobody until it's freed
  for (const e of s.grumps) if (e.alive && e.kind === 'thief' && e.target && e.y >= e.target.y - e.r) e.target.blocked = true;
  for (const g of s.gates) {
    if (!g.speed) continue;
    g.x += g.speed * g.dir * dt;
    if (g.x > g.maxX) { g.x = g.maxX; g.dir = -1; }
    if (g.x < g.minX) { g.x = g.minX; g.dir = 1; }
  }

  const c = s.castle;
  const duel = s.def.boss;
  const born: Mini[] = [];
  for (const m of s.minis) {
    if (!m.alive) continue;
    m.y -= MINI_SPEED * dt;
    m.x += m.vx * dt;
    m.vx *= Math.pow(0.02, dt);
    if (!duel && m.y < HOMING_Y) m.x += (c.x - m.x) * Math.min(1, dt * 3);
    // in a duel, minis past the gates bend toward the King, but turn slowly: his sidesteps can still dodge
    if (duel && s.king && m.y < 560 && m.y > s.king.y) m.x += Math.sign(s.king.x - m.x) * Math.min(Math.abs(s.king.x - m.x), 230 * dt);
    m.x = Math.max(MINI_R, Math.min(W - MINI_R, m.x));

    for (let i = 0; i < s.gates.length; i++) {
      const g = s.gates[i];
      const bit = 1 << i;
      if (m.mask & bit) continue;
      if (m.y < g.y + g.h && m.y > g.y && m.x > g.x && m.x < g.x + g.w) {
        if (g.lockHp > 0) {
          // locked door: the padlock soaks up minis until it breaks
          m.alive = false;
          g.lockHp -= m.power;
          g.flash = 0.6;
          if (g.lockHp <= 0) { g.lockHp = 0; g.flash = 1; s.events.push({ type: 'unlock', x: g.x + g.w / 2, y: g.y, value: g.mul }); }
          else if (s.rand() < 0.1) s.events.push({ type: 'lockHit', x: m.x, y: g.y + g.h });
          break;
        }
        m.mask |= bit;
        if (g.blocked) continue; // a Thief is sitting on it
        g.flash = 1;
        if (g.mega) {
          // every 5th mini becomes a Mega Boonty (6x power, pierces 5 Grumps, skips other gates); the other 4 fuse into it
          if (++g.count % 5 !== 0) { m.alive = false; break; }
          m.power *= 6;
          m.pierce = 5;
          m.hits = [];
          m.mask = ~0; // megas skip every other gate
          s.events.push({ type: 'mega', x: m.x, y: g.y });
          continue;
        }
        if (g.grow && ++g.count % 25 === 0 && g.mul < 5) {
          g.mul++;
          s.events.push({ type: 'gateUp', x: g.x + g.w / 2, y: g.y, value: g.mul });
        }
        if (g.mul < 1) {
          // trap: every other mini is lost
          if (g.count++ % 2 === 0) {
            m.alive = false;
            if (s.rand() < 0.2) s.events.push({ type: 'trap', x: m.x, y: g.y });
            break;
          }
          continue;
        }
        for (let k = 1; k < g.mul; k++) {
          if (s.minis.length + born.length >= MAX_MINIS) break;
          const side = k % 2 ? 1 : -1;
          born.push({ x: m.x + side * 10 * Math.ceil(k / 2), y: m.y - 4 * k, vx: side * 110 * Math.ceil(k / 2), mask: m.mask, alive: true, power: m.power });
        }
        if (s.rand() < 0.15) s.events.push({ type: 'gate', x: m.x, y: g.y, value: g.mul });
      }
    }

    if (!m.alive) continue;
    for (const w of s.walls) {
      if (w.hp > 0 && m.x > w.x - MINI_R && m.x < w.x + w.w + MINI_R && m.y > w.y && m.y < w.y + w.h) {
        m.alive = false;
        w.hp -= m.power;
        w.flash = 1;
        if (w.hp <= 0) s.events.push({ type: 'wallBreak', x: w.x + w.w / 2, y: w.y + w.h / 2 });
        else if (s.rand() < 0.1) s.events.push({ type: 'wallHit', x: m.x, y: w.y + w.h });
        break;
      }
    }
    if (!m.alive) continue;
    for (const b of s.bumpers) {
      const dx = m.x - b.x, dy = m.y - b.y;
      if (dx * dx + dy * dy < (b.r + MINI_R) ** 2) {
        m.vx = (dx >= 0 ? 1 : -1) * 340;
        m.x = b.x + (dx >= 0 ? 1 : -1) * (b.r + MINI_R);
        b.flash = 1;
        if (s.rand() < 0.1) s.events.push({ type: 'bump', x: b.x, y: b.y });
      }
    }
    if (!duel && m.y < c.y + c.h && Math.abs(m.x - c.x) < c.w / 2) {
      m.alive = false;
      s.events.push({ type: 'castleHit', x: m.x, y: c.y + c.h });
      if (s.goldT <= 0 && s.freezeT <= 0) addCharge(s, 0.0015);
      damageCastle(s, m.power);
      if (s.phase !== 'playing') return;
    } else if (m.y < -20) m.alive = false;
  }
  for (const b of born) s.minis.push(b);

  for (const e of s.grumps) {
    if (!e.alive) continue;
    // the King only freezes for the first 1.5 s: bosses stay a fight
    if (frozen && (e.kind !== 'king' || s.freezeT > 2.5)) { /* stands still */ } else if (e.kind === 'king') updateKing(s, e, dt);
    else if (e.kind === 'thief' && e.target && e.y >= e.target.y - e.r) {
      // sitting on the gate, riding it if it moves
      e.x = e.target.x + e.target.w / 2;
      e.y = e.target.y - e.r + 8;
      if (e.hitT === 0 && s.rand() < dt * 0.3) s.events.push({ type: 'steal', x: e.x, y: e.y });
    }
    else {
      e.y += e.speed * dt;
      // leave the castle door, then fan out to a lane so the player has to aim to defend
      const dx0 = e.laneX - e.x;
      e.x += Math.sign(dx0) * Math.min(Math.abs(dx0), (e.kind === 'zippy' ? 150 : 90) * dt);
      if (e.kind === 'zippy' && Math.abs(dx0) < 2 && s.rand() < dt * 1.2) e.laneX = randomLane(s); // zig-zag
      if (e.kind === 'thief' && e.target) e.laneX = e.target.x + e.target.w / 2;
      if (e.guard?.alive) {
        // tucked right behind its guard
        e.laneX = e.guard.x;
        e.y = Math.min(e.y, e.guard.y - e.guard.r - e.r + 4);
      }
      if (e.kind === 'healer' && (e.healCd! -= dt) <= 0) {
        // patches up every Grump nearby (itself included) once a second
        e.healCd = 1;
        let healed = false;
        for (const o of s.grumps) {
          if (!o.alive || o.hp >= o.maxHp || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > 120 * 120) continue;
          o.hp = Math.min(o.maxHp, o.hp + Math.max(1, o.maxHp * 0.12));
          healed = true;
        }
        if (healed) s.events.push({ type: 'heal', x: e.x, y: e.y });
      }
    }
    // crates block Grumps too: they have to chew through (so crates also protect you)
    for (const w of s.walls) {
      if (w.hp > 0 && Number.isFinite(w.maxHp) && e.x > w.x - e.r * 0.6 && e.x < w.x + w.w + e.r * 0.6 && e.y + e.r > w.y && e.y - e.r < w.y + w.h) {
        e.y = w.y - e.r;
        // walk around the crate toward its nearest open end: crates funnel Grumps into the gaps
        const leftEnd = w.x - e.r - 6, rightEnd = w.x + w.w + e.r + 6;
        const canLeft = leftEnd > 20, canRight = rightEnd < W - 20;
        if (canLeft || canRight) {
          const goLeft = canLeft && (!canRight || e.x - leftEnd < rightEnd - e.x);
          e.laneX = goLeft ? leftEnd : rightEnd;
          if (!frozen) e.x += Math.sign(e.laneX - e.x) * Math.min(Math.abs(e.laneX - e.x), 70 * dt);
        }
        if (!frozen) {
          if (Number.isFinite(w.maxHp)) w.hp -= w.maxHp * CHEW[e.kind] * dt;
          w.flash = Math.max(w.flash, 0.3);
          if (w.hp <= 0) s.events.push({ type: 'wallBreak', x: w.x + w.w / 2, y: w.y + w.h / 2 });
          else if (s.rand() < dt * 2) s.events.push({ type: 'wallChew', x: e.x, y: w.y });
        }
      }
    }
    e.hitT = Math.max(0, e.hitT - dt);
    const rr = (e.r + MINI_R) * (e.r + MINI_R);
    for (const m of s.minis) {
      if (!m.alive) continue;
      const dx = m.x - e.x, dy = m.y - e.y;
      if (dx * dx + dy * dy < rr) {
        if (m.pierce) {
          // a Mega Boonty ploughs through: one hit per Grump, then keeps going
          if (m.hits!.includes(e)) continue;
          m.hits!.push(e);
          if (--m.pierce <= 0) m.alive = false;
        } else m.alive = false;
        hurt(s, e, m.power);
        if (!e.alive) break;
      }
    }
    if (s.phase !== 'playing') return;
    if (e.carry && e.carry.carriers) e.carry.y = Math.max(e.carry.y, e.y + e.r + 6); // the gate rides in front of its carriers
    if (e.alive && e.y > DANGER_Y) {
      e.alive = false;
      if (e.carry && e.carry.carriers) { e.carry.carriers = 0; e.carry.y = -9999; s.events.push({ type: 'gateLost', x: e.x, y: DANGER_Y }); }
      s.hearts = e.kind === 'king' ? 0 : s.hearts - 1; // the King crossing is game over
      s.events.push({ type: 'heart', x: e.x, y: DANGER_Y });
      if (s.hearts <= 0) { end(s, 'lost'); return; }
    }
  }

  // Sir Boonty's super: a giant knight rolling up the field
  for (const r of s.rollers) {
    r.y -= 380 * dt;
    for (const e of s.grumps) {
      if (!e.alive || r.hit.includes(e)) continue;
      const dx = e.x - r.x, dy = e.y - r.y;
      if (dx * dx + dy * dy < (e.r + r.r) ** 2) {
        r.hit.push(e);
        s.events.push({ type: 'rollerHit', x: e.x, y: e.y });
        hurt(s, e, e.kind === 'king' ? Math.ceil(e.maxHp * 0.12) : e.kind === 'big' ? 30 : 99, false);
        if (s.phase !== 'playing') return;
      }
    }
    if (!duel && r.y < c.y + c.h && r.r > 0) {
      s.events.push({ type: 'blast', x: r.x, y: c.y + c.h });
      damageCastle(s, Math.ceil(c.maxHp * 0.06));
      r.r = 0;
      if (s.phase !== 'playing') return;
    }
  }
  s.rollers = s.rollers.filter(r => r.r > 0 && r.y > -80);

  // Party Boonty's super: balloons fly to their targets and burst
  for (const b of s.balloons) {
    b.t += dt;
    if (b.t < 0) continue;
    const k = Math.min(1, b.t / 0.7);
    b.x = b.sx + (b.tx - b.sx) * k;
    b.y = b.sy + (b.ty - b.sy) * k - Math.sin(k * Math.PI) * 60;
    if (k >= 1) {
      s.events.push({ type: 'blast', x: b.x, y: b.y });
      for (const e of s.grumps) {
        if (!e.alive) continue;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (110 + e.r) ** 2) hurt(s, e, e.kind === 'king' ? Math.ceil(e.maxHp * 0.05) : 8, false);
        if (s.phase !== 'playing') return;
      }
      if (!duel && b.y < c.y + c.h + 40) damageCastle(s, Math.ceil(c.maxHp * 0.02));
      b.t = 99;
      if (s.phase !== 'playing') return;
    }
  }
  s.balloons = s.balloons.filter(b => b.t < 99);

  if (!duel) {
    s.spawnCd -= dt * (1 + (1 - c.hp / c.maxHp) * s.def.rampUp);
    if (s.spawnCd <= 0) {
      spawnGroup(s);
      s.spawnCd += s.def.spawnInterval;
    }
    if (s.def.carrierEvery) {
      s.carrierCd -= dt;
      if (s.carrierCd <= 0) { spawnCarriers(s); s.carrierCd += s.def.carrierEvery; }
    }
    if (s.def.rushEvery > 0) {
      s.rushCd -= dt;
      if (s.rushCd <= 0) { spawnRush(s); s.rushCd += s.def.rushEvery; }
    }
  }

  if (s.walls.some(w => w.hp <= 0)) s.walls = s.walls.filter(w => w.hp > 0);
  s.minis = s.minis.filter(m => m.alive);
  s.grumps = s.grumps.filter(e => e.alive);
}

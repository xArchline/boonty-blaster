import { damage, expectedUpgrades, streamDps, type Upgrades } from './upgrades';

export interface GateDef {
  x: number; // left edge
  y: number; // top edge
  w: number;
  mul: number; // 2 or 3 multiply; 0.5 = trap gate that halves the stream
  speed?: number; // px/s sideways, 0 = static
  range?: number; // how far it slides right from x
  grow?: boolean; // starts at x2 and levels up (max x5) as minis pass through
  mega?: boolean; // fuses every 5 minis into one giant piercing Boonty
  lock?: number; // locked door: absorbs minis until this much damage breaks the padlock, then it's a normal gate
}

export type BossStyle = 'classic' | 'sweep' | 'dash' | 'teleport';

export interface WallDef { x: number; y: number; w: number; h: number; hp: number }
export interface BumperDef { x: number; y: number; r: number }

export interface LevelDef {
  castleHp: number;
  minionHp?: number; // HP of regular Grumps and Zippies (grows with your damage so they stay a threat)
  hearts: number;
  spawnInterval: number; // seconds between Grump groups
  groupSize: number;
  grumpSpeed: number; // px/s
  bigEvery: number; // every Nth group is a Big Grump, 0 = never
  bigHp: number;
  zippyChance: number; // share of regular Grumps that are fast Zippies
  rushEvery: number; // seconds between rushes (a wide wall of Grumps), 0 = never
  rushSize: number;
  boss: boolean; // boss duel: King Grump alone, no other Grumps, beat him before he reaches you
  bossHp: number;
  bossSpeed: number; // px/s forward
  bossStrafe: number; // px/s sideways
  bossShieldEvery: number; // seconds between golden-shield stomps
  bossStyle?: BossStyle; // how the King moves in this duel
  rampUp: number; // spawn speed-up as the castle loses HP (0 = none, 1 = twice as fast at 0 HP)
  intro?: string; // shown at level start when a level brings something new
  walls?: WallDef[]; // crates that block minis until smashed (Grumps walk over them)
  bumpers?: BumperDef[]; // bounce minis sideways
  splitterEvery?: number; // every Nth group is a Splitter (pops into 3 Zippies)
  extras?: { kind: 'shield' | 'thief' | 'healer'; every: number }[]; // later Grump types, every Nth group
  finale?: boolean; // LAST STAND rush when the castle drops below 15%
  carrierEvery?: number; // seconds between Gate Carriers (two Grumps carrying a x3 gate: pop both and it's yours)
  twin?: boolean; // Twin Lanes: an unbreakable divider splits the field in two
  gates: GateDef[];
}

const base: Omit<LevelDef, 'gates'> = {
  castleHp: 300,
  hearts: 3,
  spawnInterval: 1.1,
  groupSize: 1,
  grumpSpeed: 58,
  bigEvery: 0,
  bigHp: 10,
  zippyChance: 0,
  rushEvery: 0,
  rushSize: 0,
  boss: false,
  bossHp: 0,
  bossSpeed: 20,
  bossStrafe: 110,
  bossShieldEvery: 7,
  rampUp: 0.6,
};

// The first 10 levels each teach or test one thing, so every level feels different.
const handmade: LevelDef[] = [
  // 1: learn to fire through a gate
  { ...base, gates: [{ x: 150, y: 520, w: 240, mul: 2 }] },
  // 2: lanes + x3 off to the side: aiming matters
  {
    ...base, castleHp: 840, spawnInterval: 0.77, groupSize: 2, grumpSpeed: 74,
    gates: [{ x: 40, y: 560, w: 200, mul: 2 }, { x: 360, y: 400, w: 140, mul: 3 }],
  },
  // 3: first rush
  {
    ...base, castleHp: 1120, spawnInterval: 0.77, groupSize: 2, grumpSpeed: 76, rushEvery: 11, rushSize: 6,
    intro: 'RUSH! Sweep the wall of Grumps!',
    gates: [{ x: 60, y: 560, w: 170, mul: 2, speed: 90, range: 250 }, { x: 360, y: 390, w: 130, mul: 3 }],
  },
  // 4: Big Grumps
  {
    ...base, castleHp: 1330, spawnInterval: 0.72, groupSize: 2, grumpSpeed: 78, bigEvery: 5, bigHp: 12, rushEvery: 14, rushSize: 6,
    intro: 'BIG GRUMPS take lots of hits!',
    gates: [{ x: 300, y: 580, w: 180, mul: 2 }, { x: 40, y: 400, w: 150, mul: 3, speed: 70, range: 160 }],
  },
  // 5: boss duel
  {
    ...base, boss: true, bossHp: 560, bossSpeed: 14, bossStrafe: 85, bossShieldEvery: 8,
    intro: 'BOSS DUEL! Beat King Grump before he reaches you!',
    gates: [{ x: 180, y: 580, w: 180, mul: 2 }, { x: 40, y: 400, w: 140, mul: 3, speed: 80, range: 320 }],
  },
  // 6: trap gates
  {
    ...base, castleHp: 1050, spawnInterval: 0.68, groupSize: 2, grumpSpeed: 80, bigEvery: 6, bigHp: 14, rushEvery: 12, rushSize: 7,
    intro: 'RED GATES halve your Boonties. Avoid them!',
    gates: [{ x: 40, y: 580, w: 160, mul: 3 }, { x: 240, y: 580, w: 200, mul: 0.5 }, { x: 330, y: 400, w: 170, mul: 2 }],
  },
  // 7: zippies
  {
    ...base, castleHp: 1470, spawnInterval: 0.68, groupSize: 2, grumpSpeed: 80, zippyChance: 0.35, bigEvery: 7, bigHp: 14,
    intro: 'ZIPPY GRUMPS are small and fast!',
    gates: [{ x: 200, y: 580, w: 150, mul: 2, speed: 100, range: 180 }, { x: 60, y: 400, w: 140, mul: 3 }, { x: 330, y: 400, w: 160, mul: 0.5 }],
  },
  // 8: everything, moving trap
  {
    ...base, castleHp: 1190, spawnInterval: 0.64, groupSize: 2, grumpSpeed: 82, zippyChance: 0.25, bigEvery: 6, bigHp: 16, rushEvery: 12, rushSize: 8,
    gates: [{ x: 40, y: 580, w: 160, mul: 0.5, speed: 90, range: 300 }, { x: 150, y: 400, w: 150, mul: 3, speed: 60, range: 200 }],
  },
  // 9: double x3, heavy pressure
  {
    ...base, castleHp: 1330, spawnInterval: 0.59, groupSize: 3, grumpSpeed: 82, zippyChance: 0.3, bigEvery: 7, bigHp: 16,
    gates: [{ x: 40, y: 600, w: 130, mul: 3 }, { x: 370, y: 420, w: 130, mul: 3 }, { x: 190, y: 510, w: 160, mul: 0.5 }],
  },
  // 10: boss with rushes
  {
    ...base, boss: true, bossHp: 480, bossSpeed: 14, bossStrafe: 100, bossShieldEvery: 7,
    bossStyle: 'sweep', intro: 'THE SWEEPER: King Grump sways side to side. Lead your shots!',
    gates: [{ x: 40, y: 580, w: 170, mul: 2, speed: 80, range: 290 }, { x: 20, y: 400, w: 160, mul: 3, speed: 55, range: 340 }],
  },
];

// 11-17: one new field element or enemy at a time (15 is a boss duel)
const late = { ...base, castleHp: 1500, spawnInterval: 0.68, groupSize: 2, grumpSpeed: 80, zippyChance: 0.2, bigEvery: 7, bigHp: 16, rushEvery: 15, rushSize: 8 };
const handmadeLate: Record<number, LevelDef> = {
  11: {
    ...late, intro: 'GROWING GATE: keep feeding it to level it up!',
    gates: [{ x: 40, y: 580, w: 180, mul: 2, grow: true }, { x: 200, y: 400, w: 150, mul: 2, speed: 80, range: 150 }],
  },
  12: {
    ...late, splitterEvery: 3, intro: 'SPLITTERS pop into 3 Zippies. Hit them early!',
    gates: [{ x: 60, y: 580, w: 180, mul: 2, grow: true, speed: 60, range: 240 }, { x: 330, y: 400, w: 160, mul: 3 }],
  },
  13: {
    ...late, intro: 'CRATES block your Boonties. Smash through!',
    walls: [{ x: 30, y: 480, w: 190, h: 34, hp: 60 }, { x: 320, y: 480, w: 190, h: 34, hp: 60 }],
    gates: [{ x: 180, y: 590, w: 180, mul: 2 }, { x: 40, y: 380, w: 150, mul: 3 }, { x: 350, y: 380, w: 150, mul: 3 }],
  },
  14: {
    ...late, castleHp: 1250, bigEvery: 3, rushEvery: 12, intro: 'MEGA GATE: 5 Boonties fuse into one giant. It pierces Grumps but skips gates!',
    gates: [{ x: 30, y: 580, w: 170, mul: 1, mega: true }, { x: 330, y: 410, w: 160, mul: 3 }],
  },
  16: {
    ...late, splitterEvery: 5, intro: 'BUMPERS bounce your Boonties sideways!',
    bumpers: [{ x: 170, y: 500, r: 24 }, { x: 370, y: 500, r: 24 }],
    gates: [{ x: 190, y: 600, w: 160, mul: 2 }, { x: 20, y: 390, w: 130, mul: 3 }, { x: 390, y: 390, w: 130, mul: 3 }],
  },
  18: {
    ...late, rushEvery: 12, finale: true, intro: 'LOCKED DOOR: break the padlock to open a ×4 gate!',
    walls: [{ x: 40, y: 500, w: 160, h: 30, hp: 70 }, { x: 340, y: 500, w: 160, h: 30, hp: 70 }],
    gates: [{ x: 190, y: 400, w: 160, mul: 4, lock: 160 }, { x: 60, y: 600, w: 170, mul: 2, speed: 70, range: 250 }],
  },
  22: {
    ...late, finale: true, extras: [{ kind: 'shield', every: 3 }], intro: 'IRON GRUMPS: their plank soaks hits. Focus them, or pierce with a MEGA!',
    gates: [{ x: 30, y: 590, w: 160, mul: 1, mega: true }, { x: 200, y: 590, w: 160, mul: 2, grow: true }, { x: 330, y: 410, w: 170, mul: 3 }],
  },
  27: {
    ...late, finale: true, extras: [{ kind: 'thief', every: 4 }], intro: 'THIEF GRUMPS sit on your best gate. Pop them to take it back!',
    gates: [{ x: 40, y: 590, w: 170, mul: 2, speed: 70, range: 290 }, { x: 180, y: 410, w: 180, mul: 3 }],
  },
  32: {
    ...late, finale: true, bigEvery: 4, extras: [{ kind: 'healer', every: 3 }], intro: 'HEALER GRUMPS patch up their friends. Pop them first!',
    walls: [{ x: 30, y: 500, w: 150, h: 30, hp: 90 }, { x: 360, y: 500, w: 150, h: 30, hp: 90 }],
    gates: [{ x: 190, y: 590, w: 160, mul: 2, grow: true }, { x: 60, y: 410, w: 150, mul: 3, speed: 60, range: 270 }],
  },
  37: {
    ...late, finale: true, carrierEvery: 9, extras: [{ kind: 'shield', every: 8 }], intro: 'GATE CARRIERS: pop both carriers and their ×3 gate is yours!',
    gates: [{ x: 40, y: 600, w: 170, mul: 2, speed: 70, range: 290 }],
  },
  42: {
    ...late, finale: true, twin: true, rushEvery: 14, intro: 'TWIN LANES: the field is split. Pick your side!',
    gates: [{ x: 40, y: 590, w: 180, mul: 2 }, { x: 320, y: 590, w: 180, mul: 2 }, { x: 60, y: 420, w: 160, mul: 3 }, { x: 320, y: 420, w: 160, mul: 3 }],
  },
  17: {
    ...late, finale: true, rushEvery: 12, zippyChance: 0.3, intro: 'LAST STAND: the castle fights back at the end!',
    gates: [{ x: 40, y: 590, w: 170, mul: 2, grow: true, speed: 70, range: 290 }, { x: 330, y: 410, w: 160, mul: 3 }],
  },
};

// Some styles are harder to hit than others, so their King has less HP
const STYLE_HP: Record<BossStyle, number> = { classic: 1.35, sweep: 0.75, dash: 1, teleport: 0.95 };

// Duels rotate through the King's fighting styles (from level 15 on)
const BOSS_STYLES: BossStyle[] = ['dash', 'teleport', 'classic', 'sweep'];
const BOSS_INTRO: Record<BossStyle, string> = {
  sweep: 'THE SWEEPER: he sways side to side. Lead your shots!',
  dash: 'THE CHARGER: watch the red arrow, he charges there!',
  teleport: 'THE TRICKSTER: his ghost shows where he blinks next!',
  classic: 'KING GRUMP returns!',
};

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Levels were tuned for 1 damage every 0.085 s. Early on the player is weaker (they buy upgrades with gold),
// so HP and pressure scale with the firepower a typical player has at that level.
const TUNED_DPS = 1 / 0.085;

/** HP multiplier by position in the 5-level cycle (boss on every 5th). Flat during the tutorial levels. */
export function wave(n: number) {
  if (n <= 5) return 1;
  return [0.95, 0.45, 0.65, 0.8, 0.95][n % 5];
}

/** Level n (1-based), scaled to the expected firepower at that point. Same result every time for a given n. */
export function levelDef(n: number, up?: Upgrades): LevelDef {
  const d = rawLevel(n);
  // Difficulty follows firepower: half the typical player's at this level, half the player's own (geometric mean).
  // Upgrading beyond the curve still makes you stronger, just not invincible forever.
  // On top of that, difficulty comes in waves of 5: right after a boss you feel like a god, then it climbs to the next King.
  const typical = expectedUpgrades(n);
  const mine = up ?? typical;
  const late = 1 + Math.max(0, n - 12) / 24; // levels keep getting tougher the further you go
  const dps = Math.sqrt(streamDps(typical) * streamDps(mine));
  const f = (dps / TUNED_DPS) * wave(n) * late;
  // Regular Grumps need more hits the further you go (about 2 hits by level 40 on a normal wave)
  const dmg = Math.sqrt(damage(typical.power) * damage(mine.power));
  const minionHp = Math.max(1, Math.round(dmg * (0.6 + n / 26) * Math.sqrt(wave(n)) * 10) / 10);
  const p = Math.min(1, f); // Grump pressure never goes above the tuned level
  return {
    ...d,
    castleHp: Math.round(d.castleHp * f),
    minionHp,
    // King HP = your firepower x a target fight length (about 15 s early, up to 22 s later; gates add ~x1.6)
    bossHp: d.boss ? Math.round(dps * 1.6 * (14 + Math.min(8, n / 8)) * STYLE_HP[d.bossStyle ?? 'classic']) : 0,
    bigHp: Math.max(4, Math.round(d.bigHp * f)),
    spawnInterval: d.spawnInterval / Math.pow(p, 0.7),
    rushSize: Math.max(4, Math.round(d.rushSize * Math.sqrt(p))),
    walls: d.walls?.map(w => ({ ...w, hp: Math.max(10, Math.round(w.hp * f)) })),
    gates: d.gates.map(g => (g.lock ? { ...g, lock: Math.max(20, Math.round(g.lock * f)) } : g)),
  };
}

/** Levels 1-17 are handmade (except the level-15 boss). After that, each level remixes the unlocked twists. */
function rawLevel(n: number): LevelDef {
  if (n <= handmade.length) return handmade[n - 1];
  if (handmadeLate[n]) return handmadeLate[n];
  const r = rng(n);
  const d = n - handmade.length; // 1, 2, 3...
  if (n % 5 === 0) {
    // boss duel every 5 levels, a bit meaner each time
    const k = n / 5 - 2; // 1 at level 15
    const style = BOSS_STYLES[k % 4];
    return {
      ...base, boss: true, bossHp: 420 + 30 * k, bossSpeed: Math.min(17, 14 + 0.5 * k), bossStrafe: Math.min(150, 100 + 8 * k), bossShieldEvery: Math.max(4.5, 7 - 0.4 * k),
      bossStyle: style,
      intro: BOSS_INTRO[style],
      // the x3 slides across the whole field, so lining it up with the King is skill, not luck
      gates: [{ x: 40, y: 590, w: 170, mul: 2, speed: 80, range: 290 }, { x: 20, y: 410, w: 160, mul: 3, speed: 55, range: 340 }],
    };
  }
  // Each level mixes one field feature with one enemy flavour, so consecutive levels feel different.
  const fields = ['traps', 'grow', 'mega', 'walls', 'bumpers', 'lock', ...(n > 42 ? ['twin', 'twin'] : [])];
  // Twin Lanes also show up often in the short levels right after a boss
  const field = n > 42 && n % 5 <= 2 && r() < 0.5 ? 'twin' : fields[Math.floor(r() * fields.length)];
  // later Grump types join the mix once they've been introduced (22, 27, 32)
  const unlocked = (['shield', 'thief', 'healer'] as const).filter((_, i) => n > 22 + i * 5);
  const enemies = ['rush', 'zippy', 'big', 'splitter', ...unlocked, ...(n > 37 ? ['carrier'] : [])];
  const enemy = enemies[Math.floor(r() * enemies.length)];
  const gates: GateDef[] = [];
  const good = (y: number, mul: number, extra: Partial<GateDef> = {}) => {
    const w = 120 + Math.round(r() * 60);
    const moving = r() < 0.6;
    const range = moving ? 120 + Math.round(r() * 160) : 0;
    const x = 30 + Math.round(r() * (540 - 60 - w - range));
    gates.push({ x, y, w, mul, speed: moving ? 60 + r() * 70 : 0, range, ...extra });
  };
  good(590, r() < 0.5 ? 2 : 3, field === 'grow' ? { mul: 2, grow: true } : {});
  good(410, 3);
  let walls: LevelDef['walls'];
  let bumpers: LevelDef['bumpers'];
  if (field === 'traps') {
    const w = 140 + Math.round(r() * 60);
    gates.push({ x: 30 + Math.round(r() * (540 - 60 - w - 200)), y: 500, w, mul: 0.5, speed: 90, range: 200 });
  } else if (field === 'mega') {
    gates.push({ x: 30 + Math.round(r() * 330), y: 500, w: 150, mul: 1, mega: true });
  } else if (field === 'walls') {
    // a crate row with one gap somewhere
    const gap = 60 + Math.round(r() * 340);
    walls = [{ x: 20, y: 490, w: gap - 20, h: 30, hp: 110 }, { x: gap + 90, y: 490, w: 520 - gap - 90, h: 30, hp: 110 }].filter(w => w.w > 40);
  } else if (field === 'lock') {
    // a locked x4 door: spend some stream to break the padlock for a huge payoff
    gates.push({ x: 30 + Math.round(r() * 350), y: 500, w: 150, mul: 4, lock: 200 });
  } else if (field === 'bumpers') {
    bumpers = [{ x: 120 + Math.round(r() * 80), y: 500, r: 24 }, { x: 340 + Math.round(r() * 80), y: 500, r: 24 }];
  }
  const hard = Math.min(1, d / 25); // keeps getting harder slowly while level length stays capped
  const late = Math.max(0, d - 25); // and past level 35 the pressure keeps creeping up
  return {
    ...base,
    castleHp: Math.round(1600 + 400 * hard),
    spawnInterval: Math.max(0.36, 0.66 - 0.14 * hard - 0.004 * late),
    groupSize: (enemy === 'zippy' ? 3 : 2) + (late > 20 ? 1 : 0),
    grumpSpeed: Math.min(118, 80 + 14 * hard + 0.6 * late),
    zippyChance: enemy === 'zippy' ? 0.5 : 0.2,
    bigEvery: enemy === 'big' ? 3 : 7,
    bigHp: Math.round(16 + 10 * hard),
    rushEvery: enemy === 'rush' ? 8 : 15,
    rushSize: Math.min(14, 8 + Math.round(3 * hard + late / 8)),
    splitterEvery: enemy === 'splitter' ? 3 : 8,
    // the level's own flavour comes often, the other unlocked types sprinkle in now and then
    extras: unlocked.map(k => ({ kind: k, every: enemy === k ? 3 : Math.max(5, 9 - Math.floor(late / 10)) + unlocked.indexOf(k) })),
    finale: true,
    carrierEvery: enemy === 'carrier' ? 8 : n > 37 ? 20 : 0,
    twin: field === 'twin',
    gates: field === 'twin' ? [{ x: 40, y: 590, w: 180, mul: 2 }, { x: 320, y: 590, w: 180, mul: 2 }, { x: 60, y: 420, w: 160, mul: 3 }, { x: 320, y: 420, w: 160, mul: 3 }] : gates,
    walls, bumpers,
  };
}

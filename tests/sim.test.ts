import { describe, expect, it } from 'vitest';
import { createState, DANGER_Y, step, triggerSuper } from '../src/sim';
import { levelDef } from '../src/levels';
import { play } from '../scripts/bot';

const run = (s: ReturnType<typeof createState>, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 120) step(s, 1 / 120); };

describe('sim', () => {
  it('fires only while held', () => {
    const s = createState(1);
    run(s, 0.5);
    expect(s.minis.length).toBe(0);
    s.firing = true;
    run(s, 0.5);
    expect(s.minis.length).toBeGreaterThan(2);
  });

  it('a gate multiplies each mini exactly once', () => {
    const s = createState(1);
    s.gates = [{ x: 0, y: 500, w: 540, h: 34, mul: 3, speed: 0, minX: 0, maxX: 0, dir: 1, flash: 0, count: 0, grow: false, mega: false, lockHp: 0, lockMax: 0 }];
    s.spawnCd = 999;
    s.minis.push({ x: 270, y: 560, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.3);
    expect(s.minis.length).toBe(3);
    run(s, 0.3);
    expect(s.minis.length).toBeLessThanOrEqual(3);
  });

  it('a trap gate halves the stream', () => {
    const s = createState(1);
    s.spawnCd = 999;
    s.gates = [{ x: 0, y: 500, w: 540, h: 34, mul: 0.5, speed: 0, minX: 0, maxX: 0, dir: 1, flash: 0, count: 0, grow: false, mega: false, lockHp: 0, lockMax: 0 }];
    for (let i = 0; i < 10; i++) s.minis.push({ x: 50 + i * 40, y: 560, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.3);
    expect(s.minis.length).toBe(5);
  });

  it('boss duel: the King is alone, crossing the line loses', () => {
    const s = createState(5);
    expect(s.king).not.toBeNull();
    run(s, 10);
    expect(s.grumps.filter(e => e.kind !== 'king').length).toBe(0);
    s.king!.y = DANGER_Y - 1;
    s.boss.shieldT = 0;
    run(s, 0.5);
    expect(s.phase).toBe('lost');
  });

  it('boss duel: the shield blocks damage, and beating the King wins', () => {
    const s = createState(5);
    const k = s.king!;
    s.boss.shieldT = 1;
    s.minis.push({ x: k.x, y: k.y + k.r + 5, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.05);
    expect(k.hp).toBe(k.maxHp);
    s.boss.shieldT = 0;
    s.boss.shieldCd = 99;
    k.hp = 1;
    s.minis.push({ x: k.x, y: k.y + k.r + 5, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.05);
    expect(s.phase).toBe('won');
  });

  it('supers need a full meter, then each hero does its thing', () => {
    const knight = createState(2, 'knight');
    expect(triggerSuper(knight)).toBe(false);
    knight.charge = 1;
    knight.spawnCd = 999;
    knight.gates = [];
    for (let i = 0; i < 4; i++) knight.grumps.push({ x: 270, laneX: 270, y: 400 + i * 60, r: 14, hp: 1, maxHp: 1, speed: 0, kind: 'grump', alive: true, hitT: 0 });
    expect(triggerSuper(knight)).toBe(true);
    run(knight, 1.5);
    expect(knight.grumps.length).toBe(0);
    expect(knight.castle.hp).toBeLessThan(knight.castle.maxHp);

    const party = createState(2, 'party');
    party.charge = 1;
    party.spawnCd = 999;
    party.grumps.push({ x: 100, laneX: 100, y: 500, r: 26, hp: 8, maxHp: 8, speed: 0, kind: 'big', alive: true, hitT: 0 });
    triggerSuper(party);
    run(party, 1.5);
    expect(party.grumps.length).toBe(0);

    const crown = createState(2, 'crown', 1, { rate: 20, power: 0, charge: 0, hearts: 0 });
    crown.charge = 1;
    triggerSuper(crown);
    crown.firing = true;
    run(crown, 0.5);
    expect(crown.minis.every(m => m.power === 2)).toBe(true);
    expect(crown.minis.length).toBeGreaterThan(10);
  });

  it('Cool Boonty freezes Grumps, frozen ones take double damage', () => {
    const s = createState(2, 'cool');
    s.spawnCd = 999;
    s.gates = [];
    s.grumps.push({ x: 270, laneX: 270, y: 300, r: 26, hp: 10, maxHp: 10, speed: 60, kind: 'big', alive: true, hitT: 0 });
    s.charge = 1;
    triggerSuper(s);
    run(s, 1);
    expect(s.grumps[0].y).toBe(300);
    s.minis.push({ x: 270, y: 340, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.1);
    expect(s.grumps[0].hp).toBe(8);
    run(s, 3.5);
    expect(s.grumps[0].y).toBeGreaterThan(300);
  });

  it('freeze never refills its own meter; a mega hits each Grump once', () => {
    const s = createState(2, 'cool');
    s.spawnCd = 999; s.gates = [];
    for (let i = 0; i < 6; i++) s.grumps.push({ x: 100 + i * 60, laneX: 100 + i * 60, y: 400, r: 14, hp: 1, maxHp: 1, speed: 0, kind: 'grump', alive: true, hitT: 0 });
    s.charge = 1; triggerSuper(s);
    for (let i = 0; i < 6; i++) s.minis.push({ x: 100 + i * 60, y: 440, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.2);
    expect(s.grumps.length).toBe(0);
    expect(s.charge).toBe(0);

    const m = createState(2);
    m.spawnCd = 999; m.gates = [];
    for (let i = 0; i < 2; i++) m.grumps.push({ x: 270 + i * 4, laneX: 270 + i * 4, y: 400, r: 26, hp: 20, maxHp: 20, speed: 0, kind: 'big', alive: true, hitT: 0 });
    m.minis.push({ x: 270, y: 450, vx: 0, mask: ~0, alive: true, power: 6, pierce: 5, hits: [] });
    run(m, 0.3);
    expect(m.grumps.map(e => e.hp)).toEqual([14, 14]);
  });

  it('popping Grumps fills the super meter', () => {
    const s = createState(2);
    s.gates = [];
    s.spawnCd = 999;
    s.grumps.push({ x: 270, laneX: 270, y: 500, r: 14, hp: 1, maxHp: 1, speed: 0, kind: 'grump', alive: true, hitT: 0 });
    s.minis.push({ x: 270, y: 530, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.1);
    expect(s.charge).toBeGreaterThan(0);
  });

  it('a growing gate levels up as minis pass', () => {
    const s = createState(1);
    s.spawnCd = 999;
    s.gates = [{ x: 0, y: 500, w: 540, h: 42, mul: 2, speed: 0, minX: 0, maxX: 0, dir: 1, flash: 0, count: 0, grow: true, mega: false, lockHp: 0, lockMax: 0 }];
    for (let i = 0; i < 60; i++) s.minis.push({ x: 20 + (i % 25) * 20, y: 560 + Math.floor(i / 25) * 8, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.3);
    expect(s.gates[0].mul).toBe(4);
  });

  it('a mega gate fuses 5 minis into one piercing Mega Boonty', () => {
    const s = createState(2);
    s.spawnCd = 999;
    s.gates = [{ x: 0, y: 500, w: 540, h: 42, mul: 1, speed: 0, minX: 0, maxX: 0, dir: 1, flash: 0, count: 0, grow: false, mega: true, lockHp: 0, lockMax: 0 }];
    for (let i = 0; i < 5; i++) s.minis.push({ x: 270, y: 560 + i * 2, vx: 0, mask: 0, alive: true, power: 1 });
    for (let i = 0; i < 3; i++) s.grumps.push({ x: 270, laneX: 270, y: 380 - i * 40, r: 14, hp: 1, maxHp: 1, speed: 0, kind: 'grump', alive: true, hitT: 0 });
    run(s, 0.6);
    expect(s.grumps.length).toBe(0);
  });

  it('walls block minis until smashed; bumpers push them sideways', () => {
    const s = createState(2);
    s.spawnCd = 999;
    s.gates = [];
    s.walls = [{ x: 200, y: 450, w: 140, h: 30, hp: 3, maxHp: 3, flash: 0 }];
    for (let i = 0; i < 5; i++) s.minis.push({ x: 270, y: 520 + i * 20, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.4);
    expect(s.walls.length).toBe(0);
    expect(s.minis.length).toBe(2);
    s.bumpers = [{ x: 270, y: 400, r: 20, flash: 0 }];
    s.minis = [{ x: 275, y: 440, vx: 0, mask: 0, alive: true, power: 1 }];
    run(s, 0.1);
    expect(s.minis[0].x).toBeGreaterThan(300);
  });

  it('a locked door soaks minis until it breaks, then multiplies', () => {
    const s = createState(2);
    s.spawnCd = 999;
    s.gates = [{ x: 0, y: 500, w: 540, h: 42, mul: 4, speed: 0, minX: 0, maxX: 0, dir: 1, flash: 0, count: 0, grow: false, mega: false, lockHp: 3, lockMax: 3 }];
    for (let i = 0; i < 4; i++) s.minis.push({ x: 270, y: 560 + i * 30, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.4);
    expect(s.gates[0].lockHp).toBe(0);
    expect(s.minis.length).toBe(4); // 3 absorbed by the lock, the 4th went through the open x4
  });

  it('crates stop Grumps, who chew through them', () => {
    const s = createState(2);
    s.spawnCd = 999; s.gates = [];
    s.walls = [{ x: 200, y: 500, w: 140, h: 30, hp: 100, maxHp: 100, flash: 0 }];
    s.grumps.push({ x: 270, laneX: 270, y: 470, r: 26, hp: 99, maxHp: 99, speed: 60, kind: 'big', alive: true, hitT: 0 });
    run(s, 2);
    expect(s.grumps[0].y).toBeLessThan(500);
    expect(s.walls[0].hp).toBeLessThan(100);
    run(s, 12);
    expect(s.walls.length).toBe(0);
    expect(s.grumps[0].y).toBeGreaterThan(520);
  });

  it('Iron Grump: the plank soaks hits before the body', () => {
    const s = createState(2);
    s.spawnCd = 999; s.gates = [];
    s.grumps.push({ x: 270, laneX: 270, y: 400, r: 16, hp: 1, maxHp: 1, speed: 0, kind: 'shield', alive: true, hitT: 0, armor: 3, maxArmor: 3 });
    for (let i = 0; i < 3; i++) s.minis.push({ x: 270, y: 440 + i * 30, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.3);
    expect(s.grumps.length).toBe(1);
    expect(s.grumps[0].armor).toBe(0);
    s.minis.push({ x: 270, y: 440, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.1);
    expect(s.grumps.length).toBe(0);
  });

  it('Thief Grump sits on the best gate and switches it off until popped', () => {
    const s = createState(27);
    s.spawnCd = 999; s.rushCd = 999;
    s.grumps = [];
    const best = s.gates.reduce((a, g) => (g.mul > a.mul ? g : a));
    s.grumps.push({ x: best.x + best.w / 2, laneX: best.x + best.w / 2, y: best.y - 10, r: 15, hp: 50, maxHp: 50, speed: 60, kind: 'thief', alive: true, hitT: 0, target: best });
    run(s, 0.1);
    s.minis = [{ x: best.x + 10, y: best.y + best.h + 10, vx: 0, mask: 0, alive: true, power: 1 }];
    run(s, 0.1);
    expect(best.blocked).toBe(true);
    expect(s.minis.length).toBe(1); // not multiplied
  });

  it('Healer Grump patches up hurt Grumps nearby', () => {
    const s = createState(2);
    s.spawnCd = 999; s.gates = [];
    s.grumps.push({ x: 270, laneX: 270, y: 300, r: 26, hp: 5, maxHp: 20, speed: 0, kind: 'big', alive: true, hitT: 0 });
    s.grumps.push({ x: 300, laneX: 300, y: 300, r: 16, hp: 3, maxHp: 3, speed: 0, kind: 'healer', alive: true, hitT: 0, healCd: 0.5 });
    run(s, 1);
    expect(s.grumps[0].hp).toBeGreaterThan(5);
  });

  it('Gate Carriers: pop both and the x3 gate is yours', () => {
    const s = createState(37);
    s.spawnCd = 999; s.rushCd = 999; s.carrierCd = 0;
    run(s, 0.05);
    const carried = s.gates.find(g => g.carriers)!;
    expect(carried).toBeTruthy();
    expect(carried.blocked).toBe(true);
    for (const e of s.grumps.filter(e => e.carry)) { e.hp = 0.1; s.minis.push({ x: e.x, y: e.y + e.r + 20, vx: 0, mask: ~0, alive: true, power: 1 }); }
    run(s, 0.1);
    expect(carried.carriers).toBe(0);
    expect(s.events.some(e => e.type === 'capture') || carried.blocked === false).toBe(true);
  });

  it('Twin Lanes: the divider stops minis and never breaks', () => {
    const s = createState(42);
    s.spawnCd = 999; s.rushCd = 999; s.gates = [];
    const div = s.walls.find(w => !Number.isFinite(w.maxHp))!;
    expect(div).toBeTruthy();
    s.minis.push({ x: 270, y: 700, vx: 0, mask: 0, alive: true, power: 99 });
    run(s, 0.5);
    expect(s.minis.length).toBe(0);
    expect(s.walls).toContain(div);
  });

  it('boss styles: the Trickster blinks to the telegraphed spot, the Charger dashes there', () => {
    for (const lvl of [15, 30]) {
      const s = createState(lvl);
      const k = s.king!;
      s.boss.shieldCd = 99;
      s.boss.moveCd = 0;
      run(s, 1 / 60);
      const target = s.boss.targetX;
      expect(s.boss.tele).toBeGreaterThan(0);
      run(s, 1.2);
      expect(Math.abs(k.x - target)).toBeLessThan(5);
    }
  });

  it('a splitter pops into three Zippies', () => {
    const s = createState(2);
    s.spawnCd = 999;
    s.gates = [];
    s.grumps.push({ x: 270, laneX: 270, y: 400, r: 21, hp: 1, maxHp: 1, speed: 0, kind: 'splitter', alive: true, hitT: 0 });
    s.minis.push({ x: 270, y: 440, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.05);
    expect(s.grumps.filter(e => e.kind === 'zippy').length).toBe(3);
  });

  it('mini and grump pop each other', () => {
    const s = createState(1);
    s.spawnCd = 999;
    s.gates = [];
    s.grumps.push({ x: 270, laneX: 270, y: 500, r: 14, hp: 1, maxHp: 1, speed: 0, kind: 'grump', alive: true, hitT: 0 });
    s.minis.push({ x: 270, y: 530, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.1);
    expect(s.grumps.length).toBe(0);
    expect(s.minis.length).toBe(0);
    expect(s.events.some(e => e.type === 'pop')).toBe(true);
  });

  it('castle at 0 HP wins', () => {
    const s = createState(1);
    s.castle.hp = 1;
    s.minis.push({ x: s.castle.x, y: s.castle.y + s.castle.h + 5, vx: 0, mask: 0, alive: true, power: 1 });
    run(s, 0.1);
    expect(s.phase).toBe('won');
  });

  it('grumps reaching the line cost hearts, 0 hearts loses', () => {
    const s = createState(1);
    s.spawnCd = 999;
    for (let i = 0; i < 3; i++) s.grumps.push({ x: 100 + i * 100, laneX: 100 + i * 100, y: DANGER_Y - 1, r: 14, hp: 1, maxHp: 1, speed: 60, kind: 'grump', alive: true, hitT: 0 });
    run(s, 0.2);
    expect(s.hearts).toBe(0);
    expect(s.phase).toBe('lost');
  });

  it('a new state is a clean restart', () => {
    const s = createState(3);
    s.firing = true;
    run(s, 5);
    const fresh = createState(3);
    expect(fresh.minis.length).toBe(0);
    expect(fresh.castle.hp).toBe(levelDef(3).castleHp);
    expect(fresh.hearts).toBe(3);
    expect(fresh.phase).toBe('playing');
  });

  it('levels are deterministic and gates stay on screen', () => {
    for (let n = 1; n <= 30; n++) {
      expect(levelDef(n)).toEqual(levelDef(n));
      for (const g of levelDef(n).gates) {
        expect(g.x).toBeGreaterThanOrEqual(0);
        expect(g.x + g.w + (g.range ?? 0)).toBeLessThanOrEqual(540);
      }
    }
  });

  it('aiming matters: a bot that never moves loses by level 4', () => {
    const lazy = [1, 2, 3, 4].map(n => {
      const s = createState(n);
      s.firing = true;
      for (let t = 0; t < 240 && s.phase === 'playing'; t += 1 / 120) step(s, 1 / 120);
      return s.phase;
    });
    expect(lazy).toContain('lost');
  });

  it('the first levels are winnable by a simple bot', () => {
    for (let n = 1; n <= 4; n++) expect(play(n).phase).toBe('won');
  });

  it('the first boss is beatable most of the time', () => {
    const wins = [0, 1, 2, 3, 4, 5].filter(i => play(5, 1, (['knight', 'party', 'crown'] as const)[i % 3], 1000 + i * 77).phase === 'won').length;
    expect(wins).toBeGreaterThanOrEqual(3);
  });
});

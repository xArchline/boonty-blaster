// Headless balance check: a simple bot plays each level. Run: npm run balance
import { createState, step, triggerSuper, type Hero, type State } from '../src/sim';
import type { Upgrades } from '../src/upgrades';

export function botAim(s: State, skill = 1) {
  if (s.king && s.rand() < skill) {
    // farm the best gate while the King is far, go straight at him when he gets close
    const best = s.gates.reduce((a, g) => (g.mul > a.mul ? g : a), s.gates[0]);
    const k = s.king;
    // anticipate like a human: lead the Sweeper, aim at the telegraphed spot of the Charger / Trickster
    const style = s.def.bossStyle ?? 'classic';
    const kx = style === 'sweep' ? 270 + 200 * Math.sin((s.boss.t + 0.7) * (2 * Math.PI / 6) * (s.boss.enraged ? 1.4 : 1))
      : (style === 'dash' || style === 'teleport') && s.boss.tele > 0 ? s.boss.targetX : k.x;
    const gateNear = best && Math.abs(best.x + best.w / 2 - kx) < 140;
    return k.y > 430 || !gateNear ? kx : best.x + best.w / 2;
  }
  // priority targets a human would go for: a Thief on a gate, a Healer
  const vip = s.grumps.find(e => (e.kind === 'thief' && e.target?.blocked) || e.kind === 'healer');
  if (vip && s.rand() < skill) return vip.x;
  const threat = s.grumps.reduce<typeof s.grumps[number] | null>((a, e) => (e.y > 480 && (!a || e.y > a.y) ? e : a), null);
  if (threat && s.rand() < skill) return threat.x;
  // a human breaks padlocks open when things are calm, and doesn't feed the MEGA gate by accident
  const locked = s.gates.find(g => g.lockHp > 0);
  if (locked && s.rand() < skill) return locked.x + locked.w / 2;
  const usable = s.gates.filter(g => !g.mega && !g.blocked && g.y > -1000);
  const best = usable.reduce((a, g) => (g.mul > a.mul ? g : a), usable[0]);
  return best ? best.x + best.w / 2 : s.castle.x;
}

export function play(level: number, skill = 1, hero: Hero = 'knight', seed?: number, up?: Upgrades) {
  const s = createState(level, hero, seed, up);
  let t = 0;
  s.firing = true;
  while (s.phase === 'playing' && t < 240) {
    // skill < 1: reaction is slower and aim is noisier
    if (Math.floor(t * 60) % Math.max(1, Math.round(6 / skill)) === 0) s.targetX = botAim(s, skill) + (s.rand() - 0.5) * 60 * (1 - skill);
    if (skill > 0 && s.charge >= 1) triggerSuper(s);
    step(s, 1 / 120);
    t += 1 / 120;
  }
  return { level, phase: s.phase, time: +t.toFixed(1), castle: Math.round(s.king ? (s.king.hp / s.king.maxHp) * 100 : (s.castle.hp / s.castle.maxHp) * 100), hearts: s.hearts };
}


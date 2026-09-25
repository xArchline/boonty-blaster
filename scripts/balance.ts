import { play } from './bot';
import type { Hero } from '../src/sim';

// skill 1 = sharp player, 0.6 = casual player, 0 = never aims at threats (only farms gates)
const skills = [1, 0.6, 0];
const levels = process.argv[2] ? process.argv[2].split(',').map(Number) : Array.from({ length: 20 }, (_, i) => i + 1);
const heroes = (process.argv[3]?.split(',') ?? ['knight']) as Hero[];
for (const hero of heroes) {
  console.log(`\n${hero}\nlvl  ` + skills.map(k => `skill ${k}`.padEnd(22)).join(''));
  for (const l of levels) {
    const cells = skills.map(k => {
      const r = play(l, k, hero);
      return `${r.phase === 'won' ? 'WIN ' : 'lose'} ${String(r.time).padStart(5)}s ${r.phase === 'won' ? `♥${r.hearts}` : `${r.castle}%`}`.padEnd(22);
    });
    console.log(String(l).padEnd(5) + cells.join(''));
  }
}

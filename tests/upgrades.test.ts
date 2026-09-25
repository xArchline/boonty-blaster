import { describe, expect, it } from 'vitest';
import { createState } from '../src/sim';
import { expectedUpgrades, fireInterval, goldReward, NO_UPGRADES, UPGRADES } from '../src/upgrades';
import { levelDef } from '../src/levels';
import { play } from '../scripts/bot';

describe('upgrades & gold', () => {
  it('upgrades change the game state', () => {
    const weak = createState(3, 'knight', 1, NO_UPGRADES);
    const strong = createState(3, 'knight', 1, { rate: 6, power: 4, charge: 2, hearts: 2 });
    expect(strong.fireInterval).toBeLessThan(weak.fireInterval);
    expect(strong.damage).toBeGreaterThan(weak.damage);
    expect(strong.chargeMul).toBeGreaterThan(weak.chargeMul);
    expect(strong.hearts).toBe(5);
  });

  it('costs rise and fire rate improves with every level', () => {
    for (const u of Object.values(UPGRADES)) for (let k = 1; k < 60; k++) expect(u.cost(k)).toBeGreaterThan(u.cost(k - 1));
    for (let k = 1; k <= 20; k++) expect(fireInterval(k)).toBeLessThan(fireInterval(k - 1));
  });

  it('a loss still pays, a win pays more, bosses pay extra', () => {
    expect(goldReward(10, false, 0, false)).toBeGreaterThan(0);
    expect(goldReward(10, false, 0.9, false)).toBeGreaterThan(goldReward(10, false, 0.1, false));
    expect(goldReward(10, true, 1, false)).toBeGreaterThan(goldReward(10, false, 0.99, false));
    expect(goldReward(10, true, 1, true)).toBeGreaterThan(goldReward(10, true, 1, false));
  });

  it('the expected player gets stronger, and so do the castles', () => {
    for (let n = 2; n < 40; n++) {
      const a = expectedUpgrades(n - 1), b = expectedUpgrades(n);
      expect(b.rate + b.power).toBeGreaterThanOrEqual(a.rate + a.power);
    }
    expect(levelDef(30).bossHp).toBeGreaterThan(levelDef(10).bossHp);
  });

  it('being stuck is solved by upgrading: a hard boss gets beatable with more upgrades', () => {
    const wins = (up: typeof NO_UPGRADES) => [0, 1, 2, 3, 4, 5].filter(i => play(25, 0.6, 'knight', 1000 + i * 77, up).phase === 'won').length;
    expect(wins(expectedUpgrades(35))).toBeGreaterThan(wins(expectedUpgrades(25)));
  });
});

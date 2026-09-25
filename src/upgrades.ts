// Gold and upgrades bought between levels. Pure data + formulas (no DOM).
// No upgrade has a level cap: costs and rewards both grow exponentially, so numbers keep getting bigger.

export type UpgradeId = 'rate' | 'power' | 'charge' | 'hearts';
export type Upgrades = Record<UpgradeId, number>;

const MAX_SHOTS = 40; // per second; past this the stream is already a solid river (and the mini cap kicks in)

export const UPGRADES: Record<UpgradeId, { name: string; cost: (k: number) => number; effect: (k: number) => string; maxed: (k: number) => boolean }> = {
  rate: {
    name: 'More Boonties',
    cost: k => roundNice(30 * Math.pow(1.28, k)),
    effect: k => `${shotsPerSecond(k).toFixed(1)}/s`,
    maxed: k => shotsPerSecond(k) >= MAX_SHOTS,
  },
  power: {
    name: 'Boonty Power',
    cost: k => roundNice(40 * Math.pow(1.3, k)),
    effect: k => `${fmt(damage(k))} dmg`,
    maxed: () => false,
  },
  charge: {
    name: 'Super Charge',
    cost: k => roundNice(60 * Math.pow(1.4, k)),
    effect: k => `+${Math.round((chargeMul(k) - 1) * 100)}%`,
    maxed: () => false,
  },
  hearts: {
    name: 'Extra Heart',
    cost: k => roundNice(150 * Math.pow(2.2, k)),
    effect: k => `${3 + k} ♥`,
    maxed: () => false,
  },
};

export const NO_UPGRADES: Upgrades = { rate: 0, power: 0, charge: 0, hearts: 0 };

const shotsPerSecond = (k: number) => Math.min(MAX_SHOTS, 3.3 * Math.pow(1.1, k));
/** Seconds between shots at fire-rate upgrade k (3.3/s at 0, capped at 40/s around k=26). */
export const fireInterval = (k: number) => 1 / shotsPerSecond(k);
export const chargeMul = (k: number) => 1 + 0.15 * k;
export const damage = (k: number) => 1 + 0.25 * k;

/** Round costs to friendly numbers (2 significant digits). */
function roundNice(n: number) {
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
  return Math.round(n / p) * p;
}
/** 1234 -> "1,234", 12345678 -> "12M". */
export function fmt(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  return n >= 1000 ? Math.round(n).toLocaleString('en-US') : String(Math.round(n * 10) / 10);
}

/** Gold for finishing a level. Grows exponentially with the level. A loss still pays (more the closer you got). */
export function goldReward(level: number, won: boolean, progress: number, boss: boolean) {
  const full = Math.round(20 * Math.pow(1.14, level - 1) * (boss ? 2 : 1));
  return won ? full : Math.round(full * (0.3 + 0.4 * progress));
}

/**
 * Upgrades a typical player has when starting level n. Levels are balanced against this.
 * Simulated from the real economy: the player wins every level, spends 80% of the gold, always buying the
 * cheaper of fire rate / power (fractional levels = partial progress toward the next purchase).
 */
const expectedCache: Upgrades[] = [];
export function expectedUpgrades(n: number): Upgrades {
  if (!expectedCache.length) {
    const u = { ...NO_UPGRADES };
    let gold = 0;
    const next = (id: 'rate' | 'power') => UPGRADES[id].cost(Math.floor(u[id]));
    const pick = (): 'rate' | 'power' => (!UPGRADES.rate.maxed(u.rate) && next('rate') <= next('power') ? 'rate' : 'power');
    for (let level = 1; level <= 300; level++) {
      const snapshot = { ...u };
      const id = pick();
      snapshot[id] = Math.floor(u[id]) + Math.min(0.99, gold / next(id)); // partial progress keeps the curve smooth
      expectedCache.push(snapshot);
      gold += 0.8 * goldReward(level, true, 1, level % 5 === 0);
      for (;;) {
        const b = pick(), c = next(b);
        if (gold < c) break;
        gold -= c;
        u[b] = Math.floor(u[b]) + 1;
      }
    }
  }
  return { ...expectedCache[Math.min(299, Math.max(0, n - 1))] };
}

/** Damage per second of a steady stream (before gates). */
export const streamDps = (u: Upgrades) => damage(u.power) / fireInterval(u.rate);

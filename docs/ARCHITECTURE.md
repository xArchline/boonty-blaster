# Architecture

Vite + TypeScript + Canvas 2D. There's no game engine, and the only runtime dependencies are the browser APIs.

```
index.html        canvas + 3 DOM overlay screens (title / win / lose)
src/main.ts       boot, fixed 120 Hz sim step, input (pointer events), screen flow, save (localStorage)
src/sim.ts        pure game logic: createState(level) / step(state, dt). No DOM. Emits `events` for FX
src/levels.ts     levelDef(n): 3 handmade levels, then generated from n (deterministic)
src/render.ts     Renderer: letterboxed 540x960 world, particles, shake, HUD. Consumes sim events
src/art.ts        brand palette + vector hedgehog / Grump drawings, cached as offscreen sprites
src/biomes.ts     8 landscapes (meadow, beach, autumn, snow, desert, candy, night garden, lava): background painter + menu colours
src/upgrades.ts   gold rewards, unlimited upgrade costs/effects, simulated 'typical player' curve used for level scaling
src/audio.ts      procedural WebAudio music + SFX
public/assets     4 mascot portraits (webp, cropped from Laury's renders), logo + icon SVG
public/fonts      Delight Black / ExtraBold (brand font)
scripts/bot.ts    heuristic bot (used by tests and `npm run balance`)
scripts/playtest.mjs  Playwright run against the dev server: plays level 1, screenshots, checks for errors
tests/sim.test.ts vitest: firing, gate multiply-once, pops, win, lose, restart, level sanity, bot wins 1-5
```

Rules:
- Gameplay changes go in `sim.ts` / `levels.ts` and stay testable headless. Visual changes go in `render.ts` / `art.ts`.
- The sim never reads time or randomness from outside itself (it has its own seeded RNG), so runs are reproducible.
- Playtest: run `npm run dev` in one terminal, then `npm run playtest` (`START_LEVEL=5` to begin later).

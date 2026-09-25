# Decisions

- 2026-09-24: Concepts are shown as static canvas mockups rendered by headless Chromium. That's cheap to produce and uses the same drawing style a Canvas 2D game would use.

- 2026-09-24: Laury picked concept B, Boonty Blaster.
- 2026-09-24: Canvas 2D + Vite, no engine. The game needs sprites, particles and simple circle collisions, and an engine would add weight without gameplay benefit.
- 2026-09-24: In-game characters are vector drawings in the style of the brand hedgehog (hundreds on screen need to be tiny and fast). The real 3D renders are used only as round portraits on the menu screens. Background removal on the white renders failed (white fur against a white background), so we use circle crops.
- 2026-09-24: Enemies are orange "Grumps" (brand Orange 500/900) so they contrast with the white/lavender heroes.
- 2026-09-24: Minis curve toward the castle above y=330, so gates anywhere on the field stay useful and aiming is about gates and defence, not about hitting the castle.
- 2026-09-24: 3 hearts instead of instant loss when a Grump reaches you. That's more forgiving for first sessions and still leaves a "so close" loss state.
- 2026-09-24: Delight font is freeware (commercial use OK, no standalone redistribution). It's embedded as a webfont in the game only.
- 2026-09-24 (M2): Music is procedural WebAudio, written by an audio agent in its own module. That means no licensing, no asset weight, and intensity can follow the gameplay.
- 2026-09-24 (M2): Popped Grumps damage the castle. Without this, levels could turn into endless defence (a bot ran 240 s on level 8). That was the "just longer" boredom Laury reported.
- 2026-09-24 (M2): Variety over length. Each handmade level adds one twist, and generated levels rotate flavours with capped length.
- 2026-09-24 (M3): Laury asked for "more characters" and "special effects". We answered with 3 heroes, each with one SUPER, rather than coin upgrades. It adds variety and a big spectacle moment, reuses the real mascot renders, and it's one button.
- 2026-09-24 (M3): Bosses are duels (Laury: "harder, alone"). Minis home toward the King only with limited turning, so gates still matter and sidesteps can dodge. Generated duels use one fixed fair layout; only the King's stats grow. Random layouts made win rates jump between 17% and 92%.
- 2026-09-24 (M3): Supers don't feed their own meter. In the first version, golden rush refilled itself in about 1 s.
- 2026-09-25: Upgrades use a simulated economy. The "expected player" curve is derived from the real gold rewards and costs, so level HP scaling and the shop can't drift apart. HP keeps scaling above the tuned level (f > 1) so upgrades keep mattering. Laury: "no need to soften if the upgrades do the trick."
- 2026-09-25: Starting fire rate is 3.3/s, not the 1/s Laury gave as an example. With ×2 and ×3 gates, 1/s leaves the stream too thin to read as a swarm. It's one constant in `fireInterval()`.
- 2026-09-25: New mechanics were picked by a design agent for fun per effort (growing gate, splitter, crates, mega gate, plus bumpers and last stand). Each one creates an aiming decision, and none needs a new control.
- 2026-09-25: Existing saves from before the shop get a one-time gold grant (80% of what their levels would have paid), so late levels don't become a wall overnight.
- 2026-09-25: Upgrades have no cap (Laury: "infinite possibilities"). Fire rate alone stops at 40/s: beyond that the mini cap and perf make more pointless, and power keeps scaling instead.
- 2026-09-25: Difficulty waves (×0.45 → ×1.05 over 5 levels) give Laury's "feel almost like a god, then get challenged" rhythm on purpose, instead of a flat curve.
- 2026-09-25: Cool Boonty against the King: he's frozen only 1.5 s and takes no double damage. Laury: "almost too simple against the boss".
- 2026-09-25: Landscapes are procedural canvas paintings (one file, `src/biomes.ts`, by an art agent). No image assets, deterministic, and painted once per land.
- 2026-09-25: Difficulty blends typical and actual player power (geometric mean), so over-upgrading still helps but can't give a permanent god mode. The waves keep the planned god moments.
- 2026-09-25: Hosting goes on GitHub Pages via Actions with a relative base, so the same build later drops into Capacitor for the stores. Publishing waits for the owner's go-ahead (repo visibility, font files).

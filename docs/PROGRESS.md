# Progress

## 2026-09-24: Concept round
- Replaced placeholder STATUS.md (it described work that didn't exist) with the real state.
- Researched ad-style mechanics; proposed 4 concepts with mockups: `docs/concepts/`.
- Recommendation: B "Boonty Blaster" (hold-to-fire cannon + multiplier gates). Runner-up: C "Boonty Drop".
- Awaiting Laury's pick.

## 2026-09-24: M1 playable prototype
- Laury chose B, Boonty Blaster, and shared brand assets. We took the palette, Delight font, logo, and 4 poses.
- Built the core loop (see GAME_DESIGN.md). Balance bot: level 1 ≈ 18 s, level 2 ≈ 21 s, level 3 ≈ 30 s, climbing to 45–75 s by levels 9–11.
- Automated playtest found the stream too sparse and labels hidden under the swarm. Fixed: faster fire, bigger minis, labels drawn on top.
- QA agent review. Fixed: multi-touch stopping fire, result screen skipped by stray taps, landscape zone edges, sprite cache growth on resize, confusing lose text. **Design fix:** Grumps homed on the cannon, so aiming never mattered. They now fan out into lanes, and a test checks that a never-moving player loses.
- Waiting on Laury's playtest.

## 2026-09-24: Laury's M1 playtest → M2
Feedback: "The music is missing. Too easy until level 10, then harder, which was better. After that it was repetitive and just longer, even boring."
- Music + SFX: procedural, built by an audio agent in parallel (verified: no clipping, no node leaks).
- The curve is compressed: pressure starts at level 2, and levels 2–10 are faster and denser.
- Variety: rushes, Big Grumps, King Grump bosses, red ÷2 trap gates, Zippy Grumps, "NEW!" intro banners, flavoured generated levels.
- No stalemates: pops damage the castle, and length is capped at about 25–60 s (bot data).

## 2026-09-24: Laury's M2 playtest → M3
Feedback: "I cannot restart to level 1... menu to start from beginning or resume. Music is better. Bosses almost too simple, harder and alone? More fun, less repeatable: more characters? special effects."
- Menus: continue / new game on the title; try again / start over / menu on loss. The E2E check found and fixed a bug where the menu showed a stale level after a win.
- Boss duels: King alone, sidesteps, golden shield, rage phase. Bot win rate goes 83% (level 5) → 67% (10) → 75% (15) → 58% (20) → 33% (25).
- 3 heroes with supers (knight charge, balloon bombs, golden rush), unlocked at levels 1 / 4 / 8.
- Special effects: flash, shockwave rings, slow motion on King down, shield bubble, gold minis.
- Mid-work note from Laury (level 19): "difficulty is fine, even easy with the super power". Fixed supers refilling themselves, slowed super charging, and raised the pressure on levels 11+.

## 2026-09-25: Laury's M3 playtest → M4 (upgrades + new mechanics), done overnight
Feedback: "Cannot beat level 25. Heroes are nice (balloon good vs mobs, king for castle damage). Start weaker and level up with gold between levels. More damage per Boonty too. No need to soften if upgrades do the trick. Add enemy styles, Boonty styles, other gates, walls, any ideas."
- Gold and shop: fire rate, Boonty Power, Super Charge, Extra Heart. Losses pay gold. The shop is on every menu screen. Old saves get a one-time grant.
- Levels scale with a simulated typical player's upgrades. Level 25 with typical upgrades: 8% casual win; with 5 levels' more upgrades: 58%.
- Design agent ranked 10 ideas. Built: growing gate, Splitter Grump, crate walls, Mega gate, bumpers, LAST STAND finale. New handmade levels 11-17; generated levels mix one field element with one enemy flavour.
- 4th hero: Cool Boonty (sunglasses render), whose SUPER freezes all Grumps for 4 s with double damage.
- QA agent found 6 bugs, all fixed with regression tests: double migration grant, freeze refilling its meter, mega multi-hitting, CTAs off-screen on small phones, unvalidated saved upgrades (could hang the game), unclear mega trade-off.

## 2026-09-25: Laury's M4 playtest → M5 (infinite upgrades, waves, menus, landscapes)
Feedback: "Keep New Game but add a reset in the settings. No limit on upgrades. Enemies should hit the walls. Doors to open. I need a menu button in the game. Show the earned gold better. It's frustrating to max out so quickly; I want to feel almost like a god for a few levels, then get challenged. Ice Boonty almost too simple against the boss. I don't like the purple; I want landscapes."
- Me: unlimited upgrades plus exponential gold; difficulty waves; Grumps blocked by crates and chewing through them; locked ×4 doors (level 18 plus generated levels); King freeze nerf; hearts HUD compacts past 4.
- UI agent: pause button and menu (resume / restart / menu, auto-pause on a hidden tab); settings with a full reset (confirm tap); animated gold count-up on win and lose; "Lv N" upgrade cards. 20 E2E checks at 2 sizes pass.
- Art agent: 8 landscapes; menus tinted per land; new-land banner.

## 2026-09-25: Laury's M5 playtest → M5.1
Feedback: "It feels good from 0. From level 18 lots of changes, it felt amazing with the new mechanisms and landscapes; hope it keeps providing new mechanisms. Doors good. Freeze: the King stops, then walks around still in the ice. Needs a blink showing it's moving again. New enemies are cool, maybe more colours and styles later. Overall it's getting very good now."
- Fixed the freeze visuals: the King's ice only lasts while he's actually frozen, the ice blinks before thawing, and shards fly when it breaks.
- New Grumps with new colours: Iron (22), Thief (27), Healer (32). After that they join the random mix. +3 tests (31 total).

## 2026-09-25: Laury's M5.1 feedback → M6
Feedback (level 29; build: More Boonties 15, Power 12, Super Charge 6, Hearts 0): "Everything except bosses is simple; I already feel in god mode. Enemies must get tougher as I advance. Couldn't see the new mobs (too strong). Add more. Host on my GitHub. Could it go to the App Store / Android?"
- Difficulty now uses the geometric mean of the typical player's firepower and the player's own. Regular Grumps' HP grows with damage and level. A late multiplier applies past level 12, pressure keeps rising past 35, and rush Grumps get half HP. With Laury's build: wave-low levels are won in about 15 s, others take 20–60 s, and pre-boss levels and bosses are real fights.
- New: Gate Carriers (37: pop both carriers to capture their ×3 gate), Twin Lanes (42: stone divider splits the field). Both join the random mix afterwards. 33 tests.
- "Boontys" became "Boonties" everywhere.
- Release agent: relative base path, PWA (manifest, icons, offline service worker), GitHub Actions Pages workflow, docs/DEPLOY.md with the store path via Capacitor. The build is verified served from a subpath: no 404s, service worker registered. The local branch is renamed to `main`.

## 2026-09-25: Laury's M6 feedback → M6.1 (published)
Feedback: "Fun overall, I've become very good but I see difficulty. Bosses repeat, and their difficulty is random: if he goes behind the ×3 I win, otherwise impossible, so I restart until he takes the right path. Stone column lanes were nice, have more of them. OK to publish on GitHub, public. Ads later (from level 25, remove by donation, ads for coins). God level at 48 (upgrades 24/21/15/4)."
- **Published:** https://xarchline.github.io/boonty-blaster/ (public repo xArchline/boonty-blaster, fresh history without font files, font from a CI secret, deployed on every push).
- **Bosses:** 4 styles (Classic, Sweeper, Charger with arrow, Trickster with ghost). The duel ×3 slides across the field. HP is derived from firepower × fight length (the old formula made late Kings near-impossible). The bot now anticipates like a human.
- **Late game:** steeper curve (1 + (n−12)/24), tougher regular Grumps. With Laury's level-48 build, the bots win 33–100% per level instead of ~90%.
- **Twin Lanes:** more frequent after 42, especially right after a boss.
- **Ads:** explained in docs/MONETIZATION.md, not implemented.

## 2026-09-25: Laury's M6.1 feedback → M7 (polish + balance)
Feedback: "Strong but challenged at level 55, died once, all good. The link works on mobile. Make a nicer sprite for the Boonty at the bottom (the balloon one is cut). The main menu isn't pretty, see the example images; rework the UI in general. We're near the end of dev. Also harder from ~level 10 so I have to lose a few times to upgrade; challenge, but not constantly."
- Hero art: a detailed hedgehog (cream-tipped two-layer quills, glossy eyes, blush, open smile, waving arms), a wooden cannon with brass bands and spoked wheels, a bigger hero. Balloon clipping fixed (sprite padding). SUPER button fills like a gauge.
- Balance: the late multiplier starts at level 8 (steeper to 30, gentler after), softer post-boss dip. Found and fixed: Grumps piling up unshootable behind crates (they now walk around to the gap), rushes too tough at high minion HP (rush Grumps ~1 hit), Zippies fast and tough (now half HP), Iron/Splitter/Thief/Healer HP tied to Big HP (now multiples of a regular Grump).
- UI agent: storybook/wooden redesign of the title and every menu, with Laury's reference art as the title backdrop.

# Boonty Blaster: Game Design

## One-liner
Hold to fire a stream of mini Boonty hedgehogs. Aim them through multiplier gates to flood the Grumps' castle before the Grumps reach you.

## 10-second read
- Finger down = fire. Drag = aim (the cannon follows your finger along the bottom).
- Blue/yellow gates multiply every mini that passes through them (×2, ×3).
- Orange Grumps walk down toward you. A mini that touches a Grump pops both of them.
- Minis that reach the castle chip its HP. The castle reaches 0 → WIN.
- A Grump that reaches your line costs a heart. 0 hearts → LOSE.

## Core loop (one level, 45–90 s)
Aim at a gate → watch the stream multiply → redirect to stop a rush of Grumps → back to the castle. There's constant tension between farming multipliers and defending.

## Entities
| Thing | Behaviour |
|---|---|
| Cannon (Boonty) | Bottom of screen. x follows the pointer. Fires every `fireInterval` while held |
| Mini | Flies straight up. Each gate triggers at most once per mini. Dies on a Grump or the castle |
| Gate | Horizontal band, ×2 or ×3. Some slide left/right. Clones are spread sideways |
| Grump | hp 1. Walks out of the castle door, then spreads to a random lane (so you must aim to defend) |
| Zippy Grump | small, fast, zig-zags between lanes (level 7+) |
| Big Grump | many HP, slow, larger (level 4+) |
| King Grump | **boss duel** on levels 5, 10, 15... He's alone (no other Grumps) and the castle is just scenery. He advances slowly, sidesteps to a new spot every ~2 s, and raises a golden shield every ~7 s (blocks all damage and stomps forward). Below 50% HP he gets angry: faster and more frequent. In a duel, minis past y=560 bend toward him with limited turning, so you farm gates and then track him. If he crosses the line, it's game over |
| Rush | a wall of Grumps spread across the whole width, on a timer (level 3+). You must sweep |
| Trap gate ÷2 | red. Every other mini that passes through is lost (level 6+) |
| Castle | Top centre, HP bar. Minis hitting it = -1 HP. **Popped Grumps also damage it** (sparks fly to the bar), so defending still moves the level forward |

Mini cap: 350 alive (the oldest extra clones are simply not spawned) to keep mobile fast.

## Levels (after Laury's M1 playtest: "too easy until 10, then repetitive and just longer")
- Levels 1–10 are handmade, and each one introduces or tests one thing: 1 tutorial, 2 aim for ×3, 3 rush, 4 Big Grumps, 5 King Grump, 6 trap gates, 7 Zippies, 8–9 mixes, 10 King + rushes. A "NEW!" banner explains each new element.
- Levels 11+ are generated. Each one picks a flavour (rush / zippy / big / traps), with a boss every 5th level.
- Length is capped at about 25–60 s. Difficulty comes from pressure and new elements, not from more castle HP.
- Balance is checked with `npm run balance` (bots at 3 skill levels). A player who never aims loses from level 2.

## Feedback (M1 minimum)
Pops on kills, a floating label on gate hits, castle flash + small shake on hit, heart loss flash, win confetti, "So close! Castle at 12%" on a loss (near-fail hook).

## Screens
Title (mascot art, Play) → Level → Win (Next) / Lose (Retry). One tap to continue. Progress (current level) is saved locally.

## Field elements (levels 11+)
| Element | Look | Behaviour |
|---|---|---|
| Growing gate ×2↑ | blue gate with a yellow fill bar | Levels up every 25 minis through it, up to ×5. Feed it early, cash in later (level 11) |
| Splitter Grump | chubby orange Grump with a stitched seam | Pops into 3 Zippies where it dies, so hit it high (level 12) |
| Crates | wooden crate row with an HP bar | Block minis until smashed. **Grumps are blocked too and chew through** (Big and King chew fast), so crates also protect you (level 13) |
| Locked door | chained gate with a padlock + HP bar | Absorbs minis until the padlock breaks, then becomes a ×4 gate (level 18+) |
| Iron Grump | dark navy, steel plank in front | The plank soaks many hits before the body can be hit. A MEGA gate is the answer (level 22+) |
| Thief Grump | purple, bandit mask | Walks to your best gate and sits on it. The gate is "STOLEN!" (no multiply) until you pop him. One at a time (level 27+) |
| Healer Grump | green with a white cross | Heals nearby Grumps once a second (green ring). Pop it first (level 32+) |
Freeze visuals: the ice blinks during its last 0.8 s and shatters into shards when it thaws. The King's ice lasts 1.5 s.
| ★ MEGA gate | lavender gate | Every 5 minis fuse into one helmeted Mega Boonty: 5× damage, pierces 5 Grumps, skips other gates. Great vs rushes and Bigs (level 14) |
| Bumpers | round blue pinball bumpers | Bounce minis sideways for bank shots into side gates (level 16) |
| LAST STAND | banner | Below 15% castle HP, one rush + 2 Bigs, so levels end on a climax (level 17+) |
Generated levels (18+) mix one field element (traps / grow / mega / crates / bumpers) with one enemy flavour (rush / zippy / big / splitter).

## Landscapes
The land changes after every boss (every 5 levels) and cycles: Sunny Meadow, Sandy Beach, Autumn Forest, Snowy Hills, Desert Canyon, Candy Sunset, Firefly Garden, Lava Peaks. The playfield centre stays calm for readability, with scenery at the edges. Menus take the land's colours. A banner names each new land.

## Difficulty waves ("feel like a god, then get challenged")
HP scales with the typical player's upgrades × a 5-level wave: ×0.45 right after a boss, ×0.65, ×0.85, ×1.05, then the King at ×0.95 (flat on levels 1–5). A casual bot wins 100% right after a boss and 17–50% on the level before a boss and on the boss itself.

## Gold and upgrades (from Laury: "start weaker, level up with gold")
**Updated 25 Sep:** there are no level caps (only fire rate stops at 40/s). Gold rewards grow ×1.14 per level (×2 on bosses) and costs grow exponentially, so the numbers keep getting big. The old caps described below no longer apply.
- Gold is paid at the end of every level. A win pays 25 + 8×level (×1.5 on bosses). A loss pays 30–70% of that depending on how close you got, so being stuck always leads to upgrades.
- Shop on the title, win and lose screens:
  - More Boonties: fire rate from 3.3/s to 14/s over 12 levels.
  - Boonty Power: 1.0 to 2.6 damage per mini over 8 levels.
  - Super Charge: +20% per level, 5 levels.
  - Extra Heart: +1 each, 2 levels.
- Levels are balanced against a simulated "typical player" who wins every level and spends 80% of their gold (`expectedUpgrades` in `src/upgrades.ts`). Castle, King and crate HP scale with that player's firepower, so a wall is beaten by upgrading. Grump pressure never scales above the tuned level. On level 25, a casual bot wins 8% with typical upgrades and 58% with 5 more levels' worth.

## Heroes and SUPER (M3, from Laury: "more characters, special effects")
You pick a hero on the title screen. Each has one SUPER, charged by popping Grumps (and by hits on the King). Tap the round button at the bottom right (any finger, or Space) to fire it. Supers never recharge themselves.
| Hero | Unlock | SUPER |
|---|---|---|
| Sir Boonty (helmet) | start | A giant knight charges up the field and flattens every Grump in his path (Big: -30, King: -12%). Hits the castle for 6% |
| Party Boonty (balloon) | reach level 4 | 5 balloon bombs fly to the closest Grumps and burst (radius 110) |
| King Boonty (crown) | reach level 8 | 6 s golden rush: 2.5× fire rate, each mini does double damage |
| Cool Boonty (shades) | reach level 13 | Freezes every Grump and the King for 4 s (it cracks his shield). Frozen enemies take double damage |
Unlocking a hero is announced on the win screen. The portraits are Laury's renders.

## Menus
Title: hero picker, CONTINUE · LEVEL N, NEW GAME · LEVEL 1. Win: NEXT / MENU. Lose: TRY AGAIN · LEVEL N / START OVER · LEVEL 1 / MENU. Highest level reached is kept (hero unlocks survive a new game).

## Special effects
White flash + shockwave ring on supers, slow motion on King down, the King's golden shield bubble, gold minis during golden rush, balloon and knight trails, "HE'S ANGRY!" banner.

## Audio (M2)
Procedural WebAudio (`src/audio.ts`), no audio files. 124 BPM cute marimba/chiptune game loop whose intensity builds as the castle crumbles and with level number, plus a calmer menu loop. SFX for fire, gates, pops, castle hits (pitch rises as the castle weakens), hearts, win/lose, "new" stings. Mute toggle on menu screens (saved).

## Out of scope for now
Coins/upgrades (M3), boosters, skins.

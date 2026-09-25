# BOONTY GAME — LIVE STATUS

Last updated: 25 Sep 2026

## Status
Phase: PAUSED. Laury is happy with the current state ("l'état actuel me convient parfaitement")
Objective: none active; resume from "Next steps" when Laury asks
Orchestrator: STOPPED at Laury's request (2026-09-25)
Active agents: none

## Live
https://xarchline.github.io/boonty-blaster/ (repo github.com/xArchline/boonty-blaster; every push to `main` runs tests + build + deploy)

## Completed (summary; details in docs/PROGRESS.md)
- Boonty Blaster: hold to fire, drag to aim, multiplier gates, castle + Grumps, 3 hearts
- 4 heroes with SUPERs, boss duels in 4 styles, 8 landscapes, ~15 enemy/field mechanics introduced up to level 42 then remixed
- Gold + unlimited upgrades, difficulty waves (god moments after bosses), difficulty blended with the player's power
- Storybook UI (title painting, wood/parchment menus), pause, settings + full reset, music + SFX, PWA (offline, installable)

## Latest
- M7.1: Healer Grumps now hide behind an Iron Grump guard, have more HP and heal themselves (Laury: healer "almost useless"). Waiting on Laury: are healers (level 32+) now worth focusing, and not too hard?

## Next steps (when Laury resumes)
1. **Menu colour:** Laury finds the menus "a bit too brown". Lighten or recolour the wood/parchment toward the brand palette (lavender/yellow accents), keeping the storybook style. The only change Laury asked for.
2. Keep an eye on the balance from level ~10 (goal: lose a few times, then upgrade; challenge not constant).
3. Android app via Capacitor (docs/DEPLOY.md): needs a Google Play account ($25).
4. Ads from level 25, "remove ads" support, rewarded ads for gold (docs/MONETIZATION.md).

## Tests (last run)
- `npm test`: 36/36. lint, tsc, build: pass. UI E2E: 40/40 at 360×640 and 390×844. Live site verified (font, gameplay, no errors)

## Notes
- Never push the local branch `archive/pre-publish`: its history contains the licensed font files. The font reaches CI through the secret `DELIGHT_BLACK_WOFF2_B64`.

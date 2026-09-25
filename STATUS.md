# BOONTY GAME — LIVE STATUS

Last updated: 24 Sep 2026

## Status
Phase: M7 (visual polish + mid-game balance). Published. Waiting on Laury's playtest (near end of dev)
Objective: Laury's M6.1 feedback: nicer hero sprite, storybook menus, harder from ~level 10
Orchestrator: PAUSED until Laury's feedback
Active agents: none

## Live
https://xarchline.github.io/boonty-blaster/ (redeploys on every push to `main`)

## Parallel work (this round)
- UI agent: storybook wood/parchment redesign of the title and all menus. DONE (40/40 E2E checks)

## Completed
- M1–M6.1 (see PROGRESS)
- Detailed hero hedgehog + wooden brass-banded cannon; balloon no longer clipped; SUPER button fills like a gauge
- Title: Laury's forest painting + carved wooden sign; parchment/wood panels everywhere
- Balance from level 8: steeper climb, then gentler; crates funnel Grumps into gaps; fairer rush/Zippy/special HP

## Waiting on Laury
1. On the phone (same link): do the new menus and the hero look right?
2. From ~level 10: do you now lose a few times and need to upgrade, without it being constant?
3. Anything left before calling it done?

## Tests
- `npm test`: 35/35. lint, tsc, build: pass. UI E2E: 40/40 at 360×640 and 390×844. `npm run playtest`: no errors

## Next
1. Final tuning from feedback
2. Later: Android (Capacitor), ads/donations (docs/MONETIZATION.md)

# BOONTY GAME — LIVE STATUS

Last updated: 24 Sep 2026

## Status
Phase: M6.1 (published online, boss styles, harder late game). Waiting on Laury's playtest
Objective: Laury's M6 feedback
Orchestrator: PAUSED until Laury's feedback
Active agents: none

## Live
https://xarchline.github.io/boonty-blaster/ (every push to `main` on github.com/xArchline/boonty-blaster redeploys, after the tests pass)

## Completed
- M1–M6 (see PROGRESS)
- Published (public repo, fonts via CI secret, PWA installable)
- Bosses: 4 learnable styles, sliding ×3, fair HP
- Harder late game; Twin Lanes more often
- docs/MONETIZATION.md: how ads, rewarded ads and "remove ads" support would work (later)

## Waiting on Laury
1. **Play online:** https://xarchline.github.io/boonty-blaster/ (a new site means a fresh save there; your local save stays on localhost). On a phone: Share → Add to Home Screen.
2. **Bosses:** do the 4 styles feel different and fair? Is winning skill now, not path luck?
3. **Level 48+ locally:** still god mode?

## Tests
- `npm test`: 34/34. lint, tsc, build: pass. CI on GitHub: tests + build + deploy green
- Boss screenshots (Sweeper, Trickster ghost, Charger arrow): no errors

## Next
1. Tune from feedback
2. Later: Android app via Capacitor, then ads/donations (docs/MONETIZATION.md)

# BOONTY GAME — LIVE STATUS

Last updated: 24 Sep 2026

## Status
Phase: M6 (harder progression, carriers + twin lanes, release prep). Waiting on Laury: playtest + publishing decision
Objective: Harder late game, more mechanics, host online
Orchestrator: PAUSED until Laury's feedback
Active agents: none

## Parallel work (this round)
- Release agent: PWA + GitHub Pages workflow + docs/DEPLOY.md. DONE, integrated and verified from a subpath

## Completed
- M1–M5.1 (see PROGRESS)
- Difficulty follows your real power (blended with the typical player); Grumps get tougher with levels; late pressure
- Gate Carriers (level 37), Twin Lanes (level 42)
- "Boonties" plural
- Installable web app (PWA, offline), automatic deploy to GitHub Pages ready (nothing published yet)

## Waiting on Laury
1. **Playtest:** continue from level 29. Is it still god mode? Can you see the Iron/Thief/Healer Grumps now? Levels 37 and 42 bring the new mechanics
2. **Publishing decision** (nothing is online yet): repo `xArchline/boonty-blaster`, public or private? The Delight font files shouldn't be public in the source. Recommended: public repo without the font files; the font is stored as a GitHub secret and added at build time.
3. **Stores:** possible via Capacitor (see docs/DEPLOY.md). Needs an Apple Developer account ($99/yr) + a Mac with Xcode for iOS, and Google Play ($25 once) for Android.

## Tests
- `npm test`: 33/33. lint, tsc, build: pass. `npm run playtest`: no errors
- Production build served from /boonty-blaster/: no 404s, service worker OK, playable

## Next
1. Publish once Laury decides (create repo, push, enable Pages)
2. Tune from the playtest
3. If stores: Capacitor setup, icons/splash, privacy policy page

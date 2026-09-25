# Monetization: notes for later (not implemented)

Laury's idea: from level 25, show an ad after each level, unless the player supports the project (a donation of their choice). Players can also watch an ad to earn coins.

## The three standard ad formats
| Format | When | Fits here |
|---|---|---|
| Interstitial (full screen, skippable after about 5 s) | between levels | "after each level from 25". Cap it (for example at most one every 2–3 minutes) or retention drops |
| Rewarded video (the player chooses to watch) | "watch an ad → +X gold" / "double this level's gold" | The best-liked format. It can go on the win/lose screen |
| Banner | always visible | Not recommended: it covers the playfield |

## Where the ads come from
- **Android/iOS app (Capacitor):** Google AdMob via a Capacitor plugin (e.g. `@capacitor-community/admob`). Needs an AdMob account, app and ad-unit IDs, and user consent in the EU (a UMP consent form).
- **Web version:** Google "H5 Games Ads" (AdSense for games, application required), or publish on web game portals (CrazyGames, Poki, GameDistribution), which provide the ad SDK and share revenue.

## "Remove ads" by supporting the project
- **In the store apps:** removing ads is a digital good, so Google Play and the App Store require their own billing (Play Billing / StoreKit, via a Capacitor purchases plugin). "Donation of your choice" is usually done as a few fixed tiers (e.g. 2 €, 5 €, 10 €) of a one-time purchase that removes ads.
- **On the web:** a Ko-fi or Stripe payment link works, but unlocking must be verified somehow (a code the player enters, for example). Simplest first version: a "support us" link with no unlock.

## Implementation sketch (when we do it)
1. An `ads.ts` interface: `showInterstitial()`, `showRewarded(): Promise<boolean>`, `adsRemoved`. It's a no-op on the web at first.
2. Call `showInterstitial()` from `finish()` when level ≥ 25, ads aren't removed and the cap allows it.
3. Add a "Watch ad: +N gold" button on the win and lose screens.
4. A privacy policy update (ads = data collection: IDs for ads) and the consent form.

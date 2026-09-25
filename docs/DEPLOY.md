# Deploy

The build uses a relative base (`base: './'` in `vite.config.ts`). The same `dist/` works at a domain root, under a GitHub Pages subpath and inside a Capacitor webview.

## Publish to GitHub Pages

1. Create the repo on GitHub under `xArchline` (assumed name: `boonty-blaster`).
2. Rename the local branch to `main` if needed (`git branch -m master main`), add the remote and push.
3. On GitHub, go to Settings → Pages → Build and deployment and set Source to **GitHub Actions**.
4. Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci` → `npm test` → `npm run build` → deploy `dist/`. It can also be run by hand from the Actions tab.
5. The game is then served at `https://xarchline.github.io/boonty-blaster/`.

## Changing the repo name

Nothing in the code depends on the name. Rename the repo on GitHub, and the URL becomes `https://xarchline.github.io/<new-name>/`. The only place the name appears is `"name"` in `package.json`, which is cosmetic. A custom domain works too: Settings → Pages → Custom domain.

## PWA / offline

- `public/manifest.webmanifest`: fullscreen, portrait, and the icons in `public/icons/`, which are generated from `public/assets/icon.svg`.
- `public/sw.js`: cache-first for files and network-first for the page. At build time, `vite.config.ts` stamps it with a new cache version and the list of every file in `dist/`, so each deploy replaces the old cache. It's registered in production only, from `src/main.ts`.
- To regenerate the icons (ImageMagick):
  `magick -background none -density 600 public/assets/icon.svg -resize 512x512 -depth 8 public/icons/icon-512.png` (repeat with 192). The maskable and apple-touch icons are the glyph (the SVG without its `<rect>`) centred on a full-bleed #FEE580 square, at about 59% and 83% of the width.

## App Store / Play Store (Capacitor)

**Accounts and hardware**
- iOS: Apple Developer Program ($99/year), plus a Mac with Xcode to build, sign and upload.
- Android: Google Play Console ($25 once). Android Studio runs on Linux.

**Steps**
1. `npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/android`
2. `npx cap init "Boonty Blaster" io.boonty.blaster --web-dir dist`
3. `npm run build && npx cap add ios && npx cap add android`
4. After each web change: `npm run build && npx cap sync`, then build or sign in Xcode / Android Studio.
5. Lock portrait in the native projects (Info.plist `UISupportedInterfaceOrientations`, and `android:screenOrientation="portrait"`).

**Still missing**
- Store screenshots (iPhone 6.7"/6.5", iPad if supported; Play: phone and a 1024×500 feature graphic).
- A privacy policy URL, required by both stores. The game stores progress only in localStorage and has no tracking, so it can be short, but it has to exist and match the store privacy forms (App Privacy "Data Not Collected", Play Data safety).
- Native app icons (1024×1024 with no transparency for iOS; Android adaptive icon) and a splash screen: `@capacitor/assets` can generate both from one source image.
- Age rating questionnaires (cartoon, non-graphic violence).
- Store listing text, support URL and a contact email.

**Known constraints**
- Audio: WebAudio starts suspended until a user gesture on iOS and Android webviews. The AudioContext has to be created or resumed inside the first tap handler. Check this on a real device. The iOS silent switch mutes WebAudio.
- Safe areas: `viewport-fit=cover` is set, so the notch and home indicator overlap the page. HUD and buttons must respect `env(safe-area-inset-*)`.
- The service worker doesn't run for Capacitor's native scheme, which is harmless because files are bundled. Don't rely on it in the app.
- Apple guideline 4.2 (minimum functionality) rejects thin web wrappers. A complete offline game is usually fine, but adding native touches (haptics, for example) lowers the risk.
- localStorage in a webview can be cleared by the OS under storage pressure. `@capacitor/preferences` is more durable if progress matters.

## Font licence (owner decision)

The Delight licence allows embedding the font in the game, but not redistributing the raw font files on their own. A **public** repo exposes `public/fonts/*.woff2` as downloadable files in the source tree. The deployed site serves them too, but that is normal web embedding. Options:
- A private repo with Pages. This needs a paid GitHub plan (Pro/Team).
- A public repo without the fonts. Add `public/fonts/` to `.gitignore` and provide the files to CI some other way, for example as a base64 secret decoded in the workflow before `npm run build`, or from a private storage URL.
- Check with the font vendor whether a public source repo is acceptable.

## Decision (2026-09-25)
Public repo `xArchline/boonty-blaster`. `public/fonts/` is git-ignored. CI writes `Delight-Black.woff2` from the repo secret `DELIGHT_BLACK_WOFF2_B64` (base64 of the file) before building. To update it: `base64 -w0 public/fonts/Delight-Black.woff2 | gh secret set DELIGHT_BLACK_WOFF2_B64`. The earlier local history (which contains the font files) lives only in the local branch `archive/pre-publish` and must never be pushed.

# Changelog

All significant changes to this system are documented here.

---

## [2026-08-07] Session: 16:00

### Summary

Fixed three issues reported after the mobile PWA rebuild went live: cropped/framed photos that
silently failed to import, a slideshow schedule editor that showed every field regardless of
trigger type, and a request to support Android's "Share to Syncjoy" flow. Diagnosed the crop
import bug against the real Inkjoy backend (real account, real device) with a battery of Playwright
repros rather than guesswork — found and fixed a genuine implementation bug, not a config issue.

### Changes

**Crop import fix**
- Root cause: the Crop screen's final "Done" button was wired to `goBack()`, only returning to the
  Review screen, instead of confirming the import — a deviation from the design handoff's own
  `Crop → Importing → Done` flow diagram. Rewired `onFinish` to call `handleConfirmImport` directly.
- Closed a related race: `pickTargetAlbumId` could still be empty when Crop's "Done" was tapped if
  albums hadn't finished loading when the Add Photos sheet opened, causing a silent no-op. Added an
  effect that keeps it synced to a valid album once the list loads.
- `Done` screen now distinguishes a real failure (shows the actual error, "Try again") from success,
  instead of a misleading "0 photos added" success-styled screen.
- Verified end-to-end against the real Inkjoy account and both local dev and the deployed Worker:
  single/multi photo, all crop controls (pan, pinch-zoom equivalent, rotate, matte swatches, fit
  mode), before concluding it was fixed — cleaned up all test albums/photos created during
  verification afterward.

**Slideshow edit form**
- Rebuilt `SlideshowSettingsForm` as a controlled component that branches on trigger type instead of
  showing every field always: `Interval` gets an All day / Specific hours radio (disables Start/End
  when all day); `Fixed Schedule` gets explanatory copy and a proper add/remove list of switching
  times (previously a raw comma-separated text input).
- Confirmed via `docs/research.md` that `updateDays`, `beginTime`/`endTime`/`intervalMinutes`, and
  `updateTimeList` were already wired to the real `devicePlayStrategy` API — the bug was purely that
  the UI didn't make clear which fields applied to which trigger type.
- Bonus fixes found while rebuilding: the sheet now pre-fills from the frame's actual active
  schedule when editing (previously always reset to hardcoded defaults), and reuses the active
  carousel's `strategyId` so edits update in place instead of leaving orphaned inactive strategies
  behind on Inkjoy's side.

**Android share target**
- Added `share_target` to `public/manifest.webmanifest` (multipart POST, multiple `image/jpeg`
  /`image/png` files under a `photos` field).
- New minimal service worker (`public/share-sw.js`) whose only job is intercepting that one POST —
  it stores shared files in IndexedDB and redirects into the app; no other request is touched, so
  the project's "no caching of API responses" stance is unchanged.
- `src/lib/shareTarget.ts` (new) reads the stored files back out on next launch;
  `src/lib/localPhotos.ts` gained a shared `toLocalPickedPhotos` helper so both the native picker
  and the share-target path produce the same `LocalPickedPhoto` shape.
- Shared photos land the user on the existing Review screen to pick a target album, then flow
  through the same Crop/Importing/Done pipeline unchanged.
- Added a server-side `POST /share-target` fallback (redirects into the app) for the rare case the
  service worker hasn't activated yet; it can't recover the files in that case (no durable photo
  storage), but avoids a 404.

### Git Commits
- `075e0cb` - Fix crop import flow, rebuild slideshow schedule form, add Android share target

### Next Steps
- [ ] Test the Android share target on a real device (the OS-level share sheet entry, multi-file
      share from Google Photos/Gallery) — verified locally via simulated multipart POST + service
      worker interception, not the actual OS share intent.
- [ ] Test on a real Android phone generally: touch gestures, native picker, install-to-home-screen,
      hardware back gesture (still outstanding from the previous session).
- [ ] Set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` on the deployed Worker if Google Photos import is
      wanted there.
- [ ] Decide whether album rename/delete needs a home in the new design (dropped in the rebuild).
- [ ] This session's fixes are committed locally (`075e0cb`) but not yet deployed — run
      `npm run deploy` to push them to the live Worker for real-device testing.

---

## [2026-08-07] Session: 10:46

### Summary

Two changes landed together: migrated the app's production target from a stale Cloudflare Pages
config to a real Cloudflare Worker (single Hono app serving both `/api/*` and the built frontend,
with local dev running the actual Workers runtime instead of an approximated Node server), and
rebuilt the frontend as a mobile-first PWA per a design handoff (`docs/design_handoff_syncjoy_mobile/`)
— bottom-tab nav, native OS photo picker, and a new crop/framing feature with pan/zoom/rotate and
Spectra 6 ink mattes. Verified with a full type-check, 14 passing Vitest unit tests on the crop
geometry, and Playwright click-throughs of the entire flow on both mobile and desktop viewports with
zero console errors. Deployed to a fresh Worker at `https://inkjoy-syncjoy.ruben-j-peters.workers.dev`
for real-device testing.

### Changes

**Cloudflare Worker migration (infra)**
- Rewrote `server/session.ts` off `node:crypto`/`Buffer` onto Web Crypto (AES-GCM via
  `crypto.subtle`), so the same code runs identically in local dev and production.
- Threaded config (`SESSION_SECRET`, `GOOGLE_CLIENT_ID`, etc.) through Hono's `c.env` instead of
  `process.env` in `server/session.ts` and `server/google.ts`; `server/index.ts` now exports the
  Hono app directly (`export default app`) instead of booting `@hono/node-server`.
- `wrangler.toml` rewritten as a real Worker config (`main`, `[assets]` binding, SPA fallback,
  `[vars] PUBLIC_APP_URL`), replacing the old `pages_build_output_dir` config. Removed the empty
  `functions/` (Pages Functions) directory.
- Local dev now runs on the real Workers runtime via `@cloudflare/vite-plugin` (`npm run dev` is a
  single process/port) instead of two Node processes proxied through Vite.
- Split `tsconfig.json` into `tsconfig.app.json` (DOM lib, `src/`) and `tsconfig.server.json`
  (`@cloudflare/workers-types`, `server/`) to avoid ambient type collisions.
- `.env.example` replaced by `.dev.vars.example` (Wrangler's local-secrets convention).

**Mobile-first PWA rebuild (frontend)**
- Split the single 1490-line `src/main.tsx` into `src/components/`, `src/screens/`, and `src/lib/`
  modules.
- New bottom-tab-bar + FAB navigation (`useIsMobile` hook, width-based breakpoint) replacing the
  sidebar on mobile viewports, with `history.pushState`/`popstate` sync so hardware/gesture back
  closes pushed screens correctly.
- New screens: Album Detail and Frame Detail as full-screen pushed views, an Add Photos bottom
  sheet (native `<input type=file>` picker on mobile, file upload + the existing Google Photos
  Picker flow on desktop), and a new Review → Crop → Importing → Done import pipeline.
- New crop/framing feature (`src/lib/crop.ts`, `src/screens/Crop.tsx`,
  `src/lib/compositeCanvas.ts`): fill/fit modes, pointer-based pan and pinch-zoom, rotation, and
  Spectra 6 ink matte or blurred-photo borders, composited client-side via `<canvas>` at the
  frame's native resolution.
- New `POST /api/inkjoy/albums/:albumId/photos` endpoint to upload the composited images (the
  Inkjoy bearer token never leaves the server).
- New installable PWA manifest and icons (`public/manifest.webmanifest`,
  `scripts/generate-icons.mjs`) generated from the existing CSS-drawn logo mark — no service worker
  (API responses are session-authenticated and must not be cached).
- Desktop's Google Photos Picker path was left on its pre-existing direct-import mechanism
  (no crop step), matching the design handoff's own description of that row.

**Scope trims** (design handoff didn't specify these, so functionality was dropped rather than
guessed): the standalone "Google Photos" sidebar tab and per-album rename/delete UI.

### Deployment

- Deployed to a new Worker (`inkjoy-syncjoy`) on Cloudflare account `ruben.j.peters@gmail.com`:
  `https://inkjoy-syncjoy.ruben-j-peters.workers.dev`.
- `SESSION_SECRET` set via `wrangler secret put`. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are
  **not** set on this deployment yet, so Google Photos import won't work there until added.

### Next Steps

- [ ] Test on a real Android phone: touch gestures on the crop screen, native photo picker,
      "Add to Home Screen" installability, hardware back gesture.
- [ ] If desktop Google Photos import is wanted on the deployed Worker, set `GOOGLE_CLIENT_ID` /
      `GOOGLE_CLIENT_SECRET` via `wrangler secret put` and authorize this Worker's origin on the
      OAuth client.
- [ ] Decide whether album rename/delete needs a home in the new design (dropped this session).
- [ ] Crop target aspect currently comes from the selected frame's resolution (falls back to a
      1200×1600 default) — revisit if a single album needs to serve multiple differently-shaped
      frames.

---

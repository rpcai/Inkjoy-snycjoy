# Handoff: Syncjoy Mobile — Android PWA photo flow + crop

## Overview

Syncjoy (`rpcai/Inkjoy-snycjoy`) is today a desktop-first Vite/React/TS web app for managing Inkjoy
e-ink frames: sign in, list frames, manage personal albums, import from Google Photos via the Picker
API, and configure device play strategies ("slideshows").

This handoff covers a **pivot to mobile**, plus the feature that is the current product's biggest
shortcoming: **framing/cropping photos for the panel**.

Three changes drive everything below:

1. **Android PWA is the primary target.** On mobile the Google Photos Picker popup is the wrong
   mechanism — the phone already has the photos. Mobile uses a native-feeling **Collections** picker
   (system photo picker / `<input type="file" accept="image/*" multiple>` backed by the Android photo
   picker, which surfaces Google Photos, Camera, Screenshots, Downloads).
2. **Desktop keeps both paths**: local file upload **or** the existing Google Photos Picker flow.
   The Picker is explicitly presented as desktop-only in mobile UI.
3. **Framing is a first-class step**, not an implicit server-side center-crop. The panel is a fixed
   aspect Spectra 6 device; the user decides what gets trimmed.

## About the design files

`Syncjoy Mobile.dc.html` in this bundle is a **design reference created in HTML** — an interactive
prototype demonstrating intended layout, states and behaviour. It is **not production code to copy**.
It uses a small streaming-template runtime that does not exist in the Syncjoy repo.

The task is to **recreate these designs inside the existing codebase** — Vite + React 18 +
TypeScript, `lucide-react` icons, plain CSS in `src/styles.css` — following its established
patterns (view state in `App`, `api.*` calls in `src/lib/api.ts`, CSS classes rather than inline
styles, CSS custom properties from `:root`).

## Fidelity

**High fidelity.** Colours, type scale, spacing, radii and interaction behaviour below are final and
should be matched. Where a value conflicts with an existing `src/styles.css` token, prefer the
existing token — the mobile design was built from that palette on purpose.

Placeholder photography in the prototype comes from `picsum.photos` and must be replaced by real
Inkjoy album/frame thumbnails (`coverImgThumbnail`, `thumbnailUrl`, `lastPlayThumbnailUrl`).

---

## Design tokens

Reuse the existing `:root` tokens in `src/styles.css`; the mobile design adds nothing new except the
Spectra 6 ink set.

| Token | Value | Use |
| --- | --- | --- |
| `--primary` | `#2d5a4a` | app bar, primary buttons, active states, selection rings |
| `--primary-dark` | `#1e4538` | pressed primary, deep text on `--primary-light` |
| `--primary-light` | `#eef2ef` | selected surfaces, schedule panel |
| `--bg` | `#f7f5f2` | screen background |
| `--card` | `#ffffff` | cards, sheets, app bars on inner screens |
| `--text` | `#1e293b` | body text |
| `--text-muted` | `#64748b` | secondary text |
| `--border` | `#e2e8f0` | 1–1.5px borders, dividers |
| `--danger` | `#ef4444` | offline dot, destructive |
| `--success` | `#22c55e` | import CTA (`btn-success`) |
| — | `#94a3b8` | tertiary/disabled text, inactive tab icons |
| — | `#f59e0b` | "needs framing" flag dot |
| — | `#fffbeb` / `#fcd34d` / `#b45309` | crop-warning card bg / border / icon |
| — | `#14181c` | crop screen background (photo-editor dark) |
| — | `#8fd4b4` | selected control accent **on the dark crop screen only** |

**Spectra 6 native inks** (supplied by product; the only non-dithering matte colours):

| Name | Hex | RGB |
| --- | --- | --- |
| Black | `#000000` | 0, 0, 0 |
| White | `#FFFFFF` | 255, 255, 255 |
| Red | `#A02020` | 160, 32, 32 |
| Yellow | `#F0E050` | 240, 224, 80 |
| Green | `#608050` | 96, 128, 80 |
| Blue | `#5080B8` | 80, 128, 184 |

Any other matte colour will dither on the panel. **Do not offer a free colour picker.**

### Type

Modernised from the current `-apple-system` stack: **Manrope** (400/500/600/700/800), fallback
`system-ui, sans-serif`. The `InkJoy` wordmark stays **Georgia, serif, 800**, as in
`.syncjoy-wordmark span`.

| Role | Size / weight |
| --- | --- |
| Screen title | 19–20px / 800, `letter-spacing:-.01em` |
| App bar title (inner) | 16px / 800 |
| Section heading | 17px / 800 |
| Card title | 13.5–15px / 800 |
| Body | 13px / 600–700 |
| Secondary | 11.5–12.5px / 600–700 |
| Meta / caption | 10.5–11px / 600–800 |
| Mono (filenames, ratios) | `ui-monospace, Menlo, monospace`, 8–10px / 600–700 |

Minimum tap target 44px; icon buttons 34–40px square with padding to reach 44.

### Spacing, radius, elevation

- Screen padding 16–18px; bottom padding 108px where the tab bar overlays.
- Grid gaps: albums 12–13px, album photo grid 6px, picker grid 4px, filmstrip 6px.
- Radii: sheets 24px top, cards 16–18px, controls 12–14px, chips/pills 999px, photo tiles 4–10px,
  **frame bezel 2–4px** (a real frame has square corners — never round the panel).
- Card shadow `0 1px 3px rgba(15,23,42,.05)`; FAB `0 8px 20px rgba(45,90,74,.35)`;
  bottom action bars `0 -6px 20px rgba(15,23,42,.07)`.
- Frame bezel treatment (from `.device-frame`): `border: 2–3px solid #8a5a2b` with
  `box-shadow: inset 0 0 0 2–3px #f5f1dc` (wood + mount board).

---

## Navigation model

Bottom bar with two tabs and a centre FAB, over a stack:

```
Frames (home)  ──▶ Frame detail ──▶ [sheet] Edit slideshow
      │
      ├─ FAB ─▶ [sheet] Add photos ─▶ Collections picker ─▶ Review ─▶ Crop ─▶ Importing ─▶ Done
      │
Albums ──▶ Album detail ──▶ + Add ─▶ (same picker flow, album pre-selected as target)
```

- Tab bar is visible only on **Frames** and **Albums**. Every pushed screen has its own app bar with
  a back affordance and hides the tab bar.
- Android hardware/gesture back must map to the same pop as the in-app back:
  Review → Picker → origin (Home **or** the album you came from), Crop → Review.

---

## Screens

### 1. Frames (home)

**Purpose:** see frames at a glance, jump into a frame or into adding photos.

- **App bar** — `--primary` background, 14px 18px padding. Left: compact Syncjoy logo (existing
  `.syncjoy-logo.compact` markup — 30px mark, Georgia "InkJoy" 15px/800 white, "SYNCJOY" 9px/800
  uppercase `rgba(255,255,255,.66)`). Right: region pill ("Global",
  `rgba(255,255,255,.15)` on `1px rgba(255,255,255,.2)`, 11px/600) and a 34px refresh icon button.
- **Toast** (optional) — `#f0fdf4` bg, `1px #86efac`, `#166534` text, 13px/700, radius 14px.
  Matches `.toast-success`.
- **"My frames"** heading 19px/800 with `{n} connected` 12px/700 muted on the right.
- **Frame card** — white, `1.5px --border`, radius 18px, padding 14px, 14px gap row:
  - Bezel thumbnail: 76px tall; **56px wide portrait / 100px wide landscape** (derive from
    `device.orientation === 90 || 270` → landscape, exactly as `.device-frame.landscape` does).
    Fill with `lastPlayThumbnailUrl`, `object-fit: cover`.
  - Name 15px/800; status dot 7px (`#34c759` online / `#ef4444` offline) + status word 11px/700 muted.
  - "Now playing · {album}" 12px/600 muted, ellipsised.
  - Schedule summary 11px/600 `#94a3b8` — e.g. "Every 2 h · 09:00–18:00 · Sequential".
  - Chevron 18px `#cbd5e1`, vertically centred.
- **"Recent albums"** — 2-column grid, 1.35 aspect cover, name 13px/800, "{n} photos" 11px/700 muted.

### 2. Albums

- White app bar, "Albums" 20px/800, **New** primary button (plus icon, 12.5px/700, radius 11px).
- 2-column grid, square covers, `1.5px --border`, radius 16px.
- Tapping a card opens album detail.

### 3. Album detail

- App bar: 40px back button, title 16px/800 + "{n} photos · synced" 11.5px/600 muted,
  and a primary **+ Add** button on the right.
- **`+ Add` starts the picker flow with this album pre-set as the import target** and returns here
  on back/finish. (It replaced a "Select" toggle that did nothing.)
- 3-column photo grid, 6px gap, square tiles, radius 10px.
- Tapping a photo enters selection mode: `inset 0 0 0 3px var(--primary)` ring + 20px check badge
  top-right (mirrors `.photo-card.selected`).
- Selection action bar pinned to the bottom: "{n} selected", **Cancel**, **Delete**
  (`#fef2f2` bg, `1.5px #fecaca`, `#991b1b` — the existing `.btn-danger`).
  Wire to `POST /api/v1/album/img/del`.

### 4. Add photos sheet (from FAB)

Bottom sheet, radius 24px top, 36×4px grab handle, title 17px/800, subtitle 12.5px/600 muted.
Three rows:

1. **Phone collections** — highlighted (`--primary-light` bg, `1.5px --primary`), 38px green icon
   tile, "Camera, Screenshots, Google Photos", **Fastest** pill. Opens the system photo picker.
2. **Files** — neutral row, "Downloads, Drive, SD card".
3. **Google Photos Picker** — **disabled**, dashed border, `#94a3b8` text,
   "Desktop only — the phone reads Google Photos directly".

On desktop the third row is enabled and runs the existing Picker session flow
(`api.createPickerSession` → poll → `api.mediaItems` → `api.importGoogleToInkjoy`); rows 1 and 2
collapse into a single local-upload row.

### 5. Collections picker

- Dark-on-white screen; app bar with close (X), "Collections" 16px/800, "On this phone · Google
  Photos" 11.5px/600 muted.
- **Bucket chips** — horizontally scrolling pills (Camera, Google Photos, Screenshots, Downloads);
  selected = `--primary-light` bg / `--primary` border and text.
- **Grid** — 3 columns, 4px gap, square cells with `#eceef0` letterbox background. **The thumbnail
  inside the cell keeps the photo's true aspect ratio** (a 16:9 shot renders as a wide band, not a
  square crop) with a mono ratio badge (`16:9`, `3:4`, …) bottom-left in white with a text shadow.
  This is what makes "this one won't fit" legible before the crop step.
- Selection circle top-right: 20px, `2px rgba(255,255,255,.9)` ring over `rgba(15,23,42,.18)`;
  selected = filled `--primary` + white check, plus a `3px --primary` inset frame on the tile.
- Bottom bar: "{n} selected" / "Tap photos to select" and **Next** (disabled colour `#cbd5e1`).

### 6. Review ("Add to album")

- Horizontal 74px thumbnail strip of the selection.
- **Framing card** (the crop entry point) — full-width button:
  - Needs attention: `1.5px #fcd34d` border, `#fffbeb` icon tile, `#b45309` icon,
    **"{n} photos don't fit the frame"** / "Frame is 3:4 portrait · edges would be trimmed".
  - Resolved: neutral border, green icon tile, "All {n} framed for {frame}" / "Tap to adjust any framing".
  - Trailing "Frame them" button.
  - Count = photos whose aspect differs from the panel aspect by >0.02 **and** that the user has not
    already adjusted.
- **Target album** list — 44px cover, name 13.5px/800, count 11.5px/700 muted, radio circle
  (filled `--primary` + check when selected). Pre-selected when entered from an album.
- Sticky CTA: **Add {n} photos** — `--success` `#22c55e`, 15px/800, radius 15px,
  shadow `0 4px 14px rgba(34,197,94,.32)` (existing `.btn-send-cta`).
- **Imports are add-only.** There is no "play after adding" here — `playNow` belongs to the
  slideshow strategy, matching `api.activateAlbum`.

### 7. Crop / framing  ← the new capability

Dark screen (`#14181c`), full height.

- **App bar:** back, "Frame for {frame name}" 15px/800, "{i} of {n} · 1200 × 1600"
  11px/600 `rgba(255,255,255,.55)`, **Reset** ghost button (clears this photo's adjustment).
- **Stage:** the target frame drawn at panel aspect —
  **portrait 234×312 (3:4), landscape 300×225 (4:3)** in the prototype; compute from
  `device.resolution` at runtime. Bezel is
  `box-shadow: 0 0 0 3px #f5f1dc, 0 0 0 6px #8a5a2b, 0 20px 40px rgba(0,0,0,.45)`, radius 2px,
  `overflow: hidden`, `touch-action: none`.
  - The photo is positioned absolutely, centred, offset by the pan values.
  - Rule-of-thirds grid (`rgba(255,255,255,.55)` hairlines) fades in **only while dragging**.
  - Rotation badge (`90°`) top-left when rotation ≠ 0.
- **Hint line:** "Drag to reposition · pinch or slide to zoom" (fill) /
  "Whole photo shown with a printed border" (fit).
- **Mode row:** `Fill frame` | `Fit whole photo` segmented, plus a 44px rotate button.
  Selected segment = `1.5px #8fd4b4` border, `rgba(143,212,180,.16)` bg, `#bdf0d8` text.
- **Fit mode → Border row:** horizontally scrolling 28px swatches —
  **Blurred photo** (default) then the six Spectra 6 inks. Below: the swatch name on the left and
  **"Spectra 6 inks · no dithering"** 10.5px/600 `rgba(255,255,255,.35)` on the right.
  The blurred border is a copy of the same photo, `blur(22px) saturate(.75) brightness(.82)`,
  overscanned 18% so no soft edge shows.
- **Fill mode → Zoom row:** magnifier glyph, range **100–260, step 2**, accent `#8fd4b4`,
  live percentage 12px/800 on the right.
- **Filmstrip:** 52px thumbnails; current = `2px #8fd4b4`; unresolved = 12px `#f59e0b` dot at the
  top-right with a `2px #14181c` ring.
- **Footer:** `Apply to all` (ghost) and `Next photo` / `Done` (primary green).

**Geometry (implement exactly):**

```
frameA = panelWidth / panelHeight            // 0.75 portrait, 1.333 landscape
a      = rotated90or270 ? 1/photoA : photoA  // effective photo aspect

cover  = a > frameA ? { h: H, w: H * a } : { w: W, h: W / a }
contain= a > frameA ? { w: W, h: W / a } : { h: H, w: H * a }

base   = mode === 'fill' ? cover : contain
size   = mode === 'fill' ? base * (zoom / 100) : base      // zoom is fill-only

limX = max(0, (size.w - W) / 2)     // pan is clamped so no matte leaks in fill mode
limY = max(0, (size.h - H) / 2)
```

Rotation is 0/90/180/270 and **swaps the effective aspect** (so the framing box genuinely changes);
it also recentres the pan.

**Gestures:** track pointers in a `Map<pointerId, {x,y}>` on the stage.
One pointer = pan (clamped). Two pointers = pinch: `zoom = startZoom * (dist / startDist)`, clamped
100–260 and rounded. Release removes the pointer; pinch ends when fewer than two remain. Use
`setPointerCapture`, and `touch-action: none` on the stage.

**Output contract — important:** the preview must be pixel-honest. The composite that gets uploaded
is **photo pixels against matte pixels only**. Do not add a hairline, outline or drop shadow between
the photo and the matte in the export path (an earlier preview affordance did, and was removed).
Export at the panel's native resolution (e.g. 1200×1600) as JPEG/PNG — `POST /api/v1/album/img` takes
multipart jpg/png. Render server- or client-side with canvas from the stored crop transform; the
transform is resolution-independent, so scale `zoom`/`x`/`y` from stage px to panel px by `W_panel / W_stage`.

### 8. Importing / Done

- Importing: 56px spinner (`4px #eef2ef` ring, `--primary` top, 0.9s linear), "Adding photos…",
  "{done} of {total} uploaded", 6px progress bar (`--primary` on `--border`, 0.25s width transition).
  Drive from real per-file upload completions.
- Done: 64px `#dcfce7` circle with `#15803d` check, "{n} photos added" 19px/800,
  "Saved to {album}." Primary **Done**, secondary **Add more photos**.

### 9. Edit slideshow sheet (full API parity)

Bottom sheet, max height 88%, scrollable. Fields map 1:1 to `api.activateAlbum` /
`POST /api/v1/devicePlayStrategy`:

| Control | Field | Notes |
| --- | --- | --- |
| Album select | `albumIdList: [albumId]` | one album per strategy |
| `Interval` \| `Fixed times` segmented | `updateType` | `INTERVAL` \| `FIXED` |
| Start / End time inputs | `beginTime`, `endTime` | interval mode only |
| Slider 15–360 step 15 | `intervalMinutes` | label formats "2 hours", "1 h 30 m" |
| Times text input | `updateTimeList` | fixed mode; comma-separated `"08:00, 20:00"` |
| `Sequential` \| `Shuffle` segmented | `playOrder` | |
| Number input, min 1 | `updateDays` | |
| "Sleep between refreshes" switch | `idle` | checked → `1`, unchecked → `0` |
| "Play now after saving" switch | `playNow` | |
| Footer note | `timezone` | `Intl.DateTimeFormat().resolvedOptions().timeZone` |

Footer: **Cancel** (ghost) + **Save slideshow** (primary, flex 2). Saving closes the sheet, reloads
carousels and shows the success toast. Enforce one active album carousel per frame, as today.

### Frame detail (context for the sheet)

Frame photo in a 186px bezel, `{width} × {height} · portrait|landscape` caption, then the
`--primary-light` schedule panel: album name + **Active** badge (`#dcfce7` / `#15803d`), a 1px
timeline track with `3×18px --primary` ticks at each refresh time over a 0–24 axis, and the summary
line. Below, a definition list (Play order, Repeat every, Between refreshes, Timezone) as
`1px --border` rows. Bottom: **Play now** secondary button.

---

## State

Client state to add (names from the prototype):

```ts
view: 'home' | 'albums' | 'album' | 'frame' | 'pick' | 'review' | 'crop' | 'importing' | 'done'
pickOrigin: 'home' | 'album'          // where the picker was entered from
picked: string[]                       // selected local photo ids
bucket: string                         // active collection chip
target: string                         // destination albumId
cropIndex: number
crops: Record<photoId, {
  zoom: number;                        // 100–260, fill mode only
  x: number; y: number;                // pan in stage px, clamped
  rot: 0 | 90 | 180 | 270;
  mode: 'fill' | 'fit';
  matte: 'blur' | '#FFFFFF' | '#000000' | '#A02020' | '#F0E050' | '#608050' | '#5080B8';
  done: boolean;                       // user has adjusted → clears the amber flag
}>
```

Persist `crops` only for the life of the import session. `Apply to all` copies the current entry to
every picked photo and returns to Review.

## Interactions & motion

- Sheets: `translateY(100%) → 0`, 240ms `cubic-bezier(.2,.8,.2,1)`; scrim `rgba(15,23,42,.45)` fading
  in over 180ms; tap-scrim to dismiss, stop propagation inside.
- Segmented controls and swatches: instant; no transition on selection colour.
- Zoom/pan: no transition (must track the finger). Rotation: 200ms transform.
- Progress bar: 250ms width.
- Hide native scrollbars inside the app shell (`scrollbar-width: none`, `::-webkit-scrollbar{display:none}`).
- Keep `*, *::before, *::after { box-sizing: border-box }` — the mobile layout depends on it.

## PWA notes

- Installable Android PWA: manifest with `display: standalone`, `theme_color: #2d5a4a`,
  `background_color: #f7f5f2`, maskable icon from the Syncjoy mark.
- Local selection uses `<input type="file" accept="image/*" multiple>` (the Android photo picker),
  which is what "Collections" surfaces. Read EXIF orientation and normalise before framing.
- Filter to still images (jpg/png) as today; no video, no motion photos.
- Cropped bytes never need to touch Google's API — for the mobile path the file is local, so the
  existing server-side media transfer applies only to the desktop Picker path.
- Keep the security boundary unchanged: no durable photo or token storage.

## Assets

- Icons: `lucide-react`, already a dependency (arrow-left, x, plus, refresh-ccw, image, images,
  upload-cloud, gallery-horizontal-end, check, trash-2, crop, rotate-cw, search, log-out).
- Logo: existing CSS-drawn Syncjoy mark (`.syncjoy-*` rules in `src/styles.css`) — reuse, don't redraw.
- Photography in the prototype is `picsum.photos` placeholder imagery. Replace with real API
  thumbnails; nothing in the design depends on those specific images.

## Files in this bundle

- `Syncjoy Mobile.dc.html` — the interactive prototype (all screens and the crop flow).
- `android-frame.jsx` — device bezel used by the prototype for presentation only; not part of the app.

## Repo touchpoints

| Design area | Existing source to extend |
| --- | --- |
| Shell, view routing | `src/main.tsx` (`App`, `View` union, `NavItem`) |
| Frames | `src/main.tsx` (`HomeView`, `DeviceGrid`), `.device-card` / `.device-frame` in `src/styles.css` |
| Albums | `src/main.tsx` (`AlbumsView`), `.album-grid` / `.photo-grid` |
| Import | `src/main.tsx` (`GoogleImportBody`, `PickerSessionModal`), `src/lib/api.ts` |
| Slideshow | `src/main.tsx` (`SlideshowView`, `SlideshowSettingsForm`), `Carousel` in `src/types.ts` |
| Crop | **new** — no existing implementation on `main` |

## Open questions

1. Where does the partially-implemented crop live? Nothing on `main` references crop/aspect, so this
   spec was written from the panel constraints rather than existing code.
2. Server-side vs client-side render of the final crop — client-side canvas keeps the server thin and
   matches the "no durable photo storage" constraint, but costs mobile memory on large batches.
3. Should a per-album default matte be remembered (most users will pick one and keep it)?

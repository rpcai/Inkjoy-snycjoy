# Implementation Plan

## Product Shape

Build a work-focused single-page app with three primary areas:

- `Albums`: list Inkjoy albums, create/rename/delete albums, inspect thumbnails, remove photos, import selected Google Photos.
- `Google Photos`: start a Picker session, show picker link/QR code, poll status, preview selected still images, choose target album, import.
- `Carousels`: list frame play strategies, create/update album carousels, activate/deactivate, choose play order, schedule, interval, idle behavior, timezone, and play-now.

The app should avoid a marketing landing page. The first screen should be the management workspace.

## Technical Direction

Recommended default architecture:

- Vite + React + TypeScript frontend.
- Cloudflare Pages deployment.
- Pages Functions for auth/session and media transfer boundaries.
- No database for v1.
- Short-lived httpOnly encrypted cookies for Google OAuth state/session data if using code flow.
- Inkjoy token handling to be decided after CORS and credential-safety validation.

Why this direction:

- Google Picker sessions are short-lived and user initiated.
- Google media `baseUrl` requests require OAuth authorization.
- Inkjoy album upload requires multipart file upload.
- Cloudflare Functions can stream bytes through without retaining photos.
- Cloudflare Pages keeps deployment simple.

## Milestones

### 0. Validation Spike

- Confirm Inkjoy CORS behavior for login, albums, image upload, and carousel calls.
- Confirm whether Inkjoy login tokens can be refreshed or only reissued via email/password login.
- Confirm whether Inkjoy upload accepts only jpg/png or accepts other image MIME types in practice.
- Confirm Cloudflare Function body size and streaming limits against expected Google photo sizes.
- Test Google OAuth flow in local Pages/Vite environment.

Exit criteria:

- Decide whether Inkjoy calls are browser-direct or routed through Pages Functions.
- Decide whether the import path can stream Google -> Function -> Inkjoy without buffering whole files.

### 1. App Foundation

- Add routing/layout for Albums, Google Photos, Carousels, and Settings.
- Add typed API clients:
  - `inkjoyClient`
  - `googlePickerClient`
  - `syncService`
- Add shared `Result<T>` handling for Inkjoy API responses.
- Add Zod schemas for Inkjoy and Google responses at external boundaries.
- Add central notification/error handling.
- Add responsive, dense management UI.

### 2. Inkjoy Connection and Albums

- Implement Inkjoy server selector: Global/Mainland.
- Implement Inkjoy login.
- Store session according to chosen auth strategy.
- List devices.
- List albums with cover thumbnails and counts.
- Create, rename, delete albums.
- Open album detail and list photo thumbnails.
- Remove selected photos.

### 3. Google Photos Picker Import

- Implement Google OAuth.
- Create Picker session.
- Show picker link and QR code; do not iframe the picker.
- Poll session using `pollingConfig.pollInterval` and respect timeout.
- List selected media items with pagination.
- Filter first release to supported still image types.
- Fetch Google media bytes using the required bearer token.
- Upload each image into the selected Inkjoy album.
- Show import queue with per-item status and retry.
- Delete Picker session after import or cancellation.

### 4. Carousel Management

- List device play strategies per frame.
- Distinguish album carousels from widget strategies.
- Create or update an album carousel:
  - source albums
  - `SEQUENTIALLY` or `SHUFFLE`
  - `FIXED` times or `INTERVAL`
  - update days
  - begin/end time
  - interval minutes
  - timezone
  - idle behavior
  - play now
- Activate/deactivate carousels.
- Implement "set album active" as a guided action once activation semantics are confirmed.

### 5. Deployment and Hardening

- Add Cloudflare Pages configuration.
- Add environment variable documentation.
- Add error states for expired Google base URLs and expired Inkjoy JWTs.
- Add import cancellation.
- Add rate-limit/backoff handling.
- Add Playwright smoke tests for workspace layout and critical flows with mocked APIs.
- Add API client unit tests with representative Inkjoy and Google fixtures.

## Data Retention Policy

Default v1 policy:

- Do not store photos durably.
- Do not store Google media metadata beyond the active browser session.
- Do not store Inkjoy album/photo snapshots durably.
- Do not store OAuth refresh tokens unless the product later requires scheduled sync and the user explicitly opts in.
- Prefer session cookies or browser session storage for transient state.

## Known Risks

- Google Photos Picker is not designed for unattended recurring sync from a Google Photos album.
- Browser-only implementation may be blocked by CORS or may expose tokens more than desired.
- Cloudflare request/body limits may require upload chunking or direct browser upload if users pick very large images.
- Inkjoy carousel "active" semantics need validation: it may allow multiple active strategies, or activating one strategy may not deactivate others.
- Video and HEIC support are unclear against Inkjoy album upload docs; jpg/png should be the first supported import path.


# Implementation Plan

## Product Shape

Build a work-focused single-page app with three primary areas:

- `Albums`: list Inkjoy albums, create/rename/delete albums, inspect thumbnails, remove photos, import selected Google Photos.
- `Google Photos`: start a Picker session, show picker link/QR code, poll status, preview selected still images, choose target album, import.
- `Carousels`: list frame play strategies, create/update album carousels, activate/deactivate, choose play order, schedule, interval, idle behavior, timezone, and play-now.

The app should avoid a marketing landing page. The first screen should be the management workspace.

Confirmed v1 product constraints:

- On-demand import only. No scheduled or background sync in v1.
- Images only. Videos and motion photos are unsupported for an e-ink frame and should be filtered out before import.
- Only one active album carousel per frame. Activating one album carousel should deactivate other album carousels on that frame.
- Default Inkjoy server is Global.
- Google Photos imports are add-only. Deleting Inkjoy album photos is handled separately in album management.
- Imports use manual target album selection. Syncjoy should not automatically create or manage a dedicated album in v1.

## Technical Direction

Recommended default architecture:

- Vite + React + TypeScript frontend.
- A single Hono backend (`server/index.ts`) that runs as a Cloudflare Worker in both local dev
  (via `@cloudflare/vite-plugin`, the real Workers runtime) and production.
- Cloudflare Worker deployment target, with the built frontend served from the Worker's static-assets
  binding — no separate Pages project.
- Backend boundary for auth/session, Inkjoy API proxying, and media transfer.
- No database for v1.
- Server-set, secure, httpOnly, encrypted cookies for Inkjoy and Google tokens.
- Inkjoy email/password are accepted by the app only for login exchange; do not persist the password.

Why this direction:

- Google Picker sessions are short-lived and user initiated.
- Google media `baseUrl` requests require OAuth authorization.
- Inkjoy album upload requires multipart file upload.
- The Worker can stream bytes through without retaining photos.
- httpOnly cookies minimize repeated logins without exposing bearer tokens to browser JavaScript.
- Running the real Workers runtime in local dev (rather than an approximated Node server) means
  API/OAuth behavior verified locally matches production exactly.

See [auth-architecture.md](auth-architecture.md) for the browser token discussion.

## Milestones

### 0. Validation Spike

- Build and debug the first implementation locally.
- Confirm Inkjoy CORS behavior for login, albums, image upload, and carousel calls.
- Confirm whether Inkjoy login tokens can be refreshed or only reissued via email/password login.
- Confirm whether Inkjoy upload accepts only jpg/png. Treat other image formats as unsupported until proven otherwise.
- Test Google OAuth flow in the local app.

Exit criteria:

- Confirm final proxy shape for Inkjoy calls through the local backend, with a clear Cloudflare Functions mapping.
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
- Default the server selector to Global.
- Implement Inkjoy login.
- Exchange Inkjoy email/password for a bearer token and persist only the token/expiry in an encrypted httpOnly cookie.
- Clear login form data immediately after token exchange.
- List devices.
- List albums with cover thumbnails and counts.
- Create, rename, delete albums.
- Open album detail and list photo thumbnails.
- Remove selected photos.

### 3. Google Photos Picker Import

- Implement Google OAuth.
- Store Google access token server-side only in the encrypted session cookie.
- Create Picker session.
- Show picker link and QR code; do not iframe the picker.
- Poll session using `pollingConfig.pollInterval` and respect timeout.
- List selected media items with pagination.
- Filter v1 import to still image MIME types only.
- Require the user to choose the target Inkjoy album manually.
- Fetch Google media bytes using the required bearer token.
- Upload each image into the selected Inkjoy album.
- Treat import as add-only; do not delete album photos as part of the Google Photos import flow.
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
- Implement "set album active" by creating/updating the chosen album carousel and deactivating other active album carousels for the same frame.
- Do not deactivate widget strategies unless later testing shows Inkjoy treats widget and album strategies as mutually exclusive.

### 5. Deployment and Hardening

- Add/validate Cloudflare Worker configuration (`wrangler.toml`, static-assets binding) after the
  local implementation is working. Done — see `wrangler.toml` and `server/index.ts`.
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
- Do not store selected Google Photos as a durable sync set; imports are add-only.
- Do not store Inkjoy passwords.
- Do not store OAuth refresh tokens for v1.
- Store Inkjoy and Google bearer tokens only in secure, encrypted, httpOnly cookies.
- Use browser session storage only for non-sensitive UI state.

## Known Risks

- Google Photos Picker is intentionally interactive; v1 is on-demand import only.
- Browser-only token storage would expose tokens to JavaScript, so the implementation uses the
  Worker and httpOnly cookies.
- Cloudflare request/body limits (100MB on Free/Pro) may require upload chunking or direct browser
  upload if users pick very large images; not a concern for the composited JPEGs produced today.
- Inkjoy carousel activation semantics still need validation, but product behavior should enforce one active album carousel per frame.
- HEIC support is unclear against Inkjoy album upload docs; jpg/png should be the first supported import path.

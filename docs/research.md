# Research Notes

Research date: 2026-06-26

## Inkjoy Open API

Source: https://openapi.inkjoyframe.com/openapi.json

The Inkjoy Open API is an OpenAPI 3.1 spec. It uses JWT bearer authentication and wraps responses in a `Result` shape with `code`, `msg`, and `data`.

Base URLs:

- Global: `https://openapi.inkjoyframe.com`
- Mainland China: `https://openapi.advisor.epaperframe.com`

Authentication:

- `POST /api/v1/auth/login`
- Request: `email`, `password`
- Response data: `uid`, `token`, `expireAt`
- Subsequent calls use `Authorization: Bearer <token>`

Album operations:

| Operation | Method and path | Notes |
| --- | --- | --- |
| List albums | `POST /api/v1/album/list` | Returns personal albums with ID, name, cover image URLs, owner, image count. |
| Create album | `POST /api/v1/album` | JSON body has `albumName`. |
| Rename album | `PUT /api/v1/album/{albumId}` | JSON body has `albumName`. |
| Delete album | `DELETE /api/v1/album/{albumId}` | Deletes a personal album. |
| List album photos | `POST /api/v1/album/img/list` | Body has `albumId`; returns `imgId`, origin URI, signed origin URL, thumbnail URL. |
| Add photo | `POST /api/v1/album/img` | Multipart form with `albumId` and image `file`; supports jpg/png per schema. |
| Remove photos | `POST /api/v1/album/img/del` | Body has `albumId` and `imgIdList`. |
| Sign image URI | `POST /api/v1/album/img/visitSignUrl` | Body has stored object `uri`; returns a signed visit URL. |

Device operations needed for context:

| Operation | Method and path | Notes |
| --- | --- | --- |
| List devices | `GET /api/v1/devices` | Returns bound frames with status, orientation, resolution, last thumbnail, and current status. |
| Publish uploaded image | `POST /api/v1/devices/{deviceId}/publish` | Multipart with file or image URL plus timezone. |
| Publish album image | `POST /api/v1/devices/publish/album` | Body has `deviceId`, `albumId`, `imgId`, optional timezone. |

Carousel operations are represented as device play strategies:

| Operation | Method and path | Notes |
| --- | --- | --- |
| List carousels | `POST /api/v1/devicePlayStrategy/list` | Optional `deviceId` filter. Includes album and widget strategies. |
| Create carousel | `POST /api/v1/devicePlayStrategy` | Creates a device play strategy referencing album photos. |
| Update carousel | `PUT /api/v1/devicePlayStrategy/{strategyId}` | Updates an existing album carousel. |
| Delete carousel | `DELETE /api/v1/devicePlayStrategy/{strategyId}` | Deletes a strategy. |
| Change status | `PUT /api/v1/devicePlayStrategy/changeStatus/{strategyId}/{status}` | `ACTIVE` or `INACTIVE`. |

Carousel fields relevant to the UI:

- Required for create/update: `deviceId`, `playOrder`, `albumIdList`, `timezone`
- Strategy type: `TRIGGER_ON_SERVER`, `TRIGGER_ON_DEVICE`, `FULL_DEVICE`
- Update type: `FIXED` using `updateTimeList`, or `INTERVAL` using `beginTime`, `endTime`, `intervalMinutes`
- Other controls: `updateDays`, `playOrder` (`SEQUENTIALLY` or `SHUFFLE`), `playNow`, `idle` (`0` sleep, `1` no sleep), `status`

Implication: "Set album as active" should create or update a carousel with `albumIdList: [albumId]` and `status: ACTIVE`, then deactivate other active album carousels on the same device.

## Google Photos Picker API

Sources:

- https://developers.google.com/photos/picker/guides/get-started-picker
- https://developers.google.com/photos/picker/guides/sessions
- https://developers.google.com/photos/picker/guides/media-items
- https://developers.google.com/photos/picker/reference/rest

The Picker API is not a background Google Photos sync API. It is an interactive, user-controlled selection flow:

1. Obtain a valid Google OAuth 2.0 access token.
2. Create a picker session with `POST https://photospicker.googleapis.com/v1/sessions`.
3. Show the returned `pickerUri` to the user as a link or QR code. It cannot be opened in an iframe.
4. Poll `GET /v1/sessions/{sessionId}` using the returned `pollingConfig`.
5. When `mediaItemsSet` is `true`, list selected items with `GET /v1/mediaItems?sessionId=...`.
6. Use each selected media file `baseUrl`, with required download/size parameters and an OAuth bearer token, to fetch bytes.
7. Delete the session after import.

Important API details:

- Service endpoint: `https://photospicker.googleapis.com`
- Resources: `v1.sessions`, `v1.mediaItems`
- Required media item scope: `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`
- `PickedMediaItem.mediaFile.baseUrl` requires a valid OAuth bearer token.
- Base URLs are short-lived; the docs currently state they are active for 60 minutes.
- Images can be requested with sizing/download parameters. Videos use `dv`, but Inkjoy is an e-ink frame and videos/motion photos are out of scope; the first version should filter to still images only.

## Google Sample App

Source zip: https://developers.google.com/static/photos/picker/samples/photos-picker-sample-app-v1.2.zip

The sample app is Express/EJS and uses:

- Passport Google OAuth.
- File-backed session storage.
- A cached Picker session with a 29-minute TTL.
- Server endpoints to create/poll sessions, list media items, and proxy image/video bytes.

Implication: the sample validates the server-mediated flow, but it is heavier than the target architecture. For Cloudflare Pages, a Pages Functions equivalent can keep the same security boundary without a persistent server or database.

## Architecture Implications

- A pure static app is possible only if both Inkjoy and Google media fetches support the browser CORS behavior we need and we accept OAuth/Inkjoy bearer tokens in browser JavaScript.
- A minimal Cloudflare Pages Functions backend is the recommended architecture:
  - exchange Inkjoy email/password for a token without persisting the password;
  - persist bearer tokens in encrypted, httpOnly cookies;
  - keep Google OAuth exchange and tokens out of browser JavaScript;
  - fetch short-lived Google media bytes server-side;
  - stream directly into Inkjoy album upload;
  - avoid storing photos or tokens durably.
- The first implementation should run locally for easier debugging, using the same API boundaries that will later move to Cloudflare Pages Functions.
- The first product experience should be "select and import now", not background sync, because Picker sessions are user initiated and expire.

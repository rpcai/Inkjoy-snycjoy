# Auth Architecture

## Decision

Use a thin auth and API boundary, running as a single Cloudflare Worker (`server/index.ts`) in both
local dev (via `@cloudflare/vite-plugin`, the real Workers runtime) and production — not a separate
Node backend kept "compatible" with a later port:

- The browser submits Inkjoy email/password to the Worker's `/api/*` routes over HTTPS.
- The backend exchanges those credentials for an Inkjoy JWT.
- The password is discarded immediately.
- The backend stores only token material and expiry in a secure, encrypted, httpOnly cookie.
- Browser JavaScript calls local `/api/*` routes, not Inkjoy or Google Photos Picker APIs directly.
- The browser uses Google Identity Services to request a short-lived Photos Picker access token with a public OAuth client ID, then immediately hands that token to the backend.
- The backend attaches bearer tokens server-side when calling Inkjoy and Google Photos.

This still keeps v1 database-free. The cookie is the only persistence mechanism, whether running locally or on Cloudflare.

## Why Not Store Tokens In Browser JavaScript?

A normal browser cookie set from JavaScript, `localStorage`, or `sessionStorage` is readable by JavaScript. That is convenient, but any future cross-site scripting bug could read bearer tokens.

An httpOnly cookie is not readable by JavaScript. Only the browser and server receive it. That is the safer fit for a photo account and frame-management app, while still minimizing re-logins.

Google Identity Services necessarily returns the short-lived Picker access token to the browser callback. Syncjoy does not put that token in local storage or regular cookies; it posts the token once to the backend and keeps the durable copy in the encrypted httpOnly session cookie.

## Cookie Shape

Recommended cookie properties:

- `HttpOnly`
- `Secure`
- `SameSite=Lax`
- encrypted and authenticated payload
- short enough expiry to match the Inkjoy token expiry
- refreshed by re-login unless Inkjoy exposes a refresh endpoint later

Payload should include:

- Inkjoy server region
- Inkjoy bearer token
- Inkjoy token expiry
- Google access token if a Picker session is active
- Google token expiry

Do not include:

- Inkjoy password
- selected photo bytes
- long-lived Google refresh token for v1

## Function Boundaries

Initial backend routes:

- `POST /api/inkjoy/login`
- `POST /api/inkjoy/logout`
- `GET /api/inkjoy/devices`
- `POST /api/inkjoy/albums`
- `POST /api/inkjoy/albums/:albumId/photos`
- `POST /api/inkjoy/carousels`
- `POST /api/google/token`
- `POST /api/google/picker/sessions`
- `GET /api/google/picker/sessions/:sessionId`
- `GET /api/google/picker/media-items`
- `POST /api/import/google-to-inkjoy`

The import route should stream selected Google media to Inkjoy when possible and avoid durable storage.

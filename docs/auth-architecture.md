# Auth Architecture

## Decision

Use a thin auth and API boundary. Build it locally first for easier debugging, but keep the boundary compatible with Cloudflare Pages Functions:

- The browser submits Inkjoy email/password to the local backend or Pages Function over HTTPS.
- The backend exchanges those credentials for an Inkjoy JWT.
- The password is discarded immediately.
- The backend stores only token material and expiry in a secure, encrypted, httpOnly cookie.
- Browser JavaScript calls local `/api/*` routes, not Inkjoy or Google APIs directly.
- The backend attaches bearer tokens server-side when calling Inkjoy and Google Photos.

This still keeps v1 database-free. The cookie is the only persistence mechanism, whether running locally or on Cloudflare.

## Why Not Store Tokens In Browser JavaScript?

A normal browser cookie set from JavaScript, `localStorage`, or `sessionStorage` is readable by JavaScript. That is convenient, but any future cross-site scripting bug could read bearer tokens.

An httpOnly cookie is not readable by JavaScript. Only the browser and server receive it. That is the safer fit for a photo account and frame-management app, while still minimizing re-logins.

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
- `POST /api/google/oauth/start`
- `GET /api/google/oauth/callback`
- `POST /api/google/picker/sessions`
- `GET /api/google/picker/sessions/:sessionId`
- `GET /api/google/picker/media-items`
- `POST /api/import/google-to-inkjoy`

The import route should stream selected Google media to Inkjoy when possible and avoid durable storage.

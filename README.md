# Inkjoy Syncjoy

Inkjoy Syncjoy is a mobile-first PWA for managing Inkjoy digital picture frame albums and carousels,
with an on-device photo picker (native OS picker) as the primary import source on Android and Google
Photos Picker as a desktop-only alternative. Photos get framed/cropped for the target frame's exact
aspect before upload — no implicit server-side center-crop.

Production runs as a single **Cloudflare Worker**: one Hono app serves both the built frontend
(via Workers Static Assets) and the `/api/*` backend, with no separate Pages/Functions deployment.
Local development runs on the same Workers runtime (via `@cloudflare/vite-plugin`), not an
approximated Node server, so local and production behavior stay aligned.

## Target Capabilities

- Sign in to Inkjoy and list bound frames.
- List, create, and browse Inkjoy personal albums; manage album photos.
- Pick photos from the device's native photo picker (mobile) or upload local files (desktop).
- Pick photos from Google Photos via the Google Photos Picker API (desktop only).
- Frame/crop each photo for the target frame's aspect ratio before import — fill or fit mode,
  pan/zoom/rotate, and a choice of Spectra 6 ink mattes or a blurred-photo border.
- Keep imports add-only; delete-from-album remains part of album management, separate from importing.
- Create and update Inkjoy carousels, including active status, album source, play order, schedule,
  interval, timezone, and play-now behavior.
- Enforce one active album carousel per frame.
- Import still images only.

## Stack

- Frontend: Vite, React 19, TypeScript, `lucide-react` icons, plain CSS (`src/styles.css`).
- Backend: Hono, running as a Cloudflare Worker (`server/index.ts`), serving `/api/*` and falling
  back to the Worker's static-assets binding for everything else (SPA routing).
- Storage: browser session/local storage for non-sensitive UI preferences; an encrypted, short-lived,
  httpOnly session cookie (Web Crypto AES-GCM) for sensitive session material; no database.
- PWA: installable manifest (`public/manifest.webmanifest`), icons generated from the in-app
  CSS-drawn logo mark (`npm run icons`). No service worker — API responses are session-authenticated
  and must not be cached.

See [docs/research.md](docs/research.md), [docs/implementation-plan.md](docs/implementation-plan.md),
[docs/auth-architecture.md](docs/auth-architecture.md), and the mobile design handoff at
[docs/design_handoff_syncjoy_mobile/README.md](docs/design_handoff_syncjoy_mobile/README.md).

## Local Development

Copy `.dev.vars.example` to `.dev.vars` (Wrangler reads this automatically; it replaces the old
`.env` file). To enable the Google Photos Picker flow, create a Google Cloud OAuth client:

- Enable the Google Photos Picker API for the project.
- Create an OAuth 2.0 Client ID with application type `Web application`.
- Add `http://localhost:5173` as an authorized JavaScript origin.
- Set `GOOGLE_CLIENT_ID` in `.dev.vars` to that client ID, or paste it in when prompted from the
  Add Photos sheet's Google Photos Picker row.

```sh
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`). `vite dev` runs the real Workers
runtime in-process (via `@cloudflare/vite-plugin`) alongside Vite's frontend dev server — there is
no separate backend process to start.

Other scripts: `npm run build` (type-check + production build), `npm run check` (type-check only),
`npm test` (Vitest, currently the crop geometry math), `npm run icons` (regenerate PWA icons from
the CSS logo mark), `npm run deploy` (`wrangler deploy`).

The Inkjoy and Google session material is kept in the encrypted `syncjoy_session` cookie and expires
with the underlying token lifetime. No Google refresh token or photo bytes are stored durably.

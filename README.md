# Inkjoy Syncjoy

Inkjoy Syncjoy is planned as a small web app for managing Inkjoy digital picture frame albums and carousels, with Google Photos Picker as the import source.

The current repo state is a planning scaffold. Implementation should bias toward Cloudflare Pages compatibility, minimal backend surface area, and no durable photo or token storage.

## Target Capabilities

- Sign in to Inkjoy and list bound frames.
- List, create, rename, delete, and inspect Inkjoy personal albums.
- View album thumbnails and photo counts.
- Pick photos from Google Photos via the Google Photos Picker API.
- Upload selected Google Photos media into an Inkjoy album.
- Create and update Inkjoy carousels, including active status, album source, play order, schedule, interval, timezone, and play-now behavior.
- Enforce one active album carousel per frame.
- Import still images only.

## Proposed Stack

- Frontend: Vite, React, TypeScript.
- UI: custom CSS or Tailwind with lucide-react icons.
- Runtime target: Cloudflare Pages.
- Thin backend: Cloudflare Pages Functions only where needed for OAuth callback handling, token cookie handling, and server-side media transfer.
- Storage: browser session/local storage for non-sensitive UI preferences; encrypted, short-lived, httpOnly cookies for sensitive session material; no database for the first release.

See [docs/research.md](docs/research.md), [docs/implementation-plan.md](docs/implementation-plan.md), and [docs/auth-architecture.md](docs/auth-architecture.md).

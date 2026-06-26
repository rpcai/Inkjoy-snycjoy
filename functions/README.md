# Cloudflare Pages Functions

Use this directory only for thin server-side boundaries that are hard or unsafe to do in the browser:

- Google OAuth callback/token exchange if we choose authorization-code flow.
- Short-lived encrypted session cookies.
- Fetching Google Photos media bytes with an OAuth bearer token.
- Streaming the selected media into Inkjoy album upload endpoints.
- Proxying Inkjoy calls only if CORS blocks direct browser calls or if we decide Inkjoy credentials should never touch browser JavaScript.

Do not add durable database storage unless a later sync feature explicitly requires it.


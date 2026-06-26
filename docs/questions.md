# Clarifying Questions

## Answered

- First version: on-demand import only.
- Inkjoy credentials: acceptable to enter email/password, but only to exchange for a token. Persist token, not password.
- Token persistence: recommended approach is encrypted httpOnly cookies set by Cloudflare Pages Functions.
- Active carousel behavior: only one active album carousel per frame. Activating one should deactivate others.
- Media support: images only. Videos and motion photos are unsupported.
- Initial implementation target: build and debug locally first, then pivot to Cloudflare Pages while preserving the target architecture.
- Default Inkjoy server: Global.
- Import behavior: add-only. Delete-from-album belongs to album management, separate from Google Photos import.
- Album targeting: manual target album selection.

## Still Open

No open product questions at this stage.

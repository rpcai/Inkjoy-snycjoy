# Clarifying Questions

## Answered

- First version: on-demand import only.
- Inkjoy credentials: acceptable to enter email/password, but only to exchange for a token. Persist token, not password.
- Token persistence: recommended approach is encrypted httpOnly cookies set by Cloudflare Pages Functions.
- Active carousel behavior: only one active album carousel per frame. Activating one should deactivate others.
- Media support: images only. Videos and motion photos are unsupported.

## Still Open

1. Which Inkjoy server should be the default for your frame: Global or Mainland China?
2. Do you want the app to delete Inkjoy photos that are no longer in a picked Google Photos selection, or should imports only add new photos?
3. Should album matching be manual, or should Syncjoy create/manage a dedicated album such as `Syncjoy`?

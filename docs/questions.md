# Clarifying Questions

1. Should the first version be an on-demand import tool, or do you expect recurring/background sync later?
2. Are you comfortable entering Inkjoy email/password into this app, or should we avoid handling Inkjoy credentials directly and use a manually pasted API token if possible?
3. Should Google and Inkjoy tokens stay entirely out of browser JavaScript, even if that means all API calls go through Cloudflare Pages Functions?
4. Which Inkjoy server should be the default for your frame: Global or Mainland China?
5. When setting an album as active, should Syncjoy deactivate other album carousels on the same frame, or leave existing active strategies alone?
6. Should v1 import only still images, or should it attempt to handle videos/motion photos with conversion or first-frame extraction later?
7. Do you want the app to delete Inkjoy photos that are no longer in a picked Google Photos selection, or should imports only add new photos?
8. Should album matching be manual, or should Syncjoy create/manage a dedicated album such as `Syncjoy`?


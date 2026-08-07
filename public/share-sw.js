// Minimal service worker whose only job is receiving Android "Share to Syncjoy" POSTs.
// It does not cache anything and does not intercept any other request — API responses
// stay session-authenticated and are never cached, matching the app's no-SW-caching policy.
const DB_NAME = "syncjoy-share";
const STORE_NAME = "shared-files";
const KEY = "pending";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShareTarget(event));
  }
});

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const files = formData.getAll("photos").filter((item) => item instanceof File && item.size > 0);
    if (files.length) {
      await storeFiles(files);
    }
  } catch {
    // Fall through — still redirect into the app even if the share payload was unreadable.
  }
  return Response.redirect("/?share-target=1", 303);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeFiles(files) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(files, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

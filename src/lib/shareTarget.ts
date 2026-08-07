const DB_NAME = "syncjoy-share";
const STORE_NAME = "shared-files";
const KEY = "pending";

export function isShareTargetLaunch(search: string): boolean {
  return new URLSearchParams(search).get("share-target") === "1";
}

export async function consumeSharedFiles(): Promise<File[]> {
  if (!("indexedDB" in window)) return [];

  const db = await openDb();
  try {
    return await new Promise<File[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(KEY);
      store.delete(KEY);
      tx.oncomplete = () => resolve(Array.isArray(getRequest.result) ? getRequest.result : []);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function openDb(): Promise<IDBDatabase> {
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

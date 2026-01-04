// IndexedDB wrapper for key storage

const DB_NAME = "encchat_secure_store";
const DB_VERSION = 2;
const KEY_STORE_NAME = "keys";

export async function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function storeKeyPair(keyPair: CryptoKeyPair): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEY_STORE_NAME], "readwrite");
    const store = transaction.objectStore(KEY_STORE_NAME);
    // Store keys. We use fixed keys 'private' and 'public' since we only support one identity per device for now.
    // Ideally we might want to version them or support multiple.
    const req1 = store.put(keyPair.privateKey, "privateKey");
    const req2 = store.put(keyPair.publicKey, "publicKey");

    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e);
  });
}

export async function getStoredKeyPair(): Promise<CryptoKeyPair | null> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEY_STORE_NAME], "readonly");
    const store = transaction.objectStore(KEY_STORE_NAME);

    const requestPriv = store.get("privateKey");
    const requestPub = store.get("publicKey");

    let privateKey: CryptoKey | undefined;
    let publicKey: CryptoKey | undefined;

    requestPriv.onsuccess = () => {
      privateKey = requestPriv.result;
    };
    requestPub.onsuccess = () => {
      publicKey = requestPub.result;
    };

    transaction.oncomplete = () => {
      if (privateKey && publicKey) {
        resolve({ privateKey, publicKey });
      } else {
        resolve(null);
      }
    };
    transaction.onerror = (e) => reject(e);
  });
}

export async function clearKeys(): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEY_STORE_NAME], "readwrite");
    const store = transaction.objectStore(KEY_STORE_NAME);
    store.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e);
  });
}

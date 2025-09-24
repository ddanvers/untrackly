// utils/crypto.ts
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { publicKey, privateKey: keyPair.privateKey };
}

export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicJwk: JsonWebKey,
) {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptData(key: CryptoKey, data: ArrayBuffer) {
  if (!(key instanceof CryptoKey)) {
    throw new Error("encryptData: key is not CryptoKey");
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return { iv, data: new Uint8Array(encrypted) };
}

export async function decryptData(
  key: CryptoKey,
  iv: Uint8Array,
  data: Uint8Array,
) {
  if (!(key instanceof CryptoKey)) {
    throw new Error("decryptData: key is not CryptoKey");
  }
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return new Uint8Array(decrypted);
}

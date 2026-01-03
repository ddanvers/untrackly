// Web Crypto API Utils for E2EE
// Using ECDH (P-256) for Key Exchange and AES-GCM (256-bit) for Encryption

export const KEY_GENERATION_ALGORITHM = {
  name: "ECDH",
  namedCurve: "P-256",
};

export const ENCRYPTION_ALGORITHM = {
  name: "AES-GCM",
  length: 256,
};

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(KEY_GENERATION_ALGORITHM, false, [
    "deriveKey",
    "deriveBits",
  ]);
}

// Export Public Key (SPKI) for sharing
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

// Import Public Key (SPKI) from peer
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Key);
  return window.crypto.subtle.importKey(
    "spki",
    buffer,
    KEY_GENERATION_ALGORITHM,
    true,
    [],
  );
}

// Derive Shared Secret (AES-GCM Key)
export async function deriveSharedKey(
  privateKey: CryptoKey,
  remotePublicKey: CryptoKey,
): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: remotePublicKey,
    },
    privateKey,
    ENCRYPTION_ALGORITHM,
    false,
    ["encrypt", "decrypt"],
  );
}

// Encrypt Message
export async function encryptMessage(
  sharedKey: CryptoKey,
  text: string,
  aad?: string | Uint8Array,
): Promise<{ ciphertext: string; iv: string }> {
  const encoded = new TextEncoder().encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // prepare additionalData as Uint8Array or undefined
  let additionalData: ArrayBuffer | undefined;
  if (aad !== undefined) {
    if (typeof aad === "string") {
      additionalData = new TextEncoder().encode(aad).buffer;
    } else {
      additionalData = aad.buffer;
    }
  }

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      additionalData: additionalData,
      tagLength: 128,
    },
    sharedKey,
    encoded,
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

// Decrypt Message
export async function decryptMessage(
  sharedKey: CryptoKey,
  ciphertextB64: string,
  ivB64: string,
  aad?: string | Uint8Array,
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(ciphertextB64);
  const iv = base64ToArrayBuffer(ivB64);

  let additionalData: ArrayBuffer | undefined;
  if (aad !== undefined) {
    if (typeof aad === "string") {
      additionalData = new TextEncoder().encode(aad).buffer;
    } else {
      additionalData = aad.buffer;
    }
  }

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
      additionalData: additionalData,
      tagLength: 128,
    },
    sharedKey,
    ciphertext,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// Helpers
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

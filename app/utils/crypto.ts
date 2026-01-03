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
    true,
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

  // prepare additionalData
  let additionalData: ArrayBuffer | ArrayBufferLike | undefined;
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
      additionalData: additionalData as ArrayBuffer, // Cast specifically if needed, likely fine
      tagLength: 128,
    },
    sharedKey,
    encoded,
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
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

  let additionalData: ArrayBuffer | ArrayBufferLike | undefined;
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
      additionalData: additionalData as ArrayBuffer,
      tagLength: 128,
    },
    sharedKey,
    ciphertext,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// Helpers
export function arrayBufferToBase64(
  buffer: ArrayBuffer | ArrayBufferLike,
): string {
  let binary = "";
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// HKDF Implementation (RFC 5869)
export async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array | CryptoKey,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  let key: CryptoKey;
  if (ikm instanceof Uint8Array) {
    key = await window.crypto.subtle.importKey(
      "raw",
      ikm.buffer as ArrayBuffer,
      "HKDF",
      false, // MUST be false for HKDF
      ["deriveBits"],
    );
  } else {
    // If key is not HKDF (e.g. AES-GCM from initial handshake), we must convert it.
    // This assumes non-HKDF keys passed here ARE extractable.
    if (ikm.algorithm.name !== "HKDF") {
      const raw = await window.crypto.subtle.exportKey("raw", ikm);
      key = await window.crypto.subtle.importKey("raw", raw, "HKDF", false, [
        "deriveBits",
      ]);
    } else {
      key = ikm;
    }
  }

  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: info.buffer as ArrayBuffer,
    },
    key,
    length * 8,
  );

  return new Uint8Array(bits);
}

// Import Raw Key (for Chain Keys / Root Keys)
export async function importKeyRaw(
  rawBytes: Uint8Array,
  usage: KeyUsage[] = ["deriveBits", "deriveKey"],
  alg: string = "AES-GCM",
  extractable?: boolean,
): Promise<CryptoKey> {
  // HKDF keys must not be extractable
  const isExtractable = extractable ?? alg !== "HKDF";

  return window.crypto.subtle.importKey(
    "raw",
    rawBytes.buffer as ArrayBuffer,
    alg,
    isExtractable,
    usage,
  );
}

// Export Key to Raw Bytes
export async function exportKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  const buffer = await window.crypto.subtle.exportKey("raw", key);
  return new Uint8Array(buffer);
}

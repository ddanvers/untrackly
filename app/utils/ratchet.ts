import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decryptMessage,
  deriveSharedKey,
  encryptMessage,
  exportKeyRaw,
  exportPublicKey,
  generateKeyPair,
  hkdf,
  importKeyRaw,
  importPublicKey,
  KEY_GENERATION_ALGORITHM,
} from "./crypto";

// Constants
const INFO_TEXT = new TextEncoder().encode("Double Ratchet");

// Types for State
export interface RatchetState {
  // Root Key
  RK: CryptoKey;
  // Chain Keys (Sender, Receiver)
  CKs: CryptoKey | null;
  CKr: CryptoKey | null;
  // Next Chain Keys (for skipping messages) - simpler: just current CK
  // Instead of full header keys, we just use the chain keys.

  // DH Keys
  DHs: CryptoKeyPair; // My DH Key Pair
  DHr: CryptoKey | null; // Received Public Key

  // Message Numbers
  Ns: number; // Sending Message Number
  Nr: number; // Receiving Message Number
  PN: number; // Previous Chain Length (sent in header)
}

export interface Header {
  dh: string; // Base64 SPKI public key
  pn: number; // Previous Chain Length
  n: number; // Message Number
}

export interface CiphertextMessage {
  header: Header;
  ciphertext: string; // Base64
  iv: string; // Base64
}

// KDF Chains
async function kdfRK(
  rk: CryptoKey,
  dhOut: CryptoKey,
): Promise<[CryptoKey, CryptoKey]> {
  // input_key_material = HKDF(salt=rk, ikm=dh_out)
  // PROBLEM: RK is HKDF key (non-extractable). We cannot use it as Salt (needs bytes).
  // FIX: We swap: HKDF(salt=dhOut, ikm=RK).
  // dhOut is AES-GCM key derived from ECDH. We made it extractable.

  const dhOutBytes = await exportKeyRaw(dhOut);
  // RK is used as IKM directly (it's a CryptoKey).

  const output = await hkdf(
    dhOutBytes, // Salt (was rk)
    rk, // IKM (was dhOut)
    INFO_TEXT,
    64,
  );

  const nextRkBytes = output.slice(0, 32);
  const nextCkBytes = output.slice(32, 64);

  const nextRk = await importKeyRaw(
    nextRkBytes,
    ["deriveBits", "deriveKey"],
    "HKDF",
  );
  const nextCk = await importKeyRaw(
    nextCkBytes,
    ["deriveBits", "deriveKey"],
    "HKDF",
  );

  return [nextRk, nextCk];
}

async function kdfCK(ck: CryptoKey): Promise<[CryptoKey, CryptoKey]> {
  // Chain Key KDF
  // Returns [nextCK, messageKey]
  // ck is IKM (HKDF Key, non-extractable).

  const mkInput = new Uint8Array([1]);
  const ckInput = new Uint8Array([2]);

  // Derive Message Key
  const mkBytes = await hkdf(
    new Uint8Array(32), // Salt (Zeros)
    ck, // IKM (CryptoKey)
    mkInput, // Info
    32,
  );

  // Derive Next Chain Key
  const nextCkBytes = await hkdf(
    new Uint8Array(32), // Salt (Zeros)
    ck, // IKM (CryptoKey)
    ckInput, // Info
    32,
  );

  const nextCk = await importKeyRaw(
    nextCkBytes,
    ["deriveBits", "deriveKey"],
    "HKDF",
  );
  const messageKey = await importKeyRaw(
    mkBytes,
    ["encrypt", "decrypt"],
    "AES-GCM",
  );

  return [nextCk, messageKey];
}

export class RatchetSession {
  private state: RatchetState;
  // Storing skipped message keys for out-of-order handling
  // Map<headerKey(dh+n), messageKey>
  private skippedMessageKeys: Map<string, CryptoKey> = new Map();
  private MAX_ZN = 20; // Max skipped messages

  private constructor(state: RatchetState) {
    this.state = state;
  }

  // Initialize Initiator (Alice)
  public static async initAlice(
    sharedSecret: CryptoKey,
    bobPublicKey: CryptoKey,
  ): Promise<RatchetSession> {
    const dhs = await generateKeyPair();
    const dhr = bobPublicKey;

    // We need the RK to be an HKDF key for kdfRK to work if we were passing it directly,
    // but kdfRK exports it to raw bytes anyway.
    // HOWEVER, the logic inside kdfRK or elsewhere might expect it to be a specific type if we change things.
    // kdfRK takes 'rk' and exports it. 'sharedSecret' comes from deriveSharedKey which is AES-GCM.
    // That's fine because exportKeyRaw works on AES-GCM.
    // The OUTPUT of kdfRK needs to be HKDF keys. That was fixed above.

    // Wait, let's check if we missed any importKeyRaw defaults?
    // In kdfRK, we fixed lines 79-80.
    // In kdfCK, we fixed line 114.

    // Yes, the fix above should cover it.
    // No changes needed here, just confirming.

    const [rk, cks] = await kdfRK(
      sharedSecret,
      await deriveSharedKey(dhs.privateKey, dhr),
    );

    return new RatchetSession({
      RK: rk,
      CKs: cks,
      CKr: null,
      DHs: dhs,
      DHr: dhr,
      Ns: 0,
      Nr: 0,
      PN: 0,
    });
  }

  // Initialize Responder (Bob)
  public static async initBob(
    sharedSecret: CryptoKey,
    bobIdentityKeyPair: CryptoKeyPair,
  ): Promise<RatchetSession> {
    // Bob needs to use his Identity KeyPair for the first ratchet step
    // because Alice used his Identity Public Key to derive the initial secret.
    const dhs = bobIdentityKeyPair;

    return new RatchetSession({
      RK: sharedSecret,
      CKs: null,
      CKr: null,
      DHs: dhs,
      DHr: null,
      Ns: 0,
      Nr: 0,
      PN: 0,
    });
  }

  public async encrypt(
    plaintext: string,
    ad?: string,
  ): Promise<CiphertextMessage> {
    const { CKs, Ns, DHs, PN } = this.state;
    if (!CKs) {
      // Should not happen for Alice. For Bob, he might be trying to send before receiving?
      // If Bob sends first, we have a problem if he hasn't done a DHRatchet.
      // But in our setup, Alice initiates.
      throw new Error(
        "Cannot encrypt: Chain Key Sender is null. Handshake incomplete?",
      );
    }

    const [nextCKs, mk] = await kdfCK(CKs);
    this.state.CKs = nextCKs;

    const header: Header = {
      dh: await exportPublicKey(DHs.publicKey),
      pn: PN,
      n: Ns,
    };

    // Encode header into AD to bind it
    const headerBytes = new TextEncoder().encode(JSON.stringify(header));
    const adBytes = ad ? new TextEncoder().encode(ad) : new Uint8Array(0);
    const combinedAD = new Uint8Array(headerBytes.length + adBytes.length);
    combinedAD.set(headerBytes);
    combinedAD.set(adBytes, headerBytes.length);

    const { ciphertext, iv } = await encryptMessage(mk, plaintext, combinedAD);

    this.state.Ns += 1;

    return {
      header,
      ciphertext,
      iv,
    };
  }

  public async decrypt(
    message: CiphertextMessage,
    ad?: string,
  ): Promise<string> {
    // 1. Try skipped keys
    // Not implemented strictly for MVP, but good to have placeholders.

    const { header, ciphertext, iv } = message;
    const remoteKey = await importPublicKey(header.dh); // Or raw import if we optimize

    // 2. Check if DHRatchet is needed
    // Condition: header.dh != state.DHr
    // We need to compare public keys. Exporting to base64 is easiest way to compare.
    const remoteKeyStr = header.dh;
    const currentDhrStr = this.state.DHr
      ? await exportPublicKey(this.state.DHr)
      : null;

    if (remoteKeyStr !== currentDhrStr) {
      // New Ratchet Step
      // Skip messages in previous chain
      if (this.state.CKr && this.state.DHr) {
        // Handle skipped messages (omitted for brevity in MVP, usually store them)
      }

      // DHRatchet Step

      // KDF_RK(Z)
      // Z = DH(DHs, header.dh)
      if (!this.state.RK) throw new Error("Root Key missing");
      const z = await deriveSharedKey(this.state.DHs.privateKey, remoteKey);
      const [rk, ckr] = await kdfRK(this.state.RK, z);
      this.state.RK = rk;
      this.state.CKr = ckr;

      this.state.DHr = remoteKey;

      // DH Step 2: Send Chain
      // We need new DH pair
      this.state.DHs = await generateKeyPair();

      // KDF_RK(Z) again for sending chain
      // Z = DH(DHs, DHr) -- using NEW DHs and NEW DHr
      const z2 = await deriveSharedKey(this.state.DHs.privateKey, remoteKey);
      const [rk2, cks] = await kdfRK(this.state.RK, z2);
      this.state.RK = rk2;
      this.state.CKs = cks;

      this.state.PN = this.state.Ns; // Previous chain length was our Ns
      this.state.Ns = 0;
      this.state.Nr = 0;
    }

    // 3. Symmetric Ratchet to get Message Key
    // header.n is the target index. state.Nr is current.
    // We need to ratchet CKr until we reach header.n
    if (!this.state.CKr) {
      throw new Error(
        "Receiving Chain Key is missing but no DH update triggered.",
      );
    }

    // Forward CKr to N
    // NOTE: This simple loop doesn't handle OUT OF ORDER messages well if we don't store keys.
    // It assumes strict ordering or valid 'catch up'.
    // If header.n < state.Nr, it's an old message. If we didn't save the key, we fail.
    if (header.n < this.state.Nr) {
      // Check skipped keys if we implemented that.
      throw new Error(
        "Message received out of order (old message) and skipped keys are not tracked.",
      );
    }

    // Catch up
    let mk: CryptoKey | null = null;
    while (this.state.Nr <= header.n) {
      const [nextCkr, msgKey] = await kdfCK(this.state.CKr);
      this.state.CKr = nextCkr;
      if (this.state.Nr === header.n) {
        mk = msgKey;
      } else {
        // Store skipped key?
      }
      this.state.Nr++;
    }

    if (!mk) throw new Error("Failed to derive Message Key");

    // 4. Decrypt
    const headerBytes = new TextEncoder().encode(JSON.stringify(header));
    const adBytes = ad ? new TextEncoder().encode(ad) : new Uint8Array(0);
    const combinedAD = new Uint8Array(headerBytes.length + adBytes.length);
    combinedAD.set(headerBytes);
    combinedAD.set(adBytes, headerBytes.length);

    return decryptMessage(mk, ciphertext, iv, combinedAD);
  }
}

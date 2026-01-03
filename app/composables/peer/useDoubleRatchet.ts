import { deriveSharedKey, importPublicKey } from "~/utils/crypto";
import { type CiphertextMessage, RatchetSession } from "~/utils/ratchet";

// Map: peerId -> RatchetSession
const sessions = reactive(new Map<string, RatchetSession>());

export function useDoubleRatchet() {
  // Initialize a session explicitly (e.g. after handshake)
  // role: 'alice' (initiator) or 'bob' (responder)
  async function initRatchetSession(
    peerId: string,
    role: "alice" | "bob",
    sharedSecret: CryptoKey,
    remotePublicKey?: CryptoKey,
    myIdentityKeyPair?: CryptoKeyPair,
  ) {
    try {
      let session: RatchetSession;
      if (role === "alice") {
        if (!remotePublicKey) throw new Error("Alice needs remote public key");
        session = await RatchetSession.initAlice(sharedSecret, remotePublicKey);
      } else {
        if (!myIdentityKeyPair)
          throw new Error("Bob needs his own identity key pair");
        session = await RatchetSession.initBob(sharedSecret, myIdentityKeyPair);
      }

      sessions.set(peerId, session);
      console.log(
        `[DoubleRatchet] Initialized session for ${peerId} as ${role}`,
      );
    } catch (e) {
      console.error(`[DoubleRatchet] Failed to init session for ${peerId}`, e);
      throw e;
    }
  }

  async function encryptRatchet(peerId: string, content: string, ad?: string) {
    const session = sessions.get(peerId);
    if (!session) throw new Error(`No Ratchet Session for ${peerId}`);
    return await session.encrypt(content, ad);
  }

  async function decryptRatchet(
    peerId: string,
    message: CiphertextMessage,
    ad?: string,
  ) {
    const session = sessions.get(peerId);
    if (!session) throw new Error(`No Ratchet Session for ${peerId}`);
    return await session.decrypt(message, ad);
  }

  function hasSession(peerId: string) {
    return sessions.has(peerId);
  }

  return {
    initRatchetSession,
    encryptRatchet,
    decryptRatchet,
    hasSession,
  };
}

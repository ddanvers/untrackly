export const useE2EE = () => {
  const { user } = useAuth();
  const myPublicKey = ref<string | null>(null);
  const sharedKeys = new Map<string, CryptoKey>();

  // Initialize: Load or Generate Keys, Publish to Server
  const initE2EE = async () => {
    let keys = await getStoredKeyPair();

    if (!keys) {
      console.log("Generating new E2EE keys...");
      keys = await generateKeyPair();
      await storeKeyPair(keys);
    }

    const exportedPub = await exportPublicKey(keys.publicKey);
    myPublicKey.value = exportedPub;

    // Publish to server if logged in
    // We strictly assume user is logged in here
    if (user.value?.id) {
      await publishPublicKey(exportedPub);
    }
  };

  const publishPublicKey = async (key: string) => {
    try {
      await $fetch("/api/users/key", {
        method: "POST",
        body: { publicKey: key },
      });
    } catch (e) {
      console.error("Failed to publish public key", e);
    }
  };

  const getRemotePublicKey = async (
    userId: string,
  ): Promise<CryptoKey | null> => {
    try {
      const data = await $fetch<{ publicKey: string }>(
        `/api/users/${userId}/key`,
      );
      if (data.publicKey) {
        return await importPublicKey(data.publicKey);
      }
      return null;
    } catch (e) {
      console.error(`Failed to fetch public key for user ${userId}`, e);
      return null;
    }
  };

  const getSharedKey = async (
    peerUserId: string,
  ): Promise<CryptoKey | null> => {
    const cacheKey = String(peerUserId);
    if (sharedKeys.has(cacheKey)) {
      return sharedKeys.get(cacheKey)!;
    }

    const keys = await getStoredKeyPair();
    if (!keys) return null;

    const remoteKey = await getRemotePublicKey(peerUserId);
    if (!remoteKey) return null;

    const shared = await deriveSharedKey(keys.privateKey, remoteKey);
    sharedKeys.set(cacheKey, shared);
    return shared;
  };

  const encryptForUser = async (
    targetUserId: string,
    text: string,
    aadInfo?: string | Uint8Array,
  ) => {
    const sharedKey = await getSharedKey(targetUserId);
    if (!sharedKey) {
      throw new Error(
        `Could not establish secure session with user ${targetUserId}`,
      );
    }
    return await encryptMessage(sharedKey, text, aadInfo);
  };

  const decryptFromUser = async (
    senderUserId: string,
    ciphertext: string,
    iv: string,
    aadInfo?: string | Uint8Array,
  ) => {
    const sharedKey = await getSharedKey(senderUserId);
    if (!sharedKey) {
      throw new Error(
        `Could not establish secure session with user ${senderUserId}`,
      );
    }
    return await decryptMessage(sharedKey, ciphertext, iv, aadInfo);
  };

  return {
    initE2EE,
    myPublicKey,
    encryptForUser,
    decryptFromUser,
    getSharedKey,
    getRemotePublicKey,
    getStoredKeyPair, // Expose for Ratchet init
  };
};

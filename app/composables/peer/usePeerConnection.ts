import type { DataConnection, Peer } from "peerjs";
import type { Member, RoomData } from "./types";
import { useDoubleRatchet } from "./useDoubleRatchet";
import { useFunnyNames } from "./useFunnyNames";

import { calculateDataSize } from "./utils";

export function usePeerConnection(
  sessionId: string,
  isInitiator: boolean,
  roomData: Ref<RoomData>,
  updateRoomData: <T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ) => void,
  updateMember: (id: string, updates: Partial<Member>) => void,
  onMessageReceived: (data: any, senderId: string) => void,
  updateBytesTransferred: (sent: number, received: number) => void,
) {
  const peer = shallowRef<Peer | null>(null);
  const { user } = useAuth();
  const { encryptForUser, decryptFromUser } = useE2EE();

  // Record of active data connections: peerId -> DataConnection
  const connections = reactive<Record<string, DataConnection>>({});
  const isConnectionEstablished = ref(false); // True if at least one connection is open
  const isInitializing = ref(false);
  const reinitAttempts = ref(0);
  const maxReinitAttempts = 5;
  const pingInterval = ref<any>(null);

  watch(isConnectionEstablished, (connected) => {
    if (connected) {
      startPingLoop();
    } else {
      stopPingLoop();
    }
  });

  function startPingLoop() {
    if (pingInterval.value) return;
    pingInterval.value = setInterval(() => {
      Object.values(connections).forEach((conn) => {
        if (conn.open) {
          conn.send({ type: "ping", timestamp: Date.now() });
        }
      });
    }, 5000);
  }

  function stopPingLoop() {
    if (pingInterval.value) {
      clearInterval(pingInterval.value);
      pingInterval.value = null;
    }
  }

  const { generateName } = useFunnyNames();
  const { showError, showWarning, showSuccess } = useAlert();
  const myName = ref(generateName(useDeviceId())); // We might want to persist this or allow editing later

  // Reconnection logic (for specific peers)
  const retryStates = reactive(
    new Map<string, { attempts: number; lastRetryTime: number }>(),
  );

  function startPeerReconnectLoop(_targetPeerId: string) {
    // Basic simplified reconnect logic for mesh:
    // If we lose a peer, we might want to try reconnecting a few times.
    // For now, let's keep it simple: if connection closes, we mark them offline.
    // If we are 'Persistent' (host), maybe we try to reconnect?
  }

  /* Double Ratchet Integration */
  const { initRatchetSession, encryptRatchet, decryptRatchet, hasSession } =
    useDoubleRatchet();
  const { getSharedKey, getRemotePublicKey } = useE2EE();

  // Helper for backpressure
  async function sendWithBackpressure(conn: DataConnection, data: any) {
    const MAX_BUFFERED_AMOUNT = 64 * 1024; // 64KB limit before waiting
    // Check if dataChannel exists and has bufferedAmount

    const channel = conn.dataChannel;

    if (channel && channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      // Wait for buffer to drain
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 10); // Check every 10ms
      });
    }
    conn.send(data);
  }

  async function broadcast(data: any) {
    const promises = Object.values(connections).map(async (conn) => {
      if (conn.open) {
        try {
          // Encrypt if message and user known
          if (
            data?.type === "message" ||
            data?.type === "edit-message" ||
            data?.type === "delete-message"
          ) {
            // Look up member
            const member = roomData.value.members[conn.peer];
            if (member?.userId) {
              try {
                // Ensure Ratchet Session Exists
                if (!hasSession(conn.peer)) {
                  console.warn(
                    `[DoubleRatchet] No session for ${conn.peer}, trying to init...`,
                  );
                  // Try to init if we have the info, otherwise skip (wait for hello)
                  const sharedKey = await getSharedKey(member.userId);
                  const remoteKey = await getRemotePublicKey(member.userId);
                  const myKeyPair = await getStoredKeyPair();

                  if (sharedKey && remoteKey && user.value?.id && myKeyPair) {
                    const role =
                      user.value.id < member.userId ? "alice" : "bob";
                    await initRatchetSession(
                      conn.peer,
                      role,
                      sharedKey,
                      remoteKey,
                      myKeyPair,
                    );

                    // If we are Alice, we MUST prime the connection so Bob gets our Ratchet Key
                    // and can initialize his sending chain.
                    if (role === "alice") {
                      console.log(
                        `[DoubleRatchet] Alice pruning connection with handshake to ${conn.peer}`,
                      );
                      const handshakeData = {
                        type: "handshake",
                        timestamp: Date.now(),
                      };
                      const content = JSON.stringify(handshakeData);
                      const aad = `session:${sessionId}|sender:${user.value?.id}|recipient:${member.userId}|type:handshake`;

                      const { header, ciphertext, iv } = await encryptRatchet(
                        conn.peer,
                        content,
                        aad,
                      );

                      await sendWithBackpressure(conn, {
                        type: "encrypted-ratchet",
                        payload: { header, ciphertext, iv },
                        senderId: user.value?.id,
                        originalType: "handshake",
                      });
                    }
                  } else {
                    console.error(
                      `[DoubleRatchet] proper keys missing for ${conn.peer}`,
                    );
                    return;
                  }
                }

                const content = JSON.stringify(data);
                const aad = `session:${sessionId}|sender:${user.value?.id}|recipient:${member.userId}|type:${data.type}`;

                const { header, ciphertext, iv } = await encryptRatchet(
                  conn.peer,
                  content,
                  aad,
                );

                await sendWithBackpressure(conn, {
                  type: "encrypted-ratchet", // V2 Protocol
                  payload: { header, ciphertext, iv },
                  senderId: user.value?.id,
                  originalType: data.type,
                });
                return;
              } catch (encErr) {
                console.error(
                  `[usePeerConnection] Encryption failed for ${conn.peer} (User ${member.userId})`,
                  encErr,
                );
                return;
              }
            }
          }

          await sendWithBackpressure(conn, data);
        } catch (e) {
          console.warn("[usePeerConnection] Broadcast failed to", conn.peer, e);
        }
      }
    });

    await Promise.all(promises);
  }

  // Queue for sequential processing of incoming messages per connection to avoid Ratchet state race conditions
  const incomingQueues = new Map<string, Promise<void>>();

  function enqueueIncomingData(conn: DataConnection, data: any) {
    const peerId = conn.peer;
    const currentChain = incomingQueues.get(peerId) || Promise.resolve();

    const nextChain = currentChain.then(async () => {
      try {
        await handleIncomingData(conn, data);
      } catch (err) {
        console.error(
          `[usePeerConnection] Error processing incoming data from ${peerId}:`,
          err,
        );
      }
    });

    incomingQueues.set(peerId, nextChain);
  }

  async function handleIncomingData(conn: DataConnection, data: any) {
    // Double Ratchet Decryption
    if (data?.type === "encrypted-ratchet") {
      try {
        if (data.senderId && data.payload) {
          const aad = `session:${sessionId}|sender:${data.senderId}|recipient:${user.value?.id}|type:${data.originalType}`;

          // Ensure Session (if we missed Hello or it's out of order - tough, but try)
          if (!hasSession(conn.peer)) {
            const member = roomData.value.members[conn.peer];
            if (member?.userId) {
              // We knew them?
              const sharedKey = await getSharedKey(member.userId);
              const remoteKey = await getRemotePublicKey(member.userId);
              const myKeyPair = await getStoredKeyPair();
              if (sharedKey && remoteKey && user.value?.id && myKeyPair) {
                const role = user.value.id < member.userId ? "alice" : "bob";
                await initRatchetSession(
                  conn.peer,
                  role,
                  sharedKey,
                  remoteKey,
                  myKeyPair,
                );
              }
            }
          }

          const decryptedJson = await decryptRatchet(
            conn.peer,
            data.payload, // { header, ciphertext, iv }
            aad,
          );

          const decryptedData = JSON.parse(decryptedJson);
          // console.log(
          //     `[Ratchet] 🔓 Received from ${conn.peer}`
          // );

          // Recursively handle (but we are already inside the queue lock, so we can just call directly or recurse)
          // Note: If recursive payload is ALSO encrypted (nested?), we need to be careful.
          // But our protocol doesn't nest encrypted-ratchet inside encrypted-ratchet usually.
          // However, we DO want to pass through the queue again if we want to support nested types,
          // BUT here we have "decryptedData". If we call handleIncomingData(conn, decryptedData),
          // it serves to handle "hello", "message", etc. These are synchronous or safe async.
          // The critical part is the DECRYPTION step which mutates state.
          await handleIncomingData(conn, decryptedData);
          onMessageReceived(decryptedData, conn.peer);
          return;
        }
      } catch (decErr) {
        console.error("[usePeerConnection] Ratchet Decryption failed", decErr);
        return;
      }
    }

    // Legacy E2EE fallback (optional, remove if we want forced upgrade)
    if (data?.type === "encrypted") {
      try {
        if (data.senderId && data.payload && data.iv) {
          const aad = `session:${sessionId}|sender:${data.senderId}|recipient:${user.value?.id}|type:${data.originalType}`;
          const { decryptFromUser } = useE2EE(); // Grab legacy
          const decryptedJson = await decryptFromUser(
            data.senderId,
            data.payload,
            data.iv,
            aad,
          );
          const decryptedData = JSON.parse(decryptedJson);
          await handleIncomingData(conn, decryptedData);
          onMessageReceived(decryptedData, conn.peer);
          return;
        }
      } catch (decErr) {
        console.error("[usePeerConnection] Decryption failed", decErr);
        return;
      }
    }

    if (data?.type === "hello") {
      // Peer sent their info
      updateMember(conn.peer, {
        name: data.name,
        deviceId: data.deviceId,
        userId: data.userId, // Store User ID
        status: "online",
        lastSeen: Date.now(),
      }); // ... rest of function unchanged

      // Discovery: Send known peers to the new joiner
      const knownPeers = Object.keys(connections).filter(
        (id) => id !== conn.peer,
      );
      if (knownPeers.length > 0) {
        // 1. Tell the newcomer about everyone else
        conn.send({
          type: "peer-list",
          peers: knownPeers,
        });

        // 2. Tell everyone else about the newcomer (Gossip / Mesh Fix)
        // This ensures that if C joined, B gets told to connect to C.
        // Previously, only C was told to connect to B, which is a single point of failure.
        knownPeers.forEach((existingPeerId) => {
          const existingConn = connections[existingPeerId];
          if (existingConn && existingConn.open) {
            try {
              existingConn.send({
                type: "peer-list",
                peers: [conn.peer],
              });
            } catch (e) {
              console.warn(
                "[usePeerConnection] Failed to gossip new peer to",
                existingPeerId,
              );
            }
          }
        });
      }

      // Initialize Double Ratchet Session
      if (data.userId && user.value?.id) {
        if (data.userId === user.value.id) {
          // Self-connect loopback? Ignore.
        } else {
          Promise.all([
            getSharedKey(data.userId),
            getRemotePublicKey(data.userId),
            getStoredKeyPair(),
          ]).then(([sharedKey, remoteKey, myKeyPair]) => {
            if (sharedKey && remoteKey && myKeyPair) {
              const role = user.value!.id < data.userId ? "alice" : "bob";
              initRatchetSession(
                conn.peer,
                role,
                sharedKey,
                remoteKey,
                myKeyPair,
              ).then(async () => {
                console.log(`[DoubleRatchet] Session ready with ${conn.peer}`);
                if (role === "alice") {
                  console.log(
                    `[DoubleRatchet] Alice pruning connection with handshake to ${conn.peer} (via hello)`,
                  );
                  const handshakeData = {
                    type: "handshake",
                    timestamp: Date.now(),
                  };
                  const content = JSON.stringify(handshakeData);
                  const aad = `session:${sessionId}|sender:${user.value?.id}|recipient:${data.userId}|type:handshake`;

                  const { header, ciphertext, iv } = await encryptRatchet(
                    conn.peer,
                    content,
                    aad,
                  );

                  await sendWithBackpressure(conn, {
                    type: "encrypted-ratchet",
                    payload: { header, ciphertext, iv },
                    senderId: user.value?.id,
                    originalType: "handshake",
                  });
                }
              });
            }
          });
        }
      }

      return;
    }

    if (data?.type === "peer-list" && Array.isArray(data.peers)) {
      // Connect to new peers we just learned about
      data.peers.forEach((peerId: string) => {
        if (peerId !== peer.value?.id && !connections[peerId]) {
          connectToPeer(peerId);
        }
      });
      return;
    }

    if (data?.type === "member-update") {
      updateMember(conn.peer, data.updates);
      return;
    }

    if (data?.type === "ping") {
      conn.send({ type: "pong", timestamp: data.timestamp });
      // Also update them as online/seen
      updateMember(conn.peer, {
        status: "online",
        lastSeen: Date.now(),
      });
      return;
    }

    if (data?.type === "pong") {
      const rtt = Date.now() - data.timestamp;
      updateRoomData("network", {
        roundTripTime: rtt,
      });
      updateMember(conn.peer, {
        status: "online",
        lastSeen: Date.now(),
      });
      return;
    }

    // Pass any other messages (like unencrypted file-chunk) to application
    onMessageReceived(data, conn.peer);
  }

  function connectToPeer(targetId: string) {
    if (!peer.value || connections[targetId]) return;
    if (targetId === peer.value.id) return;

    console.log("[usePeerConnection] Connecting to:", targetId);
    try {
      const conn = peer.value.connect(targetId, { reliable: true });
      setupConnection(conn);
    } catch (e) {
      console.warn("[usePeerConnection] Failed to connect to", targetId, e);
    }
  }

  function setupConnection(conn: DataConnection) {
    connections[conn.peer] = conn;

    // Timeout logic for anchor connection
    let openTimeout: any = null;

    // Default timeout for ANY connection to open (15s)
    // This prevents "stuck" pending connections if NAT traversal fails silently
    const connectionTimeoutMs = 15000;

    if (!isInitiator && conn.peer === sessionId) {
      // Anchor specific longer/adaptive timeouts
      const timeoutDurations = [30000, 60000, 120000, 120000, 120000];
      const duration = timeoutDurations[reinitAttempts.value] || 120000;

      openTimeout = setTimeout(() => {
        if (!conn.open) {
          console.warn(
            `[usePeerConnection] Connection to anchor ${sessionId} timed out after ${duration}ms`,
          );
          conn.close();
          handleInitError({
            type: "timeout",
            message: "Anchor connection timed out",
          });
        }
      }, duration);
    } else {
      // General peer timeout
      openTimeout = setTimeout(() => {
        if (!conn.open) {
          console.warn(
            `[usePeerConnection] Connection to peer ${conn.peer} timed out after ${connectionTimeoutMs}ms`,
          );
          // Just close it so we can maybe retry or clean up UI
          conn.close();
          delete connections[conn.peer];
          // We don't error broadly here, just let it fail silently-ish?
          // Maybe we should updateMember status?
          // updateMember(conn.peer, { status: 'offline' }); // done in 'close' handler usually
        }
      }, connectionTimeoutMs);
    }

    conn.on("open", () => {
      if (openTimeout) clearTimeout(openTimeout);
      console.log("[usePeerConnection] Connection open with:", conn.peer);
      isConnectionEstablished.value = true;

      if (!isInitiator && conn.peer === sessionId) {
        reinitAttempts.value = 0; // Reset on successful anchor connection
      }

      retryStates.delete(conn.peer);

      // Send Hello
      conn.send({
        type: "hello",
        name: myName.value,
        deviceId: useDeviceId(),
        userId: user.value?.id, // Send my User ID
      });

      updateMember(conn.peer, {
        status: "online",
        lastSeen: Date.now(),
      });

      updateRoomData("network", {
        connectionStatus: "connected",
      });
    });

    conn.on("data", (data) => {
      const size = calculateDataSize(data);
      updateBytesTransferred(0, size);
      enqueueIncomingData(conn, data);
    });

    conn.on("close", () => {
      if (openTimeout) clearTimeout(openTimeout);
      console.log("[usePeerConnection] Connection closed with:", conn.peer);
      delete connections[conn.peer];
      incomingQueues.delete(conn.peer);

      // If we lost the anchor, try to reconnect
      if (!isInitiator && conn.peer === sessionId) {
        console.log("[usePeerConnection] Anchor connection lost, retrying...");
        setTimeout(() => {
          if (!connections[sessionId]) {
            connectToPeer(sessionId);
          }
        }, 3000);
      }

      // Check if member still exists (might have been replaced by a new ID/hello)
      if (!roomData.value.members[conn.peer]) {
        console.log(
          `[usePeerConnection] Member ${conn.peer} not found in roomData (likely replaced), skipping offline update.`,
        );
        return;
      }

      updateMember(conn.peer, {
        status: "offline",
        lastSeen: Date.now(),
      });

      if (Object.keys(connections).length === 0) {
        isConnectionEstablished.value = false;
        updateRoomData("network", {
          connectionStatus: "disconnected",
        });
      }
    });

    conn.on("error", (err) => {
      if (openTimeout) clearTimeout(openTimeout);
      console.error(
        "[usePeerConnection] Connection error with",
        conn.peer,
        err,
      );
      showWarning(`Ошибка соединения с участником: ${err.type || "unknown"}`);
    });
  }

  async function initPeer(opts?: { reconnect?: boolean }) {
    if (isInitializing.value) return;
    if (peer.value && !opts?.reconnect) return;
    if (!import.meta.client) return;
    let iceServers: any[] = [];
    try {
      const response = await fetch("/api/get-turn-credentials");
      if (response.ok) {
        iceServers = await response.json();
      } else {
        console.warn(
          "[usePeerConnection] API returned error:",
          response.status,
        );
      }
    } catch (e) {
      console.warn(
        "[usePeerConnection] Failed to fetch TURN credentials, using fallback",
      );
    }

    // Fallback if API returned empty or failed
    if (!iceServers || iceServers.length === 0) {
      iceServers = [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ];
    }

    isInitializing.value = true;
    try {
      // Dynamic import to avoid SSR errors
      const PeerClass = (await import("peerjs")).default;

      const options = {
        host: "untrackly.ru",
        path: "/peerjs",
        secure: true,
        debug: 1,
        config: {
          iceServers: iceServers,
        },
      };

      console.log(
        "[usePeerConnection] Initializing with iceServers:",
        options.config.iceServers,
      );

      if (isInitiator) {
        console.log(
          "[usePeerConnection] Initializing as initiator with ID:",
          sessionId,
        );
        peer.value = new PeerClass(sessionId, options);
      } else {
        console.log(
          "[usePeerConnection] Initializing as joiner with random ID",
        );
        peer.value = new PeerClass(options);
      }

      if (!peer.value) return;

      peer.value.on("open", (id) => {
        console.log("[usePeerConnection] My Peer ID generated:", id);

        // Register ourselves in the member list
        updateMember(id, {
          name: myName.value,
          deviceId: useDeviceId(),
          userId: user.value?.id,
          isSelf: true,
          status: "online",
          lastSeen: Date.now(),
        });

        if (!isInitiator || id !== sessionId) {
          console.log(
            "[usePeerConnection] Connecting to session anchor:",
            sessionId,
          );
          connectToPeer(sessionId);
        }

        updateRoomData("network", { connectionStatus: "connecting" });
      });

      peer.value.on("connection", (conn) => {
        console.log("[usePeerConnection] Incoming connection from:", conn.peer);
        setupConnection(conn);
      });

      peer.value.on("error", (err: any) => {
        console.error("[usePeerConnection] Peer error:", err);

        if (err.type === "id-taken" && isInitiator) {
          console.warn(
            "[usePeerConnection] ID taken. Trying again with random ID to join existing room.",
          );
          destroyPeer();
          setTimeout(() => {
            if (peer.value) return;
            const p = new PeerClass(options);
            peer.value = p;
            p.on("open", (id) => {
              console.log("[usePeerConnection] Fallback Peer opened:", id);
              connectToPeer(sessionId);
              updateRoomData("network", { connectionStatus: "connecting" });
            });
            p.on("connection", (c) => setupConnection(c));
            p.on("error", (e) => {
              console.error("[usePeerConnection] Fallback Peer error:", e);
              handleInitError(e);
            });
          }, 500);
          return;
        }

        handleInitError(err);
      });
    } catch (e: any) {
      console.error("[usePeerConnection] Failed to init Peer:", e);
      handleInitError(e);
    } finally {
      isInitializing.value = false;
    }
  }

  function handleInitError(_err: any) {
    if (reinitAttempts.value < maxReinitAttempts) {
      reinitAttempts.value++;
      const delay = 2 ** reinitAttempts.value * 1000;
      console.log(
        `[usePeerConnection] Reinit attempt ${reinitAttempts.value} in ${delay}ms...`,
      );
      showWarning(
        `Проблема с подключением. Попытка ${reinitAttempts.value} из ${maxReinitAttempts}...`,
      );

      setTimeout(() => {
        destroyPeer();
        initPeer({ reconnect: true });
      }, delay);
    } else {
      console.error("[usePeerConnection] Max reinit attempts reached.");
      showError(
        "Невозможно подключиться в закрытый чат. Попробуйте обновить страницу, выключить VPN или средства обхода блокировок.",
        10000,
      );
      updateRoomData("network", { connectionStatus: "failed" });
    }
  }

  function destroyPeer() {
    for (const c of Object.values(connections)) c.close();
    for (const k of Object.keys(connections)) delete connections[k];
    incomingQueues.clear();
    peer.value?.destroy();
    peer.value = null;
  }

  return {
    peer,
    connections,
    isConnectionEstablished,
    myName,
    initPeer,
    connectToPeer,
    destroyPeer,
    setupConnection, // Exposed if needed
    broadcast,
    handleIncomingData,
  };
}

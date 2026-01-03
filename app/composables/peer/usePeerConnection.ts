import type { DataConnection, Peer } from "peerjs";
import type { Member, RoomData } from "./types";
import { useFunnyNames } from "./useFunnyNames";

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

  async function broadcast(data: any) {
    for (const conn of Object.values(connections)) {
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
                const content = JSON.stringify(data);
                const aad = `session:${sessionId}|sender:${user.value?.id}|recipient:${member.userId}|type:${data.type}`;

                const { ciphertext, iv } = await encryptForUser(
                  member.userId,
                  content,
                  aad,
                );

                conn.send({
                  type: "encrypted",
                  payload: ciphertext,
                  senderId: user.value?.id,
                  iv,
                  originalType: data.type,
                });
                console.log(
                  `[E2EE] 🔒 Sending Encrypted Message to ${conn.peer} (User ${member.userId})`,
                );
                console.log(`[E2EE] Ciphertext Payload:`, ciphertext);
                continue;
              } catch (encErr) {
                console.error(
                  `[usePeerConnection] Encryption failed for ${conn.peer} (User ${member.userId})`,
                  encErr,
                );
                // Fallback? NO. Secure by default.
                // maybe send error or skip?
                // sending plain text is A SECURITY RISK.
                continue;
              }
            }
          }

          conn.send(data);
        } catch (e) {
          console.warn("[usePeerConnection] Broadcast failed to", conn.peer, e);
        }
      }
    }
  }

  async function handleIncomingData(conn: DataConnection, data: any) {
    // Decrypt if needed
    if (data?.type === "encrypted") {
      try {
        if (data.senderId && data.payload && data.iv) {
          const aad = `session:${sessionId}|sender:${data.senderId}|recipient:${user.value?.id}|type:${data.originalType}`;
          const decryptedJson = await decryptFromUser(
            data.senderId,
            data.payload,
            data.iv,
            aad,
          );
          const decryptedData = JSON.parse(decryptedJson);
          console.log(
            `[E2EE] 🔓 Received Encrypted Message from ${conn.peer} (User ${data.senderId})`,
          );
          console.log(`[E2EE] Decrypted Content:`, decryptedData);
          // Recursively handle the decrypted data
          handleIncomingData(conn, decryptedData);
          // Also notify listener
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
        conn.send({
          type: "peer-list",
          peers: knownPeers,
        });
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
    }
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
    if (!isInitiator && conn.peer === sessionId) {
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
      handleIncomingData(conn, data);
      onMessageReceived(data, conn.peer);
    });

    conn.on("close", () => {
      if (openTimeout) clearTimeout(openTimeout);
      console.log("[usePeerConnection] Connection closed with:", conn.peer);
      delete connections[conn.peer];

      updateMember(conn.peer, {
        status: "offline",
        lastSeen: Date.now(),
      });

      // If we lost the anchor, try to reconnect
      if (!isInitiator && conn.peer === sessionId) {
        console.log("[usePeerConnection] Anchor connection lost, retrying...");
        setTimeout(() => {
          if (!connections[sessionId]) {
            connectToPeer(sessionId);
          }
        }, 3000);
      }

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
    const response = await fetch(
      `https://untracklyone.metered.live/api/v1/turn/credentials?apiKey=${useRuntimeConfig().public.turnApiKey}`,
    );

    const iceServers = await response.json();
    isInitializing.value = true;
    try {
      // Dynamic import to avoid SSR errors
      const PeerClass = (await import("peerjs")).default;

      const options = {
        host: "peerjs-server-gims.onrender.com",
        path: "/",
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

import type { DataConnection, Peer } from "peerjs";
import { type Ref, reactive, ref, shallowRef } from "vue";
import type { Member, RoomData } from "./types";
import { useFunnyNames } from "./useFunnyNames";

export function usePeerConnection(
  sessionId: string,
  isInitiator: boolean,
  updateRoomData: <T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ) => void,
  updateMember: (id: string, updates: Partial<Member>) => void,
  onMessageReceived: (data: any, senderId: string) => void,
) {
  const peer = shallowRef<Peer | null>(null);
  // Record of active data connections: peerId -> DataConnection
  const connections = reactive<Record<string, DataConnection>>({});
  const isConnectionEstablished = ref(false); // True if at least one connection is open

  const { generateName } = useFunnyNames();
  const myName = ref(generateName()); // We might want to persist this or allow editing later

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

  function broadcast(data: any) {
    for (const conn of Object.values(connections)) {
      if (conn.open) {
        try {
          conn.send(data);
        } catch (e) {
          console.warn("[usePeerConnection] Broadcast failed to", conn.peer, e);
        }
      }
    }
  }

  function handleIncomingData(conn: DataConnection, data: any) {
    if (data?.type === "hello") {
      // Peer sent their info
      updateMember(conn.peer, {
        name: data.name,
        status: "online",
        lastSeen: Date.now(),
      });

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

    conn.on("open", () => {
      console.log("[usePeerConnection] Connection open with:", conn.peer);
      isConnectionEstablished.value = true;

      retryStates.delete(conn.peer);

      // Send Hello
      conn.send({
        type: "hello",
        name: myName.value,
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
      console.log("[usePeerConnection] Connection closed with:", conn.peer);
      delete connections[conn.peer];

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
      console.error(
        "[usePeerConnection] Connection error with",
        conn.peer,
        err,
      );
    });
  }

  async function initPeer(opts?: { reconnect?: boolean }) {
    if (peer.value && !opts?.reconnect) return;
    if (!import.meta.client) return;

    // Dynamic import to avoid SSR errors
    const PeerClass = (await import("peerjs")).default;

    const options = {
      host: "peerjs-server-gims.onrender.com",
      path: "/",
      secure: true,
      debug: 1,
    };

    if (isInitiator) {
      console.log(
        "[usePeerConnection] Initializing as initiator with ID:",
        sessionId,
      );
      peer.value = new PeerClass(sessionId, options);
    } else {
      console.log("[usePeerConnection] Initializing as joiner with random ID");
      peer.value = new PeerClass(options);
    }

    if (!peer.value) return;

    peer.value.on("open", (id) => {
      console.log("[usePeerConnection] My Peer ID generated:", id);

      // Register ourselves in the member list
      updateMember(id, {
        name: myName.value,
        isSelf: true,
        status: "online",
        lastSeen: Date.now(),
      });

      if (!isInitiator || id !== sessionId) {
        // If we tried to be initiator but got a different ID (handle by fallback)
        // or if we are explicitly not initiator, connect to the session anchor.
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
        // We cannot just call initPeer again immediately because the 'peer' object might be in a bad state.
        // We'll mark as non-initiator for the next attempt or just use a random ID.
        destroyPeer();
        // Force random ID on next attempt
        setTimeout(() => {
          // Create a new peer with random ID but still pointing to the same sessionId as anchor
          const p = new PeerClass(options);
          peer.value = p;
          p.on("open", (id) => {
            console.log("[usePeerConnection] Fallback Peer opened:", id);
            connectToPeer(sessionId);
          });
          p.on("connection", (c) => setupConnection(c));
          p.on("error", (e) =>
            console.error("[usePeerConnection] Fallback Peer error:", e),
          );
        }, 500);
        return;
      }

      updateRoomData("network", { connectionStatus: "failed" });
    });
  }

  function destroyPeer() {
    for (const c of Object.values(connections)) c.close();
    for (const k of Object.keys(connections)) delete connections[k];
    peer.value?.destroy();
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

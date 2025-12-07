import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { type Ref, ref } from "vue";
import type { RoomData } from "./types";

export function usePeerConnection(
  sessionId: string,
  isInitiator: boolean,
  updateRoomData: <T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ) => void,
) {
  const peer = ref<Peer | null>(null);
  const conn = ref<DataConnection | null>(null);
  const isConnectionEstablished = ref(false);
  const companionReconnectTimer = ref<number | null>(null);

  const retryState = {
    attempts: 0,
    lastRetryTime: 0,
    exponentialBackoff: 1000,
  };

  function getStoredConnectionId(sessionId: string): string | null {
    if (typeof window === "undefined" || !("sessionStorage" in window))
      return null;
    try {
      return sessionStorage.getItem(`chat:conn:${sessionId}`);
    } catch {
      return null;
    }
  }

  function setStoredConnectionId(
    sessionId: string,
    connectionPeerId: string,
  ): void {
    if (typeof window === "undefined" || !("sessionStorage" in window)) return;
    try {
      sessionStorage.setItem(`chat:conn:${sessionId}`, connectionPeerId);
    } catch {}
  }

  function startCompanionReconnectLoop() {
    if (companionReconnectTimer.value) return;
    retryState.attempts = 0;

    const attempt = () => {
      if (conn.value?.open) {
        stopCompanionReconnectLoop();
        return;
      }

      retryState.attempts++;
      retryState.lastRetryTime = Date.now();

      const target = sessionId; // <- always initiator
      console.log(
        "[usePeerConnection] reconnect loop attempt",
        retryState.attempts,
        "->",
        target,
      );

      try {
        connectToPeer(target);
      } catch (e) {
        console.warn("[usePeerConnection] reconnect attempt failed:", e);
      }

      const nextDelay = Math.min(
        30000,
        1000 * 2 ** Math.min(6, retryState.attempts - 1),
      );

      companionReconnectTimer.value = window.setTimeout(
        attempt,
        nextDelay,
      ) as unknown as number;
    };

    attempt();
  }

  function stopCompanionReconnectLoop() {
    if (!companionReconnectTimer.value) return;
    clearTimeout(companionReconnectTimer.value);
    companionReconnectTimer.value = null;
    retryState.attempts = 0;
  }

  function connectToPeer(targetId?: string) {
    if (!peer.value) return;
    const target = targetId || sessionId;
    if (!target) {
      console.warn("[usePeerConnection] connectToPeer: no target specified");
      return;
    }
    console.log("[usePeerConnection] connectToPeer ->", target);
    const connection = peer.value.connect(target, { reliable: true });
    setupConnection(connection);
  }

  function setupConnection(connection: DataConnection) {
    conn.value = connection;

    connection.on("open", () => {
      console.log("[usePeerConnection] Connection open");
      isConnectionEstablished.value = true;
      stopCompanionReconnectLoop();

      updateRoomData("network", {
        connectionStatus: "connected",
        dataTransferStatus: "idle",
      });

      updateRoomData("members", {
        companionStatus: "online",
        lastActivityTimestamp: Date.now(),
      });

      retryState.attempts = 0;
      retryState.exponentialBackoff = 1000;

      // Notify listener (Coordinator will handle metrics init)
    });

    connection.on("close", () => {
      console.log("[usePeerConnection] Connection closed");
      conn.value = null;
      isConnectionEstablished.value = false;

      updateRoomData("network", {
        connectionStatus: "disconnected",
        dataTransferStatus: "idle",
      });

      updateRoomData("members", {
        companionStatus: "offline",
        companionLastSeen: Date.now(),
      });

      if (!isInitiator) {
        console.log(
          "[usePeerConnection] Connection closed, starting reconnect loop (non-initiator)",
        );
        startCompanionReconnectLoop();
      } else {
        console.log(
          "[usePeerConnection] Connection closed (initiator) — not starting reconnect loop",
        );
      }
    });

    connection.on("error", (err: any) => {
      console.error("[usePeerConnection] Connection error:", err);
      isConnectionEstablished.value = false;

      retryState.attempts++;
      retryState.lastRetryTime = Date.now();

      updateRoomData("network", {
        connectionStatus: "failed",
        retryAttempts: retryState.attempts,
        dataTransferStatus: "idle",
      });
    });
  }

  function initPeer(opts?: { reconnect?: boolean }) {
    const reconnect = !!opts?.reconnect;
    const storedPeerId = reconnect ? getStoredConnectionId(sessionId) : null;
    const options = {
      host: "peerjs-server-gims.onrender.com",
      path: "/",
      secure: true,
    };
    console.log("[usePeerConnection] initPeer", {
      sessionId,
      isInitiator,
      reconnect,
      storedPeerId,
    });

    if (isInitiator) {
      peer.value = new Peer(sessionId, options);
    } else {
      peer.value = new Peer(undefined, options);
    }

    peer.value.on("open", (id: string) => {
      console.log("[usePeerConnection] Peer open", id, {
        storedPeerId,
        reconnect,
      });

      try {
        setStoredConnectionId(sessionId, id);
      } catch (e) {}

      if (!isInitiator) {
        setTimeout(() => {
          try {
            connectToPeer(sessionId);
          } catch (e) {
            console.warn("[usePeerConnection] connectToPeer failed on open", e);
          }
        }, 50);
      }

      updateRoomData("network", { connectionStatus: "connecting" });
    });

    peer.value.on("connection", (connection) => {
      console.log("[usePeerConnection] Incoming connection");
      setupConnection(connection);
    });

    peer.value.on("error", (err) => {
      console.error("[usePeerConnection] Peer error:", err);
    });
  }

  function destroyPeer() {
    conn.value?.close();
    peer.value?.destroy();
  }

  return {
    peer,
    conn,
    isConnectionEstablished,
    initPeer,
    connectToPeer,
    destroyPeer,
    setupConnection, // Exposed for coordinator if needed, though mostly internal usage via peer.on('connection')
  };
}

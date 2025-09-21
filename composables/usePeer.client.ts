import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { useDebounce } from "~/composables/useDebounce";
type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "failed";
type UserStatus = "online" | "away" | "busy" | "offline";
type NetworkQuality = "excellent" | "good" | "poor" | "unstable" | "critical";
type DataTransferStatus =
  | "idle"
  | "transmitting"
  | "receiving"
  | "bidirectional";
type CallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "active"
  | "ended"
  | "declined"
  | "failed";
interface NetworkMetrics {
  connectionStatus: ConnectionStatus;
  quality: NetworkQuality;
  dataTransferStatus: DataTransferStatus;
  sentBytes: number;
  receivedBytes: number;
  roundTripTime: number;
  packetLossPercentage: number;
  estimatedBandwidth: number;
  lastPingTimestamp: number;
  connectionUptime: number;
  jitterMs: number;
  retryAttempts: number;
}

interface MemberStatus {
  yourStatus: UserStatus;
  companionStatus: UserStatus;
  companionLastSeen: number;
  isCompanionTyping: boolean;
  lastActivityTimestamp: number;
}

interface RoomMetadata {
  id: string;
  dateCreated: string;
  dateUpdated: string;
  sessionDuration: number;
  name?: string;
}

interface CallMetrics {
  status: CallStatus;
  type: "audio" | "video" | null;
  startTime: number | null;
  duration: number;
  totalCalls: number;
  quality: {
    videoResolution: string | null;
    audioQuality: "excellent" | "good" | "poor" | null;
    frameRate: number | null;
  };
}

interface MessageMetrics {
  messagesSent: number;
  messagesReceived: number;
  unreadCount: number;
  filesShared: number;
  lastMessageTimestamp: number;
}

interface RoomData {
  room: RoomMetadata;
  members: MemberStatus;
  network: NetworkMetrics;
  call: CallMetrics;
  messages: MessageMetrics;
}
interface ReplyMessageData {
  id: string;
  text: string;
  sender: string;
}
export function usePeer(sessionId: string, isInitiator: boolean) {
  const peer = ref<Peer | null>(null);
  const conn = ref<DataConnection | null>(null);
  const messages = ref<Message[]>([]);
  const isConnectionEstablished = ref(false);
  const attachedFiles = ref<File[]>([]);
  const roomData = ref<RoomData>({
    room: {
      id: sessionId,
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
      sessionDuration: 0,
    },
    members: {
      yourStatus: "online",
      companionStatus: "offline",
      companionLastSeen: 0,
      isCompanionTyping: false,
      lastActivityTimestamp: Date.now(),
    },
    network: {
      connectionStatus: "connecting",
      quality: "good",
      dataTransferStatus: "idle",
      sentBytes: 0,
      receivedBytes: 0,
      roundTripTime: 0,
      packetLossPercentage: 0,
      estimatedBandwidth: 0,
      lastPingTimestamp: 0,
      connectionUptime: 0,
      jitterMs: 0,
      retryAttempts: 0,
    },
    call: {
      status: "idle",
      type: null,
      startTime: null,
      duration: 0,
      totalCalls: 0,
      quality: {
        videoResolution: null,
        audioQuality: null,
        frameRate: null,
      },
    },
    messages: {
      messagesSent: 0,
      messagesReceived: 0,
      unreadCount: 0,
      filesShared: 0,
      lastMessageTimestamp: 0,
    },
  });

  const metricsState = reactive({
    connectionStartTime: 0,
    lastPingTime: 0,
    pingInterval: null as NodeJS.Timeout | null,
    rttHistory: [] as number[], // For jitter calculation
    bytesTracker: {
      lastSentBytes: 0,
      lastReceivedBytes: 0,
      transferStartTime: 0,
    },
    retryState: {
      attempts: 0,
      lastRetryTime: 0,
      exponentialBackoff: 1000, // Base retry delay
    },
  });
  // reconnect loop state (используем setTimeout-loop, чтобы менять delay)
  const companionReconnectTimer = ref<number | null>(null);
  const initiatorUnloadHandler: (() => void) | null = null;

  /**
   * Запускает loop повторных попыток подключения (экспоненциальный бэкофф)
   * будет пытаться пока conn не станет open
   */

  function startCompanionReconnectLoop() {
    if (companionReconnectTimer.value) return;
    metricsState.retryState.attempts = 0;

    const attempt = () => {
      if (conn.value?.open) {
        stopCompanionReconnectLoop();
        return;
      }

      metricsState.retryState.attempts++;
      metricsState.retryState.lastRetryTime = Date.now();

      const target = sessionId; // <- всегда инициатор
      console.log(
        "[usePeer] reconnect loop attempt",
        metricsState.retryState.attempts,
        "->",
        target,
      );

      try {
        connectToPeer(target);
      } catch (e) {
        console.warn("[usePeer] reconnect attempt failed:", e);
      }

      const nextDelay = Math.min(
        30000,
        1000 * 2 ** Math.min(6, metricsState.retryState.attempts - 1),
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
    metricsState.retryState.attempts = 0;
  }

  function initializeMetricsTracking(): void {
    metricsState.connectionStartTime = Date.now();
    startPingMonitoring();
    startSessionDurationTracking();
  }

  const pingPongCompanionDiscottectionTimeout = ref<NodeJS.Timeout | null>(
    null,
  );
  function startCountDownCompanionDiscottection() {
    if (!pingPongCompanionDiscottectionTimeout.value) {
      pingPongCompanionDiscottectionTimeout.value = setTimeout(() => {
        updateRoomData("members", {
          companionStatus: "offline",
        });
        if (pingPongCompanionDiscottectionTimeout.value) {
          clearTimeout(pingPongCompanionDiscottectionTimeout.value);
          pingPongCompanionDiscottectionTimeout.value = null;
        }
      }, 5000);
    }
  }
  function startPingMonitoring(): void {
    if (metricsState.pingInterval) {
      clearInterval(metricsState.pingInterval);
    }

    metricsState.pingInterval = setInterval(() => {
      if (conn.value?.open) {
        const pingStart = Date.now();
        metricsState.lastPingTime = pingStart;
        startCountDownCompanionDiscottection();
        conn.value.send({
          type: "ping",
          timestamp: pingStart,
        });
      }
    }, 5000);
  }

  function startSessionDurationTracking(): void {
    setInterval(() => {
      if (metricsState.connectionStartTime > 0) {
        updateRoomData("room", {
          sessionDuration: Date.now() - metricsState.connectionStartTime,
        });
      }
    }, 1000);
  }

  /**
   * Calculate network quality based on RTT, packet loss, and jitter
   * Uses a composite scoring algorithm for accurate quality assessment
   * @param rtt - Round trip time in milliseconds
   * @param packetLoss - Packet loss percentage (0-100)
   * @param jitter - Network jitter in milliseconds
   * @returns Network quality classification
   */
  function calculateNetworkQuality(
    rtt: number,
    packetLoss: number,
    jitter: number,
  ): NetworkQuality {
    // Weighted scoring system: RTT (40%), Packet Loss (35%), Jitter (25%)
    const rttScore =
      rtt < 50 ? 100 : rtt < 100 ? 80 : rtt < 200 ? 60 : rtt < 500 ? 40 : 20;
    const lossScore =
      packetLoss < 0.5
        ? 100
        : packetLoss < 1
          ? 80
          : packetLoss < 3
            ? 60
            : packetLoss < 10
              ? 40
              : 20;
    const jitterScore =
      jitter < 10
        ? 100
        : jitter < 20
          ? 80
          : jitter < 50
            ? 60
            : jitter < 100
              ? 40
              : 20;

    const compositeScore =
      rttScore * 0.4 + lossScore * 0.35 + jitterScore * 0.25;

    if (compositeScore >= 90) return "excellent";
    if (compositeScore >= 70) return "good";
    if (compositeScore >= 50) return "poor";
    if (compositeScore >= 30) return "unstable";
    return "critical";
  }

  /**
   * Calculate network jitter from RTT history
   * Jitter represents the variance in packet delivery times
   * @param rttHistory - Array of recent RTT measurements
   * @returns Calculated jitter in milliseconds
   */
  function calculateJitter(rttHistory: number[]): number {
    if (rttHistory.length < 2) return 0;

    const mean =
      rttHistory.reduce((sum, rtt) => sum + rtt, 0) / rttHistory.length;
    const variance =
      rttHistory.reduce((sum, rtt) => sum + (rtt - mean) ** 2, 0) /
      rttHistory.length;
    return Math.sqrt(variance);
  }

  /**
   * Determine data transfer status based on recent activity
   * @param sentBytes - Current sent bytes count
   * @param receivedBytes - Current received bytes count
   * @returns Current data transfer activity state
   */
  function determineDataTransferStatus(
    sentBytes: number,
    receivedBytes: number,
  ): DataTransferStatus {
    const { lastSentBytes, lastReceivedBytes } = metricsState.bytesTracker;

    const isSending = sentBytes > lastSentBytes;
    const isReceiving = receivedBytes > lastReceivedBytes;

    if (isSending && isReceiving) return "bidirectional";
    if (isSending) return "transmitting";
    if (isReceiving) return "receiving";
    return "idle";
  }

  function updateRoomData<T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ): void {
    roomData.value = {
      ...roomData.value,
      [section]: {
        ...roomData.value[section],
        ...updates,
      },
    };

    if (section !== "room" && section === "messages") {
      updateRoomData("room", {
        dateUpdated: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle ping responses and update network metrics with enhanced analysis
   * Implements comprehensive network quality assessment with jitter calculation
   * @param timestamp - Original ping timestamp for RTT calculation
   */
  function handlePingResponse(timestamp: number): void {
    const now = Date.now();
    const rtt = now - timestamp;

    // Maintain RTT history for jitter calculation (sliding window of 10 measurements)
    metricsState.rttHistory.push(rtt);
    if (metricsState.rttHistory.length > 10) {
      metricsState.rttHistory.shift();
    }
    console.log(roomData.value);
    const jitter = calculateJitter(metricsState.rttHistory);
    const currentBytes =
      roomData.value.network.sentBytes + roomData.value.network.receivedBytes;
    const previousBytes =
      metricsState.bytesTracker.lastSentBytes +
      metricsState.bytesTracker.lastReceivedBytes;

    // Estimate bandwidth based on data transfer over time interval
    const timeDelta = now - roomData.value.network.lastPingTimestamp;
    const bytesDelta = currentBytes - previousBytes;
    const estimatedBandwidth =
      timeDelta > 0 ? (bytesDelta * 8) / (timeDelta / 1000) / 1024 : 0; // kbps

    updateRoomData("network", {
      roundTripTime: rtt,
      jitterMs: jitter,
      lastPingTimestamp: now,
      connectionUptime: now - metricsState.connectionStartTime,
      estimatedBandwidth: Math.max(
        estimatedBandwidth,
        roomData.value.network.estimatedBandwidth * 0.8,
      ), // Smoothed estimate
      quality: calculateNetworkQuality(
        rtt,
        roomData.value.network.packetLossPercentage,
        jitter,
      ),
    });
  }

  /**
   * Track bytes transferred and update network metrics with enhanced precision
   * Implements granular data transfer monitoring with activity state detection
   * @param sent - Bytes sent in this transmission
   * @param received - Bytes received in this transmission
   */
  function updateBytesTransferred(sent: number, received: number): void {
    const newSentBytes = roomData.value.network.sentBytes + sent;
    const newReceivedBytes = roomData.value.network.receivedBytes + received;

    const dataTransferStatus = determineDataTransferStatus(
      newSentBytes,
      newReceivedBytes,
    );

    updateRoomData("network", {
      sentBytes: newSentBytes,
      receivedBytes: newReceivedBytes,
      dataTransferStatus,
    });

    // Update tracking state for next calculation
    metricsState.bytesTracker.lastSentBytes = newSentBytes;
    metricsState.bytesTracker.lastReceivedBytes = newReceivedBytes;
  }

  // session helpers — SSR-safe, положи рядом с getStoredPeerId / setStoredPeerId
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
  function clearStoredConnectionId(sessionId: string): void {
    if (typeof window === "undefined" || !("sessionStorage" in window)) return;
    try {
      sessionStorage.removeItem(`chat:conn:${sessionId}`);
    } catch {}
  }

  /**
   * Enhanced connection setup with metrics tracking
   */
  function initPeer(opts?: { reconnect?: boolean }) {
    const reconnect = !!opts?.reconnect;
    const storedPeerId = reconnect ? getStoredConnectionId(sessionId) : null;
    const options = {
      host: "peerjs-server-gims.onrender.com",
      path: "/",
      secure: true,
    };
    console.log("[usePeer] initPeer", {
      sessionId,
      isInitiator,
      reconnect,
      storedPeerId,
    });
    // Для инициатора — используем свой sessionId, для клиента — PeerJS сгенерирует ID
    // Для инициатора — если reconnect, НЕ используем sessionId как peerId
    if (isInitiator) {
      peer.value = new Peer(sessionId, options);
    } else {
      peer.value = new Peer(undefined, options);
    }

    peer.value.on("open", (id: string) => {
      console.log("[usePeer] Peer open", id, { storedPeerId, reconnect });

      // Сохраняем свой id в sessionStorage чтобы при reload в этой вкладке можно было попытаться восстановить тот же id
      try {
        setStoredConnectionId(sessionId, id);
      } catch (e) {}

      // Если non-initiator и не reconnect — старое поведение: подключаемся к initiator (sessionId)
      if (!isInitiator) {
        setTimeout(() => {
          try {
            connectToPeer(sessionId);
          } catch (e) {
            console.warn("[usePeer] connectToPeer failed on open", e);
          }
        }, 50);
      }

      updateRoomData("network", { connectionStatus: "connecting" });
    });

    // Для инициатора — ждём входящих соединений
    peer.value.on("connection", (connection) => {
      console.log("[usePeer] Incoming connection");
      setupConnection(connection);
    });

    let shouldAutoAcceptWithVideo = false;

    peer.value.on("call", (mediaConnection) => {
      console.log("[usePeer] peer.on(call): incoming", {
        mediaConnection,
        callState: callState.value,
        shouldAutoAcceptWithVideo,
        oldMediaConn: mediaConn,
      });
      callState.value = "incoming";
      // Явно закрываем и сбрасываем старый mediaConn
      if (mediaConn) {
        try {
          mediaConn.close();
        } catch (e) {
          console.error(
            "[usePeer] peer.on(call): error closing old mediaConn",
            e,
          );
        }
        mediaConn = null;
      }
      mediaConn = mediaConnection;
      console.log("[usePeer] peer.on(call): new mediaConn set", mediaConn);
      if (shouldAutoAcceptWithVideo) {
        shouldAutoAcceptWithVideo = false;
        console.log("[usePeer] peer.on(call): auto-accepting with video");
        acceptCall({ cam: true, mic: true });
      }
      // Иначе — обычное поведение (ожидание accept)
    });

    peer.value.on("error", (err) => {
      console.error("[usePeer] Peer error:", err);
    });
  }

  function connectToPeer(targetId?: string) {
    if (!peer.value) return;
    const target = targetId || sessionId; // всегда по умолчанию к sessionId (инициатору)
    if (!target) {
      console.warn("[usePeer] connectToPeer: no target specified");
      return;
    }
    console.log("[usePeer] connectToPeer ->", target);
    const connection = peer.value.connect(target, { reliable: true });
    setupConnection(connection);
  }

  function setupConnection(connection: DataConnection) {
    conn.value = connection;

    connection.on("open", () => {
      console.log("[usePeer] Connection open");
      isConnectionEstablished.value = true;

      // остановим loop reconnect (если он был запущен)
      stopCompanionReconnectLoop();

      updateRoomData("network", {
        connectionStatus: "connected",
        dataTransferStatus: "idle",
      });

      updateRoomData("members", {
        companionStatus: "online",
        lastActivityTimestamp: Date.now(),
      });

      // Reset retry state on successful connection
      metricsState.retryState.attempts = 0;
      metricsState.retryState.exponentialBackoff = 1000;

      initializeMetricsTracking();
    });

    connection.on("data", (data: any) => {
      // Update received bytes (approximate)
      console.log(data);
      if (data.type !== "ping" && data.type !== "pong") {
        const dataSize = calculateDataSize(data);
        updateBytesTransferred(0, dataSize);
      }
      // Handle ping responses
      if (data?.type === "ping") {
        // Respond to ping
        connection.send({
          type: "pong",
          originalTimestamp: data.timestamp,
          responseTimestamp: Date.now(),
        });
        return;
      }

      if (data?.type === "pong") {
        handlePingResponse(data.originalTimestamp);
        if (pingPongCompanionDiscottectionTimeout.value) {
          clearTimeout(pingPongCompanionDiscottectionTimeout.value);
          pingPongCompanionDiscottectionTimeout.value = null;
        }
        return;
      }

      // Update companion activity
      updateRoomData("members", {
        companionStatus: "online",
        lastActivityTimestamp: Date.now(),
      });

      // Handle call signals
      handleCallSignals(data);

      // Filter out system messages
      if (
        data?.type &&
        [
          "call-request",
          "call-decline",
          "call-end",
          "ping",
          "pong",
          "video-on",
          "video-off",
          "restart-call-with-video",
          "read",
        ].includes(data.type)
      ) {
        return;
      }

      // Process regular messages
      let msg: Message;
      console.log("data well pupupu", data);
      if (typeof data === "string") {
        msg = JSON.parse(data);
      } else if (data?.type === "message") {
        console.log("gotta in on handler", data);
        const typedData = data as Message;
        const filesWithUrl = typedData.files
          .filter((f) => f)
          .map((f) => {
            const fileData = f.file.fileData;
            const blob = new Blob([fileData], { type: f.file.type });
            return {
              ...f,
              file: {
                ...f.file,
                fileUrl: URL.createObjectURL(blob),
              },
            };
          });
        console.log("filesWithUrl", filesWithUrl);
        msg = {
          id: typedData.id,
          sender: typedData.sender,
          read: false,
          text: typedData.text,
          timestamp: typedData.timestamp,
          replyMessage: typedData.replyMessage || null,
          type: "message",
          files: filesWithUrl,
          isEdited: typedData.isEdited,
          existingFileIds: typedData.existingFileIds,
        };
        updateRoomData("messages", {
          filesShared:
            roomData.value.messages.filesShared + typedData.files.length,
        });
      } else {
        msg = data as Message;
      }
      console.log("i got your message here", msg);
      if (msg.isEdited) {
        const indexToEdit = messages.value.findIndex((m) => m.id === msg.id);
        messages.value[indexToEdit] = {
          ...msg,
          files: [
            ...messages.value[indexToEdit].files.filter((f) =>
              msg.existingFileIds?.includes(f.id),
            ),
            ...(msg.files || []),
          ],
        };
      } else {
        messages.value.push(msg);
      }

      // Update message metrics
      updateRoomData("messages", {
        messagesReceived: roomData.value.messages.messagesReceived + 1,
        unreadCount: roomData.value.messages.unreadCount + 1,
        lastMessageTimestamp: msg.timestamp,
      });
    });

    connection.on("close", () => {
      console.log("[usePeer] Connection closed");
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

      if (metricsState.pingInterval) {
        clearInterval(metricsState.pingInterval);
        metricsState.pingInterval = null;
      }

      if (!isInitiator) {
        console.log(
          "[usePeer] Connection closed, starting reconnect loop (non-initiator)",
        );
        startCompanionReconnectLoop();
      } else {
        console.log(
          "[usePeer] Connection closed (initiator) — not starting reconnect loop",
        );
      }
    });

    connection.on("error", (err: any) => {
      console.error("[usePeer] Connection error:", err);
      isConnectionEstablished.value = false;

      // Increment retry attempts for connection resilience tracking
      metricsState.retryState.attempts++;
      metricsState.retryState.lastRetryTime = Date.now();

      updateRoomData("network", {
        connectionStatus: "failed",
        retryAttempts: metricsState.retryState.attempts,
        dataTransferStatus: "idle",
      });
    });
  }

  function calculateDataSize(data: any): number {
    if (!data) return 0;

    // Для файловых сообщений считаем реальный размер файлов
    if (data.type === "message" && data.files) {
      const typedData = data as Message;
      let totalSize = JSON.stringify({
        id: typedData.id,
        sender: typedData.sender,
        text: typedData.text,
        timestamp: typedData.timestamp,
        type: typedData.type,
        replyMessage: typedData.replyMessage,
      }).length;
      console.log("CALCULATE SIZE FILES", typedData.files);
      // Добавляем реальный размер файлов
      typedData.files.forEach((file) => {
        if (file?.file.size) {
          totalSize += file.file.size; // Используем реальный размер файла
        } else if (file?.file.fileData instanceof ArrayBuffer) {
          totalSize += file.file.fileData.byteLength;
        }
      });

      return totalSize;
    }

    // Для обычных сообщений
    return JSON.stringify(data).length;
  }
  async function sendMessage(payload: SendMessageRequest) {
    console.log("[usePeer] sendMessage", payload);
    if (!conn.value?.open) return;
    const filesToSend = await Promise.all(
      payload.files.map(async (f) => {
        const file = f.file;
        const arrayBuffer = await (file as File).arrayBuffer();
        const fileUrl = URL.createObjectURL(file as File);
        const msgFile: MessageFile = {
          id: f.id,
          preview: f.preview,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            fileData: arrayBuffer,
            fileUrl,
          },
        };
        return msgFile;
      }),
    );
    console.log("[usePeer] sendMessage: filesToSend", filesToSend);
    const message: Message = {
      id: crypto.randomUUID(),
      type: "message",
      sender: useDeviceId(),
      text: payload.text,
      timestamp: Date.now(),
      files: filesToSend,
      read: false,
    };
    console.log("[usePeer] sendMessage: message", message);
    conn.value.send(message);
    const messageSize = calculateDataSize(message);
    updateBytesTransferred(messageSize, 0);
    updateRoomData("messages", {
      messagesSent: roomData.value.messages.messagesSent + 1,
      lastMessageTimestamp: message.timestamp,
    });
    messages.value.push(message);
  }
  async function editMessage(payload: EditMessageRequest) {
    console.log("[usePeer] editMessage", payload);
    if (!conn.value?.open) return;

    const filesToSend: MessageFile[] = [];
    const existingFileIds: string[] = [];

    for (const f of payload.files) {
      if (f.file instanceof File) {
        const arrayBuffer = await (f.file as File).arrayBuffer();
        const fileUrl = URL.createObjectURL(f.file as File);
        filesToSend.push({
          id: f.id,
          preview: f.preview,
          file: {
            name: f.file.name,
            size: f.file.size,
            type: f.file.type,
            fileData: arrayBuffer,
            fileUrl,
          },
        });
      } else {
        existingFileIds.push(f.id);
      }
    }

    const message: Message = {
      id: payload.editingId || crypto.randomUUID(),
      type: "message",
      sender: useDeviceId(),
      text: payload.text,
      timestamp: Date.now(),
      files: filesToSend,
      read: false,
      isEdited: true,
      existingFileIds,
    };
    console.log("[usePeer] editMessage: message", message);
    conn.value.send(message);
    const messageSize = calculateDataSize(message);
    updateBytesTransferred(messageSize, 0);
    const indexToEdit = messages.value.findIndex((m) => m.id === message.id);
    if (indexToEdit !== -1) {
      messages.value[indexToEdit] = {
        ...messages.value[indexToEdit],
        ...message,
        files: [
          ...messages.value[indexToEdit].files.filter((f) =>
            existingFileIds.includes(f.id),
          ),
          ...filesToSend.map((f) => ({
            ...f,
            file: {
              ...f.file,
              fileUrl:
                f.file.fileUrl ||
                URL.createObjectURL(
                  new Blob([f.file.fileData], { type: f.file.type }),
                ),
            },
          })),
        ],
      };
    }
    updateRoomData("messages", {
      lastMessageTimestamp: message.timestamp,
    });
  }
  // Добавить файл к списку
  function attachFile(file: File) {
    attachedFiles.value.push(file);
  }

  // Открепить файл по индексу
  function detachFile(index: number) {
    attachedFiles.value.splice(index, 1);
  }

  // Отправить одно сообщение с несколькими файлами и текстом

  function destroy() {
    if (metricsState.pingInterval) {
      clearInterval(metricsState.pingInterval);
    }
    conn.value?.close();
    peer.value?.destroy();
  }

  onBeforeUnmount(destroy);

  // --- Видеозвонки ---
  const callState = ref<"idle" | "calling" | "incoming" | "active" | "ended">(
    "idle",
  );
  const callType = ref<"audio" | "video">("video");
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);
  let mediaConn: any = null;
  let callTimeout: any = null;
  // --- Camera state flags ---
  const isCameraEnabled = ref(false); // по умолчанию выключено
  const isCameraToggling = ref(false);
  let shouldAutoAcceptWithVideo = false;

  async function startCall(withVideo = false, withAudio = false) {
    const callStartTime = Date.now();

    updateRoomData("call", {
      status: "calling",
      type: withVideo ? "video" : "audio",
      startTime: callStartTime,
    });
    console.log("[usePeer] startCall: called", {
      withVideo,
      withAudio,
      callState: callState.value,
      conn: !!conn.value,
    });
    callState.value = "calling";
    callType.value = withVideo ? "video" : "audio";
    isCameraEnabled.value = !!withVideo;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !!withVideo;
    });
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !!withAudio;
    });
    // Оставляем только live-треки
    const liveTracks = stream
      .getTracks()
      .filter((t) => t.readyState === "live");
    const liveStream = new MediaStream(liveTracks);
    localStream.value = liveStream;
    console.log(
      "[usePeer] startCall: got localStream",
      liveStream,
      liveTracks.map((t) => ({
        id: t.id,
        kind: t.kind,
        readyState: t.readyState,
      })),
    );
    mediaConn = peer.value!.call(conn.value!.peer, liveStream);
    console.log(
      "[usePeer] startCall: peer.call done",
      mediaConn,
      "peer.connections:",
      peer.value!.connections,
    );
    mediaConn.on("stream", (remote: MediaStream) => {
      remoteStream.value = remote;
      callState.value = "active";
      clearTimeout(callTimeout);
      console.log("[usePeer] startCall: got remote stream", remote);
      updateRoomData("call", {
        status: "active",
        totalCalls: roomData.value.call.totalCalls + 1,
      });
    });
    mediaConn.on("close", () => {
      console.log("[usePeer] startCall: mediaConn closed");
      endCall();
    });
    mediaConn.on("error", (e: any) => {
      console.error("[usePeer] startCall: mediaConn error", e);
      endCall();
    });
    conn.value?.send({ type: "call-request", video: withVideo });
    console.log("[usePeer] startCall: sent call-request");
    callTimeout = setTimeout(() => {
      console.warn("[usePeer] startCall: callTimeout");
      endCall();
    }, 30000);
  }

  async function acceptCall(opts?: { cam?: boolean; mic?: boolean }) {
    callState.value = "active";
    callType.value = opts?.cam ? "video" : "audio";
    console.log("[usePeer] acceptCall: called", {
      opts,
      callState: callState.value,
      mediaConn,
    });
    isCameraEnabled.value = false;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getVideoTracks().forEach((t) => {
      t.enabled = false;
    });
    stream.getAudioTracks().forEach((t) => {
      t.enabled = false;
    });
    localStream.value = stream;
    console.log("[usePeer] acceptCall: got localStream", stream);
    if (mediaConn) {
      mediaConn.answer(stream);
      console.log("[usePeer] acceptCall: answered mediaConn", mediaConn);
      mediaConn.on("stream", (remote: MediaStream) => {
        remoteStream.value = remote;
        callState.value = "active";
        clearTimeout(callTimeout);
        console.log("[usePeer] acceptCall: got remote stream", remote);
      });
      mediaConn.on("close", () => {
        console.log("[usePeer] acceptCall: mediaConn closed");
        endCall();
      });
      mediaConn.on("error", (e: any) => {
        console.error("[usePeer] acceptCall: mediaConn error", e);
        endCall();
      });
      callState.value = "active";
    } else {
      console.warn("[usePeer] acceptCall: mediaConn is null");
    }
  }

  function endCall(isRemoteEnd = false) {
    const callEndTime = Date.now();
    const callDuration = roomData.value.call.startTime
      ? callEndTime - roomData.value.call.startTime
      : 0;

    updateRoomData("call", {
      status: "ended",
      duration: callDuration,
    });
    console.log("[usePeer] endCall", {
      isRemoteEnd,
      mediaConn,
      localStream: !!localStream.value,
      remoteStream: !!remoteStream.value,
      shouldAutoAcceptWithVideo,
    });
    callState.value = "ended";
    if (mediaConn) {
      try {
        if (mediaConn.peerConnection) {
          mediaConn.peerConnection.close();
          console.log("[usePeer] endCall: peerConnection closed");
        }
        mediaConn.close();
      } catch (e) {
        console.error("[usePeer] endCall: error closing mediaConn", e);
      }
      mediaConn = null;
    }
    if (localStream.value) {
      localStream.value.getTracks().forEach((t) => t.stop());
      localStream.value = null;
    }
    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach((t) => t.stop());
      remoteStream.value = null;
    }
    clearTimeout(callTimeout);
    if (!isRemoteEnd) {
      conn.value?.send({ type: "call-end" });
      console.log("[usePeer] endCall: sent call-end");
    }
    setTimeout(() => {
      callState.value = "idle";
      console.log("[usePeer] endCall: set callState idle");
      updateRoomData("call", {
        status: "idle",
        startTime: null,
        type: null,
      });
    }, 1000);
    isCameraEnabled.value = true;
    isCameraToggling.value = false;
    shouldAutoAcceptWithVideo = false; // сброс автопринятия
  }

  function declineCall() {
    callState.value = "idle";
    conn.value?.send({ type: "call-decline" });
    endCall();
  }

  function toggleMic(enabled: boolean) {
    if (!localStream.value) return;
    localStream.value.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  // --- Camera state flags ---
  // (удалено дублирование)

  // --- Управление камерой во время звонка ---
  async function toggleCamera(enabled: boolean) {
    if (!localStream.value || isCameraToggling.value) return;
    isCameraToggling.value = true;
    try {
      const track = localStream.value.getVideoTracks()[0];
      if (!track) return;
      // просто переключаем enabled, без перезапуска звонка
      track.enabled = enabled;
      isCameraEnabled.value = enabled;
      conn.value?.send({ type: enabled ? "video-on" : "video-off" });
    } finally {
      isCameraToggling.value = false;
    }
  }

  // --- Обработка сигналов звонка ---
  function handleCallSignals(data: any) {
    console.log("[usePeer] handleCallSignals", data);
    if (data.type === "restart-call-with-video") {
      // Для надёжности сбрасываем mediaConn
      if (mediaConn) {
        try {
          mediaConn.close();
        } catch (e) {
          console.error(
            "[usePeer] handleCallSignals: error closing mediaConn",
            e,
          );
        }
        mediaConn = null;
      }
      endCall(true);
      setTimeout(() => {
        shouldAutoAcceptWithVideo = true;
        console.log(
          "[usePeer] handleCallSignals: shouldAutoAcceptWithVideo set TRUE",
        );
      }, 100);
      return;
    }
    if (data?.type === "read") {
      const msg = messages.value.find((m) => m.id === data.id);
      if (msg) msg.read = true;
      return;
    }
    if (data.type === "call-request") {
      callState.value = "incoming";
      callType.value = data.video ? "video" : "audio";
      console.log("[usePeer] handleCallSignals: call-request", {
        callState: callState.value,
        callType: callType.value,
      });
    }
    if (data.type === "call-decline") {
      endCall(true);
      console.log("[usePeer] handleCallSignals: call-decline");
    }
    if (data.type === "call-end") {
      endCall(true);
      console.log("[usePeer] handleCallSignals: call-end");
    }
    if (data.type === "video-off") {
      if (remoteStream.value) {
        remoteStream.value.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
        console.log(
          "[usePeer] handleCallSignals: video-off, videoTracks disabled",
        );
      }
    }
    if (data.type === "video-on") {
      if (remoteStream.value) {
        // Включаем обратно все видео-дорожки
        remoteStream.value.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
        console.log(
          "[usePeer] handleCallSignals: video-on, videoTracks enabled",
        );
      } else if (mediaConn?.peerConnection) {
        // На всякий случай, если remoteStream ещё не установился — получаем его из receivers
        const receivers = mediaConn.peerConnection.getReceivers();
        const videoTrack = receivers
          .map((r: RTCRtpReceiver) => r.track)
          .find(
            (t: MediaStreamTrack | null) =>
              t?.kind === "video" && t.readyState === "live",
          );
        const audioTracks = receivers
          .map((r: RTCRtpReceiver) => r.track)
          .filter(
            (t: MediaStreamTrack | null) =>
              t?.kind === "audio" && t.readyState === "live",
          );
        if (videoTrack) {
          remoteStream.value = new MediaStream(
            [videoTrack, ...audioTracks].filter(Boolean) as MediaStreamTrack[],
          );
          console.log(
            "[usePeer] handleCallSignals: video-on, remoteStream reconstructed",
            remoteStream.value,
          );
        } else {
          console.warn(
            "[usePeer] handleCallSignals: video-on, no live video track found",
          );
        }
      }
    }
  }
  function readMessage(id: string) {
    const msg = messages.value.find((m) => m.id === id);
    if (!msg || msg.read) return;
    msg.read = true;
    updateRoomData("messages", {
      unreadCount: Math.max(0, roomData.value.messages.unreadCount - 1),
    });
    if (conn.value?.open) {
      conn.value.send({ type: "read", id });
    }
  }
  const roomStatistics = computed(() => ({
    totalActivity:
      roomData.value.messages.messagesSent +
      roomData.value.messages.messagesReceived,
    averageResponseTime: roomData.value.network.roundTripTime,
    dataTransferred:
      roomData.value.network.sentBytes + roomData.value.network.receivedBytes,
    connectionStability: roomData.value.network.connectionStatus,
    sessionEfficiency: {
      messagesPerMinute:
        roomData.value.room.sessionDuration > 0
          ? (roomData.value.messages.messagesSent +
              roomData.value.messages.messagesReceived) /
            (roomData.value.room.sessionDuration / 60000)
          : 0,
      callTimePercentage:
        roomData.value.room.sessionDuration > 0
          ? (roomData.value.call.duration /
              roomData.value.room.sessionDuration) *
            100
          : 0,
    },
  }));
  // --- Управление камерой и микрофоном во время звонка с debounce ---
  const debounce = useDebounce();
  function debouncedToggleCamera(enabled: boolean) {
    debounce(() => toggleCamera(enabled), 300, "camera");
  }
  function debouncedToggleMic(enabled: boolean) {
    debounce(() => toggleMic(enabled), 300, "mic");
  }

  return {
    messages,
    peer,
    conn,
    isConnectionEstablished,
    initPeer,
    sendMessage,
    editMessage,
    attachFile,
    detachFile,

    attachedFiles,
    destroy,
    readMessage,
    roomData,
    roomStatistics,
    updateRoomData,
    // --- Видеозвонки ---
    callState,
    callType,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleCamera: debouncedToggleCamera,
    toggleMic: debouncedToggleMic,
    isCameraEnabled,
    isCameraToggling,
  };
}

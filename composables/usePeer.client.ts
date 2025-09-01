import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { useDebounce } from "~/composables/useDebounce";
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  replyMessage: ReplyMessageData | null;
  read?: boolean;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  files?: { name: string; type: string; size: number; fileUrl: string }[];
}
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

  /**
   * Enhanced connection setup with metrics tracking
   */
  function initPeer() {
    const options = {
      host: "peerjs-server-gims.onrender.com",
      path: "/",
      secure: true,
    };
    console.log("[usePeer] initPeer", {
      sessionId,
      isInitiator: isInitiator,
      options,
    });
    // Для инициатора — используем свой sessionId, для клиента — PeerJS сгенерирует ID
    peer.value = isInitiator
      ? new Peer(sessionId, options)
      : new Peer(undefined, options);

    peer.value.on("open", (id) => {
      console.log("[usePeer] Peer open", id);
      if (!isInitiator) {
        connectToPeer(sessionId);
      }
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

  function connectToPeer(targetId: string) {
    if (!peer.value) return;
    const connection = peer.value.connect(targetId, { reliable: true });
    setupConnection(connection);
  }

  function setupConnection(connection: DataConnection) {
    conn.value = connection;

    connection.on("open", () => {
      console.log("[usePeer] Connection open");
      isConnectionEstablished.value = true;

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
      const dataSize = JSON.stringify(data).length;
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

      if (typeof data === "string") {
        msg = JSON.parse(data);
      } else if (data?.type === "file-group") {
        // Handle file groups
        const filesWithUrl = data.files.map((f: any) => {
          const fileData = f.fileData;
          // ... file processing logic ...
          const blob = new Blob([fileData], { type: f.type });
          return {
            ...f,
            fileUrl: URL.createObjectURL(blob),
          };
        });

        msg = {
          id: data.id,
          sender: data.sender,
          read: false,
          text: data.text,
          timestamp: data.timestamp,
          replyMessage: data.replyMessage || null,
          type: "file-group",
          files: filesWithUrl,
        };

        // Update file sharing metrics
        updateRoomData("messages", {
          filesShared: roomData.value.messages.filesShared + data.files.length,
        });
      } else {
        msg = data as Message;
      }

      messages.value.push(msg);

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

      // Clean up intervals and prepare for potential reconnection
      if (metricsState.pingInterval) {
        clearInterval(metricsState.pingInterval);
        metricsState.pingInterval = null;
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
    if (data.type === "file-group" && data.files) {
      let totalSize = JSON.stringify({
        id: data.id,
        sender: data.sender,
        text: data.text,
        timestamp: data.timestamp,
        type: data.type,
        replyMessage: data.replyMessage,
      }).length;

      // Добавляем реальный размер файлов
      data.files.forEach((file: any) => {
        if (file.size) {
          totalSize += file.size; // Используем реальный размер файла
        } else if (file.fileData instanceof ArrayBuffer) {
          totalSize += file.fileData.byteLength;
        }
      });

      return totalSize;
    }

    // Для обычных сообщений
    return JSON.stringify(data).length;
  }
  function sendMessage(payload: {
    text: string;
    replyMessage: ReplyMessageData | null;
  }) {
    if (!conn.value?.open) return;

    const message = {
      id: Date.now().toString(),
      sender: peer.value?.id as string,
      text: payload.text,
      replyMessage: payload.replyMessage,
      timestamp: Date.now(),
      read: false,
    };

    const messageStr = JSON.stringify(message);
    conn.value.send(messageStr);

    // Update sent bytes
    updateBytesTransferred(messageStr.length, 0);

    // Update message metrics
    updateRoomData("messages", {
      messagesSent: roomData.value.messages.messagesSent + 1,
      lastMessageTimestamp: message.timestamp,
    });

    messages.value.push(message);
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
  function sendAllFiles(payload: {
    text: string;
    replyMessage: ReplyMessageData | null;
    files: {
      name: string;
      type: string;
      size: number;
      file: File;
      preview?: string;
    }[];
  }) {
    if (!conn.value?.open) return;
    const filesToSend: any[] = [];
    let filesProcessed = 0;
    payload.files.forEach((f, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        filesToSend[idx] = {
          name: f.name,
          type: f.type,
          size: f.size,
          fileData: reader.result,
        };
        filesProcessed++;
        if (filesProcessed === payload.files.length) {
          // Все файлы прочитаны, отправляем одно сообщение
          const msg = {
            id: Date.now().toString(),
            sender: peer.value?.id as string,
            text: payload.text,
            timestamp: Date.now(),
            type: "file-group",
            replyMessage: payload.replyMessage || null,
            files: filesToSend,
            read: false,
          };
          conn.value!.send(msg);
          // Для локального отображения
          const messageSize = calculateDataSize(msg);
          updateBytesTransferred(messageSize, 0);
          messages.value.push({
            ...msg,
            files: filesToSend.map((f) => ({
              ...f,
              fileUrl: URL.createObjectURL(
                new Blob([f.fileData], { type: f.type }),
              ),
            })),
          });
        }
      };
      reader.readAsArrayBuffer(f.file);
    });
  }

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
    isCameraEnabled.value = !!opts?.cam;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !!opts?.cam;
    });
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !!opts?.mic;
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
    attachFile,
    detachFile,
    sendAllFiles,
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

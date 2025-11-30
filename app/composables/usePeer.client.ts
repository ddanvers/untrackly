import { onBeforeUnmount, watch } from "vue";
import { usePeerConnection } from "./peer/usePeerConnection";
import { usePeerMedia } from "./peer/usePeerMedia";
import { usePeerMessages } from "./peer/usePeerMessages";
import { usePeerMetrics } from "./peer/usePeerMetrics";
import { usePeerRoom } from "./peer/usePeerRoom";
import { calculateDataSize } from "./peer/utils";

export function usePeer(sessionId: string, isInitiator: boolean) {
  // 1. Room Data & Statistics
  const { roomData, updateRoomData, roomStatistics } = usePeerRoom(sessionId);

  // 2. Connection Management
  const {
    peer,
    conn,
    isConnectionEstablished,
    initPeer,
    connectToPeer,
    destroyPeer,
  } = usePeerConnection(sessionId, isInitiator, updateRoomData);

  // 3. Metrics & Network Quality
  const {
    metricsState, // exposed if needed, or just used internally
    initializeMetricsTracking,
    handlePingResponse,
    updateBytesTransferred,
    stopPingMonitoring,
    clearPingPongTimeout,
  } = usePeerMetrics(roomData, updateRoomData, conn);

  // 4. Messages Handling
  const {
    messages,
    attachedFiles,
    attachFile,
    detachFile,
    sendMessage,
    editMessage,
    replyToMessage,
    deleteMessage,
    readMessage,
    handleIncomingMessage,
  } = usePeerMessages(conn, roomData, updateRoomData, updateBytesTransferred);

  // 5. Media (Calls & Screenshare)
  const {
    callState,
    callType,
    localStream,
    remoteStream,
    isCameraEnabled,
    isMicEnabled,
    isCameraToggling,
    isScreenShareEnabled,
    screenShareStream,
    screenShareOwnerId,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    handleIncomingCall,
    handleSignal,
  } = usePeerMedia(peer, conn, roomData, updateRoomData);

  // --- Coordinator Logic ---

  // Watch for new Data Connections to attach listeners
  watch(conn, (newConn) => {
    if (newConn) {
      // Initialize metrics when connection is established
      // Note: usePeerConnection sets 'open' listener which calls updateRoomData
      // We can also hook into 'open' here if needed, but let's rely on 'open' event or isConnectionEstablished

      newConn.on("open", () => {
        initializeMetricsTracking();
      });

      newConn.on("data", (data: any) => {
        console.log("[usePeer Coordinator] received data", data);

        // 0. Global: Update companion activity on ANY received data
        updateRoomData("members", {
          companionStatus: "online",
          lastActivityTimestamp: Date.now(),
        });

        // 1. Metrics: Update bytes received
        if (data.type !== "ping" && data.type !== "pong") {
          const dataSize = calculateDataSize(data);
          updateBytesTransferred(0, dataSize);
        }

        // 2. Metrics: Handle Ping/Pong
        if (data?.type === "ping") {
          newConn.send({
            type: "pong",
            originalTimestamp: data.timestamp,
            responseTimestamp: Date.now(),
          });
          return;
        }
        if (data?.type === "pong") {
          handlePingResponse(data.originalTimestamp);
          clearPingPongTimeout();
          return;
        }

        // 3. Media: Handle Signals
        if (
          [
            "call-request",
            "call-decline",
            "call-end",
            "video-on",
            "video-off",
            "restart-call-with-video",
            "mic-on",
            "mic-off",
            "screen-share-on",
            "screen-share-off",
          ].includes(data?.type)
        ) {
          handleSignal(data);
          return;
        }

        // 4. Messages: Handle Incoming Messages (and 'read', 'delete-message')
        handleIncomingMessage(data);
      });
    }
  });

  // Watch for Peer to attach 'call' listener
  watch(peer, (newPeer) => {
    if (newPeer) {
      newPeer.on("call", (mediaConnection) => {
        handleIncomingCall(mediaConnection);
      });
    }
  });

  function destroy() {
    stopPingMonitoring();
    destroyPeer();
    // Cleanup media streams if any
    endCall();
  }

  onBeforeUnmount(destroy);

  return {
    // Messages
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    readMessage,

    // Attachments
    attachedFiles,
    attachFile,
    detachFile,

    // Connection
    peer,
    conn,
    isConnectionEstablished,
    initPeer,
    destroy,

    // Room & Metrics
    roomData,
    roomStatistics,
    updateRoomData,

    // Media (Calls)
    callState,
    callType,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleCamera,
    toggleMic,
    isCameraEnabled,
    isMicEnabled,
    isCameraToggling,

    // Screen Share
    toggleScreenShare,
    isScreenShareEnabled,
    screenShareStream,
    screenShareOwnerId,
  };
}

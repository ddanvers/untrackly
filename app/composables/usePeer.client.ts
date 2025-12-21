import { onMounted, onUnmounted, ref, watch } from "vue";
import { usePeerConnection } from "./peer/usePeerConnection";
import { usePeerMedia } from "./peer/usePeerMedia";
import { usePeerMessages } from "./peer/usePeerMessages";
import { usePeerMetrics } from "./peer/usePeerMetrics";
import { usePeerRoom } from "./peer/usePeerRoom";

export interface UsePeerOptions {
  sessionId: string;
  isInitiator: boolean;
}

export function usePeer(options: UsePeerOptions) {
  const { sessionId, isInitiator } = options;

  // 1. Core Room Data & Member State
  const { roomData, updateRoomData, updateMember, roomStatistics } =
    usePeerRoom(sessionId);

  // 5. Metrics (Moved up because usePeerMessages needs updateBytesTransferred)
  const { updateBytesTransferred } = usePeerMetrics(
    roomData,
    updateRoomData,
    ref(null),
  );

  // 2. Peer Connection Logic
  // Handles establishing connections (mesh), identifying peers, and basic reliability
  const {
    peer,
    connections,
    isConnectionEstablished,
    myName,
    initPeer,
    connectToPeer,
    destroyPeer,
    broadcast,
  } = usePeerConnection(
    sessionId,
    isInitiator,
    updateRoomData,
    updateMember,
    onMessageReceived,
  );

  // 3. Messages
  // Handles chat messages, files, edits
  const {
    messages,
    sendMessage,
    editMessage,
    replyToMessage,
    deleteMessage,
    readMessage,
    attachedFiles,
    attachFile,
    detachFile,
    handleIncomingMessage,
  } = usePeerMessages(
    broadcast,
    roomData,
    updateRoomData,
    updateBytesTransferred,
  );

  // 4. Media (Audio/Video/Screen)
  // Handles calls, streams, tracks
  const {
    callState,
    localStream,
    remoteStreams, // Now a map
    isCameraEnabled,
    isMicEnabled,
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
  } = usePeerMedia(
    peer as any,
    connections as any,
    roomData,
    updateRoomData,
    updateMember,
    broadcast,
  );

  // ------------------------------------------------------------------------
  // Data Routing / Orchestration
  // ------------------------------------------------------------------------

  function onMessageReceived(data: any, senderId: string) {
    // Route based on type
    if (
      data?.type === "message" ||
      data?.type === "delete-message" ||
      data?.type === "read" ||
      typeof data === "string"
    ) {
      handleIncomingMessage(data);
    }

    // Call signaling messages
    if (
      data?.type === "call-request" ||
      data?.type === "call-decline" ||
      data?.type === "call-end" ||
      data?.type === "video-on" ||
      data?.type === "video-off" ||
      data?.type === "mic-on" ||
      data?.type === "mic-off" ||
      data?.type === "screen-share-on" ||
      data?.type === "screen-share-off" ||
      data?.type === "restart-call-with-video"
    ) {
      handleSignal(data, senderId);
    }

    // Ping / Metrics (handled in usePeerRoom or usePeerMetrics usually?
    // metrics usually purely internal state update based on transfer,
    // but if we had a ping message, it would go here)
  }

  // ------------------------------------------------------------------------
  // Lifecycle & Watchers
  // ------------------------------------------------------------------------

  // Update ping on connection changes is complex in mesh.
  // We can trust usePeerConnection to handle connection status.

  // Watch for incoming calls via PeerJS MediaConnection
  watch(
    () => peer.value,
    (newPeer) => {
      if (!newPeer) return;
      newPeer.on("call", (mediaConn) => {
        handleIncomingCall(mediaConn);
      });
    },
    { immediate: true },
  );

  onMounted(() => {
    initPeer();
  });

  onUnmounted(() => {
    destroyPeer();
    endCall(); // Helper to cleanup media
  });

  return {
    // Room Data
    roomData,
    roomStatistics,
    myName,

    // Connection
    peer, // Exposed
    initPeer, // Exposed
    isConnectionEstablished, // True if at least one
    connections,

    // Chat
    messages,
    sendMessage,
    editMessage,
    replyToMessage,
    deleteMessage,
    readMessage,
    attachedFiles,
    attachFile,
    detachFile,

    // Call / Media
    callState,
    localStream,
    remoteStreams,
    screenShareStream,
    screenShareOwnerId,

    isCameraEnabled,
    isMicEnabled,
    isScreenShareEnabled,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
  };
}

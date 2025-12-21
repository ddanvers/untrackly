import type { DataConnection, MediaConnection, Peer } from "peerjs";
import {
  computed,
  type Ref,
  reactive,
  ref,
  shallowReactive,
  shallowRef,
  watch,
} from "vue";
import { useDebounce } from "~/composables/useDebounce";
import { useDeviceId } from "~/composables/useDeviceId";
import type { Member, RoomData } from "./types";

export function usePeerMedia(
  peer: Ref<Peer | null>,
  connections: Record<string, DataConnection>,
  roomData: Ref<RoomData>,
  updateRoomData: <T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ) => void,
  updateMember: (id: string, updates: Partial<Member>) => void,
  broadcast: (data: any) => void,
) {
  const callState = ref<"idle" | "calling" | "incoming" | "active" | "ended">(
    "idle",
  );
  const callType = ref<"audio" | "video">("video");
  const localStream = shallowRef<MediaStream | null>(null);

  // Record<peerId, MediaStream>
  const remoteStreams = shallowReactive<Record<string, MediaStream>>({});

  // Record<peerId, MediaConnection>
  const mediaConnections = shallowReactive<Record<string, MediaConnection>>({});

  // Internal mutable state
  let callTimeout: any = null;
  let shouldAutoAcceptWithVideo = false;

  const isCameraEnabled = ref(false);
  const isMicEnabled = ref(false);
  const isCameraToggling = ref(false);

  // Screen sharing
  const isScreenShareEnabled = ref(false);
  const screenShareStream = shallowRef<MediaStream | null>(null);
  const screenShareOwnerId = ref<string | null>(null);
  // Record<peerId, MediaConnection>
  const mediaConnsScreenOutgoing = shallowReactive<
    Record<string, MediaConnection>
  >({});
  let mediaConnScreenIncoming: MediaConnection | null = null;

  const debounce = useDebounce();

  // Mesh propagation: Call new peers as they join if a call is active
  // We perform this check whenever connections change, but we need to be careful about collisions.
  // Rule: If both peers are active, the one with the 'larger' peerID calls the other.
  // If one is active and the other is just joining (idle), the active one calls.
  // Since we don't easily know the other's state without a message, we'll use the Tie-Breaker for all "mesh" calls
  // triggered by new data connections.
  watch(
    () => Object.keys(connections).length,
    (newCount, oldCount) => {
      if (
        (callState.value === "active" || callState.value === "calling") &&
        newCount > oldCount
      ) {
        // Broad scan for any unconnected peers in the mesh
        checkAndCallPeers();
      }
    },
  );

  function checkAndCallPeers() {
    if (!localStream.value || !peer.value?.id) return;
    const myId = peer.value.id;

    for (const [peerId, conn] of Object.entries(connections)) {
      // If we are already connected media-wise, skip
      if (mediaConnections[peerId]) continue;

      // If data connection is not open, we can't negotiate yet.
      // In a real app, we'd hook into conn.on('open'), but here we poll/watch.
      if (!conn.open) continue;

      // Tie-Breaker / Role Logic:
      // We assume the other peer is also "ready" or will be soon.
      // To avoid A calling B AND B calling A simultaneously:
      // Initiate IF myId > theirId.
      // wait... if we are the "Old" peer and they are "New", we usually want Old -> New.
      // But "New" might be 'active' too if they joined A first.

      // Let's stick to: Always try to call if we don't have a media conn?
      // PeerJS handles incoming calls automatically.
      // If we both call, we get 2 streams. We can deduce one.

      // Better: "Impolite" Caller wins? JS strings compare well.
      if (myId > peerId) {
        console.log(
          `[usePeerMedia] Mesh Tie-Breaker: I (${myId}) am calling ${peerId}`,
        );
        try {
          const mediaConn = peer.value.call(peerId, localStream.value);
          setupMediaConnection(mediaConn, peerId);

          // Send immediate metadata
          connections[peerId]?.send({
            type: isCameraEnabled.value ? "video-on" : "video-off",
          });
          connections[peerId]?.send({
            type: isMicEnabled.value ? "mic-on" : "mic-off",
          });
        } catch (e) {
          console.warn("[usePeerMedia] Failed to mesh-call", peerId, e);
        }
      } else {
        console.log(
          `[usePeerMedia] Mesh Tie-Breaker: Waiting for ${peerId} to call me`,
        );
      }
    }
  }

  // Also run this check periodically or on data connection open?
  // Since we don't have deep access to 'conn' events here easily without refactoring usePeerConnection,
  // we can rely on the watcher + a specialized poller or just the watcher delay.
  // Let's add a robust poller for the duration of the call to ensure mesh healing.
  let meshHealInterval: any = null;
  watch(callState, (val) => {
    if (val === "active") {
      meshHealInterval = setInterval(checkAndCallPeers, 2000);
    } else {
      clearInterval(meshHealInterval);
    }
  });

  function debouncedToggleCamera(enabled: boolean) {
    debounce(() => toggleCamera(enabled), 300, "camera");
  }
  function debouncedToggleMic(enabled: boolean) {
    debounce(() => toggleMic(enabled), 300, "mic");
  }

  // Call all connected peers
  async function startCall(withVideo = false, withAudio = false) {
    const callStartTime = Date.now();

    updateRoomData("call", {
      status: "calling",
      type: withVideo ? "video" : "audio",
      startTime: callStartTime,
    });
    console.log("[usePeerMedia] startCall: called", {
      withVideo,
      withAudio,
      callState: callState.value,
      peers: Object.keys(connections).length,
    });
    callState.value = "calling";
    callType.value = withVideo ? "video" : "audio";
    isCameraEnabled.value = !!withVideo;
    isMicEnabled.value = !!withAudio;

    try {
      let stream = localStream.value;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream.value = stream;
      }

      stream.getVideoTracks().forEach((t) => {
        t.enabled = !!withVideo;
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !!withAudio;
      });
      // Keep only live tracks
      const liveTracks = stream
        .getTracks()
        .filter((t) => t.readyState === "live");
      const liveStream = new MediaStream(liveTracks);
      // We don't overwrite localStream.value with a new MediaStream usually,
      // but PeerJS might like the wrapper.
      // Actually, let's just use the original stream for PeerJS calls.

      // Call each peer
      if (peer.value) {
        for (const [peerId, conn] of Object.entries(connections)) {
          if (conn.open) {
            try {
              const mediaConn = peer.value.call(peerId, liveStream);
              setupMediaConnection(mediaConn, peerId);

              conn.send({
                type: "call-request",
                video: withVideo,
                audio: withAudio,
              });
            } catch (e) {
              console.warn("Failed to call peer", peerId, e);
            }
          }
        }

        if (peer.value.id) {
          updateMember(peer.value.id, {
            cameraEnabled: !!withVideo,
            micEnabled: !!withAudio,
            hasMediaStream: true,
          });
          broadcast({ type: withVideo ? "video-on" : "video-off" });
          broadcast({ type: withAudio ? "mic-on" : "mic-off" });
        }
      }

      console.log("[usePeerMedia] startCall: signals and metadata sent");

      callTimeout = setTimeout(() => {
        if (callState.value === "calling") {
          console.warn(
            "[usePeerMedia] startCall: callTimeout - no one answered?",
          );
          if (Object.keys(remoteStreams).length === 0) {
            endCall();
          }
        }
      }, 30000);
    } catch (e) {
      console.error("[usePeerMedia] startCall error", e);
      endCall();
    }
  }

  async function acceptCall(opts?: { cam?: boolean; mic?: boolean }) {
    callState.value = "active";
    callType.value = opts?.cam ? "video" : "audio";
    console.log("[usePeerMedia] acceptCall: called", {
      opts,
      callState: callState.value,
    });
    isCameraEnabled.value = false;
    isMicEnabled.value = false;

    try {
      let stream = localStream.value;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream.value = stream;
      }

      // Initially set tracks based on opts, BUT we need to answer calls.
      stream.getVideoTracks().forEach((t) => {
        t.enabled = !!opts?.cam;
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !!opts?.mic;
      });

      // Answer all incoming pending calls?
      // Or just answer calls as they come?
      // With Mesh, we might receive calls from A, B, C.
      // Usually we answer them when they arrive.
      // If we are 'accepting' a call, it implies we just got a request.

      // Logic: Iterate over existing media connections that are not open/answered?
      // PeerJS doesn't easily expose "pending answer" state.
      // BUT, `handleIncomingCall` sets `mediaConn`.

      // We need to answer ALL current media connections?
      for (const [peerId, mc] of Object.entries(mediaConnections)) {
        if (!mc.open) {
          // simplistic check
          try {
            mc.answer(stream);
          } catch (e) {
            console.warn("Failed to answer call from", peerId, e);
          }
        }
      }

      // Also enable our tracks if requested
      if (opts?.cam) await toggleCamera(true);
      else await toggleCamera(false);

      if (opts?.mic) toggleMic(true);
      else toggleMic(false);

      if (peer.value?.id) {
        updateMember(peer.value.id, {
          cameraEnabled: !!opts?.cam,
          micEnabled: !!opts?.mic,
          hasMediaStream: true,
        });
        broadcast({ type: opts?.cam ? "video-on" : "video-off" });
        broadcast({ type: opts?.mic ? "mic-on" : "mic-off" });
      }
    } catch (e: any) {
      console.error("[usePeerMedia] acceptCall error", e);
      if (e.name === "NotReadableError") {
        console.warn(
          "[usePeerMedia] Camera or Microphone is already in use by another tab or application.",
        );
        // Don't necessarily end the whole call if we just can't open our cam
        // Maybe just mark as "active" without local stream?
        callState.value = "active";
        return;
      }
      endCall();
    }
  }

  function setupMediaConnection(connection: MediaConnection, peerId: string) {
    if (mediaConnections[peerId]) {
      // cleanup old connection if any
      try {
        mediaConnections[peerId].close();
      } catch (e) {}
    }
    mediaConnections[peerId] = connection;

    connection.on("stream", (remote: MediaStream) => {
      remoteStreams[peerId] = remote;
      updateMember(peerId, { hasMediaStream: true }); // Ensure UI knows

      callState.value = "active";
      clearTimeout(callTimeout);
      console.log("[usePeerMedia] got remote stream from", peerId);

      updateRoomData("call", {
        status: "active",
        totalCalls: roomData.value.call.totalCalls + 1,
      });

      updateMember(peerId, { hasMediaStream: true });
    });
    connection.on("close", () => {
      console.log("[usePeerMedia] mediaConn closed for", peerId);
      delete remoteStreams[peerId];
      delete mediaConnections[peerId];
      updateMember(peerId, { hasMediaStream: false });

      // In group calls, we only end if we are NOT an initiator and the hub (initiator) left?
      // Or just let the user end manually.
      // For now, let's NOT auto-end the whole session just because one peer left.
    });
    connection.on("error", (e: any) => {
      console.error("[usePeerMedia] mediaConn error", peerId, e);
      // maybe don't end entire call if just one peer fails
      delete remoteStreams[peerId];
      delete mediaConnections[peerId];
      updateMember(peerId, { hasMediaStream: false });
    });
  }

  let isEnding = false;
  function endCall(isRemoteEnd = false, peerIdEnded?: string) {
    if (isEnding && !peerIdEnded) return;

    // If peerIdEnded is provided, only remove that specific peer from our tracked media
    if (isRemoteEnd && peerIdEnded) {
      console.log("[usePeerMedia] removing peer from call:", peerIdEnded);
      delete remoteStreams[peerIdEnded];
      const mc = mediaConnections[peerIdEnded];
      if (mc) {
        try {
          mc.close();
        } catch (e) {}
        delete mediaConnections[peerIdEnded];
      }
      updateMember(peerIdEnded, {
        hasMediaStream: false,
        cameraEnabled: false,
        micEnabled: false,
      });
      // Full cleanup if we are the only ones left
      if (Object.keys(mediaConnections).length === 0) {
        endCall(false);
      }
      return;
    }

    if (callState.value === "idle" || callState.value === "ended") return;
    isEnding = true;

    const callEndTime = Date.now();
    const callDuration = roomData.value.call.startTime
      ? callEndTime - roomData.value.call.startTime
      : 0;

    updateRoomData("call", {
      status: "ended",
      duration: callDuration,
    });

    console.log("[usePeerMedia] endCall (Full Cleanup)", {
      isRemoteEnd,
      connections: Object.keys(mediaConnections).length,
    });

    callState.value = "ended";

    // Close all media connections
    for (const mc of Object.values(mediaConnections)) {
      try {
        mc.close();
      } catch (e) {}
    }
    for (const k of Object.keys(mediaConnections)) delete mediaConnections[k];

    if (localStream.value) {
      localStream.value.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      localStream.value = null;
    }

    // Stop all remote streams just in case
    for (const rs of Object.values(remoteStreams)) {
      try {
        rs.getTracks().forEach((t) => {
          t.stop();
        });
      } catch (e) {}
    }
    for (const k of Object.keys(remoteStreams)) delete remoteStreams[k];

    // Screen Share Cleanup
    cleanupLocalScreenShare(true);
    if (mediaConnScreenIncoming) {
      try {
        mediaConnScreenIncoming.close();
      } catch (e) {}
      mediaConnScreenIncoming = null;
    }

    // Reset member flags
    for (const pid of Object.keys(connections)) {
      updateMember(pid, {
        hasMediaStream: false,
        cameraEnabled: false,
        micEnabled: false,
      });
    }

    clearTimeout(callTimeout);

    // Broadcast end to all if we initiated the end
    if (!isRemoteEnd) {
      for (const conn of Object.values(connections)) {
        if (conn.open) {
          try {
            conn.send({ type: "call-end" });
          } catch (e) {}
        }
      }
    }

    setTimeout(() => {
      callState.value = "idle";
      updateRoomData("call", {
        status: "idle",
        startTime: null,
        type: null,
      });
      isEnding = false;
    }, 1500);

    isCameraEnabled.value = false;
    isMicEnabled.value = false;
    isCameraToggling.value = false;
    shouldAutoAcceptWithVideo = false;
  }

  function declineCall() {
    callState.value = "idle";

    for (const conn of Object.values(connections)) {
      try {
        conn.send({ type: "call-decline" });
      } catch (e) {}
    }
    endCall();
  }

  function toggleMic(enabled: boolean) {
    if (!localStream.value) return;
    localStream.value.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
    isMicEnabled.value = enabled;

    for (const conn of Object.values(connections)) {
      try {
        conn.send({ type: enabled ? "mic-on" : "mic-off" });
      } catch (e) {}
    }
  }

  async function toggleCamera(enabled: boolean) {
    if (!localStream.value || isCameraToggling.value) return;
    isCameraToggling.value = true;
    try {
      const track = localStream.value.getVideoTracks()[0];
      if (!track) return;
      track.enabled = enabled;
      isCameraEnabled.value = enabled;

      for (const conn of Object.values(connections)) {
        try {
          conn.send({ type: enabled ? "video-on" : "video-off" });
        } catch (e) {}
      }
    } finally {
      isCameraToggling.value = false;
    }
  }

  // Screen Sharing
  async function toggleScreenShare(force?: boolean) {
    const shouldEnable =
      typeof force === "boolean" ? force : !isScreenShareEnabled.value;

    if (shouldEnable) {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        console.warn("[usePeerMedia] Screen share not supported");
        return;
      }

      try {
        const dispStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenShareStream.value = dispStream;
        isScreenShareEnabled.value = true;
        screenShareOwnerId.value = useDeviceId();

        // Broadcast screen share on
        for (const conn of Object.values(connections)) {
          try {
            conn.send({
              type: "screen-share-on",
              sharer: screenShareOwnerId.value,
            });
          } catch (e) {}
        }

        if (peer.value) {
          for (const [peerId, conn] of Object.entries(connections)) {
            if (conn.open) {
              try {
                const mc = peer.value.call(peerId, dispStream, {
                  metadata: {
                    screenshare: true,
                    sharer: screenShareOwnerId.value,
                  },
                });
                mediaConnsScreenOutgoing[peerId] = mc;

                mc.on("close", () => {
                  delete mediaConnsScreenOutgoing[peerId];
                });
              } catch (e) {
                console.warn("Screen share call failed to", peerId, e);
              }
            }
          }
        }

        const stopHandler = () => {
          dispStream.getTracks().forEach((t) => {
            t.removeEventListener("ended", stopHandler);
          });
          toggleScreenShare(false);
        };
        dispStream.getTracks().forEach((t) => {
          t.addEventListener("ended", stopHandler);
        });
      } catch (err) {
        console.warn("[usePeerMedia] toggleScreenShare failed", err);
      }
    } else {
      // Disable
      cleanupLocalScreenShare(false);
    }
  }

  function cleanupLocalScreenShare(suppressNotify = false) {
    if (screenShareStream.value) {
      screenShareStream.value.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    }

    for (const mc of Object.values(mediaConnsScreenOutgoing)) {
      try {
        mc.close();
      } catch {}
    }
    for (const k of Object.keys(mediaConnsScreenOutgoing))
      delete mediaConnsScreenOutgoing[k];

    screenShareStream.value = null;
    isScreenShareEnabled.value = false;
    if (!suppressNotify) {
      for (const conn of Object.values(connections)) {
        try {
          conn.send({
            type: "screen-share-off",
            sharer: useDeviceId(),
          });
        } catch (e) {}
      }
    }
    screenShareOwnerId.value = null;
  }

  function handleIncomingCall(mediaConnection: MediaConnection) {
    const isScreenshare = mediaConnection?.metadata?.screenshare;
    const peerId = mediaConnection.peer;

    if (isScreenshare) {
      console.log("[usePeerMedia] incoming screenshare call from", peerId);
      mediaConnScreenIncoming = mediaConnection;

      try {
        mediaConnScreenIncoming.answer?.();
      } catch (e) {
        console.warn("[usePeerMedia] screenshare.answer failed", e);
      }

      mediaConnScreenIncoming.on("stream", (remoteStream: MediaStream) => {
        screenShareStream.value = remoteStream;
        isScreenShareEnabled.value = true;
        screenShareOwnerId.value = mediaConnection?.metadata?.sharer ?? null;
        updateMember(peerId, { hasMediaStream: true });
      });

      mediaConnScreenIncoming.on("close", () => {
        cleanupIncomingScreenShare();
      });

      mediaConnScreenIncoming.on("error", (_e: any) => {
        cleanupIncomingScreenShare();
      });
      return;
    }

    // Regular call
    console.log(
      "[usePeerMedia] incoming call from",
      peerId,
      "Current state:",
      callState.value,
    );

    if (callState.value === "active" || callState.value === "calling") {
      // If we are already calling or in a call, just answer to add the new peer to the mesh
      console.log("[usePeerMedia] auto-answering new participant");
      if (localStream.value) {
        mediaConnection.answer(localStream.value);
        setupMediaConnection(mediaConnection, peerId);

        // Send immediate metadata because we didn't call acceptCall
        connections[peerId]?.send({
          type: isCameraEnabled.value ? "video-on" : "video-off",
        });
        connections[peerId]?.send({
          type: isMicEnabled.value ? "mic-on" : "mic-off",
        });
      } else {
        // If we don't have a stream yet, just add to pending connections
        setupMediaConnection(mediaConnection, peerId);
        // We might need to answer later when we get localStream
      }
    } else {
      callState.value = "incoming";
      setupMediaConnection(mediaConnection, peerId);

      if (shouldAutoAcceptWithVideo) {
        shouldAutoAcceptWithVideo = false;
        console.log("[usePeerMedia] auto-accepting with video");
        acceptCall({ cam: true, mic: true });
      }
    }
  }

  function cleanupIncomingScreenShare() {
    // ... same as before
    if (screenShareStream.value) {
      screenShareStream.value.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    }
    screenShareStream.value = null;
    isScreenShareEnabled.value = false;
    screenShareOwnerId.value = null;
    mediaConnScreenIncoming = null;

    // Find who was sharing (ownerId) and update them?
    // Ideally we know who it was.
    // For now, if we don't track who specifically shared in a reliable way,
    // we might miss updating the member status.
    // But screenShareOwnerId should have it.
    // updateMember(screenShareOwnerId.value, { hasMediaStream: false })
  }

  function handleSignal(data: any, senderId: string) {
    if (data.type === "restart-call-with-video") {
      // Complex for group calls. Maybe just request to add video?
      // Treating as End then Auto-Accept might kill other peers' connections?
      // Let's ignore this advanced feature for MVP Mesh.
      return;
    }

    if (data.type === "call-request") {
      callState.value = "incoming";
      callType.value = data.video ? "video" : "audio";
      updateMember(senderId, {
        cameraEnabled: !!data.video,
        micEnabled: !!data.audio,
      });
    }
    if (data.type === "call-decline") {
      updateMember(senderId, {
        cameraEnabled: false,
        micEnabled: false,
      });
      endCall(true, senderId);
    }
    if (data.type === "call-end") {
      updateMember(senderId, {
        cameraEnabled: false,
        micEnabled: false,
      });
      endCall(true, senderId);
    }
    if (data.type === "video-off") {
      updateMember(senderId, { cameraEnabled: false });
      const rs = remoteStreams[senderId];
      if (rs) {
        rs.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
    }
    if (data.type === "video-on") {
      updateMember(senderId, { cameraEnabled: true });
      const rs = remoteStreams[senderId];
      if (rs) {
        rs.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
      }
    }
    if (data.type === "mic-off") {
      updateMember(senderId, { micEnabled: false });
    }
    if (data.type === "mic-on") {
      updateMember(senderId, { micEnabled: true });
    }
    if (data.type === "screen-share-on") {
      updateMember(senderId, { hasMediaStream: true });
      if (data.sharer) screenShareOwnerId.value = data.sharer;
    }
    if (data.type === "screen-share-off") {
      updateMember(senderId, { hasMediaStream: false });
      if (data.sharer && screenShareOwnerId.value === data.sharer) {
        screenShareOwnerId.value = null;
      }
    }
  }

  return {
    callState,
    callType,
    localStream,
    remoteStreams, // Exposed
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
    toggleCamera: debouncedToggleCamera,
    toggleMic: debouncedToggleMic,
    toggleScreenShare,
    handleIncomingCall,
    handleSignal,
  };
}

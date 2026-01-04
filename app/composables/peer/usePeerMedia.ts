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

      // Skip if they are idle (not participating in current call)
      const neighbor = roomData.value.members[peerId];
      if (!neighbor || neighbor.callStatus === "idle") {
        continue;
      }

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

    if (peer.value?.id) {
      updateMember(peer.value.id, { callStatus: "calling" });
      broadcast({
        type: "member-update",
        updates: { callStatus: "calling" },
      });
    }

    try {
      let stream = localStream.value;

      // If we don't have a stream, or if we need video but current stream has none
      // we need to get a new stream.
      // But for startCall, it's usually the first time, so we request exactly what we need.
      // NOTE: "audio: true" is usually required for a call.
      // If withAudio is false (e.g. muted start), we still need the track but muted.
      // BUT if the user explicitly wants audio-only, we MUST NOT ask for video permission.

      // Check if we need to get a new stream
      const needsNewStream =
        !stream ||
        (withVideo && stream.getVideoTracks().length === 0) ||
        (withAudio && stream.getAudioTracks().length === 0);

      if (needsNewStream) {
        // If we are starting with video=false, DO NOT request video permission
        stream = await navigator.mediaDevices.getUserMedia({
          video: !!withVideo,
          audio: true,
        });
        localStream.value = stream;
      }

      if (stream) {
        stream.getVideoTracks().forEach((t) => {
          t.enabled = !!withVideo;
        });
        stream.getAudioTracks().forEach((t) => {
          t.enabled = !!withAudio;
        });
      }

      // Keep only live tracks
      // (This filtering might be redundant if we just got a fresh stream, but safe)
      const tracks = stream?.getTracks() || [];
      const liveTracks = tracks.filter((t) => t.readyState === "live");

      // If we have no tracks (e.g. user denied everything?), we can't really call.
      // But usually audio:true ensures at least one track.
      if (liveTracks.length === 0) {
        console.warn("[usePeerMedia] No live tracks to stream");
      }

      const liveStream = new MediaStream(liveTracks);

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

    if (peer.value?.id) {
      updateMember(peer.value.id, { callStatus: "active" });
      broadcast({
        type: "member-update",
        updates: { callStatus: "active" },
      });
    }
    isCameraEnabled.value = false;
    isMicEnabled.value = false;

    try {
      let stream = localStream.value;

      const needsVideo = !!opts?.cam;
      const needsAudio = true; // Always need audio capability

      // If we need video but don't have it, or don't have stream at all
      const currentHasVideo = stream && stream.getVideoTracks().length > 0;

      if (!stream || (needsVideo && !currentHasVideo)) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: needsVideo,
          audio: needsAudio,
        });
        localStream.value = stream;
      }

      // Set enable state
      stream.getVideoTracks().forEach((t) => {
        t.enabled = !!opts?.cam;
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !!opts?.mic;
      });

      isCameraEnabled.value = !!opts?.cam;
      isMicEnabled.value = !!opts?.mic;

      // Answer all incoming pending calls?
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

      // Also enable our tracks if requested - already done above on stream tracks
      // But sending signals:

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

      if (callState.value === "calling" || callState.value === "incoming") {
        callState.value = "active";
        if (peer.value?.id) {
          updateMember(peer.value.id, { callStatus: "active" });
          broadcast({
            type: "member-update",
            updates: { callStatus: "active" },
          });
        }
      }

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

    if (peer.value?.id) {
      updateMember(peer.value.id, {
        callStatus: "idle",
        cameraEnabled: false,
        micEnabled: false,
      });
      broadcast({
        type: "member-update",
        updates: {
          callStatus: "idle",
          cameraEnabled: false,
          micEnabled: false,
        },
      });
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
    if (isCameraToggling.value) return;
    isCameraToggling.value = true;
    try {
      let stream = localStream.value;
      const hasVideoTrack = stream && stream.getVideoTracks().length > 0;

      // Case 1: We are ENABLING camera, but we have NO video track
      if (enabled && !hasVideoTrack) {
        console.log("[usePeerMedia] toggleCamera: upgrading to video...");
        try {
          // Request new stream with video
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true, // Keep audio
          });

          // Respect current mic state
          newStream.getAudioTracks().forEach((t) => {
            t.enabled = isMicEnabled.value;
          });

          // Replace local stream
          // Note: we should stop old tracks?
          if (localStream.value) {
            localStream.value.getTracks().forEach((t) => {
              t.stop();
            });
          }
          localStream.value = newStream;
          stream = newStream;

          // RENEGOTIATE: Call all peers with new stream
          if (peer.value) {
            for (const [peerId, conn] of Object.entries(connections)) {
              if (conn.open) {
                const mc = peer.value.call(peerId, newStream);
                setupMediaConnection(mc, peerId);
              }
            }
          }
        } catch (err) {
          console.error("[usePeerMedia] Failed to upgrade to video", err);
          isCameraToggling.value = false;
          return; // Abort
        }
      }

      // Case 2: We have a stream (or just got one), toggle tracks
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          track.enabled = enabled;
          isCameraEnabled.value = enabled;

          for (const conn of Object.values(connections)) {
            try {
              conn.send({ type: enabled ? "video-on" : "video-off" });
            } catch (e) {}
          }
        }
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
      // Mesh healing while we are idle? Just store it, don't trigger UI.
      // Real calls arrive with a "call-request" signal.
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
      if (callState.value === "idle" || callState.value === "ended") {
        callState.value = "incoming";
        callType.value = data.video ? "video" : "audio";
        if (peer.value?.id) {
          updateMember(peer.value.id, { callStatus: "incoming" });
          broadcast({
            type: "member-update",
            updates: { callStatus: "incoming" },
          });
        }
      }
      updateMember(senderId, {
        cameraEnabled: !!data.video,
        micEnabled: !!data.audio,
        callStatus: "active", // The one who requests is active or at least calling
      });
    }
    if (data.type === "call-decline") {
      updateMember(senderId, {
        cameraEnabled: false,
        micEnabled: false,
        callStatus: "idle",
      });
      endCall(true, senderId);
    }
    if (data.type === "call-end") {
      updateMember(senderId, {
        cameraEnabled: false,
        micEnabled: false,
        callStatus: "idle",
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

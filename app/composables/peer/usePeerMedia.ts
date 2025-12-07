import type { MediaConnection, Peer } from "peerjs";
import type { DataConnection } from "peerjs";
import { type Ref, ref } from "vue";
import { useDebounce } from "~/composables/useDebounce";
import type { RoomData } from "./types";

export function usePeerMedia(
  peer: Ref<Peer | null>,
  conn: Ref<DataConnection | null>,
  roomData: Ref<RoomData>,
  updateRoomData: <T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ) => void,
) {
  const callState = ref<"idle" | "calling" | "incoming" | "active" | "ended">(
    "idle",
  );
  const callType = ref<"audio" | "video">("video");
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);

  // Internal mutable state
  let mediaConn: MediaConnection | null = null;
  let callTimeout: any = null;
  let shouldAutoAcceptWithVideo = false;

  const isCameraEnabled = ref(false);
  const isMicEnabled = ref(false);
  const isCameraToggling = ref(false);

  // Screen sharing
  const isScreenShareEnabled = ref(false);
  const screenShareStream = ref<MediaStream | null>(null);
  const screenShareOwnerId = ref<string | null>(null);
  let mediaConnScreenOutgoing: MediaConnection | null = null;
  let mediaConnScreenIncoming: MediaConnection | null = null;

  const debounce = useDebounce();

  function debouncedToggleCamera(enabled: boolean) {
    debounce(() => toggleCamera(enabled), 300, "camera");
  }
  function debouncedToggleMic(enabled: boolean) {
    debounce(() => toggleMic(enabled), 300, "mic");
  }

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
      conn: !!conn.value,
    });
    callState.value = "calling";
    callType.value = withVideo ? "video" : "audio";
    isCameraEnabled.value = !!withVideo;
    isMicEnabled.value = !!withAudio;

    try {
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
      // Keep only live tracks
      const liveTracks = stream
        .getTracks()
        .filter((t) => t.readyState === "live");
      const liveStream = new MediaStream(liveTracks);
      localStream.value = liveStream;

      if (peer.value && conn.value?.peer) {
        mediaConn = peer.value.call(conn.value.peer, liveStream);
        setupMediaConnection(mediaConn);
      } else {
        console.warn("[usePeerMedia] startCall: peer or conn not ready");
      }

      conn.value?.send({
        type: "call-request",
        video: withVideo,
        audio: withAudio,
      });
      console.log("[usePeerMedia] startCall: sent call-request");

      callTimeout = setTimeout(() => {
        console.warn("[usePeerMedia] startCall: callTimeout");
        endCall();
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
      mediaConn: !!mediaConn,
    });
    isCameraEnabled.value = false;
    isMicEnabled.value = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getVideoTracks().forEach((t) => {
        t.enabled = false; // Start disabled, user enables explicitly if needed?
        // Wait, original code disabled them: t.enabled = false.
        // But then passed stream to answer.
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      localStream.value = stream;

      if (mediaConn) {
        mediaConn.answer(stream);
        setupMediaConnection(mediaConn);
      } else {
        console.warn("[usePeerMedia] acceptCall: mediaConn is null");
      }
    } catch (e) {
      console.error("[usePeerMedia] acceptCall error", e);
      endCall();
    }
  }

  function setupMediaConnection(connection: MediaConnection) {
    connection.on("stream", (remote: MediaStream) => {
      remoteStream.value = remote;
      callState.value = "active";
      clearTimeout(callTimeout);
      console.log("[usePeerMedia] got remote stream", remote);
      updateRoomData("call", {
        status: "active",
        totalCalls: roomData.value.call.totalCalls + 1,
      });
    });
    connection.on("close", () => {
      console.log("[usePeerMedia] mediaConn closed");
      endCall();
    });
    connection.on("error", (e: any) => {
      console.error("[usePeerMedia] mediaConn error", e);
      endCall();
    });
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
    console.log("[usePeerMedia] endCall", {
      isRemoteEnd,
      mediaConn: !!mediaConn,
    });
    callState.value = "ended";

    if (mediaConn) {
      try {
        if (mediaConn.peerConnection) {
          mediaConn.peerConnection.close();
        }
        mediaConn.close();
      } catch (e) {
        console.error("[usePeerMedia] endCall: error closing mediaConn", e);
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

    // Screen Share Cleanup
    cleanupLocalScreenShare(true);
    if (mediaConnScreenIncoming) {
      try {
        mediaConnScreenIncoming.close();
      } catch (e) {}
      mediaConnScreenIncoming = null;
    }
    updateRoomData("members", { companionHasMediaStream: false });

    clearTimeout(callTimeout);
    if (!isRemoteEnd) {
      conn.value?.send({ type: "call-end" });
    }

    setTimeout(() => {
      callState.value = "idle";
      updateRoomData("call", {
        status: "idle",
        startTime: null,
        type: null,
      });
    }, 1000);

    isCameraEnabled.value = false;
    isMicEnabled.value = false;
    isCameraToggling.value = false;
    shouldAutoAcceptWithVideo = false;
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
    conn.value?.send({ type: enabled ? "mic-on" : "mic-off" });
  }

  async function toggleCamera(enabled: boolean) {
    if (!localStream.value || isCameraToggling.value) return;
    isCameraToggling.value = true;
    try {
      const track = localStream.value.getVideoTracks()[0];
      if (!track) return;
      track.enabled = enabled;
      isCameraEnabled.value = enabled;
      conn.value?.send({ type: enabled ? "video-on" : "video-off" });
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

        conn.value?.send({
          type: "screen-share-on",
          sharer: screenShareOwnerId.value,
        });

        if (peer.value && conn.value?.open) {
          try {
            mediaConnScreenOutgoing = peer.value.call(
              conn.value.peer,
              dispStream,
              {
                metadata: {
                  screenshare: true,
                  sharer: screenShareOwnerId.value,
                },
              },
            );

            mediaConnScreenOutgoing.on("close", () => {
              cleanupLocalScreenShare(false);
            });
            mediaConnScreenOutgoing.on("error", (e: any) => {
              cleanupLocalScreenShare(true);
            });
          } catch (e) {
            console.warn("[usePeerMedia] screenshare outgoing call failed", e);
          }
        }

        const stopHandler = () => {
          dispStream
            .getTracks()
            .forEach((t) => t.removeEventListener("ended", stopHandler));
          toggleScreenShare(false);
        };
        dispStream
          .getTracks()
          .forEach((t) => t.addEventListener("ended", stopHandler));
      } catch (err) {
        console.warn("[usePeerMedia] toggleScreenShare failed", err);
      }
    } else {
      try {
        if (screenShareStream.value) {
          screenShareStream.value.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
        }
        try {
          if (mediaConnScreenOutgoing) {
            mediaConnScreenOutgoing.close();
            mediaConnScreenOutgoing = null;
          }
        } catch (e) {}

        conn.value?.send({
          type: "screen-share-off",
          sharer: useDeviceId(),
        });
      } finally {
        screenShareStream.value = null;
        isScreenShareEnabled.value = false;
        screenShareOwnerId.value = null;
      }
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
    try {
      if (mediaConnScreenOutgoing) {
        mediaConnScreenOutgoing.close();
      }
    } catch {}
    mediaConnScreenOutgoing = null;
    screenShareStream.value = null;
    isScreenShareEnabled.value = false;
    if (!suppressNotify) {
      conn.value?.send({
        type: "screen-share-off",
        sharer: useDeviceId(),
      });
    }
    screenShareOwnerId.value = null;
  }

  function handleIncomingCall(mediaConnection: MediaConnection) {
    const isScreenshare = mediaConnection?.metadata?.screenshare;

    if (isScreenshare) {
      console.log("[usePeerMedia] incoming screenshare call", mediaConnection);
      mediaConnScreenIncoming = mediaConnection;

      try {
        mediaConnScreenIncoming.answer?.();
      } catch (e) {
        console.warn("[usePeerMedia] screenshare.answer failed", e);
      }

      mediaConnScreenIncoming.on("stream", (remoteStream: MediaStream) => {
        console.log(
          "[usePeerMedia] got remote screenshare stream",
          remoteStream,
        );
        screenShareStream.value = remoteStream;
        isScreenShareEnabled.value = true;
        screenShareOwnerId.value = mediaConnection?.metadata?.sharer ?? null;
        updateRoomData("members", { companionHasMediaStream: true });
      });

      mediaConnScreenIncoming.on("close", () => {
        cleanupIncomingScreenShare();
      });

      mediaConnScreenIncoming.on("error", (e: any) => {
        cleanupIncomingScreenShare();
      });
      return;
    }

    // Regular call
    console.log("[usePeerMedia] incoming call", mediaConnection);
    callState.value = "incoming";
    if (mediaConn) {
      try {
        mediaConn.close();
      } catch (e) {}
      mediaConn = null;
    }
    mediaConn = mediaConnection;

    if (shouldAutoAcceptWithVideo) {
      shouldAutoAcceptWithVideo = false;
      console.log("[usePeerMedia] auto-accepting with video");
      acceptCall({ cam: true, mic: true });
    }
  }

  function cleanupIncomingScreenShare() {
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
    updateRoomData("members", { companionHasMediaStream: false });
  }

  function handleSignal(data: any) {
    if (data.type === "restart-call-with-video") {
      if (mediaConn) {
        try {
          mediaConn.close();
        } catch (e) {}
        mediaConn = null;
      }
      endCall(true);
      setTimeout(() => {
        shouldAutoAcceptWithVideo = true;
      }, 100);
      return;
    }

    if (data.type === "call-request") {
      callState.value = "incoming";
      callType.value = data.video ? "video" : "audio";
      updateRoomData("members", {
        companionCameraEnabled: !!data.video,
        companionMicEnabled: !!data.audio,
      });
    }
    if (data.type === "call-decline") {
      updateRoomData("members", {
        companionCameraEnabled: false,
        companionMicEnabled: false,
      });
      endCall(true);
    }
    if (data.type === "call-end") {
      updateRoomData("members", {
        companionCameraEnabled: false,
        companionMicEnabled: false,
      });
      endCall(true);
    }
    if (data.type === "video-off") {
      updateRoomData("members", { companionCameraEnabled: false });
      if (remoteStream.value) {
        remoteStream.value.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
    }
    if (data.type === "video-on") {
      updateRoomData("members", { companionCameraEnabled: true });
      if (remoteStream.value) {
        remoteStream.value.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
      } else if (mediaConn?.peerConnection) {
        // Reconstruct stream if needed (logic from original)
        const receivers = mediaConn.peerConnection.getReceivers();
        const videoTrack = receivers
          .map((r) => r.track)
          .find((t) => t?.kind === "video" && t.readyState === "live");
        const audioTracks = receivers
          .map((r) => r.track)
          .filter((t) => t?.kind === "audio" && t.readyState === "live");
        if (videoTrack) {
          remoteStream.value = new MediaStream(
            [videoTrack, ...audioTracks].filter(Boolean) as MediaStreamTrack[],
          );
        }
      }
    }
    if (data.type === "mic-off") {
      updateRoomData("members", { companionMicEnabled: false });
    }
    if (data.type === "mic-on") {
      updateRoomData("members", { companionMicEnabled: true });
    }
    if (data.type === "screen-share-on") {
      updateRoomData("members", { companionHasMediaStream: true });
      if (data.sharer) screenShareOwnerId.value = data.sharer;
    }
    if (data.type === "screen-share-off") {
      updateRoomData("members", { companionHasMediaStream: false });
      if (data.sharer && screenShareOwnerId.value === data.sharer) {
        screenShareOwnerId.value = null;
      }
    }
  }

  return {
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
    toggleCamera: debouncedToggleCamera,
    toggleMic: debouncedToggleMic,
    toggleScreenShare,
    handleIncomingCall,
    handleSignal,
  };
}

import { computed, ref } from "vue";
import type { RoomData } from "./types";

export function usePeerRoom(sessionId: string) {
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
      companionCameraEnabled: false,
      companionMicEnabled: false,
      companionHasMediaStream: false,
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

  return {
    roomData,
    updateRoomData,
    roomStatistics,
  };
}

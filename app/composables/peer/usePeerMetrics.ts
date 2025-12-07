import type { DataConnection } from "peerjs";
import { type Ref, reactive, ref } from "vue";
import type { DataTransferStatus, NetworkQuality, RoomData } from "./types";

export function usePeerMetrics(
  roomData: Ref<RoomData>,
  updateRoomData: <T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ) => void,
  conn: Ref<DataConnection | null>,
) {
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

  const pingPongCompanionDiscottectionTimeout = ref<NodeJS.Timeout | null>(
    null,
  );

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

  function calculateJitter(rttHistory: number[]): number {
    if (rttHistory.length < 2) return 0;

    const mean =
      rttHistory.reduce((sum, rtt) => sum + rtt, 0) / rttHistory.length;
    const variance =
      rttHistory.reduce((sum, rtt) => sum + (rtt - mean) ** 2, 0) /
      rttHistory.length;
    return Math.sqrt(variance);
  }

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

  function initializeMetricsTracking(): void {
    metricsState.connectionStartTime = Date.now();
    startPingMonitoring();
    startSessionDurationTracking();
  }

  function handlePingResponse(timestamp: number): void {
    const now = Date.now();
    const rtt = now - timestamp;

    // Maintain RTT history for jitter calculation (sliding window of 10 measurements)
    metricsState.rttHistory.push(rtt);
    if (metricsState.rttHistory.length > 10) {
      metricsState.rttHistory.shift();
    }

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

  function clearPingPongTimeout() {
    if (pingPongCompanionDiscottectionTimeout.value) {
      clearTimeout(pingPongCompanionDiscottectionTimeout.value);
      pingPongCompanionDiscottectionTimeout.value = null;
    }
  }

  function stopPingMonitoring() {
    if (metricsState.pingInterval) {
      clearInterval(metricsState.pingInterval);
      metricsState.pingInterval = null;
    }
  }

  return {
    metricsState,
    initializeMetricsTracking,
    handlePingResponse,
    updateBytesTransferred,
    clearPingPongTimeout,
    stopPingMonitoring,
  };
}

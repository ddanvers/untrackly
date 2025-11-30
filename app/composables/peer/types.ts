export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "failed";

export type UserStatus = "online" | "away" | "busy" | "offline";
export type NetworkQuality =
  | "excellent"
  | "good"
  | "poor"
  | "unstable"
  | "critical";
export type DataTransferStatus =
  | "idle"
  | "transmitting"
  | "receiving"
  | "bidirectional";

export type CallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "active"
  | "ended"
  | "declined"
  | "failed";

export interface NetworkMetrics {
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

export interface RoomMetadata {
  id: string;
  dateCreated: string;
  dateUpdated: string;
  sessionDuration: number;
  name?: string;
}

export interface CallMetrics {
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

export interface MessageMetrics {
  messagesSent: number;
  messagesReceived: number;
  unreadCount: number;
  filesShared: number;
  lastMessageTimestamp: number;
}

export interface MemberStatus {
  yourStatus: UserStatus;
  companionStatus: UserStatus;
  companionLastSeen: number;
  isCompanionTyping: boolean;
  lastActivityTimestamp: number;
  companionCameraEnabled: boolean;
  companionMicEnabled: boolean;
  companionHasMediaStream: boolean;
}

export interface RoomData {
  room: RoomMetadata;
  members: MemberStatus;
  network: NetworkMetrics;
  call: CallMetrics;
  messages: MessageMetrics;
}

export interface ReplyMessageData {
  id: string;
  text: string;
  sender: string;
}

// Message types from original file (inferred or need to be copied)
export interface MessageFile {
  id: string;
  preview?: string;
  file: {
    name: string;
    size: number;
    type: string;
    fileData: ArrayBuffer;
    fileUrl?: string;
  };
}

export interface Message {
  id: string;
  type: "message";
  sender: string;
  isVoiceMessage?: boolean;
  text: string;
  timestamp: number;
  files: MessageFile[];
  replyMessage?: ReplyMessageData;
  read: boolean;
  isEdited?: boolean;
  existingFileIds?: string[];
}

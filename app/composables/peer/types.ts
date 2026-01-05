export interface Member {
  id: string;
  userId?: number;
  deviceId: string;
  name: string;
  isSelf: boolean;
  status: "online" | "offline";
  lastSeen: number;
  isTyping: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  hasMediaStream: boolean;
  callStatus: "idle" | "calling" | "incoming" | "active";
}

export interface RoomData {
  room: {
    id: string;
    isGroup?: boolean;
    dateCreated: string;
    dateUpdated: string;
    sessionDuration: number;
  };
  members: Record<string, Member>;
  network: {
    connectionStatus: "connecting" | "connected" | "disconnected" | "failed";
    quality: "good" | "poor" | "bad";
    dataTransferStatus: "idle" | "sending" | "receiving";
    sentBytes: number;
    receivedBytes: number;
    roundTripTime: number;
    packetLossPercentage: number;
    estimatedBandwidth: number;
    lastPingTimestamp: number;
    connectionUptime: number;
    jitterMs: number;
    retryAttempts: number;
  };
  call: {
    status: "idle" | "calling" | "incoming" | "active" | "ended";
    type: "audio" | "video" | null;
    startTime: number | null;
    duration: number;
    totalCalls: number;
    quality: {
      videoResolution: string | null;
      audioQuality: string | null;
      frameRate: number | null;
    };
  };
  messages: {
    messagesSent: number;
    messagesReceived: number;
    unreadCount: number;
    filesShared: number;
    lastMessageTimestamp: number;
  };
}

export interface MessageFile {
  id: string;
  preview?: string;
  file: {
    name: string;
    size: number;
    type: string;
    fileData?: string; // Base64 - optional for large files
    fileId?: string; // For chunked transfer
    fileUrl?: string; // Created locally for display
    percentLoaded?: number; // 0-100 indicating download progress
    encryption?: {
      key: string; // Base64 exported key
      iv: string; // Base64 iv
    };
  };
}

export interface FileChunk {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string; // Base64
}

export interface ReplyMessageData {
  id: string;
  text: string;
  sender: string;
  file?: {
    type: string;
    name: string;
  };
}

export interface Message {
  id: string;
  type: "message";
  sender: string; // Peer ID
  text: string;
  timestamp: number;
  files: MessageFile[];
  read: boolean;
  replyMessage?: ReplyMessageData;
  isEdited?: boolean;
  isVoiceMessage?: boolean;
  transcription?: string;
  existingFileIds?: string[]; // IDs of files to keep during edit
}

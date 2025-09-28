declare global {
  interface Message {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    read?: boolean;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    fileMime?: string;
    files: MessageFile[];
    isEdited?: boolean;
    isVoiceMessage?: boolean;
    transcription?: string;
    existingFileIds?: string[];
    replyMessage?: ReplyMessageData;
  }
  interface SendMessageRequest {
    text: string;
    files: FileAttachment[];
    replyMessage?: ReplyMessageData;
    isVoiceMessage?: boolean;
  }
  interface EditMessageRequest extends SendMessageRequest {
    editingId?: string;
    read?: boolean;
  }
  interface ReplyMessageRequest extends SendMessageRequest {
    replyMessage: ReplyMessageData;
  }
  interface FileAttachment {
    id: string;
    file: File | ModelFile;
    preview?: string;
  }
  interface ModelFile {
    fileData: ArrayBuffer;
    fileUrl: string;
    name: string;
    size: number;
    type: string;
  }
  interface MessageFile {
    file: ModelFile;
    id: string;
    preview?: string;
  }

  interface ReplyMessageData {
    id: string;
    sender: string;
    text: string;
  }
}

export {};

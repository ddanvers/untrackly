declare global {
  interface Message {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    replyMessage?: ReplyMessageData | null;
    read?: boolean;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    fileMime?: string;
    files: MessageFile[];
    isEdited?: boolean;
    existingFileIds?: string[];
    replyMessage?: ReplyMessageData;
  }
  interface SendMessageRequest {
    text: string;
    files: FileAttachment[];
  }
  interface EditMessageRequest extends SendMessageRequest {
    editingId?: string;
  }
  interface ReplyMessageRequest extends SendMessageRequest {
    replyingId?: string;
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

import { type Ref, ref } from "vue";
import { useDeviceId } from "~/composables/useDeviceId";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~/utils/crypto";
import type { Message, MessageFile, ReplyMessageData, RoomData } from "./types";
import { calculateDataSize } from "./utils";

export interface SendMessageRequest {
  text: string;
  files: { id: string; file: File; preview?: string }[];
  isVoiceMessage?: boolean;
}

export interface EditMessageRequest {
  editingId: string;
  text: string;
  files: { id: string; file: File | MessageFile["file"]; preview?: string }[];
  read: boolean;
  replyMessage?: ReplyMessageData;
}

export interface ReplyMessageRequest {
  text: string;
  files: { id: string; file: File; preview?: string }[];
  replyMessage: ReplyMessageData;
}

export function usePeerMessages(
  broadcast: (data: any) => Promise<void>,
  roomData: Ref<RoomData>,
  updateRoomData: <T extends keyof RoomData>(
    section: T,
    updates: Partial<RoomData[T]>,
  ) => void,
  updateBytesTransferred: (sent: number, received: number) => void,
) {
  const messages = ref<Message[]>([]);
  const attachedFiles = ref<File[]>([]);

  function attachFile(file: File) {
    attachedFiles.value.push(file);
  }

  function detachFile(index: number) {
    attachedFiles.value.splice(index, 1);
  }

  async function sendMessage(
    payload: SendMessageRequest,
    replyMessage?: ReplyMessageData,
  ) {
    console.log("[usePeerMessages] sendMessage", payload);

    const filesToSend = await Promise.all(
      payload.files.map(async (f) => {
        const file = f.file;
        const arrayBuffer = await (file as File).arrayBuffer();
        const fileUrl = URL.createObjectURL(file as File);
        const msgFile: MessageFile = {
          id: f.id,
          preview: f.preview,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            fileData: arrayBufferToBase64(arrayBuffer),
            fileUrl,
          },
        };
        return msgFile;
      }),
    );

    const message: Message = {
      id: crypto.randomUUID(),
      type: "message",
      sender: useDeviceId(),
      isVoiceMessage: payload.isVoiceMessage,
      text: payload.text,
      timestamp: Date.now(),
      files: filesToSend,
      replyMessage: replyMessage,
      read: false,
    };

    console.log("[usePeerMessages] sendMessage: message", message);
    await broadcast(message);

    const messageSize = calculateDataSize(message);
    updateBytesTransferred(messageSize, 0);

    updateRoomData("messages", {
      messagesSent: roomData.value.messages.messagesSent + 1,
      lastMessageTimestamp: message.timestamp,
    });

    messages.value.push(message);
  }

  async function editMessage(payload: EditMessageRequest) {
    console.log("[usePeerMessages] editMessage", payload);

    const filesToSend: MessageFile[] = [];
    const existingFileIds: string[] = [];

    for (const f of payload.files) {
      if (f.file instanceof File) {
        const arrayBuffer = await (f.file as File).arrayBuffer();
        const fileUrl = URL.createObjectURL(f.file as File);
        filesToSend.push({
          id: f.id,
          preview: f.preview,
          file: {
            name: f.file.name,
            size: f.file.size,
            type: f.file.type,
            fileData: arrayBufferToBase64(arrayBuffer),
            fileUrl,
          },
        });
      } else {
        existingFileIds.push(f.id);
      }
    }

    const message: Message = {
      id: payload.editingId || crypto.randomUUID(),
      type: "message",
      sender: useDeviceId(),
      text: payload.text,
      timestamp: Date.now(),
      files: filesToSend,
      read: payload.read,
      replyMessage: payload.replyMessage,
      isEdited: true,
      existingFileIds,
    };

    console.log("[usePeerMessages] editMessage: message", message);
    await broadcast(message);

    const messageSize = calculateDataSize(message);
    updateBytesTransferred(messageSize, 0);

    const indexToEdit = messages.value.findIndex((m) => m.id === message.id);
    if (indexToEdit !== -1) {
      messages.value[indexToEdit] = {
        ...messages.value[indexToEdit],
        ...message,
        files: [
          ...messages.value[indexToEdit].files.filter((f) =>
            existingFileIds.includes(f.id),
          ),
          ...filesToSend.map((f) => ({
            ...f,
            file: {
              ...f.file,
              fileUrl:
                f.file.fileUrl ||
                URL.createObjectURL(
                  new Blob([base64ToArrayBuffer(f.file.fileData)], {
                    type: f.file.type,
                  }),
                ),
            },
          })),
        ],
      };
    }

    updateRoomData("messages", {
      lastMessageTimestamp: message.timestamp,
    });
  }

  function replyToMessage(request: ReplyMessageRequest) {
    sendMessage(
      {
        text: request.text,
        files: request.files,
      },
      request.replyMessage,
    );
  }

  function deleteMessage(messageId: string) {
    const index = messages.value.findIndex((m: any) => m.id === messageId);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }
    broadcast({ type: "delete-message", id: messageId });
  }

  function readMessage(id: string) {
    const msg = messages.value.find((m) => m.id === id);
    if (!msg || msg.read) return;
    msg.read = true;
    updateRoomData("messages", {
      unreadCount: Math.max(0, roomData.value.messages.unreadCount - 1),
    });
    broadcast({ type: "read", id });
  }

  function handleIncomingMessage(data: any) {
    if (data?.type === "delete-message" && data.id) {
      const idx = messages.value.findIndex((m) => m.id === data.id);
      if (idx !== -1) {
        messages.value.splice(idx, 1);
      }
      return;
    }

    if (data?.type === "read" && data.id) {
      const msg = messages.value.find((m) => m.id === data.id);
      if (msg) msg.read = true;
      return;
    }

    // Regular message
    let msg: Message;
    if (typeof data === "string") {
      msg = JSON.parse(data);
    } else if (data?.type === "message") {
      const typedData = data as Message;
      const filesWithUrl = typedData.files
        .filter((f) => f)
        .map((f) => {
          const fileData = f.file.fileData;
          // Convert from Base64 string back to ArrayBuffer
          const buffer = base64ToArrayBuffer(fileData);
          const blob = new Blob([buffer], { type: f.file.type });
          return {
            ...f,
            file: {
              ...f.file,
              fileUrl: URL.createObjectURL(blob),
            },
          };
        });
      msg = {
        id: typedData.id,
        sender: typedData.sender,
        read: false,
        text: typedData.text,
        timestamp: typedData.timestamp,
        replyMessage: typedData.replyMessage,
        type: "message",
        files: filesWithUrl,
        isEdited: typedData.isEdited,
        isVoiceMessage: typedData.isVoiceMessage,
        existingFileIds: typedData.existingFileIds,
      };

      // Update room data for specific members?
      // roomData.messages tracks GLOBAL stats for the room, so just increment.
      updateRoomData("messages", {
        filesShared:
          roomData.value.messages.filesShared + typedData.files.length,
      });
    } else {
      // Unknown or not a message handled here
      return;
    }

    if (msg.isEdited) {
      const indexToEdit = messages.value.findIndex((m) => m.id === msg.id);
      if (indexToEdit !== -1) {
        messages.value[indexToEdit] = {
          ...msg,
          files: [
            ...messages.value[indexToEdit].files.filter((f) =>
              msg.existingFileIds?.includes(f.id),
            ),
            ...(msg.files || []),
          ],
        };
      }
    } else {
      // Check if message already exists (deduplication for mesh network)
      if (!messages.value.some((m) => m.id === msg.id)) {
        messages.value.push(msg);
        updateRoomData("messages", {
          messagesReceived: roomData.value.messages.messagesReceived + 1,
          unreadCount: roomData.value.messages.unreadCount + 1,
          lastMessageTimestamp: msg.timestamp,
        });
      }
    }
  }

  return {
    messages,
    attachedFiles,
    attachFile,
    detachFile,
    sendMessage,
    editMessage,
    replyToMessage,
    deleteMessage,
    readMessage,
    handleIncomingMessage,
  };
}

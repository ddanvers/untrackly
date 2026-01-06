import { type Ref, ref } from "vue";
import { useDeviceId } from "~/composables/useDeviceId";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decryptData,
  encryptData,
  exportKeyRaw,
  generateFileKey,
  importKeyRaw,
} from "~/utils/crypto";
import type {
  FileChunk,
  Message,
  MessageFile,
  ReplyMessageData,
  RoomData,
} from "./types";
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
  const incomingFiles = ref(
    new Map<
      string,
      {
        chunks: Map<number, string>;
        totalChunks: number;
        receivedChunks: number;
        messageId: string;
      }
    >(),
  );

  function attachFile(file: File) {
    attachedFiles.value.push(file);
  }

  function detachFile(index: number) {
    attachedFiles.value.splice(index, 1);
  }

  async function processFileChunks(fileId: string, fileData: ArrayBuffer) {
    const CHUNK_SIZE = 64 * 1024; // 64KB
    const totalChunks = Math.ceil(fileData.byteLength / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(fileData.byteLength, start + CHUNK_SIZE);
      const chunkArrayBuffer = fileData.slice(start, end);
      const chunkBase64 = arrayBufferToBase64(chunkArrayBuffer);

      const chunkData: FileChunk = {
        fileId,
        chunkIndex: i,
        totalChunks,
        data: chunkBase64,
      };

      // Note: 'file-chunk' is NO LONGER encrypted by Ratchet.
      // The data inside is ALREADY ciphertext.
      await broadcast({
        type: "file-chunk",
        ...chunkData,
      });

      // Small delay to allow UI updates and prevent total blocking
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  }

  async function sendMessage(
    payload: SendMessageRequest,
    replyMessage?: ReplyMessageData,
  ) {
    console.log("[usePeerMessages] sendMessage", payload);

    const filesToSend = await Promise.all(
      payload.files.map(async (f) => {
        const file = f.file;
        const fileUrl = URL.createObjectURL(file as File);

        const isLargeFile = file.size > 100 * 1024; // > 100KB
        let fileData: string | undefined;
        let encryptionMetadata: { key: string; iv: string } | undefined;
        let finalFileBuffer: ArrayBuffer | undefined;

        if (!isLargeFile) {
          const arrayBuffer = await (file as File).arrayBuffer();
          fileData = arrayBufferToBase64(arrayBuffer);
        } else {
          // Generate ONE-TIME key
          const key = await generateFileKey();
          const rawKey = await exportKeyRaw(key);
          const arrayBuffer = await (file as File).arrayBuffer();

          // Encrypt the WHOLE file
          const { ciphertext, iv } = await encryptData(key, arrayBuffer);

          encryptionMetadata = {
            key: arrayBufferToBase64(rawKey.buffer as ArrayBuffer),
            iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
          };

          // Prepare to send chunks of CIPHERTEXT
          finalFileBuffer = ciphertext;
        }

        const msgFile: MessageFile = {
          id: f.id,
          preview: f.preview,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            fileData: fileData,
            fileId: isLargeFile ? f.id : undefined,
            fileUrl,
            encryption: encryptionMetadata,
          },
        };

        // If large, we need to send chunks separately.
        // We pass the CIPHERTEXT buffer to be chunked.
        if (isLargeFile && finalFileBuffer) {
          // We'll call process directly, but we need to wait for message broadcast first?
          // We can attach propery to helper
          (msgFile as any)._ciphertext = finalFileBuffer;
        }

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

    // Start sending chunks for large files in background
    for (const f of filesToSend) {
      if ((f as any)._ciphertext) {
        processFileChunks(f.id, (f as any)._ciphertext).catch((err) => {
          console.error("Error sending file chunks", err);
        });
      }
    }
  }

  async function editMessage(payload: EditMessageRequest) {
    console.log("[usePeerMessages] editMessage", payload);

    const existingFileIds: string[] = [];
    const newFilesToProcess: { id: string; file: File; preview?: string }[] =
      [];

    // Separate existing vs new files
    payload.files.forEach((f) => {
      // If it has 'fileData' or 'fileUrl' inside 'file', it's likely an existing ModelFile
      // Or we can check if it is NOT a File instance?
      // File instance check is safer.
      if (f.file instanceof File) {
        newFilesToProcess.push({ id: f.id, file: f.file, preview: f.preview });
      } else {
        // Existing file, keep ID
        existingFileIds.push(f.id);
      }
    });

    // Process NEW files (encrypt/chunk)
    const processedNewFiles = await Promise.all(
      newFilesToProcess.map(async (f) => {
        const file = f.file;
        const fileUrl = URL.createObjectURL(file as File);

        const isLargeFile = file.size > 100 * 1024;
        let fileData: string | undefined;
        let encryptionMetadata: { key: string; iv: string } | undefined;
        let finalFileBuffer: ArrayBuffer | undefined;

        if (!isLargeFile) {
          const arrayBuffer = await (file as File).arrayBuffer();
          fileData = arrayBufferToBase64(arrayBuffer);
        } else {
          const key = await generateFileKey();
          const rawKey = await exportKeyRaw(key);
          const arrayBuffer = await (file as File).arrayBuffer();
          const { ciphertext, iv } = await encryptData(key, arrayBuffer);

          encryptionMetadata = {
            key: arrayBufferToBase64(rawKey.buffer as ArrayBuffer),
            iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
          };
          finalFileBuffer = ciphertext;
        }

        const msgFile: MessageFile = {
          id: f.id,
          preview: f.preview,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            fileData: fileData,
            fileId: isLargeFile ? f.id : undefined,
            fileUrl,
            encryption: encryptionMetadata,
          },
        };

        if (isLargeFile && finalFileBuffer) {
          (msgFile as any)._ciphertext = finalFileBuffer;
        }

        return msgFile;
      }),
    );

    // Update Local State Immediately
    const indexToEdit = messages.value.findIndex(
      (m) => m.id === payload.editingId,
    );
    if (indexToEdit !== -1) {
      // Merge existing files + new processed files
      const currentFiles = messages.value[indexToEdit]?.files || [];
      const keptFiles = currentFiles.filter((f) =>
        existingFileIds.includes(f.id),
      );

      messages.value[indexToEdit] = {
        ...messages.value[indexToEdit]!,
        id: messages.value[indexToEdit]!.id,
        text: payload.text,
        isEdited: true,
        files: [...keptFiles, ...processedNewFiles],
        read: payload.read,
      };
    }

    // Broadcast
    // We send ONLY new files in 'files' array, and 'existingFileIds' for the rest.
    await broadcast({
      type: "edit-message",
      editingId: payload.editingId,
      text: payload.text,
      files: processedNewFiles, // Only send new files
      existingFileIds: existingFileIds,
      read: payload.read,
      replyMessage: payload.replyMessage,
    });

    // Send chunks for new large files
    for (const f of processedNewFiles) {
      if ((f as any)._ciphertext) {
        processFileChunks(f.id, (f as any)._ciphertext).catch((err) => {
          console.error("Error sending file chunks for edit", err);
        });
      }
    }
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

  function tryReassemble(fileId: string, fileEntry: any) {
    const msg = messages.value.find((m) => m.id === fileEntry.messageId);
    const fileM = msg?.files.find((f) => f.file.fileId === fileId);

    if (msg && fileM && fileM.file.encryption) {
      console.log(
        `[usePeerMessages] Reassembling file ${fileId} for message ${msg.id}`,
      );
      const sortedChunks = Array.from(fileEntry.chunks.entries())
        .sort((a: any, b: any) => a[0] - b[0])
        .map((entry: any) => base64ToArrayBuffer(entry[1]));

      const totalLength = sortedChunks.reduce(
        (acc, buf) => acc + buf.byteLength,
        0,
      );
      const ciphertext = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of sortedChunks) {
        ciphertext.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      const enc = fileM.file.encryption;
      const keyBytes = base64ToArrayBuffer(enc.key);

      importKeyRaw(new Uint8Array(keyBytes), ["decrypt"], "AES-GCM")
        .then((key) => {
          const iv = new Uint8Array(base64ToArrayBuffer(enc.iv));
          return decryptData(key, ciphertext.buffer, iv);
        })
        .then((decryptedBuffer) => {
          // SANITIZE: Prevent HTML/Script blobs
          let safeType = fileM.file.type || "application/octet-stream";
          if (
            safeType.includes("html") ||
            safeType.includes("script") ||
            safeType.includes("svg")
          ) {
            safeType = "application/octet-stream";
          }
          const blob = new Blob([decryptedBuffer], { type: safeType });
          const url = URL.createObjectURL(blob);
          fileM.file.fileUrl = url;
          fileM.file.type = safeType; // Update metadata to match safe type
          fileM.file.percentLoaded = 100;
          // Force update
          messages.value = [...messages.value];
          console.log(`[usePeerMessages] File ${fileId} ready: ${url}`);
        })
        .catch((err) => {
          console.error(
            `[usePeerMessages] Decryption failed for file ${fileId}`,
            err,
          );
        });

      // Only delete if we successfully found the message and started decryption
      incomingFiles.value.delete(fileId);
    } else {
      console.warn(
        `[usePeerMessages] Finished chunks for ${fileId} but message not found yet. Keeping in buffer.`,
      );
    }
  }

  function handleIncomingMessage(data: any) {
    if (data?.type === "file-chunk") {
      const chunk = data as FileChunk;

      if (!incomingFiles.value.has(chunk.fileId)) {
        incomingFiles.value.set(chunk.fileId, {
          chunks: new Map(),
          totalChunks: chunk.totalChunks,
          receivedChunks: 0,
          messageId: "",
        });
      }

      const fileEntry = incomingFiles.value.get(chunk.fileId)!;
      if (!fileEntry.chunks.has(chunk.chunkIndex)) {
        fileEntry.chunks.set(chunk.chunkIndex, chunk.data);
        fileEntry.receivedChunks++;

        // Try to link to message if we haven't yet
        if (!fileEntry.messageId) {
          const msgFound = messages.value.find((m) =>
            m.files?.some((f) => f.file.fileId === chunk.fileId),
          );
          if (msgFound) fileEntry.messageId = msgFound.id;
        }

        // Update progress
        if (fileEntry.messageId) {
          const msg = messages.value.find((m) => m.id === fileEntry.messageId);
          const fileM = msg?.files.find((f) => f.file.fileId === chunk.fileId);
          if (msg && fileM) {
            fileM.file.percentLoaded = Math.floor(
              (fileEntry.receivedChunks / fileEntry.totalChunks) * 100,
            );
          }
        }

        if (fileEntry.receivedChunks === fileEntry.totalChunks) {
          tryReassemble(chunk.fileId, fileEntry);
        }
      }
      return;
    }

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
    } else if (data?.type === "message" || data?.type === "edit-message") {
      const isEdit = data.type === "edit-message";
      const typedData = data;

      const filesWithUrl = (typedData.files || [])
        .filter((f: any) => f)
        .map((f: any) => {
          let fileUrl: string | undefined;

          if (f.file.fileData) {
            try {
              const buffer = base64ToArrayBuffer(f.file.fileData);
              // SANITIZE: Prevent HTML/Script blobs
              let safeType = f.file.type || "application/octet-stream";
              if (
                safeType.includes("html") ||
                safeType.includes("script") ||
                safeType.includes("svg")
              ) {
                safeType = "application/octet-stream";
              }

              const blob = new Blob([buffer], { type: safeType });
              fileUrl = URL.createObjectURL(blob);
            } catch (e) {
              console.error("Failed to process inline file data", e);
            }
          } else if (f.file.fileId && f.file.fileId.length > 0) {
            // Expecting chunks or it's an existing file ref, no URL yet
            fileUrl = undefined;
          }

          // Ensure type is updated if we sanitized it
          let finalType = f.file.type;
          if (fileUrl && fileUrl.startsWith("blob:")) {
            // Re-calculate safe type if needed, or just use what we found
            const sType = f.file.type || "application/octet-stream";
            if (
              sType.includes("html") ||
              sType.includes("script") ||
              sType.includes("svg")
            ) {
              finalType = "application/octet-stream";
            }
          }

          return {
            ...f,
            file: {
              ...f.file,
              fileUrl,
              type: finalType,
            },
          };
        });

      msg = {
        id: isEdit ? typedData.editingId : typedData.id,
        sender: typedData.sender || "",
        read: typedData.read || false,
        text: typedData.text,
        timestamp: typedData.timestamp || Date.now(),
        replyMessage: typedData.replyMessage,
        type: "message",
        files: filesWithUrl,
        isEdited: isEdit || typedData.isEdited,
        isVoiceMessage: typedData.isVoiceMessage,
        existingFileIds: typedData.existingFileIds,
      };

      if (!isEdit) {
        updateRoomData("messages", {
          filesShared:
            roomData.value.messages.filesShared +
            (typedData.files?.length || 0),
        });
      }

      // Check for waiting files
      if (msg.files?.length) {
        for (const f of msg.files) {
          if (f.file.fileId && incomingFiles.value.has(f.file.fileId)) {
            const fileEntry = incomingFiles.value.get(f.file.fileId)!;
            fileEntry.messageId = msg.id;

            // Update progress to current state
            f.file.percentLoaded = Math.floor(
              (fileEntry.receivedChunks / fileEntry.totalChunks) * 100,
            );

            if (fileEntry.receivedChunks === fileEntry.totalChunks) {
              // It was waiting for us!
              setTimeout(() => tryReassemble(f.file.fileId!, fileEntry), 100);
            }
          }
        }
      }
    } else {
      return;
    }

    if (msg.isEdited) {
      // ... existing edit logic ...
      const indexToEdit = messages.value.findIndex((m) => m.id === msg.id);
      if (indexToEdit !== -1) {
        messages.value[indexToEdit] = {
          ...msg,
          id: messages.value[indexToEdit].id, // Keep original ID if new one undefined
          files: [
            ...messages.value[indexToEdit].files.filter((f) =>
              msg.existingFileIds?.includes(f.id),
            ),
            ...(msg.files || []),
          ],
        };
      }
    } else {
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

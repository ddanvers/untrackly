import type { Message } from "./types";

export function calculateDataSize(data: any): number {
  if (!data) return 0;

  // For file messages, calculate real file size
  if (data.type === "message" && data.files) {
    const typedData = data as Message;
    let totalSize = JSON.stringify({
      id: typedData.id,
      sender: typedData.sender,
      text: typedData.text,
      timestamp: typedData.timestamp,
      type: typedData.type,
      replyMessage: typedData.replyMessage,
    }).length;

    // Add real file size
    typedData.files.forEach((file) => {
      if (file?.file.size) {
        totalSize += file.file.size;
      } else if (file?.file.fileData instanceof ArrayBuffer) {
        totalSize += file.file.fileData.byteLength;
      }
    });

    return totalSize;
  }

  // For regular messages
  return JSON.stringify(data).length;
}

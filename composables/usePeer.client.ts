// composables/usePeer.client.ts
import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
  read?: boolean
  type?: string // 'text' | 'file'
  fileUrl?: string // для локального отображения
  fileName?: string
  fileMime?: string
}
export function usePeer(sessionId: string, isInitiator: boolean) {
  const peer = ref<Peer | null>(null)
  const conn = ref<DataConnection | null>(null)
  const messages = ref<Message[]>([])
  const isConnectionEstablished = ref(false)
  // Новый список файлов для отправки (локально, не отправляется через peerjs)
  const attachedFiles = ref<File[]>([])

  function initPeer() {
    const options = {
      host: 'localhost',
      path: '/peerjs',
      port: 9000,
      debug: 2,
    }
    console.log('[usePeer] initPeer', { sessionId, isInitiator: isInitiator, options })
    // Для инициатора — используем свой sessionId, для клиента — PeerJS сгенерирует ID
    peer.value = isInitiator
      ? new Peer(sessionId, options)
      : new Peer(undefined, options)

    peer.value.on('open', id => {
      console.log('[usePeer] Peer open', id)
      if (!isInitiator) {
        connectToPeer(sessionId)
      }
    })

    // Для инициатора — ждём входящих соединений
    peer.value.on('connection', connection => {
      console.log('[usePeer] Incoming connection')
      setupConnection(connection)
    })

    peer.value.on('error', err => {
      console.error('[usePeer] Peer error:', err)
    })
  }

  function connectToPeer(targetId: string) {
    if (!peer.value) return
    const connection = peer.value.connect(targetId, { reliable: true })
    setupConnection(connection)
  }

  function setupConnection(connection: DataConnection) {
    conn.value = connection
    connection.on('open', () => {
      console.log('[usePeer] Connection open')
      isConnectionEstablished.value = true
    })
    connection.on('data', (data: any) => {
      console.log('[usePeer] Connection data received', data)
      let msg: Message
      if (typeof data === 'string') {
        msg = JSON.parse(data)
      } else if (data && data.type === 'file') {
        // Принимаем файл любого типа
        const blob = new Blob([data.fileData], { type: data.fileMime })
        const fileUrl = URL.createObjectURL(blob)
        msg = {
          id: data.id,
          sender: data.sender,
          text: '',
          timestamp: data.timestamp,
          type: 'file',
          fileUrl,
          fileName: data.fileName,
          fileMime: data.fileMime
        }
        console.log('[usePeer] File received', data.fileName, data.fileMime, data.fileData?.byteLength)
      } else {
        msg = data as Message
      }
      messages.value.push(msg)
      console.log('[usePeer] Message pushed', msg)
    })
    connection.on('close', () => {
      console.log('[usePeer] Connection closed')
      conn.value = null
      isConnectionEstablished.value = false
    })
    connection.on('error', (err: any) => {
      console.error('[usePeer] Connection error:', err)
      isConnectionEstablished.value = false
    })
  }

  function sendMessage(text: string) {
    console.log('[usePeer] sendMessage', text)
    if (conn.value?.open) {
      conn.value.send(JSON.stringify({
        id: Date.now().toString(),
        sender: peer.value?.id as string,
        text,
        timestamp: Date.now()
      }))
      messages.value.push({
        id: Date.now().toString(),
        sender: peer.value?.id as string,
        text,
        timestamp: Date.now()
      })
      console.log('[usePeer] sendMessage: sent and pushed', text)
    } else {
      console.warn('[usePeer] sendMessage: conn not open', conn.value)
    }
  }

  // Добавить файл к списку
  function attachFile(file: File) {
    attachedFiles.value.push(file)
  }

  // Открепить файл по индексу
  function detachFile(index: number) {
    attachedFiles.value.splice(index, 1)
  }

  // Отправить все прикреплённые файлы
  function sendAllFiles() {
    if (!conn.value?.open) return
    attachedFiles.value.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        conn.value!.send({
          id: Date.now().toString(),
          sender: peer.value?.id as string,
          timestamp: Date.now(),
          type: 'file',
          fileName: file.name,
          fileMime: file.type,
          fileData: arrayBuffer
        })
        // Для локального отображения
        const fileUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }))
        messages.value.push({
          id: Date.now().toString(),
          sender: peer.value?.id as string,
          text: '',
          timestamp: Date.now(),
          type: 'file',
          fileUrl,
          fileName: file.name,
          fileMime: file.type
        })
      }
      reader.readAsArrayBuffer(file)
    })
    attachedFiles.value = []
  }

  function sendFile(file: File) {
    console.log('[usePeer] sendFile called', file)
    if (conn.value?.open) {
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        console.log('[usePeer] sendFile: reader loaded', file.name, file.type, file.size)
        conn.value!.send({
          id: Date.now().toString(),
          sender: peer.value?.id as string,
          timestamp: Date.now(),
          type: 'file',
          fileName: file.name,
          fileMime: file.type,
          fileData: arrayBuffer
        })
        console.log('[usePeer] sendFile: sent to peer', file.name)
        // Для локального отображения
        const fileUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }))
        messages.value.push({
          id: Date.now().toString(),
          sender: peer.value?.id as string,
          text: '',
          timestamp: Date.now(),
          type: 'file',
          fileUrl,
          fileName: file.name,
          fileMime: file.type
        })
        console.log('[usePeer] sendFile: local message pushed', file.name)
      }
      reader.readAsArrayBuffer(file)
      console.log('[usePeer] sendFile: reader started', file.name)
    } else {
      console.warn('[usePeer] sendFile: conn not open', conn.value)
    }
  }

  function destroy() {
    conn.value?.close()
    peer.value?.destroy()
  }

  onBeforeUnmount(destroy)

  return {
    messages,
    peer,
    isConnectionEstablished,
    initPeer,
    sendMessage,
    sendFile,
    attachFile,
    detachFile,
    sendAllFiles,
    attachedFiles,
    destroy,
  }
}

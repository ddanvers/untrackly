// composables/usePeer.client.ts
import { ref, onBeforeUnmount } from 'vue'
import Peer from 'peerjs'
interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
  read?: boolean
}
export function usePeer(sessionId: string, isInitiator: boolean) {
  const peer = ref<Peer | null>(null)
  const conn = ref<Peer.DataConnection | null>(null)
  const messages = ref<Message[]>([])

  function initPeer() {
    const options = {
      host: '/',
      port: 443,
      path: '/peerjs',
      secure: true,
    }
    // Для инициатора — используем свой sessionId, для клиента — PeerJS сгенерирует ID
    peer.value = isInitiator
      ? new Peer(sessionId, options)
      : new Peer(undefined, options)

    peer.value.on('open', id => {
      console.log('[PeerJS] Open with ID:', id)
      if (!isInitiator) {
        connectToPeer(sessionId)
      }
    })

    // Для инициатора — ждём входящих соединений
    peer.value.on('connection', connection => {
      console.log('[PeerJS] Incoming connection')
      setupConnection(connection)
    })

    peer.value.on('error', err => {
      console.error('[PeerJS] Error:', err)
    })
  }

  function connectToPeer(targetId: string) {
    if (!peer.value) return
    const connection = peer.value.connect(targetId, { reliable: true })
    setupConnection(connection)
  }

  function setupConnection(connection: Peer.DataConnection) {
    conn.value = connection
    connection.on('open', () => {
      console.log('[PeerJS] Connection open')
    })
    connection.on('data', (data: string)=> {
      messages.value.push(JSON.parse(data) as Message)
    })
    connection.on('close', () => {
      console.log('[PeerJS] Connection closed')
      conn.value = null
    })
    connection.on('error', err => {
      console.error('[PeerJS] Connection error:', err)
    })
  }

  function sendMessage(text: string) {
    console.log(conn.value?.open)
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
    initPeer,
    sendMessage,
    destroy,
  }
}

// composables/usePeer.ts
import { ref } from 'vue'
import SimplePeer from 'simple-peer'

export function usePeer() {
  const peer = ref<SimplePeer.Instance | null>(null)
  const localSignal = ref('')
  const remoteSignal = ref('')
  const messages = ref<string[]>([])
  const isInitiator = ref(false)

  function createPeer(initiator: boolean) {
    peer.value = new SimplePeer({
      initiator,
      trickle: false,
    })

    peer.value.on('signal', data => {
      localSignal.value = JSON.stringify(data)
    })

    peer.value.on('connect', () => {
      console.log('[Peer] Connected!')
    })

    peer.value.on('data', data => {
      messages.value.push(`[Peer]: ${data}`)
    })

    peer.value.on('error', err => {
      console.error('[Peer] Error:', err)
    })
  }

  function applyRemoteSignal() {
    if (!peer.value || !remoteSignal.value) return
    try {
      peer.value.signal(JSON.parse(remoteSignal.value))
    } catch (e) {
      console.warn('Invalid signal format')
    }
  }

  function sendMessage(message: string) {
    console.log("Send message: ", message, "when peer state = ", peer.value, )
    if (peer.value?.connected) {
      peer.value.send(message)
      messages.value.push(`[Me]: ${message}`)
    }
  }

  function disconnect() {
    peer.value?.destroy()
    peer.value = null
    messages.value = []
  }

  return {
    peer,
    messages,
    localSignal,
    remoteSignal,
    isInitiator,
    createPeer,
    applyRemoteSignal,
    sendMessage,
    disconnect
  }
}

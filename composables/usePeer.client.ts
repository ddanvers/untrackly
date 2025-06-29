// composables/usePeer.client.ts
import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import { useDebounce } from '~/composables/useDebounce'
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
  files?: { name: string, type: string, size: number, fileUrl: string }[]
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

    let shouldAutoAcceptWithVideo = false

    peer.value.on('call', mediaConnection => {
      console.log('[usePeer] peer.on(call): incoming', { mediaConnection, callState: callState.value, shouldAutoAcceptWithVideo, oldMediaConn: mediaConn })
      callState.value = 'incoming'
      // Явно закрываем и сбрасываем старый mediaConn
      if (mediaConn) {
        try { mediaConn.close() } catch (e) { console.error('[usePeer] peer.on(call): error closing old mediaConn', e) }
        mediaConn = null
      }
      mediaConn = mediaConnection
      console.log('[usePeer] peer.on(call): new mediaConn set', mediaConn)
      if (shouldAutoAcceptWithVideo) {
        shouldAutoAcceptWithVideo = false
        console.log('[usePeer] peer.on(call): auto-accepting with video')
        acceptCall({ cam: true, mic: true })
      }
      // Иначе — обычное поведение (ожидание accept)
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
      handleCallSignals(data)
      // Фильтрация сигнальных сообщений звонка и управления потоками
      if (data && (
        data.type === 'call-request' ||
        data.type === 'call-decline' ||
        data.type === 'call-end' ||
        data.type === 'video-on' ||
        data.type === 'video-off' ||
        data.type === 'restart-call-with-video'
      )) {
        // Не пушим сигнальные сообщения в messages
        return
      }
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
      } else if (data && data.type === 'file-group' && Array.isArray(data.files)) {
        // Группа файлов: формируем fileUrl для каждого файла
        const filesWithUrl = data.files.map((f: any) => {
          let fileData = f.fileData
          // Универсальное преобразование fileData в ArrayBuffer
          if (fileData && fileData.type !== 'Buffer' && !(fileData instanceof ArrayBuffer)) {
            if (fileData instanceof Uint8Array) {
              fileData = fileData.buffer
            } else if (fileData.data && Array.isArray(fileData.data)) {
              fileData = new Uint8Array(fileData.data).buffer
            } else if (Array.isArray(fileData)) {
              fileData = new Uint8Array(fileData).buffer
            } else if (typeof fileData === 'object' && typeof fileData.length === 'number') {
              // {0:...,1:...,length:...}
              const arr = new Uint8Array(fileData.length)
              for (let i = 0; i < fileData.length; i++) arr[i] = fileData[i]
              fileData = arr.buffer
            }
          }
          const blob = new Blob([fileData], { type: f.type })
          return {
            ...f,
            fileUrl: URL.createObjectURL(blob)
          }
        })
        msg = {
          id: data.id,
          sender: data.sender,
          text: data.text,
          timestamp: data.timestamp,
          type: 'file-group',
          files: filesWithUrl
        }
        console.log('[usePeer] File-group received', filesWithUrl)
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

  // Отправить одно сообщение с несколькими файлами и текстом
  function sendAllFiles(payload: { text: string, files: { name: string, type: string, size: number, file: File, preview?: string }[] }) {
    if (!conn.value?.open) return
    const filesToSend: any[] = []
    let filesProcessed = 0
    payload.files.forEach((f, idx) => {
      const reader = new FileReader()
      reader.onload = () => {
        filesToSend[idx] = {
          name: f.name,
          type: f.type,
          size: f.size,
          fileData: reader.result,
        }
        filesProcessed++
        if (filesProcessed === payload.files.length) {
          // Все файлы прочитаны, отправляем одно сообщение
          const msg = {
            id: Date.now().toString(),
            sender: peer.value?.id as string,
            text: payload.text,
            timestamp: Date.now(),
            type: 'file-group',
            files: filesToSend
          }
          conn.value!.send(msg)
          // Для локального отображения
          messages.value.push({ ...msg, files: filesToSend.map(f => ({ ...f, fileUrl: URL.createObjectURL(new Blob([f.fileData], { type: f.type })) })) })
        }
      }
      reader.readAsArrayBuffer(f.file)
    })
  }

  function destroy() {
    conn.value?.close()
    peer.value?.destroy()
  }

  onBeforeUnmount(destroy)

  // --- Видеозвонки ---
  const callState = ref<'idle' | 'calling' | 'incoming' | 'active' | 'ended'>('idle')
  const callType = ref<'audio' | 'video'>('video')
  const localStream = ref<MediaStream|null>(null)
  const remoteStream = ref<MediaStream|null>(null)
  let mediaConn: any = null
  let callTimeout: any = null
  // --- Camera state flags ---
  const isCameraEnabled = ref(false) // по умолчанию выключено
  const isCameraToggling = ref(false)
  let shouldAutoAcceptWithVideo = false

  async function startCall(withVideo = false, withAudio = false) {
    console.log('[usePeer] startCall: called', { withVideo, withAudio, callState: callState.value, conn: !!conn.value })
    callState.value = 'calling'
    callType.value = withVideo ? 'video' : 'audio'
    isCameraEnabled.value = !!withVideo
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    stream.getVideoTracks().forEach(t => t.enabled = !!withVideo)
    stream.getAudioTracks().forEach(t => t.enabled = !!withAudio)
    // Оставляем только live-треки
    const liveTracks = stream.getTracks().filter(t => t.readyState === 'live')
    const liveStream = new MediaStream(liveTracks)
    localStream.value = liveStream
    console.log('[usePeer] startCall: got localStream', liveStream, liveTracks.map(t => ({id: t.id, kind: t.kind, readyState: t.readyState})))
    mediaConn = peer.value!.call(conn.value!.peer, liveStream)
    console.log('[usePeer] startCall: peer.call done', mediaConn, 'peer.connections:', peer.value!.connections)
    mediaConn.on('stream', (remote: MediaStream) => {
      remoteStream.value = remote
      callState.value = 'active'
      clearTimeout(callTimeout)
      console.log('[usePeer] startCall: got remote stream', remote)
    })
    mediaConn.on('close', () => { console.log('[usePeer] startCall: mediaConn closed'); endCall() })
    mediaConn.on('error', (e: any) => { console.error('[usePeer] startCall: mediaConn error', e); endCall() })
    conn.value?.send({ type: 'call-request', video: withVideo })
    console.log('[usePeer] startCall: sent call-request')
    callTimeout = setTimeout(() => { console.warn('[usePeer] startCall: callTimeout'); endCall() }, 30000)
  }

  async function acceptCall(opts?: { cam?: boolean, mic?: boolean }) {
      callState.value = 'active'
  callType.value = opts?.cam ? 'video' : 'audio'
    console.log('[usePeer] acceptCall: called', { opts, callState: callState.value, mediaConn })
    isCameraEnabled.value = !!opts?.cam
     const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
       stream.getVideoTracks().forEach(t => t.enabled = !!opts?.cam)
       stream.getAudioTracks().forEach(t => t.enabled = !!opts?.mic)
    localStream.value = stream
    console.log('[usePeer] acceptCall: got localStream', stream)
    if (mediaConn) {
      mediaConn.answer(stream)
      console.log('[usePeer] acceptCall: answered mediaConn', mediaConn)
      mediaConn.on('stream', (remote: MediaStream) => {
        remoteStream.value = remote
        callState.value = 'active'
        clearTimeout(callTimeout)
        console.log('[usePeer] acceptCall: got remote stream', remote)
      })
      mediaConn.on('close', () => { console.log('[usePeer] acceptCall: mediaConn closed'); endCall() })
      mediaConn.on('error', (e: any) => { console.error('[usePeer] acceptCall: mediaConn error', e); endCall() })
      callState.value = 'active'
    } else {
      console.warn('[usePeer] acceptCall: mediaConn is null')
    }
  }

  function endCall(isRemoteEnd = false) {
    console.log('[usePeer] endCall', { isRemoteEnd, mediaConn, localStream: !!localStream.value, remoteStream: !!remoteStream.value, shouldAutoAcceptWithVideo })
    callState.value = 'ended'
    if (mediaConn) {
      try {
        if (mediaConn.peerConnection) {
          mediaConn.peerConnection.close();
          console.log('[usePeer] endCall: peerConnection closed');
        }
        mediaConn.close();
      } catch (e) { console.error('[usePeer] endCall: error closing mediaConn', e) }
      mediaConn = null
    }
    if (localStream.value) {
      localStream.value.getTracks().forEach(t => t.stop())
      localStream.value = null
    }
    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach(t => t.stop())
      remoteStream.value = null
    }
    clearTimeout(callTimeout)
    if (!isRemoteEnd) {
      conn.value?.send({ type: 'call-end' })
      console.log('[usePeer] endCall: sent call-end')
    }
    setTimeout(() => { callState.value = 'idle'; console.log('[usePeer] endCall: set callState idle') }, 1000)
    isCameraEnabled.value = true
    isCameraToggling.value = false
    shouldAutoAcceptWithVideo = false // сброс автопринятия
  }

  function declineCall() {
    callState.value = 'idle'
    conn.value?.send({ type: 'call-decline' })
    endCall()
  }

  function toggleMic(enabled: boolean) {
    if (!localStream.value) return
    localStream.value.getAudioTracks().forEach(t => t.enabled = enabled)
  }

  // --- Camera state flags ---
  // (удалено дублирование)

  // --- Управление камерой во время звонка ---
async function toggleCamera(enabled: boolean) {
  if (!localStream.value || isCameraToggling.value) return
  isCameraToggling.value = true
  try {
    const track = localStream.value.getVideoTracks()[0]
    if (!track) return
    // просто переключаем enabled, без перезапуска звонка
    track.enabled = enabled
    isCameraEnabled.value = enabled
    conn.value?.send({ type: enabled ? 'video-on' : 'video-off' })
  } finally {
    isCameraToggling.value = false
  }
}

  // --- Обработка сигналов звонка ---
  function handleCallSignals(data: any) {
    console.log('[usePeer] handleCallSignals', data)
    if (data.type === 'restart-call-with-video') {
      // Для надёжности сбрасываем mediaConn
      if (mediaConn) {
        try { mediaConn.close() } catch (e) { console.error('[usePeer] handleCallSignals: error closing mediaConn', e) }
        mediaConn = null
      }
      endCall(true)
      setTimeout(() => { shouldAutoAcceptWithVideo = true; console.log('[usePeer] handleCallSignals: shouldAutoAcceptWithVideo set TRUE') }, 100)
      return
    }
    if (data.type === 'call-request') {
      callState.value = 'incoming'
      callType.value = data.video ? 'video' : 'audio'
      console.log('[usePeer] handleCallSignals: call-request', { callState: callState.value, callType: callType.value })
    }
    if (data.type === 'call-decline') {
      endCall(true)
      console.log('[usePeer] handleCallSignals: call-decline')
    }
    if (data.type === 'call-end') {
      endCall(true)
      console.log('[usePeer] handleCallSignals: call-end')
    }
    if (data.type === 'video-off') {
      if (remoteStream.value) {
      remoteStream.value.getVideoTracks().forEach(t => {
        t.enabled = false
      })
      console.log('[usePeer] handleCallSignals: video-off, videoTracks disabled')
      }
    }
  if (data.type === 'video-on') {
    if (remoteStream.value) {
      // Включаем обратно все видео-дорожки
      remoteStream.value.getVideoTracks().forEach(t => {
        t.enabled = true
      })
      console.log('[usePeer] handleCallSignals: video-on, videoTracks enabled')
    } else if (mediaConn && mediaConn.peerConnection) {
      // На всякий случай, если remoteStream ещё не установился — получаем его из receivers
      const receivers = mediaConn.peerConnection.getReceivers()
      const videoTrack = receivers
        .map((r: RTCRtpReceiver) => r.track)
        .find((t: MediaStreamTrack | null) => t?.kind === 'video' && t.readyState === 'live')
      const audioTracks = receivers
        .map((r: RTCRtpReceiver) => r.track)
        .filter((t: MediaStreamTrack | null) => t?.kind === 'audio' && t.readyState === 'live')
      if (videoTrack) {
        remoteStream.value = new MediaStream([videoTrack, ...audioTracks].filter(Boolean) as MediaStreamTrack[])
        console.log('[usePeer] handleCallSignals: video-on, remoteStream reconstructed', remoteStream.value)
      } else {
        console.warn('[usePeer] handleCallSignals: video-on, no live video track found')
      }
    }
  }
  }

  // --- Управление камерой и микрофоном во время звонка с debounce ---
  const debounce = useDebounce();
  function debouncedToggleCamera(enabled: boolean) {
    debounce(() => toggleCamera(enabled), 300, 'camera');
  }
  function debouncedToggleMic(enabled: boolean) {
    debounce(() => toggleMic(enabled), 300, 'mic');
  }

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
    // --- Видеозвонки ---
    callState,
    callType,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleCamera: debouncedToggleCamera,
    toggleMic: debouncedToggleMic,
    isCameraEnabled,
    isCameraToggling,
  }
}
// В acceptCall всегда используем mediaConn, который только что пришёл в peer.on('call')
// В peer.on('call') всегда сбрасываем старый mediaConn перед присваиванием нового
// После endCall(true) всегда сбрасываем shouldAutoAcceptWithVideo = false
// В handleCallSignals на restart-call-with-video выставляем shouldAutoAcceptWithVideo с задержкой
// Везде добавлены логи для отладки

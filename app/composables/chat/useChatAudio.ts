import { type Ref, ref, watch } from "vue";

export function useChatAudio(callState: Ref<string>) {
  const callingAudio = import.meta.client
    ? new Audio("/sounds/calling.mp3")
    : null;
  if (callingAudio) {
    callingAudio.loop = true;
    callingAudio.preload = "auto";
  }

  const establishedAudio = import.meta.client
    ? new Audio("/sounds/call_established.mp3")
    : null;
  if (establishedAudio) {
    establishedAudio.preload = "auto";
  }

  const endedAudio = import.meta.client
    ? new Audio("/sounds/call_ended.mp3")
    : null;
  if (endedAudio) {
    endedAudio.preload = "auto";
  }

  let isCallingPlaying = false;

  function stopCallingLoop() {
    if (isCallingPlaying) {
      if (callingAudio) {
        callingAudio.pause();
        callingAudio.currentTime = 0;
      }
      isCallingPlaying = false;
    }
  }

  function stopAll() {
    stopCallingLoop();
    if (establishedAudio) {
      establishedAudio.pause();
      establishedAudio.currentTime = 0;
    }
    if (endedAudio) {
      endedAudio.pause();
      endedAudio.currentTime = 0;
    }
  }

  async function safePlay(audio: HTMLAudioElement | null) {
    if (!audio) return;
    try {
      await audio.play();
    } catch (e) {
      console.error(e);
    }
  }

  watch(
    () => callState.value,
    (newVal) => {
      if (newVal === "calling") {
        if (!isCallingPlaying) {
          stopAll();
          isCallingPlaying = true;
          safePlay(callingAudio);
        }
        return;
      }
      if (newVal === "incoming") {
        if (!isCallingPlaying) {
          stopAll();
          isCallingPlaying = true;
          safePlay(callingAudio);
        }
        return;
      }
      if (newVal === "active") {
        stopCallingLoop();
        if (establishedAudio) {
          establishedAudio.currentTime = 0;
        }
        safePlay(establishedAudio);
        return;
      }
      if (newVal === "ended") {
        stopCallingLoop();
        if (endedAudio) {
          endedAudio.currentTime = 0;
        }
        safePlay(endedAudio);
        return;
      }
      stopAll();
    },
    { immediate: true },
  );

  return {
    stopAll,
  };
}

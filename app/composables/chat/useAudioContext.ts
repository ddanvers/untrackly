import { onBeforeUnmount, ref } from "vue";

export function useAudioContext(isMeScreenSharing: boolean) {
  const audioContext = ref<AudioContext | null>(null);
  const gainNode = ref<GainNode | null>(null);
  const sourceNode = ref<MediaStreamAudioSourceNode | null>(null);

  const volume = ref(0.5); // Default to 50% (maps to 2x gain)
  const lastVolume = ref(0.5);

  function setupAudioContext(stream: MediaStream) {
    cleanupAudioContext();

    if (isMeScreenSharing) return; // Don't play own audio

    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      audioContext.value = new AudioContext();
      gainNode.value = audioContext.value.createGain();

      // Connect source -> gain -> destination
      if (stream.getAudioTracks().length > 0) {
        sourceNode.value = audioContext.value.createMediaStreamSource(stream);
        sourceNode.value.connect(gainNode.value);
        gainNode.value.connect(audioContext.value.destination);

        // Apply initial volume
        updateVolume();

        // Ensure context is running
        if (audioContext.value.state === "suspended") {
          audioContext.value.resume();
        }
      }
    } catch (e) {
      console.error("Error setting up Web Audio API:", e);
    }
  }

  function updateVolume() {
    if (gainNode.value) {
      // Boost volume: slider 0-1 maps to gain 0-4
      gainNode.value.gain.value = volume.value * 4;
    }
  }

  function toggleMute() {
    if (volume.value > 0) {
      lastVolume.value = volume.value;
      volume.value = 0;
    } else {
      volume.value = lastVolume.value || 0.5;
    }
    updateVolume();
  }

  function cleanupAudioContext() {
    if (sourceNode.value) {
      sourceNode.value.disconnect();
      sourceNode.value = null;
    }
    if (gainNode.value) {
      gainNode.value.disconnect();
      gainNode.value = null;
    }
    if (audioContext.value) {
      audioContext.value.close();
      audioContext.value = null;
    }
  }

  // Cleanup on unmount
  onBeforeUnmount(() => {
    cleanupAudioContext();
  });

  return {
    volume,
    setupAudioContext,
    updateVolume,
    toggleMute,
    cleanupAudioContext,
  };
}

export function useDialogVideo() {
  const video = useState<string>("video", () => "");
  const isDialogOpened = useState<boolean>("isDialogVideoOpened", () => false);
  function setVideo(src: string) {
    video.value = src;
  }
  function getVideo() {
    return video.value;
  }
  function clearVideo() {
    setVideo("");
  }
  function openDialog() {
    isDialogOpened.value = true;
  }
  function closeDialog() {
    isDialogOpened.value = false;
    clearVideo();
  }
  return {
    getVideo,
    setVideo,
    clearVideo,
    openDialog,
    closeDialog,
    isDialogOpened,
  };
}

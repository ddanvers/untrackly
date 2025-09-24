export function useDialogImages() {
  const images = useState<string[]>("images", () => []);
  const isDialogOpened = useState<boolean>("isDialogImagesOpened", () => false);
  function setImages(srcs: string[] | string) {
    images.value = Array.isArray(srcs) ? srcs : [srcs];
  }
  function getImages() {
    return images.value;
  }
  function clearImages() {
    setImages([]);
  }
  function openDialog() {
    isDialogOpened.value = true;
  }
  function closeDialog() {
    isDialogOpened.value = false;
    clearImages();
  }
  return {
    getImages,
    setImages,
    clearImages,
    openDialog,
    closeDialog,
    isDialogOpened,
  };
}

import { onMounted, onUnmounted, ref } from "vue";

export function useDocumentVisibility() {
  const visibility = ref<DocumentVisibilityState>(
    import.meta.client ? document.visibilityState : "visible",
  );

  const updateVisibility = () => {
    visibility.value = document.visibilityState;
  };

  onMounted(() => {
    document.addEventListener("visibilitychange", updateVisibility);
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", updateVisibility);
  });

  return visibility;
}

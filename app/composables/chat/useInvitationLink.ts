import { computed, type Ref } from "vue";

export function useInvitationLink(_sessionId: string, isGroup?: Ref<boolean>) {
  const inviteLink = computed(() => {
    if (!import.meta.client || !window) {
      return "Генерируем ссылку...";
    }
    const url = new URL(window.location.href);
    url.searchParams.set("invited", "true");
    if (isGroup?.value) {
      url.searchParams.set("group", "true");
    } else {
      url.searchParams.delete("group");
    }
    return url.toString();
  });

  async function copyToClipboard() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink.value);
      } else {
        // Fallback для старых браузеров
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink.value;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Copy failed:", err);
      throw err;
    }
  }

  return {
    inviteLink,
    copyToClipboard,
  };
}

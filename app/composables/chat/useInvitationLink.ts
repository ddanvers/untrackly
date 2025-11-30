import { computed } from "vue";

export function useInvitationLink(sessionId: string) {
  const inviteLink = computed(() => {
    if (!import.meta.client || !window) {
      return "Генерируем ссылку...";
    }
    const url = new URL(window.location.href);
    url.searchParams.set("invited", "true");
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

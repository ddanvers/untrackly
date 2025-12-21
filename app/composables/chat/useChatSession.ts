import {
  onBeforeUnmount,
  onMounted,
  type Ref,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useSessionDB } from "~/composables/useSessionDB";

export function useChatSession(
  sessionId: string,
  isInvited: boolean,
  messages: Ref<any[]>,
  initPeer: (opts?: { reconnect?: boolean }) => void,
  isConnectionEstablished: Ref<boolean>,
) {
  const step = shallowRef<"waiting" | "chat">("waiting");
  const consoleLogs = ref<string[]>([]);
  const consoleFinished = ref(false);
  const waitingDots = shallowRef(0);
  let waitingInterval: number | null = null;
  let loadingStopped = false;

  const sessionDB = useSessionDB(sessionId);

  function initChat() {
    initPeer();
    step.value = "waiting";

    // Note: peer.on('open') logic is handled in usePeer, but we can't easily hook into it here
    // without exposing peer from usePeer and watching it, or passing a callback.
    // For now, we'll rely on isConnectionEstablished or just log generic messages.

    const LOADING_MESSAGES = [
      `DOMAIN: ${window.location.host}`,
      `INIT: sessionId ${sessionId}, ${isInvited ? "invited" : "initiator"}`,
      "CONFIG: secure",
      !isInvited
        ? "LISTEN: waiting for incoming connections…"
        : `CONNECT: dialing peer ${sessionId}…`,
      "WHILE_LOADING: snake.exe",
      "LAUNCH: game-module",
    ];
    let idx = 0;
    loadingStopped = false;
    const tick = () => {
      if (loadingStopped) return;
      if (idx < LOADING_MESSAGES.length) {
        consoleLogs.value.push(LOADING_MESSAGES[idx++] || "");
        setTimeout(tick, 800);
      } else {
        setTimeout(() => {
          consoleFinished.value = true;
          waitingDots.value = 0;
          if (waitingInterval) clearInterval(waitingInterval);
          waitingInterval = window.setInterval(() => {
            waitingDots.value = (waitingDots.value + 1) % 4;
          }, 500);
        }, 500);
      }
    };
    tick();
  }

  async function restoreSession() {
    try {
      await sessionDB.openDB();
      const saved = await sessionDB.load();
      console.log(saved);
      if (saved && saved.step === "chat") {
        try {
          if (messages && typeof (messages as any).value !== "undefined") {
            (messages as any).value = saved.messages || [];
          }
        } catch (err) {}
        step.value = "chat";
        consoleFinished.value = true;
        loadingStopped = true;
        waitingDots.value = 0;
        consoleLogs.value.push("RESTORE: session restored from IndexedDB");

        setTimeout(() => {
          try {
            initPeer({ reconnect: true });
            const currentQuery = useRoute().query;
            if (currentQuery.chatting !== "true") {
              navigateTo({
                path: `/chat/${sessionId}`,
                query: {
                  invited: isInvited ? "true" : undefined,
                  chatting: "true",
                },
                replace: true,
              });
            }
          } catch (e) {
            // best-effort
          }
        }, 50);
      } else {
        initChat();
      }
    } catch (err) {
      // noop — best-effort
      initChat();
    }
  }

  watch(isConnectionEstablished, () => {
    if (isConnectionEstablished.value) {
      loadingStopped = true;
      if (waitingInterval) {
        clearInterval(waitingInterval);
        waitingInterval = null;
      }
      consoleLogs.value.push("STATUS: connection established");
      let countdown = 3;
      const countdownMessages = ["Initializing..."];
      let countdownIdx = 0;
      const showCountdown = () => {
        if (countdownIdx < countdownMessages.length) {
          consoleLogs.value.push(countdownMessages[countdownIdx++]);
          setTimeout(showCountdown, 800);
        } else if (countdown > 0) {
          consoleLogs.value.push(`Countdown: ${countdown} s.`);
          countdown--;
          setTimeout(showCountdown, 1000);
        } else {
          consoleLogs.value.push("Connection established!");
          step.value = "chat";
          const currentQuery = useRoute().query;
          if (currentQuery.chatting !== "true") {
            navigateTo({
              path: `/chat/${sessionId}`,
              query: {
                invited: isInvited ? "true" : undefined,
                chatting: "true",
              },
              replace: true,
            });
          }
        }
      };
      showCountdown();
      // removed ping logic that used conn.value
    }
  });
  // Persistence Logic
  watch(
    messages as any,
    () => {
      if (step.value === "chat") {
        try {
          sessionDB.save({
            step: step.value,
            messages: Array.isArray((messages as any).value)
              ? (messages as any).value
              : [],
          });
        } catch (err) {}
      }
    },
    { deep: true },
  );

  watch(step, (val) => {
    if (val === "chat") {
      window.addEventListener("beforeunload", (e: BeforeUnloadEvent) => {
        if (step.value === "chat") {
          try {
            sessionDB.save({
              step: step.value,
              messages: Array.isArray((messages as any).value)
                ? (messages as any).value
                : [],
            });
          } catch (err) {}
          e.preventDefault();
          e.returnValue = "";
        }
      });
      sessionDB
        .save({
          step: step.value,
          messages: Array.isArray((messages as any).value)
            ? (messages as any).value
            : [],
        })
        .catch(() => {});
    }
  });

  const endSession = async () => {
    try {
      await sessionDB.clearAll();
    } catch (err) {}
    navigateTo("/");
  };

  return {
    step,
    consoleLogs,
    consoleFinished,
    waitingDots,
    restoreSession,
    endSession,
  };
}

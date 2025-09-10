type ChatState = {
  step?: "invite" | "waiting" | "chat";
  messages?: any[];
  timestamp?: number;
  meta?: Record<string, any>;
};

export function useSessionDB(sessionId: string) {
  const tabIdRef = ref<string | null>(null);
  const dbRef = ref<IDBDatabase | null>(null);
  const storeName = "state";

  // лениво получаем tabId — НЕ трогаем sessionStorage на сервере
  function getTabId(): string {
    if (tabIdRef.value) return tabIdRef.value;
    if (typeof window === "undefined" || !("sessionStorage" in window)) {
      // SSR или окружение без sessionStorage — возвращаем временный id (не сохраняем)
      tabIdRef.value = `ephemeral-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
      return tabIdRef.value;
    }
    const TAB_KEY = `chat:tab:${sessionId}`;
    let t = null;
    try {
      t = sessionStorage.getItem(TAB_KEY);
      if (!t) {
        t = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem(TAB_KEY, t);
      }
    } catch (e) {
      // если доступ к sessionStorage запрещён (приватный режим и т.п.), fallback
      t = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }
    tabIdRef.value = t;
    return t;
  }

  function getDbName(): string {
    return `chat_db_${sessionId}_${getTabId()}`;
  }

  function openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        // нет indexedDB (SSR) — resolve без ошибок, операции будут no-op
        return resolve();
      }
      if (dbRef.value) return resolve();

      const dbName = getDbName();
      const req = indexedDB.open(dbName, 1);

      req.onupgradeneeded = (ev: any) => {
        const db = ev.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      };

      req.onsuccess = () => {
        dbRef.value = req.result;
        resolve();
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  }

  // добавь выше функции save
  function safeSerialize(value: any, visited = new WeakSet()): any {
    // примитивы и Date
    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean") return value;
    if (value instanceof Date) return value.toISOString();

    // Файлы/Blob/потоки — проверяем ДО добавления в visited
    if (typeof File !== "undefined" && value instanceof File) {
      return {
        __file: {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: value.lastModified,
        },
      };
    }
    if (typeof Blob !== "undefined" && value instanceof Blob) {
      return { __blob: { size: value.size, type: value.type } };
    }
    if (typeof MediaStream !== "undefined" && value instanceof MediaStream) {
      return { __type: "MediaStream" };
    }
    if (
      typeof RTCPeerConnection !== "undefined" &&
      value instanceof RTCPeerConnection
    ) {
      return { __type: "RTCPeerConnection" };
    }
    // DOM node — не сериализуем
    if (
      typeof window !== "undefined" &&
      value &&
      typeof (value as any).nodeType === "number"
    )
      return undefined;

    // Защита от циклов: добавим в visited только если объект
    let added = false;
    if (t === "object") {
      if (visited.has(value)) return "[Circular]";
      visited.add(value);
      added = true;
    }

    try {
      // Array
      if (Array.isArray(value)) {
        return value.map((v) => safeSerialize(v, visited));
      }

      // Map -> объект с ключами как строки
      if (value instanceof Map) {
        const out: Record<string, any> = {};
        for (const [k, v] of value.entries()) {
          out[String(k)] = safeSerialize(v, visited);
        }
        return out;
      }

      // Set -> массив
      if (value instanceof Set) {
        return Array.from(value).map((v) => safeSerialize(v, visited));
      }

      if (value instanceof ArrayBuffer) {
        return {
          __type: "ArrayBuffer",
          data: Array.from(new Uint8Array(value)),
        };
      }
      if (ArrayBuffer.isView(value)) {
        return {
          __type: value.constructor?.name ?? "TypedArray",
          data: Array.from(value as any),
        };
      }

      // Plain object / class instance — рекурсивно сериализуем собственные перечислимые поля
      if (t === "object") {
        const out: Record<string, any> = {};
        const skip = new Set([
          "peer",
          "conn",
          "localStream",
          "remoteStream",
          "pc",
          "_pc",
          "_connection",
          "iceCandidates",
        ]);
        for (const key of Object.keys(value)) {
          if (skip.has(key)) continue;
          const v = (value as any)[key];
          if (typeof v === "function") continue;
          try {
            const serialized = safeSerialize(v, visited);
            if (typeof serialized !== "undefined") out[key] = serialized;
          } catch {
            // best-effort: пропускаем поле если что-то пошло не так
          }
        }
        return out;
      }

      // fallback: строковое представление
      try {
        return String(value);
      } catch {
        return undefined;
      }
    } finally {
      if (added) visited.delete(value);
    }
  }

  function safeDeserialize(value: any): any {
    if (value === null || value === undefined) return value;

    if (
      value &&
      typeof value === "object" &&
      value.__type &&
      Array.isArray(value.data)
    ) {
      if (value.__type === "ArrayBuffer") {
        return new Uint8Array(value.data).buffer;
      }
      const TypedArrayConstructor = (globalThis as any)[value.__type];
      if (TypedArrayConstructor) {
        return new TypedArrayConstructor(value.data);
      }
    }

    if (Array.isArray(value)) {
      return value.map(safeDeserialize);
    }

    if (value && typeof value === "object") {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = safeDeserialize(v);
      }
      return result;
    }

    return value;
  }
  // заменяй текущую функцию save на этот код
  function save(state: ChatState): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        // SSR — ничего не делаем
        return resolve();
      }
      try {
        async () => await openDB();
        if (!dbRef.value) return resolve();

        // безопасно сериализуем входные данные (удаляем non-clonable)
        // Фильтруем и модифицируем сообщения: сохраняем только текстовые
        let filteredMessages: any[] = [];
        if (Array.isArray(state.messages)) {
          filteredMessages = state.messages
            .filter((msg) => {
              // Если нет текста и есть файлы — не сохраняем
              if (
                (!msg.text || msg.text.trim() === "") &&
                Array.isArray(msg.files) &&
                msg.files.length > 0
              ) {
                return false;
              }
              return true;
            })
            .map((msg) => {
              // Если есть файлы, но есть текст — сохраняем, но files = []
              if (Array.isArray(msg.files) && msg.files.length > 0) {
                return { ...msg, files: [] };
              }
              return msg;
            });
        }
        const safeState: ChatState = {
          ...state,
          messages:
            filteredMessages.length > 0
              ? safeSerialize(filteredMessages)
              : undefined,
          meta:
            typeof state.meta !== "undefined"
              ? safeSerialize(state.meta)
              : undefined,
        };

        const tx = dbRef.value.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const payload = { id: "session", ...safeState, timestamp: Date.now() };

        const req = store.put(payload);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  function load(): Promise<ChatState | null> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        return resolve(null);
      }
      try {
        (async () => await openDB())();
        if (!dbRef.value) return resolve(null);
        const tx = dbRef.value.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get("session");
        req.onsuccess = () => {
          if (req.result) {
            const { id, ...rest } = req.result;
            // Десериализуем данные
            const state: ChatState = {
              ...rest,
              messages: rest.messages
                ? safeDeserialize(rest.messages)
                : undefined,
              meta: rest.meta ? safeDeserialize(rest.meta) : undefined,
            };
            resolve(state);
          } else resolve(null);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  function clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        return resolve();
      }
      try {
        // Закроем DB, если открыт
        if (dbRef.value) {
          try {
            dbRef.value.close();
          } catch (e) {}
          dbRef.value = null;
        }
        const dbName = getDbName();
        const delReq = indexedDB.deleteDatabase(dbName);
        delReq.onsuccess = () => {
          // Пытаемся удалить ключ из sessionStorage (если есть)
          try {
            const TAB_KEY = `chat:tab:${sessionId}`;
            sessionStorage.removeItem(TAB_KEY);
          } catch (e) {}
          resolve();
        };
        delReq.onerror = () => reject(delReq.error);
        delReq.onblocked = () => resolve(); // best-effort
      } catch (err) {
        reject(err);
      }
    });
  }
  async function clearAll() {
    return async () => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        return;
      }

      try {
        // Закроем нашу открытую DB, если есть
        if (dbRef.value) {
          try {
            dbRef.value.close();
          } catch (e) {}
          dbRef.value = null;
        }

        const deletions: Promise<void>[] = [];

        // Если доступна современная API — получаем список всех баз и удаляем их
        if (typeof (indexedDB as any).databases === "function") {
          try {
            const dbs: Array<{ name?: string; version?: number }> = await (
              indexedDB as any
            ).databases();
            for (const info of dbs) {
              if (!info || !info.name) continue;
              deletions.push(
                new Promise<void>((res) => {
                  const req = indexedDB.deleteDatabase(info.name!);
                  req.onsuccess = () => res();
                  req.onerror = () => res(); // best-effort — не блокируем весь процесс из-за одной ошибки
                  req.onblocked = () => res();
                }),
              );
            }
          } catch (e) {
            // Если вызов databases() упал — продолжим fallback
          }
        } else {
          // Fallback: попробуем удалить базы, названные по нашему паттерну,
          // используя данные из sessionStorage (best-effort).
          try {
            if (typeof sessionStorage !== "undefined") {
              for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (!key) continue;
                if (key.startsWith("chat:tab:")) {
                  const tabId = sessionStorage.getItem(key);
                  if (!tabId) continue;
                  const sessionId = key.slice("chat:tab:".length);
                  const dbName = `chat_db_${sessionId}_${tabId}`;
                  deletions.push(
                    new Promise<void>((res) => {
                      const req = indexedDB.deleteDatabase(dbName);
                      req.onsuccess = () => res();
                      req.onerror = () => res();
                      req.onblocked = () => res();
                    }),
                  );
                }
              }
            }
          } catch (e) {
            // sessionStorage может быть недоступен — ничего не делаем
          }
        }

        // Выполним все удаляющие операции (best-effort)
        await Promise.allSettled(deletions);

        // Удалим все наши sessionStorage ключи chat:tab:*
        try {
          if (typeof sessionStorage !== "undefined") {
            const keysToRemove: string[] = [];
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (key?.startsWith("chat:tab:")) keysToRemove.push(key);
            }
            for (const k of keysToRemove) {
              try {
                sessionStorage.removeItem(k);
              } catch {
                /* ignore */
              }
            }
          }
        } catch (e) {
          // ничего
        }
      } catch (err) {
        // Best-effort: если что-то пошло не так, всё равно возвращаем resolve
        // но логируем ошибку через reject для отладки (можно поменять на resolve если не хотим бросать)
        // Здесь возвращаем resolve чтобы не ломать UX; caller всё равно может поймать ошибки.
        try {
          // eslint-disable-next-line no-console
          console.warn("clearAll encountered an error:", err);
        } catch {}
      }
    };
  }
  return {
    openDB,
    save,
    load,
    clear,
    clearAll,
    // для дебага
    _getDbName: getDbName,
  };
}

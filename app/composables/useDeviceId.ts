export function useDeviceId() {
  const id = useCookie("untrackly_device_id", {
    expires: new Date(Date.now() + 86400000 * 365),
    maxAge: 365 * 24 * 60 * 60,
  });
  if (!id.value) {
    if (import.meta.client && window.crypto?.randomUUID) {
      id.value = window.crypto.randomUUID();
    } else {
      id.value = `dev-${Math.random().toString(36).substring(2, 15)}`;
    }
  }
  return id.value;
}

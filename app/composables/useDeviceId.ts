export function useDeviceId() {
  const id = useCookie("untrackly_device_id", {
    expires: new Date(Date.now() + 86400000 * 365),
    maxAge: 365 * 24 * 60 * 60,
  });
  if (!id.value) id.value = crypto.randomUUID();
  return id.value;
}

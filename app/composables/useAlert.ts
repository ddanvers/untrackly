import { useState } from "#app";

export type AlertType = "info" | "success" | "warning" | "error";

export interface Alert {
  id: string;
  message: string;
  type: AlertType;
  duration?: number;
}

export function useAlert() {
  const alerts = useState<Alert[]>("global-alerts", () => []);

  function showAlert(
    message: string,
    type: AlertType = "info",
    duration = 5000,
  ) {
    const id = Math.random().toString(36).slice(2, 9);
    const alert: Alert = { id, message, type, duration };

    alerts.value.push(alert);

    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, duration);
    }

    return id;
  }

  function removeAlert(id: string) {
    alerts.value = alerts.value.filter((a) => a.id !== id);
  }

  return {
    alerts,
    showAlert,
    removeAlert,
    showError: (msg: string, dur?: number) => showAlert(msg, "error", dur),
    showSuccess: (msg: string, dur?: number) => showAlert(msg, "success", dur),
    showInfo: (msg: string, dur?: number) => showAlert(msg, "info", dur),
    showWarning: (msg: string, dur?: number) => showAlert(msg, "warning", dur),
  };
}

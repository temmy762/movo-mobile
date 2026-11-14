import { request } from "../client";

export type AppName = "chauffeur" | "customer";

/* Alert sounds picked on the Notifications screen (movo-web lib/pushSounds.ts) */
export type AlertSounds = { updates?: string; requests?: string };

export const registerDevice = (token: string, platform: "ios" | "android", app: AppName, sounds?: AlertSounds) =>
  request<{ ok: true }>("/api/push/device", { body: { token, platform, app, sounds } });

/* One test alert to this phone, through the same path as real alerts */
export const sendTest = (token: string, kind: "updates" | "requests" = "updates") =>
  request<{ ok: true }>("/api/push/test", { body: { token, kind } });

export const unregisterDevice = (token: string) =>
  request<{ ok: true }>("/api/push/device", { method: "DELETE", body: { token } });

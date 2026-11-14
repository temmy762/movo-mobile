import { request } from "../client";

export type AppName = "chauffeur" | "customer";

/* Alert sounds picked on the Notifications screen (movo-web lib/pushSounds.ts) */
export type AlertSounds = { updates?: string; requests?: string };

export const registerDevice = (token: string, platform: "ios" | "android", app: AppName, sounds?: AlertSounds) =>
  request<{ ok: true }>("/api/push/device", { body: { token, platform, app, sounds } });

export const unregisterDevice = (token: string) =>
  request<{ ok: true }>("/api/push/device", { method: "DELETE", body: { token } });

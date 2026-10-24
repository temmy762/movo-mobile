import { request } from "../client";

export type AppName = "chauffeur" | "customer";

export const registerDevice = (token: string, platform: "ios" | "android", app: AppName) =>
  request<{ ok: true }>("/api/push/device", { body: { token, platform, app } });

export const unregisterDevice = (token: string) =>
  request<{ ok: true }>("/api/push/device", { method: "DELETE", body: { token } });

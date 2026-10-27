import type { AppConfig } from "@movo/shared";
import { request } from "../client";

export const appConfig = () => request<AppConfig>("/api/app/config");

/* Public pricing — the chauffeur app only needs the waiting rules */
export const pricing = () =>
  request<{ global: { freeWaitingMinutes: number; waitingRatePerMin: number } | null }>("/api/admin/pricing");

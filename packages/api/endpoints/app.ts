import type { AppConfig } from "@movo/shared";
import { request } from "../client";

export const appConfig = () => request<AppConfig>("/api/app/config");

type WaitingRules = { freeWaitingMinutes: number; waitingRatePerMin: number };

/* Public pricing — the chauffeur app only needs the waiting rules
   (standard rides: global; Safe Ride has its own) */
export const pricing = () =>
  request<{ global: WaitingRules | null; safeRideWaiting?: WaitingRules | null }>("/api/admin/pricing");

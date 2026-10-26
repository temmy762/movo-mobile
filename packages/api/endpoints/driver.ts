import type { OnboardingStatus } from "@movo/shared";
import { request } from "../client";

export const onboardingStatus = () => request<OnboardingStatus>("/api/driver/onboarding/status");

/* Refused (409) during an active ride or while earnings/payouts are pending */
export const deleteAccount = () =>
  request<{ ok: true }>("/api/driver/profile", { method: "DELETE", body: { confirm: "DELETE" } });

import type { OnboardingConsents, OnboardingDocType, OnboardingFields, OnboardingRecord } from "@movo/shared";
import { request } from "../client";

export const get = () => request<{ exists: boolean; onboarding?: OnboardingRecord }>("/api/driver/onboarding");

/* Saves progress (creates the record on first save). `submit: true` sends the
   application for review — Movo emails the chauffeur a confirmation. */
export const save = (body: Partial<OnboardingFields> & Partial<OnboardingConsents> & {
  type?: "INDIVIDUAL"; currentStep?: number; completedSteps?: number[]; vehicleOption?: "OWN" | "RENT"; submit?: boolean;
}) => request<{ success: true }>("/api/driver/onboarding", { method: "PATCH", body });

/* Photo (JPG / PNG / WebP / HEIC) or PDF, max 10 MB */
export const uploadDocument = (type: OnboardingDocType, file: { uri: string; name: string; type: string }) => {
  const form = new FormData();
  /* React Native's FormData takes a { uri, name, type } file descriptor */
  form.append("file", file as unknown as Blob);
  form.append("type", type);
  return request<{ success: true; document: { id: string; fileName: string } }>(
    "/api/driver/onboarding/document/upload", { method: "POST", body: form },
  );
};

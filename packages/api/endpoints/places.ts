import type { PlaceSuggestion } from "@movo/shared";
import { request } from "../client";

/* `session`: one token per typing session (Google bills the session as one) */
export const autocomplete = (input: string, session: string, signal?: AbortSignal) =>
  request<{ suggestions: PlaceSuggestion[] }>(
    `/api/places/autocomplete?input=${encodeURIComponent(input)}&session=${encodeURIComponent(session)}`, { signal },
  );

/* "Use current location": the street address at a point (404 = none found) */
export const reverse = (lat: number, lng: number) =>
  request<{ address: string; lat: number; lng: number }>(`/api/places/reverse?lat=${lat}&lng=${lng}`);

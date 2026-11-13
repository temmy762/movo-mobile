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

/* Driving route for a map's route line. 502 = no route (draw a straight line instead). */
export const route = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
  request<{ points: [number, number][]; distanceMeters: number; durationSec: number }>(
    `/api/places/route?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`,
  );

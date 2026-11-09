import type { CareAssignmentStatus, CareDriverResponse } from "@movo/shared";
import { request } from "../client";

/* This chauffeur's live Safe Ride assignment (PENDING offer included), the
   other chauffeur on it, and this chauffeur's payout */
export const current = () => request<CareDriverResponse>("/api/care/driver");

/* PENDING → ACCEPTED | CANCELLED (decline), ACCEPTED → ARRIVED → STARTED,
   STARTED → AWAITING_RETURN (PRIMARY) | COMPLETED (SUPPORT).
   409 = another chauffeur accepted first; 422 = expired / not allowed yet. */
export const updateAssignment = (id: string, status: CareAssignmentStatus) =>
  request<unknown>(`/api/care/assignments/${id}`, { method: "PATCH", body: { status } });

/* Reserved Safe Ride: PRIMARY sets off — the customer is told they're on the way */
export const enRoute = (id: string) =>
  request<{ ok: true; enRouteAt: string | null }>(`/api/care/assignments/${id}/en-route`, { method: "PATCH" });

/* ── Safe Ride photo walk-around (PRIMARY): PICKUP before Start, DROPOFF before drop-off ── */

export type InspectionStage = "PICKUP" | "DROPOFF";
export type InspectionState = {
  stage: InspectionStage; required: string[]; taken: string[];
  damageNotes: string; customerConfirmedAt: string | null; completedAt: string | null;
};

export const inspection = (bookingId: string, stage: InspectionStage) =>
  request<InspectionState>(`/api/care/inspection?bookingId=${encodeURIComponent(bookingId)}&stage=${stage}`);

/* One photo (replaces any earlier one for the same slot) */
export const uploadInspectionPhoto = (
  bookingId: string, stage: InspectionStage, slot: string, file: { uri: string; name: string; type: string },
) => {
  const form = new FormData();
  form.append("bookingId", bookingId);
  form.append("stage", stage);
  form.append("slot", slot);
  /* React Native's FormData takes a { uri, name, type } file descriptor */
  form.append("file", file as unknown as Blob);
  return request<InspectionState>("/api/care/inspection", { method: "POST", body: form });
};

export const completeInspection = (bookingId: string, stage: InspectionStage, damageNotes: string, customerConfirmed: boolean) =>
  request<InspectionState>("/api/care/inspection", { method: "POST", body: { bookingId, stage, damageNotes, customerConfirmed, complete: true } });

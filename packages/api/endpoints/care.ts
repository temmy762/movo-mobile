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

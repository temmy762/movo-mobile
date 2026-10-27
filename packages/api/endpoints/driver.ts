import type { BookingMessage, DriverBooking, DriverStats, LocationPoint, OnboardingStatus, ReservedRide } from "@movo/shared";
import { request } from "../client";

export const onboardingStatus = () => request<OnboardingStatus>("/api/driver/onboarding/status");

/* Refused (409) during an active ride or while earnings/payouts are pending */
export const deleteAccount = () =>
  request<{ ok: true }>("/api/driver/profile", { method: "DELETE", body: { confirm: "DELETE" } });

/* Going online is refused (403) unless the account is ACTIVE */
export const setOnline = (isOnline: boolean) =>
  request<{ ok: true }>("/api/driver/status", { method: "PATCH", body: { isOnline } });

/* A ping marks the chauffeur online, so only send while they are online.
   Batches are fine — the server keeps the newest point. */
export const sendLocation = (points: LocationPoint[]) =>
  request<{ ok: true }>("/api/driver/location", { body: { points } });

export const stats = () => request<DriverStats>("/api/driver/stats");

export const activeBooking = () => request<{ booking: DriverBooking | null }>("/api/driver/active-booking");

/* Open pool: paid, unclaimed, tier-matched, never Care. Empty when not ACTIVE. */
export const pendingBookings = () => request<DriverBooking[]>("/api/bookings?status=PENDING");

/* 409 = another chauffeur took it first */
export const acceptBooking = (id: string) =>
  request<unknown>(`/api/bookings/${id}/status`, { method: "PATCH", body: { status: "CONFIRMED" } });

/* Releases a ride pre-assigned to this chauffeur back to the pool */
export const declineBooking = (id: string) =>
  request<{ ok: true; released: boolean }>(`/api/bookings/${id}/decline`, { method: "PATCH" });

/* ── Trip controls (standard rides) ── */

export type ArrivedResponse = { ok: true; arrivedAt: string; freeWaitingMinutes: number; waitingRatePerMin: number };

/* Idempotent: the first arrival time is the waiting-charge anchor. 409 once started. */
export const arrived = (id: string) => request<ArrivedResponse>(`/api/bookings/${id}/arrived`, { method: "PATCH" });

/* 409 = already started (e.g. a double tap) */
export const startTrip = (id: string) =>
  request<{ ok: true; startedAt: string }>(`/api/bookings/${id}/start`, { method: "PATCH" });

/* 409 "already completed" on a retry after a dropped response */
export const completeTrip = (id: string) =>
  request<unknown>(`/api/bookings/${id}/status`, { method: "PATCH", body: { status: "COMPLETED" } });

/* Before the trip starts only. Releases the ride to another chauffeur —
   the rider is not told it was cancelled, and is not refunded. */
export const driverCancel = (id: string, reason?: string) =>
  request<{ ok: true }>(`/api/bookings/${id}/driver-cancel`, { method: "PATCH", body: { reason: reason || undefined } });

/* Feedback is required for 3 stars or lower */
export const rateRider = (id: string, rating: number, feedback: string | null) =>
  request<unknown>(`/api/bookings/${id}/rating`, { body: { rating, feedback } });

/* On a trip: persisted and relayed live to the rider's map. 409 once the ride ended. */
export const tripLocation = (id: string, p: { lat: number; lng: number; heading?: number; speed?: number }) =>
  request<{ ok: true }>(`/api/bookings/${id}/driver-location`, { body: p });

/* ── Chat with the rider (standard chauffeur / Safe Ride PRIMARY only) ── */

export const messages = (bookingId: string) => request<BookingMessage[]>(`/api/bookings/${bookingId}/messages`);

export const sendMessage = (bookingId: string, text: string) =>
  request<unknown>(`/api/bookings/${bookingId}/messages`, { body: { text } });

/* ── Reservations ── */

export const reserved = () => request<ReservedRide[]>("/api/driver/reserved");

/* "I'm heading to pickup": activates the reservation (it becomes the active
   ride) and only now tells the rider their chauffeur is on the way */
export const enRoute = (id: string) =>
  request<{ ok: true; enRouteAt: string }>(`/api/bookings/${id}/en-route`, { method: "PATCH" });

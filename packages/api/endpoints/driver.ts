import type { DriverBooking, DriverStats, LocationPoint, OnboardingStatus } from "@movo/shared";
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

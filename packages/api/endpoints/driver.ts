import type {
  BankingDetails, BookingMessage, DriverBooking, DriverRatings, DriverRide, DriverStats, DriverVehicle, IncidentType,
  LocationPoint, OnboardingStatus, ReservedRide, StripeConnectStatus, Wallet,
} from "@movo/shared";
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

/* ── History + wallet ── */

export const pastRides = () => request<DriverRide[]>("/api/driver/rides?tab=past");

export const wallet = () => request<Wallet>("/api/driver/wallet");

/* With an active Stripe Connect account the transfer is sent now (automated:
   true); otherwise Movo processes the request manually */
export const requestPayout = (amount: number) =>
  request<{ automated?: boolean }>("/api/driver/wallet/payout", { body: { amount } });

/* ── Banking ── */

export const stripeConnectStatus = () => request<StripeConnectStatus>("/api/driver/stripe-connect");

/* Stripe-hosted onboarding link. Mobile requests return through movo-web
   /app-return to movochauffeur://banking?connect=success|refresh */
export const startStripeConnect = () => request<{ url: string }>("/api/driver/stripe-connect", { method: "POST" });

export const bankingDetails = () => request<{ banking: BankingDetails | null }>("/api/driver/profile/banking");

/* Only the fields sent are changed */
export const updateBankingDetails = (fields: Partial<Record<keyof BankingDetails, string>>) =>
  request<{ success: true }>("/api/driver/profile/banking", { method: "PATCH", body: fields });

/* ── Profile ── */

export const ratings = () => request<DriverRatings>("/api/driver/ratings");

export const vehicle = () => request<{ vehicle: DriverVehicle | null }>("/api/driver/vehicle");

export const profilePhoto = () => request<{ photoUrl: string | null }>("/api/driver/profile/photo");

/* JPG / PNG / WebP, max 2 MB */
export const uploadProfilePhoto = (file: { uri: string; name: string; type: string }) => {
  const form = new FormData();
  /* React Native's FormData takes a { uri, name, type } file descriptor */
  form.append("photo", file as unknown as Blob);
  return request<{ photoUrl: string }>("/api/driver/profile/photo", { method: "POST", body: form });
};

/* Description: at least 10 characters. bookingId must be one of this chauffeur's rides. */
export const reportIncident = (body: { bookingId?: string; type: IncidentType; description: string }) =>
  request<unknown>("/api/incidents", { body });

export const reportFoundItem = (body: { bookingId?: string; itemDescription: string; contactInfo?: string }) =>
  request<unknown>("/api/lost-found", { body });

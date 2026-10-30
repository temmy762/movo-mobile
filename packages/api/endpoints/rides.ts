/* A rider's own ride: tracking, cancel, chat, rating */
import type { BookingMessage, DriverPosition, IncidentType, Receipt, RideDetail } from "@movo/shared";
import { request } from "../client";

export const detail = (id: string) => request<RideDetail>(`/api/bookings/${id}`);

/* Last known chauffeur position (live updates arrive on the socket) */
export const driverLocation = (id: string) =>
  request<{ position: DriverPosition | null }>(`/api/bookings/${id}/driver-location`);

/* Refund follows the cancellation policy: full before a chauffeur is assigned
   or within 5 minutes of booking, otherwise 50% (Safe Ride: return allowance
   in full + 50% of the service portion). 409 once the trip has started. */
export const cancel = (id: string) =>
  request<{ refunded?: boolean; refundAmount?: number; refundError?: string }>(
    `/api/bookings/${id}/status`, { method: "PATCH", body: { status: "CANCELLED", cancelledBy: "user" } },
  );

export const messages = (id: string) => request<BookingMessage[]>(`/api/bookings/${id}/messages`);

export const sendMessage = (id: string, text: string) =>
  request<unknown>(`/api/bookings/${id}/messages`, { body: { text } });

/* Feedback is required for 3 stars or lower */
export const rate = (id: string, rating: number, review: string | null) =>
  request<unknown>(`/api/bookings/${id}/rating`, { body: { rating, review } });

/* ── Route changes during a ride (until it's completed or cancelled) ──
   Price first (nothing is charged), then confirm: only increases are charged
   to the rider's saved card. If the bank asks for 3D Secure the response is
   { requiresAction, clientSecret, intentId } — confirm it, then call again
   with confirmedIntentId to apply exactly what was charged. */

export type RouteQuote = { charge: number; newTotal: number; routed?: boolean };
export type RouteChange =
  | { ok: true; charged: number; booking?: { dropoff?: string; stops?: unknown } }
  | { requiresAction: true; clientSecret: string; intentId: string; charge: number };

export const priceDestination = (id: string, dropoff: string) =>
  request<RouteQuote>(`/api/bookings/${id}/destination`, { body: { dropoff, quoteOnly: true } });

export const changeDestination = (id: string, body: { dropoff: string } | { confirmedIntentId: string }) =>
  request<RouteChange>(`/api/bookings/${id}/destination`, { body });

/* Up to 3 stops */
export const priceStop = (id: string, stopAddress: string) =>
  request<RouteQuote>(`/api/bookings/${id}/add-stop`, { body: { stopAddress, quoteOnly: true } });

export const addStop = (id: string, body: { stopAddress: string } | { confirmedIntentId: string }) =>
  request<RouteChange>(`/api/bookings/${id}/add-stop`, { body });

/* Same stops in a new travel order — no price change */
export const reorderStops = (id: string, stops: string[]) =>
  request<{ ok: true; stops: string[] }>(`/api/bookings/${id}/stops`, { method: "PATCH", body: { stops } });

/* ── After the ride ── */

/* 404 = the ride wasn't paid (no receipt) */
export const receipt = (id: string) => request<Receipt>(`/api/bookings/${id}/receipt`);

/* Emails it to the account's email (at most once a minute per ride — 429) */
export const emailReceipt = (id: string) =>
  request<{ ok: true; sentTo: string }>(`/api/bookings/${id}/receipt`, { method: "POST" });

/* Description: at least 10 characters */
export const reportIncident = (body: { bookingId: string; type: IncidentType; description: string }) =>
  request<unknown>("/api/incidents", { body });

export const reportLostItem = (body: { bookingId: string; itemDescription: string; contactInfo?: string }) =>
  request<unknown>("/api/lost-found", { body });

/* A rider's own ride: tracking, cancel, chat, rating */
import type { BookingMessage, DriverPosition, RideDetail } from "@movo/shared";
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

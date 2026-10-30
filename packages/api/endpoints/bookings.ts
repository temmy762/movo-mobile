import type { FareEstimate } from "@movo/shared";
import { request } from "../client";

/* City Ride price for one tier. pickupTime (ISO) matters for fixed fares. */
export const estimate = (p: { pickup: string; dropoff: string; tier: string; stops?: string[]; pickupTime?: string | null }) => {
  const q = new URLSearchParams({ pickup: p.pickup, dropoff: p.dropoff, tier: p.tier });
  for (const s of p.stops ?? []) q.append("stop", s);
  if (p.pickupTime) q.set("pickupTime", p.pickupTime);
  return request<FareEstimate>(`/api/bookings/estimate?${q.toString()}`);
};

/* A Stripe PaymentIntent for exactly the quoted total (card saved to the rider for later charges) */
export const createPaymentIntent = (quote: string) =>
  request<{ clientSecret: string; id: string }>("/api/stripe/create-payment-intent", { body: { quote } });

/* After payment: the booking, created from the signed quote + the paid intent.
   Retrying with the same intent returns the existing booking, never charges again. */
export const createCityRide = (body: {
  quote: string; stripePaymentIntentId: string; carTier: string; carName: string;
  pickup: string; dropoff: string; scheduledAt?: string | null; stops?: string[];
  riderName?: string; riderPhone?: string; passengers?: number;
}) => request<{ id: string; bookingNumber?: string | null }>("/api/bookings", { body });

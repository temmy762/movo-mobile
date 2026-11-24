/**
 * Movo Courier — same-day packages between Winnipeg and nearby towns.
 * Customer: towns + prices, a signed quote, booking. Driver: the Courier
 * switch, offers with payout, and each delivery's steps (movo-web lib/courier).
 */
import { request } from "../client";

export type CourierMode = "ONE_WAY" | "SCHEDULED";
export type CourierDirection = "TO_TOWN" | "TO_WINNIPEG";
export type PackageSize = "SMALL" | "MEDIUM" | "LARGE";
export type Party = { name: string; phone: string };

export type CourierRoute = {
  id: string; town: string; oneWayPrice: number; scheduledPrice: number;
  runDays: number[]; runDaysLabel: string; openRunDates: string[];
};
export type CourierLimits = {
  maxPackageValue: number; maxWeightKg: number; maxExtraStops: number;
  scheduledCutoffHour: number; scheduledMinPackages: number;
  freeWaitingMinutes: number; waitingRatePerMin: number;
};

export type CourierOrder = {
  routeId: string; direction: CourierDirection; mode: CourierMode; runDate: string | null;
  /* One Way: Winnipeg date + time (both null = as soon as possible). Scheduled: the pickup window. */
  pickupDate: string | null; pickupTime: string | null; pickupWindow: "MORNING" | "AFTERNOON" | null;
  winnipegAddress: string; townAddress: string; extraStops: string[];
  package: { description: string; size: PackageSize; value: number; weightKg: number | null };
  orderedBy: "SENDER" | "RECEIVER"; payMethod: "APP" | "DOOR";
  sender: Party; receiver: Party; leaveAtDoor: boolean; instructions: string | null;
};

export type CourierEstimate = { quote: string; total: number; routePrice: number; extraStopsTotal: number; gst: number };

export const routes = () => request<{ routes: CourierRoute[]; limits: CourierLimits }>("/api/courier/routes");
export const estimate = (order: CourierOrder) => request<CourierEstimate>("/api/courier/estimate", { body: order });
/* Pay in app: with the paid PaymentIntent. Pay at the door: quote only. */
export const book = (quote: string, stripePaymentIntentId?: string) =>
  request<{ id: string; bookingNumber: string | null; scheduledAt: string | null }>("/api/courier/bookings", {
    body: { quote, ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}) },
  });

/* ── Driver ── */

export type CourierOffer = {
  id: string; bookingNumber: string | null; pickup: string; dropoff: string; stops: string[];
  scheduledAt: string | null; town: string; direction: CourierDirection; mode: CourierMode; pickupWindow: string | null;
  package: { description: string; size: PackageSize; value: number; weightKg: number | null };
  payMethod: "APP" | "DOOR" | null; payout: number | null;
};
export type CourierJob = CourierOffer & {
  status: string; paymentStatus: string; total: number; sender: Party; receiver: Party;
  leaveAtDoor: boolean; instructions: string | null;
  enRouteAt: string | null; arrivedAt: string | null; pickedUpAt: string | null; completedAt: string | null;
  outcome: "DELIVERED" | "LEFT_AT_DOOR" | "RETURNED_TO_SENDER" | null; doorPayUrl: string | null;
  /* The customer's rating + tip for the driver, and the driver's rating of the customer */
  rating: number | null; review: string | null; tip: number | null; customerRating: number | null;
};
export type CourierDriverState = {
  courierEnabled: boolean; scheduledBlocked: boolean; lateCancels: number;
  courierAccess: "NONE" | "REQUESTED" | "APPROVED" | "DECLINED"; courierOnly: boolean;
  offers: CourierOffer[]; jobs: CourierJob[]; recent: CourierJob[];
};
export type CourierOutcome = NonNullable<CourierJob["outcome"]>;

export const driverState = () => request<CourierDriverState>("/api/courier/driver");
export const setEnabled = (courierEnabled: boolean) => request<CourierDriverState>("/api/courier/driver", { body: { courierEnabled } });
/* Not approved yet: ask the Movo team for Courier access */
export const requestAccess = () => request<CourierDriverState>("/api/courier/driver", { body: { request: true } });
export const act = (id: string, action: "accept" | "en_route" | "arrived" | "door_link" | "check_payment" | "cancel") =>
  request<Record<string, unknown>>(`/api/courier/driver/${id}`, { body: { action } });

/* Pickup / drop-off with the proof photo ({ uri, name, type } in React Native) */
export const withPhoto = (id: string, action: "pickup" | "deliver", file: { uri: string; name: string; type: string }, outcome?: CourierOutcome) => {
  const form = new FormData();
  form.append("action", action);
  if (outcome) form.append("outcome", outcome);
  form.append("file", file as unknown as Blob);
  return request<CourierJob>(`/api/courier/driver/${id}`, { method: "POST", body: form });
};

/* Driver rates the customer (feedback required for 3 stars or less) */
export const rateCustomer = (id: string, rating: number, review: string | null) =>
  request<unknown>(`/api/bookings/${id}/rating`, { body: { rating, review } });

export const photoUrl = (bookingId: string, stage: "pickup" | "dropoff") => `/api/courier/${bookingId}/photo?stage=${stage}`;

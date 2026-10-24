/* AUTO-SYNCED from movo-web/lib/socket/events.ts by scripts/sync-shared.mjs — do not edit here. */

/* Typed event names — single source of truth for the whole platform */

export const SOCKET_EVENTS = {
  /* ── Booking lifecycle ── */
  BOOKING_CREATED:   "booking.created",
  BOOKING_ACCEPTED:  "booking.accepted",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_COMPLETED: "booking.completed",
  BOOKING_STATUS:    "booking.status",
  /* Pre-assigned driver never responded — booking released to the open pool */
  DRIVER_RELEASED:   "booking.driver.released",

  /* ── Trip ── */
  TRIP_STARTED:   "trip.started",
  DRIVER_ARRIVED:  "driver.arrived",

  /* ── Driver ── */
  DRIVER_ONLINE:    "driver.online",
  DRIVER_OFFLINE:   "driver.offline",
  DRIVER_LOCATION:  "driver.location",
  /* Rider's live position → assigned chauffeur (pickup phase) */
  RIDER_LOCATION:   "rider.location",
  DRIVER_APPROVED:  "driver.approved",
  DRIVER_SUSPENDED: "driver.suspended",

  /* ── Messaging ── */
  MESSAGE_NEW: "message.new",

  /* ── Payments / Wallet ── */
  PAYMENT_COMPLETED: "payment.completed",
  WALLET_UPDATED:    "wallet.updated",

  /* ── Admin ── */
  ADMIN_STATS_UPDATE: "admin.stats",

  /* ── Notifications ── */
  NOTIFICATION: "notification",

  /* ── Care Ride ── */
  CARE_PRIMARY_DISPATCHED:  "care.primary.dispatched",
  CARE_PRIMARY_ACCEPTED:    "care.primary.accepted",
  CARE_SUPPORT_DISPATCHED:  "care.support.dispatched",
  CARE_SUPPORT_ACCEPTED:    "care.support.accepted",
  CARE_ASSIGNMENT_STATUS:   "care.assignment.status",
  CARE_BOOKING_CONFIRMED:   "care.booking.confirmed",
  CARE_BOOKING_CLOSED:      "care.booking.closed",
  CARE_DISPATCH_FAILED:     "care.dispatch.failed",
  CARE_SUPPORT_PICKUP_READY: "care.support.pickupReady",
  CARE_PRIMARY_PICKUP_EN_ROUTE: "care.primary.pickupEnRoute",

  /* Rider changed the route mid-trip (destination / stops / stop order) */
  BOOKING_ROUTE_UPDATED: "booking.route.updated",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

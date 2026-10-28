/* AUTO-SYNCED from movo-web/lib/launchConfig.ts by scripts/sync-shared.mjs — do not edit here. */

/**
 * Launch scope switches (Oct 2026 — Winnipeg launch).
 *
 * Movo launches with Safe Ride and In-City Rides only. Airport Transfer,
 * Hourly Chauffeur and chauffeur vehicle rental are hidden from every customer
 * and chauffeur screen and refused by the API, but all of their code stays in
 * place. Flip a flag back to `true` to restore that service.
 *
 * Safe Ride has no switch — it is always on.
 */

/** Standard point-to-point rides (Standard / Executive / Concierge tiers). */
export const IN_CITY_RIDES_ENABLED = true;

/** Airport Transfer service, including the airport pickup fee. */
export const AIRPORT_TRANSFER_ENABLED = false;

/** Hourly Chauffeur (charter billed by the hour). */
export const HOURLY_CHARTER_ENABLED = false;

/** Chauffeur vehicle rental (dashboard, onboarding option, admin, public site). */
export const VEHICLE_RENTAL_ENABLED = false;

/**
 * In-City tiers customers can see and book (Oct 2026: Standard only).
 * Customer-facing only — admin pricing, chauffeur vehicles and every tier's
 * configuration are unchanged. Add "premium" / "black" back to show Executive
 * and Concierge again.
 */
export const CUSTOMER_RIDE_TIERS: readonly ("classic" | "premium" | "black")[] = ["classic"];

/** Drops a booking `mode` (airport / hourly) whose service is switched off. */
export function allowedBookingMode(mode: string | null | undefined): string {
  if (mode === "airport") return AIRPORT_TRANSFER_ENABLED ? mode : "";
  if (mode === "hourly")  return HOURLY_CHARTER_ENABLED ? mode : "";
  return mode ?? "";
}

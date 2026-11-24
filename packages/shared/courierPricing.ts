/* AUTO-SYNCED from movo-web/lib/courier/pricing.ts by scripts/sync-shared.mjs — do not edit here. */

/**
 * Movo Courier pricing — pure math, safe for the browser and the apps.
 *
 * Prices are fixed per route (GST included) and the same both ways. Inside
 * that price:
 *   travel fee     = route km × travelFeePerKm (return leg to Winnipeg) —
 *                    100% to the driver, never shown to the customer
 *   service        = price before GST − travel fee
 *   driver payout  = driverShare × service + travel fee
 *   Movo keeps     = (1 − driverShare) × service
 * e.g. Steinbach $50 → $47.62 + $2.38 GST; travel $32.50; service $15.12;
 *      driver $44.60, Movo $3.02 (matches Movo's table).
 *
 * A Scheduled package pays its route's per-package price and carries
 * travel fee ÷ scheduledMinPackages, so a minimum run pays the driver the
 * same as a One Way trip and every extra package pays more.
 */

export type CourierMode = "ONE_WAY" | "SCHEDULED";
export type CourierDirection = "TO_TOWN" | "TO_WINNIPEG";

export type CourierRates = {
  baseFare: number;
  perKm: number;
  perMin: number;
  minimumFare: number;
  travelFeePerKm: number;
  driverShare: number;
  scheduledMinPackages: number;
};

export type CourierRouteRates = { distanceKm: number; durationMin: number; oneWayPrice: number; scheduledPrice: number };

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** The route's travel fee for one package in this mode */
export function travelFeeFor(route: CourierRouteRates, rates: CourierRates, mode: CourierMode): number {
  const full = route.distanceKm * rates.travelFeePerKm;
  return round2(mode === "SCHEDULED" ? full / Math.max(1, rates.scheduledMinPackages) : full);
}

/** Split a GST-included price into what the customer, driver and Movo get */
export function splitPrice(price: number, travelFee: number, rates: CourierRates, gstRate: number) {
  const net = round2(price / (1 + gstRate));
  const service = Math.max(0, round2(net - travelFee));
  return {
    net,
    gst: round2(price - net),
    servicePortion: service,
    travelFee,
    driverPayout: round2(service * rates.driverShare + travelFee),
    movoShare: round2(service * (1 - rates.driverShare)),
  };
}

/** What the rate card alone would charge for a route (admin suggestion) */
export function suggestedPrices(route: Pick<CourierRouteRates, "distanceKm" | "durationMin">, rates: CourierRates, gstRate: number) {
  const service = Math.max(rates.minimumFare, rates.baseFare + route.distanceKm * rates.perKm + route.durationMin * rates.perMin);
  const oneWay = round2((service + route.distanceKm * rates.travelFeePerKm) * (1 + gstRate));
  return { oneWay, scheduled: Math.round(oneWay / 2) };
}

/** Extra merchant pickup: the real detour at the rate card's per-km/per-min, before GST */
export function detourCharge(extraKm: number, extraMin: number, rates: CourierRates): number {
  return round2(Math.max(0, extraKm) * rates.perKm + Math.max(0, extraMin) * rates.perMin);
}

export const MODE_LABEL: Record<CourierMode, string> = { ONE_WAY: "One Way", SCHEDULED: "Scheduled" };
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function runDaysLabel(days: number[]): string {
  const d = [...new Set(days)].sort();
  if (d.length === 7) return "Daily";
  return d.map((n) => DAY_SHORT[n]).join(", ");
}

/* What Movo doesn't carry — shown on the booking form and the driver offer */
export const NOT_CARRIED = [
  "Cash", "Jewellery", "Medication", "Alcohol", "Anything illegal or dangerous",
  "Anything that must stay cold or frozen",
];
export const PACKAGE_SIZES = [
  { id: "SMALL", label: "Small", hint: "Envelope or shoebox" },
  { id: "MEDIUM", label: "Medium", hint: "Fits on a car seat" },
  { id: "LARGE", label: "Large", hint: "Fills a car trunk" },
] as const;
export type PackageSize = (typeof PACKAGE_SIZES)[number]["id"];

/* ── Pickup time ───────────────────────────────────────────────────────────
   One Way: "as soon as possible" or a chosen Winnipeg date + time.
   Scheduled: the run day plus a pickup window on that day. */
export const ONE_WAY_LATER = { minLeadMinutes: 60, maxDaysAhead: 14, firstHour: 7, lastHour: 20, stepMinutes: 15 };

export const PICKUP_WINDOWS = [
  { id: "MORNING", label: "Morning", hint: "9 am – 12 pm" },
  { id: "AFTERNOON", label: "Afternoon", hint: "12 – 5 pm" },
] as const;
export type PickupWindow = (typeof PICKUP_WINDOWS)[number]["id"];

/** "15:30" → "3:30 pm" */
export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Every bookable One Way pickup time of day, "07:00" … "20:00" */
export function oneWayTimeSlots(): string[] {
  const out: string[] = [];
  for (let mins = ONE_WAY_LATER.firstHour * 60; mins <= ONE_WAY_LATER.lastHour * 60; mins += ONE_WAY_LATER.stepMinutes) {
    out.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
  }
  return out;
}

const WPG = "America/Winnipeg";
const dayLabel = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: WPG, weekday: "short", month: "short", day: "numeric" });
const clockLabel = (d: Date) => d.toLocaleTimeString("en-CA", { timeZone: WPG, hour: "numeric", minute: "2-digit" })
  .replace(/\s?a\.?m\.?$/i, " am").replace(/\s?p\.?m\.?$/i, " pm");

/** When the package is picked up, in words */
export function pickupWhenLabel(b: { mode: CourierMode; scheduledAt: Date | string | null; pickupWindow?: string | null }): string {
  if (!b.scheduledAt) return "As soon as possible";
  const d = new Date(b.scheduledAt);
  if (b.mode === "SCHEDULED") {
    const w = PICKUP_WINDOWS.find((x) => x.id === b.pickupWindow);
    return `${dayLabel(d)} · ${w ? `${w.label} (${w.hint})` : "during the run"}`;
  }
  return `${dayLabel(d)} · ${clockLabel(d)}`;
}

/* AUTO-SYNCED from movo-web/lib/liveTracking.ts by scripts/sync-shared.mjs — do not edit here. */

/**
 * Live-tracking helpers for every map that follows a driver (rider web page,
 * share link, customer app). Pure functions — synced to the apps
 * (movo-mobile packages/shared/liveTracking.ts).
 *
 * Positions arrive as `driver.location` { lat, lng, heading?, speed?, ts? }
 * and the route + ETA as `trip.eta` { target, minutes, metres, polyline, at }.
 */

export type LivePoint = { lat: number; lng: number; heading?: number | null; speed?: number | null; ts?: number | null };
export type LiveEta = { bookingId?: string; target: "pickup" | "dropoff"; minutes: number; metres: number; polyline: string; at: number };

/** Only accept a point newer than the one already shown (socket + poll can cross) */
export function isNewer(next: LivePoint, current: LivePoint | null): boolean {
  if (!current) return true;
  if (next.ts == null || current.ts == null) return true;
  return next.ts > current.ts;
}

/** Compass bearing from a to b, degrees 0–360 */
export function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

export function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * The direction the car icon should face: the phone's GPS heading while it's
 * moving, else the bearing from the previous point (when it moved enough to
 * mean something), else keep the last one.
 */
export function headingFor(prev: LivePoint | null, next: LivePoint, lastHeading: number): number {
  if (next.heading != null && (next.speed == null || next.speed > 1)) return next.heading;
  if (prev && metresBetween(prev, next) > 8) return bearing(prev, next);
  return lastHeading;
}

/** Turn from `from` to `to` the short way round (e.g. 350° → 10° is +20°, not −340°) */
export function shortestTurn(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/** Ease-out position between two points, t in 0..1 */
export function lerpPoint(a: { lat: number; lng: number }, b: { lat: number; lng: number }, t: number) {
  const e = 1 - (1 - t) ** 3;
  return { lat: a.lat + (b.lat - a.lat) * e, lng: a.lng + (b.lng - a.lng) * e };
}

/* Google's encoded polyline format → { lat, lng } points */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte: number;
      do {
        byte = encoded.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && i < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/** "Arriving in 4 min" / "Arriving now" / "12 min to destination" */
export function etaLabel(eta: Pick<LiveEta, "target" | "minutes">): string {
  if (eta.target === "pickup") return eta.minutes <= 1 ? "Arriving now" : `Arriving in ${eta.minutes} min`;
  return `${eta.minutes} min to destination`;
}

/** Clock time of arrival in Winnipeg, e.g. "3:42 pm" */
export function etaClock(eta: Pick<LiveEta, "minutes" | "at">, timeZone: string): string {
  return new Date(eta.at + eta.minutes * 60_000)
    .toLocaleTimeString("en-CA", { timeZone, hour: "numeric", minute: "2-digit" })
    .replace(/\s?a\.?m\.?$/i, " am").replace(/\s?p\.?m\.?$/i, " pm");
}

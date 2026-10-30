/**
 * Pickup time choices, in Winnipeg time like the web's pickers: today and the
 * next 6 days, and 15-minute slots that respect the reservation notice
 * (30 min City Rides, 45 min Safe Ride).
 */
import { MOVO_TZ, winnipegDateTime, winnipegToday } from "@movo/shared";

export const LEAD_MIN = { city: 30, care: 45 } as const;
/* Further out than this, a pickup is a reservation (the server's threshold) */
export const SCHEDULED_THRESHOLD_MIN = 25;

const SLOT_MIN = 15;

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function dayOptions(count = 7): { date: string; label: string }[] {
  const today = winnipegToday();
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    const noon = winnipegDateTime(date, "12:00")!;
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow"
      : new Intl.DateTimeFormat("en-CA", { timeZone: MOVO_TZ, weekday: "short", month: "short", day: "numeric" }).format(noon);
    return { date, label };
  });
}

/** Slots on `date` at least `leadMin` from now */
export function timeOptions(date: string, leadMin: number, now = Date.now()): { time: string; label: string }[] {
  const earliest = now + leadMin * 60_000;
  const out: { time: string; label: string }[] = [];
  for (let m = 0; m < 24 * 60; m += SLOT_MIN) {
    const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const at = winnipegDateTime(date, time);
    if (!at || at.getTime() < earliest) continue;
    out.push({ time, label: new Intl.DateTimeFormat("en-CA", { timeZone: MOVO_TZ, hour: "numeric", minute: "2-digit" }).format(at) });
  }
  return out;
}

export function pickupLabel(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: MOVO_TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

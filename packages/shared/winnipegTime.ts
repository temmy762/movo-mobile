/* AUTO-SYNCED from movo-web/lib/winnipegTime.ts by scripts/sync-shared.mjs — do not edit here. */

/**
 * Movo operates in Winnipeg and shows every time in America/Winnipeg (emails,
 * chauffeur and admin screens). Reservation date/time pickers must mean
 * Winnipeg time too — reading them in the phone's own time zone booked the
 * wrong pickup for anyone whose device is set elsewhere.
 */
export const MOVO_TZ = "America/Winnipeg";

/* Offset of `tz` from UTC at instant `ms`, in ms (handles DST) */
function tzOffsetMs(ms: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - ms;
}

/** "2026-10-20" + "17:30" in Winnipeg → Date (null if invalid) */
export function winnipegDateTime(date: string, time: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m || !t) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]);
  let ms = guess - tzOffsetMs(guess, MOVO_TZ);
  ms = guess - tzOffsetMs(ms, MOVO_TZ); /* second pass settles DST edges */
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

/** Today's date / current time in Winnipeg, for picker defaults */
export function winnipegToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MOVO_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function winnipegNowTime(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: MOVO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}

/** Next half-hour slot, as Winnipeg date + time (picker defaults) */
export function winnipegNextSlot(): { date: string; time: string } {
  const slot = new Date(Math.ceil(Date.now() / (30 * 60_000)) * 30 * 60_000);
  return {
    date: new Intl.DateTimeFormat("en-CA", { timeZone: MOVO_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(slot),
    time: new Intl.DateTimeFormat("en-GB", { timeZone: MOVO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(slot),
  };
}

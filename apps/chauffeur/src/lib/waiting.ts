/**
 * Waiting clock at pickup, as on the web: a free window counting down, then
 * a per-minute charge accruing. Standard rides and Safe Ride have their own
 * rules (admin pricing: `global` vs `safeRideWaiting`).
 */
import { useEffect, useState } from "react";

export type WaitInfo = { arrivedAt: number; freeMin: number; rate: number };

export const STANDARD_WAITING = { freeMin: 5, rate: 0.75 };
export const SAFE_RIDE_WAITING = { freeMin: 3, rate: 1 };

export type WaitingClock = { freeLeft: number; accrued: number; rate: number };

/** Ticks once a second while `active` */
export function useWaitingClock(wait: WaitInfo | null, active: boolean): WaitingClock | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !wait) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active, wait]);

  if (!active || !wait) return null;
  /* A fresh arrival can be a moment ahead of the last tick */
  const elapsed = Math.max(0, Math.floor((Math.max(now, wait.arrivedAt) - wait.arrivedAt) / 1000));
  const billableMin = Math.max(0, Math.floor(elapsed / 60) - wait.freeMin);
  return { freeLeft: Math.max(0, wait.freeMin * 60 - elapsed), accrued: billableMin * wait.rate, rate: wait.rate };
}

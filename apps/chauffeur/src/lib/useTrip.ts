/**
 * An accepted standard ride, step by step — same rules as the web chauffeur
 * home: "I've Arrived" anchors the waiting clock (free minutes, then a
 * per-minute charge), "Start Ride" stops it and starts relaying location to
 * the rider, "End Ride" completes and asks for a rider rating. Before the
 * trip starts the chauffeur can back out; the ride goes to another chauffeur.
 */
import { useCallback, useEffect, useState } from "react";
import { Vibration } from "react-native";
import * as Haptics from "expo-haptics";
import { ApiError, app as appApi, driver as driverApi } from "@movo/api";
import { SOCKET_EVENTS, type DriverBooking } from "@movo/shared";
import { setTripTracking } from "./location";
import { useSocket } from "./socket";

export type TripStep = "accepted" | "arrived" | "started" | "completed";

type WaitInfo = { arrivedAt: number; freeMin: number; rate: number };

const DEFAULT_FREE_MIN = 5;
const DEFAULT_RATE = 0.75;

export function stopsOf(stops: unknown): string[] {
  return Array.isArray(stops) ? stops.filter((s): s is string => typeof s === "string" && !!s) : [];
}

export function useTrip(booking: DriverBooking) {
  const { on } = useSocket();
  const [step, setStep] = useState<TripStep>(
    booking.startedAt ? "started" : booking.arrivedAt ? "arrived" : "accepted",
  );
  const [wait, setWait] = useState<WaitInfo | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The rider can change the destination / stops mid-trip */
  const [route, setRoute] = useState({ dropoff: booking.dropoff, stops: stopsOf(booking.stops) });
  const [routeNotice, setRouteNotice] = useState<string | null>(null);

  /* Restored mid-wait (app restarted after "I've Arrived") */
  useEffect(() => {
    if (!booking.arrivedAt || booking.startedAt) return;
    const arrivedAt = new Date(booking.arrivedAt).getTime();
    appApi.pricing()
      .then((p) => setWait({
        arrivedAt,
        freeMin: p.global?.freeWaitingMinutes ?? DEFAULT_FREE_MIN,
        rate: p.global?.waitingRatePerMin ?? DEFAULT_RATE,
      }))
      .catch(() => setWait({ arrivedAt, freeMin: DEFAULT_FREE_MIN, rate: DEFAULT_RATE }));
  }, [booking.arrivedAt, booking.startedAt]);

  /* Waiting clock ticks while at pickup */
  useEffect(() => {
    if (step !== "arrived" || !wait) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step, wait]);

  /* Location goes to the rider only while the trip is under way */
  useEffect(() => {
    if (step !== "started") return;
    setTripTracking(booking.id);
    return () => { setTripTracking(null); };
  }, [step, booking.id]);

  useEffect(() => on(SOCKET_EVENTS.BOOKING_ROUTE_UPDATED, (data) => {
    const d = data as { bookingId?: string; dropoff?: string; stops?: unknown; message?: string };
    if (d.bookingId !== booking.id) return;
    setRoute((r) => ({ dropoff: d.dropoff ?? r.dropoff, stops: d.stops !== undefined ? stopsOf(d.stops) : r.stops }));
    setRouteNotice(d.message ?? "The rider updated the route.");
    Vibration.vibrate([0, 200, 100, 200]);
  }), [on, booking.id]);

  const run = useCallback(async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  }, []);

  /* Persists the arrival (waiting anchor) and tells the rider */
  const arrive = () => run(async () => {
    const d = await driverApi.arrived(booking.id);
    setWait({
      arrivedAt: new Date(d.arrivedAt).getTime(),
      freeMin: d.freeWaitingMinutes ?? DEFAULT_FREE_MIN,
      rate: d.waitingRatePerMin ?? DEFAULT_RATE,
    });
    setNow(Date.now());
    setStep("arrived");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, "Couldn't update the ride — check your connection and try again.");

  const start = () => run(async () => {
    try {
      await driverApi.startTrip(booking.id);
    } catch (e) {
      /* Already started (double tap / retry) — carry on */
      if (!(e instanceof ApiError && e.status === 409)) throw e;
    }
    setWait(null);
    setStep("started");
  }, "Couldn't start the trip — check your connection and try again.");

  const complete = () => run(async () => {
    try {
      await driverApi.completeTrip(booking.id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409 && /already completed/i.test(e.message))) throw e;
    }
    setStep("completed");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, "Couldn't end the ride — check your connection and try again.");

  /* Resolves true once the ride has been handed back */
  const cancel = async (reason: string) => {
    let ok = false;
    await run(async () => {
      await driverApi.driverCancel(booking.id, reason.trim());
      ok = true;
    }, "Couldn't cancel this ride. Please try again.");
    return ok;
  };

  /* Best effort — the trip is already complete */
  const rate = (rating: number, feedback: string) =>
    driverApi.rateRider(booking.id, rating, feedback.trim() || null).catch(() => {});

  /* Waiting clock: free window countdown, then the accruing charge */
  let waiting: { freeLeft: number; accrued: number; rate: number } | null = null;
  if (wait && step === "arrived") {
    const elapsed = Math.max(0, Math.floor((now - wait.arrivedAt) / 1000));
    const billableMin = Math.max(0, Math.floor(elapsed / 60) - wait.freeMin);
    waiting = { freeLeft: Math.max(0, wait.freeMin * 60 - elapsed), accrued: billableMin * wait.rate, rate: wait.rate };
  }

  return {
    step, busy, error, route, routeNotice, waiting,
    arrive, start, complete, cancel, rate,
    clearError: () => setError(null),
    clearRouteNotice: () => setRouteNotice(null),
  };
}

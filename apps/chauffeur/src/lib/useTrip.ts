/**
 * An accepted standard ride, step by step — same rules as the web chauffeur
 * home: "I've Arrived" anchors the waiting clock (free minutes, then a
 * per-minute charge), "Start Ride" stops it and starts relaying location to
 * the rider, "End Ride" completes and asks for a rider rating. Before the
 * trip starts the chauffeur can back out; the ride goes to another chauffeur.
 */
import { useCallback, useEffect, useState } from "react";
import { AppState, Vibration } from "react-native";
import * as Haptics from "expo-haptics";
import { ApiError, app as appApi, driver as driverApi } from "@movo/api";
import { SOCKET_EVENTS, type DriverBooking } from "@movo/shared";
import { setTripTracking } from "./location";
import { useSocket } from "./socket";
import { STANDARD_WAITING, useWaitingClock, type WaitInfo } from "./waiting";

export type TripStep = "accepted" | "arrived" | "started" | "completed";

/* A trip only moves forward. The card can be rebuilt from an older copy of
   the booking (e.g. Android recreating the screen while another app was in
   front); the step must never fall back to "I've Arrived" after Start. */
const RANK: Record<TripStep, number> = { accepted: 0, arrived: 1, started: 2, completed: 3 };
const stepOf = (b: { startedAt?: string | null; arrivedAt?: string | null }): TripStep =>
  b.startedAt ? "started" : b.arrivedAt ? "arrived" : "accepted";

/* Progress the server confirmed, so the screen's copy of the ride stays current */
export type TripProgress = { arrivedAt?: string; startedAt?: string };

const { freeMin: DEFAULT_FREE_MIN, rate: DEFAULT_RATE } = STANDARD_WAITING;

export function stopsOf(stops: unknown): string[] {
  return Array.isArray(stops) ? stops.filter((s): s is string => typeof s === "string" && !!s) : [];
}

export function useTrip(booking: DriverBooking, onProgress?: (p: TripProgress) => void) {
  const { on } = useSocket();
  const [step, setStepRaw] = useState<TripStep>(stepOf(booking));
  const advance = useCallback((next: TripStep) => {
    setStepRaw((cur) => (RANK[next] > RANK[cur] ? next : cur));
  }, []);
  const [wait, setWait] = useState<WaitInfo | null>(null);
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

  const waiting = useWaitingClock(wait, step === "arrived");

  /* Catch up with the server: on return to the app and when the server says
     the trip started. Only ever moves forward (see RANK). */
  const resync = useCallback(() => {
    driverApi.activeBooking()
      .then(({ booking: live }) => {
        if (!live || live.id !== booking.id) return;
        if (live.startedAt) setWait(null);
        advance(stepOf(live));
        if (live.arrivedAt || live.startedAt) {
          onProgress?.({ ...(live.arrivedAt ? { arrivedAt: live.arrivedAt } : {}), ...(live.startedAt ? { startedAt: live.startedAt } : {}) });
        }
      })
      .catch(() => { /* offline — the next foreground retries */ });
  }, [booking.id, advance, onProgress]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") resync(); });
    const offStarted = on(SOCKET_EVENTS.TRIP_STARTED, (data) => {
      if ((data as { bookingId?: string }).bookingId === booking.id) advance("started");
    });
    return () => { sub.remove(); offStarted(); };
  }, [resync, on, booking.id, advance]);

  /* Location goes to the rider from accepting until the ride ends — they
     watch the car come to the pickup, then follow the trip */
  const tracking = step === "accepted" || step === "arrived" || step === "started";
  useEffect(() => {
    if (!tracking) return;
    setTripTracking(booking.id);
    return () => { setTripTracking(null); };
  }, [tracking, booking.id]);

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
    advance("arrived");
    onProgress?.({ arrivedAt: d.arrivedAt });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, "Couldn't update the ride — check your connection and try again.");

  const start = () => run(async () => {
    let startedAt = new Date().toISOString();
    try {
      startedAt = (await driverApi.startTrip(booking.id)).startedAt ?? startedAt;
    } catch (e) {
      /* Already started (double tap / retry) — carry on */
      if (!(e instanceof ApiError && e.status === 409)) throw e;
    }
    setWait(null);
    advance("started");
    onProgress?.({ startedAt });
  }, "Couldn't start the trip — check your connection and try again.");

  const complete = () => run(async () => {
    try {
      await driverApi.completeTrip(booking.id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409 && /already completed/i.test(e.message))) throw e;
    }
    advance("completed");
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

  /* Customer didn't show: resolves true once the ride is closed */
  const noShow = async () => {
    let ok = false;
    await run(async () => {
      await driverApi.noShow(booking.id);
      ok = true;
    }, "Couldn't mark the no-show. Please try again.");
    return ok;
  };

  /* Best effort — the trip is already complete */
  const rate = (rating: number, feedback: string) =>
    driverApi.rateRider(booking.id, rating, feedback.trim() || null).catch(() => {});

  return {
    step, busy, error, route, routeNotice, waiting,
    arrive, start, complete, cancel, noShow, rate,
    clearError: () => setError(null),
    clearRouteNotice: () => setRouteNotice(null),
  };
}

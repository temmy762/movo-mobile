/**
 * Safe Ride (Care) for this chauffeur — same rules as the web chauffeur home.
 *
 * PRIMARY drives the customer in their own car: accept → (reserved: heading
 * to pickup) → arrived (Safe Ride waiting clock) → start → customer dropped
 * off → AWAITING_RETURN until SUPPORT (or a Dispatch-booked Uber) brings them
 * back to their vehicle. SUPPORT drives to the destination (rendezvous),
 * waits until PRIMARY has delivered the customer, then returns PRIMARY to
 * their vehicle and completes the job (then rates).
 *
 * Offers come through care.* socket events, which only say "something
 * changed" — /api/care/driver is the source of truth, so every event (and a
 * light poll, for missed events) re-reads it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";
import * as Haptics from "expo-haptics";
import { ApiError, app as appApi, care as careApi, driver as driverApi } from "@movo/api";
import { SOCKET_EVENTS, type CareAssignment, type CareDriverResponse, type CoDriver } from "@movo/shared";
import { setTripTracking } from "./location";
import { useSocket } from "./socket";
import { SAFE_RIDE_WAITING, useWaitingClock, type WaitInfo } from "./waiting";

const OFFER_SECONDS = 30;
const POLL_MS = 10_000;

export type SafePhase = "idle" | "requesting" | "accepted" | "arrived" | "started" | "awaiting_return" | "completed";

const PHASE_OF: Record<string, SafePhase> = {
  PENDING: "requesting",
  ACCEPTED: "accepted",
  ARRIVED: "arrived",
  STARTED: "started",
  AWAITING_RETURN: "awaiting_return",
};

const CARE_EVENTS = [
  SOCKET_EVENTS.CARE_PRIMARY_DISPATCHED,
  SOCKET_EVENTS.CARE_SUPPORT_DISPATCHED,
  SOCKET_EVENTS.CARE_PRIMARY_ACCEPTED,
  SOCKET_EVENTS.CARE_SUPPORT_ACCEPTED,
  SOCKET_EVENTS.CARE_ASSIGNMENT_STATUS,
  SOCKET_EVENTS.CARE_BOOKING_CLOSED,
  SOCKET_EVENTS.CARE_SUPPORT_PICKUP_READY,
  SOCKET_EVENTS.CARE_PRIMARY_PICKUP_EN_ROUTE,
] as const;

/* A reserved Safe Ride waits for PRIMARY to set off before "Arrived" */
export function needsSetOff(a: CareAssignment) {
  return a.role === "PRIMARY" && !!a.booking.scheduledAt && !a.booking.enRouteAt &&
    new Date(a.booking.scheduledAt).getTime() > Date.now() - 6 * 60 * 60 * 1000;
}

export function useSafeRide({ canOffer, onAccepted }: {
  /** New offers are shown only while online and not on a standard ride */
  canOffer: () => boolean;
  /** Accepted, or a Safe Ride was already under way on launch */
  onAccepted?: () => void;
}) {
  const { on } = useSocket();
  const [phase, setPhase] = useState<SafePhase>("idle");
  const [assignment, setAssignment] = useState<CareAssignment | null>(null);
  const [coDriver, setCoDriver] = useState<CoDriver | null>(null);
  const [earning, setEarning] = useState(0);
  const [timeLeft, setTimeLeft] = useState(OFFER_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState<WaitInfo | null>(null);

  const phaseRef = useRef<SafePhase>("idle");
  /* Offers this chauffeur declined or let expire */
  const ignored = useRef(new Set<string>());
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const clear = useCallback(() => {
    setAssignment(null);
    setCoDriver(null);
    setEarning(0);
    setWait(null);
    setPhase("idle");
  }, []);

  const apply = useCallback((res: CareDriverResponse) => {
    /* Rating after SUPPORT closed the job — the server has nothing left to show */
    if (phaseRef.current === "completed") return;
    const a = res.assignment;
    const offer = a?.status === "PENDING";
    if (!a || (offer && (ignored.current.has(a.id) || !canOffer()))) {
      const was = phaseRef.current;
      if (was === "awaiting_return") setNotice("Safe Ride complete. You're back in the queue for new requests.");
      else if (was === "accepted" || was === "arrived" || was === "started") {
        setNotice("This Safe Ride is no longer assigned to you. You're back in the queue for new requests.");
      }
      if (was !== "idle") clear();
      return;
    }
    if (offer && phaseRef.current !== "requesting") {
      setTimeLeft(OFFER_SECONDS);
      setError(null);
    }
    if (!offer && phaseRef.current === "idle") onAccepted?.();
    setAssignment(a);
    setCoDriver(res.coDriver);
    setEarning(res.earning ?? 0);
    setPhase(PHASE_OF[a.status] ?? "idle");
  }, [canOffer, clear, onAccepted]);

  const refresh = useCallback(
    () => careApi.current().then(apply).catch(() => { /* network hiccup — the next poll retries */ }),
    [apply],
  );

  /* Restore on launch, re-read on every care.* event, and poll for missed ones */
  useEffect(() => {
    refresh();
    const offs = CARE_EVENTS.map((e) => on(e, () => { refresh(); }));
    const timer = setInterval(() => {
      if (phaseRef.current !== "idle" || canOffer()) refresh();
    }, POLL_MS);
    return () => { offs.forEach((off) => off()); clearInterval(timer); };
  }, [on, refresh, canOffer]);

  /* 30 s offer: countdown + repeating vibration until answered */
  const offerId = phase === "requesting" ? assignment?.id : undefined;
  useEffect(() => {
    if (!offerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Vibration.vibrate([0, 600, 400], true);
    const started = Date.now();
    const timer = setInterval(() => {
      const left = OFFER_SECONDS - Math.floor((Date.now() - started) / 1000);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(timer);
        ignored.current.add(offerId);
        clear();
      }
    }, 250);
    return () => { clearInterval(timer); Vibration.cancel(); };
  }, [offerId, clear]);

  /* PRIMARY waiting clock at pickup, with the Safe Ride rules */
  const arrivedAt = phase === "arrived" && assignment?.role === "PRIMARY" ? assignment.arrivedAt ?? null : null;
  useEffect(() => {
    if (!arrivedAt) return;
    const at = new Date(arrivedAt).getTime();
    appApi.pricing()
      .then((p) => setWait({
        arrivedAt: at,
        freeMin: p.safeRideWaiting?.freeWaitingMinutes ?? SAFE_RIDE_WAITING.freeMin,
        rate: p.safeRideWaiting?.waitingRatePerMin ?? SAFE_RIDE_WAITING.rate,
      }))
      .catch(() => setWait({ arrivedAt: at, ...SAFE_RIDE_WAITING }));
  }, [arrivedAt]);
  const waiting = useWaitingClock(wait, !!arrivedAt);

  /* Location goes to the ride while driving it */
  const tripId = phase === "started" ? assignment?.booking.id : undefined;
  useEffect(() => {
    if (!tripId) return;
    setTripTracking(tripId);
    return () => { setTripTracking(null); };
  }, [tripId]);

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

  const transition = (status: Parameters<typeof careApi.updateAssignment>[1], fallback: string) =>
    run(async () => {
      if (!assignment) return;
      await careApi.updateAssignment(assignment.id, status);
      await refresh();
    }, fallback);

  const accept = () => {
    if (!assignment) return;
    const id = assignment.id;
    Vibration.cancel();
    return run(async () => {
      try {
        await careApi.updateAssignment(id, "ACCEPTED");
      } catch (e) {
        /* Expired, or another chauffeur accepted first: show why, then clear */
        if (e instanceof ApiError && (e.status === 409 || e.status === 422)) {
          ignored.current.add(id);
          setTimeout(() => { if (phaseRef.current === "requesting") clear(); setError(null); }, 3500);
        }
        throw e;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refresh();
    }, "Couldn't accept this request. Please try again.");
  };

  const decline = () => {
    if (!assignment) return;
    ignored.current.add(assignment.id);
    careApi.updateAssignment(assignment.id, "CANCELLED").catch(() => {});
    clear();
  };

  const headToPickup = () => run(async () => {
    if (!assignment) return;
    await careApi.enRoute(assignment.id);
    await refresh();
  }, "Could not update. Please try again.");

  const arrive = () => transition("ARRIVED", "Couldn't update the assignment. Please try again.");
  const start = () => transition("STARTED", "Couldn't update the assignment. Please try again.");

  /* PRIMARY: the customer's trip ends, PRIMARY waits for the return leg.
     SUPPORT: PRIMARY is back at their car — the job closes. */
  const complete = () => run(async () => {
    if (!assignment) return;
    if (assignment.role === "PRIMARY") {
      await careApi.updateAssignment(assignment.id, "AWAITING_RETURN");
      await refresh();
      return;
    }
    await careApi.updateAssignment(assignment.id, "COMPLETED");
    setPhase("completed");
  }, "Couldn't update the assignment. Please try again.");

  /* PRIMARY on an Uber return, back at their vehicle */
  const backAtVehicle = () => run(async () => {
    if (!assignment) return;
    await careApi.updateAssignment(assignment.id, "COMPLETED");
    clear();
    setNotice("Safe Ride complete. You're back in the queue for new requests.");
  }, "Could not close the job. Please try again.");

  const rate = async (rating: number, feedback: string) => {
    if (assignment) await driverApi.rateRider(assignment.booking.id, rating, feedback.trim() || null).catch(() => {});
    clear();
  };

  return {
    phase, assignment, coDriver, earning, timeLeft, busy, error, notice, waiting,
    accept, decline, headToPickup, arrive, start, complete, backAtVehicle, rate,
    clearError: () => setError(null),
    clearNotice: () => setNotice(null),
  };
}

/**
 * Ride requests while online — same rules as the web chauffeur home:
 * poll the open pool every 5 s (sockets only nudge an early check), offer one
 * ride at a time for 30 s, skip rides this chauffeur declined, and treat a
 * 409 on accept as "someone else took it". Scheduled rides (> 25 min out) are
 * reservations: accepting one keeps the chauffeur searching.
 *
 * Safe Ride (Care) requests come through their own events and are handled
 * separately — they are never in this pool.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";
import * as Haptics from "expo-haptics";
import { ApiError, driver as driverApi } from "@movo/api";
import { SOCKET_EVENTS, type DriverBooking } from "@movo/shared";
import { useSocket } from "./socket";

const POLL_MS = 5_000;
const OFFER_SECONDS = 30;
const RESERVATION_LEAD_MS = 25 * 60 * 1000;

export type RequestPhase = "idle" | "searching" | "requesting" | "accepted";

export function isReservation(b: DriverBooking) {
  return !!b.scheduledAt && new Date(b.scheduledAt).getTime() > Date.now() + RESERVATION_LEAD_MS;
}

export function useRideRequests({ online, onAccepted }: {
  online: boolean;
  /** An immediate ride was accepted, or one was already in progress on launch */
  onAccepted?: () => void;
}) {
  const { on } = useSocket();
  const [phase, setPhase] = useState<RequestPhase>("idle");
  const [booking, setBooking] = useState<DriverBooking | null>(null);
  const [timeLeft, setTimeLeft] = useState(OFFER_SECONDS);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const phaseRef = useRef<RequestPhase>("idle");
  const declined = useRef(new Set<string>());
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* A ride already in progress (app restarted mid-trip) */
  const restoreActive = useCallback(async () => {
    const { booking: active } = await driverApi.activeBooking().catch(() => ({ booking: null }));
    if (active) {
      setBooking(active);
      setPhase("accepted");
      onAccepted?.();
    }
    return !!active;
  }, [onAccepted]);

  useEffect(() => { restoreActive(); }, [restoreActive]);

  const checkPool = useCallback(async () => {
    if (phaseRef.current !== "searching") return;
    try {
      const pool = await driverApi.pendingBookings();
      const next = pool.find((b) => !declined.current.has(b.id));
      /* Re-check: an accept may have landed while this request was in flight */
      if (next && phaseRef.current === "searching") {
        setBooking(next);
        setPhase("requesting");
      }
    } catch {
      /* network hiccup — the next poll retries */
    }
  }, []);

  /* Online ⇄ searching */
  useEffect(() => {
    if (online && phaseRef.current === "idle") setPhase("searching");
    if (!online && phaseRef.current !== "accepted") {
      setPhase("idle");
      setBooking(null);
      declined.current.clear();
    }
  }, [online]);

  /* Poll while searching; socket events trigger an immediate check */
  useEffect(() => {
    if (phase !== "searching") return;
    checkPool();
    const timer = setInterval(checkPool, POLL_MS);
    const offCreated = on(SOCKET_EVENTS.BOOKING_CREATED, () => { checkPool(); });
    const offReleased = on(SOCKET_EVENTS.DRIVER_RELEASED, () => { checkPool(); });
    return () => { clearInterval(timer); offCreated(); offReleased(); };
  }, [phase, checkPool, on]);

  /* The offered / held ride was cancelled */
  useEffect(() => {
    if (!booking) return;
    return on(SOCKET_EVENTS.BOOKING_CANCELLED, (data) => {
      const d = data as { bookingId?: string; cancelledBy?: string };
      if (d.bookingId !== booking.id) return;
      setBooking(null);
      setPhase(online ? "searching" : "idle");
      if (d.cancelledBy !== "driver") {
        setNotice(d.cancelledBy === "admin"
          ? "This ride was cancelled by Movo support. You're back in the queue for new requests."
          : "The rider cancelled this ride. You're back in the queue for new requests.");
      }
    });
  }, [booking, online, on]);

  const backToSearching = useCallback(() => {
    setBooking(null);
    setPhase(online ? "searching" : "idle");
  }, [online]);

  /* 30 s offer: countdown + repeating vibration until answered */
  useEffect(() => {
    if (phase !== "requesting" || !booking) return;
    setTimeLeft(OFFER_SECONDS);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Vibration.vibrate([0, 600, 400], true);
    const started = Date.now();
    const timer = setInterval(() => {
      const left = OFFER_SECONDS - Math.floor((Date.now() - started) / 1000);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(timer);
        declined.current.add(booking.id);
        backToSearching();
      }
    }, 250);
    return () => { clearInterval(timer); Vibration.cancel(); };
  }, [phase, booking, backToSearching]);

  const accept = useCallback(async () => {
    if (!booking || acting) return;
    setActing(true);
    Vibration.cancel();
    try {
      await driverApi.acceptBooking(booking.id);
      declined.current.clear();
      if (isReservation(booking)) {
        setNotice("Reservation confirmed. You'll find it in your planned rides.");
        backToSearching();
      } else {
        setPhase("accepted");
        onAccepted?.();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setNotice("Another chauffeur accepted this ride first.");
      else setNotice(e instanceof ApiError ? e.message : "Couldn't accept the ride. Please try again.");
      backToSearching();
    } finally {
      setActing(false);
    }
  }, [booking, acting, backToSearching, onAccepted]);

  const decline = useCallback(() => {
    if (!booking) return;
    declined.current.add(booking.id);
    /* Releases a ride pre-assigned to this chauffeur back to the pool */
    driverApi.declineBooking(booking.id).catch(() => {});
    backToSearching();
  }, [booking, backToSearching]);

  /** The held ride ended (completed / handed back) */
  const finishActive = useCallback(() => backToSearching(), [backToSearching]);

  return {
    phase, booking, timeLeft, acting, notice,
    accept, decline, finishActive, restoreActive,
    clearNotice: () => setNotice(null),
  };
}

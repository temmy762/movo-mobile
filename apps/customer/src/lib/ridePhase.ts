/**
 * What the rider sees for a booking — derived from the booking itself, the
 * same states as the web tracking page. A reservation only shows "on the way"
 * once the chauffeur has actually set off (enRouteAt), never at assignment.
 * Safe Ride fills the same fields (arrivedAt / startedAt from the PRIMARY
 * chauffeur; the rider's trip completes when they're dropped off).
 */
import type { RideDetail } from "@movo/shared";
import { pickupLabel } from "./when";

export type RidePhase =
  | "searching" | "reserved" | "assigned" | "on_the_way" | "arrived" | "in_progress"
  | "completed" | "cancelled" | "no_driver";

export function ridePhase(r: RideDetail): RidePhase {
  if (r.status === "CANCELLED") return r.cancelledBy === "system_timeout" ? "no_driver" : "cancelled";
  if (r.status === "COMPLETED") return "completed";
  if (r.startedAt) return "in_progress";
  if (r.arrivedAt) return "arrived";
  if (r.scheduledAt && !r.enRouteAt) return r.driver ? "assigned" : "reserved";
  return r.driver ? "on_the_way" : "searching";
}

export const isLive = (p: RidePhase) => !["completed", "cancelled", "no_driver"].includes(p);
/* Cancelling is refused once the rider is in the car */
export const canCancel = (p: RidePhase) => ["searching", "reserved", "assigned", "on_the_way", "arrived"].includes(p);

export function headline(r: RideDetail, p: RidePhase): { title: string; body: string } {
  const care = r.bookingType === "CARE";
  const name = r.driver?.firstName ?? "Your chauffeur";
  const when = r.scheduledAt ? pickupLabel(r.scheduledAt) : "";
  switch (p) {
    case "searching":
      return care
        ? { title: "Assigning your Safe Ride chauffeur", body: "We're matching you with an available chauffeur. You'll be notified as soon as one accepts." }
        : { title: "Finding your chauffeur", body: "We're matching you with the best available chauffeur nearby." };
    case "reserved":
      return { title: "Ride reserved", body: `Pickup ${when}. We'll assign your chauffeur and let you know when they're on the way.` };
    case "assigned":
      return { title: "Chauffeur assigned", body: `${name} will pick you up ${when}. You'll be notified when they set off.` };
    case "on_the_way":
      return { title: `${name} is on the way`, body: "Your chauffeur is heading to your pickup." };
    case "arrived":
      return { title: `${name} has arrived`, body: "Your chauffeur is waiting at the pickup." };
    case "in_progress":
      return care
        ? { title: "On your way", body: `${name} is driving you to your destination in your vehicle.` }
        : { title: "On your way", body: "Enjoy your ride." };
    case "completed":
      return { title: "Trip complete", body: "Thank you for riding with Movo." };
    case "no_driver":
      return { title: "No chauffeur found", body: "We couldn't find an available chauffeur in time, so your ride was cancelled and fully refunded." };
    default:
      return { title: "Ride cancelled", body: r.cancelledBy === "admin" ? "This ride was cancelled by Movo support." : "This ride has been cancelled." };
  }
}

/* Cancellation policy wording (mirrors app/api/bookings/[id]/status) */
export function cancelPolicy(r: RideDetail, p: RidePhase): string {
  const withinFree = Date.now() - new Date(r.createdAt).getTime() < 5 * 60_000;
  if (!r.driver || p === "searching" || p === "reserved") return "No chauffeur has confirmed yet, so you'll receive a full refund.";
  if (withinFree) return "You're within 5 minutes of booking, so you'll receive a full refund.";
  return r.bookingType === "CARE"
    ? "Your chauffeur is already assigned. The return allowance is refunded in full and 50% of the Safe Ride service portion is refunded."
    : "Your chauffeur is already on the way, so 50% of your fare will be refunded.";
}

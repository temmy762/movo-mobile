/* In-ride Emergency button ("Alert Movo"), riders and chauffeurs alike.
   Logs an incident and alerts Movo's admins at once (email, SMS, in-app) with
   the ride and a map link. People are told to call 911 first. */
import { request } from "../client";

export const sos = (bookingId: string, coords?: { lat: number; lng: number } | null) =>
  request<{ ok: true; incidentId: string; repeated?: boolean }>("/api/sos", {
    body: { bookingId, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) },
  });

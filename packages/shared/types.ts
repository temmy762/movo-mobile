/* Hand-written API response shapes (mirroring the movo-web routes).
   Add a type here when an endpoint is wired up in packages/api. */
import type { CareAssignmentStatus, CareRole, DriverStatus, Role } from "./enums";

export type ApiDriver = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: DriverStatus;
};

export type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: Role;
};

/** GET /api/auth/me */
export type MeResponse =
  | { role: "DRIVER"; driver: ApiDriver }
  | { role: "USER" | "ADMIN"; user: ApiUser };

/** GET /api/app/config */
export type AppConfig = {
  minVersion: { chauffeur: string; customer: string };
  launch: { safeRide: boolean; inCity: boolean; airport: boolean; hourly: boolean; rental: boolean };
  timeZone: string;
  currency: string;
};

/** GET /api/driver/onboarding/status */
export type OnboardingStatus = {
  adminStatus: "NOT_SUBMITTED" | "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | string;
  adminNote?: string | null;
  type?: "INDIVIDUAL" | "FLEET" | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  driverId: string;
  tier: string | null;
  driverStatus: DriverStatus | null;
};

/** GET /api/driver/stats — earnings are the chauffeur's credited payouts */
export type DriverStats = {
  totalEarned: number;
  todayEarned: number;
  preBooked: number;
  tripsCompleted: number;
  tripsToday: number;
};

/** A ride offered to / held by the chauffeur (GET /api/bookings?status=PENDING,
    GET /api/driver/active-booking). `earning` is the chauffeur's payout. */
export type DriverBooking = {
  id: string;
  clientName: string;
  pickup: string;
  dropoff: string;
  carTier?: string;
  carName: string;
  total: number;
  fare?: number;
  earning?: number;
  scheduledAt?: string | null;
  paymentStatus: string;
  status: string;
  startedAt?: string | null;
  arrivedAt?: string | null;
  enRouteAt?: string | null;
  bookingNumber?: string | null;
  riderPhone?: string | null;
  user?: { phone: string | null } | null;
  passengers?: number | null;
  pickupInstructions?: string | null;
  stops?: unknown;
};

export type LocationPoint = { lat: number; lng: number; timestamp: number };

/* ── Safe Ride (Care) — GET /api/care/driver ── */

/* Status AWAITING_RETURN: PRIMARY delivered the customer and waits to be
   driven back to their own car (by SUPPORT, or an Uber booked by Dispatch) */
export type CareAssignment = {
  id: string;
  role: CareRole;
  status: CareAssignmentStatus;
  arrivedAt?: string | null;
  booking: {
    id: string;
    bookingNumber?: string | null;
    clientName: string;
    pickup: string;
    dropoff: string;
    carName: string;
    total: number;
    paymentStatus: string;
    status: string;
    /* "UBER" = Dispatch books PRIMARY an Uber back to their vehicle */
    returnMode?: string | null;
    uberReturnRef?: string | null;
    uberReturnBookedAt?: string | null;
    scheduledAt?: string | null;
    enRouteAt?: string | null;
    riderPhone?: string | null;
    user?: { phone: string | null } | null;
    passengers?: number | null;
    pickupInstructions?: string | null;
    stops?: unknown;
  };
};

export type CoDriver = {
  id: string;
  role: CareRole;
  status: CareAssignmentStatus;
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    photoUrl: string | null;
    vehicle: { make: string | null; model: string | null; plate: string | null } | null;
  };
};

export type CareDriverResponse = { assignment: CareAssignment | null; coDriver: CoDriver | null; earning: number };

/* GET /api/bookings/:id/messages — the rider and their chauffeur (Safe Ride: PRIMARY) */
export type BookingMessage = {
  id: string;
  sender: "driver" | "rider";
  text: string;
  createdAt: string;
};

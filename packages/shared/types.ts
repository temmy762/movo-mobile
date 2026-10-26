/* Hand-written API response shapes (mirroring the movo-web routes).
   Add a type here when an endpoint is wired up in packages/api. */
import type { DriverStatus, Role } from "./enums";

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

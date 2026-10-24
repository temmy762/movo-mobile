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

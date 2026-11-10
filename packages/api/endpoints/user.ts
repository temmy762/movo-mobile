import type { UserBooking, UserProfile } from "@movo/shared";
import { request } from "../client";

export const bookings = (tab?: "upcoming" | "past" | "canceled") =>
  request<{ bookings: UserBooking[] }>(`/api/user/bookings${tab ? `?tab=${tab}` : ""}`);

export const profile = () => request<{ user: UserProfile }>("/api/user/profile");

/* Refused (409) while a ride is active */
export const deleteAccount = () =>
  request<{ ok: true }>("/api/user/profile", { method: "DELETE", body: { confirm: "DELETE" } });

/* Same rules as the web's personal-info page: phone normalised to E.164
   server-side; 409 if the email or phone belongs to another account */
export const updateProfile = (body: { firstName?: string; lastName?: string; email?: string; phone?: string }) =>
  request<{ user: UserProfile }>("/api/user/profile", { method: "PATCH", body });

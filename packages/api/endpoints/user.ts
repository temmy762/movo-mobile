import type { UserBooking, UserProfile } from "@movo/shared";
import { request } from "../client";

export const bookings = (tab?: "upcoming" | "past" | "canceled") =>
  request<{ bookings: UserBooking[] }>(`/api/user/bookings${tab ? `?tab=${tab}` : ""}`);

export const profile = () => request<{ user: UserProfile }>("/api/user/profile");

/* Refused (409) while a ride is active */
export const deleteAccount = () =>
  request<{ ok: true }>("/api/user/profile", { method: "DELETE", body: { confirm: "DELETE" } });

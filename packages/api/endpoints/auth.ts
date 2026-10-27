import type { ApiDriver, MeResponse } from "@movo/shared";
import { request } from "../client";

export const driverLogin = (email: string, password: string) =>
  request<{ driver: ApiDriver; token: string }>("/api/auth/driver/login", { body: { email, password } });

export const me = () => request<MeResponse>("/api/auth/me");

export const logout = () => request<{ ok?: boolean }>("/api/auth/logout", { method: "POST" });

/* Always succeeds (the server doesn't reveal whether the email exists).
   The reset link opens the web reset page. */
export const driverForgotPassword = (email: string) =>
  request<{ success: true }>("/api/auth/driver/forgot-password", { body: { email } });

/* New chauffeur account (Winnipeg, Canada for now). 409 = email or phone already used.
   Password: at least 8 characters. */
export const driverRegister = (body: {
  firstName: string; lastName: string; email: string; phone?: string; password: string; country: string; city: string;
}) => request<{ driver: ApiDriver; token: string }>("/api/auth/driver/register", { body });

import type { ApiDriver, MeResponse } from "@movo/shared";
import { request } from "../client";

export const driverLogin = (email: string, password: string) =>
  request<{ driver: ApiDriver; token: string }>("/api/auth/driver/login", { body: { email, password } });

export const me = () => request<MeResponse>("/api/auth/me");

export const logout = () => request<{ ok?: boolean }>("/api/auth/logout", { method: "POST" });

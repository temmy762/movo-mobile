import type { ApiDriver, ApiUser, MeResponse } from "@movo/shared";
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

/* Chauffeur Google / Apple sign-in: a session for an existing chauffeur, or —
   new chauffeur — what "Complete your account" shows plus a 15-minute ticket */
export type DriverSocialSignup = {
  signup: { provider: "google" | "apple"; firstName: string; lastName: string; email: string };
  ticket: string;
};
export type DriverSocialResult = { driver: ApiDriver; token: string } | DriverSocialSignup;

/* Code from movochauffeur://google-auth?code=… plus the app's PKCE verifier */
export const driverGoogleExchange = (code: string, verifier: string) =>
  request<DriverSocialResult>("/api/auth/driver/google/exchange", { body: { code, verifier } });

/* rawNonce: the value whose SHA-256 was passed to Apple */
export const driverAppleSignIn = (body: {
  identityToken: string; rawNonce: string; authorizationCode?: string | null; firstName?: string | null; lastName?: string | null;
}) => request<DriverSocialResult>("/api/auth/driver/apple", { body });

/* Creates the account. 409 = phone already used; 401 = ticket expired. */
export const driverSocialComplete = (body: {
  ticket: string; firstName: string; lastName: string; phone: string; authorizationCode?: string | null;
}) => request<{ driver: ApiDriver; token: string }>("/api/auth/driver/social/complete", { body });

/* ── Customers (riders) ── */

export const login = (email: string, password: string) =>
  request<{ user: ApiUser; token: string }>("/api/auth/login", { body: { email, password } });

/* 409 = email or phone already used. Password: at least 8 characters. */
export const register = (body: {
  firstName: string; lastName: string; email: string; phone?: string; password: string; agreedToTerms: true;
}) => request<{ user: ApiUser; token: string }>("/api/auth/register", { body });

/* Always succeeds (the server doesn't reveal whether the email exists) */
export const forgotPassword = (email: string) =>
  request<{ success: true }>("/api/auth/forgot-password", { body: { email } });

/* "Continue with Google": swap the one-time code from the Google hand-off
   (movoprive://google-auth?code=…) plus the app's PKCE verifier for a session */
export const googleExchange = (code: string, verifier: string) =>
  request<{ user: ApiUser; token: string }>("/api/auth/google/exchange", { body: { code, verifier } });

/* Sign in with Apple (customer iOS app). rawNonce: the value whose SHA-256 was
   passed to Apple; Apple shares the name only on the first sign-in. */
export const appleSignIn = (body: {
  identityToken: string; rawNonce: string; authorizationCode?: string | null; firstName?: string | null; lastName?: string | null;
}) => request<{ user: ApiUser; token: string }>("/api/auth/apple", { body });

/**
 * Signed-in chauffeur: the session token lives in the device keychain
 * (expo-secure-store), never in AsyncStorage. Every API call and the socket
 * read it from here.
 */
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { ApiError, auth, configureApi } from "@movo/api";
import type { ApiDriver } from "@movo/shared";
import { forgetPushDevice } from "./push";

const TOKEN_KEY = "movo_session";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://movoprive.com";

type SessionState = {
  ready: boolean;
  token: string | null;
  driver: ApiDriver | null;
  /** Set by signUp so the application opens right after the account is created */
  justRegistered: boolean;
  restore: () => Promise<void>;
  /** Re-reads the chauffeur (status can change: approved, suspended, removed) */
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Creates the chauffeur account and signs in; the application comes next */
  signUp: (fields: Parameters<typeof auth.driverRegister>[0]) => Promise<void>;
  /** Google / Apple: an existing chauffeur is signed in; a new one gets
      pendingSignup and the "Complete your account" screen. Returns which. */
  signInWithGoogle: (code: string, verifier: string) => Promise<"signed-in" | "signup">;
  signInWithApple: (body: Parameters<typeof auth.driverAppleSignIn>[0]) => Promise<"signed-in" | "signup">;
  /** New chauffeur from Google / Apple, waiting for name + mobile number */
  pendingSignup: (auth.DriverSocialSignup & { authorizationCode?: string | null }) | null;
  completeSocialSignup: (fields: { firstName: string; lastName: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Drops the session locally (after account deletion — the server already ended it) */
  clear: () => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  token: null,
  driver: null,
  justRegistered: false,
  pendingSignup: null,

  async restore() {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return set({ ready: true });
    set({ token });
    await get().refresh();
    set({ ready: true });
  },

  async refresh() {
    if (!get().token) return;
    try {
      const me = await auth.me();
      if (me.role !== "DRIVER") return get().clear();
      set({ driver: me.driver });
    } catch {
      /* Offline: keep what we have and retry on the next foreground.
         A 401 has already signed out via onUnauthorized. */
    }
  },

  async signIn(email, password) {
    const { driver, token } = await auth.driverLogin(email.trim(), password);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, driver });
  },

  async signUp(fields) {
    const { driver, token } = await auth.driverRegister(fields);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, driver, justRegistered: true });
  },

  async signInWithGoogle(code, verifier) {
    return adoptSocial(await auth.driverGoogleExchange(code, verifier), null, set);
  },

  async signInWithApple(body) {
    return adoptSocial(await auth.driverAppleSignIn(body), body.authorizationCode ?? null, set);
  },

  async completeSocialSignup(fields) {
    const pending = get().pendingSignup;
    if (!pending) throw new ApiError(401, "This sign-up has expired. Please tap Continue with Google or Apple again.");
    const { driver, token } = await auth.driverSocialComplete({ ticket: pending.ticket, authorizationCode: pending.authorizationCode, ...fields });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, driver, justRegistered: true, pendingSignup: null });
  },

  async signOut() {
    if (get().token) await auth.logout().catch(() => {});
    await get().clear();
  },

  async clear() {
    await forgetPushDevice();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, driver: null });
  },
}));

async function adoptSocial(
  res: auth.DriverSocialResult,
  authorizationCode: string | null,
  set: (s: Partial<SessionState>) => void,
): Promise<"signed-in" | "signup"> {
  if ("signup" in res) {
    set({ pendingSignup: { ...res, authorizationCode } });
    return "signup";
  }
  await SecureStore.setItemAsync(TOKEN_KEY, res.token);
  set({ token: res.token, driver: res.driver, pendingSignup: null });
  return "signed-in";
}

/* Same wording as the web login page */
export function signInErrorMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return "Login failed. Please try again.";
  switch (e.status) {
    case 0: return e.message;
    case 401: return "Invalid email or password. Please check and try again.";
    case 403: return e.message || "Your account has been deactivated. Please contact support.";
    case 500: return "Server error. Please try again in a few moments.";
    default: return e.message || "Login failed. Please try again.";
  }
}

configureApi({
  baseUrl: API_URL,
  /* The background location task can run before the UI restored the session */
  getToken: () => useSession.getState().token ?? SecureStore.getItemAsync(TOKEN_KEY),
  onUnauthorized: () => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    useSession.setState({ token: null, driver: null });
  },
});

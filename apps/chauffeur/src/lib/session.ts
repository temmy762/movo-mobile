/**
 * Signed-in chauffeur: the session token lives in the device keychain
 * (expo-secure-store), never in AsyncStorage. Every API call and the socket
 * read it from here.
 */
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { ApiError, auth, configureApi } from "@movo/api";
import type { ApiDriver } from "@movo/shared";

const TOKEN_KEY = "movo_session";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://movoprive.com";

type SessionState = {
  ready: boolean;
  token: string | null;
  driver: ApiDriver | null;
  restore: () => Promise<void>;
  /** Re-reads the chauffeur (status can change: approved, suspended, removed) */
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Drops the session locally (after account deletion — the server already ended it) */
  clear: () => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  token: null,
  driver: null,

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

  async signOut() {
    if (get().token) await auth.logout().catch(() => {});
    await get().clear();
  },

  async clear() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, driver: null });
  },
}));

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
  getToken: () => useSession.getState().token,
  onUnauthorized: () => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    useSession.setState({ token: null, driver: null });
  },
});

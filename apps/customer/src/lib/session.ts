/**
 * Signed-in rider: the session token lives in the device keychain
 * (expo-secure-store), never in AsyncStorage. Every API call and the socket
 * read it from here.
 */
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { ApiError, auth, configureApi } from "@movo/api";
import type { ApiUser } from "@movo/shared";
import { forgetPushDevice } from "./push";

const TOKEN_KEY = "movo_session";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://movoprive.com";

type SessionState = {
  ready: boolean;
  token: string | null;
  user: ApiUser | null;
  restore: () => Promise<void>;
  /** Re-reads the account (it can be removed or changed on the web) */
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fields: Parameters<typeof auth.register>[0]) => Promise<void>;
  signOut: () => Promise<void>;
  /** Drops the session locally (after account deletion — the server already ended it) */
  clear: () => Promise<void>;
};

async function adopt(token: string, user: ApiUser, set: (s: Partial<SessionState>) => void) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  set({ token, user });
}

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  token: null,
  user: null,

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
      /* This app is for riders: a chauffeur or admin token is dropped */
      if (me.role !== "USER") return get().clear();
      set({ user: me.user });
    } catch {
      /* Offline: keep what we have and retry on the next foreground.
         A 401 has already signed out via onUnauthorized. */
    }
  },

  async signIn(email, password) {
    const { user, token } = await auth.login(email.trim().toLowerCase(), password);
    if (user.role !== "USER") {
      throw new ApiError(403, "This is a Movo Privé rider account sign-in. Chauffeurs use the Movo Chauffeur app.");
    }
    await adopt(token, user, set);
  },

  async signUp(fields) {
    const { user, token } = await auth.register(fields);
    await adopt(token, user, set);
  },

  async signOut() {
    if (get().token) await auth.logout().catch(() => {});
    await get().clear();
  },

  async clear() {
    await forgetPushDevice();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null });
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
  getToken: () => useSession.getState().token ?? SecureStore.getItemAsync(TOKEN_KEY),
  onUnauthorized: () => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    useSession.setState({ token: null, user: null });
  },
});

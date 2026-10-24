/**
 * Signed-in chauffeur: the session token lives in the device keychain
 * (expo-secure-store), never in AsyncStorage. Every API call and the socket
 * read it from here.
 */
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { auth, configureApi } from "@movo/api";
import type { ApiDriver } from "@movo/shared";

const TOKEN_KEY = "movo_session";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://movoprive.com";

type SessionState = {
  ready: boolean;
  token: string | null;
  driver: ApiDriver | null;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  token: null,
  driver: null,

  async restore() {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return set({ ready: true });
    set({ token });
    try {
      const me = await auth.me();
      if (me.role !== "DRIVER") {
        await get().signOut();
        return set({ ready: true });
      }
      set({ driver: me.driver, ready: true });
    } catch {
      /* Offline: keep the token and retry later. A 401 already signed out. */
      set({ ready: true });
    }
  },

  async signIn(email, password) {
    const { driver, token } = await auth.driverLogin(email.trim(), password);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, driver });
  },

  async signOut() {
    if (get().token) await auth.logout().catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, driver: null });
  },
}));

configureApi({
  baseUrl: API_URL,
  getToken: () => useSession.getState().token,
  onUnauthorized: () => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    useSession.setState({ token: null, driver: null });
  },
});

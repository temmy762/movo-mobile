/**
 * Online / offline. Remembered on the phone (like the web's localStorage
 * "driverOnline") so the shift survives an app restart.
 */
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { ApiError, driver as driverApi } from "@movo/api";
import { ONLINE_KEY, startShiftLocation, stopShiftLocation, type LocationAccess } from "./location";

type ShiftState = {
  online: boolean;
  busy: boolean;
  location: LocationAccess | null;
  error: string | null;
  /** Resume a shift that was on when the app closed */
  restore: () => Promise<void>;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  clearError: () => void;
};

export const useShift = create<ShiftState>((set, get) => ({
  online: false,
  busy: false,
  location: null,
  error: null,

  async restore() {
    if ((await SecureStore.getItemAsync(ONLINE_KEY)) === "true") await get().goOnline();
  },

  async goOnline() {
    set({ busy: true, error: null });
    try {
      const location = await startShiftLocation();
      if (location === "denied") {
        set({ location, error: "Movo needs your location to send you nearby ride requests. Allow location in Settings, then try again." });
        return;
      }
      await driverApi.setOnline(true);
      await SecureStore.setItemAsync(ONLINE_KEY, "true");
      set({ online: true, location });
    } catch (e) {
      await stopShiftLocation();
      set({ error: e instanceof ApiError ? e.message : "Couldn't go online. Please try again." });
    } finally {
      set({ busy: false });
    }
  },

  async goOffline() {
    set({ busy: true, error: null });
    await SecureStore.setItemAsync(ONLINE_KEY, "false");
    await stopShiftLocation();
    set({ online: false, busy: false });
    await driverApi.setOnline(false).catch(() => {});
  },

  clearError: () => set({ error: null }),
}));

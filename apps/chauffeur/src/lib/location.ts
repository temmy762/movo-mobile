/**
 * Shift location: while the chauffeur is online, their position goes to
 * /api/driver/location — in the foreground and in the background (Android
 * foreground service / iOS background location). A ping marks the chauffeur
 * online on the server, so nothing is sent once they go offline.
 *
 * The task is defined at module scope and this file is imported from the app
 * entry (index.ts), so it exists when the OS wakes the app in the background.
 */
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { ApiError, driver as driverApi } from "@movo/api";
import type { LocationPoint } from "@movo/shared";
import "./session"; // configures the API client (base URL + token)

const TASK = "movo-shift-location";
export const ONLINE_KEY = "movo_online";

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;

  /* Went offline or signed out since the OS queued these — stop, send nothing */
  if ((await SecureStore.getItemAsync(ONLINE_KEY)) !== "true") {
    await stopShiftLocation();
    return;
  }

  const points: LocationPoint[] = data.locations.map((l) => ({
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    timestamp: l.timestamp,
  }));
  try {
    await driverApi.sendLocation(points);
  } catch (e) {
    /* Session ended (signed out elsewhere / account removed) */
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await SecureStore.setItemAsync(ONLINE_KEY, "false");
      await stopShiftLocation();
    }
  }
});

export type LocationAccess = "always" | "foreground" | "denied";

/**
 * Asks for location (and, best-effort, background location) and starts
 * sharing. "foreground" means it works while the app is open only.
 */
export async function startShiftLocation(): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return "denied";
  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);

  if (!(await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false))) {
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15_000,
      distanceInterval: 50,
      deferredUpdatesInterval: 15_000,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "You're online",
        notificationBody: "Movo is sharing your location so you receive nearby ride requests.",
        notificationColor: "#131936",
        killServiceOnDestroy: false,
      },
    });
  }

  /* Send a first fix right away so the server has a fresh position */
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    .then((l) => driverApi.sendLocation([{ lat: l.coords.latitude, lng: l.coords.longitude, timestamp: l.timestamp }]))
    .catch(() => {});

  return bg?.status === "granted" ? "always" : "foreground";
}

export async function stopShiftLocation(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK).catch(() => {});
  }
}

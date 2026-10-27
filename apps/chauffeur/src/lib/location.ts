/**
 * Shift location: while the chauffeur is online, their position goes to
 * /api/driver/location — in the foreground and in the background (Android
 * foreground service / iOS background location). A ping marks the chauffeur
 * online on the server, so nothing is sent once they go offline.
 *
 * During a trip (after "Start Ride") the newest point also goes to the ride,
 * which relays it to the rider's live map, and updates come more often.
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
const TRIP_KEY = "movo_trip";

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await deliver(data.locations);
});

/* Foreground-only fallback where the background task can't run (Expo Go on
   Android has no background location) */
let watcher: Location.LocationSubscription | null = null;

async function deliver(locations: Location.LocationObject[]) {
  /* Went offline or signed out since the OS queued these — stop, send nothing */
  if ((await SecureStore.getItemAsync(ONLINE_KEY)) !== "true") {
    await stopShiftLocation();
    return;
  }

  const points: LocationPoint[] = locations.map((l) => ({
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
      return;
    }
  }

  const tripId = await SecureStore.getItemAsync(TRIP_KEY);
  if (tripId) {
    const { coords } = locations[locations.length - 1];
    await driverApi.tripLocation(tripId, {
      lat: coords.latitude,
      lng: coords.longitude,
      heading: coords.heading != null && coords.heading >= 0 ? coords.heading : undefined,
      speed: coords.speed != null && coords.speed >= 0 ? coords.speed : undefined,
    }).catch(async (e) => {
      /* The ride ended (completed / cancelled) — stop sending to it */
      if (e instanceof ApiError && (e.status === 409 || e.status === 403 || e.status === 404)) {
        await SecureStore.deleteItemAsync(TRIP_KEY);
      }
    });
  }
}

/* Every 15 s / 50 m on shift; every 5 s / 10 m on a trip (the web's rate) */
function trackingOptions(onTrip: boolean): Location.LocationTaskOptions {
  return {
    accuracy: onTrip ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
    timeInterval: onTrip ? 5_000 : 15_000,
    distanceInterval: onTrip ? 10 : 50,
    deferredUpdatesInterval: onTrip ? 5_000 : 15_000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: onTrip ? "Trip in progress" : "You're online",
      notificationBody: onTrip
        ? "Movo is sharing your location with your rider."
        : "Movo is sharing your location so you receive nearby ride requests.",
      notificationColor: "#131936",
      killServiceOnDestroy: false,
    },
  };
}

/**
 * Start (bookingId) or stop (null) relaying location to a trip. The running
 * task is restarted so the trip / shift update rate applies on both platforms.
 */
export async function setTripTracking(bookingId: string | null): Promise<void> {
  if (bookingId) await SecureStore.setItemAsync(TRIP_KEY, bookingId);
  else await SecureStore.deleteItemAsync(TRIP_KEY);
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK).catch(() => {});
    await Location.startLocationUpdatesAsync(TASK, trackingOptions(!!bookingId)).catch(() => {});
  } else if (watcher) {
    await startWatcher(!!bookingId);
  }
}

async function startWatcher(onTrip: boolean) {
  watcher?.remove();
  const { accuracy, timeInterval, distanceInterval } = trackingOptions(onTrip);
  watcher = await Location.watchPositionAsync({ accuracy, timeInterval, distanceInterval }, (l) => { deliver([l]); });
}

export type LocationAccess = "always" | "foreground" | "denied";

/**
 * Asks for location (and, best-effort, background location) and starts
 * sharing. "foreground" means it works while the app is open only.
 */
export async function startShiftLocation(): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return "denied";
  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);

  let background = true;
  if (!(await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false))) {
    const onTrip = !!(await SecureStore.getItemAsync(TRIP_KEY));
    try {
      await Location.startLocationUpdatesAsync(TASK, trackingOptions(onTrip));
    } catch {
      background = false;
      await startWatcher(onTrip);
    }
  }

  /* Send a first fix right away so the server has a fresh position */
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    .then((l) => driverApi.sendLocation([{ lat: l.coords.latitude, lng: l.coords.longitude, timestamp: l.timestamp }]))
    .catch(() => {});

  return background && bg?.status === "granted" ? "always" : "foreground";
}

export async function stopShiftLocation(): Promise<void> {
  watcher?.remove();
  watcher = null;
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK).catch(() => {});
  }
}

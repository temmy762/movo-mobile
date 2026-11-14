/**
 * What booking remembers on this phone, to save typing next time: the last
 * few addresses the rider picked, and their Safe Ride vehicle. Plus the
 * pickup from the phone's location when a booking opens.
 */
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { places } from "@movo/api";
import type { SafeRideVehicle } from "@movo/shared";

const RECENT_KEY = "movo_recent_places";
const VEHICLE_KEY = "movo_saferide_vehicle";
const MAX_RECENT = 5;

export async function getRecentPlaces(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(RECENT_KEY).catch(() => null);
  try {
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((a): a is string => typeof a === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export async function addRecentPlace(address: string): Promise<void> {
  const a = address.trim();
  if (!a) return;
  const list = (await getRecentPlaces()).filter((x) => x.toLowerCase() !== a.toLowerCase());
  await SecureStore.setItemAsync(RECENT_KEY, JSON.stringify([a, ...list].slice(0, MAX_RECENT))).catch(() => {});
}

export async function getSavedVehicle(): Promise<SafeRideVehicle | null> {
  const raw = await SecureStore.getItemAsync(VEHICLE_KEY).catch(() => null);
  try {
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v.make === "string" && typeof v.plate === "string" ? (v as SafeRideVehicle) : null;
  } catch {
    return null;
  }
}

export const saveVehicle = (v: SafeRideVehicle) =>
  SecureStore.setItemAsync(VEHICLE_KEY, JSON.stringify(v)).catch(() => {});

/** The street address where the phone is, or null (no permission, no fix, nothing found) */
export async function currentAddress(): Promise<string | null> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }))
      ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const r = await places.reverse(pos.coords.latitude, pos.coords.longitude);
    return r.address || null;
  } catch {
    return null;
  }
}

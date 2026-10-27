/**
 * Push notifications. movo-web already sends every chauffeur alert (new
 * requests, Safe Ride offers, cancellations, messages, reminders) to the
 * phones registered at /api/push/device, through the Expo push service.
 *
 * Ride requests use their own Android channel with the request chime at the
 * highest importance; everything else uses "default". In the foreground the
 * Home screen already shows (and rings for) requests, so those aren't shown
 * twice.
 *
 * Not available in Expo Go (no remote push on Android since SDK 53) or before
 * the app has an EAS project id — registration is skipped, nothing breaks.
 */
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { push as pushApi } from "@movo/api";
import { useShift } from "./shift";

const PUSH_TOKEN_KEY = "movo_push_token";
export const REQUEST_CHANNEL = "ride-requests";
const REQUEST_TYPES = new Set(["new_booking", "care_primary", "care_support"]);

export const isRequestPush = (data: unknown) =>
  REQUEST_TYPES.has(String((data as { type?: unknown } | null)?.type ?? ""));

Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    /* Online, Home already rings for requests; offline (a reservation sent
       to every chauffeur) the banner is the only way to hear about it */
    const quiet = isRequestPush(n.request.content.data) && useShift.getState().online;
    return {
      shouldShowBanner: !quiet,
      shouldShowList: true,
      shouldPlaySound: !quiet,
      shouldSetBadge: false,
    };
  },
});

async function ensureChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Ride updates",
    importance: AndroidImportance.HIGH,
    lightColor: "#C6BFB2",
  });
  await Notifications.setNotificationChannelAsync(REQUEST_CHANNEL, {
    name: "Ride requests",
    description: "New ride and Safe Ride requests while you're online",
    importance: AndroidImportance.MAX,
    sound: "ride_request.wav",
    vibrationPattern: [0, 600, 400, 600],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    lightColor: "#C6BFB2",
  });
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Asks for permission (once) and registers this phone for the signed-in chauffeur */
export async function registerForPush(): Promise<void> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !Device.isDevice) return;
  const id = projectId();
  if (!id) return;

  try {
    await ensureChannels();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await pushApi.registerDevice(token, Platform.OS === "ios" ? "ios" : "android", "chauffeur");
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (e) {
    console.warn("[push] registration failed", e);
  }
}

/** Sign-out: this phone stops receiving the account's alerts */
export async function forgetPushDevice(): Promise<void> {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null);
  if (!token) return;
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => {});
  await pushApi.unregisterDevice(token).catch(() => {});
}

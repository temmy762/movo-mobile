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
 * Not available in Expo Go (no remote push on Android since SDK 53, and its
 * native notifications module is older than this library) or before the app
 * has an EAS project id. The library is only loaded outside Expo Go —
 * importing it there crashes the app at startup.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import { isRunningInExpoGo } from "expo";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { push as pushApi } from "@movo/api";
import { useShift } from "./shift";

const PUSH_TOKEN_KEY = "movo_push_token";
export const REQUEST_CHANNEL = "ride-requests";
const REQUEST_TYPES = new Set(["new_booking", "care_primary", "care_support"]);

export const isRequestPush = (data: unknown) =>
  REQUEST_TYPES.has(String((data as { type?: unknown } | null)?.type ?? ""));

const inExpoGo = isRunningInExpoGo();

const Notifications: typeof import("expo-notifications") | null = inExpoGo
  ? null
  : require("expo-notifications"); // eslint-disable-line @typescript-eslint/no-require-imports

Notifications?.setNotificationHandler({
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

async function ensureChannels(N: typeof import("expo-notifications")) {
  if (Platform.OS !== "android") return;
  const { AndroidImportance, AndroidNotificationVisibility } = N;
  await N.setNotificationChannelAsync("default", {
    name: "Ride updates",
    importance: AndroidImportance.HIGH,
    lightColor: "#C6BFB2",
  });
  await N.setNotificationChannelAsync(REQUEST_CHANNEL, {
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
  const N = Notifications;
  const id = projectId();
  if (!N || !Device.isDevice || !id) return;

  try {
    await ensureChannels(N);
    let { status } = await N.getPermissionsAsync();
    if (status !== "granted") ({ status } = await N.requestPermissionsAsync());
    if (status !== "granted") return;

    const { data: token } = await N.getExpoPushTokenAsync({ projectId: id });
    await pushApi.registerDevice(token, Platform.OS === "ios" ? "ios" : "android", "chauffeur");
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (e) {
    console.warn("[push] registration failed", e);
  }
}

type PushData = { type?: string; bookingId?: string };

/** Calls `onTap` with the alert's data when the chauffeur taps one (including the one that launched the app) */
export function onNotificationTap(onTap: (data: PushData) => void): () => void {
  if (!Notifications) return () => {};
  const dataOf = (r: { notification: { request: { content: { data?: unknown } } } }) =>
    (r.notification.request.content.data ?? {}) as PushData;
  const last = Notifications.getLastNotificationResponse();
  if (last) onTap(dataOf(last));
  const sub = Notifications.addNotificationResponseReceivedListener((r) => onTap(dataOf(r)));
  return () => sub.remove();
}

/** Sign-out: this phone stops receiving the account's alerts */
export async function forgetPushDevice(): Promise<void> {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null);
  if (!token) return;
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => {});
  await pushApi.unregisterDevice(token).catch(() => {});
}

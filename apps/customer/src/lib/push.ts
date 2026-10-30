/**
 * Push notifications. movo-web already sends every rider alert (chauffeur
 * assigned / on the way / arrived, trip started and completed, cancellations,
 * messages) to the phones registered at /api/push/device, through the Expo
 * push service.
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

const PUSH_TOKEN_KEY = "movo_push_token";

const Notifications: typeof import("expo-notifications") | null = isRunningInExpoGo()
  ? null
  : require("expo-notifications"); // eslint-disable-line @typescript-eslint/no-require-imports

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Asks for permission (once) and registers this phone for the signed-in rider */
export async function registerForPush(): Promise<void> {
  const N = Notifications;
  const id = projectId();
  if (!N || !Device.isDevice || !id) return;

  try {
    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("default", {
        name: "Ride updates",
        importance: N.AndroidImportance.HIGH,
        lightColor: "#C6BFB2",
      });
    }
    let { status } = await N.getPermissionsAsync();
    if (status !== "granted") ({ status } = await N.requestPermissionsAsync());
    if (status !== "granted") return;

    const { data: token } = await N.getExpoPushTokenAsync({ projectId: id });
    await pushApi.registerDevice(token, Platform.OS === "ios" ? "ios" : "android", "customer");
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (e) {
    console.warn("[push] registration failed", e);
  }
}

type PushData = { type?: string; bookingId?: string };

/** Calls `onTap` with the alert's data when the rider taps one (including the one that launched the app) */
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

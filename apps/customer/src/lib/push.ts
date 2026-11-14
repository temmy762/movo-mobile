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
import { ApiError, push as pushApi } from "@movo/api";
import { UPDATE_SOUNDS, getUpdateSound, iosSound, saveUpdateSound, soundLabel, updateChannelId } from "./alertSounds";

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
    const sound = await getUpdateSound();
    await ensureChannels(N, sound);
    let { status } = await N.getPermissionsAsync();
    if (status !== "granted") ({ status } = await N.requestPermissionsAsync());
    if (status !== "granted") return;

    const { data: token } = await N.getExpoPushTokenAsync({ projectId: id });
    await pushApi.registerDevice(token, Platform.OS === "ios" ? "ios" : "android", "customer", { updates: sound });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (e) {
    console.warn("[push] registration failed", e);
  }
}

/* "default" always exists (older pushes use it); plus the picked sound's
   channel. Channels for sounds no longer picked are removed so the phone's
   settings list only shows the one in use. */
async function ensureChannels(N: typeof import("expo-notifications"), sound: string) {
  if (Platform.OS !== "android") return;
  await N.setNotificationChannelAsync("default", {
    name: "Ride updates",
    importance: N.AndroidImportance.HIGH,
    lightColor: "#C6BFB2",
  });
  const picked = updateChannelId(sound);
  if (picked !== "default") {
    await N.setNotificationChannelAsync(picked, {
      name: `Ride updates (${soundLabel(sound)})`,
      importance: N.AndroidImportance.HIGH,
      sound: sound === "silent" ? null : `${sound}.wav`,
      enableVibrate: true,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: "#C6BFB2",
    });
  }
  const stale = UPDATE_SOUNDS.map((o) => updateChannelId(o.id)).filter((c) => c !== "default" && c !== picked);
  await Promise.all(stale.map((c) => N.deleteNotificationChannelAsync(c).catch(() => {})));
}

export type PushStatus = "on" | "off" | "blocked" | "unavailable";

/** Whether alerts can reach this phone: off = can ask, blocked = only the phone's settings can turn them on */
export async function getPushStatus(): Promise<PushStatus> {
  const N = Notifications;
  if (!N || !Device.isDevice) return "unavailable";
  const p = await N.getPermissionsAsync();
  return p.status === "granted" ? "on" : p.canAskAgain ? "off" : "blocked";
}

/** Asks for permission and registers this phone; returns the new status */
export async function enablePush(): Promise<PushStatus> {
  await registerForPush();
  return getPushStatus();
}

/** Saves the picked sound and tells movo-web, so the next alert uses it */
export async function setAlertSound(sound: string): Promise<void> {
  await saveUpdateSound(sound);
  const N = Notifications;
  if (!N) return;
  await ensureChannels(N, sound).catch(() => {});
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null);
  if (token) await pushApi.registerDevice(token, Platform.OS === "ios" ? "ios" : "android", "customer", { updates: sound });
}

/**
 * A test alert. Sent through movo-web and the push service — the same path
 * and sound as real ride alerts — so it proves alerts reach this phone. If
 * the server can't be reached, a local alert on the picked channel instead.
 * Throws with a message the screen can show.
 */
export async function sendTestNotification(): Promise<void> {
  const N = Notifications;
  if (!N) throw new Error("Notifications aren't available in this version of the app.");
  if ((await N.getPermissionsAsync()).status !== "granted") throw new Error("Turn notifications on first.");
  const sound = await getUpdateSound();
  await ensureChannels(N, sound).catch(() => {});

  let token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null);
  if (!token) { await registerForPush(); token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null); }
  if (token) {
    try {
      await pushApi.sendTest(token, "updates");
      return;
    } catch (e) {
      /* A real refusal is worth showing; no connection falls back to local */
      if (e instanceof ApiError && e.status !== 0 && e.status !== 404) throw new Error(e.message);
    }
  }
  await N.scheduleNotificationAsync({
    content: { title: "Movo Privé", body: "This is how your ride updates will sound.", sound: iosSound(sound) ?? false, data: { type: "test" } },
    trigger: Platform.OS === "android" ? { channelId: updateChannelId(sound) } : null,
  });
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

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
import { ApiError, push as pushApi } from "@movo/api";
import { SOUND_OPTIONS, channelId, getSounds, iosSound, saveSound, soundLabel, type SoundKind } from "./alertSounds";

const PUSH_TOKEN_KEY = "movo_push_token";
/* Same key as lib/location.ts ONLINE_KEY — read directly: importing the shift
   store here would make an import cycle (session → push → shift → location) */
const ONLINE_KEY = "movo_online";
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
    const quiet = isRequestPush(n.request.content.data) && (await SecureStore.getItemAsync(ONLINE_KEY)) === "true";
    return {
      shouldShowBanner: !quiet,
      shouldShowList: true,
      shouldPlaySound: !quiet,
      shouldSetBadge: false,
    };
  },
});

/* "default" and "ride-requests" always exist (older pushes use them); plus
   the picked sounds' channels. Channels for sounds no longer picked are
   removed so the phone's settings list only shows the ones in use. */
async function ensureChannels(N: typeof import("expo-notifications"), sounds: Record<SoundKind, string>) {
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

  const request = channelId("requests", sounds.requests);
  if (request !== REQUEST_CHANNEL) {
    await N.setNotificationChannelAsync(request, {
      name: `Ride requests (${soundLabel("requests", sounds.requests)})`,
      description: "New ride and Safe Ride requests while you're online",
      importance: AndroidImportance.MAX,
      sound: sounds.requests === "phone" ? "default" : `${sounds.requests}.wav`,
      vibrationPattern: [0, 600, 400, 600],
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      lightColor: "#C6BFB2",
    });
  }
  const update = channelId("updates", sounds.updates);
  if (update !== "default") {
    await N.setNotificationChannelAsync(update, {
      name: `Ride updates (${soundLabel("updates", sounds.updates)})`,
      importance: AndroidImportance.HIGH,
      sound: sounds.updates === "silent" ? null : `${sounds.updates}.wav`,
      enableVibrate: true,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: "#C6BFB2",
    });
  }

  const keep = new Set(["default", REQUEST_CHANNEL, request, update]);
  const stale = (["requests", "updates"] as const)
    .flatMap((k) => SOUND_OPTIONS[k].map((o) => channelId(k, o.id)))
    .filter((c) => !keep.has(c));
  await Promise.all([...new Set(stale)].map((c) => N.deleteNotificationChannelAsync(c).catch(() => {})));
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
    const sounds = await getSounds();
    await ensureChannels(N, sounds);
    let { status } = await N.getPermissionsAsync();
    if (status !== "granted") ({ status } = await N.requestPermissionsAsync());
    if (status !== "granted") return;

    const { data: token } = await N.getExpoPushTokenAsync({ projectId: id });
    await pushApi.registerDevice(token, Platform.OS === "ios" ? "ios" : "android", "chauffeur", sounds);
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (e) {
    console.warn("[push] registration failed", e);
  }
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

/** Saves a picked sound and tells movo-web, so the next alert uses it */
export async function setAlertSound(kind: SoundKind, sound: string): Promise<void> {
  await saveSound(kind, sound);
  const N = Notifications;
  if (!N) return;
  const sounds = await getSounds();
  await ensureChannels(N, sounds).catch(() => {});
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null);
  if (token) await pushApi.registerDevice(token, Platform.OS === "ios" ? "ios" : "android", "chauffeur", sounds);
}

/**
 * A test alert. Sent through movo-web and the push service — the same path
 * and sound as real alerts — so it proves alerts reach this phone. If the
 * server can't be reached, a local alert on the picked channel instead.
 * Throws with a message the screen can show.
 */
export async function sendTestNotification(kind: SoundKind): Promise<void> {
  const N = Notifications;
  if (!N) throw new Error("Notifications aren't available in this version of the app.");
  if ((await N.getPermissionsAsync()).status !== "granted") throw new Error("Turn notifications on first.");
  const sounds = await getSounds();
  await ensureChannels(N, sounds).catch(() => {});

  let token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null);
  if (!token) { await registerForPush(); token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null); }
  if (token) {
    try {
      await pushApi.sendTest(token, kind);
      return;
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0 && e.status !== 404) throw new Error(e.message);
    }
  }
  const sound = sounds[kind];
  await N.scheduleNotificationAsync({
    content: {
      title: kind === "requests" ? "New ride request" : "Movo Chauffeur",
      body: kind === "requests" ? "Test: this is how ride requests will sound." : "Test: this is how your other updates will sound.",
      sound: iosSound(sound) ?? false,
      data: { type: "test" },
    },
    trigger: Platform.OS === "android" ? { channelId: channelId(kind, sound) } : null,
  });
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

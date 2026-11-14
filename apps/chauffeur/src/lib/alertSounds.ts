/**
 * The alert sounds the chauffeur picks on the Notifications screen: one for
 * ride / Safe Ride requests, one for everything else. Saved on the phone and
 * sent with the push registration, so movo-web sends each alert with that
 * sound (iOS) on that sound's channel (Android — a channel's sound is fixed
 * once created, so there is one channel per sound). Ids, file names and
 * channel ids must match movo-web lib/pushSounds.ts.
 */
import * as SecureStore from "expo-secure-store";

export type SoundKind = "requests" | "updates";
export type SoundOption = { id: string; label: string; file: number | null };

const chime = require("../../assets/sounds/chime.wav");
const bell = require("../../assets/sounds/bell.wav");
const rise = require("../../assets/sounds/rise.wav");
export const REQUEST_CHIME = require("../../assets/sounds/ride_request.wav");

/* No "vibrate only" for requests — a silent request is a missed ride */
export const SOUND_OPTIONS: Record<SoundKind, SoundOption[]> = {
  requests: [
    { id: "ride_request", label: "Movo request", file: REQUEST_CHIME },
    { id: "chime", label: "Movo chime", file: chime },
    { id: "bell", label: "Bell", file: bell },
    { id: "rise", label: "Rise", file: rise },
    { id: "phone", label: "Phone default", file: null },
  ],
  updates: [
    { id: "phone", label: "Phone default", file: null },
    { id: "chime", label: "Movo chime", file: chime },
    { id: "bell", label: "Bell", file: bell },
    { id: "rise", label: "Rise", file: rise },
    { id: "silent", label: "Vibrate only", file: null },
  ],
};

const DEFAULTS: Record<SoundKind, string> = { requests: "ride_request", updates: "phone" };
const KEYS: Record<SoundKind, string> = { requests: "movo_request_sound", updates: "movo_update_sound" };

export async function getSound(kind: SoundKind): Promise<string> {
  const v = await SecureStore.getItemAsync(KEYS[kind]).catch(() => null);
  return SOUND_OPTIONS[kind].some((o) => o.id === v) ? (v as string) : DEFAULTS[kind];
}

export const getSounds = async (): Promise<Record<SoundKind, string>> =>
  ({ requests: await getSound("requests"), updates: await getSound("updates") });

export const saveSound = (kind: SoundKind, id: string) => SecureStore.setItemAsync(KEYS[kind], id).catch(() => {});

export function channelId(kind: SoundKind, id: string): string {
  if (kind === "requests") return id === "ride_request" ? "ride-requests" : `requests-${id}`;
  return id === "phone" ? "default" : `updates-${id}`;
}

/* iOS notification sound: the bundled file, the phone's default, or none */
export const iosSound = (id: string): string | null =>
  id === "silent" ? null : id === "phone" ? "default" : `${id}.wav`;

export const soundLabel = (kind: SoundKind, id: string) =>
  SOUND_OPTIONS[kind].find((o) => o.id === id)?.label ?? id;

/* The in-app request alert loops the picked sound ("Phone default" has no
   file in the app, so it loops the Movo request chime) */
export async function requestLoopFile(): Promise<number> {
  const id = await getSound("requests");
  return SOUND_OPTIONS.requests.find((o) => o.id === id)?.file ?? REQUEST_CHIME;
}

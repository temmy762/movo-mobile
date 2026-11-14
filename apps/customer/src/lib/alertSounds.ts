/**
 * The alert sound the rider picks on the Notifications screen. Saved on the
 * phone and sent with the push registration, so movo-web sends each alert
 * with that sound (iOS) on that sound's channel (Android — a channel's sound
 * is fixed once created, so there is one channel per sound). Ids, file names
 * and channel ids must match movo-web lib/pushSounds.ts.
 */
import * as SecureStore from "expo-secure-store";

export type SoundOption = { id: string; label: string; file: number | null };

export const UPDATE_SOUNDS: SoundOption[] = [
  { id: "phone", label: "Phone default", file: null },
  { id: "chime", label: "Movo chime", file: require("../../assets/sounds/chime.wav") },
  { id: "bell", label: "Bell", file: require("../../assets/sounds/bell.wav") },
  { id: "rise", label: "Rise", file: require("../../assets/sounds/rise.wav") },
  { id: "silent", label: "Vibrate only", file: null },
];

const UPDATE_KEY = "movo_update_sound";

export async function getUpdateSound(): Promise<string> {
  const v = await SecureStore.getItemAsync(UPDATE_KEY).catch(() => null);
  return UPDATE_SOUNDS.some((o) => o.id === v) ? (v as string) : "phone";
}

export const saveUpdateSound = (id: string) => SecureStore.setItemAsync(UPDATE_KEY, id).catch(() => {});

export const updateChannelId = (id: string) => (id === "phone" ? "default" : `updates-${id}`);

/* iOS notification sound: the bundled file, the phone's default, or none */
export const iosSound = (id: string): string | null =>
  id === "silent" ? null : id === "phone" ? "default" : `${id}.wav`;

export const soundLabel = (id: string) => UPDATE_SOUNDS.find((o) => o.id === id)?.label ?? "Phone default";

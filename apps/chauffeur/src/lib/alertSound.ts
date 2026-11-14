/**
 * The request sound, looped while a ride / Safe Ride offer is on screen (the
 * web's alert loop): the sound the chauffeur picked for requests
 * (Notifications → Settings), same as the push. Plays in silent mode and
 * ducks music or navigation audio instead of stopping it.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { requestLoopFile } from "./alertSounds";

let player: AudioPlayer | null = null;
let playerFile: number | null = null;
let stopped = true;

export async function startRequestAlert() {
  stopped = false;
  try {
    const file = await requestLoopFile();
    if (stopped) return;
    if (!player || playerFile !== file) {
      player?.remove();
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" }).catch(() => {});
      player = createAudioPlayer(file);
      playerFile = file;
      player.loop = true;
    }
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    /* No audio (e.g. muted output) — vibration still alerts */
  }
}

export function stopRequestAlert() {
  stopped = true;
  try {
    player?.pause();
  } catch {
    /* already stopped */
  }
}

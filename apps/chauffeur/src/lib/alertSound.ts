/**
 * The request chime, looped while a ride / Safe Ride offer is on screen (the
 * web's alert loop). Same sound as the "ride-requests" push channel. Plays in
 * silent mode and ducks music or navigation audio instead of stopping it.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

let player: AudioPlayer | null = null;

export function startRequestAlert() {
  try {
    if (!player) {
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" }).catch(() => {});
      player = createAudioPlayer(require("../../assets/sounds/ride_request.wav"));
      player.loop = true;
    }
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    /* No audio (e.g. muted output) — vibration still alerts */
  }
}

export function stopRequestAlert() {
  try {
    player?.pause();
  } catch {
    /* already stopped */
  }
}

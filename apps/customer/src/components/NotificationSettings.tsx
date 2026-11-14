/**
 * Notifications → Settings: whether alerts reach this phone (with the one tap
 * that fixes it), the alert sound (tap to hear it), and a test alert. The
 * rest (banners, lock screen, Do Not Disturb) stays in the phone's settings.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Icon, colors, fonts } from "@movo/ui";
import { UPDATE_SOUNDS, getUpdateSound, type SoundOption } from "@/lib/alertSounds";
import { enablePush, getPushStatus, sendTestNotification, setAlertSound, type PushStatus } from "@/lib/push";

const STATUS_TEXT: Record<PushStatus, { label: string; hint: string }> = {
  on: { label: "On", hint: "You'll be alerted when your chauffeur is assigned, on the way and arrived." },
  off: { label: "Off", hint: "Turn them on so you know when your chauffeur is on the way and has arrived." },
  blocked: { label: "Off", hint: "Notifications are turned off in your phone's settings for Movo Privé." },
  unavailable: { label: "Unavailable", hint: "Notifications aren't available on this device." },
};

export function NotificationSettings() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [sound, setSound] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);

  const refresh = useCallback(() => { getPushStatus().then(setStatus).catch(() => setStatus("unavailable")); }, []);

  useEffect(() => {
    refresh();
    getUpdateSound().then(setSound);
    /* Back from the phone's settings → show what changed */
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") refresh(); });
    return () => {
      sub.remove();
      player.current?.remove();
    };
  }, [refresh]);

  const preview = (o: SoundOption) => {
    if (!o.file) { Vibration.vibrate(o.id === "silent" ? [0, 250, 200, 250] : 200); return; }
    try {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      player.current?.remove();
      player.current = createAudioPlayer(o.file);
      player.current.play();
    } catch {
      /* no audio output — the choice is still saved */
    }
  };

  const pick = (o: SoundOption) => {
    preview(o);
    if (o.id === sound) return;
    setSound(o.id);
    setNote(null);
    setAlertSound(o.id).catch(() => setNote("Saved on this phone. It will apply next time you're online."));
  };

  const turnOn = async () => {
    if (status === "blocked") { Linking.openSettings(); return; }
    setBusy(true);
    setStatus(await enablePush().catch(() => "off" as const));
    setBusy(false);
  };

  const test = () => {
    setNote(null);
    sendTestNotification()
      .then(() => setNote("Test sent. It should arrive in a few seconds. If you don't hear it, check your phone isn't on silent or Do Not Disturb."))
      .catch((e) => setNote(e instanceof Error && e.message ? e.message : "Couldn't send a test notification."));
  };

  const st = status ? STATUS_TEXT[status] : null;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.label}>Push notifications</Text>
            <Text style={styles.hint}>{st?.hint ?? " "}</Text>
          </View>
          {st ? (
            <View style={[styles.pill, status === "on" ? styles.pillOn : styles.pillOff]}>
              <Text style={[styles.pillText, status === "on" ? { color: "#047857" } : { color: "#b91c1c" }]}>{st.label}</Text>
            </View>
          ) : <ActivityIndicator color={colors.navy} />}
        </View>
        {(status === "off" || status === "blocked") && (
          <Pressable onPress={turnOn} disabled={busy} style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.8 }]}
            accessibilityRole="button">
            <Text style={styles.primaryText}>{status === "blocked" ? "Open phone settings" : busy ? "Turning on…" : "Turn on notifications"}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.section}>Alert sound</Text>
      <View style={styles.card}>
        {UPDATE_SOUNDS.map((o, i) => {
          const on = o.id === sound;
          return (
            <Pressable key={o.id} onPress={() => pick(o)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={({ pressed }) => [styles.option, i > 0 && styles.divider, pressed && { opacity: 0.7 }]}>
              <View style={[styles.radio, on && styles.radioOn]}>
                {on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={[styles.optionText, on && { fontFamily: fonts.bodySemi }]}>{o.label}</Text>
              {o.file ? <Icon name="bell" size={14} color="#9ca3af" /> : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.footnote}>Tap a sound to hear it. It&apos;s used for every ride update on this phone.</Text>

      <Pressable onPress={test} disabled={status !== "on"} accessibilityRole="button"
        style={({ pressed }) => [styles.secondary, status !== "on" && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}>
        <Icon name="send" size={15} color={colors.navy} />
        <Text style={styles.secondaryText}>Send a test notification</Text>
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <Pressable onPress={() => Linking.openSettings()} style={styles.more} accessibilityRole="button">
        <Text style={styles.footnote}>Banners, lock screen and Do Not Disturb are in your phone&apos;s settings.</Text>
        <Text style={styles.link}>Open phone settings</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#111827" },
  hint: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillOn: { backgroundColor: "#d1fae5" },
  pillOff: { backgroundColor: "#fee2e2" },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  primary: { backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8, marginLeft: 4 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: "#111827" },
  footnote: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17, textAlign: "center", paddingHorizontal: 8 },
  secondary: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.navy, borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.navy },
  note: { fontFamily: fonts.body, fontSize: 12, color: "#374151", textAlign: "center", lineHeight: 17 },
  more: { alignItems: "center", gap: 4, paddingTop: 16 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
});

/**
 * Safe Ride photo walk-around (Movo chauffeur guide, page 11) — PRIMARY only.
 *   PICKUP:  four sides, interior, odometer, fuel; existing damage noted; the
 *            customer confirms. The trip can't start until this is saved.
 *   DROPOFF: odometer and fuel before "Customer Dropped Off".
 * The server checks the same rules (movo-web lib/safeRideInspection.ts).
 */
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ApiError, care as careApi } from "@movo/api";
import { Icon, colors, fonts } from "@movo/ui";
import { dark } from "./homeKit";
import { GradientButton } from "./tripParts";

type Stage = "PICKUP" | "DROPOFF";
type State = Awaited<ReturnType<typeof careApi.inspection>>;

const LABELS: Record<string, string> = {
  FRONT: "Front", BACK: "Back", LEFT: "Left side", RIGHT: "Right side",
  INTERIOR: "Interior", ODOMETER: "Odometer", FUEL: "Fuel gauge",
};

export function WalkAround({ bookingId, stage, onCompleted }: { bookingId: string; stage: Stage; onCompleted?: () => void }) {
  const [state, setState] = useState<State | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    careApi.inspection(bookingId, stage)
      .then((s) => { setState(s); if (s.damageNotes) setNotes(s.damageNotes); })
      .catch(() => setError("Couldn't load the walk-around. Pull to refresh or try again."));
  }, [bookingId, stage]);
  useEffect(() => { load(); }, [load]);

  const take = async (slot: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera needed", "Allow camera access in your phone's settings to take the walk-around photos.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.5 });
    const a = res.canceled ? null : res.assets[0];
    if (!a) return;
    setUploading(slot);
    setError(null);
    try {
      const type = a.mimeType ?? "image/jpeg";
      setState(await careApi.uploadInspectionPhoto(bookingId, stage, slot,
        { uri: a.uri, name: `${slot.toLowerCase()}.${type.split("/")[1] ?? "jpg"}`, type }));
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Upload failed — check your connection and try again.");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      setState(await careApi.completeInspection(bookingId, stage, notes, confirmed));
      onCompleted?.();
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!state) {
    return error ? <Text style={s.error}>{error}</Text> : <ActivityIndicator color={dark.soft} style={{ paddingVertical: 12 }} />;
  }
  if (state.completedAt) {
    return (
      <View style={s.done}>
        <Icon name="check" size={16} color="#4ade80" strokeWidth={2.5} />
        <Text style={s.doneText}>{stage === "PICKUP" ? "Walk-around saved. You can start the trip." : "Drop-off photos saved."}</Text>
      </View>
    );
  }

  const allTaken = state.required.every((r) => state.taken.includes(r));
  return (
    <View style={s.box}>
      <Text style={s.title}>{stage === "PICKUP" ? "Photo walk-around" : "Drop-off photos"}</Text>
      <Text style={s.sub}>
        {stage === "PICKUP"
          ? "Photograph the customer's vehicle before the trip starts. Note any existing damage, and have the customer confirm."
          : "Photograph the odometer and the fuel gauge before ending the trip."}
      </Text>
      <View style={s.grid}>
        {state.required.map((slot) => {
          const done = state.taken.includes(slot);
          return (
            <Pressable key={slot} onPress={() => take(slot)} disabled={!!uploading} accessibilityRole="button"
              accessibilityLabel={`${LABELS[slot] ?? slot}${done ? ", taken — tap to retake" : ""}`}
              style={[s.tile, done && s.tileDone]}>
              {uploading === slot ? <ActivityIndicator color={dark.soft} size="small" />
                : <Icon name={done ? "check" : "camera"} size={16} color={done ? "#4ade80" : dark.soft} strokeWidth={2.5} />}
              <Text style={[s.tileText, done && { color: "#fff" }]}>{LABELS[slot] ?? slot}</Text>
            </Pressable>
          );
        })}
      </View>
      {stage === "PICKUP" && (
        <>
          <TextInput value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholderTextColor="rgba(255,255,255,0.35)"
            placeholder="Existing damage (scratches, dents, warning lights) — or leave blank if none" style={s.notes} />
          <Pressable onPress={() => setConfirmed(!confirmed)} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} style={s.confirm}>
            <View style={[s.box2, confirmed && { backgroundColor: colors.taupe, borderColor: colors.taupe }]}>
              {confirmed && <Icon name="check" size={12} color={colors.navy} strokeWidth={3} />}
            </View>
            <Text style={s.confirmText}>The customer has seen the photos and notes and agrees with the vehicle&apos;s condition.</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={s.error}>{error}</Text>}
      <GradientButton title={saving ? "Saving…" : stage === "PICKUP" ? "Save walk-around" : "Save drop-off photos"}
        onPress={save} disabled={saving || !allTaken || (stage === "PICKUP" && !confirmed)} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "rgba(198,191,178,0.35)", backgroundColor: "rgba(255,255,255,0.04)" },
  title: { fontFamily: fonts.heading, fontSize: 15, color: "#fff" },
  sub: { fontFamily: fonts.body, fontSize: 12, color: dark.soft, lineHeight: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31%", minHeight: 64, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8 },
  tileDone: { borderColor: "rgba(74,222,128,0.5)", backgroundColor: "rgba(74,222,128,0.08)" },
  tileText: { fontFamily: fonts.bodySemi, fontSize: 11, color: dark.soft, textAlign: "center" },
  notes: { minHeight: 64, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", padding: 10, fontFamily: fonts.body, fontSize: 13, color: "#fff", textAlignVertical: "top" },
  confirm: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  box2: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center", marginTop: 1 },
  confirmText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: "#fff", lineHeight: 17 },
  done: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: "rgba(74,222,128,0.08)", borderWidth: 1, borderColor: "rgba(74,222,128,0.35)" },
  doneText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: "#bbf7d0" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#f87171" },
});

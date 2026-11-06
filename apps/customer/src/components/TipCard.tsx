/**
 * Tip the chauffeur after a completed ride — mirrors movo-web
 * home/rides/[id]/TipCard: charged to the card used for the booking, 100% goes
 * to the chauffeur. A 3D Secure check pops up here if the bank asks for one.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, rides } from "@movo/api";
import { colors, fonts } from "@movo/ui";
import { confirmExtraCharge } from "@/lib/pay";

const PRESETS = [5, 10, 15, 20];
const TIP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function TipCard({ id, tip, completedAt, name }: {
  id: string; tip?: number | null; completedAt?: string | null; name?: string;
}) {
  const queryClient = useQueryClient();
  const [paid, setPaid] = useState<number | null>(tip ?? null);
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  if (paid != null) {
    return (
      <View style={styles.done}>
        <Text style={styles.doneText}>You tipped ${paid.toFixed(2)}. Thank you!</Text>
      </View>
    );
  }
  if (completedAt && now - new Date(completedAt).getTime() > TIP_WINDOW_MS) return null;

  const amount = custom.trim() ? Number(custom) : preset;
  const valid = amount != null && Number.isFinite(amount) && amount >= 1 && amount <= 200;

  const send = async () => {
    if (!valid) return;
    setSending(true);
    setError(null);
    try {
      let res = await rides.tip(id, { amount });
      if ("requiresAction" in res) {
        await confirmExtraCharge(res.clientSecret);
        res = await rides.tip(id, { confirmedIntentId: res.intentId });
      }
      if ("tip" in res) setPaid(res.tip ?? amount);
      queryClient.invalidateQueries({ queryKey: ["ride", id] });
      queryClient.invalidateQueries({ queryKey: ["receipt", id] });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? "Check your connection and try again."
        : e instanceof Error ? e.message : "Couldn't add your tip. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Add a tip{name ? ` for ${name}` : ""}</Text>
      <Text style={styles.sub}>100% goes to your chauffeur. Charged to the card you used for this ride.</Text>
      <View style={styles.presets}>
        {PRESETS.map((p) => {
          const on = !custom.trim() && preset === p;
          return (
            <Pressable key={p} onPress={() => { setPreset(p); setCustom(""); }} accessibilityRole="button"
              accessibilityState={{ selected: on }} style={[styles.preset, on && styles.presetOn]}>
              <Text style={[styles.presetText, on && { color: "#fff" }]}>${p}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput value={custom} onChangeText={setCustom} keyboardType="decimal-pad" placeholder="Other amount"
        placeholderTextColor="#9ca3af" accessibilityLabel="Other tip amount" style={styles.input} />
      {!!custom.trim() && !valid && <Text style={styles.error}>Enter an amount between $1 and $200.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable onPress={send} disabled={!valid || sending} accessibilityRole="button"
        style={[styles.btn, (!valid || sending) && { backgroundColor: "#d1d5db" }]}>
        <Text style={styles.btnText}>{sending ? "Adding tip…" : valid ? `Add $${amount.toFixed(2)} tip` : "Choose a tip"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  title: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  sub: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17, marginTop: -6 },
  presets: { flexDirection: "row", gap: 8 },
  preset: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  presetOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  presetText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#374151" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: "#111827" },
  btn: { minHeight: 46, borderRadius: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
  done: { padding: 12, borderRadius: 14, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  doneText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#166534" },
});

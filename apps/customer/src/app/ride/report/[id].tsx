/**
 * Report an issue / a lost item for a ride — mirrors movo-web
 * home/report-incident and home/report-lost-item (?kind=issue|lost).
 */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ApiError, rides } from "@movo/api";
import type { IncidentType } from "@movo/shared";
import { Button, Icon, colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";

/* The types the server accepts (api/incidents VALID_TYPES) */
const TYPES: { value: IncidentType; label: string }[] = [
  { value: "ACCIDENT", label: "Accident" },
  { value: "UNSAFE_DRIVING", label: "Unsafe Driving" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "VEHICLE_ISSUE", label: "Vehicle Issue" },
  { value: "ROUTE_DEVIATION", label: "Route Deviation" },
  { value: "OTHER", label: "Other" },
];

export default function Report() {
  const { id, kind, number } = useLocalSearchParams<{ id: string; kind?: string; number?: string }>();
  const lost = kind === "lost";
  const [type, setType] = useState<IncidentType>("OTHER");
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (lost && text.trim().length < 3) return setError("Please describe the item.");
    if (!lost && text.trim().length < 10) return setError("Please describe what happened in at least 10 characters.");
    setBusy(true);
    try {
      if (lost) await rides.reportLostItem({ bookingId: id, itemDescription: text.trim(), contactInfo: contact.trim() || undefined });
      else await rides.reportIncident({ bookingId: id, type, description: text.trim() });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/rides"));

  if (done) {
    return (
      <SafeAreaView style={styles.done}>
        <View style={styles.badge}><Icon name="check" size={28} color="#16a34a" strokeWidth={2.5} /></View>
        <Text style={styles.title}>{lost ? "Lost item reported" : "Report submitted"}</Text>
        <Text style={styles.body}>
          {lost
            ? `We've logged your lost item${number ? ` against booking ${number}` : ""}. Our team will contact you if it's found.`
            : "Our team will review your report shortly. Thank you for helping keep Movo safe."}
        </Text>
        <Button title="Done" onPress={close} style={{ alignSelf: "stretch" }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScreenHeader title={lost ? "Report a lost item" : "Report an issue"} subtitle={number ? `Booking ${number}` : undefined} fallback="/rides" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          {lost ? (
            <>
              <Text style={styles.label}>What did you leave behind? *</Text>
              <TextInput value={text} onChangeText={setText} multiline maxLength={500} placeholderTextColor="#9ca3af"
                placeholder="e.g. Black leather wallet, left on the back seat" style={[styles.input, styles.area]} />
              <Text style={styles.label}>Best way to reach you (optional)</Text>
              <TextInput value={contact} onChangeText={(v) => setContact(v.slice(0, 120))} placeholderTextColor="#9ca3af"
                placeholder="Phone or email" style={styles.input} />
            </>
          ) : (
            <>
              <Text style={styles.label}>What happened?</Text>
              <View style={styles.grid}>
                {TYPES.map((t) => (
                  <Pressable key={t.value} onPress={() => setType(t.value)} accessibilityRole="radio" accessibilityState={{ selected: type === t.value }}
                    style={[styles.type, type === t.value && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
                    <Text style={[styles.typeText, type === t.value && { color: "#fff" }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Describe what happened</Text>
              <TextInput value={text} onChangeText={setText} multiline maxLength={2000} placeholderTextColor="#9ca3af"
                placeholder="Please describe the issue clearly — what happened, when, and any relevant context…"
                style={[styles.input, styles.area, { minHeight: 140 }]} />
              <Text style={styles.small}>{text.trim().length} characters (min 10)</Text>
            </>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Submit" onPress={submit} loading={busy} />
          <Text style={styles.small}>In an emergency, call 911 first.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12, paddingBottom: 40 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, fontFamily: fonts.body, fontSize: 13, color: "#1f2937" },
  area: { minHeight: 100, textAlignVertical: "top" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: { width: "48.5%", paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center" },
  typeText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151" },
  small: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
  done: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: "#111827" },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 12, lineHeight: 19 },
});

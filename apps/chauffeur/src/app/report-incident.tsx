/**
 * Report an incident — mirrors movo-web driver/home/report-incident. Opened
 * from the trip card (linked to that ride) or from Profile (no ride).
 */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ApiError, driver as driverApi } from "@movo/api";
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

export default function ReportIncident() {
  const { bookingId, number } = useLocalSearchParams<{ bookingId?: string; number?: string }>();
  const [type, setType] = useState<IncidentType>("OTHER");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (description.trim().length < 10) return setError("Please describe the incident in at least 10 characters.");
    setLoading(true);
    setError(null);
    try {
      await driverApi.reportIncident({ bookingId: bookingId || undefined, type, description: description.trim() });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.done}>
        <View style={styles.doneBadge}><Icon name="check" size={28} color="#16a34a" strokeWidth={2.5} /></View>
        <Text style={styles.doneTitle}>Report Submitted</Text>
        <Text style={styles.doneBody}>Our team will review your incident report shortly. Thank you for keeping Movo safe.</Text>
        <Button title="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ alignSelf: "stretch" }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScreenHeader title="Report Incident" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          {bookingId ? (
            <View style={styles.linked}>
              <Text style={styles.linkedText}>Linked to booking #{number ?? bookingId.slice(0, 8)}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Incident Type</Text>
          <View style={styles.grid}>
            {TYPES.map((t) => {
              const on = type === t.value;
              return (
                <Pressable key={t.value} onPress={() => setType(t.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={[styles.type, on && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
                  <Text style={[styles.typeText, on && { color: "#fff" }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Describe What Happened</Text>
          <TextInput value={description} onChangeText={setDescription} multiline maxLength={2000}
            placeholder="Please describe the incident clearly — what happened, when, and any relevant context…"
            placeholderTextColor="#9ca3af" style={styles.textarea} />
          <Text style={styles.count}>{description.trim().length} characters (min 10)</Text>

          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Submit Report" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12, paddingBottom: 40 },
  linked: { backgroundColor: "#eff6ff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  linkedText: { fontFamily: fonts.body, fontSize: 12, color: "#1d4ed8" },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: { width: "48.5%", paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center" },
  typeText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151" },
  textarea: { minHeight: 140, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, fontFamily: fonts.body, fontSize: 13, color: "#1f2937", textAlignVertical: "top" },
  count: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
  done: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  doneBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  doneTitle: { fontFamily: fonts.heading, fontSize: 18, color: "#111827" },
  doneBody: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 12, lineHeight: 19 },
});

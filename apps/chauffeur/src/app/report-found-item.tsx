/**
 * Report an item found in the vehicle — mirrors movo-web
 * driver/home/report-found-item. Movo matches it against riders' lost-item reports.
 */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ApiError, driver as driverApi } from "@movo/api";
import { Button, Icon, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function ReportFoundItem() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [item, setItem] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (item.trim().length < 3) return setError("Please describe the item.");
    setLoading(true);
    setError(null);
    try {
      await driverApi.reportFoundItem({
        bookingId: bookingId || undefined,
        itemDescription: item.trim(),
        contactInfo: contact.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScreenHeader title="Report Found Item" fallback="/profile" />
      {submitted ? (
        <View style={styles.done}>
          <View style={styles.doneBadge}><Icon name="check" size={28} color="#16a34a" strokeWidth={2.5} /></View>
          <Text style={styles.doneTitle}>Report submitted</Text>
          <Text style={styles.body}>Thanks — our team will match this against any lost-item reports.</Text>
          <Button title="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} style={{ alignSelf: "stretch" }} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <Text style={styles.body}>Found something in your vehicle after a ride? Let us know so we can reunite it with its owner.</Text>
            <Text style={styles.label}>ITEM DESCRIPTION</Text>
            <TextInput value={item} onChangeText={setItem} multiline maxLength={500}
              placeholder="e.g. Black leather wallet, navy scarf…" placeholderTextColor="#9ca3af"
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} />
            <Text style={styles.label}>YOUR CONTACT INFO (OPTIONAL)</Text>
            <TextInput value={contact} onChangeText={setContact} maxLength={200}
              placeholder="Best way to reach you" placeholderTextColor="#9ca3af" style={styles.input} />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title="Submit" onPress={submit} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 10, paddingBottom: 40 },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", lineHeight: 19, textAlign: "left" },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#6b7280", letterSpacing: 0.6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, fontFamily: fonts.body, fontSize: 13, color: "#1f2937" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  doneBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  doneTitle: { fontFamily: fonts.heading, fontSize: 18, color: "#111827" },
});

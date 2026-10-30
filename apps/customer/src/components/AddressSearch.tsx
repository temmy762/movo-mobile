/**
 * Full-screen address search (the web's Places autocomplete): suggestions as
 * the rider types (through the server — /api/places/autocomplete), plus "Use
 * current location" for the pickup. Mounted only while open (a fresh search
 * and Google session each time).
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { ApiError, places } from "@movo/api";
import type { PlaceSuggestion } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";

const newSession = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export function AddressSearch({ title, initial, allowCurrentLocation, onPick, onClose }: {
  title: string;
  initial?: string;
  allowCurrentLocation?: boolean;
  onPick: (address: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial ?? "");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session] = useState(newSession);
  const query = text.trim();
  const shown = query.length >= 2 ? results : [];

  /* Debounced suggestions; a newer keystroke cancels the older request */
  useEffect(() => {
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      places.autocomplete(query, session, ctrl.signal)
        .then((r) => { setResults(r.suggestions); setError(null); })
        .catch((e) => { if (!ctrl.signal.aborted) setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't search addresses. Check your connection."); })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, session]);

  const useCurrent = async () => {
    setLocating(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") throw new Error("Allow location access to use your current location.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const r = await places.reverse(pos.coords.latitude, pos.coords.longitude);
      onPick(r.address);
    } catch (e) {
      setError(e instanceof ApiError ? (e.status === 404 ? "We couldn't find a street address here — please type it." : e.message)
        : e instanceof Error ? e.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.back} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="back" size={18} color="#374151" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.inputWrap}>
          <TextInput value={text} onChangeText={setText} placeholder="Search for an address" placeholderTextColor="#9ca3af"
            style={styles.input} autoFocus autoCorrect={false} returnKeyType="search" />
          {loading && query.length >= 2 && <ActivityIndicator color={colors.navy} />}
        </View>

        {allowCurrentLocation && (
          <Pressable onPress={useCurrent} disabled={locating} style={styles.row} accessibilityRole="button">
            <View style={styles.rowIcon}>{locating ? <ActivityIndicator size="small" color={colors.navy} /> : <Icon name="navigation" size={16} color={colors.navy} />}</View>
            <Text style={styles.rowMain}>Use current location</Text>
          </Pressable>
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        <FlatList
          data={shown}
          keyExtractor={(r) => r.placeId}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => onPick(item.description)} style={styles.row} accessibilityRole="button">
              <View style={styles.rowIcon}><Icon name="home" size={15} color="#6b7280" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMain} numberOfLines={1}>{item.main}</Text>
                {item.secondary ? <Text style={styles.rowSub} numberOfLines={1}>{item.secondary}</Text> : null}
              </View>
            </Pressable>
          )}
          ListFooterComponent={shown.length ? <Text style={styles.powered}>Results by Google</Text> : undefined}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.heading, fontSize: 17, color: "#111827" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fafafa" },
  input: { flex: 1, paddingVertical: 13, fontFamily: fonts.body, fontSize: 15, color: "#111827" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  rowIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  rowMain: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#1f2937" },
  rowSub: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", marginTop: 1 },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", paddingHorizontal: 16, paddingVertical: 8 },
  powered: { fontFamily: fonts.body, fontSize: 10, color: "#9ca3af", textAlign: "right", padding: 12 },
});

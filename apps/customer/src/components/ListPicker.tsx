/**
 * A tappable field that opens a full-screen list to pick from (the app's
 * dropdown), with a search box for long lists and an optional "Other" row.
 */
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, colors, fonts } from "@movo/ui";

export const OTHER = "__other";

export function ListPicker({ label, value, placeholder, options, allowOther, disabled, onPick }: {
  label: string;
  /** Shown in the field; empty shows the placeholder */
  value: string;
  placeholder: string;
  options: string[];
  /** Adds "Other (type it)" — picking it calls onPick(OTHER) */
  allowOther?: boolean;
  disabled?: boolean;
  onPick: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
  const pick = (v: string) => { setOpen(false); setQ(""); onPick(v); };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} disabled={disabled} style={[styles.field, disabled && styles.fieldOff]}
        accessibilityRole="button" accessibilityLabel={`${label}: ${value || placeholder}`}>
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        <View style={{ transform: [{ rotate: "90deg" }] }}>
          <Icon name="chevronRight" size={16} color={disabled ? "#d1d5db" : "#6b7280"} />
        </View>
      </Pressable>

      {open && (
        <Modal visible animationType="slide" onRequestClose={() => setOpen(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <View style={styles.header}>
              <Pressable onPress={() => setOpen(false)} style={styles.back} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="back" size={18} color="#374151" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.title}>{label}</Text>
            </View>
            {options.length > 12 && (
              <TextInput value={q} onChangeText={setQ} placeholder={`Search ${label.toLowerCase()}`} placeholderTextColor="#9ca3af"
                style={styles.search} autoCorrect={false} />
            )}
            <FlatList
              data={shown}
              keyExtractor={(o) => o}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item)} style={styles.row} accessibilityRole="button" accessibilityState={{ selected: item === value }}>
                  <Text style={[styles.rowText, item === value && styles.rowOn]}>{item}</Text>
                  {item === value && <Icon name="check" size={16} color={colors.navy} strokeWidth={2.5} />}
                </Pressable>
              )}
              ListFooterComponent={allowOther ? (
                <Pressable onPress={() => pick(OTHER)} style={styles.row} accessibilityRole="button">
                  <Text style={[styles.rowText, { color: colors.navy }]}>Other (type it)</Text>
                </Pressable>
              ) : undefined}
            />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 13 },
  fieldOff: { backgroundColor: "#f9fafb" },
  fieldText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: "#111827" },
  placeholder: { color: "#9ca3af" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.heading, fontSize: 17, color: "#111827" },
  search: { marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fafafa", fontFamily: fonts.body, fontSize: 15, color: "#111827" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  rowText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: "#1f2937" },
  rowOn: { fontFamily: fonts.bodySemi, color: colors.navy },
});

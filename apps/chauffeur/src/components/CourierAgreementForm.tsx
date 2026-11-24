/**
 * A chauffeur asking for Movo Courier: their approved documents are reused,
 * so they sign the Courier Driver Agreement and confirm their insurance
 * covers courier work (mirrors movo-web components/CourierAgreementForm).
 */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { COURIER_AGREEMENT, COURIER_AGREEMENT_VERSION, COURIER_DRIVER_RESPONSIBILITIES } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";

export function CheckRow({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <View style={[styles.box, on && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
        {on && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}
      </View>
      <Text style={styles.checkText}>{children}</Text>
    </Pressable>
  );
}

export function AgreementText({ withResponsibilities }: { withResponsibilities?: boolean }) {
  return (
    <ScrollView style={styles.doc} nestedScrollEnabled>
      <Text style={styles.docTitle}>Movo Courier Driver Agreement</Text>
      <Text style={styles.docVersion}>Version {COURIER_AGREEMENT_VERSION}</Text>
      {COURIER_AGREEMENT.map((c) => (
        <Text key={c.h} style={styles.docText}><Text style={styles.docHead}>{c.h}. </Text>{c.p}</Text>
      ))}
      {withResponsibilities && (
        <>
          <Text style={[styles.docHead, { marginTop: 6 }]}>Driver responsibilities</Text>
          {COURIER_DRIVER_RESPONSIBILITIES.map((r) => <Text key={r} style={styles.docText}>• {r}</Text>)}
        </>
      )}
    </ScrollView>
  );
}

export function CourierAgreementForm({ busy, onSubmit, onCancel }: {
  busy: boolean;
  onSubmit: (v: { agreementName: string; insuranceConfirmed: true }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [signed, setSigned] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const ready = name.trim().length >= 3 && signed && insurance && !busy;

  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <Text style={styles.muted}>Your approved documents are reused — just sign the agreement and confirm your insurance.</Text>
      <AgreementText withResponsibilities />
      <TextInput value={name} onChangeText={setName} placeholder="Type your full legal name to sign" placeholderTextColor="#9ca3af"
        style={styles.input} accessibilityLabel="Signature (full legal name)" autoCapitalize="words" />
      <CheckRow on={signed} onChange={setSigned}>By typing my name, I sign the Movo Courier Driver Agreement.</CheckRow>
      <CheckRow on={insurance} onChange={setInsurance}>My vehicle insurance covers courier and delivery activities.</CheckRow>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {onCancel && (
          <Pressable onPress={onCancel} style={[styles.btn, styles.outline]} accessibilityRole="button">
            <Text style={[styles.btnText, { color: "#374151" }]}>Cancel</Text>
          </Pressable>
        )}
        <Pressable disabled={!ready} onPress={() => onSubmit({ agreementName: name.trim(), insuranceConfirmed: true })}
          style={[styles.btn, { backgroundColor: ready ? colors.navy : "#d1d5db" }]} accessibilityRole="button">
          <Text style={styles.btnText}>{busy ? "Sending…" : "Sign & request"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  doc: { maxHeight: 240, borderWidth: 1, borderColor: "#f1f1ee", backgroundColor: "#fafaf9", borderRadius: 12, padding: 12 },
  docTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#111827" },
  docVersion: { fontFamily: fonts.body, fontSize: 10, color: "#9ca3af", marginBottom: 8 },
  docHead: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#1f2937" },
  docText: { fontFamily: fonts.body, fontSize: 11, color: "#4b5563", lineHeight: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14, fontStyle: "italic", color: "#111827", backgroundColor: "#fff" },
  check: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: "#374151", lineHeight: 17 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  outline: { borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
});

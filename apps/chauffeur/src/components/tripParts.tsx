/* Pieces shared by the standard trip card and the Safe Ride card */
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, colors, fonts } from "@movo/ui";
import type { WaitingClock } from "@/lib/waiting";
import { dark, gradient, kit } from "./homeKit";

export function openNavigation(destination: string) {
  const dest = encodeURIComponent(destination);
  Linking.openURL(Platform.OS === "ios" ? `maps://?daddr=${dest}` : `https://www.google.com/maps/dir/?api=1&destination=${dest}`);
}

export const callNumber = (phone: string) => Linking.openURL(`tel:${phone}`);

export function GradientButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ flex: 1 }} accessibilityRole="button">
      {disabled ? (
        <View style={[kit.btn, { backgroundColor: "#4b5563" }]}><Text style={kit.btnText}>{title}</Text></View>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={kit.btn}>
          <Text style={kit.btnText}>{title}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[kit.btn, kit.btnOutline, { opacity: disabled ? 0.5 : 1 }]} accessibilityRole="button">
      <Text style={[kit.btnText, { color: dark.soft }]}>{title}</Text>
    </Pressable>
  );
}

export function SquareButton({ icon, label, onPress }: { icon: "navigation" | "phone"; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[kit.btnOutline, parts.square]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={18} color={dark.soft} />
    </Pressable>
  );
}

const tones = {
  neutral: { bg: "rgba(255,255,255,0.05)", fg: dark.soft },
  green: { bg: "rgba(74,222,128,0.1)", fg: dark.green },
  amber: { bg: "rgba(251,191,36,0.1)", fg: "#fbbf24" },
  red: { bg: "rgba(248,113,113,0.12)", fg: "#f87171" },
  gold: { bg: "rgba(198,191,178,0.12)", fg: colors.taupe },
};

export function Banner({ tone = "neutral", icon, children, right, onPress }: {
  tone?: keyof typeof tones; icon?: "check" | "alert" | "clock"; children: ReactNode; right?: ReactNode; onPress?: () => void;
}) {
  const t = tones[tone];
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[parts.banner, { backgroundColor: t.bg }]}>
      {icon && <Icon name={icon} size={14} color={t.fg} strokeWidth={2.5} />}
      <Text style={[parts.bannerText, { color: t.fg }]}>{children}</Text>
      {right}
    </Pressable>
  );
}

export function WaitingBanner({ waiting, freeLabel }: { waiting: WaitingClock; freeLabel: string }) {
  return waiting.freeLeft > 0 ? (
    <Banner right={
      <Text style={parts.clock}>{Math.floor(waiting.freeLeft / 60)}:{String(waiting.freeLeft % 60).padStart(2, "0")} left</Text>
    }>
      {freeLabel}
    </Banner>
  ) : (
    <Banner tone="amber" right={<Text style={[parts.clock, { color: "#fbbf24" }]}>${waiting.accrued.toFixed(2)}</Text>}>
      Wait charges accruing (${waiting.rate.toFixed(2)}/min)
    </Banner>
  );
}

export function RedOutlineButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={parts.redOutline} accessibilityRole="button">
      <Text style={parts.redText}>{title}</Text>
    </Pressable>
  );
}

/* Rate the rider when a trip ends; feedback is required at 3 stars or lower */
export function RatingModal({ visible, title, prompt, hints, onDone }: {
  visible: boolean; title: string; prompt: string;
  /** Feedback placeholder: [required (≤ 3 stars), optional] */
  hints: [string, string];
  onDone: (rating: number, feedback: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const needsFeedback = rating <= 3 && !feedback.trim();

  const submit = async () => {
    setSaving(true);
    await onDone(rating, feedback);
    setSaving(false);
    setRating(4);
    setFeedback("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={parts.overlay}>
        <View style={parts.sheet}>
          <Text style={parts.sheetTitle}>{title}</Text>
          <View style={parts.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setRating(s)} hitSlop={4} accessibilityLabel={`${s} star${s > 1 ? "s" : ""}`}>
                <Icon name="star" size={30} strokeWidth={1.5}
                  color={s <= rating ? "#f59e0b" : "#d1d5db"} fill={s <= rating ? "#f59e0b" : "none"} />
              </Pressable>
            ))}
          </View>
          <Text style={parts.sheetBody}>{prompt}</Text>
          <TextInput value={feedback} onChangeText={setFeedback} multiline maxLength={1000}
            placeholder={rating <= 3 ? hints[0] : hints[1]}
            placeholderTextColor="#9ca3af"
            style={[parts.textarea, needsFeedback && { borderColor: "#f59e0b" }]} />
          {needsFeedback && <Text style={parts.warnText}>Feedback is required for ratings of 3 stars or lower.</Text>}
          <Pressable onPress={submit} disabled={needsFeedback || saving} style={{ alignSelf: "stretch" }}>
            {needsFeedback || saving ? (
              <View style={[parts.sheetBtn, { backgroundColor: "#9ca3af" }]}>
                <Text style={parts.sheetBtnText}>{saving ? "Saving…" : "Ok"}</Text>
              </View>
            ) : (
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={parts.sheetBtn}>
                <Text style={parts.sheetBtnText}>Ok</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const parts = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  square: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  bannerText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16 },
  clock: { fontFamily: fonts.heading, fontSize: 13, color: colors.taupe },
  redOutline: { paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.4)", backgroundColor: "rgba(248,113,113,0.08)", alignItems: "center" },
  redText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#f87171" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", paddingHorizontal: 24 },
  sheet: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 16, color: "#111827", marginBottom: 6 },
  sheetBody: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 14, lineHeight: 18 },
  stars: { flexDirection: "row", gap: 6, marginVertical: 8 },
  textarea: { alignSelf: "stretch", minHeight: 64, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 13, color: "#374151", textAlignVertical: "top", marginBottom: 10 },
  errorText: { alignSelf: "stretch", fontFamily: fonts.body, fontSize: 11, color: "#dc2626", marginBottom: 10 },
  warnText: { alignSelf: "stretch", fontFamily: fonts.body, fontSize: 11, color: "#d97706", marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  sheetBtn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  sheetBtnOutline: { borderWidth: 1, borderColor: "#d1d5db" },
  sheetBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
});

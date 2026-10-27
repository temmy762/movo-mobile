/**
 * Banking — mirrors movo-web driver/home/profile/banking.
 *  - Automatic payouts: Stripe Connect onboarding in an in-app browser. Stripe
 *    returns through movo-web /app-return to movochauffeur://banking, which
 *    closes the browser; the status is re-read either way (in Expo Go the
 *    custom scheme can't return, so the chauffeur closes the browser).
 *  - Linked bank account: the details on file (masked), editable.
 * Also the deep-link target for movochauffeur://banking?connect=success|refresh.
 */
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { ApiError, driver as driverApi } from "@movo/api";
import type { BankingDetails } from "@movo/shared";
import { Button, Card, Icon, Input, colors, fonts, spacing } from "@movo/ui";

const FIELDS: { key: keyof BankingDetails; label: string; numeric?: boolean }[] = [
  { key: "bankAccountName", label: "Account Name" },
  { key: "bankInstitution", label: "Bank / Institution" },
  { key: "bankAccountNumber", label: "Account Number", numeric: true },
  { key: "bankRoutingNumber", label: "Routing Number", numeric: true },
];

export default function Banking() {
  const { connect } = useLocalSearchParams<{ connect?: string }>();
  const stripe = useQuery({ queryKey: ["stripe-connect"], queryFn: driverApi.stripeConnectStatus });
  const details = useQuery({ queryKey: ["banking"], queryFn: driverApi.bankingDetails });
  const [linking, setLinking] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(
    connect === "success" ? { text: "Bank account connected successfully!", ok: true }
      : connect === "refresh" ? { text: "The Stripe link expired — tap below to continue where you left off.", ok: false }
      : null,
  );
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Record<keyof BankingDetails, string>>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const active = stripe.data?.connected && stripe.data.status === "active";
  const banking = details.data?.banking;

  const connectStripe = async () => {
    setLinking(true);
    setNotice(null);
    try {
      const { url } = await driverApi.startStripeConnect();
      await WebBrowser.openAuthSessionAsync(url, "movochauffeur://banking");
      const fresh = await stripe.refetch();
      if (fresh.data?.status === "active") setNotice({ text: "Bank account connected successfully!", ok: true });
    } catch (e) {
      setNotice({ text: e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't open Stripe. Please try again.", ok: false });
    } finally {
      setLinking(false);
    }
  };

  const save = async () => {
    const fields = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v?.trim() ?? ""]).filter(([, v]) => v),
    ) as Partial<Record<keyof BankingDetails, string>>;
    if (!Object.keys(fields).length) return setFormError("Fill in at least one field to update.");
    setSaving(true);
    setFormError(null);
    try {
      await driverApi.updateBankingDetails(fields);
      setEditing(false);
      setForm({});
      setNotice({ text: "Banking details updated.", ok: true });
      details.refetch();
    } catch (e) {
      setFormError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} style={styles.back}
          accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="back" size={18} color="#374151" strokeWidth={2.5} />
        </Pressable>
        <View>
          <Text style={styles.title}>Banking Details</Text>
          <Text style={styles.subtitle}>Payout account for your earnings</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          {notice && (
            <Pressable onPress={() => setNotice(null)}
              style={[styles.notice, { backgroundColor: notice.ok ? "#dcfce7" : "#fef3c7" }]}>
              <Icon name={notice.ok ? "check" : "alert"} size={16} color={notice.ok ? "#15803d" : "#b45309"} />
              <Text style={[styles.noticeText, { color: notice.ok ? "#15803d" : "#b45309" }]}>{notice.text}</Text>
            </Pressable>
          )}

          <Card style={{ gap: 12 }}>
            <Text style={styles.cardTitle}>Automatic Payouts</Text>
            {stripe.isPending ? (
              <ActivityIndicator color={colors.navy} />
            ) : active ? (
              <View style={styles.row}>
                <View style={styles.okBadge}><Icon name="check" size={16} color="#15803d" strokeWidth={2.5} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.strong}>Connected to Stripe</Text>
                  <Text style={styles.muted}>Payouts are sent directly to your bank</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.muted}>
                  Connect your bank through Stripe so withdrawals from your wallet are sent automatically.
                  {stripe.data?.connected ? " You've started — finish the remaining steps." : ""}
                </Text>
                <Button title={stripe.data?.connected ? "Resume Onboarding" : "Connect Bank via Stripe"}
                  onPress={connectStripe} loading={linking} />
              </>
            )}
          </Card>

          {!editing ? (
            <Card style={{ gap: 12 }}>
              <View style={styles.between}>
                <Text style={styles.cardTitle}>Linked Bank Account</Text>
                <Pressable onPress={() => { setEditing(true); setFormError(null); }} hitSlop={8}>
                  <Text style={styles.link}>{banking ? "Edit" : "Add"}</Text>
                </Pressable>
              </View>
              {details.isPending ? (
                <ActivityIndicator color={colors.navy} />
              ) : banking && FIELDS.some((f) => banking[f.key]) ? (
                <>
                  {FIELDS.map((f) => (
                    <View key={f.key}>
                      <Text style={styles.label}>{f.label}</Text>
                      <Text style={styles.value}>{banking[f.key] ?? "—"}</Text>
                    </View>
                  ))}
                  <Text style={styles.muted}>Account numbers are masked for security.</Text>
                </>
              ) : (
                <View style={{ gap: 2 }}>
                  <Text style={styles.muted}>No banking details on file.</Text>
                  <Text style={styles.muted}>Add your bank account to receive payouts.</Text>
                </View>
              )}
            </Card>
          ) : (
            <Card style={{ gap: 12 }}>
              <View style={styles.between}>
                <Text style={styles.cardTitle}>Update Banking Details</Text>
                <Pressable onPress={() => { setEditing(false); setForm({}); }} hitSlop={8}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
              </View>
              {FIELDS.map((f) => (
                <Input key={f.key} label={f.label} value={form[f.key] ?? ""}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                  placeholder={banking?.[f.key] ?? ""} keyboardType={f.numeric ? "number-pad" : "default"}
                  autoCapitalize={f.numeric ? "none" : "words"} autoCorrect={false} />
              ))}
              <Text style={styles.muted}>Only fields you fill in will be updated. Leave blank to keep the existing value.</Text>
              {formError && <Text style={styles.error}>{formError}</Text>}
              <Button title="Save" onPress={save} loading={saving} />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.heading, fontSize: 17, color: "#111827" },
  subtitle: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af" },
  page: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  notice: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 14 },
  noticeText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 12 },
  cardTitle: { fontFamily: fonts.heading, fontSize: 14, color: "#1f2937" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  okBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  strong: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1f2937" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#9ca3af", lineHeight: 17 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
  cancel: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#9ca3af" },
  label: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af", marginBottom: 2 },
  value: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1f2937" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
});

/**
 * Wallet — mirrors movo-web driver/home/wallet: available balance, total and
 * pending earnings (trip earnings settle 48 h after the trip), withdraw to
 * bank, and the transaction list.
 */
import { useCallback, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ApiError, driver as driverApi } from "@movo/api";
import type { WalletTransaction } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { money } from "@/components/homeKit";

const TZ = "America/Winnipeg";

/* "Today, 3:50 PM" / "Oct 14, 3:50 PM" — Winnipeg time */
function when(iso: string) {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: TZ });
  const time = d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  const date = day(d) === day(new Date()) ? "Today" : d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
  return `${date}, ${time}`;
}

const title = (t: WalletTransaction) =>
  t.kind === "EARNING" ? "Trip earnings" : t.kind === "PAYOUT" ? "Withdrawal to bank" : "Top-up";

/* What the chauffeur needs to know about this money */
function pill(t: WalletTransaction) {
  if (t.status === "PENDING_SETTLEMENT") return { label: "Pending", bg: "#e0ecff", color: "#1d4ed8" };
  if (t.status === "PENDING") return { label: "Processing", bg: "#fef3c7", color: "#b45309" };
  if (t.status === "FAILED") return { label: "Failed", bg: "#fee2e2", color: "#dc2626" };
  return t.kind === "PAYOUT"
    ? { label: "Paid out", bg: "#f1f5f9", color: "#475569" }
    : { label: "Available", bg: "#dcfce7", color: "#15803d" };
}

function Transaction({ tx }: { tx: WalletTransaction }) {
  const isIn = tx.type === "in";
  const p = pill(tx);
  return (
    <View style={styles.tx}>
      <View style={[styles.txIcon, { backgroundColor: isIn ? "#e8f8ee" : "#fdecef" }]}>
        <Text style={[styles.txArrow, { color: isIn ? "#16a34a" : "#e11d48" }]}>{isIn ? "↓" : "↑"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txTitle}>{title(tx)}</Text>
        {tx.reference && <Text style={styles.txMeta}>{tx.reference}</Text>}
        <Text style={styles.txMeta}>{when(tx.date)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={[styles.txAmount, { color: isIn ? "#16a34a" : "#e11d48" }]}>{isIn ? "+" : "−"}{money(tx.amount)}</Text>
        <Text style={[styles.pill, { backgroundColor: p.bg, color: p.color }]}>{p.label}</Text>
      </View>
    </View>
  );
}

export default function WalletScreen() {
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: driverApi.wallet });
  const [withdrawing, setWithdrawing] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* Tabs stay mounted — re-read whenever this one is opened */
  const { refetch } = wallet;
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const available = wallet.data?.availableBalance ?? 0;
  const canWithdraw = !wallet.isPending && available > 0;

  const withdraw = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount.");
    if (value > available) return setError(`Insufficient balance. Available: ${money(available)}`);
    setSubmitting(true);
    setError(null);
    try {
      const res = await driverApi.requestPayout(Math.round(value * 100) / 100);
      setWithdrawing(false);
      setNotice(res.automated ? "Sent to your bank account." : "Withdrawal requested — Movo will process it shortly.");
      refetch();
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={wallet.isRefetching} onRefresh={() => { refetch(); }} />}>
        <Text style={styles.title}>Wallet</Text>

        <LinearGradient colors={["#131936", "#1a2048", "#6b6f85", "#C6BFB2"]} locations={[0, 0.55, 0.85, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balance}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {wallet.isPending
            ? <ActivityIndicator color="#fff" style={{ alignSelf: "flex-start", marginVertical: 14 }} />
            : <Text style={styles.balanceValue}>{money(available)}</Text>}
          <View style={styles.balanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Total Earned</Text>
              <Text style={styles.balanceSub}>{wallet.data ? money(wallet.data.totalEarned) : "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Pending Earnings</Text>
              <Text style={styles.balanceSub}>{wallet.data ? money(wallet.data.pendingEarnings) : "—"}</Text>
            </View>
          </View>
        </LinearGradient>

        {notice && (
          <Pressable onPress={() => setNotice(null)} style={styles.notice}>
            <Icon name="check" size={16} color="#15803d" />
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
        )}

        <Pressable disabled={!canWithdraw} accessibilityRole="button"
          onPress={() => { setAmount(available.toFixed(2)); setError(null); setWithdrawing(true); }}>
          {canWithdraw ? (
            <LinearGradient colors={["#0A0A0F", "#131936", "#2A3055"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.withdraw}>
              <Icon name="wallet" size={18} color="#fff" />
              <Text style={[styles.withdrawText, { color: "#fff" }]}>Withdraw to Bank</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.withdraw, { backgroundColor: "#e5e7eb" }]}>
              <Icon name="wallet" size={18} color="#4b5563" />
              <Text style={[styles.withdrawText, { color: "#4b5563" }]}>Withdraw to Bank</Text>
            </View>
          )}
        </Pressable>
        <Text style={styles.hint}>
          Funds become available after processing{wallet.data?.settlementHours ? ` (${wallet.data.settlementHours} hours after each trip)` : ""}.
        </Text>

        <Text style={styles.section}>Recent Transactions</Text>
        {wallet.isError ? (
          <Text style={styles.hint}>Couldn&apos;t load your wallet. Pull down to try again.</Text>
        ) : wallet.data && !wallet.data.transactions.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.hint}>Your trip earnings will appear here.</Text>
          </View>
        ) : (
          wallet.data?.transactions.map((tx) => <Transaction key={tx.id} tx={tx} />)
        )}
      </ScrollView>

      <Modal visible={withdrawing} transparent animationType="fade" onRequestClose={() => setWithdrawing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Withdraw to Bank</Text>
            <Text style={styles.hint}>Available: {money(available)}</Text>
            <View style={styles.amountBox}>
              <Text style={styles.dollar}>$</Text>
              <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00"
                placeholderTextColor="#9ca3af" style={styles.amountInput} autoFocus />
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={() => setWithdrawing(false)} disabled={submitting} style={[styles.sheetBtn, styles.sheetOutline]}>
                <Text style={[styles.sheetBtnText, { color: "#374151" }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={withdraw} disabled={submitting || !amount}
                style={[styles.sheetBtn, { backgroundColor: submitting || !amount ? "#9ca3af" : colors.navy }]}>
                <Text style={styles.sheetBtnText}>{submitting ? "…" : "Withdraw"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f7fb" },
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.heading, fontSize: 22, color: "#111827", paddingHorizontal: 4 },
  balance: { borderRadius: 24, padding: 22 },
  balanceLabel: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.78)" },
  balanceValue: { fontFamily: fonts.heading, fontSize: 40, color: "#fff", marginTop: 2 },
  balanceRow: { flexDirection: "row", marginTop: 14 },
  balanceSub: { fontFamily: fonts.heading, fontSize: 20, color: "#fff", marginTop: 2 },
  divider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 18 },
  notice: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: "#dcfce7" },
  noticeText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: "#15803d" },
  withdraw: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 18 },
  withdrawText: { fontFamily: fonts.bodySemi, fontSize: 16 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", paddingHorizontal: 4 },
  section: { fontFamily: fonts.heading, fontSize: 17, color: "#111827", marginTop: 10, paddingHorizontal: 4 },
  tx: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 18, padding: 14 },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  txArrow: { fontFamily: fonts.heading, fontSize: 20 },
  txTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#111827" },
  txMeta: { fontFamily: fonts.body, fontSize: 12, color: "#9ca3af", marginTop: 1 },
  txAmount: { fontFamily: fonts.heading, fontSize: 16 },
  pill: { fontFamily: fonts.bodySemi, fontSize: 11, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  empty: { backgroundColor: "#fff", borderRadius: 18, paddingVertical: 32, alignItems: "center", gap: 4 },
  emptyTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#374151" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", padding: 16 },
  sheet: { backgroundColor: "#fff", borderRadius: 18, padding: 22, gap: 12 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 17, color: "#111827" },
  amountBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12 },
  dollar: { fontFamily: fonts.heading, fontSize: 16, color: "#6b7280" },
  amountInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, fontFamily: fonts.bodySemi, fontSize: 16, color: "#111827" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
  sheetBtn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetOutline: { borderWidth: 1, borderColor: "#d1d5db" },
  sheetBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
});

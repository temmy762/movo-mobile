/**
 * Receipt — mirrors movo-web home/rides/[id]/receipt: itemised charges,
 * receipt + booking numbers, card, trip. Share it as a PDF (expo-print +
 * expo-sharing) or email it to the account (POST …/receipt).
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";
import { ApiError, rides } from "@movo/api";
import type { Receipt } from "@movo/shared";
import { colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";

const money = (n: number) => `$${n.toFixed(2)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/* The same receipt as a printable page (for the PDF) */
function receiptHtml(r: Receipt) {
  const refunded = r.paymentStatus === "REFUNDED";
  const row = (l: string, v: string, bold = false) =>
    `<tr><td style="padding:6px 0;${bold ? "font-weight:700;" : ""}">${esc(l)}</td><td style="padding:6px 0;text-align:right;${bold ? "font-weight:700;" : ""}">${esc(v)}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111827;padding:32px;font-size:13px}
h1{font-size:20px;margin:0;color:#131936}.muted{color:#6b7280}.box{border-top:1px solid #e5e7eb;margin-top:18px;padding-top:14px}
table{width:100%;border-collapse:collapse}</style></head><body>
<h1>MOVO PRIVÉ</h1>
<p style="font-size:16px;font-weight:700;margin:18px 0 2px">${refunded ? "Receipt — refunded" : "Receipt"}</p>
${r.receiptNumber ? `<p class="muted" style="margin:0">${esc(r.receiptNumber)}</p>` : ""}
${r.bookingNumber ? `<p class="muted" style="margin:0">Booking ${esc(r.bookingNumber)}</p>` : ""}
<div class="box"><p class="muted" style="margin:0">Billed to</p><p style="margin:2px 0">${esc(r.customerName)}${r.customerEmail ? `<br/>${esc(r.customerEmail)}` : ""}</p>
<p class="muted" style="margin:10px 0 0">Date</p><p style="margin:2px 0">${esc(r.completedAt ?? r.bookedAt)} · ${esc(r.service)}</p></div>
<div class="box"><p class="muted" style="margin:0 0 4px">Trip</p><p style="margin:2px 0">From ${esc(r.pickup)}</p>
${r.stops.map((s, i) => `<p style="margin:2px 0">Stop ${i + 1}: ${esc(s)}</p>`).join("")}
<p style="margin:2px 0">To ${esc(r.dropoff)}</p>
${r.chauffeur ? `<p class="muted" style="margin:6px 0 0">Chauffeur: ${esc(r.chauffeur)}${r.vehicle ? ` · ${esc(r.vehicle)}` : ""}</p>` : ""}</div>
<div class="box"><table>${r.items.map((i) => row(i.label, money(i.amount))).join("")}${row("Total", money(r.total), true)}</table>
<p class="muted">${refunded ? "Refunded to" : "Paid with"} ${esc(r.card)}</p></div>
<p class="muted" style="margin-top:28px">Movo Privé · Winnipeg, Manitoba · movoprive.com<br/>Questions about this receipt? support@movoprive.com</p>
</body></html>`;
}

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = useQuery({ queryKey: ["receipt", id], queryFn: () => rides.receipt(id) });
  const [sharing, setSharing] = useState(false);
  const [email, setEmail] = useState<{ busy: boolean; ok?: boolean; msg?: string }>({ busy: false });
  const r = receipt.data;

  const sharePdf = async () => {
    if (!r) return;
    setSharing(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: receiptHtml(r) });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `Movo receipt ${r.receiptNumber ?? ""}`.trim() });
    } catch {
      setEmail({ busy: false, ok: false, msg: "Couldn't create the PDF. Please try again." });
    } finally {
      setSharing(false);
    }
  };

  const emailIt = async () => {
    setEmail({ busy: true });
    try {
      const res = await rides.emailReceipt(id);
      setEmail({ busy: false, ok: true, msg: `Sent to ${res.sentTo}.` });
    } catch (e) {
      setEmail({ busy: false, ok: false, msg: e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't send the email. Please try again." });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F2" }}>
      <ScreenHeader title="Receipt" fallback="/rides" />
      {receipt.isPending ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />
      ) : !r ? (
        <View style={styles.empty}>
          <Text style={styles.strong}>Receipt unavailable</Text>
          <Text style={styles.muted}>
            {receipt.error instanceof ApiError && receipt.error.status !== 0 ? receipt.error.message : "Couldn't load the receipt. Please try again."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.actions}>
            <Pressable onPress={sharePdf} disabled={sharing} style={styles.action} accessibilityRole="button">
              {sharing ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.actionText}>Share as PDF</Text>}
            </Pressable>
            <Pressable onPress={emailIt} disabled={email.busy} style={styles.action} accessibilityRole="button">
              {email.busy ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.actionText}>Email me this receipt</Text>}
            </Pressable>
          </View>
          {email.msg && <Text style={[styles.note, { color: email.ok ? "#15803d" : "#dc2626" }]}>{email.msg}</Text>}

          <View style={styles.card}>
            <Text style={styles.brand}>MOVO PRIVÉ</Text>
            <Text style={styles.title}>{r.paymentStatus === "REFUNDED" ? "Receipt — refunded" : "Receipt"}</Text>
            {r.receiptNumber && <Text style={styles.muted}>{r.receiptNumber}</Text>}
            {r.bookingNumber && <Text style={styles.muted}>Booking {r.bookingNumber}</Text>}

            <View style={styles.section}>
              <Text style={styles.label}>Billed to</Text>
              <Text style={styles.text}>{r.customerName}</Text>
              {r.customerEmail && <Text style={styles.muted}>{r.customerEmail}</Text>}
              <Text style={[styles.label, { marginTop: 10 }]}>Date</Text>
              <Text style={styles.text}>{r.completedAt ?? r.bookedAt}</Text>
              <Text style={styles.muted}>{r.service}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Trip</Text>
              <Text style={styles.text}><Text style={styles.muted}>From </Text>{r.pickup}</Text>
              {r.stops.map((s, i) => <Text key={`${i}-${s}`} style={styles.text}><Text style={styles.muted}>Stop {i + 1} </Text>{s}</Text>)}
              <Text style={styles.text}><Text style={styles.muted}>To </Text>{r.dropoff}</Text>
              {r.chauffeur && <Text style={styles.muted}>Chauffeur: {r.chauffeur}{r.vehicle ? ` · ${r.vehicle}` : ""}</Text>}
            </View>

            <View style={styles.section}>
              {r.items.map((i) => (
                <View key={i.label} style={styles.between}><Text style={styles.text}>{i.label}</Text><Text style={styles.text}>{money(i.amount)}</Text></View>
              ))}
              <View style={[styles.between, styles.totalRow]}><Text style={styles.strong}>Total</Text><Text style={styles.strong}>{money(r.total)}</Text></View>
              <Text style={styles.muted}>{r.paymentStatus === "REFUNDED" ? "Refunded to" : "Paid with"} {r.card}</Text>
            </View>
            <Text style={[styles.muted, { marginTop: 8 }]}>Movo Privé · Winnipeg, Manitoba · movoprive.com</Text>
            <Text style={styles.muted}>Questions about this receipt? support@movoprive.com</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { alignItems: "center", gap: 6, padding: 32 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy, textAlign: "center" },
  note: { fontFamily: fonts.body, fontSize: 12, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 18, gap: 2 },
  brand: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 2, color: colors.navy },
  title: { fontFamily: fonts.heading, fontSize: 18, color: "#111827", marginTop: 10 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", marginTop: 14, paddingTop: 12, gap: 3 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.6 },
  text: { fontFamily: fonts.body, fontSize: 13, color: "#1f2937", lineHeight: 18 },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  strong: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  between: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 2 },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 4 },
});

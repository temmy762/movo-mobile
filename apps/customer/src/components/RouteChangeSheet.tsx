/**
 * Change the destination or add a stop during a ride — mirrors the web
 * tracking page's modals: pick the address, see the price difference
 * (nothing is charged until the rider confirms), then confirm. Only increases
 * are charged, to the card used for the ride; a 3D Secure check is handled
 * natively and then applied by the server.
 */
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError, rides } from "@movo/api";
import { colors, fonts } from "@movo/ui";
import { confirmExtraCharge } from "@/lib/pay";
import { AddressSearch } from "./AddressSearch";

const money = (n: number) => `$${n.toFixed(2)}`;

export function RouteChangeSheet({ bookingId, kind, currentDropoff, onClose, onDone }: {
  bookingId: string;
  kind: "destination" | "stop";
  currentDropoff: string;
  onClose: () => void;
  /** The change was applied; `charged` is what was added to the fare */
  onDone: (charged: number) => void;
}) {
  const dest = kind === "destination";
  const [address, setAddress] = useState(dest ? currentDropoff : "");
  const [picking, setPicking] = useState(false);
  const [quote, setQuote] = useState<rides.RouteQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = dest ? address.trim() && address.trim() !== currentDropoff : address.trim();

  const getPrice = async () => {
    setBusy(true);
    setError(null);
    try {
      setQuote(dest ? await rides.priceDestination(bookingId, address.trim()) : await rides.priceStop(bookingId, address.trim()));
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : `Couldn't price this ${dest ? "destination" : "stop"}. Please try again.`);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const send = (body: { dropoff: string } | { stopAddress: string } | { confirmedIntentId: string }): Promise<rides.RouteChange> =>
        dest
          ? rides.changeDestination(bookingId, body as { dropoff: string } | { confirmedIntentId: string })
          : rides.addStop(bookingId, body as { stopAddress: string } | { confirmedIntentId: string });
      let res = await send(dest ? { dropoff: address.trim() } : { stopAddress: address.trim() });
      if ("requiresAction" in res) {
        await confirmExtraCharge(res.clientSecret);
        res = await send({ confirmedIntentId: res.intentId });
      }
      onDone("charged" in res ? res.charged : 0);
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : e instanceof Error ? e.message : `Couldn't ${dest ? "change the destination" : "add the stop"}. Please try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{dest ? "Change Destination" : "Add a Stop"}</Text>
          <Text style={styles.body}>
            {dest
              ? "Enter the new drop-off to see the updated fare. Nothing is charged until you confirm, and your chauffeur is told right away."
              : "Enter the stop to see the updated fare. Nothing is charged until you confirm."}
          </Text>

          <Pressable onPress={() => setPicking(true)} style={styles.field} accessibilityRole="button">
            <View style={[styles.dot, { backgroundColor: dest ? "#ef4444" : "#9ca3af" }]} />
            <Text style={[styles.fieldText, !address && { color: "#9ca3af" }]} numberOfLines={2}>
              {address || (dest ? "New destination" : "Stop address")}
            </Text>
          </Pressable>

          {quote && (
            <View style={styles.quote}>
              <View style={styles.between}>
                <Text style={styles.line}>Added to your fare (incl. GST)</Text>
                <Text style={styles.line}>+{money(quote.charge)}</Text>
              </View>
              <View style={styles.between}>
                <Text style={styles.strong}>New total</Text>
                <Text style={styles.strong}>{money(quote.newTotal)}</Text>
              </View>
              {!dest && quote.routed === false && (
                <Text style={styles.note}>We couldn&apos;t map the detour, so only the stop fee applies.</Text>
              )}
            </View>
          )}
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.row}>
            <Pressable onPress={onClose} disabled={busy} style={[styles.btn, styles.outline]}>
              <Text style={[styles.btnText, { color: "#374151" }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={quote ? confirm : getPrice} disabled={!changed || busy}
              style={[styles.btn, { backgroundColor: !changed || busy ? "#9ca3af" : colors.navy }]}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.btnText}>
                  {!quote ? "See price" : quote.charge > 0 ? `Confirm & pay ${money(quote.charge)}` : "Confirm"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {picking && (
        <AddressSearch title={dest ? "New destination" : "Add a stop"} initial={address}
          onClose={() => setPicking(false)}
          onPick={(a) => { setAddress(a); setQuote(null); setError(null); setPicking(false); }} />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: "#111827" },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", lineHeight: 19 },
  field: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb" },
  fieldText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: "#111827" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  quote: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: "#F5F5F2" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  line: { fontFamily: fonts.body, fontSize: 13, color: "#4b5563" },
  strong: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  note: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
  row: { flexDirection: "row", gap: 12, marginTop: 4 },
  btn: { flex: 1, minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  outline: { borderWidth: 1, borderColor: "#d1d5db" },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
});

/**
 * Movo Courier tracking (the web's /home/courier/[id]): status, driver, the
 * pickup and drop-off photos (proof of delivery), payment, cancel before pickup.
 */
import { useState } from "react";
import { Alert, ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl, courier, rides } from "@movo/api";
import { Icon, colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";
import { BookingMap } from "@/components/BookingMap";
import { TipCard } from "@/components/TipCard";
import { pickupWhenLabel } from "@movo/shared";

type Party = { name: string; phone: string };
type CourierBooking = {
  id: string; bookingNumber: string | null; status: string; paymentStatus: string; total: number;
  pickup: string; dropoff: string; stops: string[] | null; scheduledAt: string | null;
  enRouteAt: string | null; arrivedAt: string | null; completedAt: string | null;
  cancelledBy: string | null; refundedAmount: number | null;
  rating: number | null; review: string | null; tip: number | null;
  courierPayMethod: string | null; courierPickupPhotoUrl: string | null; courierDropoffPhotoUrl: string | null;
  courierPickedUpAt: string | null; courierOutcome: string | null;
  courier: { town: string; mode: "ONE_WAY" | "SCHEDULED"; pickupWindow?: string | null; package: { description: string; size: string; value: number }; sender: Party; receiver: Party; leaveAtDoor: boolean } | null;
  driver: { firstName: string; phone: string | null; vehicle: { make: string; model: string; plate: string } | null } | null;
};

const money = (n: number) => `$${n.toFixed(2)}`;

/* Rate the driver (feedback needed for 3 stars or less, as on rides) */
function RateDriver({ id, name, rating, review, onSaved }: { id: string; name?: string; rating: number | null; review: string | null; onSaved: () => void }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (rating) {
    return (
      <View style={styles.card}>
        <Text style={styles.body}>You rated {name ?? "your driver"} <Text style={{ color: "#f59e0b" }}>{"★".repeat(rating)}</Text><Text style={{ color: "#d1d5db" }}>{"★".repeat(5 - rating)}</Text></Text>
        {review ? <Text style={styles.muted}>{"“"}{review}{"”"}</Text> : null}
      </View>
    );
  }
  const needsText = stars > 0 && stars <= 3 && !text.trim();
  const submit = async () => {
    setSaving(true); setError(null);
    try { await rides.rate(id, stars, text.trim() || null); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't send your rating."); }
    finally { setSaving(false); }
  };
  return (
    <View style={[styles.card, { borderWidth: 2, borderColor: colors.taupe }]}>
      <Text style={styles.strong}>How was your delivery{name ? ` with ${name}` : ""}?</Text>
      <Text style={styles.muted}>Your rating helps your driver.</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Pressable key={s} onPress={() => setStars(s)} hitSlop={4} accessibilityRole="radio" accessibilityState={{ selected: stars === s }} accessibilityLabel={`${s} star${s > 1 ? "s" : ""}`}>
            <Icon name="star" size={30} strokeWidth={1.5} color={s <= stars ? "#f59e0b" : "#d1d5db"} fill={s <= stars ? "#f59e0b" : "none"} />
          </Pressable>
        ))}
      </View>
      {stars > 0 && (
        <>
          <TextInput value={text} onChangeText={setText} multiline maxLength={1000} placeholderTextColor="#9ca3af"
            placeholder={stars <= 3 ? "Required: what went wrong?" : "Tell us more (optional)"}
            style={[styles.review, needsText && { borderColor: "#f59e0b" }]} accessibilityLabel="Your feedback" />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable onPress={submit} disabled={saving || needsText} style={[styles.rateBtn, (saving || needsText) && { backgroundColor: "#9ca3af" }]} accessibilityRole="button">
            <Text style={styles.rateBtnText}>{saving ? "Sending..." : "Submit rating"}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
const day = (b: CourierBooking) =>
  pickupWhenLabel({ mode: b.courier?.mode ?? "ONE_WAY", scheduledAt: b.scheduledAt, pickupWindow: b.courier?.pickupWindow });

function headline(b: CourierBooking) {
  if (b.status === "CANCELLED") return b.cancelledBy === "system_timeout" ? "No driver was available" : "Delivery cancelled";
  if (b.status === "COMPLETED") return b.courierOutcome === "RETURNED_TO_SENDER" ? "Returned to the sender" : b.courierOutcome === "LEFT_AT_DOOR" ? "Left at the door" : "Delivered";
  if (b.courierPickedUpAt) return "Your package is on its way";
  if (b.arrivedAt) return "Driver at the pickup";
  if (b.enRouteAt) return "Driver on the way to the pickup";
  if (b.driver) return b.scheduledAt ? `Driver confirmed for ${day(b)}` : "Driver confirmed";
  return b.scheduledAt ? `Booked for ${day(b)}` : "Finding a driver";
}

export default function CourierTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((s) => s.token);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["courier-booking", id],
    queryFn: async () => (await rides.detail(id)) as unknown as CourierBooking,
    refetchInterval: (query) => (query.state.data && ["COMPLETED", "CANCELLED"].includes(query.state.data.status) ? false : 8000),
  });
  const b = q.data;
  /* The driver's position while the delivery is under way */
  const live = !!b && b.status === "CONFIRMED" && !!b.driver && (!!b.enRouteAt || !!b.courierPickedUpAt);
  const pos = useQuery({
    queryKey: ["courier-driver-pos", id],
    queryFn: () => rides.driverLocation(id),
    enabled: live,
    refetchInterval: 6000,
  });
  const driverPt = live && pos.data?.position ? { latitude: pos.data.position.lat, longitude: pos.data.position.lng } : null;

  const cancel = () => Alert.alert("Cancel this delivery?", b?.paymentStatus === "PAID" ? "It hasn't been picked up, so you'll get a full refund." : "Nothing has been charged.", [
    { text: "Keep it", style: "cancel" },
    {
      text: "Yes, cancel", style: "destructive", onPress: async () => {
        try {
          const r = await rides.cancel(id);
          Alert.alert("Cancelled", typeof r.refundAmount === "number" ? `${money(r.refundAmount)} has been refunded to your card.` : "Your delivery was cancelled.");
          qc.invalidateQueries({ queryKey: ["courier-booking", id] });
        } catch (e) {
          Alert.alert("Couldn't cancel", e instanceof Error ? e.message : "Please try again.");
        }
      },
    },
  ]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/rides"));
  const photo = (stage: "pickup" | "dropoff") => ({ uri: `${apiBaseUrl()}${courier.photoUrl(id, stage)}`, headers: token ? { Authorization: `Bearer ${token}` } : undefined });

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={back} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Icon name="back" size={18} color={colors.navy} /></Pressable>
        <Text style={styles.headerTitle}>Movo Courier</Text>
      </View>
      {!b ? (q.isError ? <Text style={styles.error}>Couldn&apos;t load this delivery.</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />) : (
        <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { q.refetch(); }} />}>
          {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
            <BookingMap pickup={b.pickup} dropoff={b.dropoff} driver={driverPt} driverLabel={b.driver ? `${b.driver.firstName} (your driver)` : undefined} />
          )}
          <View style={styles.card}>
            <Text style={styles.kicker}>{b.courier?.mode === "SCHEDULED" ? "SCHEDULED" : "ONE WAY"} · {b.bookingNumber}</Text>
            <Text style={styles.title}>{headline(b)}</Text>
            {b.status !== "CANCELLED" && (
              <View style={styles.steps}>
                {[
                  { l: "Booked", d: true }, { l: "Driver", d: !!b.driver || b.status === "COMPLETED" },
                  { l: "Picked up", d: !!b.courierPickedUpAt }, { l: b.courierOutcome === "RETURNED_TO_SENDER" ? "Returned" : "Delivered", d: b.status === "COMPLETED" },
                ].map((s) => (
                  <View key={s.l} style={{ flex: 1 }}>
                    <View style={[styles.bar, s.d && { backgroundColor: colors.navy }]} />
                    <Text style={[styles.stepText, s.d && { color: "#111827" }]}>{s.l}</Text>
                  </View>
                ))}
              </View>
            )}
            {b.status === "CANCELLED" && b.paymentStatus === "REFUNDED" && <Text style={styles.ok}>Refunded {money(b.refundedAmount ?? b.total)} to your card.</Text>}
            {b.courierPayMethod === "DOOR" && b.paymentStatus !== "PAID" && b.status !== "CANCELLED" && (
              <Text style={styles.notice}>{money(b.total)} due at the door. The receiver gets a card payment link when the driver arrives.</Text>
            )}
            {b.driver && b.status === "CONFIRMED" && (
              <View style={styles.driver}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{b.driver.firstName.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.strong}>{b.driver.firstName}, your driver</Text>
                  {b.driver.vehicle && <Text style={styles.muted}>{b.driver.vehicle.make} {b.driver.vehicle.model} · {b.driver.vehicle.plate}</Text>}
                </View>
                {b.driver.phone && (
                  <Pressable onPress={() => Linking.openURL(`tel:${b.driver!.phone}`)} style={styles.call} accessibilityRole="button" accessibilityLabel="Call your driver">
                    <Icon name="phone" size={16} color="#fff" />
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {b.status === "COMPLETED" && b.driver && (
            <>
              <RateDriver id={id} name={b.driver.firstName} rating={b.rating} review={b.review} onSaved={() => { q.refetch(); }} />
              {b.paymentStatus === "PAID" && <TipCard id={id} tip={b.tip} completedAt={b.completedAt} name={b.driver.firstName} courier />}
            </>
          )}

          {(b.courierPickupPhotoUrl || b.courierDropoffPhotoUrl) && (
            <View style={styles.card}>
              <Text style={styles.strong}>Photos</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                {b.courierPickupPhotoUrl && <View style={{ flex: 1 }}><Image source={photo("pickup")} style={styles.photo} contentFit="cover" accessibilityLabel="Pickup photo" /><Text style={styles.muted}>Picked up</Text></View>}
                {b.courierDropoffPhotoUrl && <View style={{ flex: 1 }}><Image source={photo("dropoff")} style={styles.photo} contentFit="cover" accessibilityLabel="Drop-off photo" /><Text style={styles.muted}>{b.courierOutcome === "RETURNED_TO_SENDER" ? "At the door" : "Delivered"}</Text></View>}
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.small}>FROM</Text>
            <Text style={styles.body}>{b.pickup}{b.courier ? ` · ${b.courier.sender.name}` : ""}</Text>
            {(b.stops ?? []).map((s, i) => <Text key={i} style={styles.body}>+ pickup: {s}</Text>)}
            <Text style={[styles.small, { marginTop: 8 }]}>TO</Text>
            <Text style={styles.body}>{b.dropoff}{b.courier ? ` · ${b.courier.receiver.name}` : ""}</Text>
            {b.courier && <Text style={[styles.muted, { marginTop: 8 }]}>{b.courier.package.description} · value {money(b.courier.package.value)}</Text>}
            <View style={styles.totalRow}>
              <Text style={styles.strong}>Total (GST incl.)</Text>
              <Text style={styles.strong}>{money(b.total)}{b.paymentStatus === "PAID" ? " · paid" : b.paymentStatus === "REFUNDED" ? " · refunded" : ""}</Text>
            </View>
          </View>

          {b.status === "CONFIRMED" && !b.courierPickedUpAt && (
            <Pressable onPress={cancel} style={styles.cancel} accessibilityRole="button"><Text style={styles.cancelText}>Cancel delivery</Text></Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F2" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.heading, fontSize: 16, color: "#111827" },
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16 },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#8A7F6B", letterSpacing: 1 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827", marginTop: 4 },
  steps: { flexDirection: "row", gap: 6, marginTop: 14 },
  bar: { height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" },
  stepText: { fontFamily: fonts.body, fontSize: 10, color: "#9ca3af", marginTop: 4 },
  ok: { fontFamily: fonts.body, fontSize: 13, color: "#15803d", marginTop: 10 },
  notice: { fontFamily: fonts.body, fontSize: 13, color: "#92400e", backgroundColor: "#fffbeb", borderRadius: 10, padding: 10, marginTop: 12 },
  driver: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", paddingTop: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.heading, color: "#fff", fontSize: 16 },
  call: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", aspectRatio: 1, borderRadius: 12, backgroundColor: "#f3f4f6" },
  strong: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#111827" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", marginTop: 2 },
  small: { fontFamily: fonts.bodySemi, fontSize: 10, color: "#6b7280", letterSpacing: 1 },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#111827", marginTop: 2 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", marginTop: 12, paddingTop: 10 },
  review: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 10, minHeight: 70, marginTop: 10, fontFamily: fonts.body, fontSize: 13, color: "#111827", textAlignVertical: "top" },
  rateBtn: { backgroundColor: colors.navy, borderRadius: 999, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  rateBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  cancel: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999, paddingVertical: 13, alignItems: "center", backgroundColor: "#fff" },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#374151" },
  error: { fontFamily: fonts.body, fontSize: 13, color: "#dc2626", textAlign: "center", marginTop: 40 },
});

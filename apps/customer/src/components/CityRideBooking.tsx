/**
 * Book a City Ride — the web's pickup → car choice → checkout, on one screen:
 * route, Now or Reserve (30 min notice), optional "for someone else", the
 * server-signed price for the customer tier (Standard at launch), card
 * payment (PaymentSheet), then the booking from the quote + paid intent.
 */
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ApiError, bookings as bookingsApi } from "@movo/api";
import { CUSTOMER_RIDE_TIERS, winnipegDateTime, type FareEstimate } from "@movo/shared";
import { colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";
import { payForQuote } from "@/lib/pay";
import { LEAD_MIN, dayOptions, pickupLabel, timeOptions } from "@/lib/when";
import { AddressSearch } from "./AddressSearch";
import { BookingDone } from "./BookingDone";
import { ScreenHeader } from "./ScreenHeader";

const TIER_NAMES: Record<string, string> = { classic: "Standard", premium: "Executive", black: "Concierge" };
const TIER = CUSTOMER_RIDE_TIERS[0] ?? "classic";
const money = (n: number) => `$${n.toFixed(2)}`;

type Booked = { id: string; bookingNumber?: string | null; scheduledAt: string | null };

export function CityRideBooking({ initialDropoff }: { initialDropoff?: string }) {
  const user = useSession((s) => s.user);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState(initialDropoff ?? "");
  const [searching, setSearching] = useState<"pickup" | "dropoff" | null>(null);
  const [reserve, setReserve] = useState(false);
  const days = dayOptions();
  const [day, setDay] = useState(days[0].date);
  const [time, setTime] = useState<string | null>(null);
  const [forOther, setForOther] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidIntent, setPaidIntent] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  const times = reserve ? timeOptions(day, LEAD_MIN.city) : [];
  const scheduledAt = reserve && time ? winnipegDateTime(day, time)?.toISOString() ?? null : null;

  /* Anything that changes the trip invalidates the price — and once paid, the
     trip is fixed (the payment covers exactly this quote) */
  const changed = <T,>(set: (v: T) => void) => (v: T) => {
    if (paidIntent) return;
    set(v); setEstimate(null); setError(null);
  };

  const getPrice = async () => {
    setError(null);
    if (!pickup || !dropoff) return setError("Please choose your pickup and destination.");
    if (reserve && !scheduledAt) return setError("Please choose a pickup time.");
    if (forOther && (!riderName.trim() || !riderPhone.trim())) return setError("Please enter the rider's name and mobile number.");
    setLoading(true);
    try {
      setEstimate(await bookingsApi.estimate({ pickup, dropoff, tier: TIER, pickupTime: scheduledAt }));
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't calculate the fare. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Paid, so create the booking. Safe to retry: the same intent never books twice. */
  const book = async (intentId: string, quote: string) => {
    const created = await bookingsApi.createCityRide({
      quote, stripePaymentIntentId: intentId, carTier: TIER, carName: TIER_NAMES[TIER] ?? "Standard",
      pickup, dropoff, scheduledAt,
      ...(forOther ? { riderName: riderName.trim(), riderPhone: riderPhone.trim() } : {}),
    });
    setBooked({ id: created.id, bookingNumber: created.bookingNumber, scheduledAt });
  };

  const pay = async () => {
    if (!estimate) return;
    setPaying(true);
    setError(null);
    let intentId = paidIntent;
    try {
      if (!intentId) {
        const result = await payForQuote(estimate.quote, { name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), email: user?.email });
        if (result.status === "canceled") return;
        intentId = result.intentId;
        setPaidIntent(intentId);
      }
      await book(intentId, estimate.quote);
    } catch (e) {
      const msg = e instanceof ApiError && e.status !== 0 ? e.message : e instanceof Error ? e.message : "Something went wrong.";
      /* Paid but not booked yet: the button now finishes the booking with the same payment */
      setError(intentId
        ? `${msg} Your payment is safe — tap the button again to finish booking (you won't be charged twice).`
        : msg);
    } finally {
      setPaying(false);
    }
  };

  if (booked) {
    return (
      <BookingDone title={booked.scheduledAt ? "Ride reserved" : "Ride booked"} bookingNumber={booked.bookingNumber}
        scheduledAt={booked.scheduledAt} nowText="We're finding your chauffeur now. You'll get an update as soon as one accepts." />
    );
  }

  const fixed = !!estimate?.fixedFare;

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Book a City Ride" subtitle="Winnipeg" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Pressable onPress={() => setSearching("pickup")} style={styles.addr} accessibilityRole="button">
              <View style={[styles.dot, { backgroundColor: colors.navy }]} />
              <Text style={[styles.addrText, !pickup && styles.placeholder]} numberOfLines={2}>{pickup || "Pickup location"}</Text>
            </Pressable>
            <View style={styles.sep} />
            <Pressable onPress={() => setSearching("dropoff")} style={styles.addr} accessibilityRole="button">
              <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
              <Text style={[styles.addrText, !dropoff && styles.placeholder]} numberOfLines={2}>{dropoff || "Where to?"}</Text>
            </Pressable>
          </View>

          <View style={styles.segments}>
            {[{ v: false, l: "Book Now" }, { v: true, l: "Reserve Ride" }].map((o) => (
              <Pressable key={o.l} onPress={() => { changed(setReserve)(o.v); setTime(null); }}
                style={[styles.segment, reserve === o.v && styles.segmentOn]} accessibilityRole="tab" accessibilityState={{ selected: reserve === o.v }}>
                <Text style={[styles.segmentText, reserve === o.v && { color: "#fff" }]}>{o.l}</Text>
              </Pressable>
            ))}
          </View>

          {reserve && (
            <View style={{ gap: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {days.map((d) => (
                  <Pressable key={d.date} onPress={() => { changed(setDay)(d.date); setTime(null); }} style={[styles.chip, day === d.date && styles.chipOn]}>
                    <Text style={[styles.chipText, day === d.date && { color: "#fff" }]}>{d.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {times.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {times.map((t) => (
                    <Pressable key={t.time} onPress={() => changed(setTime)(t.time)} style={[styles.chip, time === t.time && styles.chipOn]}>
                      <Text style={[styles.chipText, time === t.time && { color: "#fff" }]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.muted}>No pickup times left today — choose another day.</Text>
              )}
            </View>
          )}
          <Text style={styles.muted}>
            For the best experience and guaranteed chauffeur assignment, we recommend reserving your trip at least 30 minutes in advance.
          </Text>

          <View style={styles.otherRow}>
            <Text style={styles.label}>Booking for someone else</Text>
            <Switch value={forOther} onValueChange={changed(setForOther)} trackColor={{ true: colors.navy }} />
          </View>
          {forOther && (
            <View style={{ gap: 8 }}>
              <TextInput value={riderName} onChangeText={setRiderName} placeholder="Rider's name" placeholderTextColor="#9ca3af" style={styles.input} />
              <TextInput value={riderPhone} onChangeText={setRiderPhone} placeholder="Rider's mobile number" placeholderTextColor="#9ca3af"
                keyboardType="phone-pad" style={styles.input} />
              <Text style={styles.muted}>Your chauffeur will contact the rider directly. The confirmation and receipt are sent to you.</Text>
            </View>
          )}

          {estimate && (
            <View style={styles.price}>
              <View style={styles.between}>
                <Text style={styles.priceTitle}>{fixed ? "Your agreed fare" : `${TIER_NAMES[TIER]} ride`}</Text>
                {estimate.distanceKm != null && (
                  <Text style={styles.muted}>{estimate.distanceKm.toFixed(1)} km · {estimate.durationMin} min</Text>
                )}
              </View>
              {fixed && <Text style={styles.muted}>{estimate.fixedFare?.label}</Text>}
              <View style={styles.between}><Text style={styles.line}>Fare</Text><Text style={styles.line}>{money(estimate.fare)}</Text></View>
              {!fixed && estimate.serviceFee > 0 && (
                <View style={styles.between}><Text style={styles.line}>Service fee</Text><Text style={styles.line}>{money(estimate.serviceFee)}</Text></View>
              )}
              <View style={styles.between}><Text style={styles.line}>GST</Text><Text style={styles.line}>{money(estimate.gst)}</Text></View>
              <View style={[styles.between, styles.totalRow]}><Text style={styles.total}>Total</Text><Text style={styles.total}>{money(estimate.total)}</Text></View>
              {scheduledAt && <Text style={styles.muted}>Pickup {pickupLabel(scheduledAt)}</Text>}
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={estimate ? pay : getPrice} disabled={loading || paying} accessibilityRole="button">
            <LinearGradient colors={loading || paying ? ["#9ca3af", "#9ca3af"] : ["#1a1a2e", "#131936", "#C6BFB2"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              {loading || paying ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaText}>{estimate ? (paidIntent ? "Finish booking" : `Pay ${money(estimate.total)}`) : "See price"}</Text>}
            </LinearGradient>
          </Pressable>
          {estimate && <Text style={[styles.muted, { textAlign: "center" }]}>Secure card payment by Stripe.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      {searching === "pickup" && (
        <AddressSearch title="Pickup location" initial={pickup} allowCurrentLocation
          onClose={() => setSearching(null)} onPick={(a) => { changed(setPickup)(a); setSearching(null); }} />
      )}
      {searching === "dropoff" && (
        <AddressSearch title="Destination" initial={dropoff}
          onClose={() => setSearching(null)} onPick={(a) => { changed(setDropoff)(a); setSearching(null); }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F2" },
  page: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 14 },
  addr: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15 },
  addrText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: "#111827" },
  placeholder: { color: "#9ca3af" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#e5e7eb", marginLeft: 22 },
  segments: { flexDirection: "row", backgroundColor: "#e9ebf1", borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  segmentOn: { backgroundColor: colors.navy },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#6b7280" },
  chips: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  otherRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151" },
  input: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: "#111827" },
  price: { backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 8 },
  priceTitle: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  line: { fontFamily: fonts.body, fontSize: 13, color: "#4b5563" },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 2 },
  total: { fontFamily: fonts.heading, fontSize: 16, color: "#111827" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", textAlign: "center" },
  cta: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 16, color: "#fff" },
});

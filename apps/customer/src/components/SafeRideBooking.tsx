/**
 * Book a Safe Ride — the web's 4-step flow (pickup page → care-ride/details →
 * checkout) on one screen:
 *   1. Where & when: pickup, destination, pickup instructions, passengers,
 *      Book Now or Reserve (45 min notice)
 *   2. Your vehicle: make, model, year, colour, plate, transmission, roadworthy
 *   3. Contact & authorization: who is riding, mobile, receipt email, 3 consents
 *   4. Confirm & pay: the signed Safe Ride fare (no service fee), card payment,
 *      then the booking from the quote + paid intent (POST /api/bookings/care)
 */
import { useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ApiError, bookings as bookingsApi } from "@movo/api";
import { winnipegDateTime, type FareEstimate, type SafeRideVehicle } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";
import { payForQuote } from "@/lib/pay";
import { openWeb } from "@/lib/links";
import { LEAD_MIN, dayOptions, pickupLabel, timeOptions } from "@/lib/when";
import { AddressSearch } from "./AddressSearch";
import { BookingDone } from "./BookingDone";

const MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ford", "Genesis", "GMC",
  "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln", "Mazda",
  "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche", "Ram", "Subaru", "Tesla", "Toyota",
  "Volkswagen", "Volvo",
];
const COLOURS = ["Black", "White", "Silver", "Grey", "Blue", "Red", "Green", "Brown", "Beige", "Gold", "Other"];
const NEXT_YEAR = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: 30 }, (_, i) => String(NEXT_YEAR - i));
const STEP_TITLES = ["Where are we taking you?", "Your vehicle", "Contact & authorization", "Confirm & pay"];
const money = (n: number) => `$${n.toFixed(2)}`;

/* ── Small pieces ─────────────────────────────────────────────────────── */

function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[styles.chip, value === o && styles.chipOn]}
          accessibilityRole="radio" accessibilityState={{ selected: value === o }}>
          <Text style={[styles.chipText, value === o && { color: "#fff" }]}>{o}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Segments<T extends string | boolean>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segments}>
      {options.map((o) => (
        <Pressable key={o.l} onPress={() => onChange(o.v)} style={[styles.segment, value === o.v && styles.segmentOn]}
          accessibilityRole="tab" accessibilityState={{ selected: value === o.v }}>
          <Text style={[styles.segmentText, value === o.v && { color: "#fff" }]}>{o.l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, checked && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
        {checked && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
      </View>
      <Text style={styles.checkText}>{children}</Text>
    </Pressable>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#9ca3af" {...props} style={[styles.input, props.style]} />;
}

/* ── Screen ───────────────────────────────────────────────────────────── */

export function SafeRideBooking({ initialDropoff }: { initialDropoff?: string }) {
  const user = useSession((s) => s.user);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  /* 1 — where & when */
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState(initialDropoff ?? "");
  const [searching, setSearching] = useState<"pickup" | "dropoff" | null>(null);
  const [instructions, setInstructions] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [reserve, setReserve] = useState(false);
  const days = dayOptions();
  const [day, setDay] = useState(days[0].date);
  const [time, setTime] = useState<string | null>(null);
  const scheduledAt = reserve && time ? winnipegDateTime(day, time)?.toISOString() ?? null : null;

  /* 2 — vehicle */
  const [vehicle, setVehicle] = useState<SafeRideVehicle>({ make: "", model: "", year: "", colour: "", plate: "", transmission: "Automatic" });
  const [roadworthy, setRoadworthy] = useState(false);
  const setV = (k: keyof SafeRideVehicle, v: string) => setVehicle((prev) => ({ ...prev, [k]: v }));
  const makeMatches = vehicle.make.trim().length >= 1
    ? MAKES.filter((m) => m.toLowerCase().startsWith(vehicle.make.trim().toLowerCase()) && m !== vehicle.make).slice(0, 6)
    : [];

  /* 3 — contact & authorization (the account holder by default) */
  const self = { name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), phone: user?.phone ?? "" };
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [riderName, setRiderName] = useState(self.name);
  const [riderPhone, setRiderPhone] = useState(self.phone);
  const [receiptEmail, setReceiptEmail] = useState(user?.email ?? "");
  const [ownsVehicle, setOwnsVehicle] = useState(false);
  const [authorizes, setAuthorizes] = useState(false);
  const [agreesTerms, setAgreesTerms] = useState(false);

  /* 4 — price, payment, booking */
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [paidIntent, setPaidIntent] = useState<string | null>(null);
  const [bookedId, setBookedId] = useState<string | null>(null);

  const toggleSomeoneElse = (v: boolean) => {
    setForSomeoneElse(v);
    setRiderName(v ? "" : self.name);
    setRiderPhone(v ? "" : self.phone);
  };

  const go = (n: number) => { setError(null); setStep(n); };

  const next1 = () => {
    if (!pickup || !dropoff) return setError("Please choose your pickup and destination.");
    if (pickup.trim().toLowerCase() === dropoff.trim().toLowerCase()) return setError("Pickup and destination can't be the same address.");
    if (reserve && !scheduledAt) return setError("Please select a date and time for your reservation.");
    go(2);
  };

  const next2 = () => {
    if (!vehicle.make.trim() || !vehicle.model.trim() || !vehicle.year || !vehicle.colour || !vehicle.plate.trim()) {
      return setError("Please complete all vehicle details.");
    }
    if (!roadworthy) return setError("Please confirm the vehicle is roadworthy with a working seat belt for every occupant.");
    go(3);
  };

  const next3 = async () => {
    if (!riderName.trim() || !riderPhone.trim() || !receiptEmail.trim()) {
      return setError("Please enter the rider's name, mobile number and an email for the receipt.");
    }
    if (!/^\S+@\S+\.\S+$/.test(receiptEmail.trim())) return setError("Please enter a valid email address.");
    if (riderPhone.replace(/\D/g, "").length < 10) return setError("Please enter a valid mobile number.");
    if (!ownsVehicle || !authorizes || !agreesTerms) return setError("Please tick all three boxes to authorize your Safe Ride.");
    setError(null);
    setBusy(true);
    try {
      setEstimate(await bookingsApi.estimate({ pickup, dropoff, tier: "care", pickupTime: scheduledAt }));
      setStep(4);
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't calculate the fare. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  /* Paid → booking. Safe to retry: the same intent never books twice. */
  const pay = async () => {
    if (!estimate) return;
    setBusy(true);
    setError(null);
    let intentId = paidIntent;
    try {
      if (!intentId) {
        const result = await payForQuote(estimate.quote, { name: self.name, email: receiptEmail.trim() });
        if (result.status === "canceled") return;
        intentId = result.intentId;
        setPaidIntent(intentId);
      }
      const { bookingId } = await bookingsApi.createSafeRide({
        quote: estimate.quote, stripePaymentIntentId: intentId, pickup, dropoff, scheduledAt,
        vehicle: { ...vehicle, make: vehicle.make.trim(), model: vehicle.model.trim(), plate: vehicle.plate.trim().toUpperCase() },
        riderName: riderName.trim(), riderPhone: riderPhone.trim(), receiptEmail: receiptEmail.trim(),
        passengers, pickupInstructions: instructions.trim() || undefined,
      });
      setBookedId(bookingId);
    } catch (e) {
      const msg = e instanceof ApiError && e.status !== 0 ? e.message : e instanceof Error ? e.message : "Something went wrong.";
      setError(intentId
        ? `${msg} Your payment is safe — tap the button again to finish booking (you won't be charged twice).`
        : msg);
    } finally {
      setBusy(false);
    }
  };

  if (bookedId) {
    return (
      <BookingDone bookingId={bookedId} title={scheduledAt ? "Safe Ride reserved" : "Safe Ride booked"} scheduledAt={scheduledAt}
        nowText="We're assigning your chauffeur now. A confirmation is on its way to your email, and you'll get an update as soon as a chauffeur accepts." />
    );
  }

  const times = reserve ? timeOptions(day, LEAD_MIN.care) : [];
  /* Once paid, the trip is fixed (the payment covers exactly this quote) */
  const back = () => {
    if (paidIntent) return;
    if (step > 1) go(step - 1);
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={back} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="back" size={18} color="#374151" strokeWidth={2.5} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Safe Ride · Step {step} of 4</Text>
          <View style={styles.progress}>
            {[1, 2, 3, 4].map((n) => <View key={n} style={[styles.progressBar, n <= step && { backgroundColor: colors.taupe }]} />)}
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{STEP_TITLES[step - 1]}</Text>

          {step === 1 && (
            <>
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

              <Label>Pickup instructions (optional)</Label>
              <Field value={instructions} onChangeText={(v) => setInstructions(v.slice(0, 300))} multiline
                placeholder="E.g. side entrance, unit number, etc." style={{ minHeight: 60, textAlignVertical: "top" }} />

              <View style={styles.between}>
                <View style={{ flex: 1 }}>
                  <Label>Passengers</Label>
                  <Text style={styles.muted}>Count everyone, including yourself. Leave a seat for the chauffeur.</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setPassengers((p) => Math.max(1, p - 1))} disabled={passengers <= 1} style={styles.stepBtn}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{passengers}</Text>
                  <Pressable onPress={() => setPassengers((p) => Math.min(8, p + 1))} disabled={passengers >= 8} style={styles.stepBtn}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <Segments options={[{ v: false, l: "Book Now" }, { v: true, l: "Reserve Ride" }]} value={reserve}
                onChange={(v) => { setReserve(v); setTime(null); }} />
              {reserve && (
                <View style={{ gap: 10 }}>
                  <Chips options={days.map((d) => d.label)} value={days.find((d) => d.date === day)?.label ?? ""}
                    onChange={(l) => { setDay(days.find((d) => d.label === l)!.date); setTime(null); }} />
                  {times.length ? (
                    <Chips options={times.map((t) => t.label)} value={times.find((t) => t.time === time)?.label ?? ""}
                      onChange={(l) => setTime(times.find((t) => t.label === l)!.time)} />
                  ) : (
                    <Text style={styles.muted}>No pickup times left today — choose another day.</Text>
                  )}
                  <Text style={styles.muted}>Safe Ride reservations need at least 45 minutes&apos; notice.</Text>
                </View>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Label>Make *</Label>
              <Field value={vehicle.make} onChangeText={(v) => setV("make", v)} placeholder="e.g. Toyota" autoCorrect={false} />
              {makeMatches.length > 0 && <Chips options={makeMatches} value="" onChange={(v) => setV("make", v)} />}
              <Label>Model *</Label>
              <Field value={vehicle.model} onChangeText={(v) => setV("model", v)} placeholder="e.g. Corolla" autoCorrect={false} />
              <Label>Year *</Label>
              <Chips options={YEARS} value={vehicle.year} onChange={(v) => setV("year", v)} />
              <Label>Colour *</Label>
              <Chips options={COLOURS} value={vehicle.colour} onChange={(v) => setV("colour", v)} />
              <Label>Licence plate *</Label>
              <Field value={vehicle.plate} onChangeText={(v) => setV("plate", v.toUpperCase())} placeholder="e.g. ABC 123"
                autoCapitalize="characters" autoCorrect={false} />
              <Segments options={[{ v: "Automatic" as const, l: "Automatic" }, { v: "Manual" as const, l: "Manual" }]}
                value={vehicle.transmission} onChange={(v) => setV("transmission", v)} />
              <Text style={styles.muted}>Transmission determines chauffeur availability.</Text>
              <Check checked={roadworthy} onChange={setRoadworthy}>
                Vehicle is roadworthy and has a working seat belt for every occupant.
              </Check>
            </>
          )}

          {step === 3 && (
            <>
              <Segments options={[{ v: false, l: "I'm riding" }, { v: true, l: "Someone else is riding" }]}
                value={forSomeoneElse} onChange={toggleSomeoneElse} />
              <Label>{forSomeoneElse ? "Rider's full name *" : "Full name *"}</Label>
              <Field value={riderName} onChangeText={setRiderName} placeholder="Full name" autoComplete={forSomeoneElse ? "off" : "name"} />
              <Label>{forSomeoneElse ? "Rider's mobile number *" : "Mobile number *"}</Label>
              <Field value={riderPhone} onChangeText={setRiderPhone} placeholder="+1 204 555 0123" keyboardType="phone-pad"
                autoComplete={forSomeoneElse ? "off" : "tel"} />
              <Text style={styles.muted}>
                {forSomeoneElse ? "Your chauffeur will contact the rider on this number." : "Your chauffeur will use this number to reach you."}
              </Text>
              <Label>Email for receipt *</Label>
              <Field value={receiptEmail} onChangeText={setReceiptEmail} placeholder="you@example.com" keyboardType="email-address"
                autoCapitalize="none" autoComplete="email" />
              <View style={{ gap: 12, marginTop: 4 }}>
                <Check checked={ownsVehicle} onChange={setOwnsVehicle}>I own this vehicle or have permission to authorize its use.</Check>
                <Check checked={authorizes} onChange={setAuthorizes}>I authorize the assigned MOVO chauffeur to drive it for this booking.</Check>
                <Check checked={agreesTerms} onChange={setAgreesTerms}>
                  I agree to the <Text style={styles.link} onPress={() => openWeb("/terms")}>Terms</Text> and Safe Ride consent.
                </Check>
              </View>
              <Text style={styles.muted}>Fields marked * are required.</Text>
            </>
          )}

          {step === 4 && estimate && (
            <>
              <View style={styles.summary}>
                <View style={styles.sumRow}><View style={[styles.dot, { backgroundColor: colors.navy }]} /><Text style={styles.sumText}>{pickup}</Text></View>
                <View style={styles.sumRow}><View style={[styles.dot, { backgroundColor: "#ef4444" }]} /><Text style={styles.sumText}>{dropoff}</Text></View>
                <Text style={styles.muted}>{scheduledAt ? `Pickup ${pickupLabel(scheduledAt)}` : "Pickup as soon as possible"}</Text>
                <Text style={styles.muted}>
                  {[vehicle.colour, vehicle.make, vehicle.model].filter(Boolean).join(" ")} · {vehicle.plate.toUpperCase()} · {vehicle.transmission}
                </Text>
                <Text style={styles.muted}>Rider: {riderName} · {riderPhone}</Text>
              </View>
              <View style={styles.price}>
                <View style={styles.between}>
                  <Text style={styles.line}>Safe Ride fare</Text><Text style={styles.line}>{money(estimate.fare)}</Text>
                </View>
                <View style={styles.between}><Text style={styles.line}>GST</Text><Text style={styles.line}>{money(estimate.gst)}</Text></View>
                <View style={[styles.between, styles.totalRow]}>
                  <Text style={styles.total}>Total</Text><Text style={styles.total}>{money(estimate.total)}</Text>
                </View>
                <Text style={styles.muted}>One all-inclusive fare: your chauffeur, getting them back afterwards, and GST.</Text>
              </View>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={step === 1 ? next1 : step === 2 ? next2 : step === 3 ? next3 : pay} disabled={busy} accessibilityRole="button">
            <LinearGradient colors={busy ? ["#9ca3af", "#9ca3af"] : ["#1a1a2e", "#131936", "#C6BFB2"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.ctaText}>
                  {step < 3 ? "Continue" : step === 3 ? "Review booking"
                    : paidIntent ? "Finish booking" : `Pay ${money(estimate?.total ?? 0)}`}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
          {step === 4 && <Text style={[styles.muted, { textAlign: "center" }]}>Secure card payment by Stripe.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      {searching === "pickup" && (
        <AddressSearch title="Pickup location" initial={pickup} allowCurrentLocation
          onClose={() => setSearching(null)} onPick={(a) => { setPickup(a); setSearching(null); }} />
      )}
      {searching === "dropoff" && (
        <AddressSearch title="Destination" initial={dropoff}
          onClose={() => setSearching(null)} onPick={(a) => { setDropoff(a); setSearching(null); }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F2" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#6b7280", marginBottom: 6 },
  progress: { flexDirection: "row", gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" },
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827", marginBottom: 2 },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  card: { backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 14 },
  addr: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15 },
  addrText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: "#111827" },
  placeholder: { color: "#9ca3af" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#e5e7eb", marginLeft: 22 },
  input: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: "#111827" },
  chips: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  segments: { flexDirection: "row", backgroundColor: "#e9ebf1", borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  segmentOn: { backgroundColor: "#0A0A0F" },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6" },
  stepBtnText: { fontFamily: fonts.heading, fontSize: 18, color: "#111827" },
  stepValue: { fontFamily: fonts.heading, fontSize: 15, color: "#111827", minWidth: 20, textAlign: "center" },
  check: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#d1d5db", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: "#374151", lineHeight: 18 },
  link: { fontFamily: fonts.bodySemi, color: colors.navy, textDecorationLine: "underline" },
  summary: { backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 8 },
  sumRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sumText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: "#111827" },
  price: { backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 8 },
  line: { fontFamily: fonts.body, fontSize: 13, color: "#4b5563" },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 2 },
  total: { fontFamily: fonts.heading, fontSize: 16, color: "#111827" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", textAlign: "center" },
  cta: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 16, color: "#fff" },
});

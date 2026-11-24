/**
 * Movo Courier booking — the web's /home/courier in 3 steps:
 *   1. Town (search), direction, Winnipeg + town addresses
 *   2. One Way (now) or Scheduled (a run day)
 *   3. Package, extra pickups, sender / receiver, payment → price → pay / book
 * The customer sees one total (GST incl.) and the extra-pickups line; the
 * travel fee is internal. Pay at the door is One Way only.
 */
import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePreventRemove } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ApiError, courier } from "@movo/api";
import { ONE_WAY_LATER, PICKUP_WINDOWS, oneWayTimeSlots, timeLabel, winnipegNowTime, winnipegToday, type PickupWindow } from "@movo/shared";

import { Icon, colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";
import { payForQuote } from "@/lib/pay";
import { AddressSearch } from "@/components/AddressSearch";
import { CardPicker } from "@/components/CardPicker";

type CourierDirection = courier.CourierDirection;
type CourierEstimate = courier.CourierEstimate;
type CourierMode = courier.CourierMode;
type PackageSize = courier.PackageSize;

const SIZES: { id: PackageSize; label: string; hint: string }[] = [
  { id: "SMALL", label: "Small", hint: "Envelope or shoebox" },
  { id: "MEDIUM", label: "Medium", hint: "Fits on a car seat" },
  { id: "LARGE", label: "Large", hint: "Fills a car trunk" },
];
const NOT_CARRIED = "Cash · Jewellery · Medication · Alcohol · Anything illegal or dangerous · Anything that must stay cold or frozen. No furniture, appliances or anything that needs a van.";
const money = (n: number) => `$${n.toFixed(2)}`;
const dayLabel = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`;
const phoneOk = (p: string) => p.replace(/\D/g, "").length >= 10;
const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const toMins = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/* Bookable later-pickup days and times, from when the screen opened (Winnipeg) */
function laterSlots() {
  const today = winnipegToday();
  const earliest = toMins(winnipegNowTime()) + ONE_WAY_LATER.minLeadMinutes;
  const all = oneWayTimeSlots();
  const days: { date: string; times: string[] }[] = [];
  for (let i = 0; i < ONE_WAY_LATER.maxDaysAhead; i++) {
    const date = addDays(today, i);
    const times = i === 0 ? all.filter((t) => toMins(t) >= earliest) : all;
    if (times.length) days.push({ date, times });
  }
  return { today, days };
}

function Label({ children }: { children: ReactNode }) { return <Text style={styles.label}>{children}</Text>; }

function Segments<T extends string>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segments}>
      {options.map((o) => (
        <Pressable key={o.v} onPress={() => onChange(o.v)} style={[styles.segment, value === o.v && styles.segmentOn]}
          accessibilityRole="radio" accessibilityState={{ selected: value === o.v }}>
          <Text style={[styles.segmentText, value === o.v && { color: "#fff" }]} numberOfLines={1}>{o.l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Check({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <View style={[styles.box, on && { backgroundColor: colors.navy, borderColor: colors.navy }]}>{on && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</View>
      <Text style={styles.checkText}>{children}</Text>
    </Pressable>
  );
}

export default function CourierBooking() {
  const user = useSession((s) => s.user);
  const data = useQuery({ queryKey: ["courier-routes"], queryFn: courier.routes });
  const routes = useMemo(() => data.data?.routes ?? [], [data.data]);
  const limits = data.data?.limits;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [townQuery, setTownQuery] = useState("");
  const [routeId, setRouteId] = useState("");
  const [direction, setDirection] = useState<CourierDirection>("TO_TOWN");
  const [winnipegAddress, setWinnipegAddress] = useState("");
  const [townAddress, setTownAddress] = useState("");
  const [searching, setSearching] = useState<null | "wpg" | "town" | number>(null);

  const [mode, setMode] = useState<CourierMode>("ONE_WAY");
  const [runDate, setRunDate] = useState("");
  const [pickupWhen, setPickupWhen] = useState<"ASAP" | "LATER">("ASAP");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupWindow, setPickupWindow] = useState<PickupWindow | null>(null);
  const [later] = useState(laterSlots);

  const [description, setDescription] = useState("");
  const [size, setSize] = useState<PackageSize | null>(null);
  const [weightLb, setWeightLb] = useState("");
  const [value, setValue] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [stops, setStops] = useState<string[]>([]);
  const [orderedBy, setOrderedBy] = useState<"SENDER" | "RECEIVER">("SENDER");
  const [meEdit, setMe] = useState<{ name: string; phone: string } | null>(null);
  const [other, setOther] = useState({ name: "", phone: "" });
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<"APP" | "DOOR">("APP");
  const [cardId, setCardId] = useState<string | null | undefined>(undefined);

  const [estimate, setEstimate] = useState<CourierEstimate | null>(null);
  const [paidIntent, setPaidIntent] = useState<string | null>(null);

  const me = meEdit ?? { name: user ? `${user.firstName} ${user.lastName}`.trim() : "", phone: user?.phone ?? "" };
  const route = routes.find((r) => r.id === routeId) ?? null;
  const towns = useMemo(() => {
    const q = townQuery.trim().toLowerCase();
    return routes.filter((r) => !q || r.town.toLowerCase().includes(q));
  }, [routes, townQuery]);
  const sender = orderedBy === "SENDER" ? me : other;
  const receiver = orderedBy === "SENDER" ? other : me;
  const pay = mode === "SCHEDULED" ? "APP" : payMethod;
  const lb = limits ? Math.floor(limits.maxWeightKg * 2.20462) : 30;
  /* Any change after pricing needs a new price */
  const reprice = () => setEstimate(null);

  usePreventRemove(!paidIntent && step > 1, () => setStep((s) => (s - 1) as 1 | 2));

  const next = async () => {
    setError(null);
    if (step === 1) {
      if (!route) return setError("Choose a town.");
      if (!winnipegAddress) return setError("Choose the Winnipeg address.");
      if (!townAddress) return setError(`Choose the ${route.town} address.`);
      return setStep(2);
    }
    if (step === 2) {
      if (mode === "SCHEDULED" && !runDate) return setError("Choose a delivery day.");
      if (mode === "SCHEDULED" && !pickupWindow) return setError("Choose a pickup window.");
      if (mode === "ONE_WAY" && pickupWhen === "LATER" && (!pickupDate || !pickupTime)) return setError("Choose a pickup day and time.");
      return setStep(3);
    }
    if (!estimate) {
      if (!description.trim()) return setError("Describe the package.");
      if (!size) return setError("Choose the package size.");
      if (value === "" || Number(value) < 0) return setError("Enter the package value.");
      if (limits && Number(value) > limits.maxPackageValue) return setError(`We carry packages worth up to $${limits.maxPackageValue.toFixed(0)}.`);
      if (weightLb && Number(weightLb) > lb) return setError(`Packages can weigh up to ${lb} lb.`);
      if (!allowed) return setError("Please confirm the package has none of the items we don't carry.");
      if (!sender.name.trim() || !phoneOk(sender.phone)) return setError("Enter the sender's name and mobile number.");
      if (!receiver.name.trim() || !phoneOk(receiver.phone)) return setError("Enter the receiver's name and mobile number.");
      setBusy(true);
      try {
        setEstimate(await courier.estimate({
          routeId, direction, mode, runDate: mode === "SCHEDULED" ? runDate : null,
          pickupDate: mode === "ONE_WAY" && pickupWhen === "LATER" ? pickupDate : null,
          pickupTime: mode === "ONE_WAY" && pickupWhen === "LATER" ? pickupTime : null,
          pickupWindow: mode === "SCHEDULED" ? pickupWindow : null,
          winnipegAddress, townAddress, extraStops: stops.filter(Boolean),
          package: { description: description.trim(), size, value: Number(value), weightKg: weightLb ? Number(weightLb) / 2.20462 : null },
          orderedBy, payMethod: pay, sender: { name: sender.name.trim(), phone: sender.phone.trim() },
          receiver: { name: receiver.name.trim(), phone: receiver.phone.trim() }, leaveAtDoor, instructions: notes.trim() || null,
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't price this delivery.");
      } finally {
        setBusy(false);
      }
      return;
    }
    /* Pay (in app) and book — safe to retry: a paid intent never books twice */
    setBusy(true);
    let intentId = paidIntent;
    try {
      if (pay === "APP" && !intentId) {
        const r = await payForQuote(estimate.quote, { name: me.name, email: user?.email }, cardId);
        if (r.status === "canceled") return;
        intentId = r.intentId;
        setPaidIntent(intentId);
      }
      const b = await courier.book(estimate.quote, intentId ?? undefined);
      router.replace({ pathname: "/courier/[id]", params: { id: b.id } });
    } catch (e) {
      const msg = e instanceof ApiError && e.status !== 0 ? e.message : e instanceof Error ? e.message : "Something went wrong.";
      setError(intentId ? `${msg} Your payment is safe — tap again to finish booking (you won't be charged twice).` : msg);
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    if (paidIntent) return;
    if (step > 1) setStep((s) => (s - 1) as 1 | 2);
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const cta = step < 3 ? "Continue"
    : !estimate ? "See price"
      : paidIntent ? "Finish booking"
        : pay === "APP" ? `Pay ${money(estimate.total)} & book` : `Book · ${money(estimate.total)} due at the door`;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={back} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Icon name="back" size={18} color={colors.navy} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Movo Courier · Step {step} of 3</Text>
          <View style={styles.progress}>{[1, 2, 3].map((n) => <View key={n} style={[styles.progressBar, n <= step && { backgroundColor: colors.taupe }]} />)}</View>
        </View>
      </View>

      {data.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} /> : data.isError ? (
        <Text style={[styles.error, { marginTop: 40 }]}>Couldn&apos;t load Movo Courier. Please try again.</Text>
      ) : routes.length === 0 ? (
        <Text style={[styles.muted, { margin: 24 }]}>Movo Courier isn&apos;t running in any town right now. Please check back soon.</Text>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            {step === 1 && (
              <>
                <Text style={styles.title}>Send a package</Text>
                <Text style={styles.muted}>Same-day delivery between Winnipeg and nearby towns. Same price both ways.</Text>
                <Label>Town *</Label>
                <TextInput value={townQuery} onChangeText={(t) => { setTownQuery(t); if (route && t !== route.town) setRouteId(""); }}
                  placeholder="Start typing a town" placeholderTextColor="#9ca3af" style={styles.input} accessibilityLabel="Town" />
                {!route && (
                  <View style={styles.card}>
                    {towns.length === 0 && <Text style={[styles.muted, { paddingVertical: 12 }]}>Not served yet. We&apos;re starting with {routes.map((r) => r.town).join(" and ")}.</Text>}
                    {towns.map((r) => (
                      <Pressable key={r.id} onPress={() => { setRouteId(r.id); setTownQuery(r.town); setRunDate(""); reprice(); }} style={styles.townRow} accessibilityRole="button">
                        <Text style={styles.addrText}>{r.town}</Text>
                        <Text style={styles.muted}>from {money(r.scheduledPrice)}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Label>Direction</Label>
                <Segments value={direction} onChange={(v) => { setDirection(v); reprice(); }} options={[
                  { v: "TO_TOWN", l: `Winnipeg → ${route?.town ?? "town"}` }, { v: "TO_WINNIPEG", l: `${route?.town ?? "Town"} → Winnipeg` },
                ]} />
                {(direction === "TO_TOWN" ? (["wpg", "town"] as const) : (["town", "wpg"] as const)).map((k, i) => {
                  const isWpg = k === "wpg";
                  const v = isWpg ? winnipegAddress : townAddress;
                  return (
                    <View key={k}>
                      <Label>{i === 0 ? "Pickup" : "Drop-off"} in {isWpg ? "Winnipeg" : route?.town ?? "town"} *</Label>
                      <Pressable onPress={() => route || isWpg ? setSearching(k) : setError("Choose a town first.")} style={[styles.input, { marginTop: 6 }]} accessibilityRole="button">
                        <Text style={[styles.addrText, !v && styles.placeholder]} numberOfLines={2}>{v || `Street address in ${isWpg ? "Winnipeg" : route?.town ?? "the town"}`}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}

            {step === 2 && route && limits && (
              <>
                <Text style={styles.title}>How fast?</Text>
                <Text style={styles.muted}>{direction === "TO_TOWN" ? `Winnipeg → ${route.town}` : `${route.town} → Winnipeg`}</Text>
                {([
                  { id: "ONE_WAY" as const, t: "One Way", p: route.oneWayPrice, d: "Picked up now or at a time you choose, and delivered straight there." },
                  { id: "SCHEDULED" as const, t: "Scheduled", p: route.scheduledPrice, d: `On the ${route.town} run (${route.runDaysLabel}). Book by ${hourLabel(limits.scheduledCutoffHour)} the day before.` },
                ]).map((m) => (
                  <Pressable key={m.id} onPress={() => { setMode(m.id); reprice(); }} style={[styles.option, mode === m.id && styles.optionOn]}
                    accessibilityRole="radio" accessibilityState={{ selected: mode === m.id }}>
                    <View style={styles.between}><Text style={styles.optTitle}>{m.t}</Text><Text style={styles.optTitle}>{money(m.p)}</Text></View>
                    <Text style={styles.muted}>{m.d}</Text>
                  </Pressable>
                ))}
                {mode === "ONE_WAY" && (
                  <>
                    <Label>Pickup time *</Label>
                    <Segments value={pickupWhen} onChange={(v) => { setPickupWhen(v); reprice(); }} options={[
                      { v: "ASAP", l: "As soon as possible" }, { v: "LATER", l: "Choose a time" },
                    ]} />
                    {pickupWhen === "LATER" && (
                      <>
                        <Label>Day</Label>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                          {later.days.map((d) => (
                            <Pressable key={d.date} style={[styles.chip, pickupDate === d.date && styles.chipOn]}
                              onPress={() => { setPickupDate(d.date); if (!d.times.includes(pickupTime)) setPickupTime(""); reprice(); }}
                              accessibilityRole="radio" accessibilityState={{ selected: pickupDate === d.date }}>
                              <Text style={[styles.chipText, pickupDate === d.date && { color: "#fff" }]}>
                                {d.date === later.today ? "Today" : d.date === addDays(later.today, 1) ? "Tomorrow" : dayLabel(d.date)}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                        {!!pickupDate && (
                          <>
                            <Label>Time</Label>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                              {(later.days.find((d) => d.date === pickupDate)?.times ?? []).map((t) => (
                                <Pressable key={t} onPress={() => { setPickupTime(t); reprice(); }} style={[styles.chip, pickupTime === t && styles.chipOn]}
                                  accessibilityRole="radio" accessibilityState={{ selected: pickupTime === t }}>
                                  <Text style={[styles.chipText, pickupTime === t && { color: "#fff" }]}>{timeLabel(t)}</Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </>
                        )}
                      </>
                    )}
                    <Text style={styles.muted}>
                      {pickupWhen === "ASAP"
                        ? "We offer it to nearby drivers right away."
                        : `Pickups between ${hourLabel(ONE_WAY_LATER.firstHour)} and ${hourLabel(ONE_WAY_LATER.lastHour)}, at least an hour from now. If no driver accepts by the pickup time, you're refunded in full.`}
                    </Text>
                  </>
                )}
                {mode === "SCHEDULED" && (
                  <>
                    <Label>Delivery day *</Label>
                    <View style={styles.chips}>
                      {route.openRunDates.map((d) => (
                        <Pressable key={d} onPress={() => { setRunDate(d); reprice(); }} style={[styles.chip, runDate === d && styles.chipOn]}
                          accessibilityRole="radio" accessibilityState={{ selected: runDate === d }}>
                          <Text style={[styles.chipText, runDate === d && { color: "#fff" }]}>{dayLabel(d)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Label>Pickup window *</Label>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {PICKUP_WINDOWS.map((w) => (
                        <Pressable key={w.id} onPress={() => { setPickupWindow(w.id); reprice(); }} style={[styles.size, pickupWindow === w.id && styles.optionOn]}
                          accessibilityRole="radio" accessibilityState={{ selected: pickupWindow === w.id }} accessibilityLabel={`${w.label}: ${w.hint}`}>
                          <Text style={styles.optTitle}>{w.label}</Text><Text style={[styles.muted, { textAlign: "center" }]}>{w.hint}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.muted}>A run goes ahead with {limits.scheduledMinPackages} or more packages. If it doesn&apos;t, you&apos;re refunded in full the evening before.</Text>
                  </>
                )}
              </>
            )}

            {step === 3 && route && limits && (
              <>
                <Text style={styles.title}>Your package</Text>
                <Text style={styles.muted}>Fits in a car trunk or back seat, up to {lb} lb ({limits.maxWeightKg} kg) and ${limits.maxPackageValue.toFixed(0)} in value.</Text>
                <Label>What are we carrying? *</Label>
                <TextInput value={description} onChangeText={(t) => { setDescription(t); reprice(); }} maxLength={200} placeholder="e.g. Box of documents" placeholderTextColor="#9ca3af" style={styles.input} accessibilityLabel="Package description" />
                <Label>Size *</Label>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {SIZES.map((s) => (
                    <Pressable key={s.id} onPress={() => { setSize(s.id); reprice(); }} style={[styles.size, size === s.id && styles.optionOn]}
                      accessibilityRole="radio" accessibilityState={{ selected: size === s.id }} accessibilityLabel={`${s.label}: ${s.hint}`}>
                      <Text style={styles.optTitle}>{s.label}</Text><Text style={[styles.muted, { textAlign: "center", fontSize: 10 }]}>{s.hint}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}><Label>Weight (lb)</Label>
                    <TextInput value={weightLb} onChangeText={(t) => { setWeightLb(t); reprice(); }} keyboardType="decimal-pad" placeholder={`Up to ${lb}`} placeholderTextColor="#9ca3af" style={[styles.input, { marginTop: 6 }]} accessibilityLabel="Weight in pounds" /></View>
                  <View style={{ flex: 1 }}><Label>Value ($) *</Label>
                    <TextInput value={value} onChangeText={(t) => { setValue(t); reprice(); }} keyboardType="decimal-pad" placeholder={`Up to ${limits.maxPackageValue.toFixed(0)}`} placeholderTextColor="#9ca3af" style={[styles.input, { marginTop: 6 }]} accessibilityLabel="Package value" /></View>
                </View>
                <View style={styles.notice}>
                  <Text style={styles.label}>We don&apos;t carry</Text>
                  <Text style={styles.muted}>{NOT_CARRIED}</Text>
                  <Check on={allowed} onChange={setAllowed}>My package has none of these.</Check>
                </View>

                <Label>Extra pickups</Label>
                <Text style={styles.muted}>Collect from up to {limits.maxExtraStops} more places on the way. Priced on the extra distance.</Text>
                {stops.map((s, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Pressable onPress={() => setSearching(i)} style={[styles.input, { flex: 1 }]} accessibilityRole="button">
                      <Text style={[styles.addrText, !s && styles.placeholder]} numberOfLines={2}>{s || `Pickup ${i + 2} address`}</Text>
                    </Pressable>
                    <Pressable onPress={() => { setStops(stops.filter((_, j) => j !== i)); reprice(); }} hitSlop={8} accessibilityLabel={`Remove pickup ${i + 2}`}>
                      <Icon name="trash" size={18} color="#6b7280" />
                    </Pressable>
                  </View>
                ))}
                {stops.length < limits.maxExtraStops && (
                  <Pressable onPress={() => { setStops([...stops, ""]); setSearching(stops.length); }} accessibilityRole="button"><Text style={styles.link}>+ Add a pickup</Text></Pressable>
                )}

                <Label>I&apos;m the</Label>
                <Segments value={orderedBy} onChange={(v) => { setOrderedBy(v); reprice(); }} options={[{ v: "SENDER", l: "Sender" }, { v: "RECEIVER", l: "Receiver" }]} />
                {[
                  { who: orderedBy === "SENDER" ? "Sender (you)" : "Receiver (you)", v: me, set: setMe },
                  { who: orderedBy === "SENDER" ? "Receiver" : "Sender", v: other, set: setOther },
                ].map((p) => (
                  <View key={p.who} style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}><Label>{p.who} name *</Label>
                      <TextInput value={p.v.name} onChangeText={(t) => { p.set({ ...p.v, name: t }); reprice(); }} style={[styles.input, { marginTop: 6 }]} accessibilityLabel={`${p.who} name`} /></View>
                    <View style={{ flex: 1 }}><Label>Mobile *</Label>
                      <TextInput value={p.v.phone} onChangeText={(t) => { p.set({ ...p.v, phone: t }); reprice(); }} keyboardType="phone-pad" placeholder="204 555 0123" placeholderTextColor="#9ca3af" style={[styles.input, { marginTop: 6 }]} accessibilityLabel={`${p.who} mobile`} /></View>
                  </View>
                ))}
                <Check on={leaveAtDoor} onChange={(v) => { setLeaveAtDoor(v); reprice(); }}>If nobody&apos;s home, leave it at the door. (Otherwise the driver brings it back to the sender.)</Check>
                <Label>Notes for the driver</Label>
                <TextInput value={notes} onChangeText={(t) => { setNotes(t); reprice(); }} maxLength={300} placeholder="e.g. Buzz 204, side door" placeholderTextColor="#9ca3af" style={styles.input} accessibilityLabel="Notes for the driver" />

                {mode === "ONE_WAY" && (
                  <>
                    <Label>Payment</Label>
                    <Segments value={payMethod} onChange={(v) => { setPayMethod(v); reprice(); }} options={[{ v: "APP", l: "Pay now" }, { v: "DOOR", l: "Receiver pays at door" }]} />
                    {payMethod === "DOOR" && <Text style={styles.muted}>When the driver arrives, the receiver gets a text with a secure card payment link. The package is handed over once it&apos;s paid.</Text>}
                  </>
                )}

                {estimate && (
                  <View style={styles.price}>
                    <View style={styles.between}><Text style={styles.line}>{mode === "SCHEDULED" ? "Scheduled" : "One Way"} delivery · {route.town}</Text><Text style={styles.line}>{money(estimate.routePrice)}</Text></View>
                    <Text style={styles.muted}>Pickup: {mode === "SCHEDULED"
                      ? `${dayLabel(runDate)} · ${PICKUP_WINDOWS.find((w) => w.id === pickupWindow)?.label ?? ""} (${PICKUP_WINDOWS.find((w) => w.id === pickupWindow)?.hint ?? ""})`
                      : pickupWhen === "LATER" && pickupDate && pickupTime ? `${dayLabel(pickupDate)} · ${timeLabel(pickupTime)}` : "As soon as possible"}</Text>
                    {estimate.extraStopsTotal > 0 && <View style={styles.between}><Text style={styles.line}>Extra pickups</Text><Text style={styles.line}>+{money(estimate.extraStopsTotal)}</Text></View>}
                    <View style={[styles.between, styles.totalRow]}><Text style={styles.total}>Total</Text><Text style={styles.total}>{money(estimate.total)}</Text></View>
                    <Text style={styles.muted}>CAD, GST included. {limits.freeWaitingMinutes} minutes free waiting at each stop, then ${limits.waitingRatePerMin.toFixed(2)}/min.</Text>
                  </View>
                )}
                {estimate && pay === "APP" && !paidIntent && <CardPicker value={cardId} onChange={setCardId} />}
              </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable onPress={next} disabled={busy} accessibilityRole="button">
              <LinearGradient colors={busy ? ["#9ca3af", "#9ca3af"] : ["#1a1a2e", "#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{cta}</Text>}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {searching !== null && (
        <AddressSearch
          title={searching === "wpg" ? "Winnipeg address" : searching === "town" ? `${route?.town ?? "Town"} address` : `Pickup ${Number(searching) + 2}`}
          initial={searching === "wpg" ? winnipegAddress : searching === "town" ? townAddress || (route ? `${route.town}, MB` : "") : stops[searching as number]}
          allowCurrentLocation
          onClose={() => { if (typeof searching === "number" && !stops[searching]) setStops(stops.filter((_, j) => j !== searching)); setSearching(null); }}
          onPick={(a) => {
            if (searching === "wpg") setWinnipegAddress(a);
            else if (searching === "town") setTownAddress(a);
            else setStops(stops.map((s, j) => (j === searching ? a : s)));
            reprice();
            setSearching(null);
          }} />
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
  page: { padding: 16, gap: 10, paddingBottom: 40 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14 },
  townRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  addrText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#111827" },
  placeholder: { color: "#9ca3af" },
  input: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: "#111827" },
  segments: { flexDirection: "row", backgroundColor: "#e9ebf1", borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 9, alignItems: "center" },
  segmentOn: { backgroundColor: "#0A0A0F" },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  option: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 2, borderColor: "#f1f1ee", padding: 14, gap: 4 },
  optionOn: { borderColor: colors.navy },
  optTitle: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  size: { flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 2, borderColor: "#e5e7eb", padding: 8, alignItems: "center", gap: 2 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  notice: { backgroundColor: "#fff", borderRadius: 12, padding: 12, gap: 6 },
  check: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 4 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#d1d5db", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: "#374151", lineHeight: 18 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
  price: { backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 8 },
  line: { fontFamily: fonts.body, fontSize: 13, color: "#4b5563" },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 2 },
  total: { fontFamily: fonts.heading, fontSize: 16, color: "#111827" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", textAlign: "center" },
  cta: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 6 },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 16, color: "#fff" },
});

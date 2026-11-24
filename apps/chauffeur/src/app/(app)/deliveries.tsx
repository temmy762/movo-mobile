/**
 * Movo Courier for drivers (the web's /driver/home/courier): the Courier
 * switch, offers with the payout (accept or skip — no penalty), and each
 * delivery: heading to pickup → at pickup → pickup photo → at drop-off →
 * (card link if the receiver pays at the door) → drop-off photo + outcome.
 * Cancelling a Scheduled run < 2 h before counts as a late cancel.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert, ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { courier } from "@movo/api";
import { SOCKET_EVENTS, pickupWhenLabel } from "@movo/shared";
import { colors, fonts } from "@movo/ui";
import { useSocket } from "@/lib/socket";
import { CourierAgreementForm } from "@/components/CourierAgreementForm";

type Offer = courier.CourierOffer;
type Job = courier.CourierJob;
type Outcome = courier.CourierOutcome;

const money = (n: number | null | undefined) => (n == null ? "—" : `$${n.toFixed(2)}`);
/* "Tue, Nov 25 · 3:30 pm" or "Tue, Nov 25 · Morning (9 am – 12 pm)" */
const when = (j: courier.CourierOffer) => pickupWhenLabel(j);
const SIZE: Record<string, string> = { SMALL: "Small", MEDIUM: "Medium", LARGE: "Large" };
const mapsTo = (addr: string) => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`);

async function takePhoto(): Promise<{ uri: string; name: string; type: string } | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Camera needed", "Allow camera access in your phone's settings to take the delivery photos.");
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.5 });
  const a = res.canceled ? null : res.assets[0];
  if (!a) return null;
  const type = a.mimeType ?? "image/jpeg";
  return { uri: a.uri, name: `delivery.${type.split("/")[1] ?? "jpg"}`, type };
}

function Btn({ label, onPress, busy, tone = "navy" }: { label: string; onPress: () => void; busy?: boolean; tone?: "navy" | "light" | "red" }) {
  const bg = tone === "navy" ? colors.navy : tone === "red" ? "#b91c1c" : "#fff";
  return (
    <Pressable onPress={onPress} disabled={busy} style={[styles.btn, { backgroundColor: busy ? "#9ca3af" : bg }, tone === "light" && styles.btnLight]} accessibilityRole="button">
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, tone === "light" && { color: colors.navy }]}>{label}</Text>}
    </Pressable>
  );
}

function JobCard({ job, refresh }: { job: Job; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("DELIVERED");
  const [paid, setPaid] = useState(job.paymentStatus === "PAID");
  /* When the card was shown — the list refetches every 15 s, close enough for a 3 h window */
  const [now] = useState(() => Date.now());

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); refresh(); }
    catch (e) { Alert.alert("Couldn't do that", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  };
  const photoStep = (action: "pickup" | "deliver") => async () => {
    const file = await takePhoto();
    if (file) run(() => courier.withPhoto(job.id, action, file, action === "deliver" ? outcome : undefined));
  };
  const cancel = () => Alert.alert("Can't do this delivery?", `It goes back to other drivers and the customer is told.${job.scheduledAt ? " Cancelling a booked-ahead delivery less than 2 hours before pickup counts as a late cancel; repeated late cancels stop booked-ahead offers." : ""}`, [
    { text: "Keep it", style: "cancel" },
    { text: "Cancel it", style: "destructive", onPress: () => run(() => courier.act(job.id, "cancel")) },
  ]);

  const door = job.payMethod === "DOOR";
  const upcoming = !!job.scheduledAt && !job.enRouteAt && new Date(job.scheduledAt).getTime() - now > 3 * 3600_000;
  const target = job.pickedUpAt ? job.dropoff : job.pickup;
  const outcomes: { id: Outcome; l: string }[] = [
    { id: "DELIVERED", l: "Handed over" },
    ...(job.leaveAtDoor ? [{ id: "LEFT_AT_DOOR" as const, l: "Left at door" }] : []),
    { id: "RETURNED_TO_SENDER", l: "Nobody home" },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.between}>
        <Text style={styles.kicker}>{job.mode === "SCHEDULED" ? "SCHEDULED" : "ONE WAY"}{job.scheduledAt ? ` · ${when(job)}` : ""} · {job.bookingNumber}</Text>
        <Text style={styles.pay}>{money(job.payout)}</Text>
      </View>
      <Text style={styles.label}>{job.pickedUpAt ? "Deliver to" : "Pick up at"}</Text>
      <Pressable onPress={() => mapsTo(target)} accessibilityRole="link"><Text style={styles.addr}>{target}</Text></Pressable>
      {!job.pickedUpAt && job.stops.length > 0 && <Text style={styles.muted}>Also collect from: {job.stops.join(" · ")}</Text>}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {[{ w: "Sender", p: job.sender }, { w: "Receiver", p: job.receiver }].map(({ w, p }) => (
          <Pressable key={w} onPress={() => Linking.openURL(`tel:${p.phone}`)} style={styles.party} accessibilityRole="button" accessibilityLabel={`Call ${w.toLowerCase()} ${p.name}`}>
            <Text style={styles.small}>{w}</Text><Text style={styles.strong} numberOfLines={1}>{p.name}</Text><Text style={styles.link}>Call</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.muted}>📦 {job.package.description} · {SIZE[job.package.size]} · value {money(job.package.value)} · {job.leaveAtDoor ? "can be left at the door" : "hand to a person"}</Text>
      {job.instructions ? <Text style={styles.muted}>Notes: {job.instructions}</Text> : null}
      {door && <Text style={styles.door}>{paid ? "Paid at the door ✓" : `Receiver pays ${money(job.total)} by card at the door`}</Text>}

      <View style={{ gap: 8, marginTop: 10 }}>
        {upcoming ? <Text style={styles.muted}>Pickup {when(job)}. Start it on the day.</Text>
          : !job.enRouteAt ? <Btn label="Heading to pickup" busy={busy} onPress={() => run(() => courier.act(job.id, "en_route"))} />
            : !job.pickedUpAt ? (!job.arrivedAt
              ? <Btn label="I'm at the pickup" busy={busy} onPress={() => run(() => courier.act(job.id, "arrived"))} />
              : <>
                <Text style={styles.muted}>Collect the package, check the drop-off address with the sender, then take a photo of the package.</Text>
                <Btn label="Take pickup photo & confirm" busy={busy} onPress={photoStep("pickup")} />
              </>)
              : <>
                {door && !paid && (
                  <View style={styles.doorBox}>
                    <Text style={styles.muted}>Hand the package over once it&apos;s paid. At the door, text the card link to the receiver.</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}><Btn tone="light" label="Text pay link" busy={busy} onPress={() => run(() => courier.act(job.id, "door_link"))} /></View>
                      <View style={{ flex: 1 }}><Btn tone="light" label="Check payment" busy={busy} onPress={() => run(async () => {
                        const r = await courier.act(job.id, "check_payment");
                        if (r.paid) setPaid(true); else Alert.alert("Not paid yet", "Ask the receiver to finish the payment from the text message.");
                      })} /></View>
                    </View>
                  </View>
                )}
                <View style={styles.segments}>
                  {outcomes.map((o) => (
                    <Pressable key={o.id} onPress={() => setOutcome(o.id)} style={[styles.segment, outcome === o.id && styles.segmentOn]}
                      accessibilityRole="radio" accessibilityState={{ selected: outcome === o.id }}>
                      <Text style={[styles.segmentText, outcome === o.id && { color: "#fff" }]}>{o.l}</Text>
                    </Pressable>
                  ))}
                </View>
                {outcome === "RETURNED_TO_SENDER" && <Text style={styles.muted}>Take a photo at the door, then bring the package back to {job.sender.name} at {job.pickup}.</Text>}
                <Btn busy={busy} onPress={photoStep("deliver")}
                  label={outcome === "RETURNED_TO_SENDER" ? "Door photo & return to sender" : "Drop-off photo & finish"} />
              </>}
        {!job.pickedUpAt && <Pressable onPress={cancel} hitSlop={8}><Text style={[styles.muted, { textAlign: "center", textDecorationLine: "underline" }]}>Can&apos;t do this delivery</Text></Pressable>}
      </View>
    </View>
  );
}

/* A finished delivery: the customer's stars + tip, and rating the customer */
function RecentCard({ job, refresh }: { job: Job; refresh: () => void }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const needsText = stars > 0 && stars <= 3 && !text.trim();
  const save = async () => {
    setSaving(true);
    try { await courier.rateCustomer(job.id, stars, text.trim() || null); refresh(); }
    catch (e) { Alert.alert("Couldn't save", e instanceof Error ? e.message : "Please try again."); }
    finally { setSaving(false); }
  };
  return (
    <View style={styles.card}>
      <View style={styles.between}>
        <Text style={styles.body}>{job.town} · {job.outcome === "RETURNED_TO_SENDER" ? "Returned" : job.outcome === "LEFT_AT_DOOR" ? "Left at door" : "Delivered"}</Text>
        <Text style={styles.pay}>{money(job.payout)}{job.tip ? ` + ${money(job.tip)} tip` : ""}</Text>
      </View>
      <Text style={styles.muted}>
        Customer&apos;s rating: {job.rating
          ? <Text><Text style={{ color: "#f59e0b" }}>{"★".repeat(job.rating)}</Text><Text style={{ color: "#d1d5db" }}>{"★".repeat(5 - job.rating)}</Text>{job.review ? ` “${job.review}”` : ""}</Text>
          : "not rated yet"}
      </Text>
      {job.customerRating ? (
        <Text style={styles.muted}>You rated the customer {"★".repeat(job.customerRating)}</Text>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Text style={styles.muted}>Rate the customer</Text>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setStars(s)} hitSlop={4} accessibilityRole="radio" accessibilityState={{ selected: stars === s }} accessibilityLabel={`${s} star${s > 1 ? "s" : ""}`}>
                <Text style={{ fontSize: 24, color: s <= stars ? "#f59e0b" : "#d1d5db" }}>{"★"}</Text>
              </Pressable>
            ))}
          </View>
          {stars > 0 && stars <= 3 && (
            <TextInput value={text} onChangeText={setText} maxLength={500} placeholder="Required: what went wrong?" placeholderTextColor="#9ca3af"
              style={styles.input} accessibilityLabel="What went wrong" />
          )}
          {stars > 0 && <Btn label={saving ? "Saving..." : "Save rating"} busy={saving || needsText} onPress={save} />}
        </>
      )}
    </View>
  );
}

export default function Deliveries() {
  const { on } = useSocket();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["courier-driver"], queryFn: courier.driverState, refetchInterval: 15_000 });
  const { refetch } = q;
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  /* New courier offers arrive live */
  useEffect(() => on(SOCKET_EVENTS.BOOKING_CREATED, (d) => { if ((d as { carTier?: string }).carTier === "courier") refetch(); }), [on, refetch]);

  const s = q.data;
  const toggle = async (v: boolean) => {
    try { await courier.setEnabled(v); refetch(); }
    catch (e) { Alert.alert("Couldn't update", e instanceof Error ? e.message : "Please try again."); }
  };
  const [signing, setSigning] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const requestAccess = async (v: { agreementName: string; insuranceConfirmed: true }) => {
    setRequesting(true);
    try { await courier.requestAccess(v); setSigning(false); refetch(); }
    catch (e) { Alert.alert("Couldn't send your request", e instanceof Error ? e.message : "Please try again."); }
    finally { setRequesting(false); }
  };
  const accept = async (o: Offer) => {
    setBusyId(o.id);
    try { await courier.act(o.id, "accept"); }
    catch (e) { Alert.alert("Couldn't accept", e instanceof Error ? e.message : "Please try again."); }
    finally { setBusyId(null); refetch(); }
  };
  const offers = (s?.offers ?? []).filter((o) => !skipped.includes(o.id));

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={styles.h1}>Courier deliveries</Text>
        {s?.courierAccess === "APPROVED" && <Switch value={s.courierEnabled} onValueChange={toggle} trackColor={{ true: colors.navy }} accessibilityLabel="Courier deliveries" />}
      </View>
      {!s ? (q.isError ? <Text style={[styles.muted, { margin: 24 }]}>Couldn&apos;t load deliveries. Pull to refresh.</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />) : (
        <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { refetch(); }} />}>
          {s.courierAccess !== "APPROVED" && (
            <View style={styles.card}>
              <Text style={styles.body}>
                {s.courierAccess === "REQUESTED"
                  ? "You've asked for Movo Courier access. The Movo team will review it and let you know."
                  : "Movo Courier is same-day package delivery between Winnipeg and nearby towns. The Movo team approves drivers for it."}
              </Text>
              {s.courierAccess !== "REQUESTED" && signing && (
                <CourierAgreementForm busy={requesting} onCancel={() => setSigning(false)} onSubmit={requestAccess} />
              )}
              {s.courierAccess !== "REQUESTED" && !signing && (
                <Pressable onPress={() => setSigning(true)} style={styles.requestBtn} accessibilityRole="button">
                  <Text style={styles.requestText}>{s.courierAccess === "DECLINED" ? "Request again" : "Request access"}</Text>
                </Pressable>
              )}
            </View>
          )}
          {s.courierAccess === "APPROVED" && !s.courierEnabled && <Text style={[styles.card, styles.body]}>Turn on Courier to get same-day package deliveries between Winnipeg and nearby towns. You see the payout before you accept, and you can skip any offer.</Text>}
          {s.scheduledBlocked && <Text style={styles.warn}>Scheduled offers are paused after {s.lateCancels} late cancels. Contact Movo to restore them.</Text>}

          {s.jobs.length > 0 && <Text style={styles.section}>YOUR DELIVERIES</Text>}
          {s.jobs.map((j) => <JobCard key={j.id} job={j} refresh={() => refetch()} />)}

          {s.courierEnabled && (
            <>
              <Text style={styles.section}>OFFERS</Text>
              {offers.length === 0 && <Text style={styles.muted}>No delivery offers right now. New ones appear here and as notifications.</Text>}
              {offers.map((o) => (
                <View key={o.id} style={styles.card}>
                  <View style={styles.between}>
                    <Text style={styles.kicker}>{o.mode === "SCHEDULED" ? "SCHEDULED" : "ONE WAY"}{o.scheduledAt ? ` · ${when(o)}` : " · NOW"} · {o.town.toUpperCase()}</Text>
                    <Text style={styles.payBig}>{money(o.payout)}</Text>
                  </View>
                  <Text style={styles.body}><Text style={styles.muted}>From </Text>{o.pickup}</Text>
                  {o.stops.map((x, i) => <Text key={i} style={styles.muted}>+ pickup {x}</Text>)}
                  <Text style={styles.body}><Text style={styles.muted}>To </Text>{o.dropoff}</Text>
                  <Text style={styles.muted}>📦 {SIZE[o.package.size]} · value {money(o.package.value)}{o.payMethod === "DOOR" ? " · receiver pays at the door" : ""}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <View style={{ flex: 1 }}><Btn tone="light" label="Skip" onPress={() => setSkipped((x) => [...x, o.id])} /></View>
                    <View style={{ flex: 1 }}><Btn label="Accept" busy={busyId === o.id} onPress={() => accept(o)} /></View>
                  </View>
                </View>
              ))}
            </>
          )}

          {s.recent.length > 0 && <Text style={styles.section}>RECENTLY FINISHED</Text>}
          {s.recent.map((r) => <RecentCard key={r.id} job={r} refresh={() => { refetch(); }} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  requestBtn: { marginTop: 12, backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  requestText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  h1: { fontFamily: fonts.heading, fontSize: 18, color: "#111827" },
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151", letterSpacing: 1, marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 4 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  kicker: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 11, color: "#8A7F6B" },
  pay: { fontFamily: fonts.heading, fontSize: 15, color: "#15803d" },
  payBig: { fontFamily: fonts.heading, fontSize: 18, color: "#15803d" },
  label: { fontFamily: fonts.heading, fontSize: 15, color: "#111827", marginTop: 4 },
  addr: { fontFamily: fonts.body, fontSize: 14, color: "#111827", textDecorationLine: "underline" },
  party: { flex: 1, backgroundColor: "#f9fafb", borderRadius: 10, padding: 8 },
  small: { fontFamily: fonts.body, fontSize: 11, color: "#6b7280" },
  strong: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#111827" },
  link: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy, textDecorationLine: "underline" },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#111827" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  door: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#b45309", marginTop: 4 },
  doorBox: { backgroundColor: "#fffbeb", borderRadius: 12, padding: 10, gap: 8 },
  warn: { fontFamily: fonts.body, fontSize: 12, color: "#b91c1c", backgroundColor: "#fef2f2", borderRadius: 10, padding: 10 },
  input: { borderWidth: 1, borderColor: "#fcd34d", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontFamily: fonts.body, fontSize: 13, color: "#111827", marginTop: 6 },
  btn: { minHeight: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  btnLight: { borderWidth: 1, borderColor: "#d1d5db" },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  segments: { flexDirection: "row", backgroundColor: "#e9ebf1", borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segmentOn: { backgroundColor: "#0A0A0F" },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
});

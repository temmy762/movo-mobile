/**
 * Live ride — the mobile counterpart of movo-web home/ride/tracking.
 * The booking is re-read every few seconds and on every ride event (sockets
 * can miss events while the phone sleeps); the chauffeur's position moves
 * live from driver.location on the booking room.
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, type LatLng } from "react-native-maps";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, rides } from "@movo/api";
import { SOCKET_EVENTS, type DriverPosition } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useSocket } from "@/lib/socket";
import { RouteChangeSheet } from "@/components/RouteChangeSheet";
import { canCancel, cancelPolicy, headline, isLive, ridePhase, type RidePhase } from "@/lib/ridePhase";

const POLL_MS = 8_000;
const WINNIPEG = { latitude: 49.8951, longitude: -97.1384, latitudeDelta: 0.12, longitudeDelta: 0.12 };
const money = (n: number) => `$${n.toFixed(2)}`;

const RIDE_EVENTS = [
  SOCKET_EVENTS.BOOKING_STATUS, SOCKET_EVENTS.BOOKING_ACCEPTED, SOCKET_EVENTS.DRIVER_ARRIVED,
  SOCKET_EVENTS.TRIP_STARTED, SOCKET_EVENTS.BOOKING_COMPLETED, SOCKET_EVENTS.BOOKING_CANCELLED,
  SOCKET_EVENTS.DRIVER_RELEASED, SOCKET_EVENTS.BOOKING_ROUTE_UPDATED,
  SOCKET_EVENTS.CARE_PRIMARY_ACCEPTED, SOCKET_EVENTS.CARE_ASSIGNMENT_STATUS, SOCKET_EVENTS.CARE_BOOKING_CONFIRMED,
  SOCKET_EVENTS.CARE_DISPATCH_FAILED, SOCKET_EVENTS.CARE_BOOKING_CLOSED,
] as const;

function stopsOf(stops: unknown): string[] {
  return Array.isArray(stops) ? stops.filter((s): s is string => typeof s === "string" && !!s) : [];
}

export default function Ride() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { join, leaveBooking, on } = useSocket();
  const queryClient = useQueryClient();
  const map = useRef<MapView>(null);
  const [position, setPosition] = useState<DriverPosition | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelResult, setCancelResult] = useState<string | null>(null);
  const [routeSheet, setRouteSheet] = useState<"destination" | "stop" | null>(null);
  const [routeNotice, setRouteNotice] = useState<string | null>(null);

  const ride = useQuery({
    queryKey: ["ride", id],
    queryFn: () => rides.detail(id),
    refetchInterval: (q) => (q.state.data && !isLive(ridePhase(q.state.data)) ? false : POLL_MS),
  });
  const r = ride.data;
  const phase: RidePhase | null = r ? ridePhase(r) : null;
  const live = !!phase && isLive(phase);

  /* Live updates for this booking */
  useEffect(() => {
    join({ bookingId: id });
    const refresh = () => { queryClient.invalidateQueries({ queryKey: ["ride", id] }); };
    const offs = RIDE_EVENTS.map((e) => on(e, (data) => {
      if ((data as { bookingId?: string })?.bookingId === id) refresh();
    }));
    const offLoc = on(SOCKET_EVENTS.DRIVER_LOCATION, (data) => {
      const d = data as { bookingId?: string; lat?: number; lng?: number; heading?: number };
      if (d.bookingId === id && typeof d.lat === "number" && typeof d.lng === "number") setPosition({ lat: d.lat, lng: d.lng, heading: d.heading });
    });
    return () => { offs.forEach((off) => off()); offLoc(); leaveBooking(id); };
  }, [id, join, leaveBooking, on, queryClient]);

  /* Starting position once a chauffeur is on the job */
  const hasDriver = !!r?.driver;
  useEffect(() => {
    if (!hasDriver || !live) return;
    rides.driverLocation(id).then((d) => { if (d.position) setPosition(d.position); }).catch(() => {});
  }, [id, hasDriver, live]);

  const pickupPt: LatLng | null = r?.pickupLat != null && r.pickupLng != null ? { latitude: r.pickupLat, longitude: r.pickupLng } : null;
  const dropoffPt: LatLng | null = r?.dropoffLat != null && r.dropoffLng != null ? { latitude: r.dropoffLat, longitude: r.dropoffLng } : null;
  const driverPt: LatLng | null = position && live && hasDriver ? { latitude: position.lat, longitude: position.lng } : null;

  /* Frame what matters now: chauffeur → pickup before the trip, → drop-off during it */
  const frameKey = [phase, !!driverPt, pickupPt?.latitude, dropoffPt?.latitude].join("|");
  useEffect(() => {
    const target = phase === "in_progress" ? dropoffPt : pickupPt;
    const points = [driverPt, target, phase === "in_progress" || !driverPt ? dropoffPt : null].filter((p): p is LatLng => !!p);
    if (points.length > 1) map.current?.fitToCoordinates(points, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    else if (points.length === 1) map.current?.animateToRegion({ ...points[0], latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
  }, [frameKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await rides.cancel(id);
      setCancelOpen(false);
      setCancelResult(res.refundError
        ? "Your refund is being processed by our team — you'll receive an email once it's sent."
        : typeof res.refundAmount === "number"
          ? `${money(res.refundAmount)} has been refunded to your card. It usually appears within 5–10 business days.`
          : "Your ride has been cancelled.");
      queryClient.invalidateQueries({ queryKey: ["ride", id] });
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
    } catch (e) {
      setCancelError(e instanceof ApiError && e.status !== 0 ? e.message : "Connection problem — your ride hasn't been cancelled. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/rides"));

  if (!r || !phase) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        {ride.isError ? (
          <>
            <Text style={styles.body}>Couldn&apos;t load this ride.</Text>
            <Pressable onPress={() => ride.refetch()}><Text style={styles.link}>Try again</Text></Pressable>
          </>
        ) : <ActivityIndicator color={colors.navy} />}
      </SafeAreaView>
    );
  }

  const h = headline(r, phase);
  const d = r.driver;
  const stops = stopsOf(r.stops);

  /* Same stops, new travel order — no price change */
  const moveStop = async (from: number, to: number) => {
    const next = [...stops];
    [next[from], next[to]] = [next[to], next[from]];
    setRouteNotice(null);
    try {
      await rides.reorderStops(id, next);
      queryClient.invalidateQueries({ queryKey: ["ride", id] });
    } catch (e) {
      setRouteNotice(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't reorder the stops.");
    }
  };

  return (
    <View style={styles.screen}>
      <MapView ref={map} style={styles.map} initialRegion={WINNIPEG} showsUserLocation={live} toolbarEnabled={false}>
        {pickupPt && <Marker coordinate={pickupPt} title="Pickup" pinColor={colors.navy} />}
        {dropoffPt && <Marker coordinate={dropoffPt} title="Destination" pinColor="#ef4444" />}
        {driverPt && (
          <Marker coordinate={driverPt} title={d ? `${d.firstName} (your chauffeur)` : "Your chauffeur"} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.car}><View style={styles.carDot} /></View>
          </Marker>
        )}
      </MapView>
      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
        <Pressable onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="back" size={18} color="#374151" strokeWidth={2.5} />
        </Pressable>
      </SafeAreaView>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetBody}>
        <View style={styles.between}>
          <Text style={styles.kicker}>{r.bookingType === "CARE" ? "Safe Ride" : r.carName}{r.bookingNumber ? ` · ${r.bookingNumber}` : ""}</Text>
          {live && <View style={styles.liveDot} />}
        </View>
        <Text style={styles.title}>{h.title}</Text>
        <Text style={styles.body}>{h.body}</Text>

        {d && live && (
          <View style={styles.driver}>
            {d.vehicle?.photoUrl
              ? <Image source={{ uri: d.vehicle.photoUrl }} style={styles.vehicleImg} contentFit="cover" />
              : <View style={[styles.vehicleImg, styles.noImg]}><Icon name="user" size={22} color="#9ca3af" /></View>}
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{d.firstName} {d.lastName}</Text>
              {d.avgRating != null && (
                <View style={styles.ratingRow}>
                  <Icon name="star" size={12} color="#f59e0b" fill="#f59e0b" />
                  <Text style={styles.small}>{d.avgRating.toFixed(1)}</Text>
                </View>
              )}
              {r.bookingType !== "CARE" && d.vehicle && (
                <Text style={styles.small}>{[d.vehicle.year, d.vehicle.make, d.vehicle.model].filter(Boolean).join(" ")} · {d.vehicle.plate}</Text>
              )}
            </View>
            {d.phone && (
              <Pressable onPress={() => Linking.openURL(`tel:${d.phone}`)} style={styles.round} accessibilityRole="button" accessibilityLabel="Call your chauffeur">
                <Icon name="phone" size={17} color={colors.navy} />
              </Pressable>
            )}
            <Pressable onPress={() => router.push({ pathname: "/ride/chat/[id]", params: { id, number: r.bookingNumber ?? "" } })}
              style={styles.round} accessibilityRole="button" accessibilityLabel="Message your chauffeur">
              <Icon name="message" size={17} color={colors.navy} />
            </Pressable>
          </View>
        )}

        <View style={styles.route}>
          <View style={styles.routeRow}><View style={[styles.dot, { backgroundColor: colors.navy }]} /><Text style={styles.routeText}>{r.pickup}</Text></View>
          {stops.map((s, i) => (
            <View key={`${i}-${s}`} style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: "#9ca3af" }]} />
              <Text style={styles.routeText}>Stop {i + 1}: {s}</Text>
              {live && stops.length > 1 && (
                <View style={styles.reorder}>
                  <Pressable onPress={() => moveStop(i, i - 1)} disabled={i === 0} hitSlop={6} accessibilityLabel={`Move stop ${i + 1} earlier`}>
                    <Text style={[styles.arrow, i === 0 && { opacity: 0.25 }]}>↑</Text>
                  </Pressable>
                  <Pressable onPress={() => moveStop(i, i + 1)} disabled={i === stops.length - 1} hitSlop={6} accessibilityLabel={`Move stop ${i + 1} later`}>
                    <Text style={[styles.arrow, i === stops.length - 1 && { opacity: 0.25 }]}>↓</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
          <View style={styles.routeRow}><View style={[styles.dot, { backgroundColor: "#ef4444" }]} /><Text style={styles.routeText}>{r.dropoff}</Text></View>
        </View>

        {live && (
          <View style={styles.actions}>
            <Pressable onPress={() => setRouteSheet("destination")} style={styles.action} accessibilityRole="button">
              <Icon name="navigation" size={16} color={colors.navy} />
              <Text style={styles.actionText}>Change destination</Text>
            </Pressable>
            {stops.length < 3 && (
              <Pressable onPress={() => setRouteSheet("stop")} style={styles.action} accessibilityRole="button">
                <Text style={styles.plus}>+</Text>
                <Text style={styles.actionText}>Add a stop</Text>
              </Pressable>
            )}
          </View>
        )}
        {routeNotice && <Text style={[styles.notice, !routeNotice.startsWith("✓") && { color: "#dc2626" }]}>{routeNotice}</Text>}

        <View style={styles.between}>
          <Text style={styles.small}>Total paid</Text>
          <Text style={styles.total}>{money(r.total)}</Text>
        </View>

        {phase === "completed" && r.rating == null && <RateChauffeur id={id} name={d?.firstName} />}

        {canCancel(phase) && (
          <Pressable onPress={() => { setCancelError(null); setCancelOpen(true); }} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel ride</Text>
          </Pressable>
        )}
        {phase === "in_progress" && (
          <Text style={[styles.small, { textAlign: "center" }]}>Need help during your trip? Contact support@movoprive.com.</Text>
        )}
      </ScrollView>

      {routeSheet && (
        <RouteChangeSheet bookingId={id} kind={routeSheet} currentDropoff={r.dropoff}
          onClose={() => setRouteSheet(null)}
          onDone={(charged) => {
            setRouteNotice(charged > 0
              ? `✓ ${money(charged)} charged. Your chauffeur has been told about the new route.`
              : "✓ Route updated. Your chauffeur has been told.");
            setRouteSheet(null);
            queryClient.invalidateQueries({ queryKey: ["ride", id] });
          }} />
      )}

      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Cancel Ride?</Text>
            <Text style={styles.body}>{cancelPolicy(r, phase)}</Text>
            {cancelError && <Text style={styles.error}>{cancelError}</Text>}
            <View style={styles.dialogRow}>
              <Pressable onPress={() => setCancelOpen(false)} disabled={cancelling} style={[styles.dialogBtn, styles.outline]}>
                <Text style={[styles.dialogBtnText, { color: "#374151" }]}>Keep Ride</Text>
              </Pressable>
              <Pressable onPress={doCancel} disabled={cancelling} style={[styles.dialogBtn, { backgroundColor: colors.navy, opacity: cancelling ? 0.6 : 1 }]}>
                <Text style={styles.dialogBtnText}>{cancelling ? "Cancelling…" : "Yes, Cancel"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!cancelResult} transparent animationType="fade" onRequestClose={() => setCancelResult(null)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Ride cancelled</Text>
            <Text style={styles.body}>{cancelResult}</Text>
            <Pressable onPress={() => { setCancelResult(null); router.replace("/"); }} style={[styles.dialogBtn, { backgroundColor: colors.navy }]}>
              <Text style={styles.dialogBtnText}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* Rate the chauffeur once the trip is complete (feedback required ≤ 3 stars) */
function RateChauffeur({ id, name }: { id: string; name?: string }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReview = rating > 0 && rating <= 3 && !review.trim();

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await rides.rate(id, rating, review.trim() || null);
      queryClient.invalidateQueries({ queryKey: ["ride", id] });
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't send your rating. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.rate}>
      <Text style={styles.driverName}>How was your ride{name ? ` with ${name}` : ""}?</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Pressable key={s} onPress={() => setRating(s)} hitSlop={4} accessibilityLabel={`${s} star${s > 1 ? "s" : ""}`}>
            <Icon name="star" size={30} strokeWidth={1.5} color={s <= rating ? "#f59e0b" : "#d1d5db"} fill={s <= rating ? "#f59e0b" : "none"} />
          </Pressable>
        ))}
      </View>
      {rating > 0 && (
        <TextInput value={review} onChangeText={setReview} multiline maxLength={1000} placeholderTextColor="#9ca3af"
          placeholder={rating <= 3 ? "Required: what went wrong?" : "Tell us more (optional)…"}
          style={[styles.reviewInput, needsReview && { borderColor: "#f59e0b" }]} />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      {rating > 0 && (
        <Pressable onPress={submit} disabled={saving || needsReview} accessibilityRole="button">
          <LinearGradient colors={saving || needsReview ? ["#9ca3af", "#9ca3af"] : ["#1a1a2e", "#131936", "#C6BFB2"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rateBtn}>
            <Text style={styles.dialogBtnText}>{saving ? "Sending…" : "Submit rating"}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F2" },
  center: { alignItems: "center", justifyContent: "center", gap: 10 },
  map: { height: "42%" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8 },
  back: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  car: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(19,25,54,0.25)", alignItems: "center", justifyContent: "center" },
  carDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.navy, borderWidth: 2, borderColor: "#fff" },
  sheet: { flex: 1, marginTop: -20, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetBody: { padding: 20, gap: 14, paddingBottom: 40 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#6b7280", letterSpacing: 0.4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827", marginTop: -6 },
  body: { fontFamily: fonts.body, fontSize: 14, color: "#4b5563", lineHeight: 20 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.navy },
  driver: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: "#F5F5F2" },
  vehicleImg: { width: 56, height: 56, borderRadius: 12 },
  noImg: { backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  driverName: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  small: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280" },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  route: { gap: 8 },
  routeRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: "#374151", lineHeight: 18 },
  total: { fontFamily: fonts.heading, fontSize: 16, color: "#111827" },
  reorder: { flexDirection: "row", gap: 12, paddingLeft: 6 },
  arrow: { fontFamily: fonts.heading, fontSize: 16, color: colors.navy },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
  plus: { fontFamily: fonts.heading, fontSize: 18, color: colors.navy, marginTop: -2 },
  notice: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#15803d", lineHeight: 17 },
  cancel: { paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", alignItems: "center" },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#dc2626" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  dialog: { backgroundColor: "#fff", borderRadius: 18, padding: 22, gap: 12 },
  dialogTitle: { fontFamily: fonts.heading, fontSize: 18, color: "#111827" },
  dialogRow: { flexDirection: "row", gap: 12 },
  dialogBtn: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  outline: { borderWidth: 1, borderColor: "#d1d5db" },
  dialogBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626" },
  rate: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: "#F5F5F2" },
  stars: { flexDirection: "row", gap: 8 },
  reviewInput: { minHeight: 70, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontFamily: fonts.body, fontSize: 13, color: "#111827", textAlignVertical: "top" },
  rateBtn: { minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

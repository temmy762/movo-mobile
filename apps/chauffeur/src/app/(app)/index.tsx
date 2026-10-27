/**
 * Chauffeur home — mirrors movo-web app/driver/home: online toggle, ride
 * requests (offer card with earnings + 30 s countdown), the active trip
 * (components/TripCard.tsx), Safe Ride (components/SafeRideCard.tsx) and
 * today's stats.
 * Location is shared while online (foreground + background, lib/location.ts).
 */
import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { driver as driverApi } from "@movo/api";
import { winnipegNowTime, type DriverBooking } from "@movo/shared";
import { Icon, fonts, colors } from "@movo/ui";
import { useSession } from "@/lib/session";
import { useShift } from "@/lib/shift";
import { useSocket } from "@/lib/socket";
import { isReservation, useRideRequests } from "@/lib/useRideRequests";
import { Route, dark, gradient, kit, money } from "@/components/homeKit";
import { TripCard } from "@/components/TripCard";
import { HomeMap, type MapPin } from "@/components/HomeMap";
import { SafeRideCard, SafeRideOffer } from "@/components/SafeRideCard";
import { useSafeRide } from "@/lib/useSafeRide";

function greeting(): string {
  const hour = Number(winnipegNowTime().slice(0, 2));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function Home() {
  const driver = useSession((s) => s.driver);
  const shift = useShift();
  const { join } = useSocket();
  const queryClient = useQueryClient();

  const stats = useQuery({ queryKey: ["driver-stats"], queryFn: driverApi.stats });
  const status = useQuery({ queryKey: ["onboarding-status"], queryFn: driverApi.onboardingStatus });

  /* On a ride = on shift (as on the web): make sure location is flowing */
  const onAccepted = useCallback(() => {
    if (!useShift.getState().online) useShift.getState().goOnline();
    queryClient.invalidateQueries({ queryKey: ["driver-stats"] });
  }, [queryClient]);

  /* Safe Ride offers only while online and not on a standard ride; a Safe
     Ride (offer or job) pauses standard requests */
  const onStandardRide = useRef(false);
  const canOfferSafeRide = useCallback(() => useShift.getState().online && !onStandardRide.current, []);
  const safe = useSafeRide({ canOffer: canOfferSafeRide, onAccepted });
  const requests = useRideRequests({ online: shift.online && safe.phase === "idle", onAccepted });
  useEffect(() => { onStandardRide.current = requests.phase === "accepted"; }, [requests.phase]);

  /* Back from Rides ("I'm heading to pickup" activates a reservation) */
  const { phase: requestPhase, restoreActive } = requests;
  useFocusEffect(useCallback(() => {
    if ((requestPhase === "idle" || requestPhase === "searching") && safe.phase === "idle") restoreActive();
  }, [requestPhase, restoreActive, safe.phase]));

  /* Earnings are credited when a Safe Ride part ends */
  useEffect(() => {
    if (safe.phase === "idle" || safe.phase === "awaiting_return") {
      queryClient.invalidateQueries({ queryKey: ["driver-stats"] });
    }
  }, [safe.phase, queryClient]);

  useEffect(() => { shift.restore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Tier room: the server only grants it when the tier matches the vehicle */
  const tier = status.data?.tier;
  useEffect(() => {
    if (shift.online && tier) join({ tier });
  }, [shift.online, tier, join]);

  /* Trip completed or handed back: stats changed, back to searching */
  const onTripFinished = useCallback((handedBack: boolean) => {
    requests.finishActive(handedBack);
    queryClient.invalidateQueries({ queryKey: ["driver-stats"] });
  }, [requests.finishActive, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => (shift.online ? shift.goOffline() : shift.goOnline());
  const notice = shift.error ?? safe.notice ?? requests.notice;
  const onAJob = requests.phase === "accepted" || (safe.phase !== "idle" && safe.phase !== "requesting");

  /* Pickup / drop-off pins for the ride in progress */
  const ride = requests.phase === "accepted" ? requests.booking
    : safe.phase !== "idle" && safe.phase !== "requesting" ? safe.assignment?.booking : null;
  const pins: MapPin[] = [];
  if (ride?.pickupLat != null && ride.pickupLng != null) {
    pins.push({ kind: "pickup", title: "Pickup", coordinate: { latitude: ride.pickupLat, longitude: ride.pickupLng } });
  }
  if (ride?.dropoffLat != null && ride.dropoffLng != null) {
    pins.push({ kind: "dropoff", title: "Drop-off", coordinate: { latitude: ride.dropoffLat, longitude: ride.dropoffLng } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark.bg }}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello} numberOfLines={1}>{greeting()}, {driver?.firstName}</Text>
            <Text style={[styles.sub, { color: shift.online ? dark.green : dark.soft }]}>
              {shift.online ? "You're online" : "You're offline"}
            </Text>
          </View>
          <Pressable onPress={toggle} disabled={shift.busy || onAJob} accessibilityRole="switch"
            accessibilityState={{ checked: shift.online }} style={{ opacity: shift.busy ? 0.6 : 1 }}>
            {shift.online ? (
              <LinearGradient colors={["#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pill}>
                <Text style={[styles.pillText, { color: "#fff" }]}>{shift.busy ? "…" : "Online"}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.pill, { backgroundColor: "#fff" }]}>
                <Text style={[styles.pillText, { color: "#374151" }]}>{shift.busy ? "…" : "Offline"}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.page}>
          {notice && (
            <Pressable onPress={() => { shift.clearError(); safe.clearNotice(); requests.clearNotice(); }} style={styles.notice}>
              <Icon name="alert" size={16} color={colors.taupe} />
              <Text style={styles.noticeText}>{notice}</Text>
            </Pressable>
          )}

          {shift.online && shift.location === "foreground" && (
            <Pressable onPress={() => Linking.openSettings()} style={styles.notice}>
              <Icon name="alert" size={16} color={colors.taupe} />
              <Text style={styles.noticeText}>
                Background location is off, so you only receive requests while Movo is open.
                Tap to allow location {Platform.OS === "ios" ? "\"Always\"" : "\"Allow all the time\""} in Settings.
              </Text>
            </Pressable>
          )}

          <HomeMap pins={pins} />

          {/* Ride requests */}
          {safe.phase === "requesting" && safe.assignment ? (
            <SafeRideOffer safe={safe} />
          ) : safe.phase !== "idle" && safe.assignment ? (
            <SafeRideCard safe={safe} />
          ) : requests.phase === "requesting" && requests.booking ? (
            <OfferCard booking={requests.booking} timeLeft={requests.timeLeft} acting={requests.acting}
              onAccept={requests.accept} onDecline={requests.decline} />
          ) : requests.phase === "accepted" && requests.booking ? (
            <TripCard key={requests.booking.id} booking={requests.booking} onFinished={onTripFinished} />
          ) : shift.online ? (
            <View style={[styles.card, styles.center]}>
              <ActivityIndicator color={colors.taupe} />
              <Text style={styles.cardTitle}>Looking for ride requests…</Text>
              <Text style={styles.dim}>New requests will appear automatically</Text>
            </View>
          ) : (
            <View style={[styles.card, styles.center]}>
              <Text style={styles.cardTitle}>No incoming requests</Text>
              <Text style={[styles.dim, { textAlign: "center" }]}>Go online to start receiving ride requests.</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.grid}>
            {[
              { label: "Today's Earnings", value: money(stats.data?.todayEarned) },
              { label: "Trips Today", value: `${stats.data?.tripsToday ?? 0}` },
              { label: "Total Earned", value: money(stats.data?.totalEarned) },
              { label: "Trips Completed", value: `${stats.data?.tripsCompleted ?? 0}` },
            ].map((t) => (
              <View key={t.label} style={[styles.card, styles.tile]}>
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileValue}>{t.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function OfferCard({ booking, timeLeft, acting, onAccept, onDecline }: {
  booking: DriverBooking; timeLeft: number; acting: boolean; onAccept: () => void; onDecline: () => void;
}) {
  return (
    <View style={[styles.card, { borderColor: dark.offerBorder, gap: 12 }]}>
      <View style={styles.chips}>
        <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
        <Text style={styles.cardTitle}>New Ride Request</Text>
        <Text style={styles.chipGold}>{booking.scheduledAt ? "Scheduled" : "Standard"}</Text>
        <Text style={styles.chipDim}>{booking.carName}</Text>
        <Text style={[styles.countdown, timeLeft <= 10 && { color: "#f87171" }]}>{timeLeft}s</Text>
      </View>
      {booking.scheduledAt && isReservation(booking) && (
        <Text style={styles.when}>{whenLabel(booking.scheduledAt)}</Text>
      )}
      <View style={styles.between}>
        <View>
          <Text style={styles.rider}>{booking.clientName}</Text>
          <Text style={styles.dim}>Booking #{booking.bookingNumber ?? booking.id.slice(0, 8)}</Text>
        </View>
        {booking.paymentStatus === "PAID" && <Text style={styles.paid}>Paid</Text>}
      </View>
      <Route pickup={booking.pickup} dropoff={booking.dropoff} />
      <View style={styles.earnings}>
        <Text style={styles.earningsLabel}>Est. Fare (your earnings)</Text>
        <Text style={styles.earningsValue}>{money(booking.earning)}</Text>
      </View>
      {/* Time left */}
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${(timeLeft / 30) * 100}%` }]} />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable onPress={onDecline} disabled={acting} style={[styles.btn, styles.btnOutline]}>
          <Text style={[styles.btnText, { color: dark.soft }]}>Decline</Text>
        </Pressable>
        <Pressable onPress={onAccept} disabled={acting} style={{ flex: 1 }}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            <Text style={styles.btnText}>{acting ? "…" : "Accept"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  hello: { fontFamily: fonts.heading, fontSize: 15, color: dark.text },
  sub: { fontFamily: fonts.bodySemi, fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  page: { padding: 16, gap: 12, paddingBottom: 32 },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 16, backgroundColor: "rgba(198,191,178,0.12)" },
  noticeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: dark.soft, lineHeight: 17 },
  center: { alignItems: "center", gap: 6, paddingVertical: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47.5%", paddingHorizontal: 14, paddingVertical: 12 },
  tileLabel: { fontFamily: fonts.body, fontSize: 11, color: dark.dim, marginBottom: 6 },
  tileValue: { fontFamily: fonts.heading, fontSize: 17, color: dark.text },
  chipGold: { fontFamily: fonts.bodySemi, fontSize: 9, color: colors.taupe, backgroundColor: "rgba(198,191,178,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  chipDim: { fontFamily: fonts.bodySemi, fontSize: 9, color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  countdown: { marginLeft: "auto", fontFamily: fonts.heading, fontSize: 13, color: colors.taupe },
  when: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.taupe },
  paid: { fontFamily: fonts.bodySemi, fontSize: 10, color: dark.green, backgroundColor: "rgba(74,222,128,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  earnings: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.05)" },
  earningsLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  bar: { height: 4, backgroundColor: colors.taupe },
});

const styles = { ...kit, ...local };

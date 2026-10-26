/**
 * Chauffeur home — mirrors movo-web app/driver/home: online toggle, ride
 * requests (offer card with earnings + 30 s countdown), today's stats.
 * Location is shared while online (foreground + background, lib/location.ts).
 */
import { useCallback, useEffect } from "react";
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
import { openWeb } from "@/lib/links";

/* Dark chauffeur theme from the web home */
const dark = {
  bg: "#0A0A0F",
  card: "#14141C",
  cardBorder: "rgba(255,255,255,0.08)",
  offerBorder: "rgba(198,191,178,0.45)",
  text: "#FFFFFF",
  dim: "rgba(255,255,255,0.45)",
  soft: "rgba(255,255,255,0.75)",
  green: "#4ade80",
};

function greeting(): string {
  const hour = Number(winnipegNowTime().slice(0, 2));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

const money = (n: number | undefined) => `$${(n ?? 0).toFixed(2)}`;

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

  const requests = useRideRequests({ online: shift.online, onAccepted });

  useEffect(() => { shift.restore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Tier room: the server only grants it when the tier matches the vehicle */
  const tier = status.data?.tier;
  useEffect(() => {
    if (shift.online && tier) join({ tier });
  }, [shift.online, tier, join]);

  const toggle = () => (shift.online ? shift.goOffline() : shift.goOnline());
  const notice = shift.error ?? requests.notice;

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
          <Pressable onPress={toggle} disabled={shift.busy || requests.phase === "accepted"} accessibilityRole="switch"
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
            <Pressable onPress={() => { shift.clearError(); requests.clearNotice(); }} style={styles.notice}>
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

          {/* Ride requests */}
          {requests.phase === "requesting" && requests.booking ? (
            <OfferCard booking={requests.booking} timeLeft={requests.timeLeft} acting={requests.acting}
              onAccept={requests.accept} onDecline={requests.decline} />
          ) : requests.phase === "accepted" && requests.booking ? (
            <AcceptedCard booking={requests.booking} />
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

function Route({ booking }: { booking: DriverBooking }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: colors.taupe }]} />
        <Text style={styles.routeText}>{booking.pickup}</Text>
      </View>
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
        <Text style={styles.routeText}>{booking.dropoff}</Text>
      </View>
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
      <Route booking={booking} />
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
          <LinearGradient colors={["#1a1a2e", "#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            <Text style={styles.btnText}>{acting ? "…" : "Accept"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

/* Trip controls (en route → arrived → start → complete) are the next build
   step; until then the chauffeur can finish the trip on the web. */
function AcceptedCard({ booking }: { booking: DriverBooking }) {
  const phone = booking.riderPhone ?? booking.user?.phone;
  const navigate = () => {
    const dest = encodeURIComponent(booking.startedAt ? booking.dropoff : booking.pickup);
    Linking.openURL(Platform.OS === "ios" ? `maps://?daddr=${dest}` : `https://www.google.com/maps/dir/?api=1&destination=${dest}`);
  };

  return (
    <View style={[styles.card, { borderColor: dark.offerBorder, gap: 12 }]}>
      <View style={styles.chips}>
        <Icon name="check" size={16} color={dark.green} />
        <Text style={styles.cardTitle}>{booking.startedAt ? "Trip in progress" : "Ride accepted — head to pickup"}</Text>
      </View>
      <View style={styles.between}>
        <Text style={styles.rider}>{booking.clientName}</Text>
        <Text style={styles.earningsValue}>{money(booking.earning)}</Text>
      </View>
      <Route booking={booking} />
      {booking.pickupInstructions ? <Text style={styles.dim}>Pickup note: {booking.pickupInstructions}</Text> : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable onPress={navigate} style={[styles.btn, styles.btnOutline]}>
          <Text style={[styles.btnText, { color: dark.soft }]}>Navigate</Text>
        </Pressable>
        {phone ? (
          <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={[styles.btn, styles.btnOutline]}>
            <Text style={[styles.btnText, { color: dark.soft }]}>Call rider</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={() => openWeb("/driver/home")}>
        <Text style={[styles.dim, { textDecorationLine: "underline" }]}>
          Trip controls arrive in the next app update — manage this trip on movoprive.com for now.
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  hello: { fontFamily: fonts.heading, fontSize: 15, color: dark.text },
  sub: { fontFamily: fonts.bodySemi, fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  page: { padding: 16, gap: 12, paddingBottom: 32 },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 16, backgroundColor: "rgba(198,191,178,0.12)" },
  noticeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: dark.soft, lineHeight: 17 },
  card: { backgroundColor: dark.card, borderWidth: 1, borderColor: dark.cardBorder, borderRadius: 16, padding: 16 },
  center: { alignItems: "center", gap: 6, paddingVertical: 20 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: dark.text },
  dim: { fontFamily: fonts.body, fontSize: 11, color: dark.dim },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47.5%", paddingHorizontal: 14, paddingVertical: 12 },
  tileLabel: { fontFamily: fonts.body, fontSize: 11, color: dark.dim, marginBottom: 6 },
  tileValue: { fontFamily: fonts.heading, fontSize: 17, color: dark.text },
  chips: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  chipGold: { fontFamily: fonts.bodySemi, fontSize: 9, color: colors.taupe, backgroundColor: "rgba(198,191,178,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  chipDim: { fontFamily: fonts.bodySemi, fontSize: 9, color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  countdown: { marginLeft: "auto", fontFamily: fonts.heading, fontSize: 13, color: colors.taupe },
  when: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.taupe },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rider: { fontFamily: fonts.bodySemi, fontSize: 13, color: dark.text },
  paid: { fontFamily: fonts.bodySemi, fontSize: 10, color: dark.green, backgroundColor: "rgba(74,222,128,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  routeRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  routeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: dark.soft, lineHeight: 16 },
  earnings: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.05)" },
  earningsLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  earningsValue: { fontFamily: fonts.heading, fontSize: 15, color: colors.taupe },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  bar: { height: 4, backgroundColor: colors.taupe },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnOutline: { borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
});

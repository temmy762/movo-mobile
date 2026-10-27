/**
 * Rides tab — mirrors movo-web driver/home/planned plus the web Home's
 * "reservation requests" strip:
 *  - Open reservation requests (offline only): unclaimed scheduled rides, so a
 *    chauffeur following the "open the app to accept" push can claim one
 *    without starting a shift. Online, they arrive as normal offers on Home.
 *  - Reserved rides: accepted, not yet set off for. "I'm heading to pickup"
 *    activates the ride (it becomes the active trip on Home) and tells the
 *    rider; "Can't make this reservation" hands it to another chauffeur.
 *  - Past: completed rides with this chauffeur's earning (web My Rides).
 */
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, driver as driverApi } from "@movo/api";
import type { DriverBooking, DriverRide, ReservedRide } from "@movo/shared";
import { Card, Icon, colors, fonts } from "@movo/ui";
import { useShift } from "@/lib/shift";
import { HandBackModal, openNavigation } from "@/components/tripParts";
import { gradient, money } from "@/components/homeKit";

const SOON_MS = 60 * 60 * 1000;

function whenLabel(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Route({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: colors.navy }]} />
        <Text style={styles.routeText}>{pickup}</Text>
      </View>
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
        <Text style={styles.routeText}>{dropoff}</Text>
      </View>
    </View>
  );
}

/* "Today, 3:50 PM" / "Oct 14, 2026, 3:50 PM" */
function pastWhen(iso: string) {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "America/Winnipeg" });
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/Winnipeg", hour: "numeric", minute: "2-digit" });
  const date = day(d) === day(new Date())
    ? "Today"
    : d.toLocaleDateString("en-US", { timeZone: "America/Winnipeg", month: "short", day: "numeric", year: "numeric" });
  return `${date}, ${time}`;
}

function PastRide({ ride }: { ride: DriverRide }) {
  const care = ride.bookingType === "CARE";
  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.between}>
        <View style={{ flex: 1 }}>
          <Text style={styles.client}>{ride.clientName}</Text>
          <Text style={styles.meta}>
            {care ? `Safe Ride${ride.careRole ? ` · ${ride.careRole === "PRIMARY" ? "Primary" : "Support"}` : ""}` : ride.carName}
          </Text>
          {ride.bookingNumber && <Text style={styles.small}>{ride.bookingNumber}</Text>}
        </View>
        <Text style={styles.earning}>{money(ride.earning)}</Text>
      </View>
      <Route pickup={ride.pickup} dropoff={ride.dropoff} />
      <View style={styles.between}>
        <Text style={styles.small}>Payment: {ride.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</Text>
        <Text style={styles.small}>{pastWhen(ride.createdAt)}</Text>
      </View>
    </Card>
  );
}

function Primary({ title, onPress, disabled, muted }: { title: string; onPress: () => void; disabled?: boolean; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ flex: 1, opacity: disabled ? 0.6 : 1 }} accessibilityRole="button">
      {muted ? (
        <View style={[styles.btn, { backgroundColor: "#4b5563" }]}><Text style={styles.btnText}>{title}</Text></View>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
          <Text style={styles.btnText}>{title}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

export default function Planned() {
  const online = useShift((s) => s.online);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [declined, setDeclined] = useState<Set<string>>(() => new Set());
  const [cancelTarget, setCancelTarget] = useState<ReservedRide | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const reserved = useQuery({ queryKey: ["reserved"], queryFn: driverApi.reserved });
  const past = useQuery({ queryKey: ["past-rides"], queryFn: driverApi.pastRides, enabled: tab === "past" });
  const open = useQuery({
    queryKey: ["reservation-requests"],
    queryFn: driverApi.pendingBookings,
    enabled: !online,
    refetchInterval: 20_000,
    select: (list: DriverBooking[]) => list
      .filter((b) => b.scheduledAt && new Date(b.scheduledAt).getTime() > Date.now())
      .slice(0, 3),
  });
  /* Tabs stay mounted — re-read whenever this one is opened */
  const { refetch: refetchReserved } = reserved;
  const { refetch: refetchPast } = past;
  useFocusEffect(useCallback(() => {
    if (tab === "past") refetchPast();
    else refetchReserved();
  }, [tab, refetchPast, refetchReserved]));

  const requests = online ? [] : (open.data ?? []).filter((b) => !declined.has(b.id));

  const refresh = () => {
    if (tab === "past") return void past.refetch();
    reserved.refetch();
    if (!online) open.refetch();
  };

  const claim = async (b: DriverBooking) => {
    setActing(b.id);
    setNotice(null);
    try {
      await driverApi.acceptBooking(b.id);
      setNotice("Reservation confirmed. It's listed below until it's time to set off.");
    } catch (e) {
      setNotice(e instanceof ApiError && e.status === 409
        ? "Another chauffeur accepted this reservation first."
        : e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't accept — check your connection and try again.");
    } finally {
      setActing(null);
      queryClient.invalidateQueries({ queryKey: ["reserved"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-requests"] });
    }
  };

  const setOff = async (r: ReservedRide) => {
    setActing(r.id);
    setNotice(null);
    try {
      await driverApi.enRoute(r.id);
      queryClient.invalidateQueries({ queryKey: ["reserved"] });
      /* Home picks it up as the active ride when it comes into focus */
      router.navigate("/");
    } catch (e) {
      setNotice(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't update — check your connection and try again.");
      reserved.refetch();
    } finally {
      setActing(null);
    }
  };

  const handBack = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await driverApi.driverCancel(cancelTarget.id, reason.trim());
      setCancelTarget(null);
      reserved.refetch();
    } catch (e) {
      setCancelError(e instanceof ApiError && e.status !== 0 ? e.message : "Network error — please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={tab === "past" ? past.isRefetching : reserved.isRefetching} onRefresh={refresh} />}>
        <Text style={styles.title}>My Rides</Text>

        <View style={styles.segments}>
          {(["upcoming", "past"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segment, tab === t && styles.segmentOn]}
              accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
              <Text style={[styles.segmentText, tab === t && { color: "#fff" }]}>{t === "upcoming" ? "Upcoming" : "Past"}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "past" ? (
          past.isPending ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={colors.navy} />
          ) : past.isError ? (
            <Text style={[styles.meta, { textAlign: "center", marginTop: 24 }]}>Couldn&apos;t load your rides. Pull down to try again.</Text>
          ) : !past.data.length ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No completed rides yet</Text>
              <Text style={styles.meta}>Rides you complete will appear here.</Text>
            </View>
          ) : (
            past.data.map((r) => <PastRide key={r.id} ride={r} />)
          )
        ) : (<>

        {notice && (
          <Pressable onPress={() => setNotice(null)} style={styles.notice}>
            <Icon name="alert" size={16} color={colors.navy} />
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
        )}

        {requests.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.section}>Reservation requests</Text>
            {requests.map((b) => (
              <Card key={b.id} style={{ gap: 10 }}>
                <View style={styles.between}>
                  <Text style={styles.when}>{whenLabel(b.scheduledAt ?? null)}</Text>
                  <Text style={styles.earning}>{money(b.earning)}</Text>
                </View>
                <Route pickup={b.pickup} dropoff={b.dropoff} />
                <Text style={styles.meta}>{b.clientName} · {b.carName}</Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => setDeclined((s) => new Set(s).add(b.id))} style={[styles.btn, styles.outline]}>
                    <Text style={[styles.btnText, { color: "#374151" }]}>Decline</Text>
                  </Pressable>
                  <Primary title={acting === b.id ? "…" : "Accept reservation"} onPress={() => claim(b)} disabled={!!acting} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {reserved.isPending ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.navy} />
        ) : !reserved.data?.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No reserved rides yet</Text>
            <Text style={styles.meta}>Scheduled rides you accept will appear here until it&apos;s time to set off.</Text>
          </View>
        ) : (
          reserved.data.map((r) => {
            /* Relative to when the list was loaded (refreshed on focus / pull) */
            const soon = !!r.scheduledAt && new Date(r.scheduledAt).getTime() - reserved.dataUpdatedAt < SOON_MS;
            return (
              <Card key={r.id} style={{ gap: 10 }}>
                <View style={styles.between}>
                  <Text style={styles.when}>{whenLabel(r.scheduledAt)}</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.small}>Your earnings</Text>
                    <Text style={styles.earning}>{money(r.earning)}</Text>
                  </View>
                </View>
                <Route pickup={r.pickup} dropoff={r.dropoff} />
                <Text style={styles.meta}>{r.clientName}</Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => openNavigation(r.pickup)} style={[styles.square, styles.outline]}
                    accessibilityRole="button" accessibilityLabel="Navigate to pickup">
                    <Icon name="navigation" size={18} color={colors.navy} />
                  </Pressable>
                  <Primary title={acting === r.id ? "Starting…" : "I'm heading to pickup"} muted={!soon}
                    onPress={() => setOff(r)} disabled={!!acting} />
                </View>
                {!soon && (
                  <Text style={[styles.small, { textAlign: "center" }]}>
                    Tap when you actually set off — the rider is notified you&apos;re on the way.
                  </Text>
                )}
                <Pressable onPress={() => { setCancelTarget(r); setCancelError(null); }} style={styles.red}>
                  <Text style={styles.redText}>Can&apos;t make this reservation — Cancel</Text>
                </Pressable>
              </Card>
            );
          })
        )}
        </>)}
      </ScrollView>

      <HandBackModal visible={!!cancelTarget} title="Cancel this reservation?" keepLabel="Keep Reservation"
        body={`Scheduled for ${whenLabel(cancelTarget?.scheduledAt ?? null)}. We'll automatically find another available chauffeur before pickup — the rider will be told we're arranging this, not that their ride was cancelled.`}
        placeholder="Reason (optional) — e.g. vehicle issue, scheduling conflict"
        busy={cancelling} error={cancelError}
        onKeep={() => { setCancelTarget(null); setCancelError(null); }}
        onConfirm={handBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  segments: { flexDirection: "row", backgroundColor: "#eef0f4", borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segmentOn: { backgroundColor: colors.navy },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#6b7280" },
  client: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#111827" },
  section: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151" },
  notice: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 14, backgroundColor: "rgba(19,25,54,0.06)" },
  noticeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.navy, lineHeight: 17 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  when: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#4338ca" },
  earning: { fontFamily: fonts.heading, fontSize: 14, color: colors.navy },
  small: { fontFamily: fonts.body, fontSize: 10, color: "#9ca3af" },
  meta: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280" },
  routeRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  routeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: "#374151", lineHeight: 16 },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  outline: { borderWidth: 1, borderColor: "#e5e7eb" },
  square: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  red: { paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", alignItems: "center" },
  redText: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#dc2626" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#374151" },
});

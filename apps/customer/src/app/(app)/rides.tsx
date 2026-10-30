/**
 * Rides — mirrors movo-web app/home/rides: Upcoming / Past / Canceled, the
 * latest 50 each. Reservations show their pickup time (Winnipeg).
 */
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { user as userApi } from "@movo/api";
import type { UserBooking } from "@movo/shared";
import { colors, fonts } from "@movo/ui";

type Tab = "upcoming" | "past" | "canceled";
const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "canceled", label: "Canceled" },
];
const EMPTY: Record<Tab, { title: string; desc: string }> = {
  upcoming: { title: "You have no upcoming rides", desc: "As soon as you book a ride, its details will be shown here." },
  past: { title: "You have no past rides", desc: "Rides you've completed will be shown here." },
  canceled: { title: "No canceled rides", desc: "Rides that have been canceled will be shown here." },
};
const STATUS: Record<string, string> = {
  PENDING: "Finding your chauffeur",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Canceled",
};

const IMAGES = {
  care: require("../../../assets/images/safe-ride.png"),
  city: require("../../../assets/images/standard.png"),
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", {
    timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

function RideCard({ ride }: { ride: UserBooking }) {
  const care = ride.bookingType === "CARE";
  return (
    <View style={styles.card}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.car}>{care ? "Safe Ride" : ride.carName}</Text>
        <Text style={styles.route} numberOfLines={2}>{ride.pickup} → {ride.dropoff}</Text>
        {ride.scheduledAt && <Text style={styles.reserved}>Reserved for {when(ride.scheduledAt)}</Text>}
        <View style={styles.metaRow}>
          {ride.bookingNumber && <Text style={styles.ref}>{ride.bookingNumber}</Text>}
          <Text style={styles.status}>{STATUS[ride.status] ?? ride.status}</Text>
          <Text style={styles.total}>${ride.total.toFixed(2)}</Text>
        </View>
        {!ride.scheduledAt && <Text style={styles.small}>Booked {when(ride.createdAt)}</Text>}
      </View>
      <Image source={care ? IMAGES.care : IMAGES.city} style={styles.img} contentFit="contain" />
    </View>
  );
}

export default function Rides() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const rides = useQuery({ queryKey: ["user-bookings", tab], queryFn: () => userApi.bookings(tab) });

  /* Tabs stay mounted — re-read whenever this one is opened */
  const { refetch } = rides;
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const list = rides.data?.bookings ?? [];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <Text style={styles.title}>Rides</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabOn]}
            accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }}>
            <Text style={[styles.tabText, tab === t.id && { color: "#fff" }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={rides.isRefetching} onRefresh={() => { refetch(); }} />}>
        {rides.isPending ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />
        ) : rides.isError ? (
          <Text style={styles.emptyDesc}>Couldn&apos;t load your rides. Pull down to try again.</Text>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{EMPTY[tab].title}</Text>
            <Text style={styles.emptyDesc}>{EMPTY[tab].desc}</Text>
          </View>
        ) : (
          list.map((r) => <RideCard key={r.id} ride={r} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.heading, fontSize: 22, color: "#111827", paddingHorizontal: 20, paddingTop: 8 },
  tabs: { flexDirection: "row", backgroundColor: "#eef0f4", borderRadius: 12, padding: 4, marginHorizontal: 16, marginTop: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabOn: { backgroundColor: colors.navy },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#6b7280" },
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  car: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  route: { fontFamily: fonts.body, fontSize: 12, color: "#4b5563", lineHeight: 17 },
  reserved: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 2 },
  ref: { fontFamily: fonts.body, fontSize: 11, color: "#6b7280" },
  status: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.navy, backgroundColor: "#eef0f8", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  total: { fontFamily: fonts.heading, fontSize: 13, color: "#111827" },
  small: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af" },
  img: { width: 88, height: 60, alignSelf: "center" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#374151" },
  emptyDesc: { fontFamily: fonts.body, fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 19 },
});

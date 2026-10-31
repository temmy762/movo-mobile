/**
 * Rider home — mirrors movo-web app/home: greeting over the banner, "Where are
 * you heading?", one card per service that's switched on (lib/launchConfig),
 * and the "next trip" reassurance. Each card opens its own booking flow.
 */
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { notifications as notifApi } from "@movo/api";
import { IN_CITY_RIDES_ENABLED } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";

type Service = { id: "city" | "care"; title: string; desc: string; cta: string; img: number };

const SERVICES: Service[] = [
  ...(IN_CITY_RIDES_ENABLED
    ? [{ id: "city" as const, title: "City Rides", desc: "Rides for everyday trips", cta: "Book a ride", img: require("../../../assets/images/standard.png") }]
    : []),
  { id: "care", title: "Safe Ride", desc: "A chauffeur drives you in your own car.", cta: "Book a chauffeur", img: require("../../../assets/images/safe-ride.png") },
];

const book = (service: Service["id"]) => router.push({ pathname: "/book", params: { service } });

/* The web's "Need help choosing?" (home/help?topic=choosing) */
const helpChoosing = () =>
  Alert.alert(
    "City Rides or Safe Ride?",
    "City Rides — a Movo chauffeur picks you up in a Movo vehicle and takes you where you need to go.\n\n" +
      "Safe Ride — a Movo chauffeur drives you home in your own vehicle, so you and your car both get home safely. " +
      "We take care of getting your chauffeur back afterwards.\n\nEither way you see your fare before you pay.",
  );

export default function Home() {
  const user = useSession((s) => s.user);
  const [choosing, setChoosing] = useState(false);

  /* Unread badge on the bell; re-read whenever Home is shown */
  const unread = useQuery({ queryKey: ["notif-unread"], queryFn: notifApi.unreadCount });
  const { refetch: refetchUnread } = unread;
  useFocusEffect(useCallback(() => { refetchUnread(); }, [refetchUnread]));
  const unreadCount = unread.data?.unreadCount ?? 0;

  /* With one service, go straight in; otherwise ask which */
  const whereTo = () => (SERVICES.length === 1 ? book(SERVICES[0].id) : setChoosing(true));

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Image source={require("../../../assets/brand/logo-horizontal-navy.svg")} style={styles.logo} contentFit="contain" />
        <Pressable onPress={() => router.push("/notifications")} style={styles.bell} hitSlop={8} accessibilityRole="button"
          accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}>
          <Icon name="bell" size={20} color={colors.navy} />
          {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text></View>}
        </Pressable>
      </View>
      <ScrollView style={{ backgroundColor: "#F5F5F2" }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.banner}>
          <Image source={require("../../../assets/images/home-banner.png")} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
          <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
          <Text style={styles.hello}>Hi {user?.firstName ?? "there"}</Text>
        </View>

        <View style={styles.page}>
          <Pressable onPress={whereTo} accessibilityRole="button">
            <LinearGradient colors={["#0A0A0F", "#131936", "#2A3055"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.search}>
              <Icon name="navigation" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.searchText}>Where are you heading?</Text>
              <View style={styles.searchGo}><Icon name="chevronRight" size={16} color={colors.navy} strokeWidth={2.5} /></View>
            </LinearGradient>
          </Pressable>

          <Text style={styles.h2}>Choose your service</Text>
          <Text style={styles.sub}>Ride with us, or let us drive your car.</Text>

          <View style={{ gap: 12, marginTop: 14 }}>
            {SERVICES.map((s) => (
              <Pressable key={s.id} onPress={() => book(s.id)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                accessibilityRole="button" accessibilityLabel={`${s.title}: ${s.cta}`}>
                <Image source={s.img} style={styles.cardImg} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={styles.cardDesc}>{s.desc}</Text>
                  <Text style={styles.cardCta}>{s.cta} →</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.next}>
            <Text style={styles.nextTitle}>Your next trip, made simple.</Text>
            <View style={styles.nextRow}>
              <View style={styles.nextItem}>
                <View style={styles.nextIcon}><Icon name="check" size={14} color={colors.navy} strokeWidth={2.5} /></View>
                <Text style={styles.nextText}>Review your fare before you book</Text>
              </View>
              <View style={styles.nextItem}>
                <View style={styles.nextIcon}><Icon name="navigation" size={13} color={colors.navy} /></View>
                <Text style={styles.nextText}>Live trip tracking</Text>
              </View>
            </View>
          </View>

          <Pressable onPress={helpChoosing} style={styles.help} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={styles.helpTitle}>Need help choosing?</Text>
              <Text style={styles.cardDesc}>Compare City Rides and Safe Ride</Text>
            </View>
            <Icon name="chevronRight" size={16} color={colors.navy} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Which service, for "Where are you heading?" */}
      <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}>
        <Pressable style={styles.overlay} onPress={() => setChoosing(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>How would you like to travel?</Text>
            {SERVICES.map((s) => (
              <Pressable key={s.id} onPress={() => { setChoosing(false); book(s.id); }} style={styles.choice} accessibilityRole="button">
                <Image source={s.img} style={styles.choiceImg} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={styles.cardDesc}>{s.desc}</Text>
                </View>
                <Icon name="chevronRight" size={16} color="#9ca3af" />
              </Pressable>
            ))}
            <Pressable onPress={() => setChoosing(false)} hitSlop={8}><Text style={styles.cancel}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff" },
  bell: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 10, color: "#fff" },
  logo: { width: 110, height: 28 },
  banner: { height: 190, justifyContent: "flex-end" },
  hello: { fontFamily: fonts.heading, fontSize: 24, color: "#fff", padding: 20 },
  page: { paddingHorizontal: 16, paddingTop: 14 },
  search: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  searchText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: "rgba(255,255,255,0.75)" },
  searchGo: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.taupe, alignItems: "center", justifyContent: "center" },
  h2: { fontFamily: fonts.heading, fontSize: 19, color: "#111827", marginTop: 22 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: "#6b7280", marginTop: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 18, padding: 14 },
  cardImg: { width: 96, height: 64 },
  cardTitle: { fontFamily: fonts.heading, fontSize: 16, color: "#111827" },
  cardDesc: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", marginTop: 2 },
  cardCta: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy, marginTop: 8 },
  next: { backgroundColor: "#ECEEF5", borderRadius: 18, padding: 16, marginTop: 16, gap: 12 },
  nextTitle: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  nextRow: { flexDirection: "row", gap: 12 },
  nextItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  nextIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  nextText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: "#374151" },
  help: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 18, padding: 16, marginTop: 12 },
  helpTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.navy },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 12 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 17, color: "#111827" },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  choiceImg: { width: 72, height: 48 },
  cancel: { textAlign: "center", fontFamily: fonts.body, fontSize: 13, color: "#9ca3af", marginTop: 4 },
});

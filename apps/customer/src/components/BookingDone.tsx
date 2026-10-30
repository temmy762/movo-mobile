/* "Booked" confirmation shown after payment, for City Rides and Safe Ride */
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Icon, colors, fonts } from "@movo/ui";
import { pickupLabel } from "@/lib/when";

export function BookingDone({ bookingId, title, bookingNumber, scheduledAt, nowText }: {
  bookingId: string; title: string; bookingNumber?: string | null; scheduledAt: string | null; nowText: string;
}) {
  return (
    <SafeAreaView style={styles.done}>
      <LinearGradient colors={["#131936", "#C6BFB2"]} style={styles.badge}><Icon name="check" size={30} color="#fff" strokeWidth={2.5} /></LinearGradient>
      <Text style={styles.title}>{title}</Text>
      {bookingNumber ? <Text style={styles.ref}>{bookingNumber}</Text> : null}
      <Text style={styles.body}>
        {scheduledAt
          ? `Your chauffeur will pick you up on ${pickupLabel(scheduledAt)}. We'll let you know when they're on the way.`
          : nowText}
      </Text>
      <Pressable onPress={() => router.replace({ pathname: "/ride/[id]", params: { id: bookingId } })} style={{ alignSelf: "stretch" }} accessibilityRole="button">
        <LinearGradient colors={["#1a1a2e", "#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
          <Text style={styles.ctaText}>Track your ride</Text>
        </LinearGradient>
      </Pressable>
      <Pressable onPress={() => router.replace("/rides")} hitSlop={8} accessibilityRole="button">
        <Text style={styles.secondary}>View my rides</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  done: { flex: 1, backgroundColor: "#F5F5F2", alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  ref: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
  body: { fontFamily: fonts.body, fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20, marginBottom: 12 },
  cta: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 16, color: "#fff" },
  secondary: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy, marginTop: 6 },
});

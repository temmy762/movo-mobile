/**
 * Chauffeur home. Phase 1 builds this up in steps: online toggle + background
 * location, map, today's stats, then incoming ride requests.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, StatusBadge, colors, fontSizes, fonts, spacing } from "@movo/ui";
import { winnipegNowTime } from "@movo/shared";
import { useSession } from "@/lib/session";
import { useSocket } from "@/lib/socket";

function greeting(): string {
  const hour = Number(winnipegNowTime().slice(0, 2));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const driver = useSession((s) => s.driver);
  const { connected } = useSocket();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.hello}>{greeting()}, {driver?.firstName}</Text>

        <Card style={{ gap: spacing.sm }}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>You&apos;re offline</Text>
            <StatusBadge status={connected ? "COMPLETED" : "PENDING"} label={connected ? "Connected" : "Connecting…"} />
          </View>
          <Text style={styles.body}>Going online and receiving ride requests from the app is coming in the next update.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.xl, gap: spacing.lg },
  hello: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontFamily: fonts.headingSemi, fontSize: fontSizes.lg, color: colors.navy },
  body: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted, lineHeight: 19 },
});

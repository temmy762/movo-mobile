import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, driver as driverApi } from "@movo/api";
import { Card, Icon, type IconName, colors, fontSizes, fonts, spacing } from "@movo/ui";
import { useSession } from "@/lib/session";
import { useShift } from "@/lib/shift";
import { emailSupport, openWeb } from "@/lib/links";

function Row({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const tint = danger ? colors.danger : colors.navy;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Icon name={icon} size={18} color={tint} />
      <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
      {!danger && <Icon name="chevronRight" size={16} color={colors.steel} />}
    </Pressable>
  );
}

export default function Profile() {
  const { driver, signOut, clear } = useSession();
  const goOffline = useShift((s) => s.goOffline);
  const [deleting, setDeleting] = useState(false);

  /* Required by the App Store and Google Play. The server refuses while a ride
     is active or earnings / payouts are pending, so no one loses money. */
  const confirmDelete = () =>
    Alert.alert(
      "Delete your account?",
      "Your chauffeur account will be closed and you'll be signed out on every device. Completed ride and payout records are kept for accounting. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: deleteAccount },
      ],
    );

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await driverApi.deleteAccount();
      await goOffline();
      await clear();
    } catch (e) {
      Alert.alert("Couldn't delete your account", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>Profile</Text>

        <Card style={{ gap: 2 }}>
          <Text style={styles.name}>{driver?.firstName} {driver?.lastName}</Text>
          <Text style={styles.email}>{driver?.email}</Text>
        </Card>

        <Card style={styles.list}>
          <Row icon="mail" label="Contact support" onPress={() => emailSupport()} />
          <View style={styles.divider} />
          <Row icon="list" label="Terms of service" onPress={() => openWeb("/terms")} />
          <View style={styles.divider} />
          <Row icon="list" label="Privacy policy" onPress={() => openWeb("/privacy-policy")} />
        </Card>

        <Card style={styles.list}>
          <Row icon="logOut" label="Sign out" onPress={async () => { await goOffline(); await signOut(); }} />
          <View style={styles.divider} />
          <Row icon="trash" label={deleting ? "Deleting…" : "Delete account"} onPress={confirmDelete} danger />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.xl, gap: spacing.lg },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  name: { fontFamily: fonts.headingSemi, fontSize: fontSizes.lg, color: colors.navy },
  email: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted },
  list: { paddingVertical: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.base },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});

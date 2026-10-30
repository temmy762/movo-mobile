/**
 * Profile — the rider's account, support, legal, sign out and account
 * deletion (required by the App Store and Google Play).
 */
import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ApiError, user as userApi } from "@movo/api";
import { Card, Icon, type IconName, colors, fontSizes, fonts, spacing } from "@movo/ui";
import { useSession } from "@/lib/session";
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.section}>{title}</Text>
      <Card style={styles.list}>{children}</Card>
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

export default function Profile() {
  const { user, signOut, clear } = useSession();
  const profile = useQuery({ queryKey: ["user-profile"], queryFn: userApi.profile });
  const [deleting, setDeleting] = useState(false);
  const p = profile.data?.user;

  const confirmDelete = () =>
    Alert.alert(
      "Delete your account?",
      "Your Movo Privé account will be closed and you'll be signed out on every device. Completed ride and payment records are kept for accounting. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: deleteAccount },
      ],
    );

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await userApi.deleteAccount();
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
          <Text style={styles.name}>{(p ?? user)?.firstName} {(p ?? user)?.lastName}</Text>
          {(p ?? user)?.email ? <Text style={styles.detail}>{(p ?? user)?.email}</Text> : null}
          {p?.phone ? <Text style={styles.detail}>{p.phone}</Text> : null}
        </Card>

        <Section title="Payments">
          <Row icon="wallet" label="Payment methods" onPress={() => router.push("/payment-methods")} />
        </Section>

        <Section title="Support">
          <Row icon="mail" label="Contact support" onPress={() => emailSupport()} />
          <Divider />
          <Row icon="list" label="Lost & found policy" onPress={() => openWeb("/lost-found-policy")} />
          <Divider />
          <Row icon="list" label="Complaints policy" onPress={() => openWeb("/complaints-policy")} />
        </Section>

        <Section title="Legal">
          <Row icon="list" label="Terms & conditions" onPress={() => openWeb("/terms")} />
          <Divider />
          <Row icon="list" label="Privacy policy" onPress={() => openWeb("/privacy-policy")} />
        </Section>

        <Card style={styles.list}>
          <Row icon="logOut" label="Sign out" onPress={() => { signOut(); }} />
          <Divider />
          <Row icon="trash" label={deleting ? "Deleting…" : "Delete account"} onPress={confirmDelete} danger />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 40 },
  title: { fontFamily: fonts.heading, fontSize: 22, color: "#111827" },
  name: { fontFamily: fonts.headingSemi, fontSize: fontSizes.lg, color: colors.navy },
  detail: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted },
  section: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 4 },
  list: { paddingVertical: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.base },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});

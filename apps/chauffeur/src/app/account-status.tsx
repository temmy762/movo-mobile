/**
 * Signed in, but the chauffeur can't drive yet (or anymore). Same routing as
 * the web login: pending review / rejected / onboarding not finished /
 * suspended. The server enforces this too (lib/driverAccess.ts).
 */
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { driver as driverApi } from "@movo/api";
import type { OnboardingStatus } from "@movo/shared";
import { Button, Card, Icon, type IconName, colors, fontSizes, fonts, spacing } from "@movo/ui";
import { useSession } from "@/lib/session";
import { emailSupport, openWeb } from "@/lib/links";

type StatusView = {
  icon: IconName; tone: string; title: string; body: string; note?: string | null;
  /* Individual chauffeurs finish in the app; fleet partners on the web */
  finish?: "app" | "web";
};

function describe(status: OnboardingStatus | undefined, driverStatus: string | undefined): StatusView {
  if (driverStatus === "SUSPENDED") {
    return { icon: "alert", tone: colors.danger, title: "Account on hold", body: "Your chauffeur account is currently suspended. Please contact Movo support to resolve this." };
  }
  switch (status?.adminStatus) {
    case "REJECTED":
      return { icon: "alert", tone: colors.danger, title: "Application not approved", body: "Unfortunately your application wasn't approved this time.", note: status.adminNote };
    case "NOT_SUBMITTED":
      return status.type === "FLEET"
        ? { icon: "list", tone: colors.navy, title: "Finish your application", body: "Your fleet partner application isn't complete yet. Finish it on movoprive.com — log in there with the same email and password.", finish: "web" }
        : { icon: "list", tone: colors.navy, title: "Finish your application", body: "Your chauffeur application isn't complete yet — it takes about 15 minutes. Your progress is saved as you go.", finish: "app" };
    default:
      return { icon: "clock", tone: colors.navy, title: "Application under review", body: "Thanks for applying. Our team is reviewing your documents — we'll email you as soon as you're approved. This usually takes 1–2 business days." };
  }
}

export default function AccountStatus() {
  const { driver, refresh, signOut } = useSession();
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["onboarding-status"], queryFn: driverApi.onboardingStatus });
  const [checking, setChecking] = useState(false);

  const view = describe(status.data, status.data?.driverStatus ?? driver?.status);

  /* Straight from "Create account": open the application */
  useEffect(() => {
    if (view.finish !== "app" || !useSession.getState().justRegistered) return;
    useSession.setState({ justRegistered: false });
    router.push("/onboarding");
  }, [view.finish]);

  /* Approval flips driver.status to ACTIVE; the root layout then opens the app */
  const checkAgain = async () => {
    setChecking(true);
    await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ["onboarding-status"] })]);
    setChecking(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.hello}>Hi {driver?.firstName}</Text>

        <Card style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Icon name={view.icon} size={28} color={view.tone} />
          <Text style={styles.title}>{status.isLoading ? "Checking your account…" : view.title}</Text>
          {!status.isLoading && <Text style={styles.body}>{view.body}</Text>}
          {view.note ? (
            <View style={styles.note}>
              <Text style={styles.noteLabel}>Note from Movo</Text>
              <Text style={styles.body}>{view.note}</Text>
            </View>
          ) : null}
        </Card>

        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          {view.finish === "app" && <Button title="Continue application" onPress={() => router.push("/onboarding")} />}
          {view.finish === "web" && <Button title="Continue on movoprive.com" onPress={() => openWeb("/driver/onboarding/login")} />}
          <Button title="Check again" variant={view.finish ? "secondary" : "primary"} onPress={checkAgain} loading={checking} />
          <Button title="Contact support" variant="secondary" onPress={() => emailSupport("Chauffeur account")} />
          <Button title="Sign out" variant="secondary" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.xl },
  hello: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  title: { fontFamily: fonts.headingSemi, fontSize: fontSizes.lg, color: colors.navy },
  body: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted, lineHeight: 19 },
  note: { backgroundColor: colors.ivory, borderRadius: 12, padding: spacing.md, gap: 4 },
  noteLabel: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.navy },
});

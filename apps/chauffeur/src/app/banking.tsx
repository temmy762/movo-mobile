/**
 * Deep-link target for movochauffeur://banking — Stripe Connect onboarding
 * returns here via movo-web /app-return. The real Banking screen comes in Phase 1.
 */
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, MovoText, spacing } from "@movo/ui";

export default function Banking() {
  const { connect } = useLocalSearchParams<{ connect?: string }>();
  return (
    <SafeAreaView style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
      <MovoText variant="title">Banking</MovoText>
      <MovoText>
        {connect === "success" ? "Bank account linking finished." : "Bank linking was not completed. Please try again."}
      </MovoText>
      <Button title="Back" variant="secondary" onPress={() => router.replace("/")} />
    </SafeAreaView>
  );
}

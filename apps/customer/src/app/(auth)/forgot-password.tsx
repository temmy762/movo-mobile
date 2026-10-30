import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ApiError, auth } from "@movo/api";
import { Button, Card, Icon, Input, colors, fontSizes, fonts, spacing } from "@movo/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter the email you use to sign in.");
    setLoading(true);
    try {
      await auth.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Icon name="back" size={14} color={colors.muted} strokeWidth={2.5} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Reset your password</Text>

        {sent ? (
          <Card style={{ gap: spacing.md, marginTop: spacing.xl }}>
            <Icon name="mail" size={28} />
            <Text style={styles.body}>
              If a Movo Privé account uses {email.trim()}, we&apos;ve emailed a link to set a new password.
              The link works for 30 minutes.
            </Text>
            <Button title="Back to log in" variant="secondary" onPress={() => router.back()} />
          </Card>
        ) : (
          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            <Text style={styles.body}>Enter your email and we&apos;ll send you a link to set a new password.</Text>
            <Input
              label="Email address*"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={submit}
              error={error}
            />
            <Button title="Send reset link" onPress={submit} loading={loading} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 32, paddingTop: spacing.lg, paddingBottom: spacing["2xl"] },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.xl },
  backText: { fontFamily: fonts.body, fontSize: fontSizes.base, color: colors.muted },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  body: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted, lineHeight: 19 },
});

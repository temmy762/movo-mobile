/**
 * After Continue with Google / Sign in with Apple, for a new chauffeur: confirm
 * the name and add a mobile number (riders and Movo reach chauffeurs by phone,
 * and the application never asks for it). Then the account is created and the
 * application opens, as after "Create account" (account-status → onboarding).
 */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { ApiError } from "@movo/api";
import { Button, Input, colors, fontSizes, fonts, spacing } from "@movo/ui";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/links";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function CompleteAccount() {
  const pending = useSession((s) => s.pendingSignup);
  const complete = useSession((s) => s.completeSocialSignup);
  const [firstName, setFirstName] = useState(pending?.signup.firstName ?? "");
  const [lastName, setLastName] = useState(pending?.signup.lastName ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* A new Google / Apple attempt replaces any half-done sign-up, so leaving needs no cleanup */
  if (!pending) return <Redirect href="/sign-in" />;
  const provider = pending.signup.provider === "apple" ? "Apple" : "Google";

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your first and last name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Please enter your mobile number, including the area code.");
    setLoading(true);
    try {
      /* Signed in now: the root layout opens the application */
      await complete({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
    } catch (e) {
      if (!(e instanceof ApiError)) setError("Registration failed. Please try again.");
      else if (e.status === 401) {
        useSession.setState({ pendingSignup: null });
        router.replace("/sign-in");
      } else if (e.status === 409) setError(e.message || "That phone number is already registered. Please log in or use a different number.");
      else if (e.status >= 500) setError("Server error. Please try again in a few moments.");
      else setError(e.message || "Please check your information and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Complete your account" subtitle="Winnipeg, Canada" fallback="/sign-in" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            You&apos;re signing up with {provider}. Check your name and add your mobile number, then you&apos;ll complete your application.
          </Text>

          <View style={styles.emailBox}>
            <Text style={styles.emailLabel}>{provider} account</Text>
            <Text style={styles.email} numberOfLines={1}>{pending.signup.email}</Text>
          </View>

          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Input label="First name*" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Last name*" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" />
            </View>
          </View>
          <Input label="Mobile number*" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
            autoComplete="tel" textContentType="telephoneNumber" placeholder="(204) 555-0123"
            returnKeyType="go" onSubmitEditing={submit} />
          <Text style={styles.hint}>Riders and Movo use this to reach you during a trip.</Text>

          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Create account" onPress={submit} loading={loading} />

          <Text style={styles.small}>
            By continuing you agree to Movo&apos;s{" "}
            <Text style={styles.link} onPress={() => openWeb("/terms")}>Terms</Text> and{" "}
            <Text style={styles.link} onPress={() => openWeb("/privacy-policy")}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: spacing.md, paddingBottom: 48 },
  intro: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted, lineHeight: 19 },
  emailBox: { borderRadius: 12, backgroundColor: "#F3F4F6", paddingHorizontal: 14, paddingVertical: 10 },
  emailLabel: { fontFamily: fonts.body, fontSize: 11, color: "#6B7280" },
  email: { fontFamily: fonts.bodySemi, fontSize: fontSizes.md, color: colors.navy, marginTop: 2 },
  nameRow: { flexDirection: "row", gap: spacing.md },
  hint: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af", marginTop: -6 },
  error: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.danger, textAlign: "center" },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 18 },
  link: { fontFamily: fonts.bodySemi, color: colors.navy },
});

/* Mirrors movo-web app/user/register: name, email, phone, password, terms */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { ApiError } from "@movo/api";
import { Button, Icon, Input, colors, fontSizes, fonts, spacing } from "@movo/ui";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/links";
import { ScreenHeader } from "@/components/ScreenHeader";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const signUp = useSession((s) => s.signUp);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your first and last name.");
    if (!EMAIL.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters long.");
    if (!agreed) return setError("Please accept the Privacy Policy and Terms & Conditions to continue.");
    setLoading(true);
    try {
      await signUp({
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined, password, agreedToTerms: true,
      });
    } catch (e) {
      if (!(e instanceof ApiError)) setError("Registration failed. Please try again.");
      else if (e.status >= 500) setError("Server error. Please try again in a few moments.");
      else setError(e.message || "Please check your information and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Create your account" subtitle="Ride with Movo in Winnipeg" fallback="/sign-in" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Input label="First name*" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Last name*" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" />
            </View>
          </View>
          <Input label="Email address*" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Input label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
            autoComplete="tel" textContentType="telephoneNumber" placeholder="(204) 555-0123" />
          <Input label="Password*" value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
            autoComplete="new-password" textContentType="newPassword"
            right={
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={12}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                <Icon name={showPassword ? "eyeOff" : "eye"} size={17} color="#9CA3AF" />
              </Pressable>
            } />
          <Text style={styles.hint}>At least 8 characters. Your chauffeur uses your mobile number to reach you at pickup.</Text>

          <Pressable onPress={() => setAgreed((v) => !v)} style={styles.agree} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
            <View style={[styles.box, agreed && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
              {agreed && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={styles.agreeText}>
              I agree to Movo&apos;s{" "}
              <Text style={styles.link} onPress={() => openWeb("/privacy-policy")}>Privacy Policy</Text> and{" "}
              <Text style={styles.link} onPress={() => openWeb("/terms")}>Terms &amp; Conditions</Text>.
            </Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Create account" onPress={submit} loading={loading} />
          <Link href="/sign-in" style={[styles.small, styles.link]}>Already have an account? Log in</Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: spacing.md, paddingBottom: 48 },
  nameRow: { flexDirection: "row", gap: spacing.md },
  hint: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af", marginTop: -6, lineHeight: 15 },
  agree: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 4 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center", marginTop: 1 },
  agreeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 18 },
  error: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.danger, textAlign: "center" },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: "center" },
  link: { fontFamily: fonts.bodySemi, color: colors.navy },
});

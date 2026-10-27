/* Mirrors movo-web app/driver/onboarding/login */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { Button, Icon, Input, colors, fontSizes, fonts, gradients, spacing } from "@movo/ui";
import { signInErrorMessage, useSession } from "@/lib/session";

export default function SignIn() {
  const signIn = useSession((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) return setError("Please enter both email and password.");
    setLoading(true);
    try {
      /* The root layout routes on the result: home, or the account status screen */
      await signIn(email, password);
    } catch (e) {
      setError(signInErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <Image source={require("../../../assets/brand/logo-stacked-navy.svg")} style={styles.logo} contentFit="contain" />

            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>
              Log in to start driving with <Text style={{ fontFamily: fonts.bodySemi, color: colors.navy }}>Movo</Text>
            </Text>

            <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
              <Input
                label="Email address*"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <Input
                label="Password*"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                right={
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={12}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={17} color="#9CA3AF" />
                  </Pressable>
                }
              />

              <Link href="/forgot-password" style={styles.forgot}>Forgot password?</Link>

              {error && <Text style={styles.error}>{error}</Text>}

              <Button title="Log In" onPress={submit} loading={loading} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Bottom bar — Become a Partner (individual chauffeurs sign up here; fleets on the web) */}
      <LinearGradient {...gradients.cta}>
        <SafeAreaView edges={["bottom"]}>
          <Text style={styles.partner}>
            Don&apos;t have an account yet?{" "}
            <Text style={styles.partnerLink} onPress={() => router.push("/register")}>Become a Partner</Text>
          </Text>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 32, paddingBottom: spacing["2xl"] },
  logo: { width: 160, height: 140, alignSelf: "center", marginTop: spacing["2xl"] },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827", marginTop: spacing.sm },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted, marginTop: 2 },
  forgot: { alignSelf: "flex-end", fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.navy, textDecorationLine: "underline" },
  error: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.danger, textAlign: "center" },
  partner: { textAlign: "center", paddingVertical: spacing.xl, fontFamily: fonts.body, fontSize: fontSizes.md, color: "rgba(255,255,255,0.7)" },
  partnerLink: { fontFamily: fonts.bodySemi, color: colors.taupe },
});

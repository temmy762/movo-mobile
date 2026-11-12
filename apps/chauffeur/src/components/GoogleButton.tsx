/* "Continue with Google" — Android and iOS. iOS also shows Sign in with Apple
   (App Store guideline 4.8, components/AppleButton). A new chauffeur goes on to
   "Complete your account"; an existing one is signed in. */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { fonts } from "@movo/ui";
import { googleErrorMessage, startGoogleSignIn } from "@/lib/googleSignIn";
import { signInErrorMessage, useSession } from "@/lib/session";

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export function GoogleButton({ onError }: { onError: (message: string | null) => void }) {
  const signInWithGoogle = useSession((s) => s.signInWithGoogle);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    onError(null);
    setBusy(true);
    try {
      const res = await startGoogleSignIn();
      if ("error" in res) return onError(googleErrorMessage(res.error));
      if ((await signInWithGoogle(res.code, res.verifier)) === "signup") router.push("/complete-account");
    } catch (e) {
      onError(signInErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={s.or}><View style={s.line} /><Text style={s.orText}>OR</Text><View style={s.line} /></View>
      <Pressable onPress={go} disabled={busy} accessibilityRole="button" accessibilityLabel="Continue with Google"
        style={({ pressed }) => [s.btn, (pressed || busy) && { opacity: 0.7 }]}>
        {busy ? <ActivityIndicator color="#374151" /> : <GoogleG />}
        <Text style={s.text}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  or: { flexDirection: "row", alignItems: "center", gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  orText: { fontFamily: fonts.body, fontSize: 12, color: "#9CA3AF" },
  btn: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  text: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#1F2937" },
});

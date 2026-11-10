/**
 * movoprive://google-auth?code=… — normally caught by the Google browser
 * sheet (lib/googleSignIn). If the link reaches the router instead (some
 * Android browsers), finish the sign-in here, then go home.
 */
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@movo/ui";
import { takePendingVerifier } from "@/lib/googleSignIn";
import { useSession } from "@/lib/session";

export default function GoogleAuthReturn() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    const verifier = takePendingVerifier();
    const done = () => router.replace("/");
    if (code && verifier && !useSession.getState().token) {
      useSession.getState().signInWithGoogle(code, verifier).catch(() => {}).finally(done);
    } else done();
  }, [code]);
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.navy} /></View>;
}

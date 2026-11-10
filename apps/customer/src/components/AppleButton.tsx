/* Sign in with Apple — iOS only, shown next to Google (App Store guideline 4.8).
   Apple's own button (required styling). The nonce's SHA-256 goes to Apple and
   the raw value to our server, which checks they match (movo-web lib/appleAuth). */
import { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { signInErrorMessage, useSession } from "@/lib/session";

export function AppleButton({ onError, signUp }: { onError: (message: string | null) => void; signUp?: boolean }) {
  const signInWithApple = useSession((s) => s.signInWithApple);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => {});
  }, []);
  if (!available) return null;

  const go = async () => {
    onError(null);
    try {
      const rawNonce = Crypto.randomUUID() + Crypto.randomUUID();
      const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce,
      });
      if (!cred.identityToken) return onError("Apple sign-in didn't finish. Please try again.");
      await signInWithApple({
        identityToken: cred.identityToken, rawNonce, authorizationCode: cred.authorizationCode,
        firstName: cred.fullName?.givenName ?? null, lastName: cred.fullName?.familyName ?? null,
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return; // closed the sheet
      onError(signInErrorMessage(e));
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={signUp ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={s.btn}
      onPress={go}
    />
  );
}

const s = StyleSheet.create({ btn: { width: "100%", height: 48 } });

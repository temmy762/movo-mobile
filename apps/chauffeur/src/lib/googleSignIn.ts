/**
 * "Continue with Google" — the web's Google sign-in in a secure browser sheet,
 * handed back with PKCE (movo-web lib/googleAppAuth.ts):
 *   verifier (random, stays here) → challenge = base64url(sha256(verifier))
 *   → /api/auth/google?app=chauffeur&challenge=… → movochauffeur://google-auth?code=…
 *   → POST /api/auth/driver/google/exchange { code, verifier }.
 */
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./session";

export const GOOGLE_REDIRECT = "movochauffeur://google-auth";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function base64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

/* Verifier of the sign-in in progress — the google-auth route can finish it
   if the redirect reaches the router instead of the browser sheet */
let pendingVerifier: string | null = null;
export const takePendingVerifier = () => { const v = pendingVerifier; pendingVerifier = null; return v; };

const ERRORS: Record<string, string> = {
  oauth_config: "Google sign-in isn't available right now. Please use your email and password.",
  google_no_email: "Your Google account didn't share an email address. Please sign up with your email instead.",
  google_token_failed: "We couldn't complete Google sign-in right now. Please try again in a moment.",
  google_provider_failed: "We couldn't complete Google sign-in right now. Please try again in a moment.",
};

export function parseGoogleReturn(url: string): { code?: string; error?: string } {
  const q = url.split("?")[1] ?? "";
  const get = (k: string) => q.split("&").map((p) => p.split("=")).find(([a]) => a === k)?.[1];
  const code = get("code"), error = get("error");
  return code ? { code: decodeURIComponent(code) } : { error: error ? decodeURIComponent(error) : "google_cancelled" };
}

export const googleErrorMessage = (code: string) => ERRORS[code] ?? null; // null = cancelled, say nothing

/** { code, verifier } on success, { error } otherwise ("google_cancelled" when the user backed out) */
export async function startGoogleSignIn(): Promise<{ code: string; verifier: string } | { error: string }> {
  const verifier = base64url(Crypto.getRandomBytes(32));
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 });
  const challenge = digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  pendingVerifier = verifier;
  const res = await WebBrowser.openAuthSessionAsync(`${API_URL}/api/auth/google?app=chauffeur&challenge=${challenge}`, GOOGLE_REDIRECT);
  if (res.type !== "success") return { error: "google_cancelled" };
  const back = parseGoogleReturn(res.url);
  pendingVerifier = null;
  if (!back.code) return { error: back.error ?? "google_cancelled" };
  return { code: back.code, verifier };
}

/**
 * Phase 0 connection check — proves the app talks to the live Movo API:
 * app config, chauffeur sign-in (Bearer token) and an authenticated socket.
 * Replaced by the real sign-in / home flow in Phase 1.
 */
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { app, connectSocket, ApiError } from "@movo/api";
import { Button, Card, Input, MovoText, StatusBadge, colors, spacing } from "@movo/ui";
import { API_URL, useSession } from "@/lib/session";

export default function ConnectionCheck() {
  const config = useQuery({ queryKey: ["app-config"], queryFn: app.appConfig });
  const { driver, token, signIn, signOut } = useSession();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <MovoText variant="title">Movo Chauffeur</MovoText>
        <MovoText variant="caption">{API_URL}</MovoText>

        <Card style={styles.card}>
          <MovoText variant="heading">Server</MovoText>
          {config.isLoading && <MovoText variant="caption">Checking…</MovoText>}
          {config.error && <MovoText style={styles.error}>{config.error.message}</MovoText>}
          {config.data && (
            <>
              <StatusBadge status="COMPLETED" label="Connected" />
              <MovoText variant="caption">
                Services: {Object.entries(config.data.launch).filter(([, on]) => on).map(([k]) => k).join(", ")}
              </MovoText>
              <MovoText variant="caption">Minimum app version: {config.data.minVersion.chauffeur}</MovoText>
            </>
          )}
        </Card>

        {driver && token ? (
          <Card style={styles.card}>
            <MovoText variant="heading">Signed in</MovoText>
            <MovoText>{driver.firstName} {driver.lastName}</MovoText>
            <StatusBadge status={driver.status === "ACTIVE" ? "COMPLETED" : "PENDING"} label={driver.status} />
            <SocketStatus token={token} />
            <Button title="Sign out" variant="secondary" onPress={signOut} />
          </Card>
        ) : (
          <SignIn onSubmit={signIn} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SignIn({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await onSubmit(email, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <MovoText variant="heading">Chauffeur sign-in</MovoText>
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={error} />
      <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />
    </Card>
  );
}

/* Connects with the session token; the server grants driver:<id> on join */
function SocketStatus({ token }: { token: string }) {
  const [state, setState] = useState("connecting…");

  useEffect(() => {
    const s = connectSocket(token);
    s.socket.on("connect", () => setState("connected"));
    s.socket.on("disconnect", () => setState("disconnected"));
    s.socket.on("connect_error", (e) => setState(`error: ${e.message}`));
    s.join();
    return () => s.disconnect();
  }, [token]);

  return (
    <View style={styles.row}>
      <MovoText variant="caption">Live updates:</MovoText>
      <StatusBadge status={state === "connected" ? "COMPLETED" : "PENDING"} label={state} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.xl, gap: spacing.lg },
  card: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  error: { color: colors.danger },
});

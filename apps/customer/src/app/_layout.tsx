import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useFonts, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";
import Constants from "expo-constants";
import { app as appApi } from "@movo/api";
import { UpdateRequired, colors, isOlder } from "@movo/ui";
import { useSession } from "@/lib/session";
import { SocketProvider } from "@/lib/socket";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_600SemiBold, Inter_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const ready = useSession((s) => s.ready);
  const user = useSession((s) => s.user);

  useEffect(() => { useSession.getState().restore(); }, []);

  /* Builds older than the server's minimum must update (fail-open offline) */
  const [outdated, setOutdated] = useState(false);
  useEffect(() => {
    const check = () => appApi.appConfig()
      .then((c) => setOutdated(isOlder(Constants.expoConfig?.version ?? "0.0.0", c.minVersion.customer)))
      .catch(() => {});
    check();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => sub.remove();
  }, []);

  /* Coming back to the app: re-check the account and let React Query refetch,
     since sockets can miss events while asleep */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      focusManager.setFocused(active);
      if (active) useSession.getState().refresh();
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !ready) return null;
  if (outdated) return <UpdateRequired appName="Movo Privé" androidPackage="com.movoprive.app" />;

  const signedIn = !!user;

  return (
    <QueryClientProvider client={queryClient}>
      {/* Connects only while signed in (the token) */}
      <SocketProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Protected guard={!signedIn} redirectTo="/">
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn} redirectTo="/sign-in">
            <Stack.Screen name="(app)" />
            <Stack.Screen name="book" />
            <Stack.Screen name="ride/[id]" />
            <Stack.Screen name="ride/chat/[id]" />
            <Stack.Screen name="ride/receipt/[id]" />
            <Stack.Screen name="ride/report/[id]" />
            <Stack.Screen name="payment-methods" />
            <Stack.Screen name="notifications" />
          </Stack.Protected>
        </Stack>
      </SocketProvider>
    </QueryClientProvider>
  );
}

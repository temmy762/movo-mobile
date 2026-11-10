import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { Stack, router, type Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useFonts, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";
import Constants from "expo-constants";
import { app as appApi } from "@movo/api";
import { ArrivalIntro, UpdateRequired, Welcome, colors, isOlder, type WelcomeCard } from "@movo/ui";
import { useSession } from "@/lib/session";
import { SocketProvider } from "@/lib/socket";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

/* Native launch screen stays up until the fonts are in; then the Arrival intro */
SplashScreen.preventAutoHideAsync().catch(() => {});

/* First-launch welcome — shown once, before the first sign-in */
const WELCOME_KEY = "movo_welcome_v1";
const WELCOME_CARDS: WelcomeCard[] = [
  { art: "wheel", kicker: "Drive with Movo", title: "Earn on your schedule", body: "Go online when it suits you. Keep up to 80% of every fare and 100% of your tips, paid out to your bank." },
];

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_600SemiBold, Inter_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const ready = useSession((s) => s.ready);
  const driver = useSession((s) => s.driver);

  useEffect(() => { useSession.getState().restore(); }, []);

  const [introDone, setIntroDone] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  useEffect(() => {
    SecureStore.getItemAsync(WELCOME_KEY).then((v) => setWelcomeSeen(!!v)).catch(() => setWelcomeSeen(true));
  }, []);
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync().catch(() => {}); }, [fontsLoaded]);
  const leaveWelcome = (to: Href) => {
    setWelcomeSeen(true);
    SecureStore.setItemAsync(WELCOME_KEY, "1").catch(() => {});
    router.push(to);
  };

  /* Builds older than the server's minimum must update (fail-open offline) */
  const [outdated, setOutdated] = useState(false);
  useEffect(() => {
    const check = () => appApi.appConfig()
      .then((c) => setOutdated(isOlder(Constants.expoConfig?.version ?? "0.0.0", c.minVersion.chauffeur)))
      .catch(() => {});
    check();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => sub.remove();
  }, []);

  /* Coming back to the app: re-check the account (approved / suspended) and
     let React Query refetch, since sockets can miss events while asleep */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      focusManager.setFocused(active);
      if (active) useSession.getState().refresh();
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  const signedIn = !!driver;
  const active = driver?.status === "ACTIVE";

  const main = !ready ? null : outdated ? <UpdateRequired appName="Movo Chauffeur" androidPackage="com.movoprive.chauffeur" /> : (
      <QueryClientProvider client={queryClient}>
        {/* Connects only while signed in (the token); shared by tabs, chat, … */}
        <SocketProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Protected guard={!signedIn} redirectTo="/">
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            {/* Signed in but not approved / suspended: only the status screen */}
            <Stack.Protected guard={signedIn && !active} redirectTo={signedIn ? "/" : "/sign-in"}>
              <Stack.Screen name="account-status" />
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={active} redirectTo={signedIn ? "/account-status" : "/sign-in"}>
              <Stack.Screen name="(app)" />
              <Stack.Screen name="chat/[bookingId]" />
              <Stack.Screen name="banking" />
              <Stack.Screen name="vehicle" />
              <Stack.Screen name="report-incident" />
              <Stack.Screen name="report-found-item" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="help" />
            </Stack.Protected>
          </Stack>
        </SocketProvider>
      </QueryClientProvider>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      {main}
      {ready && introDone && !signedIn && welcomeSeen === false && (
        <>
          <StatusBar style="light" />
          <Welcome cards={WELCOME_CARDS} primary="Become a Movo chauffeur" secondary="I already have an account"
            onPrimary={() => leaveWelcome("/register")} onSecondary={() => leaveWelcome("/sign-in")} />
        </>
      )}
      {!introDone && (
        <>
          <StatusBar style="light" />
          <ArrivalIntro tagline="Ready when you are." ready={ready && welcomeSeen !== null} onDone={() => setIntroDone(true)} />
        </>
      )}
    </View>
  );
}

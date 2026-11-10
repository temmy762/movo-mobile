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
  { art: "car", kicker: "City Rides", title: "A chauffeur comes to you", body: "Book a ride across Winnipeg in a comfortable Standard vehicle. You see the total before you confirm." },
  { art: "key", kicker: "Safe Ride", title: "We drive you and your car home", body: "After a night out, a Movo chauffeur drives you home in your own vehicle, so you and your car both get back safely." },
  { art: "shield", kicker: "Safety", title: "Vetted chauffeurs, every ride", body: "Background-checked chauffeurs, live tracking you can share, and an SOS button on every trip." },
];

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_600SemiBold, Inter_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const ready = useSession((s) => s.ready);
  const user = useSession((s) => s.user);

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

  if (!fontsLoaded) return null;

  const signedIn = !!user;

  const main = !ready ? null : outdated ? <UpdateRequired appName="Movo Privé" androidPackage="com.movoprive.app" /> : (
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
              <Stack.Screen name="edit-profile" />
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
          <Welcome cards={WELCOME_CARDS} primary="Get started" secondary="I already have an account"
            onPrimary={() => leaveWelcome("/register")} onSecondary={() => leaveWelcome("/sign-in")} />
        </>
      )}
      {!introDone && (
        <>
          <StatusBar style="light" />
          <ArrivalIntro tagline="Your chauffeur, arriving." ready={ready && welcomeSeen !== null} onDone={() => setIntroDone(true)} />
        </>
      )}
    </View>
  );
}

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";
import { colors } from "@movo/ui";
import { useSession } from "@/lib/session";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_600SemiBold, Inter_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const ready = useSession((s) => s.ready);

  useEffect(() => { useSession.getState().restore(); }, []);

  if (!fontsLoaded || !ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </QueryClientProvider>
  );
}

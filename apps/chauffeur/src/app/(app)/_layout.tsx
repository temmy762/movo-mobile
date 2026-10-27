import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Icon, colors, fonts } from "@movo/ui";
import { SocketProvider } from "@/lib/socket";
import { registerForPush } from "@/lib/push";

export default function AppTabs() {
  /* Signed in and approved: this phone receives the chauffeur's alerts */
  useEffect(() => { registerForPush(); }, []);

  /* Every chauffeur alert is handled on Home (requests, trips, Safe Ride),
     which re-reads its state when the app comes to the foreground */
  const lastTap = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (lastTap) router.navigate("/");
  }, [lastTap]);

  return (
    <SocketProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.navy,
          tabBarInactiveTintColor: colors.steel,
          tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
      </Tabs>
    </SocketProvider>
  );
}

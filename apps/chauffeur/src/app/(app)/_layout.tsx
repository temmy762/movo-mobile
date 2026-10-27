import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Icon, colors, fonts } from "@movo/ui";
import { onNotificationTap, registerForPush } from "@/lib/push";

export default function AppTabs() {
  /* Signed in and approved: this phone receives the chauffeur's alerts */
  useEffect(() => { registerForPush(); }, []);

  /* A rider's message opens the chat; every other alert is handled on Home
     (requests, trips, Safe Ride), which re-reads its state on foreground */
  useEffect(() => onNotificationTap((data) => {
    if (data.type === "new_message_driver" && data.bookingId) router.navigate({ pathname: "/chat/[bookingId]", params: { bookingId: data.bookingId } });
    else router.navigate("/");
  }), []);

  return (
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
        <Tabs.Screen name="planned" options={{ title: "Rides", tabBarIcon: ({ color }) => <Icon name="clock" color={color} /> }} />
        <Tabs.Screen name="wallet" options={{ title: "Wallet", tabBarIcon: ({ color }) => <Icon name="wallet" color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
    </Tabs>
  );
}

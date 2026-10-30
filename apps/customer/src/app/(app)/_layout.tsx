import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Icon, colors, fonts } from "@movo/ui";
import { onNotificationTap, registerForPush } from "@/lib/push";

export default function AppTabs() {
  /* Signed in: this phone receives the rider's ride updates */
  useEffect(() => { registerForPush(); }, []);

  /* A ride update opens Rides, where the current trip is listed first */
  useEffect(() => onNotificationTap((data) => {
    router.navigate(data.bookingId ? "/rides" : "/");
  }), []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.steel,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        sceneStyle: { backgroundColor: "#F5F5F2" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
      <Tabs.Screen name="rides" options={{ title: "Rides", tabBarIcon: ({ color }) => <Icon name="list" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
    </Tabs>
  );
}

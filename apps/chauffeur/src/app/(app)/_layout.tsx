import { Tabs } from "expo-router";
import { Icon, colors, fonts } from "@movo/ui";
import { SocketProvider } from "@/lib/socket";

export default function AppTabs() {
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

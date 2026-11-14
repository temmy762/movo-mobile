/**
 * Notifications — the rider's in-app notifications from the server (booking
 * confirmed, chauffeur assigned / on the way, ride completed, reminders…),
 * newest first. Tapping one marks it read and opens its ride.
 * The Settings tab turns alerts on and picks their sound (?tab=settings opens it).
 */
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications as notifApi } from "@movo/api";
import { MOVO_TZ, type AppNotification } from "@movo/shared";
import { colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NotificationSettings } from "@/components/NotificationSettings";

/* "Today, 3:50 PM" / "Oct 14, 3:50 PM" — Winnipeg time */
function when(iso: string) {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: MOVO_TZ });
  const time = d.toLocaleTimeString("en-US", { timeZone: MOVO_TZ, hour: "numeric", minute: "2-digit" });
  const date = day(d) === day(new Date()) ? "Today" : d.toLocaleDateString("en-US", { timeZone: MOVO_TZ, month: "short", day: "numeric" });
  return `${date}, ${time}`;
}

export default function Notifications() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<"inbox" | "settings">(params.tab === "settings" ? "settings" : "inbox");
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["notifications"], queryFn: () => notifApi.list() });
  const { refetch } = list;
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const items = list.data?.notifications ?? [];
  const unread = list.data?.unreadCount ?? 0;
  const refreshCounts = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notif-unread"] });
  };

  const open = (n: AppNotification) => {
    if (!n.readAt) notifApi.markRead(n.id).then(refreshCounts).catch(() => {});
    if (n.bookingId) router.push({ pathname: "/ride/[id]", params: { id: n.bookingId } });
  };

  const markAll = () => { notifApi.markAllRead().then(refreshCounts).catch(() => {}); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F2" }}>
      <ScreenHeader title="Notifications" subtitle={unread ? `${unread} unread` : undefined} />
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["inbox", "settings"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}
            accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === "inbox" ? "Inbox" : "Settings"}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "settings" ? (
        <NotificationSettings />
      ) : list.isPending ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshing={list.isRefetching}
          onRefresh={() => { refetch(); }}
          ListHeaderComponent={unread ? (
            <Pressable onPress={markAll} style={styles.markAll} hitSlop={8} accessibilityRole="button">
              <Text style={styles.markAllText}>Mark all as read</Text>
            </Pressable>
          ) : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{list.isError ? "Couldn't load notifications" : "No notifications yet"}</Text>
              <Text style={styles.muted}>
                {list.isError ? "Pull down to try again." : "Updates about your bookings and rides will appear here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.item, !item.readAt && styles.unread, pressed && { opacity: 0.8 }]}
              accessibilityRole="button" accessibilityLabel={`${item.readAt ? "" : "Unread: "}${item.title}`}>
              {!item.readAt && <View style={styles.dot} />}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{when(item.createdAt)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  markAll: { alignSelf: "flex-end", marginBottom: 2 },
  markAllText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
  item: { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14 },
  unread: { borderWidth: 1, borderColor: "rgba(19,25,54,0.25)" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy, marginTop: 6 },
  title: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#111827" },
  message: { fontFamily: fonts.body, fontSize: 13, color: "#4b5563", lineHeight: 18 },
  time: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#374151" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", textAlign: "center", lineHeight: 17 },
  tabs: { flexDirection: "row", margin: 16, marginBottom: 0, padding: 4, borderRadius: 14, backgroundColor: "#e9e8e3" },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabOn: { backgroundColor: "#fff" },
  tabText: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280" },
  tabTextOn: { fontFamily: fonts.bodySemi, color: colors.navy },
});

/**
 * Pop-up when a chat message arrives and that chat isn't open, anywhere in
 * the app. Tap to open the chat; it hides itself after a few seconds.
 * (In the background the push notification does this job.)
 */
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SOCKET_EVENTS } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useSocket } from "@/lib/socket";
import { fromOtherSide, isChatOpen } from "@/lib/unreadMessages";

const SHOW_MS = 5000;
const HIDDEN = -160;
type Incoming = { id: string; bookingId: string; text: string };

export function MessageBanner() {
  const { on } = useSocket();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<Incoming | null>(null);
  const [y] = useState(() => new Animated.Value(HIDDEN));

  useEffect(() => on(SOCKET_EVENTS.MESSAGE_NEW, (data) => {
    const m = data as { id?: string; bookingId?: string; sender?: string; text?: string };
    if (!m.bookingId || !m.id || !m.sender || !fromOtherSide({ sender: m.sender }) || isChatOpen(m.bookingId)) return;
    setMsg({ id: m.id, bookingId: m.bookingId, text: m.text ?? "" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }), [on]);

  useEffect(() => {
    if (!msg) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    const timer = setTimeout(() => {
      Animated.timing(y, { toValue: HIDDEN, duration: 220, useNativeDriver: true }).start(() => setMsg(null));
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [msg, y]);

  if (!msg) return null;
  const bookingId = msg.bookingId;
  const open = () => {
    setMsg(null);
    y.setValue(HIDDEN);
    router.push({ pathname: "/chat/[bookingId]", params: { bookingId } });
  };

  return (
    <Animated.View pointerEvents="box-none" style={[s.wrap, { paddingTop: insets.top + 6, transform: [{ translateY: y }] }]}>
      <Pressable onPress={open} style={s.card} accessibilityRole="button" accessibilityLabel={`New message from your rider: ${msg.text}`}>
        <View style={s.icon}><Icon name="message" size={16} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>New message from your rider</Text>
          <Text style={s.text} numberOfLines={2}>{msg.text}</Text>
        </View>
        <Text style={s.cta}>Open</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12, zIndex: 1000, elevation: 1000 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
  text: { fontFamily: fonts.body, fontSize: 13, color: "#4B5563", marginTop: 1 },
  cta: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy },
});

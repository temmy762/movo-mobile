/**
 * Live chat with the rider — mirrors movo-web driver/home/finish/chat.
 * History over REST; new messages arrive on the socket (message.new reaches
 * the chauffeur's own room), with a slow refetch as a safety net.
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, driver as driverApi } from "@movo/api";
import { SOCKET_EVENTS, type BookingMessage } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useSocket } from "@/lib/socket";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function Chat() {
  const { bookingId, number } = useLocalSearchParams<{ bookingId: string; number?: string }>();
  const { on } = useSocket();
  const queryClient = useQueryClient();
  const key = ["messages", bookingId];
  const list = useRef<FlatList<BookingMessage>>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = useQuery({
    queryKey: key,
    queryFn: () => driverApi.messages(bookingId),
    refetchInterval: 15_000,
  });

  useEffect(() => on(SOCKET_EVENTS.MESSAGE_NEW, (data) => {
    const m = data as BookingMessage & { bookingId?: string };
    if (m.bookingId !== bookingId) return;
    queryClient.setQueryData<BookingMessage[]>(["messages", bookingId], (prev = []) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, { id: m.id, sender: m.sender, text: m.text, createdAt: m.createdAt }]);
  }), [on, bookingId, queryClient]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await driverApi.sendMessage(bookingId, body);
      setText("");
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't send — check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="back" size={18} color="#374151" strokeWidth={2.5} />
        </Pressable>
        <View>
          <Text style={styles.title}>Booking #{number ?? bookingId.slice(0, 8)}</Text>
          <Text style={styles.live}>Live Chat</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {messages.isPending ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.navy} />
        ) : messages.isError ? (
          <Text style={styles.empty}>
            {messages.error instanceof ApiError && messages.error.status === 403
              ? "Chat is only available between the rider and their chauffeur."
              : "Couldn't load messages. Pull down or try again shortly."}
          </Text>
        ) : (
          <FlatList
            ref={list}
            data={messages.data}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            refreshing={messages.isRefetching}
            onRefresh={() => messages.refetch()}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello!</Text>}
            renderItem={({ item }) => {
              const mine = item.sender === "driver";
              return (
                <View style={{ alignItems: mine ? "flex-end" : "flex-start", gap: 4 }}>
                  {mine ? (
                    <LinearGradient colors={["#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[styles.bubble, { borderBottomRightRadius: 4 }]}>
                      <Text style={[styles.bubbleText, { color: "#fff" }]}>{item.text}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.bubble, { backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4 }]}>
                      <Text style={styles.bubbleText}>{item.text}</Text>
                    </View>
                  )}
                  <Text style={styles.time}>{time(item.createdAt)}</Text>
                </View>
              );
            }}
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.composer}>
          <LinearGradient colors={["#0A0A0F", "#131936", "#2A3055"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inputBar}>
            <TextInput value={text} onChangeText={setText} placeholder="Write your message…"
              placeholderTextColor="rgba(255,255,255,0.5)" style={styles.input} maxLength={1000}
              multiline editable={!sending} />
            <Pressable onPress={send} disabled={sending || !text.trim()} accessibilityRole="button" accessibilityLabel="Send"
              style={{ opacity: sending || !text.trim() ? 0.5 : 1 }}>
              {sending ? <ActivityIndicator color="#fff" /> : <Icon name="send" size={20} color="#fff" />}
            </Pressable>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.heading, fontSize: 15, color: "#111827" },
  live: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.taupe },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: 32, fontFamily: fonts.body, fontSize: 13, color: "#9ca3af", paddingHorizontal: 24 },
  bubble: { maxWidth: "78%", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: "#1f2937" },
  time: { fontFamily: fonts.body, fontSize: 10, color: "#9ca3af" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", paddingHorizontal: 16, paddingBottom: 6 },
  composer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  input: { flex: 1, maxHeight: 100, fontFamily: fonts.body, fontSize: 14, color: "#fff", paddingVertical: 4 },
});

/**
 * Chat alerts: the unread count on the chat button, and which chat is open.
 *
 * The count comes from the server's message list: the other side's messages
 * newer than the last one seen in this chat (kept per ride on the phone). So
 * it stays right after the phone was locked or the app was closed. Uses the
 * server's timestamps, never the phone clock.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { driver as driverApi } from "@movo/api";
import { SOCKET_EVENTS } from "@movo/shared";
import { useSocket } from "./socket";

const ME = "driver";
const readKey = (bookingId: string) => `chat_read_${bookingId}`;

let openChatId: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** The chat screen for this ride is on screen (null when it closes) */
export function setOpenChat(bookingId: string | null) {
  openChatId = bookingId;
  notify();
}
export const isChatOpen = (bookingId: string) => openChatId === bookingId;

/** Everything up to this message (server time) has been seen */
export async function markRead(bookingId: string, lastCreatedAt: string) {
  const prev = await SecureStore.getItemAsync(readKey(bookingId)).catch(() => null);
  if (prev && Date.parse(prev) >= Date.parse(lastCreatedAt)) return;
  await SecureStore.setItemAsync(readKey(bookingId), lastCreatedAt).catch(() => {});
  notify();
}

export const fromOtherSide = (m: { sender: string }) => m.sender !== ME;

/** Unread messages from the other side on this ride (0 while its chat is open).
    Shares the chat screen's message list (same query key), refetched on new
    messages and when the app comes back to the foreground. */
export function useUnreadCount(bookingId?: string | null): number {
  const { on } = useSocket();
  const queryClient = useQueryClient();
  const messages = useQuery({
    queryKey: ["messages", bookingId],
    queryFn: () => driverApi.messages(bookingId as string),
    enabled: !!bookingId,
    refetchInterval: 30_000,
  });
  const [readAt, setReadAt] = useState<string | null>(null);
  /* Re-render when a chat opens / closes (the open chat always shows 0) */
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!bookingId) return;
    const load = () => SecureStore.getItemAsync(readKey(bookingId)).then(setReadAt).catch(() => {});
    load();
    const onChange = () => { setVersion((v) => v + 1); load(); };
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, [bookingId]);

  useEffect(() => on(SOCKET_EVENTS.MESSAGE_NEW, (data) => {
    if ((data as { bookingId?: string }).bookingId === bookingId) queryClient.invalidateQueries({ queryKey: ["messages", bookingId] });
  }), [on, bookingId, queryClient]);

  if (!bookingId || openChatId === bookingId) return 0;
  const since = readAt ? Date.parse(readAt) : 0;
  return (messages.data ?? []).filter((m) => fromOtherSide(m) && Date.parse(m.createdAt) > since).length;
}

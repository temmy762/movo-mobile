import type { AppNotification } from "@movo/shared";
import { request } from "../client";

/* Riders and chauffeurs alike — the server picks the signed-in account's */
export const list = (page = 1, limit = 30) =>
  request<{ notifications: AppNotification[]; unreadCount: number; pagination: { page: number; totalPages: number } }>(
    `/api/notifications?page=${page}&limit=${limit}`,
  );

export const unreadCount = () =>
  request<{ unreadCount: number }>("/api/notifications?limit=1");

export const markRead = (notificationId: string) =>
  request<{ success: true }>("/api/notifications", { body: { notificationId } });

export const markAllRead = () => request<{ success: true }>("/api/notifications", { body: { all: true } });

/**
 * Socket.IO client — port of movo-web context/SocketContext.tsx.
 * The server grants rooms from the session token (sent in `auth.token`),
 * so `join` only passes the optional bookingId / tier being asked for.
 */
import { io, type Socket } from "socket.io-client";
import type { SocketEventName } from "@movo/shared";
import { apiBaseUrl } from "./client";

export type JoinOptions = { bookingId?: string; tier?: string };

export type MovoSocket = {
  socket: Socket;
  join: (opts?: JoinOptions) => void;
  leaveBooking: (bookingId: string) => void;
  on: (event: SocketEventName, cb: (data: unknown) => void) => () => void;
  disconnect: () => void;
};

export function connectSocket(token: string | null): MovoSocket {
  const socket = io(apiBaseUrl(), {
    path: "/api/socketio",
    transports: ["websocket"],
    auth: token ? { token } : undefined,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  /* Rooms are lost on reconnect, so replay every join after each connect */
  const joins: JoinOptions[] = [];
  socket.on("connect", () => joins.forEach((j) => socket.emit("join", j)));

  return {
    socket,
    join(opts = {}) {
      const key = JSON.stringify(opts);
      if (!joins.some((j) => JSON.stringify(j) === key)) joins.push(opts);
      if (socket.connected) socket.emit("join", opts);
    },
    leaveBooking(bookingId) {
      const i = joins.findIndex((j) => j.bookingId === bookingId);
      if (i >= 0) joins.splice(i, 1);
      socket.emit("leave_booking", { bookingId });
    },
    on(event, cb) {
      socket.on(event, cb);
      return () => { socket.off(event, cb); };
    },
    disconnect() {
      socket.disconnect();
    },
  };
}

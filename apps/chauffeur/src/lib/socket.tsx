/**
 * One socket for the signed-in chauffeur — the mobile counterpart of the web's
 * context/SocketContext.tsx. The server grants rooms from the token (driver
 * room on join, tier room when `tier` matches the chauffeur's vehicle).
 *
 * Screens subscribe before this provider's own effect has created the socket
 * (child effects run first), so listeners and joins are kept here and attached
 * whenever a socket exists — including after a sign-in creates a new one.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { connectSocket, type JoinOptions, type MovoSocket } from "@movo/api";
import type { SocketEventName } from "@movo/shared";
import { useSession } from "./session";

type Listener = { event: SocketEventName; cb: (data: unknown) => void };

type SocketValue = {
  connected: boolean;
  join: (opts?: JoinOptions) => void;
  leaveBooking: (bookingId: string) => void;
  on: (event: SocketEventName, cb: (data: unknown) => void) => () => void;
};

const SocketContext = createContext<SocketValue>({
  connected: false,
  join: () => {},
  leaveBooking: () => {},
  on: () => () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const token = useSession((s) => s.token);
  const ref = useRef<MovoSocket | null>(null);
  const listeners = useRef(new Set<Listener>());
  const joins = useRef<JoinOptions[]>([{}]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const s = connectSocket(token);
    ref.current = s;
    s.socket.on("connect", () => setConnected(true));
    s.socket.on("disconnect", () => setConnected(false));
    listeners.current.forEach((l) => s.socket.on(l.event, l.cb));
    joins.current.forEach((j) => s.join(j));
    return () => {
      ref.current = null;
      s.disconnect();
      setConnected(false);
    };
  }, [token]);

  /* Stable functions: screens use them in effect dependencies */
  const join = useCallback((opts: JoinOptions = {}) => {
    const key = JSON.stringify(opts);
    if (!joins.current.some((j) => JSON.stringify(j) === key)) joins.current.push(opts);
    ref.current?.join(opts);
  }, []);

  const leaveBooking = useCallback((id: string) => {
    joins.current = joins.current.filter((j) => j.bookingId !== id);
    ref.current?.leaveBooking(id);
  }, []);

  const on = useCallback((event: SocketEventName, cb: (data: unknown) => void) => {
    const l: Listener = { event, cb };
    listeners.current.add(l);
    ref.current?.socket.on(event, cb);
    return () => {
      listeners.current.delete(l);
      ref.current?.socket.off(event, cb);
    };
  }, []);

  const value = useMemo(() => ({ connected, join, leaveBooking, on }), [connected, join, leaveBooking, on]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

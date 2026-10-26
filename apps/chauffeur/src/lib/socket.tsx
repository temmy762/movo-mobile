/**
 * One socket for the signed-in chauffeur — the mobile counterpart of the web's
 * context/SocketContext.tsx. The server grants rooms from the token (driver
 * room on join, tier room when `tier` matches the chauffeur's vehicle).
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { connectSocket, type JoinOptions, type MovoSocket } from "@movo/api";
import type { SocketEventName } from "@movo/shared";
import { useSession } from "./session";

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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const s = connectSocket(token);
    ref.current = s;
    s.socket.on("connect", () => setConnected(true));
    s.socket.on("disconnect", () => setConnected(false));
    s.join();
    return () => {
      ref.current = null;
      s.disconnect();
      setConnected(false);
    };
  }, [token]);

  const value: SocketValue = {
    connected,
    join: (opts) => ref.current?.join(opts),
    leaveBooking: (id) => ref.current?.leaveBooking(id),
    on: (event, cb) => ref.current?.on(event, cb) ?? (() => {}),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

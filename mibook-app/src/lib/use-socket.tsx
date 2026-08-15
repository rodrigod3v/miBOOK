"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import type { AuthUser } from "./client-api";

export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl: string;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  presence: Record<string, PresenceUser[]>;
  emitDocChange: (viewId: string, content: unknown, version: number) => void;
  emitRefresh: (viewId: string, kind: "view" | "db" | "tree" | "history") => void;
  joinView: (viewId: string, workspaceId: string) => void;
  leaveView: (viewId: string) => void;
  on: (event: string, cb: (...args: any[]) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
  children,
  user,
  workspaceId,
}: {
  children: ReactNode;
  user: AuthUser;
  workspaceId: string;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Record<string, PresenceUser[]>>({});
  const listeners = useRef(new Map<string, Set<(...args: any[]) => void>>());
  const userRef = useRef(user);
  const wsRef = useRef(workspaceId);
  userRef.current = user;
  wsRef.current = workspaceId;

  useEffect(() => {
    if (!workspaceId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const s = io(url, {
      path: "/socket.io",
      query: {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl || "",
        workspaceId: wsRef.current,
      },
      transports: ["websocket", "polling"],
    });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", () => setConnected(false));
    s.on("presence:update", (payload: { viewId: string; users: PresenceUser[] }) => {
      setPresence((p) => ({ ...p, [payload.viewId]: payload.users }));
    });
    s.on("doc:change", (payload: any) => {
      emitToListeners("doc:change", payload);
    });
    s.on("refresh", (payload: any) => {
      emitToListeners("refresh", payload);
    });
    s.on("presence:error", (payload: any) => {
      emitToListeners("presence:error", payload);
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitToListeners(event: string, payload: any) {
    listeners.current.get(event)?.forEach((cb) => cb(payload));
  }

  const value: SocketContextValue = {
    socket,
    connected,
    presence,
    emitDocChange: (viewId, content, version) => {
      socket?.emit("doc:change", { viewId, content, version });
    },
    emitRefresh: (viewId, kind) => {
      socket?.emit("refresh", { viewId, kind });
    },
    joinView: (viewId, workspaceId) => {
      socket?.emit("view:join", { viewId, workspaceId });
    },
    leaveView: (viewId) => {
      socket?.emit("view:leave", { viewId });
    },
    on: (event, cb) => {
      if (!listeners.current.has(event)) listeners.current.set(event, new Set());
      listeners.current.get(event)!.add(cb);
      return () => {
        listeners.current.get(event)?.delete(cb);
      };
    },
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket deve ser usado dentro de SocketProvider");
  return ctx;
}

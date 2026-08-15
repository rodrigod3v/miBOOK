import { createServer } from "node:http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const PORT = Number(process.env.SOCKET_PORT || 3001);
const dataDir = process.env.MIBOOK_DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

let sqlite;
try {
  sqlite = new Database(path.join(dataDir, "mibook.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
} catch (e) {
  console.error("[socket] failed to open db:", e);
  sqlite = null;
}

const isMember = (workspaceId, userId) => {
  if (!sqlite) return false;
  try {
    const row = sqlite
      .prepare("SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
      .get(workspaceId, userId);
    return !!row;
  } catch {
    return false;
  }
};

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "mibook-socket" }));
});

const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

// viewId -> Map<socketId, {userId,name,avatarUrl}>
const presence = new Map();

const sendPresence = (viewId) => {
  const users = presence.get(viewId);
  if (!users) return;
  const list = [...users.values()];
  io.to(`view:${viewId}`).emit("presence:update", { viewId, users: list });
};

io.on("connection", (socket) => {
  const { token, workspaceId, viewId, userId, name, avatarUrl } = socket.handshake.query;
  const user = {
    userId: String(userId || "?"),
    name: String(name || "Usuário"),
    avatarUrl: String(avatarUrl || ""),
  };

  const joinView = (viewId, wsId) => {
    if (!wsId || !user.userId) return;
    if (!isMember(wsId, user.userId)) {
      socket.emit("presence:error", { message: "Sem acesso a este espaço" });
      return;
    }
    socket.join(`ws:${wsId}`);
    socket.join(`view:${viewId}`);
    socket.data.viewId = viewId;
    socket.data.workspaceId = wsId;
    if (!presence.has(viewId)) presence.set(viewId, new Map());
    presence.get(viewId).set(socket.id, user);
    sendPresence(viewId);
  };

  if (viewId && workspaceId) joinView(String(viewId), String(workspaceId));

  socket.on("view:join", ({ viewId: v, workspaceId: w }) => {
    const old = socket.data.viewId;
    if (old && old !== v && presence.has(old)) {
      presence.get(old).delete(socket.id);
      sendPresence(old);
    }
    if (v && w) joinView(String(v), String(w));
  });

  socket.on("view:leave", ({ viewId: v }) => {
    if (presence.has(v)) {
      presence.get(v).delete(socket.id);
      if (presence.get(v).size === 0) presence.delete(v);
      else sendPresence(v);
    }
    socket.leave(`view:${v}`);
  });

  socket.on("doc:change", ({ viewId, content, version }) => {
    if (!socket.data.workspaceId || !socket.data.viewId) return;
    socket.to(`view:${socket.data.viewId}`).emit("doc:change", {
      viewId: socket.data.viewId,
      content,
      version,
      senderId: user.userId,
    });
  });

  socket.on("refresh", ({ viewId, kind }) => {
    socket.to(`view:${viewId}`).emit("refresh", {
      viewId,
      kind: kind || "view",
      senderId: user.userId,
    });
  });

  socket.on("disconnect", () => {
    const v = socket.data.viewId;
    if (v && presence.has(v)) {
      presence.get(v).delete(socket.id);
      if (presence.get(v).size === 0) presence.delete(v);
      else sendPresence(v);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] listening on :${PORT}`);
});

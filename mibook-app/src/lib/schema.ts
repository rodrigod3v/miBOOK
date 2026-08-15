import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
  },
  (t) => [index("idx_users_email").on(t.email)],
);

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("Novo espaço"),
  icon: text("icon").notNull().default("📚"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
});

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: ["owner", "member", "guest"] })
      .notNull()
      .default("member"),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("idx_wm_user").on(t.userId),
  ],
);

export const views = sqliteTable("views", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  name: text("name").notNull().default("Sem título"),
  icon: text("icon").notNull().default("📄"),
  coverUrl: text("cover_url"),
  layout: text("layout", { enum: ["document", "database"] })
    .notNull()
    .default("document"),
  content: text("content").notNull().default("[]"),
  position: integer("position").notNull().default(0),
  trashedAt: integer("trashed_at"),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(unixepoch()*1000)`),
});

export const favorites = sqliteTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewId: text("view_id")
      .notNull()
      .references(() => views.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.viewId] })],
);

export const history = sqliteTable(
  "history",
  {
    id: text("id").primaryKey(),
    viewId: text("view_id")
      .notNull()
      .references(() => views.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    actorId: text("actor_id"),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
  },
  (t) => [index("idx_history_view").on(t.viewId, t.createdAt)],
);

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["member", "guest"] }).notNull().default("member"),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  createdBy: text("created_by"),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
});

export const dbFields = sqliteTable(
  "db_fields",
  {
    id: text("id").primaryKey(),
    viewId: text("view_id")
      .notNull()
      .references(() => views.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["text", "number", "select", "multiSelect", "date", "checkbox", "url", "person"],
    })
      .notNull()
      .default("text"),
    options: text("options").notNull().default("[]"),
    position: integer("position").notNull().default(0),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("idx_dbfield_view").on(t.viewId)],
);

export const dbRows = sqliteTable(
  "db_rows",
  {
    id: text("id").primaryKey(),
    viewId: text("view_id")
      .notNull()
      .references(() => views.id, { onDelete: "cascade" }),
    values: text("values").notNull().default("{}"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
    updatedAt: integer("updated_at").notNull().default(sql`(unixepoch()*1000)`),
  },
  (t) => [index("idx_dbrow_view").on(t.viewId)],
);

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  uploaderId: text("uploader_id"),
  name: text("name").notNull(),
  mime: text("mime").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  path: text("path").notNull(),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch()*1000)`),
});

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type View = typeof views.$inferSelect;
export type DbField = typeof dbFields.$inferSelect;
export type DbRow = typeof dbRows.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type HistoryRow = typeof history.$inferSelect;

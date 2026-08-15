import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";

export const dataDir =
  process.env.MIBOOK_DATA_DIR || path.join(process.cwd(), "data");

let sqlite: Database.Database | null = null;
let dbInstance: BetterSQLite3Database<typeof schema> | null = null;

function init() {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(dataDir, { recursive: true });
  sqlite = new Database(path.join(dataDir, "mibook.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const instance = drizzle(sqlite, { schema });
  const folder = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(folder)) {
    try {
      migrate(instance, { migrationsFolder: folder });
    } catch (e) {
      console.error("migration failed:", e);
    }
  }
  dbInstance = instance;
  return instance;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_t, prop) {
    const instance = init();
    return Reflect.get(instance, prop, instance);
  },
});

export { sqlite };

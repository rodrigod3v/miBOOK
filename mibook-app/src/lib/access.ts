import { db } from "./db";
import { workspaceMembers } from "./schema";
import { and, eq } from "drizzle-orm";

export type Role = "owner" | "member" | "guest";

export function getMembership(workspaceId: string, userId: string) {
  return db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1)
    .get();
}

export function isMember(workspaceId: string, userId: string): boolean {
  return !!getMembership(workspaceId, userId);
}

export function requireRole(workspaceId: string, userId: string, roles: Role[]): void {
  const m = getMembership(workspaceId, userId);
  if (!m || !roles.includes(m.role)) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, views, workspaceMembers } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { isMember, requireRole } from "@/lib/access";
import { listViews } from "@/lib/workspace";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso a este espaço");
    const ws = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) return fail(404, "Espaço não encontrado");
    const members = db
      .select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .all();
    return { workspace: ws, members };
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    requireRole(workspaceId, user.id, ["owner"]);
    const body = await req.json();
    db.update(workspaces)
      .set({
        ...(typeof body.name === "string" ? { name: body.name.trim() || "Novo espaço" } : {}),
        ...(typeof body.icon === "string" ? { icon: body.icon } : {}),
      })
      .where(eq(workspaces.id, workspaceId))
      .run();
    return db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    requireRole(workspaceId, user.id, ["owner"]);
    db.delete(workspaces).where(eq(workspaces.id, workspaceId)).run();
    return { ok: true };
  });
}

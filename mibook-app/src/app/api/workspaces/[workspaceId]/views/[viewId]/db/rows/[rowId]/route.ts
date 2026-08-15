import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser, now } from "@/lib/auth";
import { db } from "@/lib/db";
import { dbRows, views } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string; rowId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId, rowId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const r = db.select().from(dbRows).where(eq(dbRows.id, rowId)).get();
    if (!r || r.viewId !== viewId) return fail(404, "Linha não encontrada");
    const body = await req.json();
    const set: Record<string, unknown> = { updatedAt: now() };
    if (body.values) set.values = JSON.stringify(body.values);
    if (typeof body.position === "number") set.position = body.position;
    db.update(dbRows).set(set).where(eq(dbRows.id, rowId)).run();
    return db.select().from(dbRows).where(eq(dbRows.id, rowId)).get();
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string; rowId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId, rowId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const r = db.select().from(dbRows).where(eq(dbRows.id, rowId)).get();
    if (!r || r.viewId !== viewId) return fail(404, "Linha não encontrada");
    db.delete(dbRows).where(eq(dbRows.id, rowId)).run();
    return { ok: true };
  });
}

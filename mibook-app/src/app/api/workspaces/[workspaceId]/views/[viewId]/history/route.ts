import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser, now } from "@/lib/auth";
import { db } from "@/lib/db";
import { views, history } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const rows = db.select().from(history).where(eq(history.viewId, viewId)).orderBy(history.createdAt).all();
    return rows.slice(-50).reverse();
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const v = db.select().from(views).where(eq(views.id, viewId)).get();
    if (!v || v.workspaceId !== workspaceId) return fail(404, "Página não encontrada");
    const body = await req.json();
    const snapshotId = String(body.snapshotId || "");
    const snap = db.select().from(history).where(eq(history.id, snapshotId)).get();
    if (!snap || snap.viewId !== viewId) return fail(404, "Versão não encontrada");
    db.update(views).set({ content: snap.content, updatedAt: now() }).where(eq(views.id, viewId)).run();
    return { ok: true, content: snap.content };
  });
}

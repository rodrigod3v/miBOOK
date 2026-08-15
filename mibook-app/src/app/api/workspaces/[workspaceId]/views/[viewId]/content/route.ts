import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser, uid, now } from "@/lib/auth";
import { db } from "@/lib/db";
import { views, history } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const v = db.select().from(views).where(eq(views.id, viewId)).get();
    if (!v || v.workspaceId !== workspaceId) return fail(404, "Página não encontrada");
    return { content: v.content, updatedAt: v.updatedAt };
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const v = db.select().from(views).where(eq(views.id, viewId)).get();
    if (!v || v.workspaceId !== workspaceId) return fail(404, "Página não encontrada");
    if (v.layout !== "document") return fail(400, "Conteúdo só é permitido para documentos");
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content : JSON.stringify(body.content || []);
    db.update(views).set({ content, updatedAt: now() }).where(eq(views.id, viewId)).run();
    return { updatedAt: now() };
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
    const content = typeof body.content === "string" ? body.content : JSON.stringify(body.content || []);
    const count = db.select().from(history).where(eq(history.viewId, viewId)).all().length;
    db.insert(history)
      .values({ id: uid(), viewId, content, actorId: user.id })
      .run();
    if (count >= 50) {
      const old = db
        .select({ id: history.id })
        .from(history)
        .where(eq(history.viewId, viewId))
        .all()
        .sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 0; i < old.length - 49; i++) {
        db.delete(history).where(eq(history.id, old[i].id)).run();
      }
    }
    return { ok: true };
  });
}

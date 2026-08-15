import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { views, favorites, dbFields, dbRows, history, files } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { isMember } from "@/lib/access";

function getView(viewId: string, workspaceId: string) {
  const v = db.select().from(views).where(eq(views.id, viewId)).get();
  if (!v || v.workspaceId !== workspaceId) return null;
  return v;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const v = getView(viewId, workspaceId);
    if (!v) return fail(404, "Página não encontrada");
    const body = await req.json();

    if (typeof body.name === "string") {
      db.update(views).set({ name: body.name.trim() || "Sem título" }).where(eq(views.id, viewId)).run();
    }
    if (typeof body.icon === "string") {
      db.update(views).set({ icon: body.icon }).where(eq(views.id, viewId)).run();
    }
    if (typeof body.coverUrl === "string" || body.coverUrl === null) {
      db.update(views).set({ coverUrl: body.coverUrl }).where(eq(views.id, viewId)).run();
    }
    if (typeof body.parentId !== "undefined") {
      const newParent = body.parentId === null ? null : body.parentId;
      if (newParent !== null && newParent !== viewId) {
        const p = db.select().from(views).where(eq(views.id, newParent)).get();
        if (!p || p.workspaceId !== workspaceId) return fail(400, "Página pai inválida");
      }
      if (newParent === viewId) return fail(400, "Uma página não pode ser filha dela mesma");
      db.update(views).set({ parentId: newParent }).where(eq(views.id, viewId)).run();
    }
    if (typeof body.position === "number") {
      db.update(views).set({ position: body.position }).where(eq(views.id, viewId)).run();
    }
    if (typeof body.layout === "string" && (body.layout === "document" || body.layout === "database")) {
      db.update(views).set({ layout: body.layout }).where(eq(views.id, viewId)).run();
    }
    if (v.layout === "database" && body.config && typeof body.config === "object") {
      let config: any = {};
      try {
        config = JSON.parse(v.content);
      } catch {
        config = {};
      }
      const merged = { ...config, ...body.config };
      db.update(views).set({ content: JSON.stringify(merged), updatedAt: Date.now() }).where(eq(views.id, viewId)).run();
    }
    if (typeof body.favorite === "boolean") {
      if (body.favorite) {
        const exists = db
          .select()
          .from(favorites)
          .where(and(eq(favorites.userId, user.id), eq(favorites.viewId, viewId)))
          .get();
        if (!exists) db.insert(favorites).values({ userId: user.id, viewId }).run();
      } else {
        db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.viewId, viewId))).run();
      }
    }
    if (body.trash === true) {
      db.update(views).set({ trashedAt: Date.now() }).where(eq(views.id, viewId)).run();
    }
    if (body.restore === true) {
      db.update(views).set({ trashedAt: null }).where(eq(views.id, viewId)).run();
    }
    const updated = db.select().from(views).where(eq(views.id, viewId)).get()!;
    const fav = db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.viewId, viewId)))
      .get();
    return { ...updated, isFavorite: !!fav };
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const v = getView(viewId, workspaceId);
    if (!v) return fail(404, "Página não encontrada");
    if (!v.trashedAt) return fail(400, "Mova para a lixeira antes de excluir definitivamente");
    const children = db.select().from(views).where(eq(views.parentId, viewId)).all();
    if (children.length > 0) return fail(400, "Exclua as subpáginas antes de excluir esta página");
    db.delete(dbRows).where(eq(dbRows.viewId, viewId)).run();
    db.delete(dbFields).where(eq(dbFields.viewId, viewId)).run();
    db.delete(history).where(eq(history.viewId, viewId)).run();
    db.delete(views).where(eq(views.id, viewId)).run();
    return { ok: true };
  });
}

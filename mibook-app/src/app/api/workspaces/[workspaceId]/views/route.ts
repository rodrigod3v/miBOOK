import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser, uid } from "@/lib/auth";
import { db } from "@/lib/db";
import { views, favorites } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { isMember } from "@/lib/access";
import { listViews, getFavoriteViewIds } from "@/lib/workspace";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const all = listViews(workspaceId);
    const favs = getFavoriteViewIds(user.id);
    return all.map((v) => ({ ...v, isFavorite: favs.has(v.id) }));
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const body = await req.json();
    const layout: "document" | "database" = body.layout === "database" ? "database" : "document";
    const parentId = typeof body.parentId === "string" ? body.parentId : null;
    if (parentId) {
      const parent = db.select().from(views).where(eq(views.id, parentId)).get();
      if (!parent || parent.workspaceId !== workspaceId) return fail(400, "Página pai inválida");
    }
    const siblings = db
      .select()
      .from(views)
      .where(eq(views.workspaceId, workspaceId))
      .all()
      .filter((v) => v.parentId === parentId && !v.trashedAt);
    const position = siblings.length;
    const id = uid();
    db.insert(views)
      .values({
        id,
        workspaceId,
        parentId,
        name: body.name || "Sem título",
        icon: body.icon || "📄",
        layout,
        content: layout === "document" ? "[]" : JSON.stringify({ view: "table", groupBy: null }),
        position,
      })
      .run();
    return db.select().from(views).where(eq(views.id, id)).get();
  });
}

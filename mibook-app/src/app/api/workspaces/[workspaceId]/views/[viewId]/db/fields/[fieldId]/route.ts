import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dbFields, views } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string; fieldId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId, fieldId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const f = db.select().from(dbFields).where(eq(dbFields.id, fieldId)).get();
    if (!f || f.viewId !== viewId) return fail(404, "Campo não encontrado");
    const body = await req.json();
    db.update(dbFields)
      .set({
        ...(typeof body.name === "string" ? { name: body.name.trim() || "Sem nome" } : {}),
        ...(typeof body.position === "number" ? { position: body.position } : {}),
        ...(typeof body.hidden === "boolean" ? { hidden: body.hidden } : {}),
        ...(body.options ? { options: JSON.stringify(body.options) } : {}),
      })
      .where(eq(dbFields.id, fieldId))
      .run();
    return db.select().from(dbFields).where(eq(dbFields.id, fieldId)).get();
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string; fieldId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId, fieldId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const f = db.select().from(dbFields).where(eq(dbFields.id, fieldId)).get();
    if (!f || f.viewId !== viewId) return fail(404, "Campo não encontrado");
    const fields = db.select().from(dbFields).where(eq(dbFields.viewId, viewId)).all();
    if (fields.length <= 1) return fail(400, "Um banco de dados precisa de pelo menos um campo");
    db.delete(dbFields).where(eq(dbFields.id, fieldId)).run();
    return { ok: true };
  });
}

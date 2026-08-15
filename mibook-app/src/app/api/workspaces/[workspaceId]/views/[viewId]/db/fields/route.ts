import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser, uid } from "@/lib/auth";
import { db } from "@/lib/db";
import { dbFields, views } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";

function getDb(viewId: string, workspaceId: string) {
  const v = db.select().from(views).where(eq(views.id, viewId)).get();
  if (!v || v.workspaceId !== workspaceId || v.layout !== "database") return null;
  return v;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    if (!getDb(viewId, workspaceId)) return fail(404, "Banco de dados não encontrado");
    return db.select().from(dbFields).where(eq(dbFields.viewId, viewId)).orderBy(dbFields.position).all();
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ workspaceId: string; viewId: string }> }) {
  return run(async () => {
    const { workspaceId, viewId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    if (!getDb(viewId, workspaceId)) return fail(404, "Banco de dados não encontrado");
    const body = await req.json();
    const allowed = ["text", "number", "select", "multiSelect", "date", "checkbox", "url", "person"];
    const type = allowed.includes(body.type) ? body.type : "text";
    const fields = db.select().from(dbFields).where(eq(dbFields.viewId, viewId)).all();
    const id = uid();
    db.insert(dbFields)
      .values({
        id,
        viewId,
        name: String(body.name || "Sem nome").trim() || "Sem nome",
        type,
        options: body.options ? JSON.stringify(body.options) : "[]",
        position: fields.length,
      })
      .run();
    return db.select().from(dbFields).where(eq(dbFields.id, id)).get();
  });
}

import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { views, workspaceMembers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { isMember } from "@/lib/access";

export async function GET(req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    if (!isMember(workspaceId, user.id)) return fail(403, "Sem acesso");
    const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
    if (!q) return [];
    const all = db.select().from(views).where(eq(views.workspaceId, workspaceId)).all();
    const terms = q.split(/\s+/).filter(Boolean);
    const results = all.filter((v) => {
      if (v.trashedAt) return false;
      const hay = `${v.name} ${v.icon}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    return results.slice(0, 30).map((v) => ({
      id: v.id,
      name: v.name,
      icon: v.icon,
      layout: v.layout,
      parentId: v.parentId,
    }));
  });
}

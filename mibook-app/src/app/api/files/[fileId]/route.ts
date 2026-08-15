import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, dataDir } from "@/lib/db";
import { files } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";
import { getSessionUserId } from "@/lib/auth";
import path from "node:path";
import fs from "node:fs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ fileId: string }> }) {
  const user = await getSessionUserId();
  if (!user) return fail(401, "Não autenticado");
  const { fileId } = await ctx.params;
  const file = db.select().from(files).where(eq(files.id, fileId)).get();
  if (!file) return fail(404, "Arquivo não encontrado");
  if (!isMember(file.workspaceId, user)) return fail(403, "Sem acesso");
  const filepath = path.join(dataDir, "uploads", file.path);
  if (!fs.existsSync(filepath)) return fail(404, "Arquivo não encontrado no disco");
  const buffer = fs.readFileSync(filepath);
  return new Response(buffer, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=86400",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    },
  });
}

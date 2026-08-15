import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser, uid } from "@/lib/auth";
import { db, dataDir } from "@/lib/db";
import { files } from "@/lib/schema";
import path from "node:path";
import fs from "node:fs";

export async function POST(req: NextRequest) {
  return run(async () => {
    const user = await requireUser();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const workspaceId = String(form.get("workspaceId") || "");
    if (!file) return fail(400, "Nenhum arquivo enviado");
    if (!workspaceId) return fail(400, "workspaceId obrigatório");
    const buffer = Buffer.from(await file.arrayBuffer());
    const maxSize = 50 * 1024 * 1024;
    if (buffer.length > maxSize) return fail(413, "Arquivo muito grande (máx. 50MB)");

    const id = uid();
    const ext = path.extname(file.name).slice(0, 12);
    const dir = path.join(dataDir, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${id}${ext}`;
    fs.writeFileSync(path.join(dir, filename), buffer);

    db.insert(files)
      .values({
        id,
        workspaceId,
        uploaderId: user.id,
        name: file.name.slice(0, 255),
        mime: file.type || "application/octet-stream",
        size: buffer.length,
        path: filename,
      })
      .run();
    return {
      fileId: id,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: buffer.length,
      url: `/api/files/${id}`,
    };
  });
}

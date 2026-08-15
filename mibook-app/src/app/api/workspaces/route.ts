import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getWorkspacesForUser, createWorkspace } from "@/lib/workspace";

export async function GET() {
  return run(async () => {
    const user = await requireUser();
    return getWorkspacesForUser(user.id).map((w) => ({
      ...w.workspace,
      role: w.role,
    }));
  });
}

export async function POST(req: NextRequest) {
  return run(async () => {
    const user = await requireUser();
    const body = await req.json();
    const name = String(body.name || "").trim() || "Novo espaço";
    const icon = String(body.icon || "📚").trim() || "📚";
    const ws = createWorkspace(user.id, name, icon);
    return ws;
  });
}

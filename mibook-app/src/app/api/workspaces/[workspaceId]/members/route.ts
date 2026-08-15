import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { requireUser, uid } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers, users, invites } from "@/lib/schema";
import { eq, and, not } from "drizzle-orm";
import { requireRole } from "@/lib/access";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    requireRole(workspaceId, user.id, ["owner", "member"]);
    const members = db
      .select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .all();
    const pendingInvites = db
      .select()
      .from(invites)
      .where(and(eq(invites.workspaceId, workspaceId), eq(invites.status, "pending")))
      .all();
    return { members, pendingInvites };
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    requireRole(workspaceId, user.id, ["owner", "member"]);
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "guest" ? "guest" : "member";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, "Email inválido");
    if (email === user.email) return fail(400, "Você já é membro deste espaço");

    const target = db.select().from(users).where(eq(users.email, email)).limit(1).get();
    if (target) {
      const exists = db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, target.id)))
        .limit(1)
        .get();
      if (exists) return fail(409, "Este usuário já é membro");
      db.insert(workspaceMembers)
        .values({ workspaceId, userId: target.id, role })
        .run();
      return { accepted: true, user: { id: target.id, email, name: target.name } };
    } else {
      const existingInvite = db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.workspaceId, workspaceId),
            eq(invites.email, email),
            eq(invites.status, "pending"),
          ),
        )
        .limit(1)
        .get();
      if (existingInvite) return fail(409, "Convite já enviado para este email");
      db.insert(invites)
        .values({ id: uid(), workspaceId, email, role, createdBy: user.id })
        .run();
      return { accepted: false, invited: true };
    }
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    requireRole(workspaceId, user.id, ["owner"]);
    const body = await req.json();
    const userId = String(body.userId || "");
    const role = String(body.role || "") as "owner" | "member" | "guest";
    if (!["owner", "member", "guest"].includes(role)) return fail(400, "Papel inválido");
    db.update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .run();
    return { ok: true };
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ workspaceId: string }> }) {
  return run(async () => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();
    const body = await req.json();
    const userId = String(body.userId || "");
    const me = db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
      .get();
    if (!me) return fail(403, "Sem acesso");
    if (me.role !== "owner" && userId !== user.id) return fail(403, "Só o dono pode remover membros");
    if (userId === user.id) {
      if (me.role === "owner") return fail(400, "O dono não pode sair do espaço");
      db.delete(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
        .run();
      return { ok: true, left: true };
    }
    db.delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .run();
    return { ok: true };
  });
}

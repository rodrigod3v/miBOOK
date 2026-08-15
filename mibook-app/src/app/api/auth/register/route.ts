import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, setSessionCookie, uid } from "@/lib/auth";
import { createWorkspace } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  return run(async () => {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim() || email.split("@")[0];
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return fail(400, "Email inválido");
    }
    if (password.length < 6) {
      return fail(400, "A senha deve ter pelo menos 6 caracteres");
    }
    const existing = db.select().from(users).where(eq(users.email, email)).limit(1).get();
    if (existing) {
      return fail(409, "Este email já está cadastrado");
    }
    const userId = uid();
    db.insert(users)
      .values({ id: userId, email, name, passwordHash: hashPassword(password) })
      .run();
    createWorkspace(userId, `${name}'s espaço`, "📚");
    const token = await createSession(userId);
    await setSessionCookie(token);
    return { id: userId, email, name };
  });
}

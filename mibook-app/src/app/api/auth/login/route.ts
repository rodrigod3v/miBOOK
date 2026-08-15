import { NextRequest } from "next/server";
import { run, fail } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  return run(async () => {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = db.select().from(users).where(eq(users.email, email)).limit(1).get();
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail(401, "Email ou senha incorretos");
    }
    const token = await createSession(user.id);
    await setSessionCookie(token);
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
  });
}

import { run } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  return run(async () => {
    await clearSessionCookie();
    return { ok: true };
  });
}

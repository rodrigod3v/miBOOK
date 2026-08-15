import { run } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  return run(async () => {
    const user = await getCurrentUser();
    if (!user) return { user: null };
    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    };
  });
}

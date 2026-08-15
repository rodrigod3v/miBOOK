import { requireUser } from "@/lib/auth";
import { getWorkspacesForUser } from "@/lib/workspace";
import { AppShell } from "@/components/app-shell";
import { AppProvider } from "@/lib/app-context";
import type { AuthUser, Workspace } from "@/lib/client-api";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspaces = getWorkspacesForUser(user.id);
  const userDto: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
  const wsDtos: Workspace[] = workspaces.map((w) => ({
    ...w.workspace,
    role: w.role,
  }));

  return (
    <AppProvider user={userDto} workspaces={wsDtos}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}

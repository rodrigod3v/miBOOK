import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { views } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkspaceHome({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const user = await requireUser();
  if (!isMember(workspaceId, user.id)) notFound();
  const all = db.select().from(views).where(eq(views.workspaceId, workspaceId)).all();
  const first = all.filter((v) => !v.trashedAt).sort((a, b) => a.position - b.position)[0];
  if (first) {
    redirect(`/app/workspace/${workspaceId}/view/${first.id}`);
  }
  redirect(`/app/workspace/${workspaceId}`);
}

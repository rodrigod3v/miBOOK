import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { views } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isMember } from "@/lib/access";
import { DocumentPage } from "@/components/editor/document-page";
import { DatabasePage } from "@/components/database/database-page";

export const dynamic = "force-dynamic";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ workspaceId: string; viewId: string }>;
}) {
  const { workspaceId, viewId } = await params;
  const user = await requireUser();
  if (!isMember(workspaceId, user.id)) notFound();
  const view = db.select().from(views).where(eq(views.id, viewId)).get();
  if (!view || view.workspaceId !== workspaceId) notFound();

  if (view.layout === "database") {
    return <DatabasePage workspaceId={workspaceId} viewId={viewId} initialView={view} />;
  }
  return <DocumentPage workspaceId={workspaceId} viewId={viewId} initialView={view} />;
}

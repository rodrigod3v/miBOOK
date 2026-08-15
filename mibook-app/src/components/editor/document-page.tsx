"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockEditor } from "./block-editor";

export function DocumentPage({
  workspaceId,
  viewId,
  initialView,
}: {
  workspaceId: string;
  viewId: string;
  initialView: { name: string; icon: string; content: string; updatedAt: number };
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-6 pb-40 pt-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <BlockEditor
      workspaceId={workspaceId}
      viewId={viewId}
      initialName={initialView.name}
      initialIcon={initialView.icon}
      initialContent={initialView.content}
    />
  );
}

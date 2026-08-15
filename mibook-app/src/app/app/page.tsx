"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";

export default function AppHome() {
  const router = useRouter();
  const { workspaces } = useApp();

  useEffect(() => {
    if (workspaces.length > 0) {
      router.replace(`/app/workspace/${workspaces[0].id}`);
    }
  }, [workspaces, router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {workspaces.length === 0 ? "Nenhum espaço ainda…" : "Carregando…"}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Database, RotateCcw, Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function TrashDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { trash, activeWs, patchView, deleteView } = useApp();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lixeira</DialogTitle>
          <DialogDescription>
            {trash.length === 0
              ? "A lixeira está vazia."
              : "Restaurar devolve a página ao espaço. Excluir remove definitivamente."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {trash.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-md border p-2">
              {v.icon ? (
                <span className="text-lg">{v.icon}</span>
              ) : v.layout === "database" ? (
                <Database className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1 truncate text-sm font-medium">{v.name || "Sem título"}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await patchView(v.id, { restore: true });
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" /> Restaurar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={async () => {
                  await deleteView(v.id);
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

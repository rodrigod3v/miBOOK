"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { http } from "@/lib/client-api";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { activeWs, user, workspaces, setWorkspaces } = useApp();
  const router = useRouter();
  const [wsName, setWsName] = useState(activeWs?.name || "");
  const [pending, setPending] = useState(false);

  async function saveWorkspace() {
    if (!activeWs) return;
    setPending(true);
    try {
      const updated = await http.patch(`/api/workspaces/${activeWs.id}`, { name: wsName.trim() });
      setWorkspaces(workspaces.map((w) => (w.id === updated.id ? { ...w, name: updated.name } : w)));
      toast.success("Espaço atualizado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    await http.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Logado como <span className="font-medium">{user.email}</span>
          </DialogDescription>
        </DialogHeader>
        {activeWs && (
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="ws-settings-name">Nome do espaço</Label>
              <div className="flex gap-2">
                <Input
                  id="ws-settings-name"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                />
                <Button onClick={saveWorkspace} disabled={pending}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="border-t pt-4">
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={logout}>
            Sair da conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

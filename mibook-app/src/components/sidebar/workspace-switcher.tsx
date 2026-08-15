"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { http } from "@/lib/client-api";

export function WorkspaceSwitcher() {
  const { workspaces, setWorkspaces, activeWs } = useApp();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚");
  const [pending, setPending] = useState(false);

  const icons = ["📚", "🚀", "💼", "🎨", "🎯", "🧠", "📊", "🔬", "🌍", "🎮"];

  async function create() {
    setPending(true);
    try {
      const ws = await http.post("/api/workspaces", { name: name.trim() || "Novo espaço", icon });
      setWorkspaces([ws, ...workspaces]);
      setCreateOpen(false);
      setName("");
      router.push(`/app/workspace/${ws.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="h-9 w-full justify-start gap-2 px-2 font-medium">
              <span className="text-lg">{activeWs?.icon || "📚"}</span>
              <span className="min-w-0 flex-1 truncate text-left text-sm">
                {activeWs?.name || "Escolher espaço"}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Espaços de trabalho</DropdownMenuLabel>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => router.push(`/app/workspace/${ws.id}`)}
            >
              <span className="mr-2 text-lg">{ws.icon}</span>
              <span className="min-w-0 flex-1 truncate">{ws.name}</span>
              {ws.id === activeWs?.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar espaço…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar espaço de trabalho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {icons.map((i) => (
                  <button
                    key={i}
                    className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg transition-colors ${
                      icon === i ? "border-primary bg-accent" : "border-border hover:bg-accent"
                    }`}
                    onClick={() => setIcon(i)}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nome</Label>
              <Input
                id="ws-name"
                placeholder="Meu espaço"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={pending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

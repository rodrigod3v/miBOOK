"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText,
  Database,
  Loader2,
  Plus,
  SunMoon,
  Users,
  Settings,
  Trash2,
  Sparkles,
  Command,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { http, type ViewItem } from "@/lib/client-api";
import { useTheme } from "next-themes";

export function SearchDialog({
  open,
  onOpenChange,
  onOpenMembers,
  onOpenSettings,
  onOpenTrash,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenMembers?: () => void;
  onOpenSettings?: () => void;
  onOpenTrash?: () => void;
}) {
  const { activeWs, createPage, views } = useApp();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ViewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!term || !activeWs) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await http.get<ViewItem[]>(
          `/api/workspaces/${activeWs.id}/search?q=${encodeURIComponent(term)}`
        );
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q, activeWs]);

  const quickActions = [
    {
      id: "create-doc",
      label: "Criar nova página",
      icon: <FileText className="h-4 w-4 text-blue-400" />,
      action: async () => {
        if (!activeWs) return;
        const v = await createPage(null, "document");
        router.push(`/app/workspace/${activeWs.id}/view/${v.id}`);
        onOpenChange(false);
      },
    },
    {
      id: "create-db",
      label: "Criar novo banco de dados",
      icon: <Database className="h-4 w-4 text-indigo-400" />,
      action: async () => {
        if (!activeWs) return;
        const v = await createPage(null, "database");
        router.push(`/app/workspace/${activeWs.id}/view/${v.id}`);
        onOpenChange(false);
      },
    },
    {
      id: "toggle-theme",
      label: `Alternar tema (Atual: ${theme === "dark" ? "Escuro" : "Claro"})`,
      icon: <SunMoon className="h-4 w-4 text-amber-400" />,
      action: () => {
        setTheme(theme === "dark" ? "light" : "dark");
        onOpenChange(false);
      },
    },
    {
      id: "open-members",
      label: "Gerenciar membros",
      icon: <Users className="h-4 w-4 text-emerald-400" />,
      action: () => {
        onOpenChange(false);
        onOpenMembers?.();
      },
    },
    {
      id: "open-settings",
      label: "Configurações do espaço",
      icon: <Settings className="h-4 w-4 text-slate-400" />,
      action: () => {
        onOpenChange(false);
        onOpenSettings?.();
      },
    },
    {
      id: "open-trash",
      label: "Abrir lixeira",
      icon: <Trash2 className="h-4 w-4 text-rose-400" />,
      action: () => {
        onOpenChange(false);
        onOpenTrash?.();
      },
    },
  ];

  const recentPages = views.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] max-w-xl p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Menu de Comandos</DialogTitle>
        </DialogHeader>

        {/* Input Bar */}
        <div className="relative flex items-center border-b border-border px-4 py-3 bg-card">
          <Search className="h-4 w-4 text-primary mr-3 shrink-0" />
          <Input
            autoFocus
            className="h-9 border-none bg-transparent p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Digite um comando ou busque uma página..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Search Results */}
          {!loading && q && (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Resultados da busca ({results.length})
              </div>
              {results.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma página encontrada para "{q}"
                </div>
              ) : (
                results.map((r) => (
                  <motion.button
                    key={r.id}
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.15 }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent/70 transition-colors"
                    onClick={() => {
                      router.push(`/app/workspace/${activeWs!.id}/view/${r.id}`);
                      onOpenChange(false);
                    }}
                  >
                    {r.icon ? (
                      <span className="text-base">{r.icon}</span>
                    ) : r.layout === "database" ? (
                      <Database className="h-4 w-4 text-indigo-400 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                    )}
                    <span className="truncate flex-1 font-medium">{r.name || "Sem título"}</span>
                    <span className="text-xs text-muted-foreground capitalize">{r.layout}</span>
                  </motion.button>
                ))
              )}
            </div>
          )}

          {/* Quick Actions & Recents when Search Input is Empty */}
          {!loading && !q && (
            <div className="space-y-4">
              {/* Actions */}
              <div>
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" /> Ações Rápidas
                </div>
                <div className="mt-1 space-y-0.5">
                  {quickActions.map((act) => (
                    <motion.button
                      key={act.id}
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.15 }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/70 transition-colors"
                      onClick={act.action}
                    >
                      {act.icon}
                      <span className="flex-1 font-medium">{act.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recent Pages */}
              {recentPages.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Páginas Recentes
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {recentPages.map((p) => (
                      <motion.button
                        key={p.id}
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.15 }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/70 transition-colors"
                        onClick={() => {
                          router.push(`/app/workspace/${activeWs!.id}/view/${p.id}`);
                          onOpenChange(false);
                        }}
                      >
                        <span className="text-base">{p.icon || "📄"}</span>
                        <span className="truncate flex-1 text-sm font-medium">{p.name || "Sem título"}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <span>Dica: Use <strong>↑</strong> <strong>↓</strong> e <strong>Enter</strong> para navegar</span>
          <span className="flex items-center gap-1 font-mono">miBOOK Command Palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

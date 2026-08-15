"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, FileText, Database, Loader2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { http, type ViewItem } from "@/lib/client-api";

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { activeWs } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ViewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      return;
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
          `/api/workspaces/${activeWs.id}/search?q=${encodeURIComponent(term)}`,
        );
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, activeWs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar páginas</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-9"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                router.push(`/app/workspace/${activeWs!.id}/view/${results[0].id}`);
                onOpenChange(false);
              }
            }}
          />
        </div>
        <div className="max-h-[45vh] space-y-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && q && results.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">Nenhum resultado</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                router.push(`/app/workspace/${activeWs!.id}/view/${r.id}`);
                onOpenChange(false);
              }}
            >
              {r.icon ? (
                <span className="text-lg">{r.icon}</span>
              ) : r.layout === "database" ? (
                <Database className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{r.name || "Sem título"}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

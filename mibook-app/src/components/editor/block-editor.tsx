"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, PartialBlock } from "@blocknote/core";
import "@blocknote/react/style.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";
import { Clock, History, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { http } from "@/lib/client-api";
import { useSocket } from "@/lib/use-socket";
import { useApp } from "@/lib/app-context";

interface Snapshot {
  id: string;
  content: string;
  createdAt: number;
}

type Editor = ReturnType<typeof useCreateBlockNote>;

export function BlockEditor({
  workspaceId,
  viewId,
  initialName,
  initialIcon,
  initialContent,
}: {
  workspaceId: string;
  viewId: string;
  initialName: string;
  initialIcon: string;
  initialContent: string;
}) {
  const { theme } = useTheme();
  const { emitDocChange, on } = useSocket();
  const { patchView } = useApp();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [restoring, setRestoring] = useState(false);

  const versionRef = useRef(0);
  const applyingRemote = useRef(false);
  const lastSnapshotAt = useRef(Date.now());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialContentParsed = useMemo(() => {
    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as PartialBlock[];
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: initialContentParsed,
    uploadFile: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("workspaceId", workspaceId);
      const res = await http.post<{ url: string }>("/api/upload", fd);
      return res.url;
    },
  });

  const save = useCallback(
    async (content: Block<any, any, any>[]) => {
      const payload = JSON.stringify(content);
      const version = ++versionRef.current;
      setSaving(true);
      try {
        await http.put(`/api/workspaces/${workspaceId}/views/${viewId}/content`, {
          content: payload,
        });
        setSaving(false);
        setSavedAt(Date.now());
        emitDocChange(viewId, payload, version);
        if (Date.now() - lastSnapshotAt.current > 45000) {
          lastSnapshotAt.current = Date.now();
          await http.post(`/api/workspaces/${workspaceId}/views/${viewId}/content`, {
            content: payload,
          });
        }
      } catch {
        setSaving(false);
        toast.error("Falha ao salvar alterações");
      }
    },
    [workspaceId, viewId, emitDocChange],
  );

  const handleChange = useCallback(
    (ed: Editor) => {
      if (applyingRemote.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(ed.document), 700);
    },
    [save],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    const off = on("doc:change", (payload: any) => {
      if (payload.viewId !== viewId) return;
      try {
        const content = JSON.parse(payload.content);
        if (typeof payload.version === "number" && payload.version < versionRef.current) return;
        applyingRemote.current = true;
        editor.replaceBlocks(editor.document, content);
        applyingRemote.current = false;
        versionRef.current = payload.version ?? versionRef.current;
      } catch {
        /* ignore invalid content */
      }
    });
    return off;
  }, [on, viewId, editor]);

  async function rename() {
    const n = name.trim();
    if (!n || n === initialName) return;
    await patchView(viewId, { name: n });
  }

  async function loadHistory() {
    setHistoryOpen(true);
    const rows = await http.get<Snapshot[]>(
      `/api/workspaces/${workspaceId}/views/${viewId}/history`,
    );
    setSnapshots(rows);
  }

  async function restoreSnapshot(snapshotId: string) {
    setRestoring(true);
    try {
      const res = await http.post<{ content: string }>(
        `/api/workspaces/${workspaceId}/views/${viewId}/history`,
        { snapshotId },
      );
      const content = JSON.parse(res.content);
      applyingRemote.current = true;
      editor.replaceBlocks(editor.document, content);
      applyingRemote.current = false;
      const version = ++versionRef.current;
      emitDocChange(viewId, res.content, version);
      toast.success("Versão restaurada");
      setHistoryOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-40 pt-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving ? (
            <>
              <Save className="h-3.5 w-3.5 animate-pulse" /> Salvando…
            </>
          ) : savedAt ? (
            <>
              <Save className="h-3.5 w-3.5" /> Salvo às{" "}
              {new Date(savedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={loadHistory}>
          <History className="h-4 w-4" /> Histórico
        </Button>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <input className="w-8 text-2xl outline-none" value={initialIcon} readOnly aria-label="ícone" />
        <input
          className="flex-1 bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          placeholder="Sem título"
        />
      </div>

      <BlockNoteView editor={editor} theme={theme === "light" ? "light" : "dark"} onChange={handleChange} />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Histórico da página
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {snapshots.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma versão salva ainda.
              </p>
            )}
            {snapshots.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">
                  {new Date(s.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <Button variant="outline" size="sm" onClick={() => restoreSnapshot(s.id)} disabled={restoring}>
                  Restaurar
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

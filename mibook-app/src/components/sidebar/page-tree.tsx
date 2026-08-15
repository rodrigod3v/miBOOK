"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Database,
  MoreHorizontal,
  Star,
  Trash2,
  ArrowRightToLine,
  CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useApp, type TreeNode } from "@/lib/app-context";
import type { ViewItem } from "@/lib/client-api";

function PageIcon({ v }: { v: ViewItem }) {
  return v.icon ? (
    <span className="mr-1.5 text-sm leading-none">{v.icon}</span>
  ) : v.layout === "database" ? (
    <Database className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
  ) : (
    <FileText className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
  );
}

import { motion, AnimatePresence } from "framer-motion";

function TreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeWs, patchView, createPage, deleteView } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const [moving, setMoving] = useState(false);
  const hasChildren = node.children.length > 0;
  const active = pathname.endsWith(`/view/${node.id}`);
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate() {
    if (node.trashedAt) return;
    router.push(`/app/workspace/${activeWs!.id}/view/${node.id}`);
  }

  async function rename() {
    const n = name.trim();
    if (!n || n === node.name) {
      setEditing(false);
      return;
    }
    await patchView(node.id, { name: n });
    setEditing(false);
  }

  async function doTrash() {
    await patchView(node.id, { trash: true });
    toast.success("Movido para a lixeira");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className={`group flex items-center gap-0.5 rounded-md px-2 py-1 text-[13px] transition-colors ${
          active
            ? "bg-accent font-medium text-accent-foreground shadow-xs"
            : "text-foreground/80 hover:bg-accent/60"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={navigate}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent ${
            hasChildren ? "" : "invisible"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <PageIcon v={node} />
        {editing ? (
          <input
            autoFocus
            className="min-w-0 flex-1 rounded border bg-transparent px-1 text-[13px] outline-none ring-1 ring-ring"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{node.name || "Sem título"}</span>
        )}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={async () => {
                const child = await createPage(node.id);
                router.push(`/app/workspace/${activeWs!.id}/view/${child.id}`);
              }}
            >
              <CornerDownRight className="mr-2 h-4 w-4" />
              Nova subpágina
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => patchView(node.id, { favorite: !node.isFavorite })}
            >
              <Star className="mr-2 h-4 w-4" />
              {node.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMoving(true)}>
              <ArrowRightToLine className="mr-2 h-4 w-4" />
              Mover…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={doTrash} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {moving && (
        <MoveDialog viewId={node.id} currentParent={node.parentId} onClose={() => setMoving(false)} />
      )}
      <AnimatePresence>
        {hasChildren && open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children.map((c) => (
              <TreeNode key={c.id} node={c} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MoveDialog({
  viewId,
  currentParent,
  onClose,
}: {
  viewId: string;
  currentParent: string | null;
  onClose: () => void;
}) {
  const { tree, patchView } = useApp();
  const [target, setTarget] = useState<string>(currentParent || "__root__");
  const [pending, setPending] = useState(false);

  const flat: { id: string; name: string; icon: string }[] = [];
  const walk = (nodes: TreeNode[], depth: number) => {
    nodes.forEach((n) => {
      if (n.id !== viewId) {
        flat.push({ id: n.id, name: `${"  ".repeat(depth)}${n.icon} ${n.name || "Sem título"}`, icon: n.icon });
        walk(n.children, depth + 1);
      }
    });
  };
  walk(tree, 0);

  async function save() {
    setPending(true);
    await patchView(viewId, { parentId: target === "__root__" ? null : target });
    toast.success("Página movida");
    onClose();
    setPending(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-lg border bg-popover p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-sm font-medium">Mover página para</h3>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="__root__">🌱 Nível raiz</option>
          {flat.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            Mover
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PageTree() {
  const { tree, activeWs } = useApp();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  if (!tree.length) {
    return (
      <div className="px-3 py-2">
        <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          Nenhuma página ainda.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((n) => (
        <TreeNode key={n.id} node={n} depth={0} />
      ))}
    </div>
  );
}

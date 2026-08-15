"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { http, type AuthUser, type Workspace, type ViewItem } from "./client-api";

interface AppContextValue {
  user: AuthUser;
  workspaces: Workspace[];
  setWorkspaces: (w: Workspace[]) => void;
  activeWs: Workspace | null;
  activeWsId: string | null;
  views: ViewItem[];
  setViews: (v: ViewItem[]) => void;
  refreshViews: () => Promise<void>;
  tree: TreeNode[];
  favorites: TreeNode[];
  trash: ViewItem[];
  createPage: (parentId: string | null, layout?: "document" | "database") => Promise<ViewItem>;
  patchView: (id: string, patch: Record<string, unknown>) => Promise<void>;
  deleteView: (id: string) => Promise<void>;
}

export type TreeNode = ViewItem & { children: TreeNode[] };

const AppContext = createContext<AppContextValue | null>(null);

export function buildTree(views: ViewItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  views.forEach((v) => map.set(v.id, { ...v, children: [] }));
  const roots: TreeNode[] = [];
  views
    .filter((v) => !v.trashedAt)
    .sort((a, b) => a.position - b.position)
    .forEach((v) => {
      const node = map.get(v.id)!;
      if (v.parentId && map.has(v.parentId) && !map.get(v.parentId)!.trashedAt) {
        map.get(v.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
  return roots;
}

export function AppProvider({
  children,
  user,
  workspaces: initialWorkspaces,
}: {
  children: ReactNode;
  user: AuthUser;
  workspaces: Workspace[];
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [views, setViews] = useState<ViewItem[]>([]);
  const pathname = usePathname();
  const wsMatch = pathname.match(/\/app\/workspace\/([^/]+)/);
  const activeWsId = wsMatch?.[1] ?? null;

  const activeWs = useMemo(
    () => workspaces.find((w) => w.id === activeWsId) || null,
    [workspaces, activeWsId],
  );

  const refreshViews = useCallback(async () => {
    if (!activeWsId) return;
    try {
      const data = await http.get<ViewItem[]>(`/api/workspaces/${activeWsId}/views`);
      setViews(data);
    } catch {
      /* ignore */
    }
  }, [activeWsId]);

  useEffect(() => {
    refreshViews();
  }, [refreshViews]);

  const createPage = useCallback(
    async (parentId: string | null, layout: "document" | "database" = "document") => {
      if (!activeWsId) throw new Error("Sem workspace ativo");
      const v = await http.post<ViewItem>(`/api/workspaces/${activeWsId}/views`, {
        parentId,
        layout,
        name: layout === "database" ? "Banco de dados" : "Sem título",
        icon: layout === "database" ? "🗃️" : "📄",
      });
      setViews((prev) => [...prev, v]);
      return v;
    },
    [activeWsId],
  );

  const patchView = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      if (!activeWsId) return;
      const updated = await http.patch<ViewItem>(
        `/api/workspaces/${activeWsId}/views/${id}`,
        patch,
      );
      setViews((prev) => prev.map((v) => (v.id === id ? updated : v)));
    },
    [activeWsId],
  );

  const deleteView = useCallback(
    async (id: string) => {
      if (!activeWsId) return;
      await http.del(`/api/workspaces/${activeWsId}/views/${id}`);
      setViews((prev) => prev.filter((v) => v.id !== id));
    },
    [activeWsId],
  );

  const tree = useMemo(() => buildTree(views), [views]);
  const favorites = useMemo(
    () =>
      tree
        .flatMap((n) => [n, ...flatten(n)])
        .filter((v) => v.isFavorite),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [views],
  );
  const trash = useMemo(() => views.filter((v) => v.trashedAt), [views]);
  return (
    <AppContext.Provider
      value={{
        user,
        workspaces,
        setWorkspaces,
        activeWs,
        activeWsId,
        views,
        setViews,
        refreshViews,
        tree,
        favorites,
        trash,
        createPage,
        patchView,
        deleteView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function flatten(node: TreeNode): TreeNode[] {
  return node.children.flatMap((c) => [c, ...flatten(c)]);
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}

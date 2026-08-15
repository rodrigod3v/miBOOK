"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Plus, FileText, Database, Search, Trash2, Users, Settings, Star, Wifi, WifiOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";
import { PageTree } from "@/components/sidebar/page-tree";
import { MembersDialog } from "@/components/dialogs/members-dialog";
import { SettingsDialog } from "@/components/dialogs/settings-dialog";
import { TrashDialog } from "@/components/dialogs/trash-dialog";
import { SearchDialog } from "@/components/dialogs/search-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { SocketProvider, useSocket } from "@/lib/use-socket";
import { useApp } from "@/lib/app-context";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function PresenceAvatars({ viewId }: { viewId: string | null }) {
  const { presence } = useSocket();
  const users = viewId ? (presence[viewId] || []).filter((u) => u.userId !== "?") : [];
  if (users.length === 0) return null;
  const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {users.slice(0, 4).map((u) => (
          <TooltipProvider key={u.userId}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-[11px] font-medium text-primary-foreground">
                    {initials(u.name || "?")}
                  </div>
                }
              />
              <TooltipContent>{u.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {users.length > 4 && (
        <span className="ml-1 text-xs text-muted-foreground">+{users.length - 4}</span>
      )}
    </div>
  );
}

function ConnectionDot() {
  const { connected } = useSocket();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="flex h-8 w-8 items-center justify-center">
              {connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          }
        />
        <TooltipContent>
          {connected ? "Tempo real conectado" : "Tempo real desconectado"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Topbar() {
  const pathname = usePathname();
  const viewId = pathname.match(/\/view\/([^/]+)/)?.[1] || null;
  const { views, activeWs, user } = useApp();
  const current = views.find((v) => v.id === viewId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {current?.icon && <span className="text-base">{current.icon}</span>}
        <span className="truncate text-sm font-medium">{current?.name || activeWs?.name}</span>
      </div>
      <ConnectionDot />
      <PresenceAvatars viewId={viewId} />
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setSearchOpen(true)}>
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMembersOpen(true)}>
        <Users className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>
      <ThemeToggle />
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onOpenMembers={() => setMembersOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTrash={() => setTrashOpen(true)}
      />
      <MembersDialog open={membersOpen} onOpenChange={setMembersOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
    </header>
  );
}

function Sidebar() {
  const { activeWs, createPage, user } = useApp();
  const router = useRouter();
  const [trashOpen, setTrashOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-2">
        <WorkspaceSwitcher />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        <Section label="Favoritos">
          <FavoritesList />
        </Section>
        <Section label="Páginas">
          <div className="mb-1 flex items-center justify-between px-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={async () => {
                    const v = await createPage(null, "document");
                    router.push(`/app/workspace/${activeWs!.id}/view/${v.id}`);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" /> Nova página
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const v = await createPage(null, "database");
                    router.push(`/app/workspace/${activeWs!.id}/view/${v.id}`);
                  }}
                >
                  <Database className="mr-2 h-4 w-4" /> Novo banco de dados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <PageTree />
        </Section>
      </div>
      <div className="border-t p-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-muted-foreground" onClick={() => setTrashOpen(true)}>
            <Trash2 className="h-4 w-4" /> Lixeira
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-muted-foreground" onClick={() => setMembersOpen(true)}>
            <Users className="h-4 w-4" /> Membros
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {(user.name || user.email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{user.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </div>
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
      <MembersDialog open={membersOpen} onOpenChange={setMembersOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}

function FavoritesList() {
  const { favorites, activeWs } = useApp();
  const router = useRouter();
  if (favorites.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {favorites.map((f) => (
        <button
          key={f.id}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[13px] text-foreground/80 hover:bg-accent/60"
          onClick={() => router.push(`/app/workspace/${activeWs!.id}/view/${f.id}`)}
        >
          <span className="text-sm leading-none">{f.icon || "📄"}</span>
          <span className="min-w-0 flex-1 truncate text-left">{f.name || "Sem título"}</span>
          <Star className="h-3 w-3 text-amber-400" />
        </button>
      ))}
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function EmptyWorkspace() {
  const { activeWs, createPage } = useApp();
  const router = useRouter();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="text-5xl">{activeWs?.icon || "📚"}</div>
      <h2 className="text-xl font-semibold">{activeWs?.name}</h2>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Crie sua primeira página para começar a documentar, ou um banco de dados para organizar suas tarefas.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={async () => {
            const v = await createPage(null, "document");
            router.push(`/app/workspace/${activeWs!.id}/view/${v.id}`);
          }}
        >
          <FileText className="mr-2 h-4 w-4" /> Nova página
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const v = await createPage(null, "database");
            router.push(`/app/workspace/${activeWs!.id}/view/${v.id}`);
          }}
        >
          <Database className="mr-2 h-4 w-4" /> Banco de dados
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, activeWs } = useApp();

  const wsFromPath = pathname.match(/\/app\/workspace\/([^/]+)/)?.[1] ?? null;
  const isEmptyPath = /\/app\/workspace\/[^/]+\/?$/.test(pathname);
  const inWorkspace = !!wsFromPath;

  return (
    <div className="flex h-screen overflow-hidden">
      {inWorkspace && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        {inWorkspace ? (
          <SocketProvider user={user} workspaceId={wsFromPath || ""}>
            <Topbar />
            <main className="min-h-0 flex-1 overflow-y-auto">
              {isEmptyPath ? <EmptyWorkspace /> : children}
            </main>
          </SocketProvider>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        )}
      </div>
    </div>
  );
}

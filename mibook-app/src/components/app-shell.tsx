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
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#424754]/30 bg-[#051424]/80 backdrop-blur-md px-6 z-50">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {current?.icon ? (
          <span className="text-xl">{current.icon}</span>
        ) : (
          <span className="material-symbols-outlined text-primary text-xl">dataset</span>
        )}
        <div className="flex flex-col">
          <span className="truncate text-sm font-bold text-[#d4e4fa] tracking-tight">{current?.name || activeWs?.name}</span>
          <span className="text-[11px] text-[#c2c6d6] font-mono">Enterprise Command</span>
        </div>
      </div>
      <ConnectionDot />
      <PresenceAvatars viewId={viewId} />
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-[#c2c6d6] border-[#424754]/50 bg-[#1c2b3c]/60 hover:bg-[#273647] hover:text-[#d4e4fa]"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border border-[#424754] bg-[#0d1c2d] px-1.5 text-[10px] sm:inline text-primary">
          Ctrl K
        </kbd>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#c2c6d6] hover:text-primary" onClick={() => setMembersOpen(true)}>
        <Users className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#c2c6d6] hover:text-primary" onClick={() => setSettingsOpen(true)}>
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
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-[#424754]/20 bg-[#122131] text-[#d4e4fa] backdrop-blur-xl">
      <div className="p-3 border-b border-[#424754]/20">
        <WorkspaceSwitcher />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-3">
        <Section label="Favoritos">
          <FavoritesList />
        </Section>
        <Section label="Páginas">
          <div className="mb-2 flex items-center justify-between px-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold text-primary hover:bg-[#1c2b3c]">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Nova
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
                  <FileText className="mr-2 h-4 w-4 text-blue-400" /> Nova página
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const v = await createPage(null, "database");
                    router.push(`/app/workspace/${activeWs!.id}/view/${v.id}`);
                  }}
                >
                  <Database className="mr-2 h-4 w-4 text-indigo-400" /> Novo banco de dados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <PageTree />
        </Section>
      </div>
      <div className="border-t border-[#424754]/20 p-3 bg-[#0d1c2d]/50">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-xs text-[#c2c6d6] hover:text-[#d4e4fa]" onClick={() => setTrashOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Lixeira
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-xs text-[#c2c6d6] hover:text-[#d4e4fa]" onClick={() => setMembersOpen(true)}>
            <Users className="h-3.5 w-3.5" /> Membros
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c2c6d6] hover:text-[#d4e4fa]" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-[#424754]/30 bg-[#1c2b3c]/50 p-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#005ac2] text-xs font-bold text-white shadow-sm">
            {(user.name || user.email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#d4e4fa]">{user.name}</div>
            <div className="truncate text-[11px] text-[#c2c6d6]">{user.email}</div>
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

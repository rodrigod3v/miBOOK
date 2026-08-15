"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, User, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { http, type Member, type Invite } from "@/lib/client-api";

export function MembersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { activeWs, user } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!activeWs || !open) return;
    const data = await http.get<{ members: Member[]; pendingInvites: Invite[] }>(
      `/api/workspaces/${activeWs.id}/members`,
    );
    setMembers(data.members);
    setInvites(data.pendingInvites);
  }

  useEffect(() => {
    load();
  }, [activeWs, open]);

  const me = members.find((m) => m.userId === user.id);
  const isOwner = me?.role === "owner";

  async function invite() {
    if (!activeWs) return;
    setLoading(true);
    try {
      const res = await http.post<{ accepted?: boolean }>(`/api/workspaces/${activeWs.id}/members`, {
        email,
        role,
      });
      toast.success(res.accepted ? "Usuário adicionado" : "Convite criado (usuário entrará ao se cadastrar)");
      setEmail("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId: string, newRole: string) {
    if (!activeWs) return;
    await http.patch(`/api/workspaces/${activeWs.id}/members`, { userId, role: newRole });
    load();
  }

  async function removeMember(userId: string) {
    if (!activeWs) return;
    await http.del(`/api/workspaces/${activeWs.id}/members`, { userId });
    load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Membros</DialogTitle>
          <DialogDescription>
            Convide pessoas sem limites. Basta o email — se ainda não tiver conta, receberá acesso ao criar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-md border p-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{(m.name || m.email)[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
              </div>
              {m.role === "owner" ? (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Crown className="h-3.5 w-3.5" /> Dono
                </span>
              ) : isOwner ? (
                <div className="flex items-center gap-1">
                  <Select value={m.role} onValueChange={(v) => v && changeRole(m.userId, v)}>
                    <SelectTrigger className="h-8 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="guest">Convidado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMember(m.userId)}>
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{m.role === "guest" ? "Convidado" : "Membro"}</span>
              )}
            </div>
          ))}
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 rounded-md border border-dashed p-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{inv.email}</div>
                <div className="text-xs text-muted-foreground">Convite pendente</div>
              </div>
            </div>
          ))}
        </div>
        {me && me.role !== "guest" && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex gap-2">
              <Input
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
              />
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="guest">Convidado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={invite} disabled={loading || !email}>
              Convidar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, KeyRound, Eye, Pencil } from "lucide-react";
import { createCollaborator, resetCollaboratorPassword } from "@/lib/users.functions";
import { PAGES, type PageKey } from "@/lib/pages";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsersPage,
});

const ROLES = ["admin", "financeiro", "comercial", "operacional"] as const;
type Role = (typeof ROLES)[number];

const ROLE_DESC: Record<Role, string> = {
  admin: "Acesso total",
  financeiro: "Vendas, gastos e webhooks",
  comercial: "Leads, contratos e vendas",
  operacional: "Visualização geral",
};

function UsersPage() {
  const qc = useQueryClient();
  const create = useServerFn(createCollaborator);
  const resetPwd = useServerFn(resetCollaboratorPassword);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "operacional" as Role });
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [resetting, setResetting] = useState(false);
  const [accessTarget, setAccessTarget] = useState<{ id: string; name: string } | null>(null);
  const [accessPages, setAccessPages] = useState<Set<PageKey>>(new Set());
  const [accessUseDefaults, setAccessUseDefaults] = useState(true);
  const [savingAccess, setSavingAccess] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const doEditName = async () => {
    if (!editTarget || !editName.trim()) return toast.error("Nome obrigatório.");
    setSavingName(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: editName.trim() }).eq("id", editTarget.id);
      if (error) throw error;
      toast.success("Nome atualizado");
      setEditTarget(null);
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
    } finally {
      setSavingName(false);
    }
  };

  const doReset = async () => {
    if (!resetTarget || newPwd.length < 8) return toast.error("Senha mínima de 8 caracteres.");
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada.");
      await resetPwd({ data: { user_id: resetTarget.id, password: newPwd }, headers: { Authorization: `Bearer ${session.access_token}` } });
      toast.success(`Senha redefinida para ${resetTarget.name}`);
      setResetTarget(null);
      setNewPwd("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao redefinir senha");
    } finally {
      setResetting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role),
      }));
    },
  });

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) return toast.error(error.message);
    toast.success("Permissão adicionada");
    qc.invalidateQueries({ queryKey: ["users-with-roles"] });
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users-with-roles"] });
  };

  const openAccess = async (userId: string, name: string) => {
    const { data } = await supabase.from("user_page_access").select("page").eq("user_id", userId);
    const pages = new Set<PageKey>((data ?? []).map((r) => r.page as PageKey));
    setAccessUseDefaults(pages.size === 0);
    setAccessPages(pages);
    setAccessTarget({ id: userId, name });
  };

  const togglePage = (key: PageKey) => {
    setAccessPages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const saveAccess = async () => {
    if (!accessTarget) return;
    setSavingAccess(true);
    try {
      await supabase.from("user_page_access").delete().eq("user_id", accessTarget.id);
      if (!accessUseDefaults && accessPages.size > 0) {
        const rows = Array.from(accessPages).map((page) => ({ user_id: accessTarget.id, page }));
        const { error } = await supabase.from("user_page_access").insert(rows);
        if (error) throw error;
      }
      toast.success("Visualização atualizada");
      setAccessTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSavingAccess(false);
    }
  };

  const submit = async () => {
    if (!form.full_name || !form.email || form.password.length < 8) {
      return toast.error("Preencha nome, e-mail e uma senha com mínimo 8 caracteres.");
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");
      await create({ data: form, headers: { Authorization: `Bearer ${session.access_token}` } });
      toast.success("Colaborador criado");
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "operacional" });
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar colaborador");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        description="Cadastre membros do time e gerencie permissões"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm">
                <UserPlus className="h-4 w-4 mr-2" /> Novo colaborador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar colaborador</DialogTitle>
                <DialogDescription>O colaborador poderá acessar o sistema com o e-mail e senha definidos abaixo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha temporária * <span className="text-xs text-muted-foreground">(mín. 8 caracteres)</span></Label>
                  <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Defina uma senha forte" />
                </div>
                <div className="space-y-1.5">
                  <Label>Permissão *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          <span className="capitalize font-medium">{r}</span>
                          <span className="text-muted-foreground ml-2 text-xs">— {ROLE_DESC[r]}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>{saving ? "Criando…" : "Criar colaborador"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Equipe ({data?.length ?? 0})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead className="w-48">Adicionar</TableHead>
              <TableHead className="w-64 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {(data ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? "-"}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 && <span className="text-muted-foreground text-xs">Sem permissões</span>}
                    {u.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="cursor-pointer capitalize" onClick={() => removeRole(u.id, r)} title="Clique para remover">
                        {r} ✕
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Select onValueChange={(v) => addRole(u.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="+ Adicionar papel" /></SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                        <SelectItem key={r} value={r}><span className="capitalize">{r}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setEditTarget({ id: u.id, name: u.full_name ?? "" }); setEditName(u.full_name ?? ""); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAccess(u.id, u.full_name ?? u.email ?? "")}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Visualização
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setResetTarget({ id: u.id, name: u.full_name ?? u.email ?? "" }); setNewPwd(""); }}>
                      <KeyRound className="h-3.5 w-3.5 mr-1" /> Senha
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Defina uma nova senha para <strong>{resetTarget?.name}</strong>. Compartilhe com o colaborador para que ele entre.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nova senha (mín. 8 caracteres)</Label>
            <Input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Ex.: Aplix@2026" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={doReset} disabled={resetting}>{resetting ? "Salvando…" : "Redefinir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accessTarget} onOpenChange={(o) => !o && setAccessTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visualização de páginas</DialogTitle>
            <DialogDescription>
              Escolha quais páginas <strong>{accessTarget?.name}</strong> pode visualizar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm rounded-md border p-2.5 cursor-pointer hover:bg-accent/50">
              <Checkbox checked={accessUseDefaults} onCheckedChange={(v) => setAccessUseDefaults(!!v)} />
              <span>Usar permissões padrão do papel (sem restrição manual)</span>
            </label>
            <div className={`grid grid-cols-2 gap-2 ${accessUseDefaults ? "opacity-50 pointer-events-none" : ""}`}>
              {PAGES.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm rounded-md border p-2.5 cursor-pointer hover:bg-accent/50">
                  <Checkbox checked={accessPages.has(p.key)} onCheckedChange={() => togglePage(p.key)} />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Administradores sempre veem tudo. Marcar páginas aqui sobrescreve as permissões padrão do papel deste colaborador.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessTarget(null)}>Cancelar</Button>
            <Button onClick={saveAccess} disabled={savingAccess}>{savingAccess ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome</DialogTitle>
            <DialogDescription>Atualize o nome do colaborador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={doEditName} disabled={savingName}>{savingName ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

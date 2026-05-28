import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/mentorados")({
  component: MentoradosPage,
});

const STATUSES = [
  { v: "ativo", l: "Ativo", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { v: "pendente", l: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { v: "reembolso", l: "Reembolso", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { v: "encerrado", l: "Encerrado", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { v: "cancelado", l: "Cancelado", color: "bg-rose-100 text-rose-700 border-rose-200" },
];

type FormState = {
  name: string; email: string; phone: string; product: string; plan: string;
  payment_method: string; purchase_date: string; start_date: string; expiration_date: string;
  status: string; onboarding_done: boolean; added_to_course: boolean; added_to_group: boolean;
  checklist_done: boolean; individual_meetings: string; meeting_1_date: string; meeting_2_date: string;
  plaquinha: boolean; kit_brinde: boolean; renewed: boolean; responsible: string; notes: string;
};

const emptyForm = (): FormState => ({
  name: "", email: "", phone: "", product: "", plan: "", payment_method: "",
  purchase_date: "", start_date: "", expiration_date: "",
  status: "ativo", onboarding_done: false, added_to_course: false, added_to_group: false,
  checklist_done: false, individual_meetings: "", meeting_1_date: "", meeting_2_date: "",
  plaquinha: false, kit_brinde: false, renewed: false, responsible: "", notes: "",
});

function MentoradosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ["mentorados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorados")
        .select("*")
        .order("purchase_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const products = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((m: any) => { if (m.product) set.add(m.product); });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((m: any) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (productFilter !== "all" && m.product !== productFilter) return false;
      if (!q) return true;
      return [m.name, m.email, m.phone, m.product, m.responsible]
        .some(v => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [data, search, statusFilter, productFilter]);

  // Reset to first page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, productFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const today = new Date(); today.setHours(0,0,0,0);
    const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
    const ativos = list.filter((m: any) => m.status === "ativo").length;
    const expirando = list.filter((m: any) => {
      if (m.status !== "ativo" || !m.expiration_date) return false;
      const exp = new Date(m.expiration_date);
      return exp >= today && exp <= in30;
    }).length;
    const expirados = list.filter((m: any) => {
      if (!m.expiration_date) return false;
      return new Date(m.expiration_date) < today && m.status === "ativo";
    }).length;
    return { total: list.length, ativos, expirando, expirados };
  }, [data]);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      name: m.name ?? "", email: m.email ?? "", phone: m.phone ?? "",
      product: m.product ?? "", plan: m.plan ?? "", payment_method: m.payment_method ?? "",
      purchase_date: m.purchase_date ?? "", start_date: m.start_date ?? "", expiration_date: m.expiration_date ?? "",
      status: m.status ?? "ativo",
      onboarding_done: !!m.onboarding_done, added_to_course: !!m.added_to_course,
      added_to_group: !!m.added_to_group, checklist_done: !!m.checklist_done,
      individual_meetings: m.individual_meetings ?? "",
      meeting_1_date: m.meeting_1_date ?? "", meeting_2_date: m.meeting_2_date ?? "",
      plaquinha: !!m.plaquinha, kit_brinde: !!m.kit_brinde, renewed: !!m.renewed,
      responsible: m.responsible ?? "", notes: m.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name) return toast.error("Nome é obrigatório");
    const payload: any = {
      name: form.name,
      status: form.status,
      email: form.email || null, phone: form.phone || null,
      product: form.product || null, plan: form.plan || null,
      payment_method: form.payment_method || null,
      purchase_date: form.purchase_date || null,
      start_date: form.start_date || null,
      expiration_date: form.expiration_date || null,
      onboarding_done: form.onboarding_done, added_to_course: form.added_to_course,
      added_to_group: form.added_to_group, checklist_done: form.checklist_done,
      individual_meetings: form.individual_meetings || null,
      meeting_1_date: form.meeting_1_date || null, meeting_2_date: form.meeting_2_date || null,
      plaquinha: form.plaquinha, kit_brinde: form.kit_brinde, renewed: form.renewed,
      responsible: form.responsible || null, notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await supabase.from("mentorados").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Mentorado atualizado");
    } else {
      const { error } = await supabase.from("mentorados").insert({ ...payload, created_by: user?.id ?? null });
      if (error) return toast.error(error.message);
      toast.success("Mentorado cadastrado");
    }
    setOpen(false); setEditingId(null); setForm(emptyForm());
    qc.invalidateQueries({ queryKey: ["mentorados"] });
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("mentorados").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["mentorados"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("mentorados").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mentorado removido");
    qc.invalidateQueries({ queryKey: ["mentorados"] });
  };

  const daysToExpire = (d: string | null) => {
    if (!d) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const exp = new Date(d);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      <PageHeader
        title="Mentorados"
        description="Cadastro e gestão dos clientes de mentoria"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo mentorado</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ativos</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.ativos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Expirando em 30d</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{stats.expirando}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Expirados</div>
          <div className="text-2xl font-bold mt-1 text-rose-600">{stats.expirados}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Produto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar mentorado" : "Novo mentorado"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>Produto</Label><Input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="Mentoria 10X..." /></div>
            <div className="space-y-1"><Label>Plano</Label>
              <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                <SelectContent>
                  {["3 meses", "6 meses", "1 ano"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a plataforma" /></SelectTrigger>
                <SelectContent>
                  {["GREEN", "PIX", "TMB", "HOTMART", "KIWIFY", "PAGAR ME", "PIX PARCELADO", "CHEQUE", "GREEN, PIX", "PIX, TMB", "TMB, PIX"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Data compra</Label><Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Início</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Expiração</Label><Input type="date" value={form.expiration_date} onChange={e => setForm({ ...form, expiration_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Responsável</Label><Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            <div className="space-y-1"><Label>Encontros individuais</Label><Input value={form.individual_meetings} onChange={e => setForm({ ...form, individual_meetings: e.target.value })} placeholder="Nenhum, 1 encontro..." /></div>
            <div className="space-y-1"><Label>Encontro 1</Label><Input type="date" value={form.meeting_1_date} onChange={e => setForm({ ...form, meeting_1_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Encontro 2</Label><Input type="date" value={form.meeting_2_date} onChange={e => setForm({ ...form, meeting_2_date: e.target.value })} /></div>

            <div className="col-span-2 mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.onboarding_done} onCheckedChange={v => setForm({ ...form, onboarding_done: !!v })} /> Onboarding</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.added_to_course} onCheckedChange={v => setForm({ ...form, added_to_course: !!v })} /> Add curso</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.added_to_group} onCheckedChange={v => setForm({ ...form, added_to_group: !!v })} /> Add grupo</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.checklist_done} onCheckedChange={v => setForm({ ...form, checklist_done: !!v })} /> Checklist</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.plaquinha} onCheckedChange={v => setForm({ ...form, plaquinha: !!v })} /> Plaquinha</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.kit_brinde} onCheckedChange={v => setForm({ ...form, kit_brinde: !!v })} /> Kit brinde</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.renewed} onCheckedChange={v => setForm({ ...form, renewed: !!v })} /> Renovado</label>
            </div>

            <div className="col-span-2 space-y-1"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>{editingId ? "Salvar alterações" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Produto / Plano</TableHead>
              <TableHead>Compra</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Checklist</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum mentorado encontrado</TableCell></TableRow>}
              {paginated.map((m: any) => {
                const dte = daysToExpire(m.expiration_date);
                const expWarn = m.status === "ativo" && dte !== null && dte <= 30 && dte >= 0;
                const expBad = m.status === "ativo" && dte !== null && dte < 0;
                const status = STATUSES.find(s => s.v === m.status);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.name}
                      {m.responsible && <div className="text-xs text-muted-foreground">Resp: {m.responsible}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.email && <div>{m.email}</div>}
                      {m.phone && <div>{m.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{m.product ?? "-"}</div>
                      {m.plan && <div className="text-xs text-muted-foreground">{m.plan}</div>}
                      {m.payment_method && <Badge variant="secondary" className="mt-1 text-[10px]">{m.payment_method}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(m.purchase_date)}</TableCell>
                    <TableCell className="text-sm">
                      <div className={expBad ? "text-rose-600 font-medium" : expWarn ? "text-amber-600 font-medium" : ""}>
                        {fmtDate(m.expiration_date)}
                      </div>
                      {expBad && <div className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Expirado</div>}
                      {expWarn && <div className="text-xs text-amber-600">{dte}d restantes</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.onboarding_done && <span title="Onboarding" className="text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /></span>}
                        {m.added_to_course && <Badge variant="outline" className="text-[10px] px-1.5 py-0">curso</Badge>}
                        {m.added_to_group && <Badge variant="outline" className="text-[10px] px-1.5 py-0">grupo</Badge>}
                        {m.checklist_done && <Badge variant="outline" className="text-[10px] px-1.5 py-0">check</Badge>}
                        {m.plaquinha && <Badge variant="outline" className="text-[10px] px-1.5 py-0">plaq</Badge>}
                        {m.kit_brinde && <Badge variant="outline" className="text-[10px] px-1.5 py-0">kit</Badge>}
                        {m.renewed && <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600">renovou</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={m.status} onValueChange={(v) => updateStatus(m.id, v)}>
                        <SelectTrigger className={`w-36 h-8 text-xs border ${status?.color ?? ""}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" title="Remover">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover {m.name}?</AlertDialogTitle>
                              <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(m.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t">
          <div className="text-xs text-muted-foreground">
            {filtered.length === 0 ? "0 resultados" : (
              <>Mostrando <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-medium">{Math.min(currentPage * pageSize, filtered.length)}</span> de <span className="font-medium">{filtered.length}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / página</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
            <span className="text-xs text-muted-foreground px-1">Página {currentPage} de {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

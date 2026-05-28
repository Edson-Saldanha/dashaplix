import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarRange } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/leads")({
  component: LeadsPage,
});

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

type RangePreset = "day" | "week" | "30d" | "all" | "custom";


const STATUSES = [
  { v: "novo", l: "Novo" },
  { v: "em_atendimento", l: "Em atendimento" },
  { v: "qualificado", l: "Qualificado" },
  { v: "reuniao_marcada", l: "Reunião marcada" },
  { v: "proposta_enviada", l: "Proposta enviada" },
  { v: "contrato_fechado", l: "Contrato fechado" },
  { v: "perdido", l: "Perdido" },
  { v: "sem_resposta", l: "Sem resposta" },
];

const emptyForm = () => ({
  name: "", email: "", phone: "", company: "", source: "", product_interest: "",
  current_revenue: "", main_difficulty: "", responsible: "", status: "novo", notes: "",
});

function LeadsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [preset, setPreset] = useState<RangePreset>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>({ from: startOfDay(), to: new Date() });

  const range = useMemo(() => {
    const now = new Date();
    if (preset === "day") return { from: startOfDay(now), to: endOfDay(now), label: "Hoje" };
    if (preset === "week") return { from: startOfDay(addDays(now, -6)), to: endOfDay(now), label: "Últimos 7 dias" };
    if (preset === "30d") return { from: startOfDay(addDays(now, -29)), to: endOfDay(now), label: "Últimos 30 dias" };
    if (preset === "all") return { from: null as Date | null, to: null as Date | null, label: "Todos" };
    const f = customRange?.from ? startOfDay(customRange.from) : startOfDay(now);
    const t = customRange?.to ? endOfDay(customRange.to) : endOfDay(customRange?.from ?? now);
    return { from: f, to: t, label: `${fmtDate(f)} – ${fmtDate(t)}` };
  }, [preset, customRange]);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", preset, range.from?.toISOString() ?? "all", range.to?.toISOString() ?? "all"],
    queryFn: async () => {
      let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (range.from && range.to) {
        q = q.gte("created_at", range.from.toISOString()).lte("created_at", range.to.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const FilterBtn = ({ value, children }: { value: RangePreset; children: React.ReactNode }) => (
    <button
      onClick={() => setPreset(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        preset === value ? "bg-[#0c2340] text-white shadow-sm" : "text-slate-500 hover:text-[#0c2340]"
      }`}
    >
      {children}
    </button>
  );


  const openNew = () => { setEditingId(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (l: any) => {
    setEditingId(l.id);
    setForm({
      name: l.name ?? "", email: l.email ?? "", phone: l.phone ?? "", company: l.company ?? "",
      source: l.source ?? "", product_interest: l.product_interest ?? "",
      current_revenue: l.current_revenue ?? "", main_difficulty: l.main_difficulty ?? "",
      responsible: l.responsible ?? "", status: l.status ?? "novo", notes: l.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name) return toast.error("Nome é obrigatório");
    const payload = {
      name: form.name,
      status: form.status as any,
      email: form.email || null, phone: form.phone || null, company: form.company || null,
      source: form.source || null, product_interest: form.product_interest || null,
      current_revenue: form.current_revenue || null, main_difficulty: form.main_difficulty || null,
      responsible: form.responsible || null, notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Lead atualizado");
    } else {
      const { error } = await supabase.from("leads").insert({ ...payload, created_by: user?.id ?? null });
      if (error) return toast.error(error.message);
      toast.success("Lead cadastrado");
    }
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const removeLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lead removido");
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  return (
    <div>
      <PageHeader title="Leads" description="Cadastro e acompanhamento de leads comerciais" actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <FilterBtn value="day">Hoje</FilterBtn>
            <FilterBtn value="week">Semana</FilterBtn>
            <FilterBtn value="30d">30 dias</FilterBtn>
            <FilterBtn value="all">Todos</FilterBtn>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  onClick={() => setPreset("custom")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                    preset === "custom" ? "bg-[#0c2340] text-white shadow-sm" : "text-slate-500 hover:text-[#0c2340]"
                  }`}
                >
                  <CalendarRange className="h-3 w-3" /> Personalizado
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-slate-200" align="end">
                <Calendar
                  mode="range"
                  numberOfMonths={1}
                  selected={customRange}
                  onSelect={(r) => { setCustomRange(r); setPreset("custom"); }}
                  defaultMonth={customRange?.from}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo lead</Button>
        </div>
      } />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>Empresa</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            <div className="space-y-1"><Label>Origem</Label><Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Instagram, Google..." /></div>
            <div className="space-y-1"><Label>Produto de interesse</Label><Input value={form.product_interest} onChange={e => setForm({ ...form, product_interest: e.target.value })} /></div>
            <div className="space-y-1"><Label>Faturamento atual</Label><Input value={form.current_revenue} onChange={e => setForm({ ...form, current_revenue: e.target.value })} /></div>
            <div className="space-y-1"><Label>Responsável</Label><Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            <div className="col-span-2 space-y-1"><Label>Principal dificuldade</Label><Textarea value={form.main_difficulty} onChange={e => setForm({ ...form, main_difficulty: e.target.value })} /></div>
            <div className="space-y-1"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
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
              <TableHead>Data</TableHead><TableHead>Nome</TableHead><TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead><TableHead>Origem</TableHead><TableHead>Interesse</TableHead>
              <TableHead>Responsável</TableHead><TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum lead</TableCell></TableRow>}
              {(data ?? []).map(l => (
                <TableRow key={l.id}>
                  <TableCell>{fmtDate(l.created_at)}</TableCell>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.company ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.email}<br />{l.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{l.source ?? "-"}</Badge></TableCell>
                  <TableCell>{l.product_interest ?? "-"}</TableCell>
                  <TableCell>{l.responsible ?? "-"}</TableCell>
                  <TableCell>
                    <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Editar lead" onClick={() => openEdit(l)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Remover lead">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover lead {l.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação remove permanentemente o lead e não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeLead(l.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

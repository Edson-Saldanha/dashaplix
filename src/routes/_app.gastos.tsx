import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Receipt, TrendingDown, Calendar, Megaphone, Wallet, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/gastos")({
  component: GastosPage,
});

const CATEGORIES = [
  "Tráfego",
  "Equipe",
  "Ferramentas / Softwares",
  "Infraestrutura",
  "Conteúdo / Criativos",
  "Comissões",
  "Impostos",
  "Outros",
] as const;

const TRAFEGO_PRODUCTS = [
  "MENTORIA",
  "MESTRE CLUB",
  "ACELERA ADS",
  "LISTA DE FORNECEDOR",
  "SUA LOJA DECORADA (PREMIUM)",
  "GESTÃO",
  "ENGAJAMENTO",
] as const;

const PAYMENT_METHODS = ["Venda direta", "Impulsionamento"] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  description: "",
  category: "" as string,
  product: "" as string,
  amount: "",
  expense_date: todayISO(),
  payment_method: "Venda direta",
  responsible: "",
  
  is_recurring: false,
  notes: "",
});

function extractProduct(desc: string): string | null {
  const m = desc.match(/^Tráfego\s+—\s+([^·]+?)(?:\s+·|$)/);
  return m ? m[1].trim() : null;
}

function GastosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [productFilter, setProductFilter] = useState<string>("");

  const openEdit = (e: any) => {
    const product = extractProduct(e.description) ?? "";
    const cleanDesc = product
      ? e.description.replace(/^Tráfego\s+—\s+[^·]+(?:\s+·\s+)?/, "")
      : e.description;
    setEditingId(e.id);
    setForm({
      description: cleanDesc || "",
      category: e.category,
      product,
      amount: String(e.amount),
      expense_date: e.expense_date,
      payment_method: e.payment_method ?? "",
      responsible: e.responsible ?? "",
      
      is_recurring: e.is_recurring,
      notes: e.notes ?? "",
    });
    setOpen(true);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setEditingId(null);
      setForm(emptyForm());
    }
  };

  const removeExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gasto excluído");
    qc.invalidateQueries({ queryKey: ["expenses"] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: collaborators } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const totals = useMemo(() => {
    const today = todayISO();
    const month = today.slice(0, 7);
    const day = (data ?? []).filter((e) => e.expense_date === today).reduce((s, e) => s + Number(e.amount), 0);
    const monthTotal = (data ?? []).filter((e) => e.expense_date.startsWith(month)).reduce((s, e) => s + Number(e.amount), 0);
    const byCategory = new Map<string, number>();
    (data ?? []).filter((e) => e.expense_date.startsWith(month)).forEach((e) => {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    });
    const trafficTotal = (data ?? [])
      .filter((e) => e.expense_date.startsWith(month) && e.category === "Tráfego")
      .reduce((s, e) => s + Number(e.amount), 0);
    return { day, monthTotal, trafficTotal, byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]) };
  }, [data]);

  const productReport = useMemo(() => {
    if (!productFilter) return null;
    const today = todayISO();
    const month = today.slice(0, 7);
    const rows = (data ?? []).filter((e) => extractProduct(e.description) === productFilter);
    const total = rows.reduce((s, e) => s + Number(e.amount), 0);
    const monthTotal = rows.filter((e) => e.expense_date.startsWith(month)).reduce((s, e) => s + Number(e.amount), 0);
    const dayTotal = rows.filter((e) => e.expense_date === today).reduce((s, e) => s + Number(e.amount), 0);
    const avg = rows.length ? total / rows.length : 0;
    return { rows, total, monthTotal, dayTotal, avg, count: rows.length };
  }, [data, productFilter]);

  const filteredRows = productFilter
    ? (data ?? []).filter((e) => extractProduct(e.description) === productFilter)
    : (data ?? []);


  const isTrafego = !!form.product;
  const effectiveCategory = isTrafego ? form.product : (form.category || "Outros");

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Informe um valor válido.");

    const description = isTrafego
      ? `Tráfego — ${form.product}${form.description ? ` · ${form.description}` : ""}`
      : form.description || effectiveCategory;

    setSaving(true);
    const payload = {
      description,
      category: effectiveCategory,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      payment_method: form.payment_method || null,
      responsible: form.responsible || null,
      
      is_recurring: form.is_recurring,
      notes: form.notes || null,
    };
    const { error } = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Gasto atualizado" : "Gasto registrado");
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    qc.invalidateQueries({ queryKey: ["expenses"] });
  };

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Lançamentos da empresa por categoria"
        actions={
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar gasto" : "Novo lançamento de gasto"}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
                {/* Coluna principal: formulário */}
                <div className="space-y-4 min-w-0">
                  {/* Step 1: traffic product */}
                  <div className="space-y-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <Label className="text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Megaphone className="h-3 w-3" /> 1. Tipo de gasto
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TRAFEGO_PRODUCTS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, product: p, category: p })}
                          className={`text-xs px-3 py-2 rounded-md border font-semibold transition-all ${
                            form.product === p
                              ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                              : "bg-white hover:bg-amber-100 border-amber-200 text-amber-900"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-800/70">Se não for um gasto de tráfego, deixe em branco.</p>
                  </div>



                  {/* Step 3: value + date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-9 text-lg font-semibold h-11"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
                      <Input type="date" className="h-11" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                    </div>
                  </div>

                  {/* Optional: payment + responsible */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pagamento</Label>
                      <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Responsável</Label>
                      <Select value={form.responsible} onValueChange={(v) => setForm({ ...form, responsible: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o colaborador…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pedro">Pedro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description (optional when traffic) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {isTrafego ? "Detalhe adicional (opcional)" : "Descrição"}
                    </Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder={isTrafego ? "Ex: campanha lançamento, criativo X…" : "Descrição do gasto"}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                      <Label className="text-sm">Gasto recorrente</Label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
                    <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>

                {/* Coluna lateral: calculadora */}
                <div className="lg:sticky lg:top-0 self-start">
                  <MiniCalculator onApply={(v) => setForm((f) => ({ ...f, amount: v }))} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>{saving ? "Salvando…" : editingId ? "Salvar alterações" : "Salvar gasto"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Hoje</p>
              <p className="text-2xl font-bold mt-1">{brl(totals.day)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Mês</p>
              <p className="text-2xl font-bold mt-1">{brl(totals.monthTotal)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Tráfego (mês)</p>
              <p className="text-2xl font-bold mt-1">{brl(totals.trafficTotal)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Top categorias
          </p>
          {totals.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            totals.byCategory.slice(0, 3).map(([c, v]) => (
              <div key={c} className="flex justify-between text-xs py-0.5">
                <span className="truncate">{c}</span>
                <span className="font-semibold">{brl(v)}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Product filter */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> Filtrar por produto:
            </span>
            <button
              type="button"
              onClick={() => setProductFilter("")}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                !productFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"
              }`}
            >
              Todos
            </button>
            {TRAFEGO_PRODUCTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProductFilter(p)}
                className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                  productFilter === p
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-card hover:bg-amber-50 border-border"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Per-product report */}
      {productReport && (
        <Card className="p-5 mb-4 bg-gradient-to-br from-emerald-50 via-white to-slate-50 border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Relatório do produto</p>
              <h2 className="text-xl font-bold text-emerald-900">{productFilter}</h2>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">{productReport.count} lançamentos</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hoje</p>
              <p className="text-lg font-bold mt-1">{brl(productReport.dayTotal)}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mês atual</p>
              <p className="text-lg font-bold mt-1">{brl(productReport.monthTotal)}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total geral</p>
              <p className="text-lg font-bold mt-1 text-rose-600">{brl(productReport.total)}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket médio</p>
              <p className="text-lg font-bold mt-1">{brl(productReport.avg)}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Últimos lançamentos</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && filteredRows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">{productFilter ? `Nenhum gasto para ${productFilter}.` : "Nenhum gasto cadastrado ainda."}</TableCell></TableRow>
            )}
            {filteredRows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm">{fmtDate(e.expense_date)}</TableCell>
                <TableCell>
                  {(() => {
                    const product = extractProduct(e.description);
                    return product
                      ? <Badge className="bg-amber-500 hover:bg-amber-500">{product}</Badge>
                      : <Badge variant="secondary">{e.category}</Badge>;
                  })()}
                  {e.is_recurring && <Badge variant="outline" className="ml-2 text-[10px]">Recorrente</Badge>}
                </TableCell>
                <TableCell className="text-sm">{e.payment_method ?? "-"}</TableCell>
                <TableCell className="text-sm">{e.responsible ?? "-"}</TableCell>
                <TableCell className="text-right font-semibold text-rose-600">{brl(e.amount)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar gasto" onClick={() => openEdit(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Excluir gasto">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir gasto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso remove o lançamento "{e.description}" ({brl(e.amount)}). Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeExpense(e.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function MiniCalculator({ onApply }: { onApply: (value: string) => void }) {
  const [expr, setExpr] = useState("");
  const result = useMemo(() => {
    const e = expr.trim();
    if (!e) return null;
    if (!/^[\d+\-*/.()\s]+$/.test(e)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const r = Function(`"use strict"; return (${e})`)();
      if (typeof r !== "number" || !isFinite(r)) return null;
      return Math.round(r * 100) / 100;
    } catch {
      return null;
    }
  }, [expr]);

  const append = (s: string) => setExpr((p) => p + s);

  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-3 shadow-lg ring-1 ring-slate-700/50">
      {/* Display */}
      <div className="rounded-lg bg-slate-950/80 border border-slate-700/60 px-3 py-2 mb-2.5 shadow-inner">
        <div className="flex items-center justify-between gap-2 min-h-[16px]">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-medium">Calculadora</span>
          {result !== null && (
            <span className="text-[10px] text-emerald-400/80 font-mono">= {brl(result)}</span>
          )}
        </div>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent border-0 outline-none text-right text-xl font-mono font-semibold text-white tabular-nums placeholder:text-slate-600 p-0 h-8"
        />
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { k: "C", kind: "fn" },
          { k: "⌫", kind: "fn" },
          { k: "(", kind: "op" },
          { k: ")", kind: "op" },
          { k: "7", kind: "num" },
          { k: "8", kind: "num" },
          { k: "9", kind: "num" },
          { k: "/", kind: "op" },
          { k: "4", kind: "num" },
          { k: "5", kind: "num" },
          { k: "6", kind: "num" },
          { k: "*", kind: "op" },
          { k: "1", kind: "num" },
          { k: "2", kind: "num" },
          { k: "3", kind: "num" },
          { k: "-", kind: "op" },
          { k: "0", kind: "num" },
          { k: ".", kind: "num" },
          { k: "=", kind: "eq" },
          { k: "+", kind: "op" },
        ].map(({ k, kind }) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              if (k === "C") setExpr("");
              else if (k === "⌫") setExpr((p) => p.slice(0, -1));
              else if (k === "=") { if (result !== null) onApply(String(result)); }
              else append(k);
            }}
            className={`h-9 rounded-lg text-sm font-semibold transition-all active:scale-95 active:translate-y-px shadow-sm ${
              kind === "eq"
                ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-emerald-900/30 hover:from-emerald-300 hover:to-emerald-500"
                : kind === "op"
                ? "bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-amber-900/20 hover:from-amber-300 hover:to-amber-400"
                : kind === "fn"
                ? "bg-slate-700 text-slate-200 hover:bg-slate-600 text-xs"
                : "bg-gradient-to-b from-slate-100 to-slate-200 text-slate-900 hover:from-white hover:to-slate-100"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Apply CTA */}
      <button
        type="button"
        onClick={() => result !== null && onApply(String(result))}
        disabled={result === null}
        className="mt-2.5 w-full h-8 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white/10 text-white hover:bg-white/20 backdrop-blur border border-white/10"
      >
        {result !== null ? `↑ Usar ${brl(result)} como valor` : "Digite uma expressão"}
      </button>
    </div>
  );
}

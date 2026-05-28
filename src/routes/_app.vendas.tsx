import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { brl, fmtDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Plus, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/vendas")({
  component: VendasPage,
});

const statusColor: Record<string, string> = {
  aprovada: "bg-success/15 text-success border-success/30",
  pendente: "bg-warning/15 text-warning-foreground border-warning/30",
  recusada: "bg-destructive/15 text-destructive border-destructive/30",
  reembolsada: "bg-muted text-muted-foreground",
  chargeback: "bg-destructive/15 text-destructive border-destructive/30",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const emptyManual = () => ({
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  product_name: "",
  platform: "Kiwify",
  payment_method: "Pix",
  gross_amount: "",
  platform_fee: "",
  paid_amount: "",
  installments_count: "1",
  status: "aprovada",
  sale_date: todayISO(),
  transaction_code: "",
  traffic_source: "pago",
});

function VendasPage() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyManual());
  const [tab, setTab] = useState<"all" | "refunded">("all");
  const { user } = useAuth();

  const qc = useQueryClient();
  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const removeSale = async (id: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Venda excluída");
    qc.invalidateQueries({ queryKey: ["sales"] });
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      customer_name: s.customer_name ?? "",
      customer_email: s.customer_email ?? "",
      customer_phone: s.customer_phone ?? "",
      product_name: s.product_name ?? "",
      platform: s.platform ?? "Kiwify",
      payment_method: s.payment_method ?? "Pix",
      gross_amount: String(s.gross_amount ?? ""),
      platform_fee: String(s.platform_fee ?? ""),
      paid_amount: String(s.paid_amount ?? ""),
      installments_count: String(s.installments_count ?? "1"),
      status: s.status ?? "aprovada",
      sale_date: (s.sale_date ?? new Date().toISOString()).slice(0, 10),
      transaction_code: s.transaction_code ?? "",
      traffic_source: s.traffic_source ?? "pago",
    });
    setOpen(true);
  };

  const submitManual = async () => {
    if (!form.customer_name.trim()) return toast.error("Informe o nome do cliente.");
    if (!form.product_name.trim()) return toast.error("Informe o produto.");
    const gross = Number(form.gross_amount);
    if (!gross || gross <= 0) return toast.error("Informe um valor bruto válido.");
    const fee = Number(form.platform_fee || 0);
    setSaving(true);
    const payload = {
      customer_name: form.customer_name.trim(),
      customer_email: form.customer_email.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      product_name: form.product_name.trim(),
      platform: form.platform,
      payment_method: form.payment_method || null,
      gross_amount: gross,
      platform_fee: fee,
      net_amount: gross - fee,
      paid_amount: Math.max(0, Math.min(Number(form.paid_amount || 0), gross)),
      installments_count: Math.max(1, parseInt(form.installments_count || "1", 10) || 1),
      status: form.status as "aprovada" | "pendente" | "recusada" | "reembolsada" | "chargeback",
      sale_date: new Date(form.sale_date + "T12:00:00").toISOString(),
      transaction_code: form.transaction_code.trim() || `MANUAL-${Date.now()}`,
      traffic_source: form.traffic_source,
    };
    const { error } = editingId
      ? await supabase.from("sales").update(payload).eq("id", editingId)
      : await supabase.from("sales").insert({ ...payload, raw_payload: { source: "manual", created_by: user?.id ?? null } });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Venda atualizada" : "Venda manual registrada");
    setOpen(false);
    setEditingId(null);
    setForm(emptyManual());
    qc.invalidateQueries({ queryKey: ["sales"] });
  };

  const filtered = useMemo(() => {
    return (sales ?? []).filter((s) => {
      if (tab === "refunded") {
        if (s.status !== "reembolsada") return false;
      } else {
        if (s.status === "reembolsada") return false;
      }
      if (platform !== "all" && s.platform !== platform) return false;
      if (productFilter !== "all" && s.product_name !== productFilter) return false;
      if (status !== "all" && s.status !== status) return false;
      if (search && !`${s.customer_name} ${s.product_name}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (from && new Date(s.sale_date) < new Date(from)) return false;
      if (to && new Date(s.sale_date) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [sales, platform, productFilter, status, search, from, to, tab]);

  const platforms = useMemo(
    () => Array.from(new Set(["Kiwify", "Hotmart", "Green", "Manual", ...((sales ?? []).map((s) => s.platform).filter(Boolean) as string[])])),
    [sales],
  );
  const products = useMemo(() => {
    const base = [
      "MENTORIA",
      "MESTRE CLUB",
      "ACELERA ADS",
      "LISTA DE FORNECEDOR",
      "SUA LOJA DECORADA (PREMIUM)",
      "GESTÃO",
    ];
    const fromSales = (sales ?? []).map((s) => s.product_name).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...fromSales])).sort();
  }, [sales]);
  const countableSales = filtered.filter((r) => r.status !== "reembolsada" && r.status !== "chargeback");
  const totalGross = countableSales.reduce((s, r) => s + Number(r.gross_amount ?? 0), 0);
  const totalNet = countableSales.reduce((s, r) => s + Number(r.net_amount ?? 0), 0);
  const refundedTotal = (sales ?? [])
    .filter((s) => {
      if (s.status !== "reembolsada") return false;
      if (platform !== "all" && s.platform !== platform) return false;
      if (productFilter !== "all" && s.product_name !== productFilter) return false;
      if (search && !`${s.customer_name} ${s.product_name}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (from && new Date(s.sale_date) < new Date(from)) return false;
      if (to && new Date(s.sale_date) > new Date(to + "T23:59:59")) return false;
      return true;
    })
    .reduce((s, r) => s + Number(r.gross_amount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Vendas recebidas via Kiwify, Hotmart e integrações"
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyManual()); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Venda manual
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar venda" : "Adicionar venda manual"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cliente *</Label>
                    <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Produto *</Label>
                    <Input
                      placeholder="Digite o nome do produto"
                      value={form.product_name}
                      onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
                    <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
                    <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor bruto *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input type="number" step="0.01" className="pl-9" value={form.gross_amount} onChange={(e) => setForm({ ...form, gross_amount: e.target.value })} placeholder="0,00" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Taxa</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input type="number" step="0.01" className="pl-9" value={form.platform_fee} onChange={(e) => setForm({ ...form, platform_fee: e.target.value })} placeholder="0,00" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
                    <Input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plataforma</Label>
                    <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kiwify">Kiwify</SelectItem>
                        <SelectItem value="Hotmart">Hotmart</SelectItem>
                        <SelectItem value="Green">Green</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Forma de pgto</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aprovada">Aprovada</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="recusada">Recusada</SelectItem>
                        <SelectItem value="reembolsada">Reembolsada</SelectItem>
                        <SelectItem value="chargeback">Chargeback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor pago</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-9"
                        value={form.paid_amount}
                        onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Em aberto: <strong>{brl(Math.max(0, Number(form.gross_amount || 0) - Number(form.paid_amount || 0)))}</strong>
                      {Number(form.installments_count || 1) > 1 && Number(form.gross_amount || 0) - Number(form.paid_amount || 0) > 0 && (
                        <> · {form.installments_count}× de <strong>{brl((Number(form.gross_amount || 0) - Number(form.paid_amount || 0)) / Number(form.installments_count || 1))}</strong></>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Parcelas do saldo em aberto</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.installments_count}
                      onChange={(e) => setForm({ ...form, installments_count: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Origem do tráfego</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={form.traffic_source === "organico" ? "default" : "outline"}
                      onClick={() => setForm({ ...form, traffic_source: "organico" })}
                      className="w-full"
                    >
                      🌱 Orgânica
                    </Button>
                    <Button
                      type="button"
                      variant={form.traffic_source === "pago" ? "default" : "outline"}
                      onClick={() => setForm({ ...form, traffic_source: "pago" })}
                      className="w-full"
                    >
                      💰 Paga
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Código da transação (opcional)</Label>
                  <Input value={form.transaction_code} onChange={(e) => setForm({ ...form, transaction_code: e.target.value })} placeholder="Gerado automaticamente se vazio" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submitManual} disabled={saving}>{saving ? "Salvando…" : editingId ? "Salvar alterações" : "Salvar venda"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "refunded")} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Vendas</TabsTrigger>
          <TabsTrigger value="refunded">Reembolsadas</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input placeholder="Buscar cliente/produto" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas plataformas</SelectItem>
              {platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos produtos</SelectItem>
              {products.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="recusada">Recusada</SelectItem>
              <SelectItem value="reembolsada">Reembolsada</SelectItem>
              <SelectItem value="chargeback">Chargeback</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-6 mt-4 text-sm">
          <span className="text-muted-foreground">Total: <strong className="text-foreground">{filtered.length}</strong></span>
          <span className="text-muted-foreground">Bruto: <strong className="text-foreground">{brl(totalGross)}</strong></span>
          <span className="text-muted-foreground">Líquido: <strong className="text-foreground">{brl(totalNet)}</strong></span>
          {tab === "all" && <span className="text-muted-foreground">Reembolsado: <strong className="text-foreground">{brl(refundedTotal)}</strong></span>}
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Forma pgto</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transação</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>}
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{fmtDate(s.sale_date)}</TableCell>
                  <TableCell className="font-medium">{s.customer_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.customer_email}<br />{s.customer_phone}
                  </TableCell>
                  <TableCell>{s.product_name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.platform}</Badge></TableCell>
                  <TableCell>{s.payment_method ?? "-"}</TableCell>
                  <TableCell className="text-right">{brl(s.gross_amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{brl(s.platform_fee)}</TableCell>
                  <TableCell className="text-right font-medium">{brl(s.net_amount)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor[s.status]}>{s.status}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{s.transaction_code ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" title="Editar venda" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Excluir venda">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir venda de {s.customer_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso remove permanentemente o registro desta venda ({brl(s.gross_amount)} — {s.product_name}). Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeSale(s.id)}>Excluir</AlertDialogAction>
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

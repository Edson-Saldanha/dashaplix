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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, FileText, Copy, Trash2, Pencil, Files, Download, RotateCcw, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { OPTIONAL_CLAUSES, buildContractSections, buildSignatureBlock, type ContractData } from "@/lib/contract-template";
import { exportPDF, exportDOCX, contractToPlainText, type ContractSection, type ContractSig } from "@/lib/contract-export";

export const Route = createFileRoute("/_app/contratos")({
  component: ContractsPage,
});

const STATUS = [
  { v: "rascunho", l: "Rascunho", c: "bg-muted text-muted-foreground" },
  { v: "gerado", l: "Gerado", c: "bg-primary/15 text-primary border-primary/30" },
  { v: "enviado", l: "Enviado", c: "bg-warning/15 text-warning-foreground border-warning/30" },
  { v: "assinado", l: "Assinado", c: "bg-success/15 text-success border-success/30" },
  { v: "cancelado", l: "Cancelado", c: "bg-destructive/15 text-destructive border-destructive/30" },
];

const TIPOS = ["Gestão de Marketplace","Mentoria","Assessoria","Gestão Mercado Livre","Gestão Shopee","Gestão TikTok Shop","Gestão Amazon","Outro"];
const PLATAFORMAS = ["Shopee","Mercado Livre","TikTok Shop","Amazon","Shein","Multiplataforma","Outro"];
const PRAZOS = ["3 meses","6 meses","12 meses","Prazo indeterminado","Personalizado"];
const FIDELIDADES = ["Sem fidelidade","3 meses","6 meses","12 meses","Personalizado"];
const PAGAMENTOS = ["Pix","Boleto","Cartão de crédito","Transferência bancária","Pagamento antecipado","Parcelado"];
const SERVICOS_INC = ["Gestão de conta marketplace","Gestão de anúncios ADS","Cadastro de promoções","Criação ou otimização de anúncios","Planejamento de campanhas","Mapeamento de concorrência","Acompanhamento diário","Estratégias de crescimento","Mentoria estratégica","Reuniões de acompanhamento","Suporte por WhatsApp","Diagnóstico da loja"];
const SERVICOS_EXC = ["Atendimento ao cliente","Embalagem e envio dos produtos","Produção de fotos e vídeos","Integração com ERP","Gestão financeira da empresa","Garantia de faturamento"];
const CANAIS = ["WhatsApp","E-mail","Reunião online","Grupo de suporte","Plataforma interna","Outro"];
const CONTATOS = ["Gestor responsável","Analista de marketplace","Suporte comercial","Suporte financeiro","Mentor","Equipe de implantação","Outro"];

type FormState = ContractData & {
  id?: string;
  status: string;
  internal_notes?: string;
};

const emptyForm = (): FormState => ({
  status: "rascunho",
  contratante_name: "", contratante_doc: "", contratante_address: "",
  contratante_city: "", contratante_state: "", contratante_zip: "",
  contratante_rep: "", contratante_email: "", contratante_phone: "",
  contratada_name: "VALUE AGÊNCIA LTDA",
  contratada_doc: "58.673.996/0001-86",
  contratada_address: "Rua José Ferreira do Amaral, 1.105, São Geraldo II, Nova Serrana – MG, CEP 35520-304",
  contratada_city: "Nova Serrana",
  contract_type: "Gestão de Marketplace",
  platform: "Mercado Livre",
  start_date: new Date().toISOString().slice(0,10),
  duration: "3 meses", loyalty_period: "3 meses",
  notice_days: 30, cancel_fee_pct: 20,
  service_description: "", accounts_count: 1, ads_count: 40,
  included_services: ["Gestão de conta marketplace","Gestão de anúncios ADS","Cadastro de promoções","Criação ou otimização de anúncios","Planejamento de campanhas","Mapeamento de concorrência","Acompanhamento diário","Estratégias de crescimento"],
  excluded_services: [],
  total_value: 0, monthly_value: 0,
  payment_method: "Pix", installments: 1, due_date: "",
  payment_notes: "",
  per_account_billing: false, single_account: true, proportional_adjust: true,
  service_hours: "Segunda a sexta-feira, das 9h às 18h",
  channels: ["WhatsApp","E-mail"],
  contacts: ["Gestor responsável"],
  optional_clauses: ["isencao_precificacao","nao_reembolsavel","sem_garantia","foro"],
  internal_notes: "",
});

function MultiSelect({ label, value, onChange, options }: { label: string; value: string[]; onChange: (v: string[]) => void; options: string[] }) {
  const [custom, setCustom] = useState("");
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${value.includes(o) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}>
            {o}
          </button>
        ))}
        {value.filter(v => !options.includes(v)).map(v => (
          <button key={v} type="button" onClick={() => toggle(v)}
            className="text-xs px-2.5 py-1 rounded-md border bg-primary text-primary-foreground border-primary">
            {v} ✕
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Adicionar item personalizado" value={custom} onChange={e => setCustom(e.target.value)} className="h-8 text-xs" />
        <Button type="button" size="sm" variant="outline" onClick={() => { if (custom.trim()) { onChange([...value, custom.trim()]); setCustom(""); } }}>Adicionar</Button>
      </div>
    </div>
  );
}

function ContractsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [tab, setTab] = useState("contratante");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [editPreview, setEditPreview] = useState(false);
  const [editedSections, setEditedSections] = useState<ContractSection[] | null>(null);
  const [editedSig, setEditedSig] = useState<ContractSig | null>(null);
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));
  const resetPreviewEdits = () => { setEditedSections(null); setEditedSig(null); setEditPreview(false); };

  const { data, isLoading } = useQuery({
    queryKey: ["contract_documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_documents" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => (data ?? []).filter(c => {
    if (statusFilter !== "todos" && c.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return [c.contract_number, c.contratante_name, c.contratante_doc, c.contract_type].some((v: any) => String(v ?? "").toLowerCase().includes(s));
  }), [data, search, statusFilter]);

  const openNew = () => { setForm(emptyForm()); setTab("contratante"); resetPreviewEdits(); setOpen(true); };

  const openEdit = (row: any) => {
    setForm({
      id: row.id,
      status: row.status,
      contratante_name: row.contratante_name ?? "",
      contratante_doc: row.contratante_doc ?? "",
      contratante_address: row.contratante_address ?? "",
      contratante_city: row.contratante_city ?? "",
      contratante_state: row.contratante_state ?? "",
      contratante_zip: row.contratante_zip ?? "",
      contratante_rep: row.contratante_rep ?? "",
      contratante_email: row.contratante_email ?? "",
      contratante_phone: row.contratante_phone ?? "",
      contratada_name: row.contratada_name,
      contratada_doc: row.contratada_doc,
      contratada_address: row.contratada_address,
      contratada_city: row.contratada_city,
      contract_type: row.contract_type,
      platform: row.platform ?? "",
      start_date: row.start_date,
      duration: row.duration ?? "",
      loyalty_period: row.loyalty_period ?? "",
      notice_days: row.notice_days,
      cancel_fee_pct: Number(row.cancel_fee_pct),
      service_description: row.service_description ?? "",
      accounts_count: row.accounts_count ?? 1,
      ads_count: row.ads_count ?? 0,
      included_services: row.included_services ?? [],
      excluded_services: row.excluded_services ?? [],
      total_value: Number(row.total_value),
      monthly_value: row.monthly_value ? Number(row.monthly_value) : 0,
      payment_method: row.payment_method ?? "",
      installments: row.installments ?? 1,
      due_date: row.due_date ?? "",
      payment_notes: row.payment_notes ?? "",
      per_account_billing: !!row.per_account_billing,
      single_account: !!row.single_account,
      proportional_adjust: !!row.proportional_adjust,
      service_hours: row.service_hours ?? "",
      channels: row.channels ?? [],
      contacts: row.contacts ?? [],
      optional_clauses: row.optional_clauses ?? [],
      internal_notes: row.internal_notes ?? "",
      contract_number: row.contract_number,
    });
    setTab("contratante");
    resetPreviewEdits();
    setOpen(true);
  };

  const duplicar = (row: any) => {
    openEdit(row);
    setForm(p => ({ ...p, id: undefined, status: "rascunho", contract_number: undefined }));
    toast.success("Contrato duplicado. Salve para gerar nova numeração.");
  };

  const remover = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    const { error } = await supabase.from("contract_documents" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contrato excluído");
    qc.invalidateQueries({ queryKey: ["contract_documents"] });
  };

  const salvar = async (statusOverride?: string) => {
    if (!form.contratante_name) return toast.error("Informe o nome do contratante.");
    if (!form.contract_type) return toast.error("Informe o tipo de contrato.");
    if (!form.total_value || form.total_value <= 0) return toast.error("Informe o valor total do contrato.");

    const payload: any = {
      status: statusOverride || form.status,
      contratante_name: form.contratante_name,
      contratante_doc: form.contratante_doc || null,
      contratante_address: form.contratante_address || null,
      contratante_city: form.contratante_city || null,
      contratante_state: form.contratante_state || null,
      contratante_zip: form.contratante_zip || null,
      contratante_rep: form.contratante_rep || null,
      contratante_email: form.contratante_email || null,
      contratante_phone: form.contratante_phone || null,
      contratada_name: form.contratada_name,
      contratada_doc: form.contratada_doc,
      contratada_address: form.contratada_address,
      contratada_city: form.contratada_city,
      contract_type: form.contract_type,
      platform: form.platform || null,
      start_date: form.start_date,
      duration: form.duration || null,
      loyalty_period: form.loyalty_period || null,
      notice_days: form.notice_days,
      cancel_fee_pct: form.cancel_fee_pct,
      service_description: form.service_description || null,
      accounts_count: form.accounts_count ?? null,
      ads_count: form.ads_count ?? null,
      included_services: form.included_services,
      excluded_services: form.excluded_services,
      total_value: form.total_value,
      monthly_value: form.monthly_value || null,
      payment_method: form.payment_method || null,
      installments: form.installments ?? null,
      due_date: form.due_date || null,
      payment_notes: form.payment_notes || null,
      per_account_billing: form.per_account_billing,
      single_account: form.single_account,
      proportional_adjust: form.proportional_adjust,
      service_hours: form.service_hours || null,
      channels: form.channels,
      contacts: form.contacts,
      optional_clauses: form.optional_clauses,
      internal_notes: form.internal_notes || null,
    };

    if (form.id) {
      const { error } = await supabase.from("contract_documents" as any).update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      toast.success("Contrato atualizado");
    } else {
      payload.created_by = user?.id ?? null;
      const { data: ins, error } = await supabase.from("contract_documents" as any).insert(payload).select().single();
      if (error) return toast.error(error.message);
      setForm(p => ({ ...p, id: (ins as any).id, contract_number: (ins as any).contract_number }));
      toast.success(`Contrato ${(ins as any).contract_number} salvo`);
    }
    qc.invalidateQueries({ queryKey: ["contract_documents"] });
  };

  const baseSections = useMemo(() => buildContractSections(form), [form]);
  const baseSig = useMemo(() => buildSignatureBlock(form), [form]);
  const sections = editedSections ?? baseSections;
  const sig = editedSig ?? baseSig;
  const overrides = (editedSections || editedSig) ? { sections, sig } : undefined;

  const copiarTexto = async () => {
    const text = contractToPlainText(form, overrides);
    await navigator.clipboard.writeText(text);
    toast.success("Contrato copiado para a área de transferência");
  };

  const startEdit = () => {
    setEditedSections(sections.map(s => ({ title: s.title, paragraphs: [...s.paragraphs] })));
    setEditedSig({ ...sig });
    setEditPreview(true);
  };
  const updateSecTitle = (i: number, v: string) =>
    setEditedSections(prev => prev!.map((s, idx) => idx === i ? { ...s, title: v } : s));
  const updateSecPar = (i: number, j: number, v: string) =>
    setEditedSections(prev => prev!.map((s, idx) => idx === i ? { ...s, paragraphs: s.paragraphs.map((p, k) => k === j ? v : p) } : s));

  return (
    <div>
      <PageHeader title="Contratos" description="Gere contratos automaticamente a partir do modelo padrão"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Gerar novo contrato</Button>}
      />

      <Card className="mb-4 p-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar por nº, cliente, CNPJ ou tipo…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nº</TableHead><TableHead>Criado em</TableHead><TableHead>Cliente</TableHead>
            <TableHead>CPF/CNPJ</TableHead><TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum contrato encontrado</TableCell></TableRow>}
            {filtered.map((c: any) => {
              const st = STATUS.find(s => s.v === c.status);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.contract_number}</TableCell>
                  <TableCell>{fmtDate(c.created_at)}</TableCell>
                  <TableCell className="font-medium">{c.contratante_name}</TableCell>
                  <TableCell className="text-xs">{c.contratante_doc ?? "-"}</TableCell>
                  <TableCell className="text-xs">{c.contract_type}</TableCell>
                  <TableCell className="text-right font-medium">{brl(c.total_value)}</TableCell>
                  <TableCell><Badge variant="outline" className={st?.c}>{st?.l}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicar(c)} title="Duplicar"><Files className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => exportPDF(c)} title="PDF"><FileText className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => exportDOCX(c)} title="DOCX"><Download className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remover(c.id)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? `Editar ${form.contract_number ?? "contrato"}` : "Novo contrato"}</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="contratante">Contratante</TabsTrigger>
              <TabsTrigger value="contratada">Contratada</TabsTrigger>
              <TabsTrigger value="contrato">Contrato</TabsTrigger>
              <TabsTrigger value="servico">Serviço</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="atendimento">Atendimento</TabsTrigger>
              <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
            </TabsList>

            <TabsContent value="contratante" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome da empresa ou cliente *</Label><Input value={form.contratante_name} onChange={e => update("contratante_name", e.target.value)} /></div>
                <div><Label>CPF ou CNPJ</Label><Input value={form.contratante_doc ?? ""} onChange={e => update("contratante_doc", e.target.value)} /></div>
                <div className="col-span-2"><Label>Endereço completo</Label><Input value={form.contratante_address ?? ""} onChange={e => update("contratante_address", e.target.value)} /></div>
                <div><Label>Cidade</Label><Input value={form.contratante_city ?? ""} onChange={e => update("contratante_city", e.target.value)} /></div>
                <div><Label>Estado</Label><Input value={form.contratante_state ?? ""} onChange={e => update("contratante_state", e.target.value)} /></div>
                <div><Label>CEP</Label><Input value={form.contratante_zip ?? ""} onChange={e => update("contratante_zip", e.target.value)} /></div>
                <div><Label>Representante legal</Label><Input value={form.contratante_rep ?? ""} onChange={e => update("contratante_rep", e.target.value)} /></div>
                <div><Label>E-mail</Label><Input value={form.contratante_email ?? ""} onChange={e => update("contratante_email", e.target.value)} /></div>
                <div><Label>Telefone / WhatsApp</Label><Input value={form.contratante_phone ?? ""} onChange={e => update("contratante_phone", e.target.value)} /></div>
              </div>
            </TabsContent>

            <TabsContent value="contratada" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">Dados padrão da Value Agência — edite se necessário.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={form.contratada_name} onChange={e => update("contratada_name", e.target.value)} /></div>
                <div><Label>CNPJ</Label><Input value={form.contratada_doc} onChange={e => update("contratada_doc", e.target.value)} /></div>
                <div className="col-span-2"><Label>Endereço</Label><Input value={form.contratada_address} onChange={e => update("contratada_address", e.target.value)} /></div>
                <div><Label>Cidade (foro / assinatura)</Label><Input value={form.contratada_city} onChange={e => update("contratada_city", e.target.value)} /></div>
              </div>
            </TabsContent>

            <TabsContent value="contrato" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo de contrato *</Label>
                  <Select value={form.contract_type} onValueChange={v => update("contract_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Plataforma atendida</Label>
                  <Select value={form.platform ?? ""} onValueChange={v => update("platform", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATAFORMAS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data de início</Label><Input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)} /></div>
                <div><Label>Prazo do contrato</Label>
                  <Select value={form.duration ?? ""} onValueChange={v => update("duration", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRAZOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Período de fidelidade</Label>
                  <Select value={form.loyalty_period ?? ""} onValueChange={v => update("loyalty_period", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FIDELIDADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Aviso prévio (dias)</Label><Input type="number" value={form.notice_days} onChange={e => update("notice_days", Number(e.target.value))} /></div>
                <div><Label>Multa por cancelamento (%)</Label><Input type="number" value={form.cancel_fee_pct} onChange={e => update("cancel_fee_pct", Number(e.target.value))} /></div>
              </div>

              <div className="pt-3">
                <Label className="mb-2 block">Cláusulas opcionais</Label>
                <div className="grid grid-cols-2 gap-2">
                  {OPTIONAL_CLAUSES.map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.optional_clauses.includes(c.key)} onCheckedChange={() => {
                        update("optional_clauses", form.optional_clauses.includes(c.key)
                          ? form.optional_clauses.filter(x => x !== c.key)
                          : [...form.optional_clauses, c.key]);
                      }} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="servico" className="space-y-3 pt-3">
              <div><Label>Descrição do serviço</Label><Textarea value={form.service_description ?? ""} onChange={e => update("service_description", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade de contas gerenciadas</Label><Input type="number" value={form.accounts_count ?? 0} onChange={e => update("accounts_count", Number(e.target.value))} /></div>
                <div><Label>Anúncios criados/otimizados por mês</Label><Input type="number" value={form.ads_count ?? 0} onChange={e => update("ads_count", Number(e.target.value))} /></div>
              </div>
              <MultiSelect label="Serviços inclusos" value={form.included_services} onChange={v => update("included_services", v)} options={SERVICOS_INC} />
              <MultiSelect label="Serviços não inclusos" value={form.excluded_services} onChange={v => update("excluded_services", v)} options={SERVICOS_EXC} />
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor total *</Label><Input type="number" step="0.01" value={form.total_value} onChange={e => update("total_value", Number(e.target.value))} /></div>
                <div><Label>Valor mensal equivalente</Label><Input type="number" step="0.01" value={form.monthly_value ?? 0} onChange={e => update("monthly_value", Number(e.target.value))} /></div>
                <div><Label>Forma de pagamento</Label>
                  <Select value={form.payment_method ?? ""} onValueChange={v => update("payment_method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAGAMENTOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantidade de parcelas</Label><Input type="number" value={form.installments ?? 1} onChange={e => update("installments", Number(e.target.value))} /></div>
                <div className="col-span-2"><Label>Data / dia de vencimento</Label><Input value={form.due_date ?? ""} onChange={e => update("due_date", e.target.value)} placeholder="Ex: todo dia 10" /></div>
                <div className="col-span-2"><Label>Observações sobre pagamento</Label><Textarea value={form.payment_notes ?? ""} onChange={e => update("payment_notes", e.target.value)} /></div>
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!form.per_account_billing} onCheckedChange={v => update("per_account_billing", !!v)} /> Cobrança é por conta gerenciada</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!form.single_account} onCheckedChange={v => update("single_account", !!v)} /> Contrato cobre apenas uma conta</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!form.proportional_adjust} onCheckedChange={v => update("proportional_adjust", !!v)} /> Ajuste proporcional para inclusão/exclusão de contas</label>
              </div>
            </TabsContent>

            <TabsContent value="atendimento" className="space-y-3 pt-3">
              <div><Label>Horário de atendimento</Label><Input value={form.service_hours ?? ""} onChange={e => update("service_hours", e.target.value)} /></div>
              <MultiSelect label="Canais de atendimento" value={form.channels} onChange={v => update("channels", v)} options={CANAIS} />
              <MultiSelect label="Contatos disponibilizados" value={form.contacts} onChange={v => update("contacts", v)} options={CONTATOS} />
              <div><Label>Observações internas (não aparecem no contrato)</Label><Textarea value={form.internal_notes ?? ""} onChange={e => update("internal_notes", e.target.value)} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => update("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="pt-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {editPreview
                    ? "Modo de edição ativo. Os ajustes valem para esta exportação."
                    : "Visualização do contrato. Use “Editar” para ajustar o texto antes de exportar."}
                </p>
                <div className="flex gap-2">
                  {!editPreview && (
                    <Button size="sm" variant="outline" onClick={startEdit}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                  )}
                  {editPreview && (
                    <>
                      <Button size="sm" variant="outline" onClick={resetPreviewEdits}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Restaurar modelo
                      </Button>
                      <Button size="sm" onClick={() => { setEditPreview(false); toast.success("Alterações aplicadas à pré-visualização"); }}>
                        <Check className="h-4 w-4 mr-2" /> Concluir edição
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white text-black rounded-md border p-6 max-h-[60vh] overflow-y-auto text-sm leading-relaxed">
                {sections.map((s, i) => (
                  <div key={i} className="mb-4">
                    {editPreview ? (
                      <Input
                        value={s.title}
                        onChange={e => updateSecTitle(i, e.target.value)}
                        className="font-bold mb-2 text-[13px] bg-white text-black h-8"
                      />
                    ) : (
                      <h3 className="font-bold mb-2 text-[13px]">{s.title}</h3>
                    )}
                    {s.paragraphs.map((p, j) => (
                      editPreview ? (
                        <Textarea
                          key={j}
                          value={p}
                          onChange={e => updateSecPar(i, j, e.target.value)}
                          className="mb-2 bg-white text-black text-sm leading-relaxed min-h-[72px]"
                        />
                      ) : (
                        <p key={j} className="mb-2 whitespace-pre-line text-justify">{p}</p>
                      )
                    ))}
                  </div>
                ))}

                {editPreview ? (
                  <div className="space-y-2 mt-6">
                    <Label className="text-xs">Local e data</Label>
                    <Input value={sig.location} onChange={e => setEditedSig(prev => ({ ...prev!, location: e.target.value }))} className="bg-white text-black h-8" />
                    <Label className="text-xs">Assinatura — Contratada</Label>
                    <Input value={sig.contratada} onChange={e => setEditedSig(prev => ({ ...prev!, contratada: e.target.value }))} className="bg-white text-black h-8" />
                    <Label className="text-xs">Assinatura — Contratante</Label>
                    <Input value={sig.contratante} onChange={e => setEditedSig(prev => ({ ...prev!, contratante: e.target.value }))} className="bg-white text-black h-8" />
                    <Label className="text-xs">Cargo do contratante</Label>
                    <Input value={sig.contratanteRole} onChange={e => setEditedSig(prev => ({ ...prev!, contratanteRole: e.target.value }))} className="bg-white text-black h-8" />
                  </div>
                ) : (
                  <>
                    <p className="mt-8">{sig.location}</p>
                    <div className="mt-10 text-center">
                      <p>____________________________________</p>
                      <p className="font-semibold">{sig.contratada}</p>
                      <p className="text-xs">CONTRATADA</p>
                    </div>
                    <div className="mt-8 text-center">
                      <p>____________________________________</p>
                      <p className="font-semibold">{sig.contratante}</p>
                      <p className="text-xs">{sig.contratanteRole}</p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={copiarTexto}><Copy className="h-4 w-4 mr-2" /> Copiar</Button>
            <Button variant="outline" onClick={() => exportDOCX(form, overrides)}><Download className="h-4 w-4 mr-2" /> DOCX</Button>
            <Button variant="outline" onClick={() => exportPDF(form, overrides)}><FileText className="h-4 w-4 mr-2" /> PDF</Button>
            <Button variant="secondary" onClick={() => salvar()}>Salvar rascunho</Button>
            <Button onClick={() => salvar("gerado")}>Salvar e gerar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

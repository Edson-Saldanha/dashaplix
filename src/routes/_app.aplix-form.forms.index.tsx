import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, ExternalLink, Copy, Pause, Play, Trash2, Edit, Files, Sparkles, MessageCircle, Briefcase, Calendar, FileQuestion, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/aplix-form/forms/")({ component: FormsPage });

type Template = {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  questions: Array<{ text: string; type: string; required?: boolean; options?: string[]; description?: string }>;
};

const templates: Template[] = [
  {
    id: "blank",
    name: "Em branco",
    description: "Comece do zero com total liberdade.",
    icon: Sparkles,
    color: "from-slate-500 to-slate-700",
    questions: [],
  },
  {
    id: "contact",
    name: "Contato rápido",
    description: "Capture nome, e-mail, telefone e mensagem em segundos.",
    icon: MessageCircle,
    color: "from-blue-500 to-indigo-600",
    questions: [
      { text: "Qual é o seu nome?", type: "text_short", required: true },
      { text: "Seu melhor e-mail", type: "email", required: true },
      { text: "Seu WhatsApp", type: "phone", required: true },
      { text: "Em que podemos te ajudar?", type: "text_long" },
    ],
  },
  {
    id: "qualify",
    name: "Qualificação de Lead",
    description: "Descubra orçamento, urgência e perfil do lead.",
    icon: Briefcase,
    color: "from-[oklch(0.16_0.06_258)] to-[oklch(0.22_0.07_258)]",
    questions: [
      { text: "Qual é o seu nome?", type: "text_short", required: true },
      { text: "Seu WhatsApp", type: "phone", required: true },
      { text: "Qual é o porte da sua empresa?", type: "single_choice", required: true, options: ["Autônomo", "Pequena (1-10)", "Média (11-50)", "Grande (50+)"] },
      { text: "Qual o investimento previsto?", type: "single_choice", required: true, options: ["Até R$ 1.000", "R$ 1.000 - R$ 5.000", "R$ 5.000 - R$ 20.000", "Acima de R$ 20.000"] },
      { text: "Quando pretende começar?", type: "single_choice", required: true, options: ["Imediatamente", "Em 30 dias", "Em 90 dias", "Apenas pesquisando"] },
    ],
  },
  {
    id: "booking",
    name: "Agendamento",
    description: "Receba pedidos de reunião e horários preferidos.",
    icon: Calendar,
    color: "from-emerald-500 to-teal-600",
    questions: [
      { text: "Qual é o seu nome?", type: "text_short", required: true },
      { text: "E-mail para confirmação", type: "email", required: true },
      { text: "WhatsApp", type: "phone", required: true },
      { text: "Data preferida", type: "date", required: true },
      { text: "Período preferido", type: "single_choice", options: ["Manhã", "Tarde", "Noite"] },
      { text: "Alguma observação?", type: "text_long" },
    ],
  },
  {
    id: "survey",
    name: "Pesquisa de satisfação",
    description: "Meça NPS e colete feedback de clientes.",
    icon: FileQuestion,
    color: "from-orange-500 to-red-500",
    questions: [
      { text: "Como você nos avalia de 0 a 10?", type: "number", required: true },
      { text: "O que mais gostou?", type: "text_long" },
      { text: "O que poderíamos melhorar?", type: "text_long" },
      { text: "Você nos recomendaria?", type: "single_choice", options: ["Com certeza", "Talvez", "Não"] },
    ],
  },
];

function FormsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["forms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_forms").select("*, leads:aform_leads(count)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  async function createFromTemplate(t: Template) {
    const { data, error } = await supabase.from("aform_forms").insert({
      owner_id: user!.id,
      name: t.id === "blank" ? "Novo formulário" : t.name,
      description: t.description,
    }).select().single();
    if (error || !data) return toast.error(error?.message ?? "Erro");

    if (t.questions.length) {
      for (let i = 0; i < t.questions.length; i++) {
        const q = t.questions[i];
        const { data: nq } = await supabase.from("aform_questions").insert({
          form_id: data.id,
          question_text: q.text,
          field_type: q.type,
          is_required: q.required ?? false,
          order_index: i,
          question_description: q.description,
        }).select().single();
        if (nq && q.options?.length) {
          await supabase.from("aform_question_options").insert(
            q.options.map((opt, idx) => ({ question_id: nq.id, option_text: opt, order_index: idx }))
          );
        }
      }
    }
    setOpenNew(false);
    toast.success(`Formulário "${t.name === "Em branco" ? "Novo formulário" : t.name}" criado`);
    nav({ to: "/aplix-form/forms/$id", params: { id: data.id } });
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("aform_forms").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["forms"] });
  }
  async function duplicate(id: string) {
    const { data: f } = await supabase.from("aform_forms").select("*").eq("id", id).single();
    if (!f) return;
    const { data: nf, error } = await supabase.from("aform_forms").insert({
      owner_id: user!.id, name: f.name + " (cópia)", description: f.description,
      primary_color: f.primary_color, secondary_color: f.secondary_color,
      button_text: f.button_text, initial_message: f.initial_message, final_message: f.final_message,
      logo_url: f.logo_url,
    }).select().single();
    if (error || !nf) return toast.error(error?.message ?? "Erro");
    const { data: qs } = await supabase.from("aform_questions").select("*").eq("form_id", id).order("order_index");
    for (const q of qs ?? []) {
      const { data: nq } = await supabase.from("aform_questions").insert({
        form_id: nf.id, question_text: q.question_text, question_description: q.question_description,
        field_type: q.field_type, is_required: q.is_required, order_index: q.order_index,
      }).select().single();
      if (!nq) continue;
      const { data: opts } = await supabase.from("aform_question_options").select("*").eq("question_id", q.id);
      if (opts?.length) {
        await supabase.from("aform_question_options").insert(opts.map(o => ({
          question_id: nq.id, option_text: o.option_text, order_index: o.order_index,
        })));
      }
    }
    toast.success("Formulário duplicado");
    qc.invalidateQueries({ queryKey: ["forms"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir este formulário e todos os leads relacionados?")) return;
    const { error } = await supabase.from("aform_forms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["forms"] });
  }
  function copyLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  const filtered = forms.filter((f: any) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || (f.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalLeads = forms.reduce((s: number, f: any) => s + (f.leads?.[0]?.count ?? 0), 0);
  const activeCount = forms.filter((f: any) => f.status === "active").length;

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[oklch(0.16_0.06_258)] via-[oklch(0.2_0.07_258)] to-[oklch(0.14_0.05_258)] p-8 text-white shadow-2xl">
        <div className="absolute -top-20 -right-10 size-80 rounded-full bg-[oklch(0.86_0.22_142)]/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="max-w-xl">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[oklch(0.86_0.22_142)] font-bold mb-2">Formulários</div>
            <h1 className="text-4xl font-black tracking-tight">Crie experiências que <span className="text-[oklch(0.86_0.22_142)]">convertem</span>.</h1>
            <p className="text-sm text-white/60 mt-3">{forms.length} formulários · {activeCount} ativos · {totalLeads} leads capturados.</p>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12 px-6 bg-[oklch(0.86_0.22_142)] text-[oklch(0.12_0.05_258)] hover:bg-[oklch(0.9_0.22_142)] font-bold shadow-[0_0_30px_-4px_oklch(0.86_0.22_142_/_0.6)]">
                <Zap className="size-4 mr-2" /> Novo formulário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Escolha um ponto de partida</DialogTitle>
                <DialogDescription>Selecione um modelo pronto ou comece em branco. Você pode editar tudo depois.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {templates.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => createFromTemplate(t)}
                      className="group text-left rounded-2xl border border-border bg-white p-5 hover:border-[oklch(0.86_0.22_142)] hover:shadow-[0_8px_24px_-12px_oklch(0.86_0.22_142_/_0.6)] transition-all"
                    >
                      <div className={`size-11 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-110 transition`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="font-bold text-[15px] mb-1">{t.name}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{t.description}</div>
                      {t.questions.length > 0 && (
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[oklch(0.74_0.24_142)] mt-3">{t.questions.length} perguntas inclusas</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      {forms.length > 0 && (
        <Input
          placeholder="Buscar formulário..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md h-11 bg-white border-border shadow-sm"
        />
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : forms.length === 0 ? (
        <Card className="border-dashed border-2"><CardContent className="py-20 text-center">
          <div className="size-16 mx-auto rounded-2xl bg-gradient-to-br from-[oklch(0.16_0.06_258)] to-[oklch(0.22_0.07_258)] flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="size-7 text-[oklch(0.86_0.22_142)]" />
          </div>
          <div className="text-xl font-bold mb-1">Comece capturando seus primeiros leads</div>
          <div className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Crie um formulário em segundos a partir de um modelo pronto.</div>
          <Button size="lg" onClick={() => setOpenNew(true)} className="bg-[oklch(0.16_0.06_258)] hover:bg-[oklch(0.22_0.07_258)] text-white">
            <Plus className="size-4 mr-2" />Criar meu primeiro formulário
          </Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f: any) => (
            <Card key={f.id} className="group relative overflow-hidden border-0 shadow-[0_2px_24px_-12px_oklch(0.22_0.07_255_/_0.2)] hover:shadow-[0_12px_36px_-12px_oklch(0.22_0.07_255_/_0.35)] hover:-translate-y-1 transition-all bg-white">
              <div className="h-1.5 w-full bg-gradient-to-r from-[oklch(0.16_0.06_258)] via-[oklch(0.86_0.22_142)] to-[oklch(0.16_0.06_258)]" />
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to="/aplix-form/forms/$id" params={{ id: f.id }} className="block font-bold text-[15px] truncate hover:text-[oklch(0.22_0.07_255)] transition">{f.name}</Link>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{f.description || "Sem descrição"}</div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Leads</div>
                    <div className="text-2xl font-black text-[oklch(0.16_0.06_258)]">{f.leads?.[0]?.count ?? 0}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Criado em</div>
                    <div className="text-xs font-medium">{format(new Date(f.created_at), "dd/MM/yyyy")}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button asChild size="sm" variant="outline" className="h-8"><Link to="/aplix-form/forms/$id" params={{ id: f.id }}><Edit className="size-3.5 mr-1" />Editar</Link></Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => copyLink(f.public_slug)}><Copy className="size-3.5 mr-1" />Link</Button>
                  <Button asChild size="sm" variant="outline" className="h-8"><a href={`/f/${f.public_slug}`} target="_blank"><ExternalLink className="size-3.5 mr-1" />Ver</a></Button>
                  {f.status === "active"
                    ? <Button size="sm" variant="outline" className="h-8" onClick={() => setStatus(f.id, "paused")}><Pause className="size-3.5 mr-1" />Pausar</Button>
                    : <Button size="sm" className="h-8 bg-[oklch(0.86_0.22_142)] text-[oklch(0.12_0.05_258)] hover:bg-[oklch(0.9_0.22_142)]" onClick={() => setStatus(f.id, "active")}><Play className="size-3.5 mr-1" />Publicar</Button>}
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => duplicate(f.id)}><Files className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => remove(f.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "● Ativo", cls: "bg-[oklch(0.86_0.22_142)]/15 text-[oklch(0.35_0.18_142)] hover:bg-[oklch(0.86_0.22_142)]/20 border-[oklch(0.86_0.22_142)]/30" },
    draft: { label: "Rascunho", cls: "bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200" },
    paused: { label: "Pausado", cls: "bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200" },
  };
  const m = map[status] ?? map.draft;
  return <Badge variant="outline" className={`${m.cls} font-semibold text-[10px] uppercase tracking-wider`}>{m.label}</Badge>;
}

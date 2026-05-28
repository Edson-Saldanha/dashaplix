import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, GripVertical, Copy, ExternalLink, Type, AlignLeft, Phone, Mail, Hash, CircleDot, ListChecks, CheckSquare, Calendar, MousePointer2, Users, X, IdCard, Building2, DollarSign, MapPin, Percent, MapPinned, Star, SlidersHorizontal, FileCheck2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/_app/aplix-form/forms/$id")({ component: FormBuilder });

const fieldTypes = [
  { v: "text_short", l: "Campo de Texto", icon: Type },
  { v: "text_long", l: "Área de Texto", icon: AlignLeft },
  { v: "phone", l: "Telefone", icon: Phone },
  { v: "email", l: "E-mail", icon: Mail },
  { v: "number", l: "Número", icon: Hash },
  { v: "cpf", l: "CPF", icon: IdCard },
  { v: "cnpj", l: "CNPJ", icon: Building2 },
  { v: "cpf_cnpj", l: "CPF/CNPJ", icon: IdCard },
  { v: "cep", l: "CEP", icon: MapPin },
  { v: "location", l: "Localização (Estado/Cidade)", icon: MapPinned },
  { v: "currency", l: "Valor (R$)", icon: DollarSign },
  { v: "percent", l: "Porcentagem", icon: Percent },
  { v: "single_choice", l: "Escolha única", icon: CircleDot },
  { v: "multiple_choice", l: "Múltipla escolha", icon: ListChecks },
  { v: "checkbox", l: "Caixa de seleção", icon: CheckSquare },
  { v: "date", l: "Data", icon: Calendar },
  { v: "rating", l: "Avaliação (estrelas)", icon: Star },
  { v: "slider", l: "Slider numérico", icon: SlidersHorizontal },
  { v: "terms", l: "Aceitar termos (LGPD)", icon: FileCheck2 },
];

function getFieldMeta(v: string) {
  return fieldTypes.find(f => f.v === v) ?? fieldTypes[0];
}

function FormBuilder() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);


  const { data: form } = useQuery({
    queryKey: ["form", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_forms").select("*").eq("id", id).single();
      if (error) throw error; return data;
    },
  });
  const { data: questions = [] } = useQuery({
    queryKey: ["questions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_questions")
        .select("*, form_question_options:aform_question_options(*)").eq("form_id", id).order("order_index");
      if (error) throw error;
      return (data ?? []).map(q => ({ ...q, form_question_options: (q.form_question_options ?? []).sort((a:any,b:any)=>a.order_index-b.order_index) }));
    },
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["rules", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_conditional_rules").select("*").eq("form_id", id);
      if (error) throw error; return data ?? [];
    },
  });

  if (!form) return <div className="p-6">Carregando…</div>;

  async function save(patch: any) {
    const { error } = await supabase.from("aform_forms").update(patch).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["form", id] });
  }
  async function addQuestion() {
    await supabase.from("aform_questions").insert({
      form_id: id, question_text: "Nova pergunta", field_type: "text_short",
      order_index: questions.length,
    });
    qc.invalidateQueries({ queryKey: ["questions", id] });
  }
  async function updateQuestion(qid: string, patch: any) {
    await supabase.from("aform_questions").update(patch).eq("id", qid);
    qc.invalidateQueries({ queryKey: ["questions", id] });
  }
  async function deleteQuestion(qid: string) {
    setConfirmDeleteId(qid);
  }
  async function confirmDeleteQuestion() {
    const qid = confirmDeleteId;
    if (!qid) return;
    setConfirmDeleteId(null);
    const { error } = await supabase.from("aform_questions").delete().eq("id", qid);
    if (error) { toast.error(error.message); return; }
    toast.success("Pergunta excluída");
    qc.invalidateQueries({ queryKey: ["questions", id] });
    qc.invalidateQueries({ queryKey: ["rules", id] });
  }

  async function duplicateQuestion(q: any) {
    const { data: nq } = await supabase.from("aform_questions").insert({
      form_id: id, question_text: q.question_text + " (cópia)",
      question_description: q.question_description, field_type: q.field_type,
      is_required: q.is_required, order_index: questions.length,
    }).select().single();
    if (nq && q.form_question_options?.length) {
      await supabase.from("aform_question_options").insert(q.form_question_options.map((o:any)=>({
        question_id: nq.id, option_text: o.option_text, order_index: o.order_index,
      })));
    }
    qc.invalidateQueries({ queryKey: ["questions", id] });
  }
  async function addOption(qid: string, count: number) {
    await supabase.from("aform_question_options").insert({ question_id: qid, option_text: "Nova opção", order_index: count });
    qc.invalidateQueries({ queryKey: ["questions", id] });
  }
  async function updateOption(oid: string, text: string) {
    await supabase.from("aform_question_options").update({ option_text: text }).eq("id", oid);
    qc.invalidateQueries({ queryKey: ["questions", id] });
  }
  async function deleteOption(oid: string) {
    await supabase.from("aform_question_options").delete().eq("id", oid);
    qc.invalidateQueries({ queryKey: ["questions", id] });
  }
  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/f/${form!.public_slug}`);
    toast.success("Link copiado");
  }

  return (
    <div className="-mx-6 -my-8 min-h-[calc(100vh+4rem)] p-6 space-y-4 bg-[#0a1426] text-white">
      {/* HEADER */}
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/aplix-form/forms" })}
          className="text-white/80 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="size-4 mr-1" />Voltar
        </Button>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <span className="size-2 rounded-full"
            style={{ background: form.status === "active" ? "#a3e635" : "#64748b" }} />
          <h1 className="text-lg font-semibold tracking-tight truncate">{form.name}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={copyLink} className="text-white/80 hover:bg-white/5 hover:text-white">
          <Copy className="size-4 mr-2" />Copiar link
        </Button>
        <Button variant="ghost" size="sm" asChild className="text-white/80 hover:bg-white/5 hover:text-white">
          <a href={`/f/${form.public_slug}`} target="_blank"><ExternalLink className="size-4 mr-2" />Visualizar</a>
        </Button>
        {form.status !== "active" ? (
          <Button size="sm" onClick={() => save({ status: "active" })}
            className="font-semibold bg-[#a3e635] text-[#0b1e3a] hover:bg-[#b6ed5d]">Publicar</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => save({ status: "paused" })}
            className="border-white/15 text-white/80 hover:bg-white/5 hover:text-white bg-transparent">
            Pausar
          </Button>
        )}
      </div>

      <Tabs defaultValue="design">
        <TabsList className="bg-white/[0.03] border border-white/10 p-1 h-auto">
          <TabsTrigger value="design"
            className="text-white/60 data-[state=active]:bg-white/[0.06] data-[state=active]:text-[#a3e635] data-[state=active]:shadow-none transition-colors">
            Design & textos
          </TabsTrigger>
          <TabsTrigger value="questions"
            className="text-white/60 data-[state=active]:bg-white/[0.06] data-[state=active]:text-[#a3e635] data-[state=active]:shadow-none transition-colors">
            Perguntas
          </TabsTrigger>
          <TabsTrigger value="logic"
            className="text-white/60 data-[state=active]:bg-white/[0.06] data-[state=active]:text-[#a3e635] data-[state=active]:shadow-none transition-colors">
            Lógica condicional
          </TabsTrigger>
          <TabsTrigger value="collab"
            className="text-white/60 data-[state=active]:bg-white/[0.06] data-[state=active]:text-[#a3e635] data-[state=active]:shadow-none transition-colors">
            <Users className="size-4 mr-1.5" />Colaboradores
          </TabsTrigger>
        </TabsList>



        <TabsContent value="design">
          <div className="rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-white/[0.03] border border-white/10 [&_label]:text-white/60 [&_label]:font-medium [&_label]:text-xs [&_label]:normal-case [&_label]:tracking-normal [&_input]:bg-white/[0.04] [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_textarea]:bg-white/[0.04] [&_textarea]:border-white/10 [&_textarea]:text-white [&_textarea]:placeholder:text-white/40 [&_button[role=combobox]]:bg-white/[0.04] [&_button[role=combobox]]:border-white/10 [&_button[role=combobox]]:text-white">
            <div className="space-y-1.5"><Label>Nome do formulário</Label><Input defaultValue={form.name} onBlur={e=>save({name:e.target.value})} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={v=>save({status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5"><Label>Descrição interna</Label><Textarea defaultValue={form.description ?? ""} onBlur={e=>save({description:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Logo (URL)</Label><Input defaultValue={form.logo_url ?? ""} onBlur={e=>save({logo_url:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Texto do botão principal</Label><Input defaultValue={form.button_text} onBlur={e=>save({button_text:e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Cor principal</Label><Input type="color" defaultValue={form.primary_color} onBlur={e=>save({primary_color:e.target.value})} className="h-10 cursor-pointer p-1"/></div>
            <div className="space-y-1.5"><Label>Cor secundária</Label><Input type="color" defaultValue={form.secondary_color} onBlur={e=>save({secondary_color:e.target.value})} className="h-10 cursor-pointer p-1"/></div>
            <div className="md:col-span-2 space-y-1.5"><Label>Mensagem inicial</Label><Textarea defaultValue={form.initial_message ?? ""} onBlur={e=>save({initial_message:e.target.value})}/></div>
            <div className="md:col-span-2 space-y-1.5"><Label>Mensagem final</Label><Textarea defaultValue={form.final_message ?? ""} onBlur={e=>save({final_message:e.target.value})}/></div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Link público</Label>
              <div className="flex items-center gap-2 rounded-lg p-1.5 bg-black/20 border border-white/10">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
                  <span className="inline-flex size-1.5 rounded-full"
                    style={{ background: form.status === "active" ? "#a3e635" : "#64748b" }} />
                  <span className="text-xs shrink-0 text-white/50">aplix.form/</span>
                  <Input
                    defaultValue={form.public_slug}
                    onBlur={e => {
                      const v = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                      if (v && v !== form.public_slug) save({ public_slug: v });
                    }}
                    placeholder="meu-formulario"
                    className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 font-mono text-sm truncate text-white placeholder:text-white/40"
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={copyLink} className="shrink-0 text-white/70 hover:bg-white/5 hover:text-white"><Copy className="size-3.5 mr-1.5" />Copiar</Button>
                <Button size="sm" variant="ghost" asChild className="shrink-0 text-white/70 hover:bg-white/5 hover:text-white"><a href={`/f/${form.public_slug}`} target="_blank"><ExternalLink className="size-3.5 mr-1.5" />Abrir</a></Button>
              </div>
              <p className="text-[11px] text-white/40">Personalize o final do link para algo curto e memorável (ex: <code className="text-white/60">black-friday</code>).</p>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="questions">
          <DragDropBuilder
            questions={questions}
            onAdd={async (type, index) => {
              for (const q of questions.filter((q: any) => q.order_index >= index)) {
                await supabase.from("aform_questions").update({ order_index: q.order_index + 1 }).eq("id", q.id);
              }
              await supabase.from("aform_questions").insert({
                form_id: id, question_text: getFieldMeta(type).l, field_type: type,
                order_index: index,
              });
              qc.invalidateQueries({ queryKey: ["questions", id] });
            }}
            onReorder={async (fromId, toIndex) => {
              const moving = questions.find((q: any) => q.id === fromId);
              if (!moving) return;
              const remaining = questions.filter((q: any) => q.id !== fromId).sort((a:any,b:any)=>a.order_index-b.order_index);
              remaining.splice(toIndex, 0, moving);
              for (let i = 0; i < remaining.length; i++) {
                if (remaining[i].order_index !== i) {
                  await supabase.from("aform_questions").update({ order_index: i }).eq("id", remaining[i].id);
                }
              }
              qc.invalidateQueries({ queryKey: ["questions", id] });
            }}
            onUpdate={updateQuestion}
            onDelete={deleteQuestion}
            onDuplicate={duplicateQuestion}
            onAddOption={addOption}
            onUpdateOption={updateOption}
            onDeleteOption={deleteOption}
          />
        </TabsContent>

        <TabsContent value="logic">
          <RulesEditor formId={id} questions={questions} rules={rules} />
        </TabsContent>

        <TabsContent value="collab">
          <CollaboratorsPanel formId={id} ownerId={form.owner_id} />
        </TabsContent>

      </Tabs>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent className="border-white/10 bg-[#0f1e36] text-white shadow-[0_24px_80px_-20px_rgba(0,0,0,0.6)] sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
              <AlertTriangle className="size-6 text-red-400" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-semibold text-white">
              Excluir pergunta?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-white/60">
              Esta ação não pode ser desfeita. A pergunta e suas regras condicionais serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
            <AlertDialogCancel className="border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteQuestion}
              className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/40"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

}

function RulesEditor({ formId, questions, rules }: { formId: string; questions: any[]; rules: any[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<any>({ source_question_id: "", condition_value: "", action_type: "goto" });

  async function add() {
    if (!draft.source_question_id || !draft.condition_value || !draft.action_type) return toast.error("Preencha os campos");
    const payload: any = { form_id: formId, ...draft };
    const { error } = await supabase.from("aform_conditional_rules").insert(payload);
    if (error) return toast.error(error.message);
    setDraft({ source_question_id: "", condition_value: "", action_type: "goto" });
    qc.invalidateQueries({ queryKey: ["rules", formId] });
  }
  async function remove(rid: string) {
    await supabase.from("aform_conditional_rules").delete().eq("id", rid);
    qc.invalidateQueries({ queryKey: ["rules", formId] });
  }

  const sourceQ = questions.find(q => q.id === draft.source_question_id);

  return (
    <div className="rounded-xl p-5 space-y-4 mt-3 bg-white/[0.03] border border-white/10 [&_label]:text-white/60 [&_label]:font-medium [&_label]:text-xs [&_label]:normal-case [&_label]:tracking-normal [&_input]:bg-white/[0.04] [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_button[role=combobox]]:bg-white/[0.04] [&_button[role=combobox]]:border-white/10 [&_button[role=combobox]]:text-white">
      <div className="text-sm text-white/60">Configure ações automáticas com base na resposta a uma pergunta.</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="space-y-1.5"><Label>Pergunta de origem</Label>
          <Select value={draft.source_question_id} onValueChange={v=>setDraft({...draft,source_question_id:v,condition_value:""})}>
            <SelectTrigger><SelectValue placeholder="Pergunta"/></SelectTrigger>
            <SelectContent>{questions.map(q=><SelectItem key={q.id} value={q.id}>{q.question_text}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Resposta escolhida</Label>
          {sourceQ?.form_question_options?.length ? (
            <Select value={draft.condition_value} onValueChange={v=>setDraft({...draft,condition_value:v})}>
              <SelectTrigger><SelectValue placeholder="Opção"/></SelectTrigger>
              <SelectContent>{sourceQ.form_question_options.map((o:any)=><SelectItem key={o.id} value={o.option_text}>{o.option_text}</SelectItem>)}</SelectContent>
            </Select>
          ) : <Input placeholder="Valor exato ou >NUM, <NUM" value={draft.condition_value} onChange={e=>setDraft({...draft,condition_value:e.target.value})}/>}
        </div>
        <div className="space-y-1.5"><Label>Ação</Label>
          <Select value={draft.action_type} onValueChange={v=>setDraft({...draft,action_type:v})}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="goto">Ir para pergunta</SelectItem>
              <SelectItem value="add_tag">Adicionar tag</SelectItem>
              <SelectItem value="set_temperature">Definir temperatura</SelectItem>
              <SelectItem value="set_status">Definir status inicial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          {draft.action_type === "goto" && (
            <Select value={draft.target_question_id ?? ""} onValueChange={v=>setDraft({...draft,target_question_id:v})}>
              <SelectTrigger><SelectValue placeholder="Pergunta destino"/></SelectTrigger>
              <SelectContent>{questions.map(q=><SelectItem key={q.id} value={q.id}>{q.question_text}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {draft.action_type === "add_tag" && <Input placeholder="Nome da tag" value={draft.tag_to_add ?? ""} onChange={e=>setDraft({...draft,tag_to_add:e.target.value})}/>}
          {draft.action_type === "set_temperature" && (
            <Select value={draft.temperature_to_set ?? ""} onValueChange={v=>setDraft({...draft,temperature_to_set:v})}>
              <SelectTrigger><SelectValue placeholder="Temperatura"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="frio">Frio</SelectItem><SelectItem value="morno">Morno</SelectItem>
                <SelectItem value="quente">Quente</SelectItem><SelectItem value="muito_quente">Muito quente</SelectItem>
              </SelectContent>
            </Select>
          )}
          {draft.action_type === "set_status" && (
            <Select value={draft.status_to_set ?? ""} onValueChange={v=>setDraft({...draft,status_to_set:v})}>
              <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="nao_qualificado">Não qualificado</SelectItem>
                <SelectItem value="aguardando">Aguardando atendimento</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <Button onClick={add} size="sm" className="font-semibold bg-[#a3e635] text-[#0b1e3a] hover:bg-[#b6ed5d]">
        <Plus className="size-4 mr-2"/>Adicionar regra
      </Button>
      <div className="text-xs text-white/40">Dica: use <code className="text-white/60">&gt;20000</code> ou <code className="text-white/60">&lt;5000</code> para condições numéricas em campos de número.</div>

      <div className="space-y-2 mt-2">
        {rules.length === 0 && <div className="text-sm text-white/40">Nenhuma regra configurada.</div>}
        {rules.map(r => {
          const sq = questions.find(q=>q.id===r.source_question_id);
          const tq = questions.find(q=>q.id===r.target_question_id);
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-lg text-sm text-white/80 bg-white/[0.02] border border-white/10">
              <div className="flex-1">
                Se <b className="text-[#a3e635] font-medium">{sq?.question_text ?? "?"}</b> = <b className="text-[#a3e635] font-medium">"{r.condition_value}"</b>
                {r.action_type === "goto" && <> → ir para <b className="text-[#a3e635] font-medium">{tq?.question_text ?? "?"}</b></>}
                {r.action_type === "add_tag" && <> → adicionar tag <b className="text-[#a3e635] font-medium">{r.tag_to_add}</b></>}
                {r.action_type === "set_temperature" && <> → temperatura <b className="text-[#a3e635] font-medium">{r.temperature_to_set}</b></>}
                {r.action_type === "set_status" && <> → status <b className="text-[#a3e635] font-medium">{r.status_to_set}</b></>}
              </div>
              <Button size="icon" variant="ghost" onClick={()=>remove(r.id)} className="hover:bg-red-500/10"><Trash2 className="size-4 text-destructive"/></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


type DDProps = {
  questions: any[];
  onAdd: (type: string, index: number) => void;
  onReorder: (fromId: string, toIndex: number) => void;
  onUpdate: (qid: string, patch: any) => void;
  onDelete: (qid: string) => void;
  onDuplicate: (q: any) => void;
  onAddOption: (qid: string, count: number) => void;
  onUpdateOption: (oid: string, text: string) => void;
  onDeleteOption: (oid: string) => void;
};

function DragDropBuilder({ questions, onAdd, onReorder, onUpdate, onDelete, onDuplicate, onAddOption, onUpdateOption, onDeleteOption }: DDProps) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIdx(null);
    const newType = e.dataTransfer.getData("application/x-new-field");
    const moveId = e.dataTransfer.getData("application/x-move-question");
    if (newType) onAdd(newType, index);
    else if (moveId) onReorder(moveId, index);
  }

  const selectedQ = questions.find((q: any) => q.id === selected);

  return (
    <div className="grid grid-cols-12 gap-4 min-h-[78vh] mt-3">
      {/* SIDEBAR — elementos */}
      <aside className="col-span-3">
        <div className="rounded-xl p-4 h-full bg-white/[0.03] border border-white/10">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/50 mb-1">
            Elementos
          </div>
          <div className="text-xs mb-4 text-white/40">
            Arraste para o canvas ao lado
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fieldTypes.map(t => {
              const Icon = t.icon;
              return (
                <div
                  key={t.v}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("application/x-new-field", t.v)}
                  className="group flex items-center gap-2 p-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20"
                >
                  <div className="size-7 rounded-md flex items-center justify-center shrink-0 bg-[#a3e635]/10">
                    <Icon className="size-3.5 text-[#a3e635]" />
                  </div>
                  <span className="text-[11px] leading-tight font-medium text-white/80 truncate">
                    {t.l}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* MAIN — canvas */}
      <main className="col-span-6">
        <div className="rounded-xl min-h-full overflow-hidden bg-white border border-white/10">
          <div className="px-5 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Canvas do formulário
            </div>
            <div className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
              {questions.length} {questions.length === 1 ? "campo" : "campos"}
            </div>
          </div>
          <div className="p-5 space-y-1">
            {questions.length === 0 && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOverIdx(0); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={e => handleDrop(e, 0)}
                className="flex flex-col items-center justify-center min-h-[440px] rounded-xl border-2 border-dashed transition-colors"
                style={{
                  borderColor: dragOverIdx === 0 ? "#a3e635" : "rgb(226, 232, 240)",
                  background: dragOverIdx === 0 ? "rgba(163,230,53,0.06)" : "transparent",
                  color: "#0b1e3a",
                }}
              >
                <MousePointer2 className="size-8 mb-3 opacity-30" />
                <div className="font-medium text-slate-700">Arraste um elemento para começar</div>
                <div className="text-xs text-slate-400 mt-1">Solte aqui para adicionar seu primeiro campo</div>
              </div>
            )}

            {questions.map((q: any, idx: number) => {
              const Icon = getFieldMeta(q.field_type).icon;
              const isSelected = selected === q.id;
              return (
                <div key={q.id}>
                  <DropZone active={dragOverIdx === idx} onOver={() => setDragOverIdx(idx)} onLeave={() => setDragOverIdx(null)} onDrop={e => handleDrop(e, idx)} />
                  <div
                    draggable
                    onDragStart={e => e.dataTransfer.setData("application/x-move-question", q.id)}
                    onClick={() => setSelected(q.id)}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors bg-white ${isSelected ? "border-2 border-[#a3e635]" : "border border-slate-200 hover:border-slate-300"}`}
                  >
                    <GripVertical className="size-4 text-slate-300 group-hover:text-slate-400" />
                    <div className="size-8 rounded-md flex items-center justify-center shrink-0 bg-slate-100">
                      <Icon className="size-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-slate-800">
                        {q.question_text}
                        {q.is_required && <span className="text-[#84cc16] ml-1">*</span>}
                      </div>
                      <div className="text-xs flex items-center gap-1.5 mt-0.5 text-slate-400">
                        <span>{getFieldMeta(q.field_type).l}</span>
                        <span>·</span>
                        <span>#{idx + 1}</span>
                        {q.settings?.placeholder && <><span>·</span><span className="truncate italic">"{q.settings.placeholder}"</span></>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-slate-700" onClick={e => { e.stopPropagation(); onDuplicate(q); }}>
                      <Copy className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(q.id); }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {questions.length > 0 && (
              <DropZone active={dragOverIdx === questions.length} onOver={() => setDragOverIdx(questions.length)} onLeave={() => setDragOverIdx(null)} onDrop={e => handleDrop(e, questions.length)} tall />
            )}
          </div>
        </div>
      </main>

      {/* INSPECTOR */}
      <aside className="col-span-3">
        {!selectedQ ? (
          <div className="rounded-xl p-8 text-center text-sm bg-white/[0.03] border border-dashed border-white/10 text-white/50">
            <MousePointer2 className="size-7 mx-auto mb-3 text-white/30" />
            <div className="font-medium mb-1 text-white/80">Nada selecionado</div>
            Selecione um elemento no canvas para editar suas propriedades.
          </div>
        ) : (
          <Inspector
            key={selectedQ.id}
            q={selectedQ}
            onUpdate={onUpdate}
            onAddOption={onAddOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
          />
        )}
      </aside>
    </div>
  );
}


function Inspector({ q, onUpdate, onAddOption, onUpdateOption, onDeleteOption }: {
  q: any;
  onUpdate: (qid: string, patch: any) => void;
  onAddOption: (qid: string, count: number) => void;
  onUpdateOption: (oid: string, text: string) => void;
  onDeleteOption: (oid: string) => void;
}) {
  const settings = q.settings ?? {};
  const Icon = getFieldMeta(q.field_type).icon;
  const isChoice = q.field_type === "single_choice" || q.field_type === "multiple_choice" || q.field_type === "checkbox";
  const isText = q.field_type === "text_short" || q.field_type === "text_long" || q.field_type === "email" || q.field_type === "phone";
  const isNumber = q.field_type === "number";

  function setS(patch: any) {
    onUpdate(q.id, { settings: { ...settings, ...patch } });
  }

  return (
    <div className="rounded-xl overflow-hidden sticky top-4 bg-white/[0.03] border border-white/10 [&_label]:text-white/60 [&_label]:font-medium [&_label]:text-xs [&_label]:normal-case [&_label]:tracking-normal [&_input]:bg-white/[0.04] [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_textarea]:bg-white/[0.04] [&_textarea]:border-white/10 [&_textarea]:text-white [&_textarea]:placeholder:text-white/40 [&_button[role=combobox]]:bg-white/[0.04] [&_button[role=combobox]]:border-white/10 [&_button[role=combobox]]:text-white">
      <div className="px-4 py-3 flex items-center gap-2.5 border-b border-white/10">
        <div className="size-8 rounded-md flex items-center justify-center bg-[#a3e635]/10">
          <Icon className="size-4 text-[#a3e635]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-medium text-white/40">Propriedades</div>
          <div className="text-sm font-medium truncate text-white">{getFieldMeta(q.field_type).l}</div>
        </div>
      </div>


      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full rounded-none border-b border-white/10 bg-transparent p-0 h-auto">
          <TabsTrigger value="general" className="flex-1 rounded-none text-white/60 data-[state=active]:border-b-2 data-[state=active]:border-[#a3e635] data-[state=active]:text-[#a3e635] data-[state=active]:bg-transparent data-[state=active]:shadow-none">Geral</TabsTrigger>
          <TabsTrigger value="validation" className="flex-1 rounded-none text-white/60 data-[state=active]:border-b-2 data-[state=active]:border-[#a3e635] data-[state=active]:text-[#a3e635] data-[state=active]:bg-transparent data-[state=active]:shadow-none">Validação</TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1 rounded-none text-white/60 data-[state=active]:border-b-2 data-[state=active]:border-[#a3e635] data-[state=active]:text-[#a3e635] data-[state=active]:bg-transparent data-[state=active]:shadow-none">Avançado</TabsTrigger>
        </TabsList>


        <TabsContent value="general" className="p-4 space-y-3 mt-0">
          <div><Label>Rótulo da pergunta</Label><Input defaultValue={q.question_text} onBlur={e => onUpdate(q.id, { question_text: e.target.value })} /></div>
          <div><Label>Descrição / texto de ajuda</Label><Textarea rows={2} defaultValue={q.question_description ?? ""} onBlur={e => onUpdate(q.id, { question_description: e.target.value })} /></div>
          <div><Label>Tipo do campo</Label>
            <Select value={q.field_type} onValueChange={v => onUpdate(q.id, { field_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{fieldTypes.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(isText || isNumber) && (
            <div><Label>Placeholder</Label><Input defaultValue={settings.placeholder ?? ""} onBlur={e => setS({ placeholder: e.target.value })} placeholder="Ex.: Digite aqui..." /></div>
          )}
          {(isText || isNumber) && (
            <div><Label>Valor padrão</Label><Input defaultValue={settings.default_value ?? ""} onBlur={e => setS({ default_value: e.target.value })} /></div>
          )}
          {isChoice && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Opções</Label>
                <span className="text-xs text-muted-foreground">{q.form_question_options.length} item(ns)</span>
              </div>
              {q.form_question_options.map((o: any, i: number) => (
                <div key={o.id} className="flex gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <Input defaultValue={o.option_text} onBlur={e => onUpdateOption(o.id, e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => onDeleteOption(o.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full" onClick={() => onAddOption(q.id, q.form_question_options.length)}><Plus className="size-3.5 mr-1" />Adicionar opção</Button>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs">Permitir "Outro"</Label>
                <Switch checked={!!settings.allow_other} onCheckedChange={v => setS({ allow_other: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Embaralhar opções</Label>
                <Switch checked={!!settings.shuffle} onCheckedChange={v => setS({ shuffle: v })} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="validation" className="p-4 space-y-3 mt-0">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
            <div>
              <Label>Obrigatório</Label>
              <div className="text-xs text-muted-foreground">Exige resposta antes de avançar</div>
            </div>
            <Switch checked={q.is_required} onCheckedChange={v => onUpdate(q.id, { is_required: v })} />
          </div>
          {q.is_required && (
            <div><Label>Mensagem de erro</Label><Input defaultValue={settings.required_message ?? ""} onBlur={e => setS({ required_message: e.target.value })} placeholder="Este campo é obrigatório" /></div>
          )}
          {isText && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Mín. caracteres</Label><Input type="number" min={0} defaultValue={settings.min_length ?? ""} onBlur={e => setS({ min_length: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Máx. caracteres</Label><Input type="number" min={0} defaultValue={settings.max_length ?? ""} onBlur={e => setS({ max_length: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
          )}
          {isNumber && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Valor mínimo</Label><Input type="number" defaultValue={settings.min ?? ""} onBlur={e => setS({ min: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Valor máximo</Label><Input type="number" defaultValue={settings.max ?? ""} onBlur={e => setS({ max: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
          )}
          {q.field_type === "text_short" && (
            <div><Label>Regex (avançado)</Label><Input defaultValue={settings.pattern ?? ""} onBlur={e => setS({ pattern: e.target.value })} placeholder="ex.: ^[A-Z].*" /></div>
          )}
          {q.field_type === "phone" && (
            <div><Label>Máscara</Label>
              <Select value={settings.mask ?? "br"} onValueChange={v => setS({ mask: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="br">(00) 00000-0000 — Brasil</SelectItem>
                  <SelectItem value="intl">+00 0000000000 — Internacional</SelectItem>
                  <SelectItem value="none">Sem máscara</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {(q.field_type === "multiple_choice" || q.field_type === "checkbox") && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Mín. seleções</Label><Input type="number" min={0} defaultValue={settings.min_select ?? ""} onBlur={e => setS({ min_select: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Máx. seleções</Label><Input type="number" min={0} defaultValue={settings.max_select ?? ""} onBlur={e => setS({ max_select: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="p-4 space-y-3 mt-0">
          <div><Label>Largura do campo</Label>
            <Select value={settings.width ?? "full"} onValueChange={v => setS({ width: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Largura total</SelectItem>
                <SelectItem value="half">Metade</SelectItem>
                <SelectItem value="third">Um terço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isChoice && (
            <div><Label>Exibição</Label>
              <Select value={settings.layout ?? "list"} onValueChange={v => setS({ layout: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Lista vertical</SelectItem>
                  <SelectItem value="grid">Grade (cartões)</SelectItem>
                  <SelectItem value="inline">Em linha</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Nome interno (API)</Label><Input defaultValue={settings.field_name ?? ""} onBlur={e => setS({ field_name: e.target.value })} placeholder="ex.: nome_completo" /></div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
            <div>
              <Label>Campo oculto</Label>
              <div className="text-xs text-muted-foreground">Não aparece para o usuário</div>
            </div>
            <Switch checked={!!settings.hidden} onCheckedChange={v => setS({ hidden: v })} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
            <div>
              <Label>Somente leitura</Label>
              <div className="text-xs text-muted-foreground">Mostra o valor padrão sem edição</div>
            </div>
            <Switch checked={!!settings.readonly} onCheckedChange={v => setS({ readonly: v })} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DropZone({ active, onOver, onLeave, onDrop, tall }: { active: boolean; onOver: () => void; onLeave: () => void; onDrop: (e: React.DragEvent) => void; tall?: boolean }) {
  return (
    <div
      onDragOver={e => { e.preventDefault(); onOver(); }}
      onDragLeave={onLeave}
      onDrop={onDrop}
      className={`transition-all rounded-md ${active ? `${tall ? "h-24" : "h-12"} bg-primary/10 border-2 border-dashed border-primary my-2` : "h-2"}`}
    />
  );
}

function CollaboratorsPanel({ formId, ownerId }: { formId: string; ownerId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.id === ownerId;
  const [search, setSearch] = useState("");

  const { data: collabs = [] } = useQuery({
    queryKey: ["collabs", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aform_form_collaborators")
        .select("user_id, added_by, created_at")
        .eq("form_id", formId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,name:full_name,email");
      if (error) throw error;
      return data ?? [];
    },
  });

  const collabIds = new Set(collabs.map(c => c.user_id));
  const owner = profiles.find(p => p.id === ownerId);
  const collabProfiles = profiles.filter(p => collabIds.has(p.id));
  const candidates = profiles.filter(p =>
    p.id !== ownerId &&
    !collabIds.has(p.id) &&
    ((p.name ?? "") + " " + (p.email ?? "")).toLowerCase().includes(search.toLowerCase())
  );

  async function add(uid: string) {
    const { error } = await supabase.from("aform_form_collaborators").insert({
      form_id: formId, user_id: uid, added_by: user!.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Colaborador adicionado"); qc.invalidateQueries({ queryKey: ["collabs", formId] }); }
  }
  async function remove(uid: string) {
    const { error } = await supabase.from("aform_form_collaborators").delete()
      .eq("form_id", formId).eq("user_id", uid);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["collabs", formId] }); }
  }

  function initials(p?: { name?: string | null; email?: string | null }) {
    const s = (p?.name?.trim() || p?.email || "?").trim();
    return s.split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase() ?? "").join("") || "?";
  }
  function displayName(p?: { name?: string | null; email?: string | null }) {
    return p?.name?.trim() || p?.email?.split("@")[0] || "Sem nome";
  }

  return (
    <div className="rounded-xl p-5 mt-3 space-y-5 bg-white/[0.03] border border-white/10">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">
          Compartilhamento interno
        </div>
        <h2 className="text-lg font-semibold text-white mt-1">Quem pode acessar este formulário</h2>
        <p className="text-sm mt-1 text-white/50">
          Convide colaboradores já cadastrados. Eles poderão ver e gerenciar leads, perguntas e regras deste formulário.
        </p>
      </div>

      {/* Lista atual */}
      <div className="space-y-2">
        {owner && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
            <div className="size-9 rounded-full flex items-center justify-center text-sm font-semibold text-[#0b1e3a] bg-[#a3e635]">
              {initials(owner)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{displayName(owner)}</div>
              <div className="text-xs truncate text-white/50">{owner.email}</div>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#a3e635]/15 text-[#a3e635]">Proprietário</span>
          </div>
        )}

        {collabProfiles.length === 0 && (
          <div className="text-sm py-2 text-white/40">
            Nenhum colaborador adicionado ainda.
          </div>
        )}

        {collabProfiles.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
            <div className="size-9 rounded-full flex items-center justify-center text-sm font-semibold text-white/80 bg-white/[0.06]">
              {initials(p)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{displayName(p)}</div>
              <div className="text-xs truncate text-white/50">{p.email}</div>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-white/60">Colaborador</span>
            {isOwner && (
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="size-7 text-white/40 hover:text-destructive hover:bg-red-500/10">
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar */}
      {isOwner ? (
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-white/60">
              Adicionar colaborador
            </div>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {candidates.length === 0 && (
              <div className="text-sm text-center py-6 text-white/40">
                {search
                  ? "Nenhum colaborador encontrado."
                  : "Todos os usuários cadastrados já estão neste formulário."}
              </div>
            )}
            {candidates.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-white/[0.04] border border-white/5">
                <div className="size-8 rounded-full flex items-center justify-center text-xs font-semibold text-white/80 bg-white/[0.06]">
                  {initials(p)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{displayName(p)}</div>
                  <div className="text-xs truncate text-white/50">{p.email}</div>
                </div>
                <Button size="sm" onClick={() => add(p.id)} className="h-7 font-medium text-[#0b1e3a] bg-[#a3e635] hover:bg-[#b6ed5d]">
                  <Plus className="size-3.5 mr-1" />Convidar
                </Button>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-white/40">
            Para cadastrar um novo colaborador, peça para ele criar uma conta na plataforma — ele aparecerá automaticamente nesta lista.
          </p>
        </div>
      ) : (
        <div className="pt-4 border-t border-white/10 text-sm text-white/50">
          Apenas o proprietário do formulário pode adicionar ou remover colaboradores.
        </div>
      )}
    </div>
  );
}



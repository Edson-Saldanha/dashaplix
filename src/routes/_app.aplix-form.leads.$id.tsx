import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Copy, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aplix-form/leads/$id")({ component: LeadDetail });

const statusOptions = [
  ["novo","Novo"],["em_atendimento","Em atendimento"],["qualificado","Qualificado"],
  ["agendado","Agendado"],["comprou","Comprou"],["perdido","Perdido"],
  ["sem_resposta","Sem resposta"],["nao_qualificado","Não qualificado"],["aguardando","Aguardando"],
] as const;

function LeadDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [note, setNote] = useState("");

  const { data: lead } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_leads")
        .select("*, forms:aform_forms(name), lead_answers:aform_lead_answers(*, form_questions:aform_questions(question_text, field_type)), lead_tags:aform_lead_tags(*), lead_notes:aform_lead_notes(*), lead_events:aform_lead_events(*)")
        .eq("id", id).single();
      if (error) throw error; return data;
    },
  });

  if (!lead) return <div className="p-6">Carregando…</div>;

  async function update(patch: any, eventType?: string, oldV?: string) {
    const { error } = await supabase.from("aform_leads").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (eventType) {
      await supabase.from("aform_lead_events").insert({
        lead_id: id, event_type: eventType, old_value: oldV ?? null,
        new_value: String(Object.values(patch)[0]),
      });
    }
    qc.invalidateQueries({ queryKey: ["lead", id] });
  }
  async function addNote() {
    if (!note.trim()) return;
    await supabase.from("aform_lead_notes").insert({ lead_id: id, user_id: user!.id, note });
    setNote("");
    qc.invalidateQueries({ queryKey: ["lead", id] });
  }
  function whatsapp() {
    if (!lead!.phone) return;
    const phone = lead!.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  }
  function copySummary() {
    const lines = [
      `Lead: ${lead!.name}`, `Telefone: ${lead!.phone}`, `E-mail: ${lead!.email}`,
      `Formulário: ${lead!.forms?.name}`, `Status: ${lead!.status}`, `Temperatura: ${lead!.temperature}`,
      "", "Respostas:",
      ...(lead!.lead_answers ?? []).map((a:any) => `- ${a.form_questions?.question_text}: ${a.answer_value}`),
    ].join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Resumo copiado");
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={()=>nav({to:"/aplix-form/leads"})}><ArrowLeft className="size-4 mr-1"/>Voltar</Button>
        <h1 className="text-2xl font-bold tracking-tight flex-1">{lead.name || "Lead sem nome"}</h1>
        <Button variant="outline" onClick={whatsapp} disabled={!lead.phone}><MessageCircle className="size-4 mr-2"/>WhatsApp</Button>
        <Button variant="outline" onClick={()=>{navigator.clipboard.writeText(lead.phone ?? "");toast.success("Telefone copiado")}}><Copy className="size-4 mr-2"/>Copiar telefone</Button>
        <Button variant="outline" onClick={copySummary}>Copiar resumo</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Respostas do formulário</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(lead.lead_answers ?? []).map((a:any) => (
              <div key={a.id} className="border-l-2 border-indigo-500 pl-3">
                <div className="text-xs text-muted-foreground">{a.form_questions?.question_text}</div>
                <div className="font-medium">{a.answer_value}</div>
              </div>
            ))}
            {(lead.lead_answers ?? []).length === 0 && <div className="text-sm text-muted-foreground">Sem respostas registradas.</div>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Telefone" value={lead.phone}/>
              <Row label="E-mail" value={lead.email}/>
              <Row label="Formulário" value={lead.forms?.name}/>
              <Row label="Entrada" value={format(new Date(lead.created_at),"dd/MM/yyyy HH:mm")}/>
              <Row label="Atualizado" value={format(new Date(lead.updated_at),"dd/MM/yyyy HH:mm")}/>
              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <Select value={lead.status} onValueChange={v=>update({status:v},"status_change",lead.status)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{statusOptions.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Temperatura</div>
                <Select value={lead.temperature ?? ""} onValueChange={v=>update({temperature:v},"temperature_change",lead.temperature ?? undefined)}>
                  <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frio">Frio</SelectItem><SelectItem value="morno">Morno</SelectItem>
                    <SelectItem value="quente">Quente</SelectItem><SelectItem value="muito_quente">Muito quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1">Tags</div>
                <div className="flex gap-1 flex-wrap">
                  {(lead.lead_tags ?? []).map((t:any)=><Badge key={t.id} variant="secondary">{t.tag_name}</Badge>)}
                  {(lead.lead_tags ?? []).length === 0 && <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Nova observação interna…" value={note} onChange={e=>setNote(e.target.value)} />
              <Button size="sm" onClick={addNote}><Plus className="size-4 mr-1"/>Adicionar</Button>
              <div className="space-y-2 pt-2">
                {(lead.lead_notes ?? []).map((n:any) => (
                  <div key={n.id} className="text-sm border-l-2 border-muted-foreground/30 pl-3">
                    <div>{n.note}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(n.created_at),"dd/MM HH:mm")}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {(lead.lead_events ?? []).map((e:any)=>(
                <div key={e.id} className="flex justify-between"><span>{e.event_type}: {e.old_value} → {e.new_value}</span><span className="text-muted-foreground">{format(new Date(e.created_at),"dd/MM HH:mm")}</span></div>
              ))}
              {(lead.lead_events ?? []).length === 0 && <span className="text-muted-foreground">Sem eventos.</span>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({label,value}:{label:string;value:any}) {
  return <div className="flex justify-between gap-2"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value || "—"}</span></div>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Copy, Plus, Mail, Phone, FileText, Calendar, Tag } from "lucide-react";
import { differenceInHours, format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aplix-form/kanban")({ component: Kanban });

const cols = [
  { v: "novo", l: "Novo" },
  { v: "em_atendimento", l: "Em atendimento" },
  { v: "qualificado", l: "Qualificado" },
  { v: "agendado", l: "Agendado" },
  { v: "comprou", l: "Comprou" },
  { v: "perdido", l: "Perdido" },
  { v: "sem_resposta", l: "Sem resposta" },
];

const statusOptions: [string, string][] = [
  ["novo","Novo"],["em_atendimento","Em atendimento"],["qualificado","Qualificado"],
  ["agendado","Agendado"],["comprou","Comprou"],["perdido","Perdido"],
  ["sem_resposta","Sem resposta"],["nao_qualificado","Não qualificado"],["aguardando","Aguardando"],
];

const tempColor: Record<string,string> = {
  frio: "bg-blue-500", morno: "bg-amber-500", quente: "bg-orange-500", muito_quente: "bg-red-500",
};
const tempLabel: Record<string,string> = {
  frio: "Frio", morno: "Morno", quente: "Quente", muito_quente: "Muito quente",
};

function Kanban() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: leads = [] } = useQuery({
    queryKey: ["kanban-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_leads")
        .select("*, forms:aform_forms(name), lead_tags:aform_lead_tags(tag_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  async function onDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const lead = leads.find((l:any)=>l.id===id);
    if (!lead || lead.status === status) return;
    const { error } = await supabase.from("aform_leads").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("aform_lead_events").insert({ lead_id: id, event_type: "status_change", old_value: lead.status, new_value: status });
    qc.invalidateQueries({ queryKey: ["kanban-leads"] });
  }

  return (
    <div className="p-6 space-y-4 h-screen flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kanban Comercial</h1>
        <p className="text-sm text-muted-foreground">Arraste leads entre as colunas para mudar o status. Clique para ver detalhes.</p>
      </div>
      <div className="flex gap-3 overflow-x-auto flex-1 pb-4">
        {cols.map(col => {
          const items = leads.filter((l:any)=>l.status===col.v);
          return (
            <div key={col.v} className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-lg p-2"
              onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,col.v)}>
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <div className="font-semibold text-sm">{col.l}</div>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1">
                {items.map((l:any) => {
                  const hrs = differenceInHours(new Date(), new Date(l.updated_at));
                  const stale = hrs > 48 ? "border-red-300 bg-red-50" : hrs > 24 ? "border-amber-300 bg-amber-50" : "bg-card";
                  return (
                    <Card key={l.id}
                      draggable onDragStart={e=>e.dataTransfer.setData("text/plain",l.id)}
                      onClick={()=>setOpenId(l.id)}
                      className={`p-3 cursor-pointer border ${stale} hover:shadow transition`}>
                      <div className="flex items-start gap-2">
                        {l.temperature && <span className={`size-2 rounded-full mt-1.5 ${tempColor[l.temperature]}`}/>}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{l.name || "Sem nome"}</div>
                          <div className="text-xs text-muted-foreground truncate">{l.phone || l.email}</div>
                          <div className="text-xs text-muted-foreground truncate">{l.forms?.name}</div>
                          {l.lead_tags?.[0] && <Badge variant="secondary" className="text-[10px] mt-1">{l.lead_tags[0].tag_name}</Badge>}
                          <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(l.created_at),"dd/MM HH:mm")}</div>
                        </div>
                        {l.phone && (
                          <Button size="icon" variant="ghost" className="size-7" onClick={(e)=>{e.stopPropagation();window.open(`https://wa.me/${l.phone.replace(/\D/g,'')}`,"_blank")}}>
                            <MessageCircle className="size-3.5"/>
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Vazio</div>}
              </div>
            </div>
          );
        })}
      </div>

      <LeadDialog leadId={openId} onClose={()=>setOpenId(null)} />
    </div>
  );
}

function LeadDialog({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [note, setNote] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_leads")
        .select("*, forms:aform_forms(name), lead_answers:aform_lead_answers(*, form_questions:aform_questions(question_text, field_type, order_index)), lead_tags:aform_lead_tags(*), lead_notes:aform_lead_notes(*), lead_events:aform_lead_events(*)")
        .eq("id", leadId!).single();
      if (error) throw error; return data;
    },
  });

  async function update(patch: any, eventType?: string, oldV?: string) {
    if (!leadId) return;
    const { error } = await supabase.from("aform_leads").update(patch).eq("id", leadId);
    if (error) return toast.error(error.message);
    if (eventType) {
      await supabase.from("aform_lead_events").insert({
        lead_id: leadId, event_type: eventType, old_value: oldV ?? null,
        new_value: String(Object.values(patch)[0]),
      });
    }
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    qc.invalidateQueries({ queryKey: ["kanban-leads"] });
  }

  async function addNote() {
    if (!note.trim() || !leadId) return;
    await supabase.from("aform_lead_notes").insert({ lead_id: leadId, user_id: user!.id, note });
    setNote("");
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
  }

  function whatsapp() {
    if (!lead?.phone) return;
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, "")}`, "_blank");
  }

  function copySummary() {
    if (!lead) return;
    const lines = [
      `Lead: ${lead.name || "—"}`, `Telefone: ${lead.phone || "—"}`, `E-mail: ${lead.email || "—"}`,
      `Formulário: ${lead.forms?.name || "—"}`, `Status: ${lead.status}`, `Temperatura: ${lead.temperature || "—"}`,
      "", "Respostas:",
      ...(lead.lead_answers ?? []).map((a:any) => `- ${a.form_questions?.question_text}: ${a.answer_value}`),
    ].join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Resumo copiado");
  }

  const answers = ((lead?.lead_answers ?? []) as any[]).slice().sort(
    (a,b) => (a.form_questions?.order_index ?? 0) - (b.form_questions?.order_index ?? 0)
  );

  return (
    <Dialog open={!!leadId} onOpenChange={(o)=>!o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {isLoading || !lead ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-base shrink-0">
                  {(lead.name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl truncate">{lead.name || "Lead sem nome"}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {lead.temperature && (
                      <Badge variant="outline" className="gap-1.5">
                        <span className={`size-2 rounded-full ${tempColor[lead.temperature]}`} />
                        {tempLabel[lead.temperature]}
                      </Badge>
                    )}
                    <Badge variant="secondary">{statusOptions.find(([v])=>v===lead.status)?.[1] ?? lead.status}</Badge>
                    {lead.forms?.name && <span className="text-xs text-muted-foreground">· {lead.forms.name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button size="sm" variant="outline" onClick={whatsapp} disabled={!lead.phone}>
                  <MessageCircle className="size-4 mr-2"/>WhatsApp
                </Button>
                <Button size="sm" variant="outline" disabled={!lead.phone}
                  onClick={()=>{navigator.clipboard.writeText(lead.phone ?? "");toast.success("Telefone copiado")}}>
                  <Copy className="size-4 mr-2"/>Telefone
                </Button>
                <Button size="sm" variant="outline" onClick={copySummary}>
                  <Copy className="size-4 mr-2"/>Resumo
                </Button>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoTile icon={<Phone className="size-3.5"/>} label="Telefone" value={lead.phone}/>
                <InfoTile icon={<Mail className="size-3.5"/>} label="E-mail" value={lead.email}/>
                <InfoTile icon={<FileText className="size-3.5"/>} label="Formulário" value={lead.forms?.name}/>
                <InfoTile icon={<Calendar className="size-3.5"/>} label="Entrada" value={format(new Date(lead.created_at),"dd/MM/yyyy HH:mm")}/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Status</div>
                  <Select value={lead.status} onValueChange={v=>update({status:v},"status_change",lead.status)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{statusOptions.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Temperatura</div>
                  <Select value={lead.temperature ?? ""} onValueChange={v=>update({temperature:v},"temperature_change",lead.temperature ?? undefined)}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frio">Frio</SelectItem><SelectItem value="morno">Morno</SelectItem>
                      <SelectItem value="quente">Quente</SelectItem><SelectItem value="muito_quente">Muito quente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(lead.lead_tags ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5"><Tag className="size-3"/>Tags</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(lead.lead_tags ?? []).map((t:any)=><Badge key={t.id} variant="secondary">{t.tag_name}</Badge>)}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Respostas do formulário</div>
                <div className="space-y-2.5 rounded-lg border bg-muted/30 p-4">
                  {answers.length === 0 && <div className="text-sm text-muted-foreground">Sem respostas registradas.</div>}
                  {answers.map((a:any) => (
                    <div key={a.id} className="border-l-2 border-primary/60 pl-3">
                      <div className="text-xs text-muted-foreground">{a.form_questions?.question_text}</div>
                      <div className="font-medium text-sm">{a.answer_value || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Observações</div>
                <div className="space-y-2">
                  <Textarea placeholder="Nova observação interna…" value={note} onChange={e=>setNote(e.target.value)} rows={2}/>
                  <Button size="sm" onClick={addNote}><Plus className="size-4 mr-1"/>Adicionar</Button>
                </div>
                <div className="space-y-2 mt-3">
                  {(lead.lead_notes ?? []).map((n:any) => (
                    <div key={n.id} className="text-sm border-l-2 border-muted-foreground/30 pl-3">
                      <div>{n.note}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(n.created_at),"dd/MM HH:mm")}</div>
                    </div>
                  ))}
                  {(lead.lead_notes ?? []).length === 0 && <div className="text-xs text-muted-foreground">Nenhuma observação.</div>}
                </div>
              </div>

              {(lead.lead_events ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Histórico</div>
                  <div className="space-y-1 text-xs rounded-lg border bg-muted/30 p-3">
                    {(lead.lead_events ?? []).map((e:any)=>(
                      <div key={e.id} className="flex justify-between gap-2">
                        <span className="truncate">{e.event_type}: {e.old_value || "—"} → {e.new_value || "—"}</span>
                        <span className="text-muted-foreground shrink-0">{format(new Date(e.created_at),"dd/MM HH:mm")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-sm font-medium mt-0.5 truncate">{value || "—"}</div>
    </div>
  );
}

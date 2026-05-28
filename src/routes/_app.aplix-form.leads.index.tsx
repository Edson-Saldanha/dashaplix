import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_app/aplix-form/leads/")({ component: LeadsPage });

const statusLabels: Record<string,string> = {
  novo: "Novo", em_atendimento: "Em atendimento", qualificado: "Qualificado",
  agendado: "Agendado", comprou: "Comprou", perdido: "Perdido", sem_resposta: "Sem resposta",
  nao_qualificado: "Não qualificado", aguardando: "Aguardando atendimento",
};
const tempColors: Record<string,string> = {
  frio: "bg-blue-100 text-blue-700", morno: "bg-amber-100 text-amber-700",
  quente: "bg-orange-100 text-orange-700", muito_quente: "bg-red-100 text-red-700",
};

function LeadsPage() {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [tempF, setTempF] = useState("all");
  const [formF, setFormF] = useState("all");

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("aform_leads")
        .select("*, forms:aform_forms(name), lead_tags:aform_lead_tags(tag_name)")
        .order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const { data: forms = [] } = useQuery({
    queryKey: ["forms-min"],
    queryFn: async () => (await supabase.from("aform_forms").select("id,name")).data ?? [],
  });

  const filtered = useMemo(() => leads.filter((l: any) => {
    if (statusF !== "all" && l.status !== statusF) return false;
    if (tempF !== "all" && l.temperature !== tempF) return false;
    if (formF !== "all" && l.form_id !== formF) return false;
    if (q) {
      const s = q.toLowerCase();
      return [l.name, l.phone, l.email].some(v => v?.toLowerCase().includes(s));
    }
    return true;
  }), [leads, q, statusF, tempF, formF]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} de {leads.length} leads</p>
      </div>
      <Card><CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="relative md:col-span-2">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <Input className="pl-9" placeholder="Buscar por nome, telefone, e-mail…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(statusLabels).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tempF} onValueChange={setTempF}>
          <SelectTrigger><SelectValue placeholder="Temperatura"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="frio">Frio</SelectItem><SelectItem value="morno">Morno</SelectItem>
            <SelectItem value="quente">Quente</SelectItem><SelectItem value="muito_quente">Muito quente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={formF} onValueChange={setFormF}>
          <SelectTrigger><SelectValue placeholder="Formulário"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos formulários</SelectItem>
            {forms.map((f:any)=><SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>E-mail</TableHead>
            <TableHead>Formulário</TableHead><TableHead>Status</TableHead><TableHead>Temp.</TableHead>
            <TableHead>Tags</TableHead><TableHead>Entrada</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((l:any) => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-muted/40" onClick={()=>window.location.assign(`/leads/${l.id}`)}>
                <TableCell className="font-medium"><Link to="/aplix-form/leads/$id" params={{id:l.id}}>{l.name || "—"}</Link></TableCell>
                <TableCell>{l.phone || "—"}</TableCell>
                <TableCell className="text-xs">{l.email || "—"}</TableCell>
                <TableCell className="text-xs">{l.forms?.name}</TableCell>
                <TableCell><Badge variant="secondary">{statusLabels[l.status] ?? l.status}</Badge></TableCell>
                <TableCell>{l.temperature && <Badge variant="secondary" className={tempColors[l.temperature]}>{l.temperature}</Badge>}</TableCell>
                <TableCell className="text-xs">{(l.lead_tags ?? []).map((t:any)=>t.tag_name).join(", ")}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at),"dd/MM HH:mm")}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

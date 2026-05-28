import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/webhooks")({
  component: WebhooksPage,
});

function WebhooksPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["webhook_events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("webhook_events").select("*").order("received_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("webhook_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Evento excluído");
    qc.invalidateQueries({ queryKey: ["webhook_events"] });
  };

  const deleteAll = async () => {
    const { error } = await supabase.from("webhook_events").delete().not("id", "is", null);
    if (error) return toast.error(error.message);
    toast.success("Todos os eventos foram excluídos");
    qc.invalidateQueries({ queryKey: ["webhook_events"] });
  };

  return (
    <div>
      <PageHeader title="Eventos Webhook" description="Histórico bruto de payloads recebidos" actions={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!data?.length}>
              <Trash2 className="h-4 w-4 mr-2" /> Limpar todos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir todos os eventos?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso remove permanentemente todos os registros de webhook recebidos. As vendas já registradas <strong>não</strong> serão afetadas. Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAll}>Excluir tudo</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      } />
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Recebido em</TableHead><TableHead>Plataforma</TableHead><TableHead>Evento</TableHead>
            <TableHead>Processado</TableHead><TableHead>Erro</TableHead><TableHead className="w-[60px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && (data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum evento ainda</TableCell></TableRow>}
            {(data ?? []).map(e => (
              <TableRow key={e.id}>
                <TableCell>{fmtDateTime(e.received_at)}</TableCell>
                <TableCell><Badge variant="secondary">{e.platform}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{e.event_type ?? "-"}</TableCell>
                <TableCell>{e.processed
                  ? <Badge variant="outline" className="bg-success/15 text-success border-success/30">OK</Badge>
                  : <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30">Pendente</Badge>}</TableCell>
                <TableCell className="text-destructive text-xs">{e.processing_error ?? "-"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => deleteOne(e.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

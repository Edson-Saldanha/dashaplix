import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Copy, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/integracoes")({
  component: IntegracoesPage,
});

function randomToken(len = 32) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 8);
}

function IntegracoesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<string>("kiwify");
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integrations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!platform) return toast.error("Selecione a plataforma");
    const finalName = name.trim() || (platform === "kiwify" ? "Kiwify" : platform === "hotmart" ? "Hotmart" : platform === "green" ? "Green" : "Plataforma");
    const slugBase = platform === "outra" ? slugify(finalName) : `${platform}-${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await supabase.from("integrations").insert({
      platform_name: finalName, webhook_slug: slugBase, security_token: randomToken(),
      is_active: true, created_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Integração criada");
    setOpen(false); setName(""); setPlatform("kiwify");
    qc.invalidateQueries({ queryKey: ["integrations"] });
  };

  const toggleActive = async (id: string, v: boolean) => {
    await supabase.from("integrations").update({ is_active: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["integrations"] });
  };

  const removeIntegration = async (id: string) => {
    // Apaga eventos vinculados primeiro (se houver) e depois a integração
    const { error: evErr } = await supabase.from("webhook_events").delete().eq("integration_id", id);
    if (evErr) return toast.error(evErr.message);
    const { error } = await supabase.from("integrations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Integração excluída");
    qc.invalidateQueries({ queryKey: ["integrations"] });
    qc.invalidateQueries({ queryKey: ["webhook_events"] });
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copiado!"); };

  return (
    <div>
      <PageHeader title="Integrações" description="Gere URLs de webhook para Kiwify, Hotmart ou plataformas próprias" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nova integração</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova integração</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Plataforma *</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kiwify">Kiwify</SelectItem>
                    <SelectItem value="hotmart">Hotmart</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nome / apelido (opcional)</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Curso X" />
              </div>
              <p className="text-xs text-muted-foreground">Uma URL única e um token de segurança serão gerados automaticamente.</p>
            </div>
            <DialogFooter><Button onClick={submit}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Plataforma</TableHead><TableHead>Webhook URL</TableHead><TableHead>Token</TableHead>
            <TableHead>Eventos</TableHead><TableHead>Último recebimento</TableHead><TableHead>Ativa</TableHead><TableHead className="w-[60px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && (data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma integração criada</TableCell></TableRow>}
            {(data ?? []).map(i => {
              const url = `${baseUrl}/api/public/webhooks/${i.webhook_slug}?token=${i.security_token}`;
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.platform_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[280px]">{url}</code>
                      <Button size="icon" variant="ghost" onClick={() => copy(url)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{i.security_token.slice(0, 12)}…</code>
                      <Button size="icon" variant="ghost" onClick={() => copy(i.security_token)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{i.events_count}</Badge></TableCell>
                  <TableCell className="text-sm">{i.last_received_at ? fmtDateTime(i.last_received_at) : "-"}</TableCell>
                  <TableCell><Switch checked={i.is_active} onCheckedChange={(v) => toggleActive(i.id, v)} /></TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Excluir integração">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir integração "{i.platform_name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso invalida a URL e o token do webhook — qualquer plataforma que ainda envie eventos para esta URL passará a receber erro. Os eventos já recebidos desta integração também serão excluídos. As vendas já registradas <strong>não</strong> serão afetadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeIntegration(i.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-5 mt-4">
        <h3 className="font-medium mb-2">Como integrar</h3>
        <p className="text-sm text-muted-foreground">Configure o webhook da plataforma (Kiwify, Hotmart, etc.) com a URL completa gerada acima. Ela já inclui o token de segurança no final. Eventos recebidos aparecem em <strong>Eventos Webhook</strong> e geram registros em <strong>Vendas</strong>.</p>
      </Card>
    </div>
  );
}

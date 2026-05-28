import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncMetaAds } from "@/lib/meta-ads.functions";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { RefreshCw, TrendingUp, MousePointerClick, Eye } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_app/trafego-pago")({
  component: TrafegoPagoPage,
});

function TrafegoPagoPage() {
  const qc = useQueryClient();
  const sync = useServerFn(syncMetaAds);
  const [accountInput, setAccountInput] = useState("");
  const [days, setDays] = useState(30);
  const [syncing, setSyncing] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["meta_ads_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_ads_config")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const accountId = config?.ad_account_id ?? "";

  const { data: spend = [] } = useQuery({
    queryKey: ["meta_ads_spend", accountId, days],
    enabled: !!accountId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days + 1);
      const { data, error } = await supabase
        .from("meta_ads_spend")
        .select("*")
        .eq("ad_account_id", accountId)
        .gte("spend_date", since.toISOString().slice(0, 10))
        .order("spend_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = spend.reduce((a, r) => a + Number(r.spend), 0);
  const totalImp = spend.reduce((a, r) => a + Number(r.impressions), 0);
  const totalClk = spend.reduce((a, r) => a + Number(r.clicks), 0);
  const cpc = totalClk > 0 ? total / totalClk : 0;
  const cpm = totalImp > 0 ? (total / totalImp) * 1000 : 0;

  const handleSync = async () => {
    const id = (accountInput || accountId).trim();
    if (!id) return toast.error("Informe o ID da conta de anúncios (ex: act_123456789)");
    setSyncing(true);
    try {
      const r = await sync({ data: { adAccountId: id, days } });
      if (r.ok) {
        toast.success(`${r.days_synced} dia(s) sincronizado(s)`);
        setAccountInput("");
        qc.invalidateQueries({ queryKey: ["meta_ads_config"] });
        qc.invalidateQueries({ queryKey: ["meta_ads_spend"] });
      } else {
        toast.error(`Erro: ${r.error}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na sincronização");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tráfego Pago"
        description="Acompanhe seus gastos com anúncios da Meta (Facebook & Instagram)"
        actions={
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar agora"}
          </Button>
        }
      />

      <Card className="p-5 mb-6">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5 md:col-span-2">
            <Label>ID da conta de anúncios</Label>
            <Input
              placeholder={accountId || "act_123456789"}
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {accountId
                ? <>Conta atual: <code className="bg-muted px-1.5 py-0.5 rounded">{accountId}</code> · Última sync: {config?.last_synced_at ? fmtDateTime(config.last_synced_at) : "nunca"}</>
                : "Cole o ID da sua conta (Ads Manager → canto superior esquerdo)"}
            </p>
            {config?.last_sync_error && (
              <p className="text-xs text-destructive">Último erro: {config.last_sync_error}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Período</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={14}>Últimos 14 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Investimento total" value={brl(total)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Impressões" value={totalImp.toLocaleString("pt-BR")} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Cliques" value={totalClk.toLocaleString("pt-BR")} icon={<MousePointerClick className="h-4 w-4" />} />
        <StatCard label="CPC médio" value={brl(cpc)} sub={`CPM ${brl(cpm)}`} />
      </div>

      <Card className="p-5 mb-6">
        <h3 className="font-medium mb-4">Gasto diário</h3>
        <div className="h-72">
          {spend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Nenhum dado ainda. Configure a conta e clique em "Sincronizar agora".
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spend.map((r) => ({ date: fmtDate(r.spend_date), spend: Number(r.spend) }))}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => brl(v)} width={90} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Area type="monotone" dataKey="spend" stroke="hsl(var(--primary))" fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">Alcance</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead>Moeda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spend.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Sem registros
                </TableCell>
              </TableRow>
            )}
            {[...spend].reverse().map((r) => {
              const c = Number(r.clicks);
              const cpcRow = c > 0 ? Number(r.spend) / c : 0;
              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.spend_date)}</TableCell>
                  <TableCell className="text-right font-medium">{brl(Number(r.spend))}</TableCell>
                  <TableCell className="text-right">{Number(r.impressions).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{c.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Number(r.reach).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{brl(cpcRow)}</TableCell>
                  <TableCell><Badge variant="secondary">{r.currency ?? "—"}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatCard({
  label, value, sub, icon,
}: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

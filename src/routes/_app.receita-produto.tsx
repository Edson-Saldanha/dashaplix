import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import { Download, Package, TrendingUp, ShoppingBag } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/receita-produto")({
  ssr: false,
  component: ReceitaProdutoPage,
});

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "month", label: "Mês atual" },
  { value: "all", label: "Todos os períodos" },
] as const;

const COLORS = [
  "hsl(245 75% 62%)",
  "hsl(280 70% 60%)",
  "hsl(200 85% 55%)",
  "hsl(160 70% 45%)",
  "hsl(35 90% 55%)",
  "hsl(0 75% 60%)",
  "hsl(180 65% 45%)",
  "hsl(310 65% 58%)",
];

function ReceitaProdutoPage() {
  const [platform, setPlatform] = useState<string>("all");
  const [period, setPeriod] = useState<string>("7");

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
  });

  const platforms = useMemo(
    () => Array.from(new Set((sales ?? []).map((s) => s.platform))),
    [sales],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    if (period === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period !== "all") {
      const days = Number(period);
      from = new Date(now.getTime() - days * 86400000);
    }
    return (sales ?? []).filter((s) => {
      if (s.status && s.status !== "aprovada") return false;
      if (platform !== "all" && s.platform !== platform) return false;
      if (from && new Date(s.sale_date) < from) return false;
      return true;
    });
  }, [sales, platform, period]);

  const products = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; net: number; count: number }>();
    for (const s of filtered) {
      const key = s.product_name || "—";
      const cur = map.get(key) ?? { name: key, revenue: 0, net: 0, count: 0 };
      cur.revenue += Number(s.gross_amount ?? 0);
      cur.net += Number(s.net_amount ?? 0);
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
  const totalSales = products.reduce((s, p) => s + p.count, 0);

  const chartData = products.slice(0, 12).map((p) => ({
    name: p.name.length > 22 ? p.name.slice(0, 22) + "…" : p.name,
    fullName: p.name,
    revenue: Number(p.revenue.toFixed(2)),
  }));

  const exportCSV = () => {
    if (products.length === 0) return toast.error("Nada para exportar.");
    const header = "Produto,# de vendas,Receita,% das vendas\n";
    const rows = products
      .map((p) => {
        const pct = totalRevenue ? ((p.revenue / totalRevenue) * 100).toFixed(2) : "0";
        const safe = p.name.replace(/"/g, '""');
        return `"${safe}",${p.count},${p.revenue.toFixed(2)},${pct}%`;
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receita-por-produto-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado");
  };

  return (
    <div>
      <PageHeader
        title="Receita por produto"
        description="Performance de vendas por produto, com receita bruta e participação"
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Card className="p-5 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Receita total</p>
              <p className="text-2xl font-bold mt-1">{brl(totalRevenue)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground"># de vendas</p>
              <p className="text-2xl font-bold mt-1">{totalSales}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-fuchsia-50 to-white border-fuchsia-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Produtos ativos</p>
              <p className="text-2xl font-bold mt-1">{products.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-fuchsia-500 text-white flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Chart card */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold">Distribuição de receita</h2>
            <p className="text-xs text-muted-foreground">Top 12 produtos por receita bruta</p>
          </div>
          <div className="flex gap-2">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas plataformas</SelectItem>
                {platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-[340px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Nenhuma venda no período</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <defs>
                  {COLORS.map((c, i) => (
                    <linearGradient key={i} id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-32}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval={0}
                  axisLine={{ stroke: "rgba(99,102,241,0.2)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR")}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    fontSize: 12,
                    boxShadow: "0 8px 24px -8px rgba(0,0,0,0.18)",
                  }}
                  formatter={(value: number) => [brl(value), "Receita"]}
                  labelFormatter={(_, payload) => (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ""}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`url(#bar-${i % COLORS.length})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Detalhamento por produto</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right"># de vendas</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
              <TableHead className="text-right w-[200px]">% das vendas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && products.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum produto vendido no período.</TableCell></TableRow>
            )}
            {products.map((p, i) => {
              const pct = totalRevenue ? (p.revenue / totalRevenue) * 100 : 0;
              return (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{p.count}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700">{brl(p.revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{brl(p.net)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-14 text-right">{pct.toFixed(2)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

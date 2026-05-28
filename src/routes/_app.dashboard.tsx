import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brl, fmtDate } from "@/lib/format";
import type { DateRange } from "react-day-picker";
import { useMemo, useState } from "react";
import { Zap, Trophy, CalendarRange } from "lucide-react";


export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfMonth(d = new Date()) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

type RangePreset = "day" | "week" | "30d" | "custom";

const PLATFORM_BAR: Record<string, string> = {
  hotmart: "bg-[#0c2340]",
  kiwify: "bg-emerald-600",
  green: "bg-emerald-500",
  manual: "bg-slate-400",
};
const PLATFORM_DOT: Record<string, string> = {
  hotmart: "bg-[#0c2340]",
  kiwify: "bg-emerald-600",
  green: "bg-emerald-500",
  manual: "bg-slate-400",
};
const CATEGORY_DOTS = [
  "bg-[#0c2340]",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
];

function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile-self", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, email").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  const firstName = (profile?.full_name?.trim() || user?.email || "").split(/\s+|@/)[0];

  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: startOfDay(),
    to: new Date(),
  });

  const range = useMemo(() => {
    const now = new Date();
    if (preset === "day") return { from: startOfDay(now), to: endOfDay(now), label: "Hoje" };
    if (preset === "week") return { from: startOfDay(addDays(now, -7)), to: endOfDay(now), label: "Últimos 7 dias" };
    if (preset === "30d") return { from: startOfDay(addDays(now, -29)), to: endOfDay(now), label: "Últimos 30 dias" };
    const f = customRange?.from ? startOfDay(customRange.from) : startOfDay(now);
    const t = customRange?.to ? endOfDay(customRange.to) : endOfDay(customRange?.from ?? now);
    return { from: f, to: t, label: `${fmtDate(f)} – ${fmtDate(t)}` };
  }, [preset, customRange]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", preset, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();
      const fromDate = toISODate(range.from);
      const toDate = toISODate(range.to);
      const monthStart = startOfMonth().toISOString();
      const monthStartDate = toISODate(startOfMonth());

      const [salesRange, salesMonth, salesAll, expensesRange, expensesMonth, leadsCount, contractsCount] = await Promise.all([
        supabase.from("sales").select("gross_amount, net_amount, platform, traffic_source").gte("sale_date", fromISO).lte("sale_date", toISO).eq("status", "aprovada"),
        supabase.from("sales").select("gross_amount, net_amount, platform, product_name, traffic_source").gte("sale_date", monthStart).eq("status", "aprovada"),
        supabase.from("sales").select("gross_amount, platform, traffic_source").eq("status", "aprovada"),
        supabase.from("expenses").select("amount").gte("expense_date", fromDate).lte("expense_date", toDate),
        supabase.from("expenses").select("amount, category").gte("expense_date", monthStartDate),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      ]);

      const platformAll = new Map<string, { count: number; gross: number }>();
      (salesAll.data ?? []).forEach((r) => {
        const cur = platformAll.get(r.platform) ?? { count: 0, gross: 0 };
        platformAll.set(r.platform, { count: cur.count + 1, gross: cur.gross + Number(r.gross_amount ?? 0) });
      });

      const sumGross = (rows: any[]) => rows.reduce((s, r) => s + Number(r.gross_amount ?? 0), 0);
      const sumNet = (rows: any[]) => rows.reduce((s, r) => s + Number(r.net_amount ?? 0), 0);

      const salesRangeRows = salesRange.data ?? [];
      const salesMonthRows = salesMonth.data ?? [];

      const platformRange = new Map<string, { count: number; gross: number }>();
      salesRangeRows.forEach((r) => {
        const cur = platformRange.get(r.platform) ?? { count: 0, gross: 0 };
        platformRange.set(r.platform, { count: cur.count + 1, gross: cur.gross + Number(r.gross_amount ?? 0) });
      });

      const platformMonth = new Map<string, { count: number; gross: number }>();
      salesMonthRows.forEach((r) => {
        const cur = platformMonth.get(r.platform) ?? { count: 0, gross: 0 };
        platformMonth.set(r.platform, { count: cur.count + 1, gross: cur.gross + Number(r.gross_amount ?? 0) });
      });

      const productMonth = new Map<string, { count: number; gross: number }>();
      salesMonthRows.forEach((r) => {
        const cur = productMonth.get(r.product_name) ?? { count: 0, gross: 0 };
        productMonth.set(r.product_name, { count: cur.count + 1, gross: cur.gross + Number(r.gross_amount ?? 0) });
      });

      const expensesRangeTotal = (expensesRange.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const expensesMonthTotal = (expensesMonth.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

      const expByCategory = new Map<string, number>();
      (expensesMonth.data ?? []).forEach((r) => {
        expByCategory.set(r.category, (expByCategory.get(r.category) ?? 0) + Number(r.amount ?? 0));
      });

      const salesRangeNet = sumNet(salesRangeRows);
      const salesRangeGross = sumGross(salesRangeRows);
      const salesMonthGross = sumGross(salesMonthRows);
      const salesMonthNet = sumNet(salesMonthRows);
      const ticket = salesMonthRows.length ? salesMonthGross / salesMonthRows.length : 0;

      // Split orgânico vs pago: respeita traffic_source manual; Hotmart é sempre orgânico
      const isOrganic = (r: any) =>
        String(r.traffic_source ?? "pago") === "organico" || /hotmart/i.test(String(r.platform ?? ""));
      const organicRows = salesRangeRows.filter(isOrganic);
      const paidRows = salesRangeRows.filter((r) => !isOrganic(r));
      const organicGross = sumGross(organicRows);
      const organicNet = sumNet(organicRows);
      const paidGross = sumGross(paidRows);
      const paidNet = sumNet(paidRows);
      const paidTicket = paidRows.length ? paidGross / paidRows.length : 0;
      const organicTicket = organicRows.length ? organicGross / organicRows.length : 0;

      return {
        salesRangeCount: salesRangeRows.length,
        salesRangeGross, salesRangeNet,
        salesMonthCount: salesMonthRows.length,
        salesMonthGross, salesMonthNet,
        ticket,
        expensesRangeTotal, expensesMonthTotal,
        balanceRange: salesRangeNet - expensesRangeTotal,
        monthResult: salesMonthNet - expensesMonthTotal,
        paidCount: paidRows.length,
        paidGross, paidNet, paidTicket,
        paidBalance: paidNet - expensesRangeTotal,
        organicCount: organicRows.length,
        organicGross, organicNet, organicTicket,
        organicBalance: organicNet,
        leadsCount: leadsCount.count ?? 0,
        contractsCount: contractsCount.count ?? 0,
        platformsMonth: [...platformMonth.entries()].sort((a, b) => b[1].gross - a[1].gross),
        platformsRange: [...platformRange.entries()].sort((a, b) => b[1].gross - a[1].gross),
        platformsAll: [...platformAll.entries()].sort((a, b) => b[1].gross - a[1].gross),
        productsMonth: [...productMonth.entries()].sort((a, b) => b[1].gross - a[1].gross).slice(0, 6),
        expByCategory: [...expByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="-mx-6 -my-8 min-h-screen bg-slate-50 p-6 lg:p-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-slate-500">Carregando indicadores…</p>
      </div>
    );
  }

  const topPlatformMaxGross = Math.max(...data.platformsRange.map(([, v]) => v.gross), 1);
  const topPlatformAll = data.platformsAll[0];
  const topAllShare = topPlatformAll
    ? (topPlatformAll[1].gross / (data.platformsAll.reduce((s, [, v]) => s + v.gross, 0) || 1)) * 100
    : 0;
  const maxCategory = Math.max(...data.expByCategory.map(([, v]) => v), 1);

  const FilterBtn = ({ value, children }: { value: RangePreset; children: React.ReactNode }) => (
    <button
      onClick={() => setPreset(value)}
      className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all ${
        preset === value
          ? "bg-[#0c2340] text-white shadow-md"
          : "text-slate-500 hover:text-[#0c2340]"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="-mx-6 -my-8 min-h-[calc(100vh+4rem)] bg-slate-50 text-slate-800 p-6 lg:p-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-emerald-600 font-semibold tracking-[0.2em] uppercase text-[11px] mb-2">Dashboard Executivo · APLIX</p>
            <h1
              className="text-4xl md:text-5xl font-bold text-[#0c2340] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Olá{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="text-slate-500 text-sm mt-2 capitalize">
              {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date())}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <FilterBtn value="day">Hoje</FilterBtn>
              <FilterBtn value="week">Semana</FilterBtn>
              <FilterBtn value="30d">30 dias</FilterBtn>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setPreset("custom")}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all ${
                      preset === "custom"
                        ? "bg-[#0c2340] text-white shadow-md"
                        : "text-slate-500 hover:text-[#0c2340]"
                    }`}
                  >
                    Personalizado
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-slate-200" align="end">
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={customRange}
                    onSelect={(r) => { setCustomRange(r); setPreset("custom"); }}
                    defaultMonth={customRange?.from}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CalendarRange className="h-3 w-3" /> {range.label}
            </span>
          </div>
        </header>

        {/* MAIN BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-5">
          {/* HERO PAGO */}
          <BalanceHero
            kind="paid"
            label="Saldo · Tráfego Pago"
            sublabel={`${range.label} · ${data.paidCount} ${data.paidCount === 1 ? "venda" : "vendas"}`}
            balance={data.paidBalance}
            gross={data.paidGross}
            net={data.paidNet}
            expenses={data.expensesRangeTotal}
            ticket={data.paidTicket}
          />

          {/* HERO ORGÂNICO */}
          <BalanceHero
            kind="organic"
            label="Saldo · Orgânico"
            sublabel={`${range.label} · ${data.organicCount} ${data.organicCount === 1 ? "venda" : "vendas"}`}
            balance={data.organicBalance}
            gross={data.organicGross}
            net={data.organicNet}
            expenses={0}
            ticket={data.organicTicket}
          />


          {/* TOP PLATAFORMA */}
          <div className="md:col-span-4 lg:col-span-4 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-5 uppercase tracking-wider">Top Plataforma</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-2xl font-bold text-[#0c2340] capitalize truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {topPlatformAll?.[0] ?? "—"}
                  </h4>
                  <p className="text-slate-500 text-sm">
                    {topPlatformAll ? `Dominância de ${topAllShare.toFixed(1)}%` : "Sem vendas ainda"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Maior faturamento</span>
                <span className="text-emerald-600 font-bold">{topPlatformAll ? brl(topPlatformAll[1].gross) : "—"}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(topAllShare, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* MES ROW (movida para o topo) */}
          <div className="md:col-span-4 lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            <MonthCard label="Vendas do mês" value={brl(data.salesMonthGross)} hint={`${data.salesMonthCount} ${data.salesMonthCount === 1 ? "venda" : "vendas"}`} accent="indigo" />
            <MonthCard label="Gastos do mês" value={brl(data.expensesMonthTotal)} hint="Despesas lançadas" accent="rose" />
            <MonthCard label="Resultado do mês" value={brl(data.monthResult)} hint={data.monthResult >= 0 ? "Lucro líquido" : "Prejuízo"} accent={data.monthResult >= 0 ? "emerald" : "rose"} />
          </div>


          {/* VENDAS POR PLATAFORMA (mês) */}
          <div className="md:col-span-4 lg:col-span-5 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <div className="flex items-baseline justify-between mb-6">
              <h4 className="text-lg font-bold text-[#0c2340]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Vendas por Plataforma
              </h4>
              <span className="text-[11px] text-slate-400 uppercase tracking-widest">Mês atual</span>
            </div>
            {data.platformsMonth.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Sem vendas no mês.</p>
            ) : (
              <>
                <div className="flex items-end justify-between h-48 gap-3">
                  {data.platformsMonth.slice(0, 6).map(([name, v]) => {
                    const maxGross = data.platformsMonth[0]?.[1].gross || 1;
                    const h = Math.max((v.gross / maxGross) * 100, 6);
                    const color = PLATFORM_BAR[name.toLowerCase()] ?? "bg-slate-400";
                    return (
                      <div key={name} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group cursor-default">
                        <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {brl(v.gross)}
                        </span>
                        <div
                          className={`w-full ${color} rounded-t-xl hover:opacity-100 transition-all relative`}
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-4 gap-3">
                  {data.platformsMonth.slice(0, 6).map(([name]) => (
                    <span key={name} className="flex-1 text-center text-[10px] text-slate-500 uppercase font-bold tracking-widest truncate capitalize">
                      {name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* TOP PRODUTOS */}
          <div className="md:col-span-4 lg:col-span-4 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-[#0c2340] mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Top Produtos
            </h4>
            {data.productsMonth.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Sem produtos no mês.</p>
            ) : (
              <div className="space-y-5">
                {data.productsMonth.slice(0, 5).map(([name, v], i) => (
                  <div key={name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        i === 0
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        P{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0c2340] truncate">{name}</p>
                        <p className="text-[11px] text-slate-500">{v.count} {v.count === 1 ? "venda" : "vendas"}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${i === 0 ? "text-emerald-600" : "text-slate-600"}`}>
                      {brl(v.gross)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LEADS + CONTRATOS */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-5">
            <div className="flex-1 bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-2">Leads</p>
              <h5 className="text-4xl font-bold text-[#0c2340]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {data.leadsCount.toLocaleString("pt-BR")}
              </h5>
              <p className="text-emerald-600 text-xs mt-3 flex items-center gap-1">
                <Zap className="h-3 w-3" /> no período ({range.label})
              </p>
            </div>
            <div className="flex-1 bg-white rounded-[2rem] p-6 border border-emerald-200 shadow-sm">
              <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-2">Contratos Ativos</p>
              <h5 className="text-4xl font-bold text-[#0c2340]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {data.contractsCount.toLocaleString("pt-BR")}
              </h5>
              <p className="text-emerald-600 text-xs mt-3">em vigor agora</p>
            </div>
          </div>

          {/* PERIODO POR PLATAFORMA */}
          <div className="md:col-span-4 lg:col-span-5 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <div className="flex items-baseline justify-between mb-6">
              <h4 className="text-lg font-bold text-[#0c2340]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Período por Plataforma
              </h4>
              <span className="text-[11px] text-slate-400 uppercase tracking-widest">{range.label}</span>
            </div>
            {data.platformsRange.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Sem vendas no período.</p>
            ) : (
              <div className="space-y-5">
                {data.platformsRange.map(([name, v]) => {
                  const pct = (v.gross / topPlatformMaxGross) * 100;
                  const dot = PLATFORM_DOT[name.toLowerCase()] ?? "bg-slate-400";
                  const bar = PLATFORM_BAR[name.toLowerCase()] ?? "bg-slate-400";
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${dot}`} />
                          <span className="text-slate-700 capitalize font-medium">{name}</span>
                          <span className="text-slate-400">· {v.count} vds</span>
                        </div>
                        <span className="text-[#0c2340] font-bold">{brl(v.gross)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full`} style={{ width: `${Math.max(pct, 4)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GASTOS POR CATEGORIA */}
          <div className="md:col-span-4 lg:col-span-7 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-50 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-[#0c2340]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Gastos por Categoria
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">Mês atual · total {brl(data.expensesMonthTotal)}</p>
                </div>
                <span className="text-[11px] text-slate-400 uppercase tracking-widest">{data.expByCategory.length} categorias</span>
              </div>
              {data.expByCategory.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">Sem lançamentos no mês.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {data.expByCategory.map(([cat, v], i) => {
                    const pct = (v / maxCategory) * 100;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_DOTS[i % CATEGORY_DOTS.length]}`} />
                            <span className="text-slate-700 truncate uppercase tracking-wide font-medium">{cat}</span>
                          </div>
                          <span className="text-[#0c2340] font-bold shrink-0">{brl(v)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>



        </div>
      </div>
    </div>
  );
}

function BalanceHero({
  kind, label, sublabel, balance, gross, net, expenses, ticket,
}: {
  kind: "paid" | "organic";
  label: string;
  sublabel: string;
  balance: number;
  gross: number;
  net: number;
  expenses: number;
  ticket: number;
}) {
  const isPaid = kind === "paid";
  const isNegative = balance < 0;
  const bg = isNegative
    ? "bg-gradient-to-br from-[#5a0f1a] to-[#8a1d2b]"
    : isPaid
      ? "bg-gradient-to-br from-[#0c2340] to-[#1a3a5f]"
      : "bg-gradient-to-br from-emerald-700 to-emerald-900";
  const borderCls = isNegative ? "border-rose-900" : "border-[#0c2340]";
  const glow = isNegative ? "bg-rose-500/20" : isPaid ? "bg-emerald-500/15" : "bg-emerald-300/20";
  const subColor = isNegative ? "text-rose-200" : isPaid ? "text-emerald-300" : "text-emerald-200";
  const hintColor = isNegative ? "text-rose-100/80" : isPaid ? "text-emerald-100/70" : "text-emerald-50/80";
  return (
    <div className={`md:col-span-4 lg:col-span-4 ${bg} rounded-[2rem] p-8 border ${borderCls} relative overflow-hidden group shadow-xl`}>
      <div className={`absolute top-0 right-0 w-64 h-64 ${glow} blur-[100px] -mr-20 -mt-20 transition-all`} />
      <div className={`absolute bottom-0 left-0 w-64 h-64 ${isNegative ? "bg-rose-400/10" : "bg-emerald-400/10"} blur-[100px] -ml-20 -mb-20`} />

      <div className="relative z-10 flex flex-col h-full justify-between gap-10">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <p className={`${subColor} text-[11px] font-semibold mb-2 uppercase tracking-wider`}>{label}</p>
            <h3
              className={`text-4xl md:text-5xl font-bold tracking-tight leading-tight truncate pr-1 ${balance >= 0 ? "text-white" : "text-rose-400"}`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {brl(balance)}
            </h3>
            <p className={`${hintColor} text-xs mt-3`}>{sublabel}</p>
          </div>
          <span className={`shrink-0 px-3 py-1 border rounded-full text-[10px] font-bold ${
            balance >= 0
              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
              : "bg-rose-500/20 border-rose-400/40 text-rose-300"
          }`}>
            {balance >= 0 ? "Positivo" : "Negativo"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <KpiMini label="Bruto" value={brl(gross)} tone="white" />
          <KpiMini label="Recebido" value={brl(net)} tone="emerald" />
          {isPaid && <KpiMini label="Gastos" value={brl(expenses)} tone="rose" />}
          <KpiMini label="Ticket médio" value={brl(ticket)} tone="cyan" />
        </div>
      </div>
    </div>
  );
}

function KpiMini({ label, value, tone }: { label: string; value: string; tone: "white" | "emerald" | "rose" | "cyan" }) {
  const toneCls = {
    white: "text-white",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    cyan: "text-white",
  }[tone];
  return (
    <div className="space-y-1">
      <p className="text-emerald-100/70 text-[10px] uppercase tracking-widest font-medium">{label}</p>
      <p className={`text-lg md:text-xl font-semibold truncate ${toneCls}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </p>
    </div>
  );
}

function MonthCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: "indigo" | "rose" | "emerald" }) {
  const ring = {
    indigo: "border-slate-200",
    rose: "border-rose-200",
    emerald: "border-emerald-200",
  }[accent];
  const valueColor = {
    indigo: "text-[#0c2340]",
    rose: "text-rose-600",
    emerald: "text-emerald-600",
  }[accent];
  return (
    <div className={`bg-white rounded-[2rem] p-6 border ${ring} shadow-sm`}>
      <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-2">{label}</p>
      <p className={`text-3xl font-bold truncate ${valueColor}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </p>
      <p className="text-slate-500 text-xs mt-2">{hint}</p>
    </div>
  );
}


import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { brl, parseLocalDate } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Download, Target, CalendarIcon } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ComposedChart,
} from "recharts";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/_app/relatorios")({
  ssr: false,
  component: RelatoriosPage,
});

type Granularity = "day" | "week" | "month";
type RangePreset = "7" | "30" | "90" | "month" | "custom";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function fmtBucket(d: Date, g: Granularity) {
  if (g === "month") return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function bucketKey(d: Date, g: Granularity) {
  const b = g === "month" ? startOfMonth(d) : g === "week" ? startOfWeek(d) : startOfDay(d);
  return b.toISOString();
}
function fmtShortDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function RelatoriosPage() {
  const [preset, setPreset] = useState<RangePreset>("30");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [expenseCategory, setExpenseCategory] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const qc = useQueryClient();

  const { data: sales } = useQuery({
    queryKey: ["sales-rel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false }).limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses-rel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const range = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date = endOfDay(now);
    if (preset === "custom") {
      from = dateRange?.from ? startOfDay(dateRange.from) : null;
      to = dateRange?.to ? endOfDay(dateRange.to) : (dateRange?.from ? endOfDay(dateRange.from) : endOfDay(now));
    } else if (preset === "month") {
      from = startOfMonth(now);
    } else {
      from = startOfDay(new Date(now.getTime() - Number(preset) * 86400000));
    }
    return { from, to };
  }, [preset, dateRange]);

  // Normaliza para casar nomes parecidos: remove acentos, parênteses, pontuação.
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

  const productMatches = (candidate: string, target: string) => {
    const a = normalize(candidate);
    const b = normalize(target);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    const ta = a.split(" ").filter((t) => t.length >= 4);
    const tb = b.split(" ").filter((t) => t.length >= 4);
    if (!ta.length || !tb.length) return false;
    const shared = ta.filter((t) => tb.some((u) => u.startsWith(t.slice(0, 4)) || t.startsWith(u.slice(0, 4))));
    return shared.length >= Math.min(2, ta.length, tb.length);
  };

  const extractExpenseProduct = (e: { description?: string | null; category?: string | null }) => {
    const desc = e.description ?? "";
    const m = desc.match(/^Tráfego\s+—\s+([^·]+?)(?:\s+·|$)/);
    if (m) return m[1].trim();
    const cat = e.category ?? "";
    if (cat && cat !== "Outros" && cat !== "Tráfego") return cat;
    return "";
  };

  const productOptions = useMemo(() => {
    const fromSales = (sales ?? []).map((s) => s.product_name).filter(Boolean) as string[];
    const fromExpenses = (expenses ?? []).map((e) => extractExpenseProduct(e)).filter(Boolean);
    return Array.from(new Set([...fromSales, ...fromExpenses])).sort();
  }, [sales, expenses]);

  const platformOptions = useMemo(() => {
    const fromSales = (sales ?? []).map((s) => s.platform).filter(Boolean) as string[];
    const fromExpenses = (expenses ?? []).map((e) => e.platform).filter(Boolean) as string[];
    return Array.from(new Set([...fromSales, ...fromExpenses])).sort();
  }, [sales, expenses]);

  const platformMatches = (a?: string | null, b?: string | null) =>
    !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  const isOrganicPlatform = (p?: string | null) =>
    !!p && p.trim().toLowerCase() === "hotmart";

  // Tipos fixos (mesma lista usada em /gastos) — garante que MESTRE CLUB, ACELERA ADS etc.
  // apareçam mesmo sem gastos ainda lançados.
  const FIXED_CATEGORIES = [
    "MENTORIA", "MESTRE CLUB", "ACELERA ADS", "LISTA DE FORNECEDOR",
    "SUA LOJA DECORADA (PREMIUM)", "GESTÃO", "ENGAJAMENTO",
  ];
  const categories = useMemo(() => {
    const fromData = (expenses ?? []).map((e) => e.category).filter(Boolean) as string[];
    return Array.from(new Set([...FIXED_CATEGORIES, ...fromData]));
  }, [expenses]);

  const filteredSales = useMemo(() => {
    return (sales ?? []).filter((s) => {
      if (s.status && s.status !== "aprovada") return false;
      if (platformFilter !== "all" && !platformMatches(s.platform, platformFilter)) return false;
      // Categoria de gasto também filtra as vendas (cruza pelo nome do produto)
      if (expenseCategory !== "all" && !productMatches(s.product_name ?? "", expenseCategory)) return false;
      if (productFilter !== "all" && !productMatches(s.product_name ?? "", productFilter)) return false;
      const d = parseLocalDate(s.sale_date);
      if (range.from && d < range.from) return false;
      if (d > range.to) return false;
      return true;
    });
  }, [sales, range, productFilter, expenseCategory, platformFilter]);

  const filteredExpenses = useMemo(() => {
    return (expenses ?? []).filter((e) => {
      // Hotmart é orgânico — nunca conta como gasto
      if (isOrganicPlatform(e.platform)) return false;
      if (platformFilter !== "all") {
        if (isOrganicPlatform(platformFilter)) return false;
        if (!platformMatches(e.platform, platformFilter)) return false;
      }
      if (expenseCategory !== "all") {
        // Casa pela categoria OU pelo produto extraído (alguns gastos antigos têm category="Tráfego")
        const matchCat = e.category === expenseCategory;
        const matchProd = productMatches(extractExpenseProduct(e), expenseCategory);
        if (!matchCat && !matchProd) return false;
      }
      if (productFilter !== "all") {
        const haystack = `${extractExpenseProduct(e)} ${e.category ?? ""} ${e.description ?? ""}`;
        if (!productMatches(haystack, productFilter)) return false;
      }
      const d = parseLocalDate(e.expense_date);
      if (range.from && d < range.from) return false;
      if (d > range.to) return false;
      return true;
    });
  }, [expenses, range, expenseCategory, productFilter, platformFilter]);



  const totalRevenue = filteredSales.reduce((s, x) => s + Number(x.gross_amount ?? 0), 0);
  const totalNet = filteredSales.reduce((s, x) => s + Number(x.net_amount ?? 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const profit = totalNet - totalExpenses;
  const roi = totalExpenses > 0 ? (profit / totalExpenses) * 100 : 0;

  const series = useMemo(() => {
    const map = new Map<string, { key: string; label: string; date: Date; revenue: number; expense: number }>();
    // Pré-popular buckets do período para o gráfico não ficar com pontos isolados
    if (range.from) {
      const cursor = new Date(range.from);
      const end = new Date(range.to);
      while (cursor <= end) {
        const k = bucketKey(cursor, granularity);
        if (!map.has(k)) {
          map.set(k, { key: k, label: fmtBucket(new Date(k), granularity), date: new Date(k), revenue: 0, expense: 0 });
        }
        if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
        else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
        else cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    for (const s of filteredSales) {
      const d = parseLocalDate(s.sale_date);
      const k = bucketKey(d, granularity);
      const cur = map.get(k) ?? { key: k, label: fmtBucket(new Date(k), granularity), date: new Date(k), revenue: 0, expense: 0 };
      cur.revenue += Number(s.net_amount ?? 0);
      map.set(k, cur);
    }
    for (const e of filteredExpenses) {
      const d = parseLocalDate(e.expense_date);
      const k = bucketKey(d, granularity);
      const cur = map.get(k) ?? { key: k, label: fmtBucket(new Date(k), granularity), date: new Date(k), revenue: 0, expense: 0 };
      cur.expense += Number(e.amount ?? 0);
      map.set(k, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((r) => ({ ...r, profit: r.revenue - r.expense }));
  }, [filteredSales, filteredExpenses, granularity, range]);

  const products = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; net: number; count: number }>();
    for (const s of filteredSales) {
      const k = s.product_name || "—";
      const cur = map.get(k) ?? { name: k, revenue: 0, net: 0, count: 0 };
      cur.revenue += Number(s.gross_amount ?? 0);
      cur.net += Number(s.net_amount ?? 0);
      cur.count += 1;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount ?? 0));
    }
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // Cruzamento preciso: para cada "tipo de gasto" (categoria/produto extraído do gasto),
  // soma gastos e cruza com as vendas cujo product_name combina.
  const byType = useMemo(() => {
    const map = new Map<string, { name: string; spent: number; revenue: number; net: number; sales: number; expenses: number }>();
    for (const e of filteredExpenses) {
      const key = (extractExpenseProduct(e) || e.category || "—").trim();
      const cur = map.get(key) ?? { name: key, spent: 0, revenue: 0, net: 0, sales: 0, expenses: 0 };
      cur.spent += Number(e.amount ?? 0);
      cur.expenses += 1;
      map.set(key, cur);
    }
    // Para cada chave, computa vendas que casam pelo nome do produto
    for (const [key, row] of map.entries()) {
      for (const s of filteredSales) {
        if (productMatches(s.product_name ?? "", key)) {
          row.revenue += Number(s.gross_amount ?? 0);
          row.net += Number(s.net_amount ?? 0);
          row.sales += 1;
        }
      }
    }
    // Inclui também vendas de produtos que não têm gasto associado
    for (const s of filteredSales) {
      const k = (s.product_name || "—").trim();
      const has = Array.from(map.keys()).some((mk) => productMatches(k, mk));
      if (!has) {
        const cur = map.get(k) ?? { name: k, spent: 0, revenue: 0, net: 0, sales: 0, expenses: 0 };
        cur.revenue += Number(s.gross_amount ?? 0);
        cur.net += Number(s.net_amount ?? 0);
        cur.sales += 1;
        map.set(k, cur);
      }
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, profit: r.net - r.spent, roi: r.spent > 0 ? ((r.net - r.spent) / r.spent) * 100 : null }))
      .sort((a, b) => (b.spent + b.net) - (a.spent + a.net));
  }, [filteredExpenses, filteredSales]);


  const exportPDF = async () => {
    if (exporting) return;
    setExporting(true);
    try {
    // Buscar dados frescos no momento da exportação para refletir as últimas alterações
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["sales-rel"] }),
      qc.invalidateQueries({ queryKey: ["expenses-rel"] }),
    ]);
    const [salesRes, expensesRes] = await Promise.all([
      supabase.from("sales").select("*").order("sale_date", { ascending: false }).limit(5000),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(5000),
    ]);
    if (salesRes.error) { toast.error("Falha ao carregar vendas"); setExporting(false); return; }
    if (expensesRes.error) { toast.error("Falha ao carregar gastos"); setExporting(false); return; }
    const freshSales = salesRes.data ?? [];
    const freshExpenses = expensesRes.data ?? [];

    // Aplicar os mesmos filtros usados na tela
    const fSales = freshSales.filter((s) => {
      if (s.status && s.status !== "aprovada") return false;
      if (platformFilter !== "all" && !platformMatches(s.platform, platformFilter)) return false;
      if (expenseCategory !== "all" && !productMatches(s.product_name ?? "", expenseCategory)) return false;
      if (productFilter !== "all" && !productMatches(s.product_name ?? "", productFilter)) return false;
      const d = parseLocalDate(s.sale_date);
      if (range.from && d < range.from) return false;
      if (d > range.to) return false;
      return true;
    });
    const fExpenses = freshExpenses.filter((e) => {
      if (isOrganicPlatform(e.platform)) return false;
      if (platformFilter !== "all") {
        if (isOrganicPlatform(platformFilter)) return false;
        if (!platformMatches(e.platform, platformFilter)) return false;
      }
      if (expenseCategory !== "all") {
        const matchCat = e.category === expenseCategory;
        const matchProd = productMatches(extractExpenseProduct(e), expenseCategory);
        if (!matchCat && !matchProd) return false;
      }
      if (productFilter !== "all") {
        const haystack = `${extractExpenseProduct(e)} ${e.category ?? ""} ${e.description ?? ""}`;
        if (!productMatches(haystack, productFilter)) return false;
      }
      const d = parseLocalDate(e.expense_date);
      if (range.from && d < range.from) return false;
      if (d > range.to) return false;
      return true;
    });



    const fTotalRevenue = fSales.reduce((s, x) => s + Number(x.gross_amount ?? 0), 0);
    const fTotalNet = fSales.reduce((s, x) => s + Number(x.net_amount ?? 0), 0);
    const fTotalExpenses = fExpenses.reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const fProfit = fTotalNet - fTotalExpenses;
    const fRoi = fTotalExpenses > 0 ? (fProfit / fTotalExpenses) * 100 : 0;

    const sMap = new Map<string, { key: string; label: string; date: Date; revenue: number; expense: number }>();
    if (range.from) {
      const cursor = new Date(range.from);
      const end = new Date(range.to);
      while (cursor <= end) {
        const k = bucketKey(cursor, granularity);
        if (!sMap.has(k)) sMap.set(k, { key: k, label: fmtBucket(new Date(k), granularity), date: new Date(k), revenue: 0, expense: 0 });
        if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
        else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
        else cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    for (const s of fSales) {
      const d = parseLocalDate(s.sale_date);
      const k = bucketKey(d, granularity);
      const cur = sMap.get(k) ?? { key: k, label: fmtBucket(new Date(k), granularity), date: new Date(k), revenue: 0, expense: 0 };
      cur.revenue += Number(s.net_amount ?? 0);
      sMap.set(k, cur);
    }
    for (const e of fExpenses) {
      const d = parseLocalDate(e.expense_date);
      const k = bucketKey(d, granularity);
      const cur = sMap.get(k) ?? { key: k, label: fmtBucket(new Date(k), granularity), date: new Date(k), revenue: 0, expense: 0 };
      cur.expense += Number(e.amount ?? 0);
      sMap.set(k, cur);
    }
    const fSeries = Array.from(sMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime()).map((r) => ({ ...r, profit: r.revenue - r.expense }));

    const pMap = new Map<string, { name: string; revenue: number; net: number; count: number }>();
    for (const s of fSales) {
      const k = s.product_name || "—";
      const cur = pMap.get(k) ?? { name: k, revenue: 0, net: 0, count: 0 };
      cur.revenue += Number(s.gross_amount ?? 0);
      cur.net += Number(s.net_amount ?? 0);
      cur.count += 1;
      pMap.set(k, cur);
    }
    const fProducts = Array.from(pMap.values()).sort((a, b) => b.revenue - a.revenue);

    const cMap = new Map<string, number>();
    for (const e of fExpenses) cMap.set(e.category, (cMap.get(e.category) ?? 0) + Number(e.amount ?? 0));
    const fExpensesByCategory = Array.from(cMap.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

    if (fSeries.length === 0 && fProducts.length === 0 && fExpensesByCategory.length === 0) {
      toast.error("Sem dados para exportar.");
      setExporting(false);
      return;
    }
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString("pt-BR");
    const periodoLabel =
      preset === "custom"
        ? `${dateRange?.from ? fmtShortDate(dateRange.from) : "—"} a ${dateRange?.to ? fmtShortDate(dateRange.to) : "—"}`
        : preset === "month"
          ? "Mês atual"
          : `Últimos ${preset} dias`;

    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageW, 70, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório financeiro", 40, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Período: ${periodoLabel}  •  Produto: ${productFilter === "all" ? "Todos" : productFilter}  •  Categoria: ${expenseCategory === "all" ? "Todas" : expenseCategory}`, 40, 50);
    doc.text(`Gerado em ${today}`, 40, 62);

    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resumo", 40, 100);
    autoTable(doc, {
      startY: 110,
      theme: "grid",
      head: [["Receita líquida", "Receita bruta", "Gastos", fProfit >= 0 ? "Lucro" : "Prejuízo", "ROI"]],
      body: [[brl(fTotalNet), brl(fTotalRevenue), brl(fTotalExpenses), brl(fProfit), `${fRoi.toFixed(1)}%`]],
      headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    if (fSeries.length > 0) {
      const yStart = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Receita vs. Gastos por ${granularity === "day" ? "dia" : granularity === "week" ? "semana" : "mês"}`, 40, yStart);
      autoTable(doc, {
        startY: yStart + 8,
        head: [["Período", "Receita líquida", "Gastos", "Lucro/prejuízo"]],
        body: fSeries.map((r) => [r.label, brl(r.revenue), brl(r.expense), brl(r.profit)]),
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      });
    }

    if (fProducts.length > 0) {
      const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Receita por produto", 40, y);
      autoTable(doc, {
        startY: y + 8,
        head: [["Produto", "Vendas", "Bruto", "Líquido"]],
        body: fProducts.map((p) => [p.name, String(p.count), brl(p.revenue), brl(p.net)]),
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      });
    }

    if (fExpensesByCategory.length > 0) {
      const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Gastos por categoria", 40, y);
      autoTable(doc, {
        startY: y + 8,
        head: [["Categoria", "Total", "% do gasto"]],
        body: fExpensesByCategory.map((c) => [
          c.category,
          brl(c.amount),
          `${(fTotalExpenses ? (c.amount / fTotalExpenses) * 100 : 0).toFixed(1)}%`,
        ]),
        headStyles: { fillColor: [244, 63, 94], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Página ${i} de ${pageCount}`, pageW - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    }

    doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Relatório PDF exportado com dados atualizados");
    } finally {
      setExporting(false);
    }
  };

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${fmtShortDate(dateRange.from)} - ${fmtShortDate(dateRange.to)}`
      : fmtShortDate(dateRange.from)
    : "Selecionar datas";

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Comparativo de receita vs. gastos para identificar lucro ou prejuízo"
        actions={
          <Button variant="outline" onClick={exportPDF} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" /> {exporting ? "Gerando…" : "Exportar PDF"}
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Período</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="month">Mês atual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Intervalo de datas</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    defaultMonth={dateRange?.from ?? new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Granularidade</Label>
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>


          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria de gasto</Label>
            <Select value={expenseCategory} onValueChange={setExpenseCategory}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Produto / tipo de gasto</Label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {productOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Plataforma</Label>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {platformOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Resultado consolidado de todas as vendas aprovadas vs. todos os gastos do período. Use o filtro "Produto / tipo de gasto" para isolar um item específico (ex: MESTRE CLUB). Hotmart é orgânico — vendas contam, mas não há gastos associados.
        </p>
      </Card>



      {productFilter !== "all" && (
        <Card className="p-5 mb-5 bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-amber-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Relatório do produto</p>
              <h2 className="text-2xl font-bold text-amber-900">{productFilter}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Vendas e gastos atribuídos a este produto no período selecionado</p>
            </div>
            <Badge className="bg-amber-500 hover:bg-amber-500 text-sm px-3 py-1">{filteredSales.length} vendas · {filteredExpenses.length} gastos</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita líquida</p>
              <p className="text-lg font-bold mt-1 text-emerald-700">{brl(totalNet)}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita bruta</p>
              <p className="text-lg font-bold mt-1">{brl(totalRevenue)}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gastos</p>
              <p className="text-lg font-bold mt-1 text-rose-600">{brl(totalExpenses)}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{profit >= 0 ? "Lucro" : "Prejuízo"}</p>
              <p className={`text-lg font-bold mt-1 ${profit >= 0 ? "text-indigo-700" : "text-red-600"}`}>{brl(profit)}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI</p>
              <p className={`text-lg font-bold mt-1 ${roi >= 0 ? "text-amber-700" : "text-red-600"}`}>{roi.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Receita líquida</p>
              <p className="text-2xl font-bold mt-1">{brl(totalNet)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Bruto: {brl(totalRevenue)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Gastos</p>
              <p className="text-2xl font-bold mt-1">{brl(totalExpenses)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{filteredExpenses.length} lançamentos</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className={`p-5 bg-gradient-to-br ${profit >= 0 ? "from-indigo-50 to-white border-indigo-100" : "from-red-50 to-white border-red-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{profit >= 0 ? "Lucro" : "Prejuízo"}</p>
              <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? "text-indigo-700" : "text-red-600"}`}>{brl(profit)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Receita líquida − gastos</p>
            </div>
            <div className={`h-10 w-10 rounded-xl text-white flex items-center justify-center ${profit >= 0 ? "bg-indigo-500" : "bg-red-500"}`}>
              {profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">ROI</p>
              <p className={`text-2xl font-bold mt-1 ${roi >= 0 ? "text-amber-700" : "text-red-600"}`}>{roi.toFixed(1)}%</p>
              <p className="text-[11px] text-muted-foreground mt-1">Retorno sobre o gasto</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Comparativo chart */}
      <Card className="p-5 mb-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Receita vs. Gastos</h2>
          <p className="text-xs text-muted-foreground">Linha de lucro/prejuízo por {granularity === "day" ? "dia" : granularity === "week" ? "semana" : "mês"}</p>
        </div>
        <div className="h-[360px]">
          {series.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período selecionado</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 10 }} barGap={6} barCategoryGap="25%">
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "rgba(99,102,241,0.2)" }} tickLine={false} padding={{ left: 20, right: 20 }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR")}`} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.06)" }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.18)" }}
                  formatter={(v: number, n: string) => [brl(v), n === "revenue" ? "Receita" : n === "expense" ? "Gastos" : "Lucro"]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v === "revenue" ? "Receita líquida" : v === "expense" ? "Gastos" : "Lucro/prejuízo"} />
                <Bar dataKey="revenue" fill="url(#rev)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" fill="url(#exp)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Tabela de precisão: por tipo de gasto cruzado com vendas */}
      <Card className="mb-5">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Por tipo de gasto — gastou × vendeu</h2>
            <p className="text-xs text-muted-foreground">Cruzamento preciso entre cada tipo (ex: MESTRE CLUB) e as vendas do mesmo produto no período</p>
          </div>
          <Badge variant="secondary">{byType.length} tipos</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo / Produto</TableHead>
              <TableHead className="text-right">Gastos (lanç.)</TableHead>
              <TableHead className="text-right">Gastou</TableHead>
              <TableHead className="text-right">Vendas (qtd.)</TableHead>
              <TableHead className="text-right">Vendeu (líquido)</TableHead>
              <TableHead className="text-right">Lucro/Prejuízo</TableHead>
              <TableHead className="text-right w-[100px]">ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byType.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Sem dados no período.</TableCell></TableRow>
            )}
            {byType.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{r.expenses}</TableCell>
                <TableCell className="text-right text-rose-700 font-semibold tabular-nums">{brl(r.spent)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{r.sales}</TableCell>
                <TableCell className="text-right text-emerald-700 font-semibold tabular-nums">{brl(r.net)}</TableCell>
                <TableCell className={`text-right font-semibold tabular-nums ${r.profit >= 0 ? "text-indigo-700" : "text-red-600"}`}>{brl(r.profit)}</TableCell>
                <TableCell className={`text-right tabular-nums ${r.roi === null ? "text-muted-foreground" : r.roi >= 0 ? "text-amber-700" : "text-red-600"}`}>
                  {r.roi === null ? "—" : `${r.roi.toFixed(1)}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold">Receita por produto</h2>
            <p className="text-xs text-muted-foreground">Apenas vendas aprovadas no período</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Sem vendas no período.</TableCell></TableRow>
              )}
              {products.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right"><Badge variant="secondary">{p.count}</Badge></TableCell>
                  <TableCell className="text-right text-emerald-700 font-semibold">{brl(p.revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{brl(p.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold">Gastos por categoria</h2>
            <p className="text-xs text-muted-foreground">Distribuição dos custos no período</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right w-[160px]">% do gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesByCategory.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">Sem gastos no período.</TableCell></TableRow>
              )}
              {expensesByCategory.map((c) => {
                const pct = totalExpenses ? (c.amount / totalExpenses) * 100 : 0;
                return (
                  <TableRow key={c.category}>
                    <TableCell className="font-medium">{c.category}</TableCell>
                    <TableCell className="text-right text-rose-700 font-semibold">{brl(c.amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

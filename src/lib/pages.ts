import type { AppRole } from "@/hooks/use-auth";

export type PageKey =
  | "/dashboard"
  | "/vendas"
  | "/receita-produto"
  | "/gastos"
  | "/trafego-pago"
  | "/relatorios"
  | "/leads"
  | "/mentorados"
  | "/contratos"
  | "/aplix-form"
  | "/integracoes"
  | "/webhooks"
  | "/usuarios";

export const PAGES: { key: PageKey; label: string; defaultRoles: AppRole[] }[] = [
  { key: "/dashboard", label: "Dashboard", defaultRoles: ["admin", "financeiro", "comercial", "operacional"] },
  { key: "/vendas", label: "Vendas", defaultRoles: ["admin", "financeiro", "comercial", "operacional"] },
  { key: "/receita-produto", label: "Receita por produto", defaultRoles: ["admin", "financeiro", "comercial"] },
  { key: "/gastos", label: "Gastos", defaultRoles: ["admin", "financeiro"] },
  { key: "/trafego-pago", label: "Tráfego Pago", defaultRoles: ["admin", "financeiro"] },
  { key: "/relatorios", label: "Relatórios", defaultRoles: ["admin", "financeiro"] },
  { key: "/leads", label: "Leads", defaultRoles: ["admin", "comercial", "operacional"] },
  { key: "/mentorados", label: "Mentorados", defaultRoles: ["admin", "comercial", "operacional", "financeiro"] },
  { key: "/contratos", label: "Contratos", defaultRoles: ["admin", "comercial", "financeiro", "operacional"] },
  { key: "/aplix-form", label: "Aplix Form", defaultRoles: ["admin", "comercial", "financeiro", "operacional"] },
  { key: "/integracoes", label: "Integrações", defaultRoles: ["admin"] },
  { key: "/webhooks", label: "Eventos Webhook", defaultRoles: ["admin", "financeiro"] },
  { key: "/usuarios", label: "Colaboradores", defaultRoles: ["admin"] },
];

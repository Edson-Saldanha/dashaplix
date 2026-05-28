import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Receipt, Users, FileText, Plug, Webhook, UserCog, PieChart, BarChart3, Megaphone, GraduationCap, ClipboardList,
} from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import aplixLogo from "@/assets/aplix-logo.png";
import { UserMenu } from "@/components/user-menu";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: AppRole[] };

type Section = { label: string; items: NavItem[] };

const sections: Section[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "financeiro", "comercial", "operacional"] },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/vendas", label: "Vendas", icon: ShoppingCart, roles: ["admin", "financeiro", "comercial", "operacional"] },
      { to: "/receita-produto", label: "Receita por produto", icon: PieChart, roles: ["admin", "financeiro", "comercial"] },
      { to: "/gastos", label: "Gastos", icon: Receipt, roles: ["admin", "financeiro"] },
      { to: "/trafego-pago", label: "Tráfego Pago", icon: Megaphone, roles: ["admin", "financeiro"] },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "financeiro"] },
      { to: "/leads", label: "Leads", icon: Users, roles: ["admin", "comercial", "operacional"] },
      { to: "/mentorados", label: "Mentorados", icon: GraduationCap, roles: ["admin", "comercial", "operacional", "financeiro"] },
      { to: "/contratos", label: "Contratos", icon: FileText, roles: ["admin", "comercial", "financeiro", "operacional"] },
      { to: "/aplix-form/forms", label: "Aplix Form", icon: ClipboardList, roles: ["admin", "comercial", "financeiro", "operacional"] },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/integracoes", label: "Integrações", icon: Plug, roles: ["admin"] },
      { to: "/webhooks", label: "Eventos Webhook", icon: Webhook, roles: ["admin", "financeiro"] },
      { to: "/usuarios", label: "Colaboradores", icon: UserCog, roles: ["admin"] },
    ],
  },
];

export function AppSidebar() {
  const { canAccessPage } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border min-h-screen relative overflow-hidden">
      {/* decorative gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-sidebar-primary/15 via-transparent to-transparent" />

      <div className="relative px-6 pt-7 pb-6 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 p-1.5 shadow-lg shadow-sidebar-primary/20 ring-1 ring-white/10">
            <img src={aplixLogo} alt="APLIX" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-bold tracking-wide text-sidebar-foreground">APLIX</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/50">Painel interno</div>
          </div>
        </div>
        <div className="mt-4 -mx-2">
          <UserMenu className="w-full justify-start" />
        </div>
      </div>


      <nav className="relative flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {sections.map((section) => {
          const visible = section.items.filter((i) => canAccessPage(i.to));
          if (visible.length === 0) return null;
          return (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                {section.label}
              </div>
              <div className="space-y-1">
                {visible.map((it) => {
                  const active = path === it.to || path.startsWith(it.to + "/");
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-sidebar-primary" />
                      )}
                      <it.icon className={cn("h-4 w-4 transition-colors", active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
                      <span>{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative px-5 py-4 border-t border-sidebar-border/60">
        <div className="text-[11px] text-sidebar-foreground/40">
          © {new Date().getFullYear()} APLIX
        </div>
      </div>
    </aside>
  );
}

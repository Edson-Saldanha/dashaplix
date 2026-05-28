import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Loader2, BarChart3, ShieldCheck, Zap, TrendingUp } from "lucide-react";
import aplixLogo from "@/assets/aplix-logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("invalid")) {
        return toast.error("E-mail ou senha incorretos");
      }
      if (error.message.toLowerCase().includes("not confirmed")) {
        return toast.error("Confirme seu e-mail antes de entrar");
      }
      return toast.error(error.message);
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-background">
      {/* Brand panel */}
      <aside className="hidden lg:flex lg:col-span-3 relative overflow-hidden flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        {/* Decorative gradients */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sidebar-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative flex items-center gap-3">
          <img src={aplixLogo} alt="APLIX" className="h-10 w-auto" />
          <div className="leading-tight border-l border-sidebar-foreground/15 pl-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/60">Dashboard interno</div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-foreground/15 bg-sidebar-foreground/5 px-3 py-1 text-xs text-sidebar-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Sistema operando normalmente
          </span>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.15] tracking-tight">
            Centralize vendas, leads, contratos e gastos em um só painel.
          </h2>
          <p className="mt-4 text-sidebar-foreground/70 text-base leading-relaxed">
            Integre Kiwify, Hotmart e suas plataformas via webhook. Acompanhe
            resultados financeiros e comerciais em tempo real, com a segurança
            que sua operação precisa.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: BarChart3, label: "Vendas em tempo real" },
              { icon: TrendingUp, label: "Resultado diário e mensal" },
              { icon: Zap, label: "Webhooks Kiwify & Hotmart" },
              { icon: ShieldCheck, label: "Acesso por permissão" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 rounded-lg border border-sidebar-foreground/10 bg-sidebar-foreground/[0.03] px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sidebar-foreground/85">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-sidebar-foreground/50">
          <span>© {new Date().getFullYear()} APLIX</span>
          <span>Uso interno autorizado</span>
        </div>
      </aside>

      {/* Form panel */}
      <section className="lg:col-span-2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">A</div>
            <span className="font-semibold tracking-tight">APLIX</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Entrar na sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Use suas credenciais corporativas para acessar o painel.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => toast.info("Solicite a redefinição ao administrador.")}
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Acesso restrito. Solicite credenciais ao administrador.
          </div>

          <p className="mt-10 text-center text-[11px] text-muted-foreground/70">
            Ao entrar, você concorda com as políticas de uso interno do sistema APLIX.
          </p>
        </div>
      </section>
    </div>
  );
}

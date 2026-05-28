import { createFileRoute, Outlet, Navigate, useRouterState } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, canAccessPage } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  useRealtimeSync();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!canAccessPage(path)) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-6 py-8 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


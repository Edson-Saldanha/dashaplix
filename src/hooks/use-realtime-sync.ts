import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Para cada tabela, invalida QUALQUER query cuja primeira chave bata com um destes prefixos.
// Assim páginas como Relatórios (que usam "sales-rel"/"expenses-rel") também atualizam em tempo real.
const TABLE_TO_PREFIXES: Record<string, string[]> = {
  sales: ["sales", "sales-rel", "dashboard-stats"],
  leads: ["leads", "dashboard-stats"],
  contracts: ["contracts", "dashboard-stats"],
  expenses: ["expenses", "expenses-rel", "dashboard-stats"],
  webhook_events: ["webhook_events"],
  integrations: ["integrations"],
};

export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const invalidate = (prefixes: string[]) => {
      qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey?.[0];
          return typeof k === "string" && prefixes.includes(k);
        },
      });
    };

    const channel = supabase.channel("app-realtime-sync");
    for (const table of Object.keys(TABLE_TO_PREFIXES)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => invalidate(TABLE_TO_PREFIXES[table]),
      );
    }
    channel.subscribe();

    // Refetch ao voltar o foco / reconectar — garante UI sempre fresca.
    const onFocus = () => qc.invalidateQueries();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [qc]);
}

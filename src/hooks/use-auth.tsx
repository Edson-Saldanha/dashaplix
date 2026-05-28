import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { PAGES, type PageKey } from "@/lib/pages";

export type AppRole = "admin" | "financeiro" | "comercial" | "operacional";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  hasAnyRole: (r: AppRole[]) => boolean;
  /** Pages explicitly granted to this user (overrides role defaults). null = no override set. */
  pageOverrides: PageKey[] | null;
  /** True if the user can access the given page path. */
  canAccessPage: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [pageOverrides, setPageOverrides] = useState<PageKey[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const [{ data: rs }, { data: pgs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("user_page_access").select("page").eq("user_id", uid),
    ]);
    setRoles((rs?.map((r) => r.role as AppRole) ?? []));
    setPageOverrides(pgs && pgs.length > 0 ? (pgs.map((p) => p.page as PageKey)) : null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
        setPageOverrides(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadRoles(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyRole = (rs: AppRole[]) => rs.some((r) => roles.includes(r));

  const canAccessPage = (path: string) => {
    if (roles.includes("admin")) return true;
    const page = PAGES.find((p) => path === p.key || path.startsWith(p.key + "/"));
    if (!page) return true;
    if (pageOverrides) return pageOverrides.includes(page.key);
    return page.defaultRoles.some((r) => roles.includes(r));
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut, hasRole, hasAnyRole, pageOverrides, canAccessPage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

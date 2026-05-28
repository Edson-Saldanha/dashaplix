import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserCircle2, ChevronDown } from "lucide-react";
import { ProfileDialog } from "@/components/profile-dialog";

export function UserMenu({ className = "" }: { className?: string }) {
  const { user, signOut, roles } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? null,
  );

  useEffect(() => {
    if (!user?.id) return;
    if (fullName) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.full_name) setFullName(data.full_name);
    });
  }, [user?.id, fullName]);

  const displayName = fullName?.trim() || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = roles[0]
    ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1)
    : "Colaborador";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={`h-11 px-2 gap-2 hover:bg-sidebar-accent ${className}`}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[180px]">{displayName}</span>
              <span className="text-[11px] text-sidebar-foreground/60">{roleLabel}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{displayName}</span>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <UserCircle2 className="h-4 w-4 mr-2" /> Meu perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

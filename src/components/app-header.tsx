import { UserMenu } from "@/components/user-menu";

export function AppHeader() {
  return (
    <header className="h-16 bg-background flex items-center justify-end px-6 gap-3 sticky top-0 z-20">
      <UserMenu />
    </header>
  );
}

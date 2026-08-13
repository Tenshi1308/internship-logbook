import { AppNavItems } from "@/components/app-nav-items";
import { AppLogo } from "@/components/app-logo";
import LogoutButton from "@/components/logout-button";

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar print:hidden md:flex">
      <div className="border-b border-sidebar-border px-4 py-5">
        <AppLogo />
      </div>
      <nav
        aria-label="Menu utama"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        <AppNavItems />
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}
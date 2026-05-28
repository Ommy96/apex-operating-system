import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Target, BrainCircuit, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const items = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
  { title: "People", url: "/beneficiaries", icon: Users, match: (p: string) => p.startsWith("/beneficiaries") || p.startsWith("/households") || p.startsWith("/donors") || p.startsWith("/partners") },
  { title: "Programs", url: "/programs-management", icon: Target, match: (p: string) => p.startsWith("/programs") || p.startsWith("/projects") || p.startsWith("/me") || p.startsWith("/map") },
  { title: "Insights", url: "/ai-insights", icon: BrainCircuit, match: (p: string) => p.startsWith("/ai-insights") || p.startsWith("/reports-analytics") || p.startsWith("/risk-intelligence") },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      role="navigation"
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.match(pathname);
          return (
            <li key={it.title}>
              <NavLink
                to={it.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <it.icon className="h-5 w-5" />
                <span>{it.title}</span>
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="w-full flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            aria-label="Open full menu"
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
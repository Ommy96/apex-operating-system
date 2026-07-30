import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { CommandPalette } from "./CommandPalette";
import { MobileBottomNav } from "./MobileBottomNav";
import { RouteTransition } from "@/components/motion/RouteTransition";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <SidebarProvider>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div className="min-h-screen min-h-[100dvh] flex w-full" style={{ background: 'var(--brand-canvas)' }}>
        <WorkspaceSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <WorkspaceHeader onCommandOpen={() => setCommandOpen(true)} />
          
          <main
            id="main-content"
            role="main"
            aria-label="Page content"
            className="flex-1 overflow-auto py-[var(--space-md)] pb-24 md:pb-[var(--space-md)] workspace-scroll"
            style={{ background: 'var(--brand-canvas)' }}
          >
            <div className="fluid-shell animate-fade-in">
              <RouteTransition>{children}</RouteTransition>
            </div>
          </main>
        </div>
        
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}

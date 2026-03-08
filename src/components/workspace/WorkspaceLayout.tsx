import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { CommandPalette } from "./CommandPalette";

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
      <div className="min-h-screen min-h-[100dvh] flex w-full bg-background">
        <WorkspaceSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <WorkspaceHeader onCommandOpen={() => setCommandOpen(true)} />
          
          {/* Main Workspace Content */}
          <main
            id="main-content"
            role="main"
            aria-label="Page content"
            className="flex-1 overflow-auto p-4 md:p-6 workspace-scroll"
          >
            <div className="max-w-[1600px] mx-auto w-full animate-fade-in">
              {children}
            </div>
          </main>
        </div>
        
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </SidebarProvider>
  );
}

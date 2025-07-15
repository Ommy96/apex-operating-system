import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, User } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shadow-soft">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Heart to Heart Organization
                </h1>
                <p className="text-sm text-muted-foreground">
                  Management System
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Admin User</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>

          {/* Footer */}
          <footer className="h-12 border-t border-border bg-card flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <span className="font-semibold text-primary">
                Infera Tech Solutions
              </span>
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
  };

  // Extract user name from metadata or email
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-20 border-b border-border/20 bg-gradient-to-r from-card to-card/95 backdrop-blur-sm flex items-center justify-between px-8 shadow-medium">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="p-2 hover:bg-accent/10 rounded-xl transition-colors" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Heart to Heart Organization
                </h1>
                <p className="text-sm text-muted-foreground font-medium">
                  Management System
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="h-12 w-12 rounded-2xl hover:bg-accent/10 transition-all duration-300">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 px-4 py-2 h-12 bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl hover:from-accent/10 hover:to-accent/5 transition-all duration-300 shadow-soft border border-border/50">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{userName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-strong border border-border/50 bg-card/95 backdrop-blur-sm">
                  <DropdownMenuItem className="text-xs text-muted-foreground p-3 rounded-xl">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/settings')} className="p-3 rounded-xl hover:bg-accent/10 transition-colors">
                      <Settings className="h-4 w-4 mr-3 text-accent" />
                      <span className="font-medium">Settings</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive">
                    <LogOut className="h-4 w-4 mr-3" />
                    <span className="font-medium">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto bg-gradient-to-br from-background/50 to-secondary/5">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="h-16 border-t border-border/20 bg-gradient-to-r from-card to-card/95 backdrop-blur-sm flex items-center justify-center shadow-soft">
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <span className="font-bold bg-gradient-to-r from-accent to-accent-dark bg-clip-text text-transparent">
                Infera Tech Solutions
              </span>
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
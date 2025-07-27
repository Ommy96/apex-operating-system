import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, User, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { RoleIndicator } from "@/components/RoleIndicator";

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
          <header className="h-20 border-b border-border/20 bg-gradient-to-r from-card to-card/95 backdrop-blur-sm flex items-center justify-between px-8 shadow-elevation-1">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="p-2 hover:bg-accent/10 rounded-xl transition-colors hover-lift" />
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
              <ThemeToggle />
              
              <Button variant="ghost" size="sm" className="h-12 w-12 rounded-2xl hover:bg-accent/10 transition-all duration-300 hover-lift relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-accent text-xs text-accent-foreground flex items-center justify-center shadow-elevation-1 animate-pulse">
                  3
                </span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 px-4 py-2 h-12 bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl hover:from-accent/10 hover:to-accent/5 transition-all duration-300 shadow-soft border border-border/50 hover-lift">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center glow-effect">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-foreground">{userName}</span>
                      <RoleIndicator />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-elevation-3 border border-border/50 bg-card/95 backdrop-blur-sm">
                  <DropdownMenuItem className="text-xs text-muted-foreground p-3 rounded-xl">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/settings')} className="p-3 rounded-xl hover:bg-accent/10 transition-colors hover-lift">
                      <Settings className="h-4 w-4 mr-3 text-accent" />
                      <span className="font-medium">Settings</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive hover-lift">
                    <LogOut className="h-4 w-4 mr-3" />
                    <span className="font-medium">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto bg-gradient-to-br from-background/50 to-secondary/5 transition-all duration-300">
            <div className="max-w-7xl mx-auto animate-fade-in">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="h-16 border-t border-border/20 bg-gradient-to-r from-card to-card/95 backdrop-blur-sm flex items-center justify-center shadow-elevation-1">
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <span className="font-bold bg-gradient-to-r from-accent to-accent-dark bg-clip-text text-transparent">
                Infera Tech Solutions
              </span>
              {" "}❤️
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
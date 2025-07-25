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
          <header className="h-20 border-b border-primary/10 bg-white/95 backdrop-blur-md flex items-center justify-between px-8 shadow-medium">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="p-2 hover:bg-primary/10 rounded-xl transition-all duration-300 hover:scale-105" />
              <div>
                <h1 className="text-xl font-bold font-poppins text-gradient">
                  Heart to Heart Organization
                </h1>
                <p className="text-sm text-muted-foreground font-medium">
                  Management System
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="h-12 w-12 rounded-2xl hover:bg-primary/10 hover:shadow-medium transition-all duration-300 hover:scale-105">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 px-4 py-2 h-12 bg-gradient-primary rounded-2xl hover:shadow-glow transition-all duration-300 shadow-medium border border-primary/20 hover:scale-[1.02]">
                    <div className="h-8 w-8 rounded-xl bg-gradient-accent flex items-center justify-center shadow-medium">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white font-poppins">{userName}</span>
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
          <main className="flex-1 p-8 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="h-16 border-t border-primary/10 bg-gradient-to-r from-white/95 to-primary/5 backdrop-blur-md flex items-center justify-center shadow-soft">
            <p className="text-sm text-muted-foreground font-poppins">
              Powered by{" "}
              <span className="font-bold text-gradient">
                Infera Tech Solutions
              </span>
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
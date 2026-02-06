import { Bell, Search, User, LogOut, Settings, ChevronRight, Plus, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate, useLocation } from "react-router-dom";
import { RoleIndicator } from "@/components/RoleIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface WorkspaceHeaderProps {
  onCommandOpen: () => void;
}

// Route to breadcrumb mapping
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  beneficiaries: "Beneficiaries",
  "programs-management": "Programs",
  "sponsors-management": "Sponsors",
  children: "Children",
  alumni: "Alumni",
  "grade-progression": "Grade Progression",
  programs: "Programs",
  feeding: "Feeding Program",
  "kipawa-sato": "Kipawa Sato",
  medical: "Medical",
  "family-adoption": "Family Adoption",
  "self-empowerment": "Self Empowerment",
  "support-groups": "Support Groups",
  "reports-analytics": "Analytics",
  documents: "Documents",
  "organization-settings": "Settings",
  admin: "Admin",
  infera: "Platform Admin",
};

export function WorkspaceHeader({ onCommandOpen }: WorkspaceHeaderProps) {
  const { user, signOut, isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Generate breadcrumbs from current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { path, label };
  });

  return (
    <header className="h-14 border-b border-border/40 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 gap-4 sticky top-0 z-40">
      {/* Left Section */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0" />
        
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={crumb.path}>
                {index < breadcrumbs.length - 1 ? (
                  <>
                    <BreadcrumbLink 
                      href={crumb.path}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </BreadcrumbSeparator>
                  </>
                ) : (
                  <BreadcrumbPage className="text-foreground font-medium text-sm">
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center - Search */}
      <Button
        variant="outline"
        onClick={onCommandOpen}
        className="hidden sm:flex items-center gap-2 px-3 py-2 h-9 text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 border-border/50 rounded-lg min-w-[200px] lg:min-w-[280px]"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search...</span>
        <kbd className="ml-auto pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </Button>

      {/* Right Section */}
      <div className="flex items-center gap-2 shrink-0">
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 px-2 h-9 hover:bg-muted rounded-lg"
            >
              <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-none">{userName}</span>
                <RoleIndicator />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl">
            <DropdownMenuItem className="text-xs text-muted-foreground px-3 py-2 rounded-lg">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            {isAdmin && (
              <DropdownMenuItem
                onClick={() => navigate('/organization-settings')}
                className="px-3 py-2 rounded-lg"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              className="px-3 py-2 rounded-lg text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

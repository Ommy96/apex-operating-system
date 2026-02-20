import { Search, User, LogOut, Settings, ChevronRight, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate, useLocation } from "react-router-dom";
import { RoleIndicator } from "@/components/RoleIndicator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  programs: "Programs",
  dynamic: "Programs",
  "reports-analytics": "Analytics",
  "organization-settings": "Settings",
  admin: "Admin",
  infera: "Platform Admin",
  "custom-reports": "Custom Reports",
  entities: "Entities",
};

// UUID pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useDynamicBreadcrumbLabel(segment: string, segments: string[]) {
  const segmentIndex = segments.indexOf(segment);
  const previousSegment = segmentIndex > 0 ? segments[segmentIndex - 1] : null;

  // Determine if this UUID is a program or beneficiary
  const isProgram = previousSegment === "dynamic" || previousSegment === "dashboard";
  const isBeneficiary = previousSegment === "beneficiaries";

  const { data: programName } = useQuery({
    queryKey: ['breadcrumb-program', segment],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('name').eq('id', segment).single();
      return data?.name || segment;
    },
    enabled: UUID_REGEX.test(segment) && isProgram,
    staleTime: 5 * 60 * 1000,
  });

  const { data: beneficiaryName } = useQuery({
    queryKey: ['breadcrumb-beneficiary', segment],
    queryFn: async () => {
      const { data } = await supabase.from('beneficiaries').select('display_name').eq('id', segment).single();
      return data?.display_name || segment;
    },
    enabled: UUID_REGEX.test(segment) && isBeneficiary,
    staleTime: 5 * 60 * 1000,
  });

  if (!UUID_REGEX.test(segment)) {
    return routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  }

  if (isProgram) return programName || "Loading...";
  if (isBeneficiary) return beneficiaryName || "Loading...";
  return segment.slice(0, 8) + "...";
}

function BreadcrumbEntry({ segment, segments, navigateTo, isLast }: { segment: string; segments: string[]; navigateTo: string; isLast: boolean }) {
  const label = useDynamicBreadcrumbLabel(segment, segments);
  const navigate = useNavigate();

  return (
    <BreadcrumbItem>
      {!isLast ? (
        <>
          <BreadcrumbLink
            className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              navigate(navigateTo);
            }}
          >
            {label}
          </BreadcrumbLink>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
        </>
      ) : (
        <BreadcrumbPage className="text-foreground font-medium text-sm">
          {label}
        </BreadcrumbPage>
      )}
    </BreadcrumbItem>
  );
}

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

  return (
    <header className="h-14 border-b border-border/40 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 gap-4 sticky top-0 z-40">
      {/* Left Section */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0" />
        
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {pathSegments.map((segment, index) => {
              const fullPath = '/' + pathSegments.slice(0, index + 1).join('/');
              const isLast = index === pathSegments.length - 1;
              // Skip "dynamic" and "dashboard" route prefixes under /programs/
              if ((segment === "dynamic" || segment === "dashboard") && pathSegments[index - 1] === "programs") return null;

              // Build correct navigateTo path
              let navigateTo = fullPath;
              // If this is "programs" and the next segment is "dynamic" or "dashboard", link to /programs-management
              if (segment === "programs") {
                navigateTo = "/programs-management";
              }

              // Recalculate isLast: if next visible segments are all skipped
              const remainingVisible = pathSegments.slice(index + 1).filter(
                (s, i) => !((s === "dynamic" || s === "dashboard") && pathSegments[index + 1 + i - 1] === "programs")
              );
              const effectiveIsLast = isLast || remainingVisible.length === 0;

              return (
                <BreadcrumbEntry
                  key={fullPath}
                  segment={segment}
                  segments={pathSegments}
                  navigateTo={navigateTo}
                  isLast={effectiveIsLast && index === pathSegments.length - 1 || (index === pathSegments.length - 1)}
                />
              );
            })}
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

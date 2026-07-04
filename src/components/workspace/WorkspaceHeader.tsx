import { Search, User, LogOut, Settings, ChevronRight, Command, Bell } from "lucide-react";
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
import { NotificationBell } from "@/components/communications/NotificationBell";

interface WorkspaceHeaderProps {
  onCommandOpen: () => void;
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  beneficiaries: "Beneficiaries",
  "programs-management": "Programs",
  programs: "Programs",
  dynamic: "Programs",
  analytics: "Analytics",
  intelligence: "Intelligence",
  "burn-vs-impact": "Burn vs Impact",
  "organization-settings": "Settings",
  admin: "Admin",
  infera: "Platform Admin",
  "custom-reports": "Custom Reports",
  entities: "Entities",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useDynamicBreadcrumbLabel(segment: string, segments: string[]) {
  const segmentIndex = segments.indexOf(segment);
  const previousSegment = segmentIndex > 0 ? segments[segmentIndex - 1] : null;
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
            className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              navigate(navigateTo);
            }}
          >
            {label}
          </BreadcrumbLink>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </BreadcrumbSeparator>
        </>
      ) : (
        <BreadcrumbPage className="text-foreground font-medium text-[12px]">
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
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <header 
      role="banner" 
      aria-label="Application header" 
      className="h-14 flex items-center justify-between px-6 gap-4 sticky top-0 z-40"
      style={{ 
        background: 'var(--brand-surface)', 
        borderBottom: '1px solid var(--brand-border)' 
      }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger className="p-2 hover:bg-muted rounded-lg transition-colors duration-150 shrink-0" aria-label="Toggle sidebar" />
        
        {/* Breadcrumb */}
        <Breadcrumb aria-label="Breadcrumb navigation" className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => navigate('/dashboard')}>
                ApexOS
              </BreadcrumbLink>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </BreadcrumbSeparator>
            </BreadcrumbItem>
            {pathSegments.map((segment, index) => {
              const fullPath = '/' + pathSegments.slice(0, index + 1).join('/');
              const isLast = index === pathSegments.length - 1;
              if ((segment === "dynamic" || segment === "dashboard") && pathSegments[index - 1] === "programs") return null;

              let navigateTo = fullPath;
              if (segment === "programs") navigateTo = "/programs-management";

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
      <button
        onClick={onCommandOpen}
        aria-label="Open search (Ctrl+K)"
        className="hidden sm:flex items-center gap-2 px-3 h-8 text-muted-foreground hover:text-foreground rounded-lg transition-colors duration-150"
        style={{ 
          background: 'var(--brand-canvas)', 
          border: '1px solid var(--brand-border)',
          minWidth: '220px',
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-[13px]">Search beneficiaries, grants…</span>
        <kbd className="ml-auto hidden lg:inline-flex h-5 items-center gap-0.5 rounded px-1.5 font-mono text-[10px] text-muted-foreground" style={{ border: '1px solid var(--brand-border)', background: 'var(--brand-surface)' }}>
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Right Section */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex items-center gap-2 px-2 h-9 hover:bg-muted rounded-lg transition-colors duration-150"
              aria-label="User menu"
            >
              <div 
                className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent-mid), #1B5FBB)' }}
              >
                {initials}
              </div>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-[13px] font-medium text-foreground leading-none">{userName}</span>
                <RoleIndicator />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-[10px]">
            <DropdownMenuItem className="text-[12px] text-muted-foreground px-3 py-2 rounded-lg">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            {isAdmin && (
              <DropdownMenuItem
                onClick={() => navigate('/organization-settings')}
                className="px-3 py-2 rounded-lg text-[13px]"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              className="px-3 py-2 rounded-lg text-[13px] text-destructive focus:text-destructive"
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

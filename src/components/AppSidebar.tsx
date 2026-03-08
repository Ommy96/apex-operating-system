import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Smartphone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Target,
  Shield,
  ShieldAlert,
  Lock,
  Wallet,
} from "lucide-react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { isSuperAdmin } from "@/lib/superAdmin";

interface MenuItemProps {
  item: { title: string; url: string; icon: any };
  isCollapsed: boolean;
  isActive: (path: string) => boolean;
  onClick: () => void;
}

function MenuItem({ item, isCollapsed, isActive, onClick }: MenuItemProps) {
  const active = isActive(item.url);
  
  const content = (
    <NavLink
      to={item.url}
      end
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
          : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", active && "text-sidebar-primary-foreground")} />
      {!isCollapsed && (
        <span className="truncate">{item.title}</span>
      )}
    </NavLink>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const { signOut, user } = useAuth();
  const { can, isSuperAdmin: superAdmin } = usePermissions();
  const { currentOrganization } = useOrganization();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();

  const { data: dynamicPrograms } = useQuery({
    queryKey: ['dynamic-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('show_in_navigation', true)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const isActive = (path: string) => currentPath === path;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Build menu items based on permissions
  const mainMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
    { title: "Beneficiaries", url: "/beneficiaries", icon: Users, show: can.viewBeneficiaries },
    { title: "Programs", url: "/programs-management", icon: Target, show: can.viewPrograms },
    { title: "Financial", url: "/financial", icon: Wallet, show: true },
    { title: "Field Mode", url: "/field-mode", icon: Smartphone, show: true },
  ].filter(item => item.show);

  const systemItems = [
    { title: "Risk Intelligence", url: "/risk-intelligence", icon: ShieldAlert, show: true },
    { title: "Analytics", url: "/reports-analytics", icon: BarChart3, show: can.viewReports || can.viewAnalytics },
    { title: "Roles & Access", url: "/role-management", icon: Lock, show: can.manageRoles || can.manageCustomRoles },
    { title: "Settings", url: "/organization-settings", icon: Settings, show: can.manageSettings || superAdmin },
  ].filter(item => item.show);

  return (
    <TooltipProvider>
      <Sidebar 
        className={cn(
          "border-r-0 bg-sidebar",
          isCollapsed ? "w-[70px]" : "w-[260px]"
        )} 
        collapsible="icon"
      >
        {/* Header */}
        <SidebarHeader className="p-4 pb-2">
          <div className={cn(
            "flex items-center gap-3 transition-all duration-200 mb-3",
            isCollapsed && "justify-center"
          )}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Target className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-fade-in">
                <span className="font-bold text-sidebar-foreground tracking-tight">Ufanisi</span>
                <span className="text-xs text-sidebar-foreground/60">Data Platform</span>
              </div>
            )}
          </div>
          <OrganizationSwitcher collapsed={isCollapsed} />
        </SidebarHeader>

        <SidebarContent className="px-3 pb-4">
          {/* Main Menu */}
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
                Main
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <MenuItem 
                      item={item} 
                      isCollapsed={isCollapsed} 
                      isActive={isActive} 
                      onClick={handleNavClick} 
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Dynamic Programs */}
          {dynamicPrograms && dynamicPrograms.length > 0 && can.viewPrograms && (
            <SidebarGroup className="mt-6">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
                  Programs
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {dynamicPrograms.map((program) => (
                    <SidebarMenuItem key={program.id}>
                      <MenuItem
                        item={{ title: program.name, url: `/programs/dynamic/${program.id}`, icon: Sparkles }}
                        isCollapsed={isCollapsed}
                        isActive={isActive}
                        onClick={handleNavClick}
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* System */}
          {systemItems.length > 0 && (
            <SidebarGroup className="mt-6">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
                  System
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {systemItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <MenuItem 
                        item={item} 
                        isCollapsed={isCollapsed} 
                        isActive={isActive} 
                        onClick={handleNavClick} 
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Super Admin */}
          {isSuperAdmin(user?.email) && (
            <SidebarGroup className="mt-6">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Super Admin
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  <SidebarMenuItem>
                    <MenuItem 
                      item={{ title: "Infera Admin", url: "/admin/infera", icon: Shield }}
                      isCollapsed={isCollapsed} 
                      isActive={isActive} 
                      onClick={handleNavClick} 
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="p-3 mt-auto border-t border-sidebar-border/30">
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-full h-10 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-xl font-medium"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span>Logout</span>
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}

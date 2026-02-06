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
import { 
  Sparkles,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Target,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { isSuperAdmin } from "@/lib/superAdmin";
import { useIsMobile } from "@/hooks/use-mobile";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Beneficiaries", url: "/beneficiaries", icon: Users },
  { title: "Programs", url: "/programs-management", icon: Target },
];

const systemItems = [
  { title: "Analytics", url: "/reports-analytics", icon: BarChart3 },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Settings", url: "/organization-settings", icon: Settings },
];

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
        "nav-item group",
        active ? "nav-item-active" : "nav-item-inactive"
      )}
    >
      <item.icon className={cn(
        "h-[18px] w-[18px] shrink-0 transition-colors",
        active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
      )} />
      {!isCollapsed && (
        <span className="truncate">{item.title}</span>
      )}
    </NavLink>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function WorkspaceSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const { signOut, isAdmin, isManagement, user } = useAuth();
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

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const superAdmin = isSuperAdmin(user?.email);

  return (
    <TooltipProvider>
      <Sidebar 
        className={cn(
          "border-r-0 bg-sidebar transition-all duration-200",
          isCollapsed ? "w-[68px]" : "w-[240px]"
        )} 
        collapsible="icon"
      >
        {/* Header */}
        <SidebarHeader className="p-3 pb-2">
          <div className={cn(
            "flex items-center gap-3 mb-3",
            isCollapsed && "justify-center"
          )}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-md shrink-0">
              <Target className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-fade-in min-w-0">
                <span className="font-bold text-sidebar-foreground text-sm tracking-tight">Ufanisi</span>
                <span className="text-[11px] text-sidebar-muted truncate">Data Platform</span>
              </div>
            )}
          </div>
          <OrganizationSwitcher collapsed={isCollapsed} />
        </SidebarHeader>

        <SidebarContent className="px-2 pb-4 workspace-scroll">
          {/* Main Menu */}
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted mb-1">
                Main
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
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
          {dynamicPrograms && dynamicPrograms.length > 0 && (
            <SidebarGroup className="mt-4">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted mb-1">
                  Programs
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
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

          {/* System - Only for Admin/Management */}
          {(isAdmin || isManagement || superAdmin) && (
            <SidebarGroup className="mt-4">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted mb-1">
                  System
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
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
          {superAdmin && (
            <SidebarGroup className="mt-4">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted mb-1 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Platform
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  <SidebarMenuItem>
                    <MenuItem 
                      item={{ title: "Admin Suite", url: "/admin/infera", icon: Shield }}
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
        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border/30">
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-full h-9 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 px-3 py-2 h-9 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg text-sm font-medium"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Logout
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}

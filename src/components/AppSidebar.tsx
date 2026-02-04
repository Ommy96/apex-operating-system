import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronRight, Sparkles, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Heart,
  LayoutDashboard,
  Users,
  GraduationCap,
  UtensilsCrossed,
  UserCheck,
  Lightbulb,
  TrendingUp,
  Home,
  School,
  Trophy,
  FileText,
  Settings,
  LogOut,
  RefreshCw,
  Building2,
  Stethoscope,
  Bus,
  Layers,
  HandHeart,
  Target,
  Globe,
  Shield,
} from "lucide-react";
import { HeartIcon, EducationIcon, FeedingIcon, KipawaIcon, EmpowermentIcon, DashboardIcon, ReportsIcon, AnalyticsIcon } from "@/components/ui/custom-icons";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { isSuperAdmin } from "@/lib/superAdmin";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Beneficiaries", url: "/beneficiaries", icon: Users },
  { title: "Programs", url: "/programs-management", icon: Target },
  { title: "Sponsors", url: "/sponsors-management", icon: HandHeart },
];

const educationSubItems = [
  { title: "Children", url: "/children", icon: Users },
  { title: "Alumni", url: "/children/alumni", icon: GraduationCap },
  { title: "Grade Progression", url: "/children/grade-progression", icon: TrendingUp },
];

const programItems = [
  { title: "Feeding Program", url: "/programs/feeding", icon: UtensilsCrossed },
  { title: "Kipawa Sato", url: "/programs/kipawa-sato", icon: Trophy },
  { title: "Medical", url: "/programs/medical", icon: Stethoscope },
  { title: "Family Adoption", url: "/programs/family-adoption", icon: Heart },
  { title: "Self-Empowerment", url: "/programs/self-empowerment", icon: Lightbulb },
  { title: "Support Groups", url: "/programs/support-groups", icon: Users },
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
  const { signOut, isAdmin, isManagement, isStaff, user } = useAuth();
  const { currentOrganization } = useOrganization();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const [educationOpen, setEducationOpen] = useState(
    educationSubItems.some(item => currentPath === item.url)
  );

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

  const superAdmin = isSuperAdmin(user?.email);

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
          {/* Organization Switcher */}
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

          {/* Programs */}
          <SidebarGroup className="mt-6">
            {!isCollapsed && (
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
                Programs
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {/* Education Collapsible */}
                <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                          "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <GraduationCap className="h-[18px] w-[18px] flex-shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left">Education</span>
                            <ChevronDown className={cn(
                              "h-4 w-4 text-sidebar-foreground/50 transition-transform duration-200",
                              educationOpen && "rotate-180"
                            )} />
                          </>
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="animate-accordion-down">
                      <div className={cn("mt-1 space-y-1", !isCollapsed && "ml-4 pl-3 border-l border-sidebar-border/50")}>
                        {educationSubItems.map((item) => (
                          <MenuItem
                            key={item.title}
                            item={item}
                            isCollapsed={isCollapsed}
                            isActive={isActive}
                            onClick={handleNavClick}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Other Programs */}
                {programItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <MenuItem 
                      item={item} 
                      isCollapsed={isCollapsed} 
                      isActive={isActive} 
                      onClick={handleNavClick} 
                    />
                  </SidebarMenuItem>
                ))}

                {/* Dynamic Programs */}
                {dynamicPrograms?.map((program) => (
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

          {/* System - Only for Admin/Management */}
          {(isAdmin || isManagement || superAdmin) && (
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

          {/* Super Admin - Only for specific super admin user */}
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

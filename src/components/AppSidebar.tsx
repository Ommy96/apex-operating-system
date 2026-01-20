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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Programs", url: "/programs-management", icon: Layers },
  { title: "Sponsors", url: "/sponsors-management", icon: HandHeart },
];

const educationSubItems = [
  { title: "Children", url: "/children", icon: Users },
  { title: "Alumni", url: "/children/alumni", icon: GraduationCap },
  { title: "School Transport", url: "/children/school-transport", icon: Bus },
  { title: "Replacements", url: "/children/replacements", icon: RefreshCw },
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

interface EnabledReportTypes {
  homeVisits?: boolean;
  schoolVisits?: boolean;
  businessVisits?: boolean;
  programReports?: boolean;
  activityReports?: boolean;
  academicPerformance?: boolean;
  customReports?: boolean;
  otherReports?: boolean;
}

const getReportsItems = (
  isManagement: boolean, 
  isStaff: boolean,
  enabledReportTypes?: EnabledReportTypes
) => {
  const allItems = [
    { title: "Home Visits", url: "/reports/home-visits", icon: Home, key: "homeVisits" },
    { title: "School Visits", url: "/reports/school-visits", icon: School, key: "schoolVisits" },
    { title: "Business Visits", url: "/reports/business-visits", icon: Building2, key: "businessVisits" },
    { title: "Program Reports", url: "/reports/program-reports", icon: FileText, key: "programReports" },
    { title: "Activity Reports", url: "/reports/activity-reports", icon: Trophy, key: "activityReports" },
    { title: "Academic Performance", url: "/reports/academic-performance", icon: GraduationCap, key: "academicPerformance" },
    { title: "Custom Reports", url: "/custom-reports", icon: FileText, key: "customReports" },
    { title: "Other Reports", url: "/other-reports", icon: FileText, key: "otherReports" },
  ];
  
  // Filter based on enabled report types (default to true if not set)
  const filteredItems = allItems.filter(item => {
    const isEnabled = enabledReportTypes?.[item.key as keyof EnabledReportTypes];
    return isEnabled === undefined ? true : isEnabled;
  });
  
  if (isManagement || (!isStaff)) {
    filteredItems.push({ title: "Reports & Analytics", url: "/reports-analytics", icon: TrendingUp, key: "analytics" });
  }
  
  return filteredItems;
};

const systemItems = [
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
  const { signOut, isAdmin, isManagement, isStaff } = useAuth();
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

  // Fetch organization settings for enabled report types
  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', currentOrganization.organization_id)
        .single();
      if (error) throw error;
      return data?.settings as { enabledReportTypes?: EnabledReportTypes } | null;
    },
    enabled: !!currentOrganization?.organization_id,
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

          {/* Reports */}
          <SidebarGroup className="mt-6">
            {!isCollapsed && (
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
                Reports
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {getReportsItems(isManagement, isStaff, orgSettings?.enabledReportTypes).map((item) => (
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

          {/* System - Only for Admin/Management */}
          {(isAdmin || isManagement) && (
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

          {/* Super Admin - Only for Admin */}
          {isAdmin && (
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
                      item={{ title: "Cross-Org Dashboard", url: "/admin/cross-org", icon: Globe }}
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

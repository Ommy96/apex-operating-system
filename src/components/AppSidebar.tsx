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
  Sparkles, Smartphone, LayoutDashboard, Users, Settings, LogOut,
  Target, Shield, ShieldAlert, Lock, Wallet, BarChart3, Handshake,
  FileText, ClipboardCheck, Presentation, UserCheck,
  Megaphone, Zap, BrainCircuit, Activity, UserPlus, Building2, HandCoins,
  MessageSquare, ShieldCheck, AlertTriangle, Banknote, ReceiptText,
  BookOpen, BookHeart, CalendarCheck,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { isSuperAdmin } from "@/lib/superAdmin";
import { useBranding } from "@/hooks/useBranding";
import { isSuperAdmin } from "@/lib/superAdmin";

interface MenuItemType {
  title: string;
  url: string;
  icon: any;
  show?: boolean;
  featureFlag?: string;
}

interface MenuItemProps {
  item: MenuItemType;
  isCollapsed: boolean;
  isActive: (path: string) => boolean;
  onClick: () => void;
  isLocked?: boolean;
}

function MenuItem({ item, isCollapsed, isActive, onClick, isLocked }: MenuItemProps) {
  const active = !isLocked && isActive(item.url);

  if (isLocked) {
    const lockedContent = (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed",
          "text-sidebar-foreground/70"
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="truncate flex-1">{item.title}</span>
            <Lock className="h-4 w-4 flex-shrink-0 text-sidebar-foreground/40" />
          </>
        )}
      </div>
    );

    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {lockedContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          Upgrade to Professional or Enterprise to access {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  const content = (
    <NavLink
      to={item.url}
      end
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <item.icon className={cn("h-4 w-4 flex-shrink-0", active && "text-sidebar-primary-foreground")} />
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

interface MenuGroup {
  label: string;
  items: Array<MenuItemType>;
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

  const orgFeatures = (currentOrganization as any)?.features_enabled || {};
  const isFeatureEnabled = (flagName: string) => orgFeatures[flagName] === true || orgFeatures[flagName] === 'true';

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
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Build menu groups — all items respect RBAC permissions
  const menuGroups: MenuGroup[] = [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
      ],
    },
    {
      label: "People",
      items: [
        { title: "Beneficiaries", url: "/beneficiaries", icon: Users, show: can.viewBeneficiaries },
        { title: "Donors", url: "/donors", icon: HandCoins, show: can.viewDonors },
        { title: "Volunteers", url: "/volunteers", icon: UserCheck, show: can.viewVolunteers },
        { title: "Partners", url: "/partners", icon: Handshake, show: can.viewPartners },
      ],
    },
    {
      label: "Programs & M&E",
      items: [
        { title: "Programs", url: "/programs-management", icon: Target, show: can.viewPrograms },
        { title: "M&E Suite", url: "/me-suite", icon: Activity, show: can.viewME },
        { title: "M&E Calendar", url: "/me-calendar", icon: CalendarCheck, show: can.viewME },
        { title: "Analytics", url: "/reports-analytics", icon: BarChart3, show: can.viewReports || can.viewAnalytics },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Financial", url: "/financial", icon: Wallet, show: can.viewFinancials },
        { title: "Cash Transfers", url: "/cash-transfers", icon: Banknote, show: can.viewFinancials },
        { title: "Expense Claims", url: "/expense-claims", icon: ReceiptText, show: true },
        { title: "HR & Staff", url: "/hr", icon: UserPlus, show: can.viewHR },
        { title: "Branches", url: "/branches", icon: Building2, show: can.viewBranches, featureFlag: 'multi_branch' },
        { title: "Automation", url: "/automation", icon: Zap, show: can.viewAutomation, featureFlag: 'automation' },
        { title: "Communications", url: "/communications", icon: Megaphone, show: can.viewCommunications },
        { title: "AI Insights", url: "/ai-insights", icon: BrainCircuit, show: can.viewAI, featureFlag: 'ai_insights' },
        { title: "Field Mode", url: "/field-mode", icon: Smartphone, show: can.viewBeneficiaries, featureFlag: 'field_mode' },
      ],
    },
    {
      label: "Accountability",
      items: [
        { title: "Complaints", url: "/complaints", icon: MessageSquare, show: can.viewAccountability },
        { title: "Safeguarding", url: "/safeguarding", icon: ShieldCheck, show: can.viewSafeguarding },
        { title: "Whistleblower", url: "/whistleblower", icon: AlertTriangle, show: superAdmin || can.viewAccountability },
      ],
    },
    {
      label: "Governance",
      items: [
        { title: "Documents", url: "/document-management", icon: FileText, show: can.viewDocuments },
        { title: "Compliance", url: "/compliance", icon: ClipboardCheck, show: can.viewCompliance },
        { title: "Board Portal", url: "/board-reporting", icon: Presentation, show: can.viewBoard },
        { title: "Risk Intelligence", url: "/risk-intelligence", icon: ShieldAlert, show: can.viewRisk },
        { title: "Learning Log", url: "/lessons-learned", icon: BookOpen, show: can.viewPrograms },
        { title: "Impact Stories", url: "/impact-stories", icon: BookHeart, show: can.viewPrograms },
      ],
    },
    {
      label: "Administration",
      items: [
        { title: "Roles & Access", url: "/role-management", icon: Lock, show: can.manageRoles || can.manageCustomRoles },
        { title: "Settings", url: "/organization-settings", icon: Settings, show: can.manageSettings || superAdmin },
      ],
    },
  ];

  return (
    <TooltipProvider>
      <Sidebar 
        className={cn(
          "border-r-0 bg-sidebar",
          isCollapsed ? "w-[70px]" : "w-[250px]"
        )} 
        collapsible="icon"
      >
        <SidebarHeader className="p-4 pb-2">
          <div className={cn(
            "flex items-center gap-3 transition-all duration-200 mb-3",
            isCollapsed && "justify-center"
          )}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Target className="h-4.5 w-4.5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-fade-in">
                <span className="font-bold text-sidebar-foreground tracking-tight text-sm">Ufanisi</span>
                <span className="text-[11px] text-sidebar-foreground/60">Data Platform</span>
              </div>
            )}
          </div>
          <OrganizationSwitcher collapsed={isCollapsed} />
        </SidebarHeader>

        <SidebarContent className="px-3 pb-4 overflow-y-auto">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(i => i.show !== false || i.featureFlag);
            const actualVisible = group.items.filter(i => i.show !== false);
            if (actualVisible.length === 0 && visibleItems.length === 0) return null;

            return (
              <SidebarGroup key={group.label} className="mt-4 first:mt-0">
                {!isCollapsed && (
                  <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    {group.items.filter(i => i.show !== false).map((item) => {
                      const locked = item.featureFlag ? !isFeatureEnabled(item.featureFlag) : false;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <MenuItem 
                            item={item} 
                            isCollapsed={isCollapsed} 
                            isActive={isActive} 
                            onClick={handleNavClick}
                            isLocked={locked}
                          />
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}

          {dynamicPrograms && dynamicPrograms.length > 0 && can.viewPrograms && (
            <SidebarGroup className="mt-4">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1">
                  Program Spaces
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

          {isSuperAdmin(user?.email) && (
            <SidebarGroup className="mt-4">
              {!isCollapsed && (
                <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Platform
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  <SidebarMenuItem>
                    <MenuItem 
                      item={{ title: "Control Center", url: "/admin/infera", icon: Shield }}
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

        <SidebarFooter className="p-3 mt-auto border-t border-sidebar-border/30">
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-full h-9 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
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
              className="w-full justify-start gap-3 px-3 py-2 h-auto text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg font-medium text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}

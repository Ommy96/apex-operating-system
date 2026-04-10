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
  BookOpen, BookHeart, CalendarCheck, Map, ShoppingCart,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { isSuperAdmin } from "@/lib/superAdmin";
import { useBranding } from "@/hooks/useBranding";

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
        className="flex items-center gap-[10px] px-[10px] py-2 rounded-[10px] text-[13px] opacity-40 cursor-not-allowed"
        style={{ color: 'var(--sidebar-text)' }}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        {!isCollapsed && (
          <>
            <span className="truncate flex-1">{item.title}</span>
            <Lock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} strokeWidth={1.5} />
          </>
        )}
      </div>
    );

    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {lockedContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="text-[12px]">
          Available on Professional plan
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
        "flex items-center gap-[10px] px-[10px] py-2 rounded-[10px] text-[13px] transition-colors duration-150",
        active
          ? "font-medium"
          : "font-normal"
      )}
      style={{
        background: active ? 'var(--sidebar-active-bg)' : undefined,
        border: active ? '1px solid var(--sidebar-active-border)' : '1px solid transparent',
        color: active ? '#fff' : 'var(--sidebar-text)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <item.icon 
        className="h-4 w-4 flex-shrink-0" 
        strokeWidth={1.5}
        style={{ color: active ? 'var(--accent-mid)' : undefined, opacity: active ? 1 : 0.4 }}
      />
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
        <TooltipContent side="right" className="text-[12px] font-medium">
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
  const { logoUrl, orgName } = useBranding();
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

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

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
        
        { title: "Partners", url: "/partners", icon: Handshake, show: can.viewPartners },
      ],
    },
    {
      label: "Programs & M&E",
      items: [
        { title: "Programs", url: "/programs-management", icon: Target, show: can.viewPrograms },
        { title: "M&E Suite", url: "/me-suite", icon: Activity, show: can.viewME },
        { title: "M&E Calendar", url: "/me-calendar", icon: CalendarCheck, show: can.viewME },
        { title: "Map", url: "/map", icon: Map, show: can.viewPrograms },
        { title: "Analytics", url: "/reports-analytics", icon: BarChart3, show: can.viewReports || can.viewAnalytics },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Financial", url: "/financial", icon: Wallet, show: can.viewFinancials },
        { title: "Cash Transfers", url: "/cash-transfers", icon: Banknote, show: can.viewFinancials },
        { title: "Expense Claims", url: "/expense-claims", icon: ReceiptText, show: true },
        { title: "Procurement", url: "/procurement", icon: ShoppingCart, show: can.viewFinancials },
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
          "border-r-0",
          isCollapsed ? "w-[56px]" : "w-[220px]"
        )} 
        collapsible="icon"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo Section */}
        <SidebarHeader className="p-0">
          <div 
            className={cn(
              "flex items-center gap-3 transition-all duration-200",
              isCollapsed ? "justify-center px-2 py-5" : "px-5 pt-5 pb-4"
            )}
            style={{ borderBottom: '1px solid var(--sidebar-divider)' }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={orgName} className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'var(--accent-mid)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 1L14.5 5V11L8 15L1.5 11V5L8 1Z" stroke="white" strokeWidth="1.5" fill="none" />
                  <path d="M8 5L11 7V11L8 13L5 11V7L8 5Z" fill="white" fillOpacity="0.6" />
                </svg>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-semibold text-white" style={{ letterSpacing: '-0.3px' }}>
                  Ufanisi
                </span>
                <span className="text-[10px] uppercase" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.6px' }}>
                  NGO Platform
                </span>
              </div>
            )}
          </div>
          <div className={cn("px-3 pt-3 pb-1", isCollapsed && "px-1")}>
            <OrganizationSwitcher collapsed={isCollapsed} />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 pb-4 overflow-y-auto workspace-scroll">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(i => i.show !== false || i.featureFlag);
            const actualVisible = group.items.filter(i => i.show !== false);
            if (actualVisible.length === 0 && visibleItems.length === 0) return null;

            return (
              <SidebarGroup key={group.label} className="mt-4 first:mt-2">
                {!isCollapsed && (
                  <SidebarGroupLabel 
                    className="px-[10px] mb-1.5 text-[10px] font-medium uppercase"
                    style={{ color: 'var(--sidebar-label)', letterSpacing: '0.8px' }}
                  >
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
                <SidebarGroupLabel 
                  className="px-[10px] mb-1.5 text-[10px] font-medium uppercase"
                  style={{ color: 'var(--sidebar-label)', letterSpacing: '0.8px' }}
                >
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
                <SidebarGroupLabel 
                  className="px-[10px] mb-1.5 text-[10px] font-medium uppercase flex items-center gap-1"
                  style={{ color: 'var(--sidebar-label)', letterSpacing: '0.8px' }}
                >
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

        {/* User Footer */}
        <SidebarFooter className="p-3 mt-auto" style={{ borderTop: '1px solid var(--sidebar-divider)' }}>
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
                  style={{ color: 'var(--sidebar-text)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[12px]">
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="space-y-2">
              {/* User Pill */}
              <div 
                className="flex items-center gap-[10px] p-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div 
                  className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--accent-mid), #1B5FBB)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-white truncate">{userName}</div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {user?.email?.split('@')[0]}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-[10px] px-[10px] py-2 rounded-lg text-[13px] transition-colors duration-150"
                style={{ color: 'var(--sidebar-text)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#E05C8A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}

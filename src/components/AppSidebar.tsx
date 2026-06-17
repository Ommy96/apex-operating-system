import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  FileText, ClipboardCheck, Presentation,
  Megaphone, Zap, BrainCircuit, Activity, UserPlus, Building2, HandCoins,
  MessageSquare, ShieldCheck, AlertTriangle, Banknote, ReceiptText,
  BookOpen, BookHeart, CalendarCheck, Map, ShoppingCart,
  Layers, FolderKanban, GanttChart as GanttIcon,
  TrendingUp,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrgPlanData } from "@/hooks/useFeatureFlag";
import { ApexLogo } from "@/components/brand/ApexLogo";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { isSuperAdmin } from "@/lib/superAdmin";
import { useBranding } from "@/hooks/useBranding";
import { useBeneficiaryTerminology } from "@/hooks/useBeneficiaryTerminology";

interface MenuItemType {
  title: string;
  url: string;
  icon: any;
  show?: boolean;
  featureFlag?: string;
  badgeCount?: number;
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
        <>
          <span className="truncate flex-1">{item.title}</span>
          {item.badgeCount && item.badgeCount > 0 ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
              style={{ background: 'rgba(201,123,26,0.18)', color: '#F5B068', minWidth: 18, textAlign: 'center' }}
            >
              {item.badgeCount > 99 ? '99+' : item.badgeCount}
            </span>
          ) : null}
        </>
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
  const { termPlural } = useBeneficiaryTerminology();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Detect context (program/project dashboards)
  const programDashMatch = currentPath.match(/^\/programs\/dashboard\/([^/]+)/);
  const projectDashMatch = currentPath.match(/^\/projects\/dashboard\/([^/]+)/);
  const contextProgramId = programDashMatch?.[1];
  const contextProjectId = projectDashMatch?.[1];
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const { planData } = useOrgPlanData();

  const isPartnerOrg = planData?.is_partner === true;
  const orgTier = (planData?.subscription_tier as string) || 'free';
  const orgFeatures = (planData?.features_enabled as Record<string, unknown>) || {};
  const isFeatureEnabled = (flagName: string) => {
    if (isPartnerOrg || orgTier === 'enterprise') return true;
    return orgFeatures[flagName] === true || orgFeatures[flagName] === 'true';
  };

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

  // Context: program name (for secondary nav)
  const { data: contextProgram } = useQuery({
    queryKey: ['sidebar-context-program', contextProgramId],
    queryFn: async () => {
      if (!contextProgramId) return null;
      const { data } = await supabase.from('programs').select('id, name').eq('id', contextProgramId).maybeSingle();
      return data;
    },
    enabled: !!contextProgramId,
    staleTime: 60_000,
  });

  const { data: contextProject } = useQuery({
    queryKey: ['sidebar-context-project', contextProjectId],
    queryFn: async () => {
      if (!contextProjectId) return null;
      const { data } = await supabase.from('projects').select('id, name, program_id, programs(id, name)').eq('id', contextProjectId).maybeSingle();
      return data as any;
    },
    enabled: !!contextProjectId,
    staleTime: 60_000,
  });

  const orgId = currentOrganization?.organization_id;

  // Badge: overdue programme milestones
  const { data: overdueMilestones = 0 } = useQuery({
    queryKey: ['sidebar-overdue-milestones', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('programme_milestones')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .lt('due_date', today);
      return count || 0;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });

  // Badge: overdue M&E data collections
  const { data: overdueCollections = 0 } = useQuery({
    queryKey: ['sidebar-overdue-collections', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('me_data_schedule')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('is_active', true)
        .lt('next_collection_date', today);
      return count || 0;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });

  // Programme/project counts (for sub-strip)
  const { data: progCounts } = useQuery({
    queryKey: ['sidebar-prog-counts', orgId],
    queryFn: async () => {
      if (!orgId) return { programmes: 0, projects: 0 };
      const [p, pr] = await Promise.all([
        supabase.from('programs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null),
      ]);
      return { programmes: p.count || 0, projects: pr.count || 0 };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
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
        { title: termPlural, url: "/beneficiaries", icon: Users, show: can.viewBeneficiaries },
        { title: "Donors", url: "/donors", icon: HandCoins, show: can.viewDonors },
        
        { title: "Partners", url: "/partners", icon: Handshake, show: can.viewPartners },
      ],
    },
    {
      label: "Programs & M&E",
      items: [
        { title: "Programs", url: "/programs-management", icon: Target, show: can.viewPrograms, badgeCount: overdueMilestones },
        { title: "Projects", url: "/projects", icon: FolderKanban, show: can.viewPrograms },
        { title: "Workplans", url: "/workplans", icon: GanttIcon, show: can.viewPrograms },
        { title: "Portfolio", url: "/programs/portfolio", icon: Layers, show: can.viewPrograms },
        { title: "M&E", url: "/me", icon: Activity, show: can.viewME, badgeCount: overdueCollections },
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
      label: "Intelligence",
      items: [
        { title: "Burn vs Impact", url: "/intelligence/burn-vs-impact", icon: TrendingUp, show: can.viewAnalytics || can.viewPrograms || superAdmin },
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
              <ApexLogo variant="mark" />
            )}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-semibold text-white" style={{ letterSpacing: '-0.3px' }}>
                  {logoUrl ? orgName : PRODUCT_NAME}
                </span>
                <span className="text-[10px] uppercase" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.6px' }}>
                  {PRODUCT_TAGLINE}
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

          {/* Context-sensitive secondary nav */}
          {!isCollapsed && (contextProgram || contextProject) && (
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel
                className="px-[10px] mb-1.5 text-[10px] font-medium uppercase"
                style={{ color: 'var(--sidebar-label)', letterSpacing: '0.8px' }}
              >
                {contextProject ? 'Current Project' : 'Current Programme'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-[10px] space-y-1">
                  {contextProject ? (
                    <>
                      <button
                        onClick={() => contextProject.programs && navigate(`/programs/dashboard/${contextProject.programs.id}`)}
                        className="text-[11px] flex items-center gap-1 hover:underline truncate w-full text-left"
                        style={{ color: 'rgba(255,255,255,0.6)' }}
                      >
                        ← {contextProject.programs?.name || 'Programme'}
                      </button>
                      <div className="text-[12px] font-medium text-white truncate" title={contextProject.name}>
                        {contextProject.name}
                      </div>
                    </>
                  ) : contextProgram ? (
                    <>
                      <button
                        onClick={() => navigate('/programs-management')}
                        className="text-[11px] flex items-center gap-1 hover:underline truncate w-full text-left"
                        style={{ color: 'rgba(255,255,255,0.6)' }}
                      >
                        ← All programmes
                      </button>
                      <div className="text-[12px] font-medium text-white truncate" title={contextProgram.name}>
                        {contextProgram.name}
                      </div>
                    </>
                  ) : null}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Programme stats strip */}
          {!isCollapsed && progCounts && (progCounts.programmes > 0 || progCounts.projects > 0) && (
            <div
              className="mt-3 mx-[10px] text-[10px] tabular-nums"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {progCounts.programmes} programme{progCounts.programmes === 1 ? '' : 's'} · {progCounts.projects} project{progCounts.projects === 1 ? '' : 's'}
            </div>
          )}

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
              {/* Plan Indicator */}
              {(() => {
                const planConfig = isPartnerOrg
                  ? { dot: '#f59e0b', label: 'Partner', clickable: false }
                  : orgTier === 'enterprise'
                  ? { dot: '#a855f7', label: 'Enterprise', clickable: false }
                  : orgTier === 'professional'
                  ? { dot: '#3b82f6', label: 'Professional', clickable: false }
                  : { dot: '#64748b', label: 'Free plan · Upgrade', clickable: true };

                const content = (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default"
                    onClick={planConfig.clickable ? () => navigate('/organization-settings?tab=billing') : undefined}
                    style={{ cursor: planConfig.clickable ? 'pointer' : 'default' }}
                  >
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: planConfig.dot }} />
                    <span className="text-[10px]" style={{ color: planConfig.dot }}>{planConfig.label}</span>
                  </div>
                );
                return content;
              })()}
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

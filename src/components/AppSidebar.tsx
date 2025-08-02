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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
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
  LogOut
} from "lucide-react";
import { HeartIcon, EducationIcon, FeedingIcon, KipawaIcon, EmpowermentIcon, DashboardIcon, ReportsIcon, AnalyticsIcon } from "@/components/ui/custom-icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: DashboardIcon },
  { title: "Children", url: "/children", icon: Users },
];

const programItems = [
  { title: "Education", url: "/programs/education", icon: EducationIcon },
  { title: "Feeding Program", url: "/programs/feeding", icon: FeedingIcon },
  { title: "Kipawa Sato", url: "/programs/kipawa-sato", icon: KipawaIcon },
  { title: "Family Adoption", url: "/programs/family-adoption", icon: HeartIcon },
  { title: "Self-Empowerment", url: "/programs/self-empowerment", icon: EmpowermentIcon },
  { title: "Support Groups", url: "/programs/support-groups", icon: Users },
];

const getReportsItems = (isManagement: boolean) => {
  const baseItems = [
    { title: "Home Visits", url: "/reports/home-visits", icon: Home },
    { title: "School Visits", url: "/reports/school-visits", icon: EducationIcon },
    { title: "Program Reports", url: "/reports/program-reports", icon: AnalyticsIcon },
    { title: "Activity Reports", url: "/reports/activity-reports", icon: Trophy },
    { title: "Academic Performance", url: "/reports/academic-performance", icon: EducationIcon },
    { title: "Other Reports", url: "/other-reports", icon: ReportsIcon },
  ];
  
  if (isManagement) {
    baseItems.push({ title: "Reports & Analytics", url: "/reports-analytics", icon: TrendingUp });
  }
  
  return baseItems;
};

const systemItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const { signOut, isAdmin, isManagement } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();

  const isActive = (path: string) => currentPath === path;
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground font-semibold shadow-elevation-2 rounded-2xl glow-effect" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-elevation-1 rounded-2xl transition-all duration-300 hover-lift micro-interaction";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar className={`${isCollapsed ? "w-20" : "w-72"} bg-sidebar-background border-r border-sidebar-border/50 shadow-elevation-3`} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/30 p-6">
        <div className="flex items-center gap-4 hover-lift">
          <div className="p-3 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 rounded-2xl shadow-elevation-2 glow-effect">
            <HeartIcon className="w-7 h-7 text-white" />
          </div>
           {!isCollapsed && (
             <div className="animate-fade-in">
               <h2 className="font-bold text-lg text-sidebar-foreground bg-gradient-accent bg-clip-text">Heart to Heart</h2>
               <p className="text-sm text-sidebar-foreground/70 font-medium">Organization</p>
             </div>
           )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6 space-y-6">
         <SidebarGroup>
           <SidebarGroupLabel className="text-sidebar-foreground/90 font-bold text-sm uppercase tracking-wider mb-3">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="ripple">
                    <NavLink to={item.url} end className={getNavClasses} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="animate-fade-in">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

         <SidebarGroup>
           <SidebarGroupLabel className="text-sidebar-foreground/90 font-bold text-sm uppercase tracking-wider mb-3">Programs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {programItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClasses} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

         <SidebarGroup>
           <SidebarGroupLabel className="text-sidebar-foreground/90 font-bold text-sm uppercase tracking-wider mb-3">Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getReportsItems(isManagement).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClasses} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
           <SidebarGroup>
             <SidebarGroupLabel className="text-sidebar-foreground/90 font-bold text-sm uppercase tracking-wider mb-3">System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavClasses} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

       <SidebarFooter className="border-t border-sidebar-border/30 p-4">
         <Button
           variant="ghost"
           onClick={handleLogout}
           className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive rounded-2xl p-3 transition-all duration-300 hover-lift button-press"
         >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium animate-fade-in">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
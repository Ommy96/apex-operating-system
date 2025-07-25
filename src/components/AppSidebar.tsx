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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Children", url: "/children", icon: Users },
];

const programItems = [
  { title: "Education", url: "/programs/education", icon: GraduationCap },
  { title: "Feeding Program", url: "/programs/feeding", icon: UtensilsCrossed },
  { title: "Kipawa Sato", url: "/programs/kipawa-sato", icon: Lightbulb },
  { title: "Family Adoption", url: "/programs/family-adoption", icon: UserCheck },
  { title: "Self-Empowerment", url: "/programs/self-empowerment", icon: TrendingUp },
  { title: "Support Groups", url: "/programs/support-groups", icon: Users },
];

const reportsItems = [
  { title: "Home Visits", url: "/reports/home-visits", icon: Home },
  { title: "School Visits", url: "/reports/school-visits", icon: School },
  { title: "Program Reports", url: "/reports/program-reports", icon: FileText },
  { title: "Activity Reports", url: "/reports/activity-reports", icon: Trophy },
  { title: "Academic Performance", url: "/reports/academic-performance", icon: GraduationCap },
  { title: "Other Reports", url: "/other-reports", icon: FileText },
];

const systemItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, isAdmin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-gradient-accent text-white font-semibold shadow-glow rounded-2xl border border-white/20 hover:scale-[1.02]" 
      : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-medium rounded-2xl transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm border border-transparent hover:border-white/20";

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar className={`${isCollapsed ? "w-20" : "w-72"} bg-gradient-sidebar border-r border-white/10 shadow-strong`} collapsible="icon">
      <SidebarHeader className="border-b border-white/10 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-accent rounded-2xl shadow-glow">
            <Heart className="w-7 h-7 text-white drop-shadow-lg" />
          </div>
           {!isCollapsed && (
             <div>
               <h2 className="font-bold text-lg text-white font-poppins tracking-tight">Heart to Heart</h2>
               <p className="text-sm text-white/70 font-medium">Organization</p>
             </div>
           )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6 space-y-6">
         <SidebarGroup>
           <SidebarGroupLabel className="text-white/60 font-bold text-xs uppercase tracking-wider mb-3 font-poppins">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClasses}>
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
           <SidebarGroupLabel className="text-white/60 font-bold text-xs uppercase tracking-wider mb-3 font-poppins">Programs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {programItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClasses}>
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
           <SidebarGroupLabel className="text-white/60 font-bold text-xs uppercase tracking-wider mb-3 font-poppins">Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClasses}>
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
             <SidebarGroupLabel className="text-white/60 font-bold text-xs uppercase tracking-wider mb-3 font-poppins">System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavClasses}>
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

       <SidebarFooter className="border-t border-white/10 p-4">
         <Button
           variant="ghost"
           onClick={handleLogout}
           className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 rounded-2xl p-3 transition-all duration-300 font-poppins border border-transparent"
         >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
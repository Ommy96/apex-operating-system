import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Target,
  HandHeart,
  GraduationCap,
  UtensilsCrossed,
  Trophy,
  Stethoscope,
  Heart,
  Lightbulb,
  BarChart3,
  FileText,
  Settings,
  Plus,
  Search,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, group: "Navigation" },
  { title: "Beneficiaries", url: "/beneficiaries", icon: Users, group: "Navigation" },
  { title: "Programs", url: "/programs-management", icon: Target, group: "Navigation" },
  { title: "Sponsors", url: "/sponsors-management", icon: HandHeart, group: "Navigation" },
  { title: "Analytics", url: "/reports-analytics", icon: BarChart3, group: "Navigation" },
  { title: "Documents", url: "/documents", icon: FileText, group: "Navigation" },
  { title: "Settings", url: "/organization-settings", icon: Settings, group: "Navigation" },
];

const programItems = [
  { title: "Education - Children", url: "/children", icon: GraduationCap, group: "Programs" },
  { title: "Feeding Program", url: "/programs/feeding", icon: UtensilsCrossed, group: "Programs" },
  { title: "Kipawa Sato", url: "/programs/kipawa-sato", icon: Trophy, group: "Programs" },
  { title: "Medical", url: "/programs/medical", icon: Stethoscope, group: "Programs" },
  { title: "Family Adoption", url: "/programs/family-adoption", icon: Heart, group: "Programs" },
  { title: "Self-Empowerment", url: "/programs/self-empowerment", icon: Lightbulb, group: "Programs" },
];

const quickActions = [
  { title: "Add New Beneficiary", url: "/beneficiaries", icon: Plus, group: "Actions" },
  { title: "Create Program", url: "/programs-management", icon: Plus, group: "Actions" },
  { title: "View Reports", url: "/reports-analytics", icon: Search, group: "Actions" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, programs, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.url + item.title}
              onSelect={() => handleSelect(item.url)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.url}
              onSelect={() => handleSelect(item.url)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Programs">
          {programItems.map((item) => (
            <CommandItem
              key={item.url}
              onSelect={() => handleSelect(item.url)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

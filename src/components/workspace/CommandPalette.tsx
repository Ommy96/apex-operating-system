import { useEffect } from "react";
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
  LayoutDashboard, Users, Target, BarChart3, Settings, Plus, Search,
  FileText, DollarSign, Eye, Wallet, FolderKanban, UserPlus, HandCoins,
  Notebook, Receipt, MapPin, Shield, MessageSquare,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigationItems = [
  { title: "Go to Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Go to Beneficiaries", url: "/beneficiaries", icon: Users },
  { title: "Go to Programs", url: "/programs-management", icon: Target },
  { title: "Go to Analytics", url: "/reports-analytics", icon: BarChart3 },
  { title: "Go to Financial Suite", url: "/financial-suite", icon: Wallet },
  { title: "Go to M&E Suite", url: "/me-suite", icon: BarChart3 },
  { title: "Go to Documents", url: "/documents", icon: FileText },
  { title: "Go to HR Management", url: "/hr-management", icon: Users },
  { title: "Go to Communications", url: "/communications-hub", icon: MessageSquare },
  { title: "Go to Compliance", url: "/compliance-governance", icon: Shield },
  { title: "Go to Branch Management", url: "/branch-management", icon: MapPin },
  { title: "Go to Settings", url: "/organization-settings", icon: Settings },
];

const createActions = [
  { title: "Add Beneficiary", url: "/beneficiaries", icon: UserPlus },
  { title: "Create Program", url: "/programs-management", icon: Target },
  { title: "Create Project", url: "/programs-management", icon: FolderKanban },
  { title: "Add Observation", url: "/programs-management", icon: Eye },
  { title: "Add Report", url: "/custom-reports", icon: FileText },
  { title: "Record Donation", url: "/financial-suite", icon: DollarSign },
  { title: "Record Expense", url: "/financial-suite", icon: Receipt },
  { title: "Enroll Beneficiary", url: "/beneficiaries", icon: Users },
  { title: "Add Case Note", url: "/beneficiaries", icon: Notebook },
  { title: "Add Sponsorship", url: "/financial-suite", icon: HandCoins },
];

const searchActions = [
  { title: "Search Beneficiaries", url: "/beneficiaries", icon: Search },
  { title: "Search Programs", url: "/programs-management", icon: Search },
  { title: "Search Donors", url: "/beneficiaries", icon: Search },
  { title: "Search Documents", url: "/documents", icon: Search },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

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
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Create">
          {createActions.map((item) => (
            <CommandItem
              key={item.title}
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
              key={item.title}
              onSelect={() => handleSelect(item.url)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Search">
          {searchActions.map((item) => (
            <CommandItem
              key={item.title}
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

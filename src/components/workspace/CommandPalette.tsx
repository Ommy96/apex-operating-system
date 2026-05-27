import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
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
  LayoutDashboard, Users, Target, BarChart3, Settings, Search,
  FileText, Wallet, FolderKanban, UserPlus, HandCoins, Plus,
  MapPin, Shield, MessageSquare, BrainCircuit, ShieldAlert,
  Building2, Smartphone, Zap, Presentation, ShoppingCart, Lock,
  GitBranch, Activity, Heart, ListChecks, TrendingUp, Home,
  UserCog, ShieldCheck,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigationItems = [
  // Home
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, group: "Home" },
  // People
  { title: "Beneficiaries", url: "/beneficiaries", icon: Users, group: "People" },
  { title: "Households", url: "/beneficiaries?view=households", icon: Home, group: "People" },
  { title: "Donors", url: "/donors", icon: HandCoins, group: "People" },
  { title: "Partners", url: "/partners", icon: Building2, group: "People" },
  // Programs
  { title: "Programs", url: "/programs-management", icon: Target, group: "Programs" },
  { title: "Projects", url: "/projects", icon: FolderKanban, group: "Programs" },
  { title: "M&E", url: "/me", icon: Activity, group: "Programs" },
  { title: "Logframe & ToC", url: "/me?tab=logframe", icon: GitBranch, group: "Programs" },
  { title: "Indicators", url: "/me?tab=indicators", icon: BarChart3, group: "Programs" },
  { title: "Map view", url: "/map", icon: MapPin, group: "Programs" },
  // Intelligence
  { title: "AI Assistant", url: "/ai-insights", icon: BrainCircuit, group: "Intelligence" },
  { title: "Risk Intelligence", url: "/risk-intelligence", icon: ShieldAlert, group: "Intelligence" },
  { title: "Analytics", url: "/reports-analytics", icon: BarChart3, group: "Intelligence" },
  // Funding
  { title: "Grants", url: "/financial?tab=grants", icon: ListChecks, group: "Funding" },
  { title: "Funding Intelligence", url: "/financial?tab=intelligence", icon: TrendingUp, group: "Funding" },
  { title: "Sponsorships", url: "/financial?tab=sponsorships", icon: Heart, group: "Funding" },
  // Operations
  { title: "Financial", url: "/financial", icon: Wallet, group: "Operations" },
  { title: "HR & Staff", url: "/hr", icon: UserCog, group: "Operations" },
  { title: "Procurement", url: "/procurement", icon: ShoppingCart, group: "Operations" },
  { title: "Branches", url: "/branches", icon: Building2, group: "Operations" },
  { title: "Field Mode", url: "/field-mode", icon: Smartphone, group: "Operations" },
  // Engagement
  { title: "Communications", url: "/communications", icon: MessageSquare, group: "Engagement" },
  { title: "Automation", url: "/automation", icon: Zap, group: "Engagement" },
  { title: "Documents", url: "/document-management", icon: FileText, group: "Engagement" },
  // Governance
  { title: "Compliance", url: "/compliance", icon: ShieldCheck, group: "Governance" },
  { title: "Board Portal", url: "/board-reporting", icon: Presentation, group: "Governance" },
  { title: "Accountability & Safeguarding", url: "/safeguarding", icon: Shield, group: "Governance" },
  // Admin
  { title: "Roles & Access", url: "/role-management", icon: Lock, group: "Admin" },
  { title: "Organization Settings", url: "/organization-settings", icon: Settings, group: "Admin" },
];

const createActions = [
  { title: "New beneficiary", url: "/beneficiaries?new=1", icon: UserPlus },
  { title: "New program", url: "/programs-management?new=1", icon: Target },
  { title: "New project", url: "/projects?new=1", icon: FolderKanban },
  { title: "New donor", url: "/donors?new=1", icon: HandCoins },
  { title: "Record financial transaction", url: "/financial?new=1", icon: Wallet },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const [query, setQuery] = useState("");

  // Live search across beneficiaries, programs, donors, projects
  const { data: results } = useQuery({
    queryKey: ["cmdk-search", orgId, query],
    queryFn: async () => {
      if (!orgId || query.trim().length < 2) {
        return { beneficiaries: [], programs: [], donors: [], projects: [] };
      }
      const q = query.trim();
      const like = `%${q}%`;
      const ben: any = await supabase
        .from("beneficiaries")
        .select("id, display_name")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .ilike("display_name", like)
        .limit(5);
      const prog: any = await supabase
        .from("programs")
        .select("id, name")
        .eq("organization_id", orgId)
        .ilike("name", like)
        .limit(5);
      const don: any = await supabase
        .from("donor_accounts")
        .select("id, donor_name")
        .eq("organization_id", orgId)
        .ilike("donor_name", like)
        .limit(5);
      const proj: any = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", orgId)
        .ilike("name", like)
        .limit(5);
      return {
        beneficiaries: (ben.data ?? []) as Array<{ id: string; display_name: string }>,
        programs: (prog.data ?? []) as Array<{ id: string; name: string }>,
        donors: (don.data ?? []) as Array<{ id: string; donor_name: string }>,
        projects: (proj.data ?? []) as Array<{ id: string; name: string }>,
      };
    },
    enabled: !!orgId && query.trim().length >= 2,
    staleTime: 30_000,
  });

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

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleSelect = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search ApexOS — pages, beneficiaries, programs, donors, projects…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {results && results.beneficiaries.length > 0 && (
          <CommandGroup heading="Beneficiaries">
            {results.beneficiaries.map((b: any) => (
              <CommandItem
                key={`b-${b.id}`}
                onSelect={() => handleSelect(`/beneficiaries/${b.id}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{b.display_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results && results.programs.length > 0 && (
          <CommandGroup heading="Programs">
            {results.programs.map((p: any) => (
              <CommandItem
                key={`p-${p.id}`}
                onSelect={() => handleSelect(`/programs/dashboard/${p.id}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{p.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results && results.projects.length > 0 && (
          <CommandGroup heading="Projects">
            {results.projects.map((p: any) => (
              <CommandItem
                key={`pr-${p.id}`}
                onSelect={() => handleSelect(`/projects/dashboard/${p.id}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span>{p.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results && results.donors.length > 0 && (
          <CommandGroup heading="Donors">
            {results.donors.map((d: any) => (
              <CommandItem
                key={`d-${d.id}`}
                onSelect={() => handleSelect(`/donors?id=${d.id}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <HandCoins className="h-4 w-4 text-muted-foreground" />
                <span>{d.donor_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Create">
          {createActions.map((item) => (
            <CommandItem
              key={item.title}
              onSelect={() => handleSelect(item.url)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {Array.from(new Set(navigationItems.map((i) => i.group))).map((group) => (
          <CommandGroup key={group} heading={`Go to · ${group}`}>
            {navigationItems
              .filter((i) => i.group === group)
              .map((item) => (
                <CommandItem
                  key={item.title}
                  value={`${group} ${item.title} ${item.url}`}
                  onSelect={() => handleSelect(item.url)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

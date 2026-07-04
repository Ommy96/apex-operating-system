import { useNavigate } from "react-router-dom";
import {
  Users, Target, FolderKanban, DollarSign, HandCoins, Wallet, BarChart3, FileText, ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useBeneficiaryTerminology } from "@/hooks/useBeneficiaryTerminology";

interface NavCardData {
  title: string;
  icon: React.ElementType;
  path: string;
  count: number | null;
  subtitle: string;
}

export function QuickNavCards() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { termPlural } = useBeneficiaryTerminology();
  const orgId = currentOrganization?.organization_id;

  const { data: counts } = useQuery({
    queryKey: ["dashboard-nav-counts", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const [beneficiaries, programs, projects, donors, expenses] = await Promise.all([
        supabase.from("beneficiaries").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active").is("deleted_at", null),
        supabase.from("programs").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("beneficiary_donors").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("expenses").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      return {
        beneficiaries: beneficiaries.count ?? 0,
        programs: programs.count ?? 0,
        projects: projects.count ?? 0,
        donors: donors.count ?? 0,
        expenses: expenses.count ?? 0,
      };
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  const cards: NavCardData[] = [
    { title: termPlural, icon: Users, path: "/beneficiaries", count: counts?.beneficiaries ?? null, subtitle: "Active individuals" },
    { title: "Programs", icon: Target, path: "/programs-management", count: counts?.programs ?? null, subtitle: "Active programs" },
    { title: "Projects", icon: FolderKanban, path: "/programs-management", count: counts?.projects ?? null, subtitle: "Total projects" },
    { title: "Donors", icon: HandCoins, path: "/beneficiaries", count: counts?.donors ?? null, subtitle: "Sponsor records" },
    { title: "Finance", icon: Wallet, path: "/financial", count: counts?.expenses ?? null, subtitle: "Expense records" },
    { title: "M&E", icon: BarChart3, path: "/me-suite", count: null, subtitle: "Monitoring & Evaluation" },
    { title: "Analytics", icon: BarChart3, path: "/analytics", count: null, subtitle: "Reports & insights" },
    { title: "Documents", icon: FileText, path: "/document-management", count: null, subtitle: "File management" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <button
          key={card.title}
          onClick={() => navigate(card.path)}
          className="group flex flex-col p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <card.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm font-semibold text-foreground">{card.title}</p>
          {card.count !== null ? (
            <p className="text-lg font-bold text-primary mt-0.5">{card.count}</p>
          ) : null}
          <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
        </button>
      ))}
    </div>
  );
}

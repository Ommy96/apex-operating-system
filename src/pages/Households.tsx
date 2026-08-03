import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Plus, Search, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useHouseholds } from "@/hooks/useBeneficiaryRelationships";
import { PageHeader, WorkspacePanel, StatCard } from "@/components/workspace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type HouseholdRow = {
  id: string;
  household_name: string | null;
  head_of_household_id: string | null;
  county: string | null;
  sub_county: string | null;
  member_count: number | null;
  primary_needs?: string[] | null;
};

const SIZE_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: "1 member", min: 1, max: 1 },
  { label: "2–4", min: 2, max: 4 },
  { label: "5–7", min: 5, max: 7 },
  { label: "8+", min: 8, max: 999 },
];

export default function Households() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const { data: households = [], isLoading } = useHouseholds() as { data: HouseholdRow[]; isLoading: boolean };

  const [search, setSearch] = useState("");
  const [county, setCounty] = useState<string>("all");
  const [subCounty, setSubCounty] = useState<string>("all");
  const [sizeBand, setSizeBand] = useState<string>("all");

  // Fetch head names for display
  const headIds = useMemo(
    () => Array.from(new Set(households.map(h => h.head_of_household_id).filter(Boolean))) as string[],
    [households]
  );
  const { data: headMap = {} } = useQuery({
    queryKey: ["household-heads", headIds],
    enabled: headIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("id, display_name")
        .in("id", headIds);
      if (error) throw error;
      const m: Record<string, string> = {};
      (data ?? []).forEach((b: any) => { m[b.id] = b.display_name; });
      return m;
    },
  });

  const counties = useMemo(
    () => Array.from(new Set(households.map(h => h.county).filter(Boolean))) as string[],
    [households]
  );
  const subCounties = useMemo(
    () => Array.from(new Set(households.filter(h => county === "all" || h.county === county).map(h => h.sub_county).filter(Boolean))) as string[],
    [households, county]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return households.filter(h => {
      if (county !== "all" && h.county !== county) return false;
      if (subCounty !== "all" && h.sub_county !== subCounty) return false;
      if (sizeBand !== "all") {
        const band = SIZE_BANDS.find(s => s.label === sizeBand);
        const c = h.member_count ?? 0;
        if (band && (c < band.min || c > band.max)) return false;
      }
      if (!term) return true;
      const headName = (h.head_of_household_id && headMap[h.head_of_household_id]) || "";
      return (
        (h.household_name ?? "").toLowerCase().includes(term) ||
        headName.toLowerCase().includes(term)
      );
    });
  }, [households, search, county, subCounty, sizeBand, headMap]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organisation selected");
      const { data, error } = await supabase
        .from("households")
        .insert({ organization_id: orgId, household_name: "New household" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
      navigate(`/households/${id}?selectHead=1`);
    },
    onError: (e: any) => toast({ title: "Failed to create household", description: e.message, variant: "destructive" }),
  });

  const totalMembers = households.reduce((s, h) => s + (h.member_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Households"
        description="Family units grouping related beneficiaries together"
        icon={Home}
        actions={
          <Button className="h-9 gap-1.5" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4" /> New household
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Households" value={households.length} icon={Home} variant="primary" />
        <StatCard title="Total members" value={totalMembers} icon={Users} variant="success" />
        <StatCard
          title="Avg household size"
          value={households.length ? (totalMembers / households.length).toFixed(1) : "0"}
          icon={Users}
          variant="info"
        />
      </div>

      <WorkspacePanel padding="sm" className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by household or head of household…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-border"
          />
        </div>
        <Select value={county} onValueChange={(v) => { setCounty(v); setSubCounty("all"); }}>
          <SelectTrigger className="h-9 w-full md:w-44"><SelectValue placeholder="County" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All counties</SelectItem>
            {counties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subCounty} onValueChange={setSubCounty}>
          <SelectTrigger className="h-9 w-full md:w-44"><SelectValue placeholder="Sub-county" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sub-counties</SelectItem>
            {subCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sizeBand} onValueChange={setSizeBand}>
          <SelectTrigger className="h-9 w-full md:w-40"><SelectValue placeholder="Household size" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any size</SelectItem>
            {SIZE_BANDS.map(b => <SelectItem key={b.label} value={b.label}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </WorkspacePanel>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Home className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-medium">No households match these filters</p>
              <p className="text-sm text-muted-foreground">
                Try clearing filters, or create the first household for this organisation.
              </p>
            </div>
            <Button variant="outline" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" /> New household
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((h) => {
            const headName = h.head_of_household_id && headMap[h.head_of_household_id];
            const needs = (h.primary_needs ?? []).slice(0, 3);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => navigate(`/households/${h.id}`)}
                className="w-full text-left rounded-lg border bg-card hover:border-primary/40 hover:bg-secondary/30 transition-colors px-4 py-3 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{h.household_name || "Household"}</div>
                  <div className="text-xs text-muted-foreground">
                    {headName ? <>Head: {headName}</> : <span className="italic">No head set</span>}
                    {(h.county || h.sub_county) && <> · {[h.sub_county, h.county].filter(Boolean).join(", ")}</>}
                  </div>
                  {needs.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">Needs: {needs.join(" · ")}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {h.member_count ?? 0} member{(h.member_count ?? 0) === 1 ? "" : "s"}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
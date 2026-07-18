import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useSponsorshipPackages } from "@/hooks/useSponsorshipPackages";
import { formatMoney } from "@/lib/allocationEngine";
import { Users, UserPlus, ClipboardList, PieChart as PieIcon, FileText, HeartHandshake } from "lucide-react";

const sb = supabase as any;

interface Sponsorship {
  id: string;
  beneficiary_id: string | null;
  program_id: string | null;
  sponsorship_package_id: string | null;
  donor_name: string;
  amount_received: number;
  donation_date: string;
  beneficiaries?: { id: string; display_name: string } | null;
  programs?: { id: string; name: string } | null;
  sponsorship_packages?: { id: string; name: string; monthly_cost: number; currency: string } | null;
}

export function SponsorshipDashboard() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const { data: packages = [] } = useSponsorshipPackages();

  const { data: sponsorships = [], isLoading } = useQuery({
    enabled: !!orgId,
    queryKey: ["sponsorship-dashboard", orgId],
    queryFn: async (): Promise<Sponsorship[]> => {
      const { data, error } = await sb
        .from("beneficiary_donors")
        .select(
          "id, beneficiary_id, program_id, sponsorship_package_id, donor_name, amount_received, donation_date, " +
          "beneficiaries:beneficiary_id(id, display_name), " +
          "programs:program_id(id, name), " +
          "sponsorship_packages:sponsorship_package_id(id, name, monthly_cost, currency)"
        )
        .eq("organization_id", orgId)
        .order("donation_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const { data: benCounts } = useQuery({
    enabled: !!orgId,
    queryKey: ["sponsorship-ben-counts", orgId],
    queryFn: async () => {
      const { count } = await sb
        .from("beneficiaries")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("deleted_at", null);
      return count || 0;
    },
  });

  const analytics = useMemo(() => {
    // Group latest sponsorship by beneficiary
    const byBen: Record<string, Sponsorship> = {};
    for (const s of sponsorships) {
      if (!s.beneficiary_id) continue;
      if (!byBen[s.beneficiary_id]) byBen[s.beneficiary_id] = s;
    }
    const sponsoredIds = new Set(Object.keys(byBen));
    const totalBens = benCounts || 0;

    // Coverage: fully = latest amount >= package monthly cost; partial = >0 but < cost; unsponsored = rest
    let fully = 0, partial = 0;
    for (const s of Object.values(byBen)) {
      const req = s.sponsorship_packages?.monthly_cost ?? 0;
      const amt = Number(s.amount_received || 0);
      if (req > 0) {
        if (amt >= req) fully += 1;
        else if (amt > 0) partial += 1;
        else partial += 1;
      } else if (amt > 0) fully += 1;
    }
    const unsponsored = Math.max(0, totalBens - sponsoredIds.size);

    // Package distribution
    const pkgDist: Record<string, number> = {};
    for (const s of sponsorships) {
      const pid = s.sponsorship_package_id || "unassigned";
      pkgDist[pid] = (pkgDist[pid] || 0) + 1;
    }

    // Lifetime given by donor+beneficiary
    const lifetime: Record<string, number> = {};
    for (const s of sponsorships) {
      const k = `${s.donor_name}|${s.beneficiary_id}`;
      lifetime[k] = (lifetime[k] || 0) + Number(s.amount_received || 0);
    }

    return { fully, partial, unsponsored, sponsoredCount: sponsoredIds.size, totalBens, pkgDist, lifetime };
  }, [sponsorships, benCounts]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" /> Sponsorship health
          </CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Fully sponsored</span><span className="font-semibold text-success">{analytics.fully}</span></div>
            <div className="flex justify-between"><span>Partially sponsored</span><span className="font-semibold text-warning">{analytics.partial}</span></div>
            <div className="flex justify-between"><span>Unsponsored</span><span className="font-semibold text-destructive">{analytics.unsponsored}</span></div>
            <div className="flex justify-between pt-1 border-t"><span className="text-muted-foreground">Total beneficiaries</span><span className="font-medium">{analytics.totalBens}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <PieIcon className="h-4 w-4" /> Package distribution
          </CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {packages.length === 0 && (
              <p className="text-muted-foreground text-xs">No packages yet.</p>
            )}
            {packages.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="truncate">{p.name}</span>
                <Badge variant="secondary">{analytics.pkgDist[p.id] || 0} sponsors</Badge>
              </div>
            ))}
            {analytics.pkgDist["unassigned"] ? (
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-muted-foreground">No package</span>
                <Badge variant="outline">{analytics.pkgDist["unassigned"]}</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Quick actions
          </CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/beneficiaries")}>
              <UserPlus className="h-4 w-4 mr-2" /> Add sponsor to a beneficiary
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/waitlist")}>
              <Users className="h-4 w-4 mr-2" /> View waiting list
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/sponsorship-packages")}>
              <PieIcon className="h-4 w-4 mr-2" /> Manage packages
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/reports")}>
              <FileText className="h-4 w-4 mr-2" /> Generate sponsor reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active sponsorships list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active sponsorships</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sponsorships.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No sponsorships recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead className="text-right">Lifetime given</TableHead>
                    <TableHead>Latest gift</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sponsorships.slice(0, 100).map((s) => {
                    const req = s.sponsorship_packages?.monthly_cost ?? 0;
                    const amt = Number(s.amount_received || 0);
                    const cur = s.sponsorship_packages?.currency || "KES";
                    const lifetime = analytics.lifetime[`${s.donor_name}|${s.beneficiary_id}`] || amt;
                    const status = req > 0 && amt < req ? "partial" : "full";
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.donor_name}</TableCell>
                        <TableCell>
                          {s.beneficiaries?.display_name ? (
                            <button
                              className="text-primary hover:underline"
                              onClick={() => navigate(`/beneficiaries/${s.beneficiary_id}`)}
                            >
                              {s.beneficiaries.display_name}
                            </button>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{s.sponsorship_packages?.name || <span className="text-muted-foreground text-xs">No package</span>}</TableCell>
                        <TableCell className="text-right">{req > 0 ? formatMoney(req, cur) : "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(lifetime, cur)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.donation_date}</TableCell>
                        <TableCell>
                          <Badge variant={status === "full" ? "secondary" : "outline"}>
                            {status === "full" ? "Full" : "Partial"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SponsorshipDashboard;
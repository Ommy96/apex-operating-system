import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { allocateDonation, formatMoney } from "@/lib/allocationEngine";
import { toast } from "sonner";
import { RestrictionBadge } from "@/components/funding/RestrictionBadge";
import { WaitlistMatchPicker } from "@/components/waitlist/WaitlistMatchPicker";
import { useState } from "react";
import { ListOrdered } from "lucide-react";

export default function DonationsInbox() {
  const { currentOrganization: organization } = useOrganization();
  const qc = useQueryClient();
  const orgId = organization?.organization_id;
  const [matchFor, setMatchFor] = useState<{ programId?: string | null; donorAccountId?: string | null; donorName?: string | null } | null>(null);

  const { data: donations, isLoading } = useQuery({
    queryKey: ["donations-inbox", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("*, donor_accounts:donor_account_id(donor_name), donation_intents:donation_intent_id(kind, restriction, restriction_note, target_beneficiary_id, target_project_id, target_program_id)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["donations-allocations-counts", orgId, (donations ?? []).length],
    enabled: !!orgId && (donations ?? []).length > 0,
    queryFn: async () => {
      const ids = (donations ?? []).map((d: any) => d.id);
      const { data } = await supabase.from("allocations").select("donation_id, status").in("donation_id", ids);
      const m = new Map<string, { active: number; total: number }>();
      for (const a of data ?? []) {
        const e = m.get(a.donation_id) ?? { active: 0, total: 0 };
        e.total += 1;
        if (a.status === "active") e.active += 1;
        m.set(a.donation_id, e);
      }
      return m;
    },
  });

  async function manualAllocate(id: string) {
    const res = await allocateDonation(id);
    if (!res.success) return toast.error(res.error || res.message || "Failed");
    toast.success(`Allocated to ${res.allocations?.length ?? 0} beneficiary/ies`);
    qc.invalidateQueries({ queryKey: ["donations-inbox"] });
    qc.invalidateQueries({ queryKey: ["donations-allocations-counts"] });
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Donations Inbox</h1>
          <p className="text-sm text-muted-foreground">Incoming donations and their auto-allocation result.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMatchFor({})}>
          <ListOrdered className="h-4 w-4 mr-1" /> Match to a waiting applicant
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent donations</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-24 w-full" /></div>
            : (donations ?? []).length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">No donations recorded yet.</div>
            : <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Intent</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {donations!.map((d: any) => {
                    const c = counts?.get(d.id);
                    const allocStatus = !c ? "pending" : c.active > 0 ? `${c.active} active` : c.total > 0 ? "held" : "none";
                    const kind = d.donation_intents?.kind ?? "unrestricted";
                    const completed = ["completed","succeeded","success"].includes(d.status);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs">{format(new Date(d.created_at), "d MMM HH:mm")}</TableCell>
                        <TableCell className="text-xs">{d.donor_accounts?.donor_name ?? d.donor_name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{formatMoney(d.amount, d.currency)}</TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px]">{kind}</Badge>
                            <RestrictionBadge
                              restriction={d.donation_intents?.restriction}
                              note={d.donation_intents?.restriction_note}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs"><Badge variant={c?.active ? "default" : "secondary"} className="text-[10px]">{allocStatus}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {completed && d.donor_account_id && (!c || c.total === 0) && (
                              <Button size="sm" variant="outline" onClick={() => manualAllocate(d.id)}>Resolve</Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setMatchFor({
                                programId: d.donation_intents?.target_program_id ?? null,
                                donorAccountId: d.donor_account_id ?? null,
                                donorName: d.donor_accounts?.donor_name ?? d.donor_name ?? null,
                              })}
                              title="Match to a waiting applicant"
                            >
                              <ListOrdered className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table></div>}
        </CardContent>
      </Card>
      <WaitlistMatchPicker
        open={!!matchFor}
        onOpenChange={(o) => !o && setMatchFor(null)}
        programId={matchFor?.programId ?? null}
        donorAccountId={matchFor?.donorAccountId ?? null}
        donorName={matchFor?.donorName ?? null}
      />
    </div>
  );
}
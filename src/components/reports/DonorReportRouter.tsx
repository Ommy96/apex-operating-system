import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDonorScope, type DonorScopeEntry } from "@/hooks/useDonorScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectDonorReport } from "./ProjectDonorReport";
import { ProgramRollupDonorReport } from "./ProgramRollupDonorReport";
import { UnrestrictedDonorReport } from "./UnrestrictedDonorReport";
import { SponsorBeneficiaryReport } from "./SponsorBeneficiaryReport";
import { X } from "lucide-react";

const sb = supabase as any;

interface Props {
  /** Portal mode locks the donor to a given account and hides picker. */
  fixedDonorAccountId?: string;
  /** Optional default period. */
  initialPeriodStart?: string;
  initialPeriodEnd?: string;
}

/**
 * Scope-aware donor report generator.
 *
 * Admin usage: pick any donor in the org, we detect their funding scope(s)
 * and propose the right report shape(s).
 * Portal usage: pass `fixedDonorAccountId`; the donor sees only reports
 * matching their own scope.
 */
export function DonorReportRouter({
  fixedDonorAccountId,
  initialPeriodStart,
  initialPeriodEnd,
}: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const orgName = (currentOrganization as any)?.organization_name;

  const [donorId, setDonorId] = useState<string | null>(fixedDonorAccountId ?? null);
  const today = new Date().toISOString().slice(0, 10);
  const ninetyAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(initialPeriodStart || ninetyAgo);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd || today);
  const [dropped, setDropped] = useState<Set<string>>(new Set());

  const donorsQ = useQuery({
    queryKey: ["donor-accounts-list", orgId],
    enabled: !!orgId && !fixedDonorAccountId,
    queryFn: async () => {
      const { data } = await sb
        .from("donor_accounts")
        .select("id, donor_name, email")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("donor_name");
      return data || [];
    },
  });

  const scopeQ = useDonorScope(donorId);

  const activeDonor = useMemo(
    () =>
      fixedDonorAccountId
        ? { id: fixedDonorAccountId, donor_name: "You" }
        : (donorsQ.data || []).find((d: any) => d.id === donorId),
    [donorsQ.data, donorId, fixedDonorAccountId],
  );

  const scopes = (scopeQ.data?.scopes || []).filter(
    (s) => !dropped.has(`${s.kind}:${s.targetId ?? "-"}`),
  );

  const beneficiaryScopes = scopes.filter((s) => s.kind === "beneficiary");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope-aware donor report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {!fixedDonorAccountId && (
              <div>
                <Label>Donor</Label>
                <Select value={donorId ?? ""} onValueChange={(v) => { setDonorId(v); setDropped(new Set()); }}>
                  <SelectTrigger><SelectValue placeholder="Select donor…" /></SelectTrigger>
                  <SelectContent>
                    {(donorsQ.data || []).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.donor_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          {donorId && scopeQ.isLoading && <Skeleton className="h-12 w-full" />}

          {donorId && !scopeQ.isLoading && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Detected funding scope(s) for <span className="font-medium">{activeDonor?.donor_name}</span> — the
                right report shape is generated for each. Remove any you don't need.
              </p>
              <div className="flex flex-wrap gap-2">
                {scopes.length === 0 && (
                  <span className="text-sm text-muted-foreground">No funding recorded for this donor.</span>
                )}
                {scopes.map((s) => (
                  <Badge key={`${s.kind}:${s.targetId}`} variant="secondary" className="gap-1">
                    <span className="capitalize">{s.kind}</span>: {s.targetName}
                    <button
                      type="button"
                      onClick={() =>
                        setDropped((d) => new Set([...d, `${s.kind}:${s.targetId ?? "-"}`]))
                      }
                      className="ml-1 opacity-60 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {donorId && scopes.map((s: DonorScopeEntry) => {
        if (s.kind === "project" && s.targetId) {
          return (
            <ProjectDonorReport
              key={`p-${s.targetId}`}
              projectId={s.targetId}
              donorAccountId={donorId}
              organizationName={orgName}
              restriction={s.restriction}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          );
        }
        if (s.kind === "program" && s.targetId) {
          return (
            <ProgramRollupDonorReport
              key={`pg-${s.targetId}`}
              programId={s.targetId}
              donorAccountId={donorId}
              organizationName={orgName}
              restriction={s.restriction}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          );
        }
        if (s.kind === "unrestricted") {
          return (
            <UnrestrictedDonorReport
              key="u"
              donorAccountId={donorId}
              organizationName={orgName}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          );
        }
        return null;
      })}

      {donorId && beneficiaryScopes.length > 0 && (
        <SponsorBeneficiaryReport
          organizationName={orgName}
          periodStart={periodStart}
          periodEnd={periodEnd}
          restriction={beneficiaryScopes[0].restriction}
          sponsored={beneficiaryScopes.map((s) => ({
            beneficiaryId: s.targetId!,
            beneficiaryName: s.targetName,
            totalGiven: s.totalGiven,
          }))}
        />
      )}
    </div>
  );
}
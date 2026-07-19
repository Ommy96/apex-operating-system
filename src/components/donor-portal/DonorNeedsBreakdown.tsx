import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDonorPortal } from "@/hooks/useDonorPortal";
import { useDonorFx } from "@/hooks/useDonorFx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, AlertCircle } from "lucide-react";

interface LineItem {
  id: string;
  amount_base: number;
  amount_native: number;
  native_currency: string | null;
  label: string | null;
  beneficiary_id: string | null;
  need_type_id: string | null;
  need_types?: { label: string; key: string } | null;
  beneficiaries?: { display_name: string | null; date_of_birth: string | null; grade: string | null } | null;
  allocations?: { allocated_at: string; donor_account_id: string; fx_rate: number } | null;
}

interface UnmetNeed {
  need_type_id: string;
  need_label: string;
  estimated_cost: number;
  currency: string;
  status: string;
  beneficiary_id: string;
}

function anonymize(b: any) {
  if (!b) return "a participant";
  if (b.grade) return `Student · ${b.grade}`;
  if (b.date_of_birth) {
    const yrs = Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (365.25 * 86400_000));
    if (yrs < 5) return "Child · under 5";
    if (yrs < 12) return "Child";
    if (yrs < 18) return "Youth";
  }
  return b.display_name?.split(" ")[0] ?? "Participant";
}

export function DonorNeedsBreakdown() {
  const { donorAccount } = useDonorPortal();
  const fx = useDonorFx((donorAccount as any)?.preferred_currency);
  const [items, setItems] = useState<LineItem[]>([]);
  const [unmet, setUnmet] = useState<UnmetNeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!donorAccount?.id) return;
    (async () => {
      setLoading(true);
      // Line items via allocation join
      const { data: alloc } = await (supabase as any)
        .from("allocations")
        .select("id, beneficiary_id")
        .eq("donor_account_id", donorAccount.id);
      const allocIds = (alloc ?? []).map((a: any) => a.id);
      const benIds = Array.from(new Set((alloc ?? []).map((a: any) => a.beneficiary_id).filter(Boolean)));

      if (allocIds.length) {
        const { data: li } = await (supabase as any)
          .from("allocation_line_items")
          .select("id, amount_base, amount_native, native_currency, label, beneficiary_id, need_type_id, need_types(label,key), beneficiaries(display_name,date_of_birth,grade), allocations(allocated_at,donor_account_id,fx_rate)")
          .in("allocation_id", allocIds)
          .order("created_at", { ascending: false });
        setItems((li ?? []) as any);
      }

      if (benIds.length) {
        const { data: gaps } = await (supabase as any)
          .from("beneficiary_needs")
          .select("id, beneficiary_id, need_type_id, status, estimated_cost, currency, need_types(label,key)")
          .in("beneficiary_id", benIds)
          .in("status", ["open", "partially_met"]);
        setUnmet((gaps ?? []).map((g: any) => ({
          need_type_id: g.need_type_id,
          need_label: g.need_types?.label ?? "Need",
          estimated_cost: Number(g.estimated_cost ?? 0),
          currency: g.currency ?? "KES",
          status: g.status,
          beneficiary_id: g.beneficiary_id,
        })));
      }
      setLoading(false);
    })();
  }, [donorAccount?.id]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!items.length && !unmet.length) return null;

  // Aggregate met by need
  const metByNeed = new Map<string, number>();
  items.forEach((i) => {
    const key = i.need_types?.label ?? i.label ?? "Other";
    metByNeed.set(key, (metByNeed.get(key) ?? 0) + fx.convert(Number(i.amount_base ?? 0), "KES"));
  });

  // Aggregate unmet per beneficiary
  const unmetByBen = new Map<string, UnmetNeed[]>();
  unmet.forEach((u) => {
    const arr = unmetByBen.get(u.beneficiary_id) ?? [];
    arr.push(u); unmetByBen.set(u.beneficiary_id, arr);
  });
  const totalUnmet = unmet.reduce((s, u) => s + fx.convert(u.estimated_cost, u.currency), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartHandshake className="h-4 w-4 text-primary" />
            Needs your giving met
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...metByNeed.entries()].sort((a,b) => b[1] - a[1]).map(([label, amt]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span>{label}</span>
              <span className="font-mono font-semibold">{fx.format(amt, fx.target)}</span>
            </div>
          ))}
          {metByNeed.size === 0 && (
            <p className="text-sm text-muted-foreground">No itemised allocations yet.</p>
          )}
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Amounts converted at the FX rate captured on the allocation date.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-warning" />
            Still-unmet needs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {unmetByBen.size === 0 ? (
            <p className="text-sm text-muted-foreground">All tracked needs are covered — thank you.</p>
          ) : (
            <>
              <div className="text-2xl font-bold">{fx.format(totalUnmet, fx.target)}</div>
              <p className="text-xs text-muted-foreground">
                Estimated cost to close all outstanding needs across your sponsorships.
              </p>
              {[...unmetByBen.entries()].slice(0, 3).map(([benId, needs]) => (
                <div key={benId} className="text-sm border-t pt-2 first:border-t-0 first:pt-0">
                  <div className="font-medium">{needs.length} unmet need{needs.length !== 1 ? "s" : ""}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {needs.map((n) => (
                      <Badge key={n.need_type_id + benId} variant={n.status === "partially_met" ? "secondary" : "outline"}>
                        {n.need_label} · {fx.format(n.estimated_cost, n.currency)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RestrictionBadge } from "@/components/funding/RestrictionBadge";
import { CurrencyAmount } from "@/components/finance/CurrencyAmount";
import { FileDown, Loader2 } from "lucide-react";
import { exportNodeToPdf } from "@/lib/pdfExport";
import { toast } from "sonner";

const sb = supabase as any;

interface Props {
  donorAccountId: string;
  organizationName?: string;
  periodStart: string;
  periodEnd: string;
}

export function UnrestrictedDonorReport({
  donorAccountId,
  organizationName,
  periodStart,
  periodEnd,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Everything unrestricted this donor gave
  const contributed = useQuery({
    queryKey: ["unrestricted-donor-contributed", donorAccountId],
    queryFn: async () => {
      const { data } = await sb
        .from("donation_intents")
        .select("committed_amount")
        .eq("donor_account_id", donorAccountId)
        .eq("restriction", "unrestricted");
      return (data || []).reduce((s: number, r: any) => s + Number(r.committed_amount || 0), 0);
    },
  });

  // How this donor's unrestricted funds were downstream allocated across programs
  const spread = useQuery({
    queryKey: ["unrestricted-donor-spread", donorAccountId, periodStart, periodEnd],
    queryFn: async () => {
      const { data } = await sb
        .from("allocations")
        .select("amount_base, program_id, project_id, allocated_at, program:programs(name), project:projects(name)")
        .eq("donor_account_id", donorAccountId)
        .eq("restriction", "unrestricted")
        .gte("allocated_at", periodStart)
        .lte("allocated_at", periodEnd + "T23:59:59");
      const byProgram = new Map<string, { name: string; total: number }>();
      (data || []).forEach((a: any) => {
        const key = a.program_id || "org";
        const cur = byProgram.get(key) || { name: a.program?.name || "Organisation-wide", total: 0 };
        cur.total += Number(a.amount_base || 0);
        byProgram.set(key, cur);
      });
      return [...byProgram.values()].sort((a, b) => b.total - a.total);
    },
  });

  const totalSpread = (spread.data || []).reduce((s, r) => s + r.total, 0);

  const handleExport = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      await exportNodeToPdf(ref.current, `organisation-impact-${donorAccountId}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
          Export PDF
        </Button>
      </div>
      <div ref={ref} className="space-y-6 bg-background p-6 rounded-lg border">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">{organizationName || "Organisation"}</h2>
          <h3 className="text-lg font-semibold">Organisation-wide Impact Summary</h3>
          <p className="text-sm text-muted-foreground">Period: {periodStart} to {periodEnd}</p>
          <div className="flex justify-center pt-1"><RestrictionBadge restriction="unrestricted" /></div>
        </div>
        <Separator />

        <Card>
          <CardHeader><CardTitle className="text-base">Your flexible funding</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center text-sm">
              <div>
                <p className="text-2xl font-bold"><CurrencyAmount amount={contributed.data || 0} currency="KES" /></p>
                <p className="text-muted-foreground">Total unrestricted contributed</p>
              </div>
              <div>
                <p className="text-2xl font-bold"><CurrencyAmount amount={totalSpread} currency="KES" /></p>
                <p className="text-muted-foreground">Allocated in period</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Unrestricted funds are applied wherever they are most needed. All figures shown in KES equivalent.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Where your flexible funds went</CardTitle></CardHeader>
          <CardContent>
            {(spread.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No downstream allocations recorded in this period.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(spread.data || []).map((s, i) => {
                  const pct = totalSpread > 0 ? (s.total / totalSpread) * 100 : 0;
                  return (
                    <li key={i} className="flex justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of allocated funds</p>
                      </div>
                      <p className="font-medium"><CurrencyAmount amount={s.total} currency="KES" /></p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, HandCoins } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export function BeneficiaryActivitiesSection({ beneficiaryId }: { beneficiaryId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["beneficiary-activities", beneficiaryId],
    queryFn: async () => {
      const [p, d] = await Promise.all([
        (supabase as any)
          .from("activity_participants")
          .select("id, activity_id, attendance_status, arrival_at, activities(id, name, type, status, scheduled_at)")
          .eq("beneficiary_id", beneficiaryId)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("activity_disbursements")
          .select("id, activity_id, kind, quantity, unit, monetary_value, currency, disbursed_at, activities(id, name, type, status, scheduled_at)")
          .eq("beneficiary_id", beneficiaryId)
          .order("disbursed_at", { ascending: false })
          .limit(50),
      ]);
      const events = (p.data || []).map((x: any) => ({
        key: `p-${x.id}`, kind: "event" as const, activity: x.activities,
        when: x.arrival_at || x.activities?.scheduled_at, label: x.attendance_status,
      }));
      const disb = (d.data || []).map((x: any) => ({
        key: `d-${x.id}`, kind: "disbursement" as const, activity: x.activities,
        when: x.disbursed_at || x.activities?.scheduled_at,
        label: `${String(x.kind).replace(/_/g, " ")}${x.monetary_value ? ` · ${x.currency || ""} ${Number(x.monetary_value).toLocaleString()}` : ""}`,
      }));
      return [...events, ...disb].sort((a, b) => (new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime()));
    },
    enabled: !!beneficiaryId,
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data || data.length === 0) return null;

  return (
    <div className="pt-2">
      <div className="text-[14px] mb-3" style={{ color: '#1C1917', fontWeight: 600 }}>Activities & disbursements</div>
      <Card>
        <CardContent className="p-0 divide-y">
          {data.slice(0, 10).map((row) => (
            <Link
              key={row.key}
              to={row.activity ? `/activities/${row.activity.id}` : "#"}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {row.kind === "disbursement"
                  ? <HandCoins className="h-4 w-4 text-amber-600" />
                  : <Calendar className="h-4 w-4 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{row.activity?.name || "Activity"}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {row.label}
                  {row.when && ` · ${format(new Date(row.when), "dd MMM yyyy")}`}
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
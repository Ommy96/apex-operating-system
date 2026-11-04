import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

/**
 * Aggregate-only view for programme managers looking at a programme they
 * are not assigned to. Totals come from the get_program_aggregate RPC,
 * which verifies organisation membership server-side and suppresses any
 * count below the minimum cell size (returns null → rendered as "—").
 * No names, profiles, documents or identifiable detail are shown.
 */

type Aggregate = {
  program_id: string;
  total_beneficiaries: number | null;
  active_beneficiaries: number | null;
  male: number | null;
  female: number | null;
  minimum_cell_size: number;
};

function Cell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex-1 min-w-[90px]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value === null ? "—" : value}</p>
    </div>
  );
}

export function ProgramAggregateBanner({ programId }: { programId: string | null }) {
  const { isProgramScoped } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["program-aggregate", programId],
    queryFn: async (): Promise<Aggregate> => {
      const { data, error } = await supabase.rpc("get_program_aggregate", {
        _program_id: programId!,
      });
      if (error) throw error;
      return data as Aggregate;
    },
    enabled: isProgramScoped && !!programId,
    staleTime: 60_000,
  });

  if (!isProgramScoped || !programId) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Aggregate view — totals only
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-3">
        <p>
          You are not assigned to this programme, so individual records are hidden.
          Small groups are suppressed to protect privacy.
        </p>
        {isLoading ? (
          <div className="flex gap-6">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        ) : data ? (
          <div className="flex gap-6 flex-wrap text-foreground">
            <Cell label="People reached" value={data.total_beneficiaries} />
            <Cell label="Currently active" value={data.active_beneficiaries} />
            <Cell label="Male" value={data.male} />
            <Cell label="Female" value={data.female} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

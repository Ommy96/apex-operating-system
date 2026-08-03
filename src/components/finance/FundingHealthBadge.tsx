import { useFundingHealthScore } from "@/hooks/useFundingIntelligence";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function scoreColor(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}
function scoreBg(score: number) {
  if (score >= 75) return "bg-success/10";
  if (score >= 50) return "bg-warning/10";
  return "bg-destructive/10";
}

export function FundingHealthBadge({ programId, compact = false }: { programId: string; compact?: boolean }) {
  const { data, isLoading } = useFundingHealthScore(programId);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data) return null;

  const score = Number(data.score || 0);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2", scoreBg(score))}>
        <div className={cn("text-2xl font-bold", scoreColor(score))}>{score}</div>
        <div className="text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Funding Health</div>
          <div>Coverage {data.coverage}% · Donors {data.donor_count}</div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Funding Health Score</p>
            <p className={cn("text-4xl font-bold mt-1", scoreColor(score))}>{score}<span className="text-base text-muted-foreground font-normal">/100</span></p>
          </div>
          <div className={cn("h-14 w-14 rounded-full flex items-center justify-center", scoreBg(score))}>
            <Activity className={cn("h-7 w-7", scoreColor(score))} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <SubScore icon={TrendingUp} label="Coverage" value={data.coverage} />
          <SubScore icon={Activity} label="Burn rate" value={data.burn} />
          <SubScore icon={Users} label="Donor diversity" value={data.diversity} />
          <SubScore icon={Clock} label="Grant expiry" value={data.expiry} />
        </div>
      </CardContent>
    </Card>
  );
}

function SubScore({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("ml-auto font-semibold", scoreColor(value))}>{Math.round(value)}</span>
    </div>
  );
}
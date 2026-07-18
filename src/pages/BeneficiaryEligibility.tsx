import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useBeneficiaryEligibilityScores, useRecomputeEligibility } from "@/hooks/useEligibility";

export default function BeneficiaryEligibility() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sb = supabase as any;
  const { currentOrganization } = useOrganization();
  const recompute = useRecomputeEligibility();

  const { data: ben } = useQuery({
    enabled: !!id,
    queryKey: ["beneficiary-light", id],
    queryFn: async () => {
      const { data } = await sb
        .from("beneficiaries")
        .select("id, first_name, last_name, display_name, date_of_birth, gender")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  // Auto-trigger a score refresh on first visit
  useEffect(() => {
    if (id && currentOrganization?.organization_id) {
      recompute.mutate({ mode: "beneficiary", beneficiaryId: id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentOrganization?.organization_id]);

  const { data: scores = [], isLoading } = useBeneficiaryEligibilityScores(id);

  const enroll = async (projectId: string, programId?: string | null) => {
    if (!id || !currentOrganization?.organization_id) return;
    const { error } = await sb.from("beneficiary_services").insert({
      organization_id: currentOrganization.organization_id,
      beneficiary_id: id,
      project_id: projectId,
      program_id: programId ?? null,
      status: "active",
      enrolled_date: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enrolled");
  };

  const eligible = scores.filter((s: any) => s.eligible);
  const ineligible = scores.filter((s: any) => !s.eligible);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ShieldCheck className="h-5 w-5" /> Eligibility
            </h1>
            {ben && (
              <p className="text-sm text-muted-foreground">
                {(ben as any).display_name || `${(ben as any).first_name ?? ""} ${(ben as any).last_name ?? ""}`}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          disabled={recompute.isPending}
          onClick={() => recompute.mutate({ mode: "beneficiary", beneficiaryId: id })}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${recompute.isPending ? "animate-spin" : ""}`} />
          Re-score
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <Section title={`Eligible for ${eligible.length} project(s)`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}>
            {eligible.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not eligible for any project yet.</p>
            ) : (
              eligible.map((s: any) => (
                <ScoreCard key={s.id} score={s} onEnroll={() => enroll(s.project_id, s.projects?.program_id ?? null)} />
              ))
            )}
          </Section>

          <Section title={`Not eligible (${ineligible.length})`} icon={<XCircle className="h-4 w-4 text-muted-foreground" />}>
            {ineligible.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              ineligible.map((s: any) => <ScoreCard key={s.id} score={s} />)
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function ScoreCard({ score, onEnroll }: { score: any; onEnroll?: () => void }) {
  const max = Math.max(1, score.max_score || 0);
  const pct = Math.min(100, Math.round((score.score / max) * 100));
  const projectName = score.projects?.name || "Project";
  const programName = score.projects?.programs?.name;

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{projectName}</div>
          {programName && <div className="text-xs text-muted-foreground">{programName}</div>}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={score.eligible ? "default" : "outline"}>
            {score.eligible ? "Eligible" : "Not eligible"}
          </Badge>
          <span className="font-mono text-sm tabular-nums">
            {score.score} / {score.max_score}
          </span>
          {onEnroll && (
            <Button size="sm" onClick={onEnroll}>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Enroll
            </Button>
          )}
        </div>
      </div>
      <Progress value={pct} className="mt-2 h-2" />
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Met rules</div>
          {(score.matched_rules || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {(score.matched_rules || []).map((m: any) => (
                <li key={m.rule_id} className="flex items-center justify-between">
                  <span className="truncate">{m.name}</span>
                  <span className="font-mono text-muted-foreground">+{Math.round(m.points)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Failed required</div>
          {(score.failed_required_rules || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {(score.failed_required_rules || []).map((m: any) => (
                <li key={m.rule_id} className="text-destructive">• {m.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
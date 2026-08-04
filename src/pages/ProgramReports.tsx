import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useResolvedRecordId } from "@/hooks/useResolvedRecordId";
import { RecordNotFound } from "@/components/RecordNotFound";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, FileText, Layers, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { format, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { aggregateProgramQuantitative, type QuantitativeReport } from "@/lib/reportAggregation";
import { QuantitativeView } from "@/components/reports/QuantitativeView";

type Draft = {
  id: string;
  program_id: string;
  period_start: string;
  period_end: string;
  status: "draft" | "submitted" | "approved";
  quantitative: QuantitativeReport;
  qualitative_summary: string | null;
  qualitative_lessons: string | null;
  source_project_report_ids: string[];
  generated_at: string;
};

export default function ProgramReports() {
  const { programId: routeParam } = useParams<{ programId: string }>();
  const { id: programId, notFound: recordNotFound } = useResolvedRecordId(routeParam, "program", {
    toPath: (ref) => `/programs/${ref}/reports`,
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const sb = supabase as any;

  const [program, setProgram] = useState<{ id: string; name: string } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const last = useMemo(() => subMonths(new Date(), 1), []);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(last), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(last), "yyyy-MM-dd"));

  const load = async () => {
    if (!orgId || !programId) return;
    setLoading(true);
    const { data: p } = await sb.from("programs").select("id,name").eq("id", programId).maybeSingle();
    setProgram(p || null);
    const { data: d } = await sb
      .from("program_report_drafts")
      .select("*")
      .eq("organization_id", orgId)
      .eq("program_id", programId)
      .order("period_end", { ascending: false });
    setDrafts((d as Draft[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId, programId]);

  const generate = async () => {
    if (!orgId || !programId || !user?.id) return;
    setGenerating(true);
    try {
      // 1. Fetch all projects in this program
      const { data: projects } = await sb
        .from("projects")
        .select("id")
        .eq("organization_id", orgId)
        .eq("program_id", programId);
      const projectIds = ((projects as any[]) || []).map((p) => p.id);
      if (projectIds.length === 0) {
        toast.error("No projects in this program");
        return;
      }

      // 2. Fetch approved project reports overlapping this period
      const { data: reports } = await sb
        .from("project_report_drafts")
        .select("id, project_id, quantitative")
        .eq("organization_id", orgId)
        .in("project_id", projectIds)
        .eq("status", "approved")
        .gte("period_start", periodStart)
        .lte("period_end", periodEnd);

      const rows = (reports as any[]) || [];
      if (rows.length === 0) {
        toast.error("No approved project reports in this period yet");
        return;
      }

      const agg = aggregateProgramQuantitative(rows.map((r) => r.quantitative as QuantitativeReport));

      const { data, error } = await sb
        .from("program_report_drafts")
        .upsert(
          {
            organization_id: orgId,
            program_id: programId,
            period_start: periodStart,
            period_end: periodEnd,
            quantitative: agg,
            source_project_report_ids: rows.map((r) => r.id),
            generated_at: new Date().toISOString(),
            generated_by: user.id,
            status: "draft",
          },
          { onConflict: "program_id,period_start,period_end" },
        )
        .select()
        .single();
      if (error) throw error;
      toast.success(`Rolled up ${rows.length} project report(s)`);
      await load();
      setSelectedId(data.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to roll up");
    } finally {
      setGenerating(false);
    }
  };

  const selected = drafts.find((d) => d.id === selectedId) || null;

  if (recordNotFound) return <RecordNotFound label="Programme" backTo="/programs-management" />;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Layers className="h-5 w-5" /> Program reports
          </h1>
          {program && <p className="text-sm text-muted-foreground">{program.name}</p>}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Roll up approved project reports</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <Label htmlFor="ps">Period start</Label>
              <Input id="ps" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pe">Period end</Label>
              <Input id="pe" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={generating}>
              <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              Generate roll-up
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Roll-ups</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-14 w-full" /> : drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roll-ups yet.</p>
            ) : drafts.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full rounded-md border p-3 text-left transition hover:bg-accent ${selected?.id === d.id ? "border-primary bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {format(new Date(d.period_start), "MMM d")} – {format(new Date(d.period_end), "MMM d, yyyy")}
                  </span>
                  <span className="text-xs uppercase text-muted-foreground">{d.status}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {d.source_project_report_ids?.length || 0} project report(s)
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <ProgramDraftEditor draft={selected} onChanged={load} />
        ) : (
          <Card>
            <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
              <FileText className="mr-2 h-5 w-5" /> Select a roll-up to view & edit
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProgramDraftEditor({ draft, onChanged }: { draft: Draft; onChanged: () => void }) {
  const { user } = useAuth();
  const sb = supabase as any;
  const [summary, setSummary] = useState(draft.qualitative_summary || "");
  const [lessons, setLessons] = useState(draft.qualitative_lessons || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSummary(draft.qualitative_summary || "");
    setLessons(draft.qualitative_lessons || "");
  }, [draft.id]);

  const save = async (extra: Record<string, any> = {}) => {
    setSaving(true);
    try {
      const { error } = await sb
        .from("program_report_drafts")
        .update({ qualitative_summary: summary, qualitative_lessons: lessons, ...extra })
        .eq("id", draft.id);
      if (error) throw error;
      toast.success("Saved");
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const readOnly = draft.status === "approved";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Roll-up · {format(new Date(draft.period_start), "MMM d")} – {format(new Date(draft.period_end), "MMM d, yyyy")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <QuantitativeView data={draft.quantitative} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Program narrative</Label>
            <Textarea rows={8} value={summary} disabled={readOnly} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div>
            <Label>Program-level lessons</Label>
            <Textarea rows={8} value={lessons} disabled={readOnly} onChange={(e) => setLessons(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => save()} disabled={saving || readOnly}>Save</Button>
          {draft.status === "draft" && (
            <Button onClick={() => save({ status: "submitted", submitted_at: new Date().toISOString(), submitted_by: user?.id })} disabled={saving}>
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          )}
          {draft.status === "submitted" && (
            <Button onClick={() => save({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id })} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
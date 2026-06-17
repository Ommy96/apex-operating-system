import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, FileText, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { format, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { buildProjectQuantitative, type QuantitativeReport } from "@/lib/reportAggregation";
import { QuantitativeView } from "@/components/reports/QuantitativeView";

type Draft = {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  status: "draft" | "submitted" | "approved";
  quantitative: QuantitativeReport;
  qualitative_summary: string | null;
  qualitative_lessons: string | null;
  generated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
};

export default function ProjectReports() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const sb = supabase as any;

  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // default period = last month
  const lastMonth = useMemo(() => subMonths(new Date(), 1), []);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), "yyyy-MM-dd"));

  const load = async () => {
    if (!orgId || !projectId) return;
    setLoading(true);
    const { data: p } = await sb.from("projects").select("id,name").eq("id", projectId).maybeSingle();
    setProject(p || null);
    const { data: d } = await sb
      .from("project_report_drafts")
      .select("*")
      .eq("organization_id", orgId)
      .eq("project_id", projectId)
      .order("period_end", { ascending: false });
    setDrafts((d as Draft[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId, projectId]);

  const generate = async () => {
    if (!orgId || !projectId || !user?.id) return;
    setGenerating(true);
    try {
      const q = await buildProjectQuantitative(orgId, projectId, periodStart, periodEnd);
      const { data, error } = await sb
        .from("project_report_drafts")
        .upsert(
          {
            organization_id: orgId,
            project_id: projectId,
            period_start: periodStart,
            period_end: periodEnd,
            quantitative: q,
            generated_at: new Date().toISOString(),
            generated_by: user.id,
            status: "draft",
          },
          { onConflict: "project_id,period_start,period_end" },
        )
        .select()
        .single();
      if (error) throw error;
      toast.success("Report draft generated");
      await load();
      setSelectedId(data.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const selected = drafts.find((d) => d.id === selectedId) || null;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Project reports</h1>
            {project && <p className="text-sm text-muted-foreground">{project.name}</p>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Generate a new report</CardTitle></CardHeader>
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
              Generate
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Re-generating for the same period replaces the auto-filled numbers; your narrative is preserved unless you edit it.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Drafts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet. Generate one above.</p>
            ) : (
              drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full rounded-md border p-3 text-left transition hover:bg-accent ${selected?.id === d.id ? "border-primary bg-accent" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {format(new Date(d.period_start), "MMM d")} – {format(new Date(d.period_end), "MMM d, yyyy")}
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Generated {format(new Date(d.generated_at), "PP")}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div>
          {selected ? (
            <DraftEditor draft={selected} onChanged={load} />
          ) : (
            <Card>
              <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
                <FileText className="mr-2 h-5 w-5" /> Select a draft to view & edit
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Draft["status"] }) {
  const map: Record<Draft["status"], string> = {
    draft: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    submitted: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
    approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${map[status]}`}>{status}</span>;
}

function DraftEditor({ draft, onChanged }: { draft: Draft; onChanged: () => void }) {
  const { user } = useAuth();
  const sb = supabase as any;
  const [summary, setSummary] = useState(draft.qualitative_summary || "");
  const [lessons, setLessons] = useState(draft.qualitative_lessons || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSummary(draft.qualitative_summary || "");
    setLessons(draft.qualitative_lessons || "");
  }, [draft.id]);

  const save = async (extra: Partial<Draft> = {}) => {
    setSaving(true);
    try {
      const { error } = await sb
        .from("project_report_drafts")
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

  const submit = () =>
    save({ status: "submitted", submitted_at: new Date().toISOString(), submitted_by: user?.id } as any);

  const approve = () =>
    save({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id } as any);

  const readOnly = draft.status === "approved";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Report for {format(new Date(draft.period_start), "MMM d")} – {format(new Date(draft.period_end), "MMM d, yyyy")}
          </CardTitle>
          <StatusBadge status={draft.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <QuantitativeView data={draft.quantitative} />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="sum">Narrative summary (~200 words)</Label>
            <Textarea
              id="sum"
              rows={8}
              value={summary}
              disabled={readOnly}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What happened this period? Highlight progress against goals."
            />
          </div>
          <div>
            <Label htmlFor="les">Lessons learned (~100 words)</Label>
            <Textarea
              id="les"
              rows={8}
              value={lessons}
              disabled={readOnly}
              onChange={(e) => setLessons(e.target.value)}
              placeholder="What would you do differently next period?"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => save()} disabled={saving || readOnly}>
            Save draft
          </Button>
          {draft.status === "draft" && (
            <Button onClick={submit} disabled={saving}>
              <Send className="mr-2 h-4 w-4" /> Submit for approval
            </Button>
          )}
          {draft.status === "submitted" && (
            <Button onClick={approve} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
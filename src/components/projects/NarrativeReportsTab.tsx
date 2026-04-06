import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const statusColors: Record<string, "secondary" | "outline" | "default"> = {
  draft: "secondary",
  submitted: "outline",
  approved: "default",
};

export function NarrativeReportsTab({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [addOpen, setAddOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", report_period_start: "", report_period_end: "",
    achievements: "", challenges: "", lessons: "", next_steps: "",
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["narrative-reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_narrative_reports")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const createReport = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { error } = await supabase.from("project_narrative_reports").insert({
        org_id: orgId!,
        project_id: projectId,
        author_id: user?.id,
        title: payload.title,
        report_period_start: payload.report_period_start,
        report_period_end: payload.report_period_end,
        achievements: payload.achievements || null,
        challenges: payload.challenges || null,
        lessons: payload.lessons || null,
        next_steps: payload.next_steps || null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["narrative-reports", projectId] });
      setAddOpen(false);
      setForm({ title: "", report_period_start: "", report_period_end: "", achievements: "", challenges: "", lessons: "", next_steps: "" });
      toast.success("Report created");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_narrative_reports").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["narrative-reports", projectId] });
      toast.success("Report submitted");
    },
  });

  const viewReport = reports.find(r => r.id === viewId);

  const exportPdf = async () => {
    if (!viewReport) return;
    const el = document.getElementById("narrative-report-view");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    const w = pdf.internal.pageSize.getWidth() - 20;
    const h = (canvas.height * w) / canvas.width;
    pdf.setFontSize(10);
    pdf.text(projectName || "Project", 10, 8);
    pdf.addImage(imgData, "PNG", 10, 14, w, h);
    pdf.save(`${viewReport.title.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF exported");
  };

  if (viewReport) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setViewId(null)}>← Back</Button>
          <div className="flex gap-2">
            {viewReport.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => submitReport.mutate(viewReport.id)}>
                <Send className="h-3.5 w-3.5 mr-1" />Submit
              </Button>
            )}
            <Button size="sm" onClick={exportPdf}><FileText className="h-3.5 w-3.5 mr-1" />Export PDF</Button>
          </div>
        </div>
        <div id="narrative-report-view" className="space-y-4">
          <Card className="workspace-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{viewReport.title}</CardTitle>
                <Badge variant={statusColors[viewReport.status] || "secondary"}>{viewReport.status}</Badge>
              </div>
              <CardDescription>
                {format(new Date(viewReport.report_period_start), "dd MMM yyyy")} – {format(new Date(viewReport.report_period_end), "dd MMM yyyy")}
              </CardDescription>
            </CardHeader>
          </Card>
          {[
            { label: "Achievements", value: viewReport.achievements },
            { label: "Challenges", value: viewReport.challenges },
            { label: "Lessons Learned", value: viewReport.lessons },
            { label: "Next Steps", value: viewReport.next_steps },
          ].map(s => s.value && (
            <Card key={s.label} className="workspace-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.value}</p></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Narrative Reports</h3>
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Report</Button></SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader><SheetTitle>New Narrative Report</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Period Start *</Label><Input type="date" value={form.report_period_start} onChange={e => setForm(p => ({ ...p, report_period_start: e.target.value }))} /></div>
                <div><Label>Period End *</Label><Input type="date" value={form.report_period_end} onChange={e => setForm(p => ({ ...p, report_period_end: e.target.value }))} /></div>
              </div>
              <div><Label>Achievements</Label><Textarea value={form.achievements} onChange={e => setForm(p => ({ ...p, achievements: e.target.value }))} rows={3} /></div>
              <div><Label>Challenges</Label><Textarea value={form.challenges} onChange={e => setForm(p => ({ ...p, challenges: e.target.value }))} rows={3} /></div>
              <div><Label>Lessons Learned</Label><Textarea value={form.lessons} onChange={e => setForm(p => ({ ...p, lessons: e.target.value }))} rows={3} /></div>
              <div><Label>Next Steps</Label><Textarea value={form.next_steps} onChange={e => setForm(p => ({ ...p, next_steps: e.target.value }))} rows={3} /></div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => createReport.mutate(form)} disabled={!form.title || !form.report_period_start || !form.report_period_end || createReport.isPending}>
                  {createReport.isPending ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading reports...</div>
      ) : reports.length === 0 ? (
        <Card className="workspace-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No narrative reports yet</p>
            <p className="text-xs mt-1">Submit project narrative reports with achievements, challenges, and lessons learned.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="workspace-card">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.report_period_start), "MMM dd")} – {format(new Date(r.report_period_end), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell><Badge variant={statusColors[r.status] || "secondary"} className="text-xs capitalize">{r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setViewId(r.id)}><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

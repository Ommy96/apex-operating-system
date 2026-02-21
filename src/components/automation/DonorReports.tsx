import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, FileBarChart, Play, Trash2, Eye } from "lucide-react";
import { useAutomation } from "@/hooks/useAutomation";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
};

export function DonorReports() {
  const { reportTemplates, createReportTemplate, deleteReportTemplate, reportRuns, generateReport } = useAutomation();
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState<any>(null);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", template_type: "quarterly", donor_name: "", include_financials: true, include_beneficiary_stats: true, include_program_progress: true });
  const [genForm, setGenForm] = useState({ report_period_start: "", report_period_end: "" });

  const handleCreate = () => {
    if (!form.name) return;
    createReportTemplate.mutate(form, {
      onSuccess: () => { setShowCreate(false); setForm({ name: "", description: "", template_type: "quarterly", donor_name: "", include_financials: true, include_beneficiary_stats: true, include_program_progress: true }); },
    });
  };

  const handleGenerate = (template: any) => {
    if (!genForm.report_period_start || !genForm.report_period_end) return;
    generateReport.mutate({
      template_id: template.id,
      template_name: template.name,
      ...genForm,
    }, {
      onSuccess: () => { setShowGenerate(null); setGenForm({ report_period_start: "", report_period_end: "" }); },
    });
  };

  const templates = reportTemplates.data || [];
  const runs = reportRuns.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Donor Report Generator</h3>
          <p className="text-sm text-muted-foreground">Auto-generate donor reports from templates</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Report Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Template Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. USAID Quarterly Report" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Report Type</Label>
                  <Select value={form.template_type} onValueChange={(v) => setForm({ ...form, template_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Donor Name</Label><Input value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} placeholder="e.g. UNICEF" /></div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Include Sections</Label>
                <div className="flex items-center justify-between"><span className="text-sm">Financial Summary</span><Switch checked={form.include_financials} onCheckedChange={(v) => setForm({ ...form, include_financials: v })} /></div>
                <div className="flex items-center justify-between"><span className="text-sm">Beneficiary Statistics</span><Switch checked={form.include_beneficiary_stats} onCheckedChange={(v) => setForm({ ...form, include_beneficiary_stats: v })} /></div>
                <div className="flex items-center justify-between"><span className="text-sm">Program Progress</span><Switch checked={form.include_program_progress} onCheckedChange={(v) => setForm({ ...form, include_program_progress: v })} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createReportTemplate.isPending} className="w-full">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Templates</h4>
        {!templates.length ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No report templates yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {templates.map((t: any) => (
              <Card key={t.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileBarChart className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.template_type} • {t.donor_name || "No donor"}
                          {t.include_financials && " • Financials"}
                          {t.include_beneficiary_stats && " • Beneficiaries"}
                          {t.include_program_progress && " • Programs"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={showGenerate?.id === t.id} onOpenChange={(open) => setShowGenerate(open ? t : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline"><Play className="h-3.5 w-3.5 mr-1" /> Generate</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Generate Report: {t.name}</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label>Period Start</Label><Input type="date" value={genForm.report_period_start} onChange={(e) => setGenForm({ ...genForm, report_period_start: e.target.value })} /></div>
                              <div><Label>Period End</Label><Input type="date" value={genForm.report_period_end} onChange={(e) => setGenForm({ ...genForm, report_period_end: e.target.value })} /></div>
                            </div>
                            <Button onClick={() => handleGenerate(t)} disabled={generateReport.isPending} className="w-full">
                              {generateReport.isPending ? "Generating..." : "Generate Report"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteReportTemplate.mutate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Generated Reports */}
      {runs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Generated Reports</h4>
          <div className="space-y-2">
            {runs.map((r: any) => {
              const data = r.generated_data as any;
              return (
                <Card key={r.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.template_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.report_period_start), "MMM d")} – {format(new Date(r.report_period_end), "MMM d, yyyy")}
                          {" • "}Generated {format(new Date(r.created_at), "MMM d, HH:mm")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
                        <Dialog open={showPreview?.id === r.id} onOpenChange={(open) => setShowPreview(open ? r : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>{r.template_name} — Report Preview</DialogTitle></DialogHeader>
                            {data?.summary && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground">Total Beneficiaries</p>
                                    <p className="text-lg font-bold">{data.summary.total_beneficiaries}</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground">Active Beneficiaries</p>
                                    <p className="text-lg font-bold">{data.summary.active_beneficiaries}</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground">Active Programs</p>
                                    <p className="text-lg font-bold">{data.summary.active_programs}</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground">Total Expenditure</p>
                                    <p className="text-lg font-bold">KES {data.summary.total_expenditure?.toLocaleString()}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Generated: {format(new Date(data.generated_at), "MMM d, yyyy HH:mm")}</p>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

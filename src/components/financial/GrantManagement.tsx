import { useState } from "react";
import { useFinancials } from "@/hooks/useFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Eye, Landmark, ArrowLeft, CheckSquare, Link2,
  FileText, Upload, Calendar, AlertTriangle, BarChart3, Clock, DollarSign
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { BurnRateGauge } from "@/components/finance/BurnRateGauge";
import { GrantFinancialReport } from "@/components/reports/GrantFinancialReport";
import { GrantCalendar } from "@/components/financial/GrantCalendar";

const GRANT_STATUSES = ["pipeline", "application", "submitted", "under_review", "approved", "active", "completed", "rejected", "expired"] as const;
const REPORT_TYPES = ["narrative", "financial", "impact", "compliance", "m_and_e", "annual"] as const;

export function GrantManagement() {
  const {
    grants, createGrant, updateGrant, deleteGrant, programs,
    useGrantPrograms, linkGrantProgram, useGrantCompliance, createComplianceItem, updateComplianceItem,
    useGrantReports, createGrantReport, updateGrantReport,
    useGrantDocuments, createGrantDocument, deleteGrantDocument,
    useGrantUtilization, upcomingGrantReports,
  } = useFinancials();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [createOpen, setCreateOpen] = useState(false);
  const [detailGrantId, setDetailGrantId] = useState<string | null>(null);
  const [linkProgramOpen, setLinkProgramOpen] = useState(false);
  const [addComplianceOpen, setAddComplianceOpen] = useState(false);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);

  const grantPrograms = useGrantPrograms(detailGrantId);
  const compliance = useGrantCompliance(detailGrantId);
  const grantReports = useGrantReports(detailGrantId);
  const grantDocuments = useGrantDocuments(detailGrantId);
  const utilization = useGrantUtilization(detailGrantId);

  const [form, setForm] = useState({
    grant_name: "", donor_name: "", donor_contact_email: "", grant_amount: "",
    currency: "KES", status: "pipeline" as string, application_deadline: "", start_date: "", end_date: "",
    reporting_frequency: "quarterly", description: "", objectives: "",
  });
  const [linkForm, setLinkForm] = useState({ program_id: "", allocated_amount: "" });
  const [complianceForm, setComplianceForm] = useState({ item_description: "", due_date: "" });
  const [reportForm, setReportForm] = useState({ report_title: "", report_type: "narrative", due_date: "", reporting_period_start: "", reporting_period_end: "", notes: "" });
  const [docForm, setDocForm] = useState({ document_name: "", document_type: "general", description: "" });
  const [docFile, setDocFile] = useState<File | null>(null);

  const handleCreate = () => {
    createGrant.mutate({
      grant_name: form.grant_name,
      donor_name: form.donor_name,
      donor_contact_email: form.donor_contact_email || null,
      grant_amount: parseFloat(form.grant_amount) || 0,
      currency: form.currency,
      status: form.status,
      application_deadline: form.application_deadline || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      reporting_frequency: form.reporting_frequency,
      description: form.description || null,
      objectives: form.objectives || null,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setForm({ grant_name: "", donor_name: "", donor_contact_email: "", grant_amount: "", currency: "KES", status: "pipeline", application_deadline: "", start_date: "", end_date: "", reporting_frequency: "quarterly", description: "", objectives: "" });
      }
    });
  };

  const handleLinkProgram = () => {
    if (!detailGrantId) return;
    linkGrantProgram.mutate({ grant_id: detailGrantId, program_id: linkForm.program_id, allocated_amount: parseFloat(linkForm.allocated_amount) || 0 }, {
      onSuccess: () => { setLinkProgramOpen(false); setLinkForm({ program_id: "", allocated_amount: "" }); }
    });
  };

  const handleAddCompliance = () => {
    if (!detailGrantId) return;
    createComplianceItem.mutate({ grant_id: detailGrantId, item_description: complianceForm.item_description, due_date: complianceForm.due_date || null }, {
      onSuccess: () => { setAddComplianceOpen(false); setComplianceForm({ item_description: "", due_date: "" }); }
    });
  };

  const handleAddReport = () => {
    if (!detailGrantId) return;
    createGrantReport.mutate({
      grant_id: detailGrantId,
      report_title: reportForm.report_title,
      report_type: reportForm.report_type,
      due_date: reportForm.due_date,
      reporting_period_start: reportForm.reporting_period_start || null,
      reporting_period_end: reportForm.reporting_period_end || null,
      notes: reportForm.notes || null,
    }, {
      onSuccess: () => { setAddReportOpen(false); setReportForm({ report_title: "", report_type: "narrative", due_date: "", reporting_period_start: "", reporting_period_end: "", notes: "" }); }
    });
  };

  const handleUploadDoc = async () => {
    if (!detailGrantId || !docFile || !orgId) return;
    try {
      const filePath = `grants/${detailGrantId}/${Date.now()}_${docFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(filePath, docFile);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);
      createGrantDocument.mutate({
        grant_id: detailGrantId,
        document_name: docForm.document_name || docFile.name,
        document_type: docForm.document_type,
        file_url: urlData.publicUrl,
        file_size: docFile.size,
        description: docForm.description || null,
      }, {
        onSuccess: () => { setUploadDocOpen(false); setDocForm({ document_name: "", document_type: "general", description: "" }); setDocFile(null); }
      });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  const toggleCompliance = (item: any) => {
    updateComplianceItem.mutate({ id: item.id, is_completed: !item.is_completed, completed_at: !item.is_completed ? new Date().toISOString() : null });
  };

  const markReportSubmitted = (reportId: string) => {
    updateGrantReport.mutate({ id: reportId, status: "submitted", submitted_at: new Date().toISOString() });
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pipeline: "bg-muted text-muted-foreground", application: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      submitted: "bg-accent/20 text-accent-foreground", under_review: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", active: "bg-primary/15 text-primary",
      completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", rejected: "bg-destructive/15 text-destructive",
      expired: "bg-muted text-muted-foreground",
    };
    return map[status] || map.pipeline;
  };

  if (grants.isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;

  const grantList = grants.data || [];
  const upcomingReports = upcomingGrantReports.data || [];

  // ═══════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════
  if (detailGrantId) {
    const grant = grantList.find(g => g.id === detailGrantId);
    if (!grant) return null;
    const linkedPrograms = grantPrograms.data || [];
    const complianceItems = compliance.data || [];
    const completedItems = complianceItems.filter(c => c.is_completed).length;
    const reports = grantReports.data || [];
    const documents = grantDocuments.data || [];
    const util = utilization.data;
    const receivedPct = Number(grant.grant_amount) > 0 ? (Number(grant.amount_received || 0) / Number(grant.grant_amount)) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setDetailGrantId(null)} className="mb-2 gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <h2 className="text-xl font-bold text-foreground">{grant.grant_name}</h2>
            <p className="text-sm text-muted-foreground">{grant.donor_name} · {grant.currency} {Number(grant.grant_amount).toLocaleString()}</p>
          </div>
          <Badge className={getStatusColor(grant.status)}>{grant.status.replace("_", " ")}</Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-lg font-bold text-foreground">{grant.currency} {Number(grant.grant_amount).toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{grant.currency} {Number(grant.amount_received || 0).toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-lg font-bold text-foreground">{grant.currency} {(util?.totalSpent || 0).toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Utilization</p>
            <p className="text-lg font-bold text-foreground">{util && util.totalAllocated > 0 ? ((util.totalSpent / util.totalAllocated) * 100).toFixed(0) : 0}%</p>
          </CardContent></Card>
        </div>

        {/* Funding Progress */}
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Funding Received</p>
            <p className="text-sm text-muted-foreground">{receivedPct.toFixed(1)}%</p>
          </div>
          <Progress value={Math.min(receivedPct, 100)} className="h-3" />
        </CardContent></Card>

        {/* Burn Rate */}
        {grant.start_date && grant.end_date && (
          <BurnRateGauge
            grantId={grant.id}
            grantName={grant.grant_name}
            totalBudget={Number(grant.grant_amount)}
            currency={grant.currency}
            startDate={grant.start_date}
            endDate={grant.end_date}
          />
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
             <TabsList className="inline-flex w-max gap-1 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="overview" className="text-xs rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="budget" className="text-xs rounded-lg">Budget</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs rounded-lg">Reports</TabsTrigger>
              <TabsTrigger value="financial-report" className="text-xs rounded-lg">Financial Report</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs rounded-lg">Calendar</TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs rounded-lg">Compliance</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs rounded-lg">Documents</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Grant Details</p>
                {grant.description && <p className="text-sm text-muted-foreground">{grant.description}</p>}
                {grant.objectives && <><p className="text-xs font-medium text-foreground mt-2">Objectives</p><p className="text-sm text-muted-foreground">{grant.objectives}</p></>}
                {grant.start_date && <p className="text-xs text-muted-foreground">Start: {format(new Date(grant.start_date), "dd MMM yyyy")}</p>}
                {grant.end_date && <p className="text-xs text-muted-foreground">End: {format(new Date(grant.end_date), "dd MMM yyyy")}</p>}
                <p className="text-xs text-muted-foreground">Reporting: {grant.reporting_frequency}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Donor Contact</p>
                <p className="text-sm text-muted-foreground">{grant.donor_name}</p>
                {grant.donor_contact_email && <p className="text-xs text-muted-foreground">{grant.donor_contact_email}</p>}
              </CardContent></Card>
            </div>

            {/* Linked Programs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Linked Programs</CardTitle>
                <Dialog open={linkProgramOpen} onOpenChange={setLinkProgramOpen}>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Link</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Link Program to Grant</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Program</Label>
                        <Select value={linkForm.program_id} onValueChange={v => setLinkForm(p => ({ ...p, program_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                          <SelectContent>{programs.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Allocated Amount ({grant.currency})</Label><Input type="number" value={linkForm.allocated_amount} onChange={e => setLinkForm(p => ({ ...p, allocated_amount: e.target.value }))} /></div>
                      <Button onClick={handleLinkProgram} disabled={!linkForm.program_id} className="w-full">Link Program</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Program</TableHead><TableHead className="text-right">Allocated</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {linkedPrograms.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No programs linked yet.</TableCell></TableRow>
                    ) : linkedPrograms.map(lp => (
                      <TableRow key={lp.id}>
                        <TableCell className="font-medium">{(lp as any).programs?.name}</TableCell>
                        <TableCell className="text-right">{grant.currency} {Number(lp.allocated_amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget / Utilization Tab */}
          <TabsContent value="budget" className="mt-4 space-y-4">
            {util && util.byProgram.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Allocated</p>
                    <p className="text-lg font-bold text-foreground">{grant.currency} {util.totalAllocated.toLocaleString()}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-bold text-foreground">{grant.currency} {util.totalSpent.toLocaleString()}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{grant.currency} {(util.totalAllocated - util.totalSpent).toLocaleString()}</p>
                  </CardContent></Card>
                </div>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Budget Utilization by Program</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {util.byProgram.map(p => (
                        <div key={p.programId} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground">{p.programName}</span>
                            <span className="text-muted-foreground">{grant.currency} {p.spent.toLocaleString()} / {p.allocated.toLocaleString()}</span>
                          </div>
                          <Progress value={Math.min(p.utilization, 100)} className={`h-2 ${p.utilization > 90 ? '[&>div]:bg-destructive' : ''}`} />
                          <p className="text-xs text-muted-foreground">{p.utilization.toFixed(1)}% utilized · Remaining: {grant.currency} {p.remaining.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Link programs to this grant to track budget utilization.
              </CardContent></Card>
            )}
          </TabsContent>

          {/* Financial Report Tab */}
          <TabsContent value="financial-report" className="mt-4">
            {grant.start_date && grant.end_date ? (
              <GrantFinancialReport
                grantId={grant.id}
                reportingPeriodStart={grant.start_date}
                reportingPeriodEnd={grant.end_date}
              />
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Set grant start and end dates to generate financial reports.
              </CardContent></Card>
            )}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-4">
            <GrantCalendar />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={addReportOpen} onOpenChange={setAddReportOpen}>
                <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Schedule Report</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Schedule Grant Report</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Report Title *</Label><Input value={reportForm.report_title} onChange={e => setReportForm(p => ({ ...p, report_title: e.target.value }))} placeholder="Q1 Narrative Report" /></div>
                    <div><Label>Report Type</Label>
                      <Select value={reportForm.report_type} onValueChange={v => setReportForm(p => ({ ...p, report_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " & ").replace("m and e", "M&E")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Due Date *</Label><Input type="date" value={reportForm.due_date} onChange={e => setReportForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Period Start</Label><Input type="date" value={reportForm.reporting_period_start} onChange={e => setReportForm(p => ({ ...p, reporting_period_start: e.target.value }))} /></div>
                      <div><Label>Period End</Label><Input type="date" value={reportForm.reporting_period_end} onChange={e => setReportForm(p => ({ ...p, reporting_period_end: e.target.value }))} /></div>
                    </div>
                    <div><Label>Notes</Label><Textarea value={reportForm.notes} onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))} /></div>
                    <Button onClick={handleAddReport} disabled={!reportForm.report_title || !reportForm.due_date} className="w-full">Add Report</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {reports.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No reports scheduled yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {reports.map(report => {
                  const daysUntil = differenceInDays(new Date(report.due_date), new Date());
                  const isOverdue = report.status === 'pending' && isPast(new Date(report.due_date));
                  const isDueSoon = report.status === 'pending' && daysUntil <= 7 && daysUntil >= 0;
                  return (
                    <Card key={report.id} className={`${isOverdue ? 'border-destructive/50' : isDueSoon ? 'border-yellow-500/50' : ''}`}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${isOverdue ? 'bg-destructive/10' : isDueSoon ? 'bg-yellow-500/10' : 'bg-primary/10'}`}>
                            {isOverdue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <FileText className={`h-4 w-4 ${isDueSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-primary'}`} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{report.report_title}</p>
                            <p className="text-xs text-muted-foreground">
                              {report.report_type.replace("_", " ")} · Due {format(new Date(report.due_date), "dd MMM yyyy")}
                              {report.reporting_period_start && report.reporting_period_end && ` · ${format(new Date(report.reporting_period_start), "MMM")}–${format(new Date(report.reporting_period_end), "MMM yyyy")}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                          {isDueSoon && !isOverdue && <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-[10px]">Due Soon</Badge>}
                          {report.status === 'submitted' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">Submitted</Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => markReportSubmitted(report.id)}>Mark Submitted</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">Compliance Progress</p>
                <Badge variant="outline" className="text-xs">{completedItems}/{complianceItems.length}</Badge>
              </div>
              <Dialog open={addComplianceOpen} onOpenChange={setAddComplianceOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Add Item</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Description</Label><Input value={complianceForm.item_description} onChange={e => setComplianceForm(p => ({ ...p, item_description: e.target.value }))} placeholder="e.g. Submit quarterly narrative report" /></div>
                    <div><Label>Due Date</Label><Input type="date" value={complianceForm.due_date} onChange={e => setComplianceForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                    <Button onClick={handleAddCompliance} disabled={!complianceForm.item_description} className="w-full">Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {complianceItems.length > 0 && (
              <Progress value={complianceItems.length > 0 ? (completedItems / complianceItems.length) * 100 : 0} className="h-2" />
            )}
            {complianceItems.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No compliance items yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {complianceItems.map(item => {
                  const isOverdue = !item.is_completed && item.due_date && isPast(new Date(item.due_date));
                  return (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors ${isOverdue ? 'border-destructive/50' : ''}`}>
                      <Checkbox checked={item.is_completed || false} onCheckedChange={() => toggleCompliance(item)} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${item.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.item_description}</p>
                        <div className="flex items-center gap-2">
                          {item.due_date && <p className="text-xs text-muted-foreground">Due: {format(new Date(item.due_date), "dd MMM yyyy")}</p>}
                          {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
                <DialogTrigger asChild><Button size="sm" className="gap-1"><Upload className="h-4 w-4" /> Upload Document</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Upload Grant Document</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Document Name</Label><Input value={docForm.document_name} onChange={e => setDocForm(p => ({ ...p, document_name: e.target.value }))} placeholder="Grant Agreement" /></div>
                    <div><Label>Type</Label>
                      <Select value={docForm.document_type} onValueChange={v => setDocForm(p => ({ ...p, document_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="agreement">Agreement</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="report_template">Report Template</SelectItem>
                          <SelectItem value="compliance">Compliance Guide</SelectItem>
                          <SelectItem value="budget">Budget</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>File</Label><Input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} /></div>
                    <div><Label>Description</Label><Textarea value={docForm.description} onChange={e => setDocForm(p => ({ ...p, description: e.target.value }))} /></div>
                    <Button onClick={handleUploadDoc} disabled={!docFile} className="w-full">Upload</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {documents.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No documents uploaded yet.</CardContent></Card>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{doc.document_name}</p>
                          {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{doc.document_type}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(doc.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild><a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteGrantDocument.mutate(doc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // LIST / DASHBOARD VIEW
  // ═══════════════════════════════════════
  const totalGrantValue = grantList.reduce((s, g) => s + Number(g.grant_amount || 0), 0);
  const totalReceived = grantList.reduce((s, g) => s + Number(g.amount_received || 0), 0);
  const activeGrants = grantList.filter(g => ["active", "approved"].includes(g.status)).length;

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Landmark className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Grant Value</p><p className="text-lg font-bold text-foreground">KES {totalGrantValue.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10"><CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div><p className="text-xs text-muted-foreground">Active Grants</p><p className="text-lg font-bold text-foreground">{activeGrants}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"><Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
          <div><p className="text-xs text-muted-foreground">Received</p><p className="text-lg font-bold text-foreground">KES {totalReceived.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" /></div>
          <div><p className="text-xs text-muted-foreground">Reports Due</p><p className="text-lg font-bold text-foreground">{upcomingReports.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Upcoming Report Alerts */}
      {upcomingReports.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /> Upcoming Report Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingReports.slice(0, 5).map(report => {
              const daysUntil = differenceInDays(new Date(report.due_date), new Date());
              const isOverdue = isPast(new Date(report.due_date));
              return (
                <div key={report.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{report.report_title}</p>
                      <p className="text-xs text-muted-foreground">{(report as any).grants?.grant_name}</p>
                    </div>
                  </div>
                  <Badge className={isOverdue ? 'bg-destructive/15 text-destructive' : daysUntil <= 7 ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' : 'bg-muted text-muted-foreground'} variant="outline">
                    {isOverdue ? 'Overdue' : `${daysUntil}d left`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Grant Pipeline</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Grant</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Grant</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Grant Name *</Label><Input value={form.grant_name} onChange={e => setForm(p => ({ ...p, grant_name: e.target.value }))} placeholder="e.g. USAID Education Grant 2026" /></div>
              <div><Label>Donor Name *</Label><Input value={form.donor_name} onChange={e => setForm(p => ({ ...p, donor_name: e.target.value }))} placeholder="e.g. USAID" /></div>
              <div><Label>Donor Email</Label><Input type="email" value={form.donor_contact_email} onChange={e => setForm(p => ({ ...p, donor_contact_email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Grant Amount *</Label><Input type="number" value={form.grant_amount} onChange={e => setForm(p => ({ ...p, grant_amount: e.target.value }))} placeholder="0.00" /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="KES">KES</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRANT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Application Deadline</Label><Input type="date" value={form.application_deadline} onChange={e => setForm(p => ({ ...p, application_deadline: e.target.value }))} /></div>
                <div><Label>Reporting Frequency</Label>
                  <Select value={form.reporting_frequency} onValueChange={v => setForm(p => ({ ...p, reporting_frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi-annually">Semi-Annually</SelectItem><SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div><Label>Objectives</Label><Textarea value={form.objectives} onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))} /></div>
              <Button onClick={handleCreate} disabled={!form.grant_name || !form.donor_name || !form.grant_amount} className="w-full">Create Grant</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grants List */}
      {grantList.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No grants yet. Create your first grant to start tracking.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {grantList.map(grant => {
            const receivedPct = Number(grant.grant_amount) > 0 ? (Number(grant.amount_received || 0) / Number(grant.grant_amount)) * 100 : 0;
            return (
              <Card key={grant.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailGrantId(grant.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Landmark className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="font-semibold text-foreground">{grant.grant_name}</p>
                        <p className="text-xs text-muted-foreground">{grant.donor_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-foreground">{grant.currency} {Number(grant.grant_amount).toLocaleString()}</p>
                        <Badge className={`text-[10px] ${getStatusColor(grant.status)}`}>{grant.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDetailGrantId(grant.id); }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteGrant.mutate(grant.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                  <Progress value={Math.min(receivedPct, 100)} className="h-1.5 mt-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">{receivedPct.toFixed(0)}% received</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, MapPin, DollarSign, Calendar, Target,
  TrendingUp, BarChart3, Eye, Loader2, Star, UserPlus, X
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { GanttChart } from "@/components/projects/GanttChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { format } from "date-fns";

const AGE_GROUPS = [
  { label: '0-5', min: 0, max: 5 },
  { label: '6-12', min: 6, max: 12 },
  { label: '13-17', min: 13, max: 17 },
  { label: '18-24', min: 18, max: 24 },
  { label: '25+', min: 25, max: 200 },
];

function getAge(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getStatusBadgeClass(status: string | null) {
  const styles: Record<string, string> = {
    planning: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success border-success/20",
    on_hold: "bg-warning/10 text-warning border-warning/20",
    completed: "bg-primary/10 text-primary border-primary/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return styles[status || "planning"] || styles.planning;
}

function ProjectTeamTab({ projectId, orgId }: { projectId: string; orgId?: string }) {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", role_on_project: "team_member", start_date: "" });

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["project-team", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_team_members").select("*, profiles(full_name, email, avatar_url)").eq("project_id", projectId).is("end_date", null);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members-for-team", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("organization_members").select("user_id, profiles(full_name, email)").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_team_members").insert({ project_id: projectId, user_id: assignForm.user_id, role_on_project: assignForm.role_on_project, start_date: assignForm.start_date || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-team"] }); toast.success("Staff assigned"); setAssignOpen(false); setAssignForm({ user_id: "", role_on_project: "team_member", start_date: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("project_team_members").update({ end_date: new Date().toISOString().split("T")[0] }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-team"] }); toast.success("Removed"); },
  });

  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const roleLabels: Record<string, string> = { lead: "Lead", coordinator: "Coordinator", field_officer: "Field Officer", me_officer: "M&E Officer", finance: "Finance", team_member: "Team Member" };
  const sorted = [...teamMembers].sort((a: any, b: any) => (a.role_on_project === "lead" ? -1 : b.role_on_project === "lead" ? 1 : 0));

  return (
    <Card><CardContent className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Project Team</h3>
        <Sheet open={assignOpen} onOpenChange={setAssignOpen}>
          <SheetTrigger asChild><Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Assign Staff</Button></SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>Assign Staff</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Staff *</Label>
                <Select value={assignForm.user_id} onValueChange={v => setAssignForm(p => ({ ...p, user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{orgMembers.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{(m.profiles as any)?.full_name || (m.profiles as any)?.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Role</Label>
                <Select value={assignForm.role_on_project} onValueChange={v => setAssignForm(p => ({ ...p, role_on_project: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Start Date</Label><Input type="date" value={assignForm.start_date} onChange={e => setAssignForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <Button onClick={() => assignMutation.mutate()} disabled={!assignForm.user_id || assignMutation.isPending} className="w-full">Assign</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {isLoading ? <div className="text-center py-6 text-muted-foreground">Loading...</div> : sorted.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No team members assigned yet.</div>
      ) : (
        <div className="space-y-2">{sorted.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
            <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials((m.profiles as any)?.full_name || "")}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{(m.profiles as any)?.full_name}</p>
              <div className="flex items-center gap-2">
                {m.role_on_project === "lead" && <Star className="h-3 w-3 text-amber-500" />}
                <Badge variant="outline" className="text-[10px]">{roleLabels[m.role_on_project] || m.role_on_project}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMutation.mutate(m.id)}><X className="h-3 w-3" /></Button>
          </div>
        ))}</div>
      )}
    </CardContent></Card>
  );
}

function ProjectWorkplanTab({ projectId }: { projectId: string }) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const [rangeMonths, setRangeMonths] = useState(3);
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["project-gantt-activities", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("id, title, name, planned_start_date, planned_end_date, status, responsible_staff_id").eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
  const hasPlannedDates = activities.some((a: any) => a.planned_start_date && a.planned_end_date);
  const exportPdf = async () => {
    if (!ganttRef.current) return;
    try {
      const canvas = await html2canvas(ganttRef.current, { scale: 2 });
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth() - 20;
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, w, Math.min(h, pdf.internal.pageSize.getHeight() - 20));
      pdf.save("workplan.pdf");
      toast.success("Workplan exported");
    } catch { toast.error("Export failed"); }
  };
  if (isLoading) return <div className="text-center py-6 text-muted-foreground">Loading...</div>;
  return (
    <Card><CardContent className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">{[1, 3, 6, 0].map(m => (
          <Button key={m} variant={rangeMonths === m ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setRangeMonths(m)}>{m === 0 ? "Full" : `${m}m`}</Button>
        ))}</div>
        {hasPlannedDates && <Button variant="outline" size="sm" onClick={exportPdf} className="text-xs">Export PDF</Button>}
      </div>
      <div ref={ganttRef}><GanttChart activities={activities} rangeMonths={rangeMonths || undefined} /></div>
    </CardContent></Card>
  );
}

const ProjectDashboard = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch project details with program name
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*, program:programs(id, name)')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch beneficiaries enrolled in this project (or its parent program)
  const { data: enrolledBeneficiaries = [] } = useQuery({
    queryKey: ['project-beneficiaries', projectId, project?.program_id],
    queryFn: async () => {
      if (!projectId) return [];
      // First try project-level enrollments
      const { data: projectEnrollments, error: pErr } = await supabase
        .from('beneficiary_services')
        .select('beneficiary_id, status, beneficiary:beneficiaries(id, display_name, gender, date_of_birth, county, sub_county, beneficiary_type, status, funding_required, academic_level, institution_name, photo_url)')
        .eq('project_id', projectId)
        .eq('status', 'active');
      if (pErr) throw pErr;
      const projectResults = projectEnrollments?.map((e: any) => ({ ...e.beneficiary, enrollment_status: e.status })).filter(Boolean) || [];
      if (projectResults.length > 0) return projectResults;

      // Fallback: fetch program-level enrollments if project has a parent program
      if (project?.program_id) {
        const { data: programEnrollments, error: prErr } = await supabase
          .from('beneficiary_services')
          .select('beneficiary_id, status, beneficiary:beneficiaries(id, display_name, gender, date_of_birth, county, sub_county, beneficiary_type, status, funding_required, academic_level, institution_name, photo_url)')
          .eq('program_id', project.program_id)
          .eq('status', 'active');
        if (prErr) throw prErr;
        return programEnrollments?.map((e: any) => ({ ...e.beneficiary, enrollment_status: e.status })).filter(Boolean) || [];
      }
      return [];
    },
    enabled: !!projectId && !isLoading,
  });

  // Fetch funding (financial_transactions for this project or parent program)
  const { data: projectFunding = [] } = useQuery({
    queryKey: ['project-funding', projectId, project?.program_id],
    queryFn: async () => {
      if (!projectId) return [];
      // Try project-level funding first
      const { data: projData, error: pErr } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('project_id', projectId)
        .neq('transaction_type', 'expense')
        .order('transaction_date', { ascending: false });
      if (pErr) throw pErr;
      if (projData && projData.length > 0) return projData;

      // Fallback to program-level funding
      if (project?.program_id) {
        const { data: progData, error: prErr } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('program_id', project.program_id)
          .neq('transaction_type', 'expense')
          .order('transaction_date', { ascending: false });
        if (prErr) throw prErr;
        return progData || [];
      }
      return [];
    },
    enabled: !!projectId && !isLoading,
  });

  // Fetch expenses for this project or parent program
  const { data: expenses = [] } = useQuery({
    queryKey: ['project-expenses', projectId, project?.program_id],
    queryFn: async () => {
      if (!projectId) return [];
      // Try project-level expenses first
      const { data: projData, error: pErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', projectId)
        .order('expense_date', { ascending: false });
      if (pErr) throw pErr;
      if (projData && projData.length > 0) return projData;

      // Fallback to program-level expenses
      if (project?.program_id) {
        const { data: progData, error: prErr } = await supabase
          .from('expenses')
          .select('*')
          .eq('program_id', project.program_id)
          .order('expense_date', { ascending: false });
        if (prErr) throw prErr;
        return progData || [];
      }
      return [];
    },
    enabled: !!projectId && !isLoading,
  });

  // Fetch donor contributions linked to this project's beneficiaries
  const { data: donorContributions = [] } = useQuery({
    queryKey: ['project-donor-contributions', projectId, enrolledBeneficiaries],
    queryFn: async () => {
      if (!projectId || enrolledBeneficiaries.length === 0) return [];
      const beneficiaryIds = enrolledBeneficiaries.map((b: any) => b.id);
      const { data, error } = await supabase
        .from('beneficiary_donors')
        .select('*, program:programs(name)')
        .in('beneficiary_id', beneficiaryIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && enrolledBeneficiaries.length > 0,
  });

  // Compute demographics
  const totalBeneficiaries = enrolledBeneficiaries.length;

  const genderBreakdown: Record<string, number> = enrolledBeneficiaries.reduce((acc: Record<string, number>, b: any) => {
    const g = b.gender || 'Unknown';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const locationBreakdown: Record<string, number> = enrolledBeneficiaries.reduce((acc: Record<string, number>, b: any) => {
    const loc = b.county || 'Unknown';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  const ageGroupBreakdown = AGE_GROUPS.map(group => {
    const count = enrolledBeneficiaries.filter((b: any) => {
      const age = getAge(b.date_of_birth);
      return age !== null && age >= group.min && age <= group.max;
    }).length;
    return { ...group, count };
  });
  const unknownAge = enrolledBeneficiaries.filter((b: any) => !b.date_of_birth).length;

  const typeBreakdown: Record<string, number> = enrolledBeneficiaries.reduce((acc: Record<string, number>, b: any) => {
    const t = b.beneficiary_type || 'unknown';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  // Funding calculations
  const totalBudget = project?.budget || 0;
  const totalDirectFunding = projectFunding.reduce((sum: number, g: any) => sum + (g.amount || 0), 0);
  const totalDonorFunding = donorContributions.reduce((sum: number, d: any) => sum + (d.amount_received || 0), 0);
  const totalFunding = totalDirectFunding + totalDonorFunding;
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalFundingRequired = enrolledBeneficiaries.reduce((sum: number, b: any) => sum + (b.funding_required || 0), 0);
  const fundingGap = Math.max(totalFundingRequired - totalFunding, 0);
  const fundingCoverage = totalFundingRequired > 0 ? Math.min(Math.round((totalFunding / totalFundingRequired) * 100), 100) : (totalFunding > 0 ? 100 : 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{project.name}</h1>
            <Badge variant="outline" className={getStatusBadgeClass(project.status)}>
              {project.status?.replace('_', ' ') || 'Planning'}
            </Badge>
          </div>
          {project.program && (
            <button
              onClick={() => navigate(`/programs/dashboard/${(project.program as any).id}`)}
              className="text-sm text-primary hover:underline mt-1"
            >
              ← {(project.program as any).name}
            </button>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            {project.project_code && (
              <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {project.project_code}</span>
            )}
            {project.location && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {project.location}</span>
            )}
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(project.start_date), 'MMM yyyy')}
                {project.end_date ? ` - ${format(new Date(project.end_date), 'MMM yyyy')}` : ' - Ongoing'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">Beneficiaries</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{totalBeneficiaries}</p>
          </CardContent>
        </Card>
        <Card className="border-success/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-success mb-1">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">Total Funding</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{formatCurrency(totalFunding)}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-warning mb-1">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">Funding Req.</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{formatCurrency(totalFundingRequired)}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-destructive mb-1">
              <BarChart3 className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">Funding Gap</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{formatCurrency(fundingGap)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Funding Coverage Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Funding Coverage</span>
            <span className={`text-sm font-bold ${fundingCoverage >= 80 ? 'text-success' : fundingCoverage >= 40 ? 'text-warning' : 'text-destructive'}`}>
              {fundingCoverage}%
            </span>
          </div>
          <Progress value={fundingCoverage} className="h-3" />
          <div className="grid grid-cols-3 gap-4 mt-3 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Required</p>
              <p className="font-bold text-foreground">{formatCurrency(totalFundingRequired)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Received</p>
              <p className="font-bold text-success">{formatCurrency(totalFunding)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Gap</p>
              <p className="font-bold text-destructive">{formatCurrency(fundingGap)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto bg-muted/50 p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="beneficiaries" className="text-xs sm:text-sm">Beneficiaries</TabsTrigger>
            <TabsTrigger value="funding" className="text-xs sm:text-sm">Funding</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
            <TabsTrigger value="team" className="text-xs sm:text-sm">Team</TabsTrigger>
            <TabsTrigger value="workplan" className="text-xs sm:text-sm">Workplan</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(genderBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(genderBreakdown).map(([gender, count]) => (
                      <div key={gender} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{gender}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={(count / totalBeneficiaries) * 100} className="h-2 w-24" />
                          <span className="text-sm font-medium text-foreground w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Age Groups */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Age Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ageGroupBreakdown.map((group) => (
                    <div key={group.label} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{group.label} yrs</span>
                      <div className="flex items-center gap-2">
                        <Progress value={totalBeneficiaries > 0 ? (group.count / totalBeneficiaries) * 100 : 0} className="h-2 w-24" />
                        <span className="text-sm font-medium text-foreground w-12 text-right">{group.count}</span>
                      </div>
                    </div>
                  ))}
                  {unknownAge > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Unknown</span>
                      <span className="text-sm font-medium text-muted-foreground">{unknownAge}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Location (County)</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(locationBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(locationBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([location, count]) => (
                        <div key={location} className="flex items-center justify-between">
                          <span className="text-sm text-foreground truncate max-w-[150px]">{location}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(count / totalBeneficiaries) * 100} className="h-2 w-24" />
                            <span className="text-sm font-medium text-foreground w-12 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Type Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Beneficiary Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(typeBreakdown).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-foreground capitalize">{type}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(count / totalBeneficiaries) * 100} className="h-2 w-24" />
                        <span className="text-sm font-medium text-foreground w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {project.budget != null && (
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-medium text-foreground">{formatCurrency(project.budget)}</p>
                  </div>
                )}
                {project.estimated_cost != null && (
                  <div>
                    <p className="text-muted-foreground">Estimated Cost</p>
                    <p className="font-medium text-foreground">{formatCurrency(project.estimated_cost)}</p>
                  </div>
                )}
                {project.funding_cycle && (
                  <div>
                    <p className="text-muted-foreground">Funding Cycle</p>
                    <p className="font-medium text-foreground capitalize">{project.funding_cycle}</p>
                  </div>
                )}
                {project.expected_outputs && (
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Expected Outputs</p>
                    <p className="font-medium text-foreground">{project.expected_outputs}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Beneficiaries Tab */}
        <TabsContent value="beneficiaries" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Enrolled Beneficiaries ({totalBeneficiaries})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalBeneficiaries === 0 ? (
                <p className="text-center text-muted-foreground py-8">No beneficiaries enrolled in this project</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                     <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Gender</TableHead>
                        <TableHead className="hidden sm:table-cell">County</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Funding Required</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrolledBeneficiaries.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.display_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">{b.beneficiary_type}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{b.gender || '-'}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{b.county || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell text-right font-mono">
                            {b.funding_required ? formatCurrency(b.funding_required) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/beneficiaries/${b.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funding Tab */}
        <TabsContent value="funding" className="space-y-4 mt-4">
          {/* Grants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                Direct Funding ({projectFunding.length})
              </CardTitle>
              <CardDescription>Direct funding allocated to this project</CardDescription>
            </CardHeader>
            <CardContent>
              {projectFunding.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No direct funding recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Donor / Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden md:table-cell">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectFunding.map((g: any) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.donor_name || g.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {g.transaction_type?.replace('_', ' ') || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {formatCurrency(g.amount || 0)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {g.transaction_date ? format(new Date(g.transaction_date), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                            {g.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Beneficiary Donor Contributions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Beneficiary Sponsorships ({donorContributions.length})
              </CardTitle>
              <CardDescription>Donor support linked to beneficiaries in this project</CardDescription>
            </CardHeader>
            <CardContent>
              {donorContributions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No beneficiary sponsorships recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Donor</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donorContributions.slice(0, 20).map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.donor_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {d.program?.name || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {d.amount_received ? formatCurrency(d.amount_received) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {d.donation_date ? format(new Date(d.donation_date), 'dd MMM yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Project Expenses</CardTitle>
                  <CardDescription>Total spent: {formatCurrency(totalExpenses)}</CardDescription>
                </div>
                {totalBudget > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Budget Utilization</p>
                    <p className={`text-lg font-bold ${totalExpenses > totalBudget ? 'text-destructive' : 'text-foreground'}`}>
                      {Math.round((totalExpenses / totalBudget) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expenses recorded for this project</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.title}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{e.category || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-destructive">
                            {formatCurrency(e.amount || 0)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {e.expense_date ? format(new Date(e.expense_date), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {e.status || 'pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-4">
          <ProjectTeamTab projectId={projectId!} orgId={currentOrganization?.organization_id} />
        </TabsContent>

        {/* Workplan Tab */}
        <TabsContent value="workplan" className="mt-4">
          <ProjectWorkplanTab projectId={projectId!} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card className="workspace-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Narrative Reports</p>
              <p className="text-sm mt-1">Submit project narrative reports with achievements, challenges, and lessons learned.</p>
              <Button size="sm" className="mt-4" onClick={() => toast.info("Narrative report form coming soon")}>
                <Plus className="h-4 w-4 mr-1.5" />New Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDashboard;

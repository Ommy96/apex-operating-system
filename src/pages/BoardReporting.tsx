import { useState } from "react";
import { useBoardReporting } from "@/hooks/useBoardReporting";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import {
  Presentation,
  Plus,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  Edit,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_review: { label: "In Review", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  published: { label: "Published", variant: "default" },
};

export default function BoardReporting() {
  const { user } = useAuth();
  const {
    boardMembers,
    boardReports,
    loadingMembers,
    loadingReports,
    fetchReportSections,
    createMember,
    createReport,
    updateReport,
    updateSection,
  } = useBoardReporting();

  const [activeTab, setActiveTab] = useState("reports");
  const [showNewReport, setShowNewReport] = useState(false);
  const [showNewMember, setShowNewMember] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // New report form
  const [reportForm, setReportForm] = useState({
    title: "",
    description: "",
    report_period_start: "",
    report_period_end: "",
    meeting_date: "",
    meeting_agenda: "",
    executive_summary: "",
  });

  // New member form
  const [memberForm, setMemberForm] = useState({
    full_name: "",
    email: "",
    role: "member",
    title: "",
  });

  // Fetch sections for selected report
  const { data: reportSections = [] } = useQuery({
    queryKey: ["board-report-sections", selectedReportId],
    queryFn: () => fetchReportSections(selectedReportId!),
    enabled: !!selectedReportId,
  });

  const handleCreateReport = () => {
    if (!reportForm.title || !reportForm.report_period_start || !reportForm.report_period_end) return;
    createReport.mutate(reportForm, {
      onSuccess: () => {
        setShowNewReport(false);
        setReportForm({ title: "", description: "", report_period_start: "", report_period_end: "", meeting_date: "", meeting_agenda: "", executive_summary: "" });
      },
    });
  };

  const handleCreateMember = () => {
    if (!memberForm.full_name || !memberForm.email) return;
    createMember.mutate(memberForm, {
      onSuccess: () => {
        setShowNewMember(false);
        setMemberForm({ full_name: "", email: "", role: "member", title: "" });
      },
    });
  };

  const selectedReport = boardReports.find((r) => r.id === selectedReportId);

  const stats = {
    totalReports: boardReports.length,
    published: boardReports.filter((r) => r.status === "published").length,
    drafts: boardReports.filter((r) => r.status === "draft").length,
    members: boardMembers.filter((m) => m.is_active).length,
  };

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Board Reporting Portal"
        description="Generate comprehensive board reports with program summaries, financial snapshots, and strategic recommendations."
        icon={Presentation}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="workspace-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalReports}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.published}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.drafts}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.members}</p>
              <p className="text-xs text-muted-foreground">Board Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-1.5" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-1.5" />
            Board Members
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Board Reports</h3>
            <Dialog open={showNewReport} onOpenChange={setShowNewReport}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Board Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={reportForm.title} onChange={(e) => setReportForm((p) => ({ ...p, title: e.target.value }))} placeholder="Q1 2026 Board Report" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={reportForm.description} onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))} placeholder="Summary for the board..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Period Start</Label>
                      <Input type="date" value={reportForm.report_period_start} onChange={(e) => setReportForm((p) => ({ ...p, report_period_start: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Period End</Label>
                      <Input type="date" value={reportForm.report_period_end} onChange={(e) => setReportForm((p) => ({ ...p, report_period_end: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Meeting Date</Label>
                    <Input type="date" value={reportForm.meeting_date} onChange={(e) => setReportForm((p) => ({ ...p, meeting_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Executive Summary</Label>
                    <Textarea value={reportForm.executive_summary} onChange={(e) => setReportForm((p) => ({ ...p, executive_summary: e.target.value }))} placeholder="High-level summary..." rows={3} />
                  </div>
                  <Button onClick={handleCreateReport} disabled={createReport.isPending} className="w-full">
                    {createReport.isPending ? "Creating..." : "Create Report"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {selectedReportId && selectedReport ? (
            <ReportDetail
              report={selectedReport}
              sections={reportSections}
              onBack={() => setSelectedReportId(null)}
              onUpdateReport={updateReport.mutate}
              onUpdateSection={updateSection.mutate}
              userId={user?.id}
            />
          ) : (
            <div className="grid gap-3">
              {loadingReports ? (
                <Card className="workspace-card"><CardContent className="p-8 text-center text-muted-foreground">Loading reports...</CardContent></Card>
              ) : boardReports.length === 0 ? (
                <Card className="workspace-card"><CardContent className="p-8 text-center text-muted-foreground">No board reports yet. Create your first report above.</CardContent></Card>
              ) : (
                boardReports.map((report) => (
                  <Card key={report.id} className="workspace-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedReportId(report.id)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">{report.title}</h4>
                          <Badge variant={statusConfig[report.status]?.variant || "secondary"}>
                            {statusConfig[report.status]?.label || report.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(report.report_period_start), "MMM d")} – {format(new Date(report.report_period_end), "MMM d, yyyy")}
                          </span>
                          {report.meeting_date && (
                            <span>Meeting: {format(new Date(report.meeting_date), "MMM d, yyyy")}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Board Members</h3>
            <Dialog open={showNewMember} onOpenChange={setShowNewMember}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Board Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={memberForm.full_name} onChange={(e) => setMemberForm((p) => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Title / Position</Label>
                    <Input value={memberForm.title} onChange={(e) => setMemberForm((p) => ({ ...p, title: e.target.value }))} placeholder="Board Chair" />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={memberForm.role} onValueChange={(v) => setMemberForm((p) => ({ ...p, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chair">Chair</SelectItem>
                        <SelectItem value="vice_chair">Vice Chair</SelectItem>
                        <SelectItem value="treasurer">Treasurer</SelectItem>
                        <SelectItem value="secretary">Secretary</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateMember} disabled={createMember.isPending} className="w-full">
                    {createMember.isPending ? "Adding..." : "Add Member"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadingMembers ? (
              <p className="text-muted-foreground col-span-full text-center py-8">Loading...</p>
            ) : boardMembers.length === 0 ? (
              <Card className="workspace-card col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No board members added yet.</CardContent></Card>
            ) : (
              boardMembers.map((member) => (
                <Card key={member.id} className="workspace-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {member.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {member.title && <Badge variant="outline" className="text-xs">{member.title}</Badge>}
                      <Badge variant="secondary" className="text-xs capitalize">{member.role}</Badge>
                      {!member.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Report detail sub-component
function ReportDetail({
  report,
  sections,
  onBack,
  onUpdateReport,
  onUpdateSection,
  userId,
}: {
  report: any;
  sections: any[];
  onBack: () => void;
  onUpdateReport: (data: any) => void;
  onUpdateSection: (data: any) => void;
  userId?: string;
}) {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [narrative, setNarrative] = useState("");

  const handlePublish = () => {
    onUpdateReport({ id: report.id, status: "published", published_at: new Date().toISOString() });
  };

  const handleApprove = () => {
    onUpdateReport({ id: report.id, status: "approved", approved_by: userId, approved_at: new Date().toISOString() });
  };

  const handleSaveSection = (sectionId: string) => {
    onUpdateSection({ id: sectionId, narrative });
    setEditingSectionId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back to Reports</Button>
        <div className="flex gap-2">
          {report.status === "draft" && (
            <Button variant="outline" size="sm" onClick={() => onUpdateReport({ id: report.id, status: "in_review" })}>
              <Send className="h-4 w-4 mr-1.5" />
              Submit for Review
            </Button>
          )}
          {report.status === "in_review" && (
            <Button variant="outline" size="sm" onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Approve
            </Button>
          )}
          {report.status === "approved" && (
            <Button size="sm" onClick={handlePublish}>
              <Eye className="h-4 w-4 mr-1.5" />
              Publish
            </Button>
          )}
        </div>
      </div>

      <Card className="workspace-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{report.title}</CardTitle>
            <Badge variant={statusConfig[report.status]?.variant || "secondary"}>
              {statusConfig[report.status]?.label || report.status}
            </Badge>
          </div>
          {report.description && <CardDescription>{report.description}</CardDescription>}
          <div className="flex gap-4 text-xs text-muted-foreground pt-1">
            <span>Period: {format(new Date(report.report_period_start), "MMM d")} – {format(new Date(report.report_period_end), "MMM d, yyyy")}</span>
            {report.meeting_date && <span>Meeting: {format(new Date(report.meeting_date), "MMM d, yyyy")}</span>}
          </div>
        </CardHeader>
        {report.executive_summary && (
          <CardContent>
            <h4 className="text-sm font-semibold text-foreground mb-2">Executive Summary</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.executive_summary}</p>
          </CardContent>
        )}
      </Card>

      <h3 className="text-lg font-semibold text-foreground">Report Sections</h3>
      <div className="space-y-3">
        {sections.map((section) => (
          <Card key={section.id} className="workspace-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{section.section_type.replace(/_/g, " ")}</Badge>
                  {report.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingSectionId(section.id);
                        setNarrative(section.narrative || "");
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingSectionId === section.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    placeholder="Add narrative for this section..."
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveSection(section.id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {section.narrative || "No content yet. Click edit to add narrative."}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

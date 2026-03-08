import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Presentation, FileText, Calendar, CheckCircle2, XCircle,
  MessageSquare, Send, Clock, ArrowLeft, Shield, Users, Minus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface BoardMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  title: string | null;
  organization_id: string;
}

interface Report {
  id: string;
  title: string;
  description: string | null;
  status: string;
  report_period_start: string;
  report_period_end: string;
  meeting_date: string | null;
  executive_summary: string | null;
  created_at: string;
}

export default function BoardPortal() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [accessToken, setAccessToken] = useState(tokenFromUrl || "");
  const [member, setMember] = useState<BoardMember | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Comment form
  const [commentContent, setCommentContent] = useState("");
  const [commentSectionId, setCommentSectionId] = useState<string | null>(null);

  // Approval form
  const [approvalDecision, setApprovalDecision] = useState<string>("");
  const [approvalComments, setApprovalComments] = useState("");

  useEffect(() => {
    if (tokenFromUrl) {
      handleLogin(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleLogin = async (token?: string) => {
    const t = token || accessToken;
    if (!t.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("board_members")
        .select("*")
        .eq("access_token", t.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Invalid or expired access token");
        setLoading(false);
        return;
      }

      // Check token expiry
      if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
        toast.error("Access token has expired. Please request a new one.");
        setLoading(false);
        return;
      }

      setMember(data);
      setAuthenticated(true);

      // Load published reports for this org
      const { data: reportsData } = await supabase
        .from("board_reports")
        .select("*")
        .eq("organization_id", data.organization_id)
        .in("status", ["published", "in_review", "approved"])
        .order("created_at", { ascending: false });

      setReports(reportsData || []);
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  };

  const loadReportDetails = async (report: Report) => {
    setSelectedReport(report);

    const [sectionsRes, commentsRes, approvalsRes, actionsRes] = await Promise.all([
      supabase.from("board_report_sections").select("*").eq("report_id", report.id).order("sort_order"),
      supabase.from("board_report_comments").select("*").eq("report_id", report.id).order("created_at", { ascending: true }),
      supabase.from("board_report_approvals").select("*, board_members(full_name)").eq("report_id", report.id),
      supabase.from("board_action_items").select("*, board_members(full_name)").eq("report_id", report.id).order("created_at"),
    ]);

    setSections(sectionsRes.data || []);
    setComments(commentsRes.data || []);
    setApprovals(approvalsRes.data || []);
    setActionItems(actionsRes.data || []);
  };

  const submitComment = async () => {
    if (!commentContent.trim() || !member || !selectedReport) return;

    const { error } = await supabase.from("board_report_comments").insert({
      report_id: selectedReport.id,
      section_id: commentSectionId,
      organization_id: member.organization_id,
      author_name: member.full_name,
      author_email: member.email,
      board_member_id: member.id,
      content: commentContent.trim(),
    });

    if (error) {
      toast.error("Failed to post comment");
      return;
    }

    toast.success("Comment posted");
    setCommentContent("");
    setCommentSectionId(null);
    loadReportDetails(selectedReport);
  };

  const submitApproval = async () => {
    if (!approvalDecision || !member || !selectedReport) return;

    const { error } = await supabase.from("board_report_approvals").upsert({
      report_id: selectedReport.id,
      organization_id: member.organization_id,
      board_member_id: member.id,
      decision: approvalDecision,
      comments: approvalComments || null,
    }, { onConflict: "report_id,board_member_id" });

    if (error) {
      toast.error("Failed to submit vote");
      return;
    }

    toast.success(`Vote recorded: ${approvalDecision}`);
    setApprovalDecision("");
    setApprovalComments("");
    loadReportDetails(selectedReport);
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    published: { label: "Published", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    in_review: { label: "In Review", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    approved: { label: "Approved", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  };

  const myApproval = approvals.find((a) => a.board_member_id === member?.id);

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Presentation className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Board Portal</CardTitle>
            <CardDescription>Enter your access token to view board reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your access token"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={() => handleLogin()} disabled={loading || !accessToken.trim()} className="w-full">
              {loading ? "Verifying..." : "Access Portal"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Don't have an access token? Contact your organization administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Report detail view
  if (selectedReport) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Reports
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>{member?.full_name}</span>
            </div>
          </div>

          {/* Report Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{selectedReport.title}</CardTitle>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedReport.status]?.color || ""}`}>
                  {statusConfig[selectedReport.status]?.label || selectedReport.status}
                </span>
              </div>
              {selectedReport.description && <CardDescription>{selectedReport.description}</CardDescription>}
              <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(selectedReport.report_period_start), "MMM d")} – {format(new Date(selectedReport.report_period_end), "MMM d, yyyy")}
                </span>
                {selectedReport.meeting_date && (
                  <span>Meeting: {format(new Date(selectedReport.meeting_date), "MMM d, yyyy")}</span>
                )}
              </div>
            </CardHeader>
            {selectedReport.executive_summary && (
              <CardContent>
                <h4 className="text-sm font-semibold mb-2">Executive Summary</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.executive_summary}</p>
              </CardContent>
            )}
          </Card>

          {/* Report Sections */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Report Sections</h3>
            {sections.filter(s => s.is_visible !== false).map((section) => {
              const sectionComments = comments.filter((c) => c.section_id === section.id);
              return (
                <Card key={section.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <Badge variant="outline" className="text-xs capitalize">{section.section_type.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {section.narrative && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.narrative}</p>
                    )}
                    {!section.narrative && (
                      <p className="text-sm text-muted-foreground italic">No content added yet.</p>
                    )}

                    {/* Section comments */}
                    {sectionComments.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Comments ({sectionComments.length})</p>
                        {sectionComments.map((c) => (
                          <div key={c.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">{c.author_name}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                            </div>
                            <p className="text-muted-foreground">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add comment to section */}
                    {commentSectionId === section.id ? (
                      <div className="border-t pt-3 space-y-2">
                        <Textarea
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="Write your comment..."
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={submitComment} disabled={!commentContent.trim()}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Post
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setCommentSectionId(null); setCommentContent(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => setCommentSectionId(section.id)}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Comment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* General Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> General Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.filter(c => !c.section_id).map((c) => (
                <div key={c.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{c.author_name}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-muted-foreground">{c.content}</p>
                </div>
              ))}
              <div className="space-y-2 border-t pt-3">
                <Textarea
                  value={commentSectionId === null ? commentContent : ""}
                  onChange={(e) => { setCommentSectionId(null); setCommentContent(e.target.value); }}
                  placeholder="Add a general comment..."
                  rows={2}
                />
                <Button size="sm" onClick={() => { setCommentSectionId(null); submitComment(); }} disabled={!commentContent.trim() || commentSectionId !== null}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Post Comment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Approval Voting */}
          {(selectedReport.status === "in_review" || selectedReport.status === "published") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Approval Voting
                </CardTitle>
                <CardDescription>Cast your vote on this report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing votes */}
                {approvals.length > 0 && (
                  <div className="space-y-2">
                    {approvals.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 text-sm">
                        {a.decision === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {a.decision === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                        {a.decision === "abstained" && <Minus className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{a.board_members?.full_name || "Unknown"}</span>
                        <Badge variant={a.decision === "approved" ? "default" : a.decision === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">
                          {a.decision}
                        </Badge>
                        {a.comments && <span className="text-muted-foreground">— {a.comments}</span>}
                      </div>
                    ))}
                    <Separator />
                  </div>
                )}

                {/* My vote */}
                {myApproval ? (
                  <p className="text-sm text-muted-foreground">
                    You voted: <Badge variant={myApproval.decision === "approved" ? "default" : myApproval.decision === "rejected" ? "destructive" : "secondary"} className="capitalize ml-1">{myApproval.decision}</Badge>
                    <span className="ml-2">(you can change your vote below)</span>
                  </p>
                ) : null}

                <div className="grid gap-3">
                  <div>
                    <Label>Your Decision</Label>
                    <Select value={approvalDecision} onValueChange={setApprovalDecision}>
                      <SelectTrigger><SelectValue placeholder="Select your vote" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">✅ Approve</SelectItem>
                        <SelectItem value="rejected">❌ Reject</SelectItem>
                        <SelectItem value="abstained">➖ Abstain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Comments (optional)</Label>
                    <Textarea value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)} placeholder="Any remarks..." rows={2} />
                  </div>
                  <Button onClick={submitApproval} disabled={!approvalDecision}>
                    Submit Vote
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {actionItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className={`h-2 w-2 rounded-full mt-1.5 ${
                        item.status === "completed" ? "bg-emerald-500" :
                        item.status === "in_progress" ? "bg-amber-500" :
                        item.status === "cancelled" ? "bg-muted-foreground" : "bg-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {item.assigned_to && <span>Assigned: {item.assigned_to}</span>}
                          {item.due_date && <span>Due: {format(new Date(item.due_date), "MMM d, yyyy")}</span>}
                          <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Reports list view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Presentation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Board Portal</h1>
              <p className="text-sm text-muted-foreground">Welcome, {member?.full_name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setAuthenticated(false); setMember(null); setAccessToken(""); }}>
            Sign Out
          </Button>
        </div>

        {/* Reports */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Board Reports
          </h2>
          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No reports available yet.
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => loadReportDetails(report)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{report.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[report.status]?.color || ""}`}>
                          {statusConfig[report.status]?.label || report.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.report_period_start), "MMM d")} – {format(new Date(report.report_period_end), "MMM d, yyyy")}
                        </span>
                        {report.meeting_date && <span>Meeting: {format(new Date(report.meeting_date), "MMM d, yyyy")}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

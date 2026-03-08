import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, CheckCircle2, XCircle, Minus, Clock,
  Plus, Send, Trash2, Link as LinkIcon, Copy
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface BoardCollaborationPanelProps {
  reportId: string;
  reportStatus: string;
}

export function BoardCollaborationPanel({ reportId, reportStatus }: BoardCollaborationPanelProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const [commentContent, setCommentContent] = useState("");
  const [actionForm, setActionForm] = useState({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium" });
  const [showActionForm, setShowActionForm] = useState(false);

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["board-comments", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_report_comments")
        .select("*")
        .eq("report_id", reportId)
        .is("section_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Fetch approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ["board-approvals", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_report_approvals")
        .select("*, board_members(full_name)")
        .eq("report_id", reportId);
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Fetch action items
  const { data: actionItems = [] } = useQuery({
    queryKey: ["board-action-items", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_action_items")
        .select("*, board_members(full_name)")
        .eq("report_id", reportId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Fetch board members for this org
  const { data: boardMembers = [] } = useQuery({
    queryKey: ["board-members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_members")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("board_report_comments").insert({
        report_id: reportId,
        organization_id: orgId!,
        author_name: user?.email || "Staff",
        author_email: user?.email || "",
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-comments", reportId] });
      setCommentContent("");
      toast.success("Comment added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add action item
  const addActionItem = useMutation({
    mutationFn: async (item: typeof actionForm) => {
      const { error } = await supabase.from("board_action_items").insert({
        report_id: reportId,
        organization_id: orgId!,
        title: item.title,
        description: item.description || null,
        assigned_to: item.assigned_to || null,
        due_date: item.due_date || null,
        priority: item.priority,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-action-items", reportId] });
      setActionForm({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium" });
      setShowActionForm(false);
      toast.success("Action item created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update action item status
  const updateActionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("board_action_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-action-items", reportId] });
      toast.success("Status updated");
    },
  });

  // Generate portal link for board member
  const generatePortalLink = async (memberId: string) => {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase
      .from("board_members")
      .update({ access_token: token, token_expires_at: expiresAt.toISOString() })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to generate link");
      return;
    }

    const link = `${window.location.origin}/board-portal?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Portal link copied to clipboard! Valid for 30 days.");
  };

  const approvalSummary = {
    approved: approvals.filter(a => a.decision === "approved").length,
    rejected: approvals.filter(a => a.decision === "rejected").length,
    abstained: approvals.filter(a => a.decision === "abstained").length,
    total: boardMembers.length,
    voted: approvals.length,
  };

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    urgent: "bg-destructive/10 text-destructive",
  };

  return (
    <Tabs defaultValue="comments" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <TabsList className="inline-flex w-max md:w-auto">
          <TabsTrigger value="comments">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approvals ({approvals.length}/{approvalSummary.total})
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Clock className="h-4 w-4 mr-1.5" />
            Action Items ({actionItems.length})
          </TabsTrigger>
          <TabsTrigger value="portal">
            <LinkIcon className="h-4 w-4 mr-1.5" />
            Portal Links
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Comments Tab */}
      <TabsContent value="comments" className="space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
        )}
        {comments.map((c: any) => (
          <div key={c.id} className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground">{c.author_name}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
              {c.is_resolved && <Badge variant="outline" className="text-xs">Resolved</Badge>}
            </div>
            <p className="text-muted-foreground">{c.content}</p>
          </div>
        ))}
        <div className="flex gap-2">
          <Textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1"
          />
          <Button size="sm" className="self-end" onClick={() => addComment.mutate(commentContent)} disabled={!commentContent.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </TabsContent>

      {/* Approvals Tab */}
      <TabsContent value="approvals" className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{approvalSummary.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{approvalSummary.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{approvalSummary.abstained}</p>
            <p className="text-xs text-muted-foreground">Abstained</p>
          </Card>
        </div>

        {approvals.length > 0 && (
          <div className="space-y-2">
            {approvals.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30">
                {a.decision === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {a.decision === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                {a.decision === "abstained" && <Minus className="h-4 w-4 text-muted-foreground" />}
                <span className="font-medium flex-1">{a.board_members?.full_name || "Unknown"}</span>
                <Badge variant={a.decision === "approved" ? "default" : a.decision === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">
                  {a.decision}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {approvalSummary.voted} of {approvalSummary.total} board members have voted.
          Board members vote through the Board Portal.
        </p>
      </TabsContent>

      {/* Action Items Tab */}
      <TabsContent value="actions" className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Action Items</h4>
          <Button size="sm" variant="outline" onClick={() => setShowActionForm(!showActionForm)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {showActionForm && (
          <Card className="p-4 space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={actionForm.title} onChange={(e) => setActionForm(p => ({ ...p, title: e.target.value }))} placeholder="Action item title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={actionForm.description} onChange={(e) => setActionForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Assigned To</Label>
                <Input value={actionForm.assigned_to} onChange={(e) => setActionForm(p => ({ ...p, assigned_to: e.target.value }))} placeholder="Name" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={actionForm.due_date} onChange={(e) => setActionForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={actionForm.priority} onValueChange={(v) => setActionForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={() => addActionItem.mutate(actionForm)} disabled={!actionForm.title.trim()}>
              Create Action Item
            </Button>
          </Card>
        )}

        {actionItems.length === 0 && !showActionForm && (
          <p className="text-sm text-muted-foreground text-center py-4">No action items yet.</p>
        )}

        {actionItems.map((item: any) => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
            <div className={`h-2 w-2 rounded-full mt-1.5 ${
              item.status === "completed" ? "bg-emerald-500" :
              item.status === "in_progress" ? "bg-amber-500" :
              item.status === "cancelled" ? "bg-muted-foreground" : "bg-blue-500"
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
              <div className="flex flex-wrap gap-2 mt-1.5">
                {item.assigned_to && <Badge variant="outline" className="text-xs">{item.assigned_to}</Badge>}
                {item.due_date && <span className="text-xs text-muted-foreground">Due: {format(new Date(item.due_date), "MMM d")}</span>}
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[item.priority] || ""}`}>{item.priority}</span>
              </div>
            </div>
            <Select value={item.status} onValueChange={(v) => updateActionStatus.mutate({ id: item.id, status: v })}>
              <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </TabsContent>

      {/* Portal Links Tab */}
      <TabsContent value="portal" className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Board Member Portal Access</CardTitle>
            <CardDescription className="text-xs">Generate secure access links for board members to view reports, comment, and vote.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {boardMembers.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.access_token && (
                    <Badge variant="outline" className="text-xs">
                      {m.token_expires_at && new Date(m.token_expires_at) > new Date() ? "Active" : "Expired"}
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => generatePortalLink(m.id)}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {m.access_token ? "Regenerate" : "Generate"} Link
                  </Button>
                </div>
              </div>
            ))}
            {boardMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Add board members in the Members tab first.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

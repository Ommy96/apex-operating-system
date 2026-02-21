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
import { Plus, Zap, Trash2, Play, History } from "lucide-react";
import { useAutomation } from "@/hooks/useAutomation";
import { format } from "date-fns";

const triggerEvents = [
  { value: "beneficiary_enrolled", label: "Beneficiary Enrolled" },
  { value: "beneficiary_status_changed", label: "Beneficiary Status Changed" },
  { value: "program_created", label: "Program Created" },
  { value: "leave_request_submitted", label: "Leave Request Submitted" },
  { value: "task_overdue", label: "Task Overdue" },
  { value: "expense_submitted", label: "Expense Submitted" },
  { value: "budget_threshold_reached", label: "Budget Threshold Reached" },
  { value: "report_due", label: "Report Due" },
];

const actionTypes = [
  { value: "send_notification", label: "Send In-App Notification" },
  { value: "send_email", label: "Send Email Alert" },
  { value: "create_task", label: "Auto-Create Task" },
  { value: "update_status", label: "Update Record Status" },
  { value: "log_audit", label: "Log Audit Entry" },
];

export function WorkflowTriggers() {
  const { rules, createRule, updateRule, deleteRule, automationLogs } = useAutomation();
  const [showCreate, setShowCreate] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", trigger_event: "", action_type: "" });

  const handleCreate = () => {
    if (!form.name || !form.trigger_event) return;
    createRule.mutate({
      name: form.name,
      description: form.description,
      trigger_event: form.trigger_event,
      actions: form.action_type ? [{ type: form.action_type }] : [],
    }, {
      onSuccess: () => { setShowCreate(false); setForm({ name: "", description: "", trigger_event: "", action_type: "" }); },
    });
  };

  const logs = automationLogs.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Workflow Triggers</h3>
          <p className="text-sm text-muted-foreground">Automate actions based on system events</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showLogs} onOpenChange={setShowLogs}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><History className="h-4 w-4 mr-1" /> Logs</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Execution Logs</DialogTitle></DialogHeader>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No automation logs yet</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.rule_name || log.trigger_event}</span>
                        <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">{log.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(log.executed_at), "MMM d, HH:mm")}</p>
                      {log.error_message && <p className="text-xs text-destructive mt-1">{log.error_message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Automation Rule</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Rule Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Notify on new enrollment" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div>
                  <Label>When (Trigger Event)</Label>
                  <Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}>
                    <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                    <SelectContent>
                      {triggerEvents.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Then (Action)</Label>
                  <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={createRule.isPending} className="w-full">Create Rule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {rules.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !rules.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No automation rules configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.data.map((rule: any) => {
            const triggerLabel = triggerEvents.find(e => e.value === rule.trigger_event)?.label || rule.trigger_event;
            const ruleActions = Array.isArray(rule.actions) ? rule.actions : [];
            return (
              <Card key={rule.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          When: {triggerLabel}
                          {ruleActions.length > 0 && ` → ${actionTypes.find(a => a.value === ruleActions[0]?.type)?.label || ruleActions[0]?.type}`}
                        </p>
                        {rule.trigger_count > 0 && (
                          <p className="text-xs text-muted-foreground">Triggered {rule.trigger_count}x • Last: {format(new Date(rule.last_triggered_at), "MMM d")}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={rule.is_active} onCheckedChange={(v) => updateRule.mutate({ id: rule.id, is_active: v })} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

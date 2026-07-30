import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Bell, BellRing, CheckCircle, Trash2, AlertTriangle } from "lucide-react";
import { useAutomation } from "@/hooks/useAutomation";
import { format } from "date-fns";

const conditionTypes = [
  { value: "budget_over_threshold", label: "Budget Spent Over Threshold" },
  { value: "staff_inactive", label: "Staff Inactive For N Days" },
  { value: "beneficiary_no_visit", label: "Beneficiary Not Visited In N Days" },
  { value: "task_overdue", label: "Tasks Overdue" },
  { value: "program_low_enrollment", label: "Program Low Enrollment" },
  { value: "donor_concentration", label: "Donor Concentration Risk" },
  { value: "leave_balance_low", label: "Leave Balance Low" },
  { value: "report_deadline", label: "Report Deadline Approaching" },
];

const severityColors: Record<string, string> = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

const categoryColors: Record<string, string> = {
  budget: "bg-success/10 text-success",
  staff: "bg-info/10 text-info",
  beneficiary: "bg-info/10 text-info",
  program: "bg-success/10 text-success",
  compliance: "bg-warning/10 text-warning",
  general: "bg-muted text-muted-foreground",
};

export function SmartAlerts() {
  const { alertRules, createAlertRule, updateAlertRule, deleteAlertRule, alertInstances, resolveAlert, markAlertRead } = useAutomation();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"rules" | "alerts">("alerts");
  const [form, setForm] = useState({ name: "", description: "", category: "general", severity: "warning", condition_type: "" });

  const handleCreate = () => {
    if (!form.name || !form.condition_type) return;
    createAlertRule.mutate(form, {
      onSuccess: () => { setShowCreate(false); setForm({ name: "", description: "", category: "general", severity: "warning", condition_type: "" }); },
    });
  };

  const alerts = alertInstances.data || [];
  const unread = alerts.filter((a: any) => !a.is_read).length;
  const unresolved = alerts.filter((a: any) => !a.is_resolved);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Smart Alerts</h3>
          <p className="text-sm text-muted-foreground">
            Configure alert rules and view triggered alerts
            {unread > 0 && <Badge className="ml-2 bg-destructive/10 text-destructive">{unread} unread</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "alerts" ? "default" : "outline"} onClick={() => setTab("alerts")}>
            <BellRing className="h-4 w-4 mr-1" /> Alerts {unresolved.length > 0 && `(${unresolved.length})`}
          </Button>
          <Button size="sm" variant={tab === "rules" ? "default" : "outline"} onClick={() => setTab("rules")}>
            <Bell className="h-4 w-4 mr-1" /> Rules
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Alert Rule</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Alert Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Budget over 80%" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["budget", "staff", "beneficiary", "program", "compliance", "general"].map((c) => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={form.condition_type} onValueChange={(v) => setForm({ ...form, condition_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                    <SelectContent>
                      {conditionTypes.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={createAlertRule.isPending} className="w-full">Create Alert Rule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {tab === "alerts" ? (
        !alerts.length ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No alerts triggered</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.map((a: any) => (
              <Card key={a.id} className={`border-0 shadow-sm ${!a.is_read ? "ring-1 ring-primary/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${severityColors[a.severity] || ""}`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(a.created_at), "MMM d, HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={categoryColors[a.category] || ""}>{a.category}</Badge>
                      {!a.is_read && (
                        <Button size="sm" variant="ghost" onClick={() => markAlertRead.mutate(a.id)} className="text-xs">Mark Read</Button>
                      )}
                      {!a.is_resolved && (
                        <Button size="sm" variant="outline" onClick={() => resolveAlert.mutate(a.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
                        </Button>
                      )}
                      {a.is_resolved && <Badge variant="outline" className="text-success">Resolved</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        !alertRules.data?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No alert rules configured</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alertRules.data.map((rule: any) => {
              const condLabel = conditionTypes.find(c => c.value === rule.condition_type)?.label || rule.condition_type;
              return (
                <Card key={rule.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${severityColors[rule.severity] || ""}`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">Condition: {condLabel} • Cooldown: {rule.cooldown_hours}h</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={categoryColors[rule.category] || ""}>{rule.category}</Badge>
                        <Badge className={severityColors[rule.severity] || ""}>{rule.severity}</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteAlertRule.mutate(rule.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

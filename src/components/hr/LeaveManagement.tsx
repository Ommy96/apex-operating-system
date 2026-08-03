import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Check, X, Palmtree, Trash2 } from "lucide-react";
import { useHR } from "@/hooks/useHR";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInCalendarDays } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export function LeaveManagement() {
  const { leaveTypes, createLeaveType, leaveRequests, createLeaveRequest, updateLeaveRequest, deleteLeaveRequest, orgMembers } = useHR();
  const { isAdmin, isManagement } = useAuth();
  const [showRequest, setShowRequest] = useState(false);
  const [showType, setShowType] = useState(false);
  const [form, setForm] = useState({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
  const [typeForm, setTypeForm] = useState({ name: "", default_days_per_year: 21 });

  const days = form.start_date && form.end_date
    ? Math.max(differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1, 0)
    : 0;

  const handleSubmit = () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) return;
    createLeaveRequest.mutate({ ...form, days_requested: days }, {
      onSuccess: () => { setShowRequest(false); setForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" }); },
    });
  };

  const handleCreateType = () => {
    if (!typeForm.name) return;
    createLeaveType.mutate(typeForm, {
      onSuccess: () => { setShowType(false); setTypeForm({ name: "", default_days_per_year: 21 }); },
    });
  };

  const members = orgMembers.data || [];
  const types = leaveTypes.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Leave Management</h3>
          <p className="text-sm text-muted-foreground">Track staff leave requests and balances</p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isManagement) && (
            <Dialog open={showType} onOpenChange={setShowType}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">Configure Types</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Leave Type</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Leave Type Name</Label><Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Annual Leave" /></div>
                  <div><Label>Default Days/Year</Label><Input type="number" value={typeForm.default_days_per_year} onChange={(e) => setTypeForm({ ...typeForm, default_days_per_year: +e.target.value })} /></div>
                  <Button onClick={handleCreateType} disabled={createLeaveType.isPending} className="w-full">Add Leave Type</Button>
                </div>
                {types.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Existing Types</Label>
                    {types.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                        <span>{t.name}</span>
                        <span className="text-muted-foreground">{t.default_days_per_year} days</span>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={showRequest} onOpenChange={setShowRequest}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Request Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Leave Type</Label>
                  <Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {types.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                {days > 0 && <p className="text-sm text-muted-foreground">{days} day{days !== 1 ? "s" : ""} requested</p>}
                <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
                <Button onClick={handleSubmit} disabled={createLeaveRequest.isPending} className="w-full">Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {leaveRequests.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !leaveRequests.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Palmtree className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No leave requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {leaveRequests.data.map((r: any) => {
            const staffMember = members.find((m) => m.user_id === r.staff_user_id);
            return (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{staffMember?.full_name || "Staff"} — {r.leave_types?.name || "Leave"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.start_date), "MMM d")} – {format(new Date(r.end_date), "MMM d, yyyy")} ({r.days_requested} days)
                        </p>
                        {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
                      {r.status === "pending" && (isAdmin || isManagement) && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => updateLeaveRequest.mutate({ id: r.id, status: "approved" })}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateLeaveRequest.mutate({ id: r.id, status: "rejected" })}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteLeaveRequest.mutate(r.id)}>
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

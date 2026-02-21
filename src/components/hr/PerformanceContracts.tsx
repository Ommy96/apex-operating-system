import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Target, Star, Trash2 } from "lucide-react";
import { useHR } from "@/hooks/useHR";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  under_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  cancelled: "bg-destructive/10 text-destructive",
};

export function PerformanceContracts() {
  const { contracts, createContract, createObjective, updateContract, updateObjective, deleteContract, orgMembers } = useHR();
  const [showCreate, setShowCreate] = useState(false);
  const [showObjective, setShowObjective] = useState<string | null>(null);
  const [form, setForm] = useState({ staff_user_id: "", contract_title: "", contract_period_start: "", contract_period_end: "" });
  const [objForm, setObjForm] = useState({ objective_title: "", description: "", weight: 0, target_value: 0, unit: "" });

  const handleCreate = () => {
    if (!form.contract_title || !form.staff_user_id) return;
    createContract.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({ staff_user_id: "", contract_title: "", contract_period_start: "", contract_period_end: "" }); } });
  };

  const handleAddObjective = (contractId: string) => {
    if (!objForm.objective_title) return;
    createObjective.mutate({ ...objForm, contract_id: contractId }, {
      onSuccess: () => { setShowObjective(null); setObjForm({ objective_title: "", description: "", weight: 0, target_value: 0, unit: "" }); },
    });
  };

  const members = orgMembers.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Performance Contracts</h3>
          <p className="text-sm text-muted-foreground">Track staff KPIs and performance reviews</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Contract</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Performance Contract</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Staff Member</Label>
                <Select value={form.staff_user_id} onValueChange={(v) => setForm({ ...form, staff_user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contract Title</Label>
                <Input value={form.contract_title} onChange={(e) => setForm({ ...form, contract_title: e.target.value })} placeholder="e.g. Q1 2026 Performance Contract" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date</Label><Input type="date" value={form.contract_period_start} onChange={(e) => setForm({ ...form, contract_period_start: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.contract_period_end} onChange={(e) => setForm({ ...form, contract_period_end: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createContract.isPending} className="w-full">Create Contract</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {contracts.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
      ) : !contracts.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No performance contracts yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.data.map((c: any) => {
            const objectives = c.staff_contract_objectives || [];
            const avgScore = objectives.length > 0
              ? objectives.reduce((sum: number, o: any) => sum + (o.score || 0), 0) / objectives.length
              : null;
            const staffMember = members.find((m) => m.user_id === c.staff_user_id);

            return (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{c.contract_title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{staffMember?.full_name || "Unknown"} • {format(new Date(c.contract_period_start), "MMM yyyy")} – {format(new Date(c.contract_period_end), "MMM yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {avgScore !== null && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3" />{avgScore.toFixed(1)}
                        </Badge>
                      )}
                      <Badge className={statusColors[c.status] || ""}>{c.status}</Badge>
                      {c.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => updateContract.mutate({ id: c.id, status: "active" })}>Activate</Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteContract.mutate(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {objectives.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {objectives.map((obj: any) => (
                        <div key={obj.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                          <div className="flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{obj.objective_title}</span>
                            {obj.weight > 0 && <span className="text-xs text-muted-foreground">({obj.weight}%)</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            {obj.target_value != null && <span>Target: {obj.target_value}{obj.unit ? ` ${obj.unit}` : ""}</span>}
                            {obj.actual_value != null && <span className="text-primary font-medium">Actual: {obj.actual_value}</span>}
                            {obj.score != null && <Badge variant="secondary">{obj.score}/100</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Dialog open={showObjective === c.id} onOpenChange={(open) => setShowObjective(open ? c.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Objective</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add KPI Objective</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Objective</Label><Input value={objForm.objective_title} onChange={(e) => setObjForm({ ...objForm, objective_title: e.target.value })} /></div>
                        <div><Label>Description</Label><Textarea value={objForm.description} onChange={(e) => setObjForm({ ...objForm, description: e.target.value })} /></div>
                        <div className="grid grid-cols-3 gap-3">
                          <div><Label>Weight (%)</Label><Input type="number" value={objForm.weight} onChange={(e) => setObjForm({ ...objForm, weight: +e.target.value })} /></div>
                          <div><Label>Target</Label><Input type="number" value={objForm.target_value} onChange={(e) => setObjForm({ ...objForm, target_value: +e.target.value })} /></div>
                          <div><Label>Unit</Label><Input value={objForm.unit} onChange={(e) => setObjForm({ ...objForm, unit: e.target.value })} placeholder="e.g. %" /></div>
                        </div>
                        <Button onClick={() => handleAddObjective(c.id)} disabled={createObjective.isPending} className="w-full">Add Objective</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

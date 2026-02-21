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
import { Plus, Trash2, Eye, Landmark, ArrowLeft, CheckSquare, Link2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const GRANT_STATUSES = ["pipeline", "application", "submitted", "under_review", "approved", "active", "completed", "rejected", "expired"] as const;

export function GrantManagement() {
  const { grants, createGrant, updateGrant, deleteGrant, programs, useGrantPrograms, linkGrantProgram, useGrantCompliance, createComplianceItem, updateComplianceItem } = useFinancials();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailGrantId, setDetailGrantId] = useState<string | null>(null);
  const [linkProgramOpen, setLinkProgramOpen] = useState(false);
  const [addComplianceOpen, setAddComplianceOpen] = useState(false);
  const grantPrograms = useGrantPrograms(detailGrantId);
  const compliance = useGrantCompliance(detailGrantId);

  const [form, setForm] = useState({
    grant_name: "", donor_name: "", donor_contact_email: "", grant_amount: "",
    currency: "KES", status: "pipeline" as string, application_deadline: "", start_date: "", end_date: "",
    reporting_frequency: "quarterly", description: "", objectives: "",
  });
  const [linkForm, setLinkForm] = useState({ program_id: "", allocated_amount: "" });
  const [complianceForm, setComplianceForm] = useState({ item_description: "", due_date: "" });

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
    linkGrantProgram.mutate({
      grant_id: detailGrantId,
      program_id: linkForm.program_id,
      allocated_amount: parseFloat(linkForm.allocated_amount) || 0,
    }, {
      onSuccess: () => { setLinkProgramOpen(false); setLinkForm({ program_id: "", allocated_amount: "" }); }
    });
  };

  const handleAddCompliance = () => {
    if (!detailGrantId) return;
    createComplianceItem.mutate({
      grant_id: detailGrantId,
      item_description: complianceForm.item_description,
      due_date: complianceForm.due_date || null,
    }, {
      onSuccess: () => { setAddComplianceOpen(false); setComplianceForm({ item_description: "", due_date: "" }); }
    });
  };

  const toggleCompliance = (item: any) => {
    updateComplianceItem.mutate({
      id: item.id,
      is_completed: !item.is_completed,
      completed_at: !item.is_completed ? new Date().toISOString() : null,
    });
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pipeline: "bg-muted text-muted-foreground", application: "bg-info/20 text-info border-info/30",
      submitted: "bg-accent/20 text-accent border-accent/30", under_review: "bg-warning/20 text-warning border-warning/30",
      approved: "bg-success/20 text-success border-success/30", active: "bg-primary/20 text-primary border-primary/30",
      completed: "bg-success/20 text-success border-success/30", rejected: "bg-destructive/20 text-destructive border-destructive/30",
      expired: "bg-muted text-muted-foreground",
    };
    return map[status] || map.pipeline;
  };

  if (grants.isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;

  const grantList = grants.data || [];

  // Detail view
  if (detailGrantId) {
    const grant = grantList.find(g => g.id === detailGrantId);
    if (!grant) return null;
    const linkedPrograms = grantPrograms.data || [];
    const complianceItems = compliance.data || [];
    const completedItems = complianceItems.filter(c => c.is_completed).length;
    const receivedPct = Number(grant.grant_amount) > 0 ? (Number(grant.amount_received || 0) / Number(grant.grant_amount)) * 100 : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setDetailGrantId(null)} className="mb-2 gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <h2 className="text-xl font-bold text-foreground">{grant.grant_name}</h2>
            <p className="text-sm text-muted-foreground">{grant.donor_name} · {grant.currency} {Number(grant.grant_amount).toLocaleString()}</p>
          </div>
          <Badge className={getStatusColor(grant.status)}>{grant.status.replace("_", " ")}</Badge>
        </div>

        {/* Funding Progress */}
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Funding Received</p>
            <p className="text-sm text-muted-foreground">{grant.currency} {Number(grant.amount_received || 0).toLocaleString()} / {Number(grant.grant_amount).toLocaleString()}</p>
          </div>
          <Progress value={Math.min(receivedPct, 100)} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">{receivedPct.toFixed(1)}% received</p>
        </CardContent></Card>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Grant Details</p>
            {grant.description && <p className="text-sm text-muted-foreground">{grant.description}</p>}
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
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Link Program</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Link Program to Grant</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Program</Label>
                    <Select value={linkForm.program_id} onValueChange={v => setLinkForm(p => ({...p, program_id: v}))}>
                      <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>{programs.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Allocated Amount ({grant.currency})</Label><Input type="number" value={linkForm.allocated_amount} onChange={e => setLinkForm(p => ({...p, allocated_amount: e.target.value}))} /></div>
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

        {/* Compliance Checklist */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" /> Compliance Checklist
              <Badge variant="outline" className="ml-2 text-xs">{completedItems}/{complianceItems.length}</Badge>
            </CardTitle>
            <Dialog open={addComplianceOpen} onOpenChange={setAddComplianceOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Add Item</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Description</Label><Input value={complianceForm.item_description} onChange={e => setComplianceForm(p => ({...p, item_description: e.target.value}))} placeholder="e.g. Submit quarterly narrative report" /></div>
                  <div><Label>Due Date</Label><Input type="date" value={complianceForm.due_date} onChange={e => setComplianceForm(p => ({...p, due_date: e.target.value}))} /></div>
                  <Button onClick={handleAddCompliance} disabled={!complianceForm.item_description} className="w-full">Add Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {complianceItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No compliance items yet.</p>
            ) : (
              <div className="space-y-3">
                {complianceItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <Checkbox checked={item.is_completed || false} onCheckedChange={() => toggleCompliance(item)} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.item_description}</p>
                      {item.due_date && <p className="text-xs text-muted-foreground">Due: {format(new Date(item.due_date), "dd MMM yyyy")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  const totalGrantValue = grantList.reduce((s, g) => s + Number(g.grant_amount || 0), 0);
  const activeGrants = grantList.filter(g => ["active", "approved"].includes(g.status)).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Landmark className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Grant Value</p><p className="text-lg font-bold text-foreground">KES {totalGrantValue.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10"><CheckSquare className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Active Grants</p><p className="text-lg font-bold text-foreground">{activeGrants}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><Landmark className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Total Grants</p><p className="text-lg font-bold text-foreground">{grantList.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Grant Pipeline</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Grant</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Grant</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Grant Name *</Label><Input value={form.grant_name} onChange={e => setForm(p => ({...p, grant_name: e.target.value}))} placeholder="e.g. USAID Education Grant 2026" /></div>
              <div><Label>Donor Name *</Label><Input value={form.donor_name} onChange={e => setForm(p => ({...p, donor_name: e.target.value}))} placeholder="e.g. USAID" /></div>
              <div><Label>Donor Email</Label><Input type="email" value={form.donor_contact_email} onChange={e => setForm(p => ({...p, donor_contact_email: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Grant Amount *</Label><Input type="number" value={form.grant_amount} onChange={e => setForm(p => ({...p, grant_amount: e.target.value}))} placeholder="0.00" /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({...p, currency: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="KES">KES</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRANT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Application Deadline</Label><Input type="date" value={form.application_deadline} onChange={e => setForm(p => ({...p, application_deadline: e.target.value}))} /></div>
                <div><Label>Reporting Frequency</Label>
                  <Select value={form.reporting_frequency} onValueChange={v => setForm(p => ({...p, reporting_frequency: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi-annually">Semi-Annually</SelectItem><SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
              <div><Label>Objectives</Label><Textarea value={form.objectives} onChange={e => setForm(p => ({...p, objectives: e.target.value}))} /></div>
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

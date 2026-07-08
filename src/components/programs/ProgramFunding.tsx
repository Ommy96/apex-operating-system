import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, DollarSign, Trash2, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  programId: string | undefined;
}

export function ProgramFunding({ programId }: Props) {
  const { currentOrganization } = useOrganization();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    donor_name: "",
    amount: "",
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
    funding_category: "",
    notes: "",
    project_id: "",
  });

  // Fetch projects under this program
  const { data: projects = [] } = useQuery({
    queryKey: ["program-projects-for-funding", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_code")
        .eq("program_id", programId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  // Fetch all funding (program-level and project-level)
  const { data: funding = [], isLoading } = useQuery({
    queryKey: ["program-funding", programId, orgId],
    queryFn: async () => {
      if (!programId || !orgId) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("organization_id", orgId)
        .eq("program_id", programId)
        .eq("transaction_type", "program_grant")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId && !!orgId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !programId) throw new Error("Missing org or program");
      const { error } = await supabase.from("financial_transactions").insert({
        organization_id: orgId,
        program_id: programId,
        project_id: form.project_id || null,
        transaction_type: "program_grant",
        donor_name: form.donor_name || null,
        amount: parseFloat(form.amount) || 0,
        currency: "KES",
        transaction_date: form.transaction_date,
        description: form.description || `Direct funding${form.donor_name ? ` from ${form.donor_name}` : ""}`,
        funding_category: form.funding_category || "Program Grant",
        notes: form.notes || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-funding", programId] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["exec-donors"] });
      queryClient.invalidateQueries({ queryKey: ["donor-support-totals"] });
      toast.success("Funding added successfully");
      setIsOpen(false);
      setForm({ donor_name: "", amount: "", transaction_date: new Date().toISOString().split("T")[0], description: "", funding_category: "", notes: "", project_id: "" });
    },
    onError: (err) => toast.error("Failed to add funding: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-funding", programId] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Funding record removed");
    },
    onError: (err) => toast.error("Failed to delete: " + err.message),
  });

  const totalFunding = funding.reduce((s, f) => s + Number(f.amount || 0), 0);
  const programLevelFunding = funding.filter(f => !f.project_id);
  const programLevelTotal = programLevelFunding.reduce((s, f) => s + Number(f.amount || 0), 0);

  // Group funding by project
  const projectFundingMap = new Map<string, { name: string; code: string | null; total: number; count: number }>();
  funding.forEach(f => {
    if (f.project_id) {
      const existing = projectFundingMap.get(f.project_id);
      const proj = projects.find(p => p.id === f.project_id);
      if (existing) {
        existing.total += Number(f.amount || 0);
        existing.count += 1;
      } else {
        projectFundingMap.set(f.project_id, {
          name: proj?.name || "Unknown Project",
          code: proj?.project_code || null,
          total: Number(f.amount || 0),
          count: 1,
        });
      }
    }
  });

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const proj = projects.find(p => p.id === projectId);
    return proj?.name || "Unknown Project";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Program & Project Funding</h3>
          <p className="text-sm text-muted-foreground">
            Direct funding allocated to this program or its projects
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Funding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Funding</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.amount || parseFloat(form.amount) <= 0) {
                    toast.error("Please enter a valid amount");
                    return;
                  }
                  addMutation.mutate();
                }}
                className="space-y-4"
              >
                {/* Project selector */}
                <div className="space-y-2">
                  <Label>Allocate To</Label>
                  <Select
                    value={form.project_id}
                    onValueChange={(val) => setForm({ ...form, project_id: val === "program_level" ? "" : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program or project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="program_level">
                        Program Level (General)
                      </SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.project_code ? ` (${p.project_code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose a specific project or leave as program-level funding
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Donor / Funder Name</Label>
                    <Input
                      placeholder="e.g. USAID, World Bank"
                      value={form.donor_name}
                      onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KES) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.transaction_date}
                      onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Funding Category</Label>
                    <Input
                      placeholder="e.g. Grant, Donation"
                      value={form.funding_category}
                      onChange={(e) => setForm({ ...form, funding_category: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of the funding"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Saving..." : "Add Funding"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Program-to-project top up from unrestricted pool */}
      {(unrestrictedPools.length > 0 || projectHealth.length > 0) && (
        <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
              Top up projects from unrestricted program funds
              <RestrictionBadge restriction="unrestricted" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Unrestricted pool available:&nbsp;
              <span className="font-semibold">
                {unrestrictedPools.reduce((s: number, p: any) => s + Number(p.balance_base || 0), 0).toLocaleString()}
              </span>{" "}
              across {unrestrictedPools.length} pool(s). Restricted program funds cannot be moved.
            </div>
            {projectHealth.length === 0 ? (
              <p className="text-xs text-muted-foreground">All projects are on budget.</p>
            ) : (
              <div className="divide-y">
                {projectHealth.slice(0, 8).map((p: any) => (
                  <div key={p.project_id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">Gap: KES {Number(p.gap).toLocaleString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isAdmin || unrestrictedPools.length === 0}
                      onClick={() => {
                        setTopUpFor({ projectId: p.project_id, name: p.name, gap: Number(p.gap) });
                        setTopUpPoolId(unrestrictedPools[0]?.id ?? "");
                        setTopUpAmount("");
                        setTopUpReason("");
                      }}
                    >
                      Allocate to project
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!topUpFor} onOpenChange={(o) => !o && setTopUpFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top up {topUpFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Funding gap: KES {topUpFor?.gap.toLocaleString()}
            </div>
            <div className="space-y-2">
              <Label>Source pool (unrestricted)</Label>
              <Select value={topUpPoolId} onValueChange={setTopUpPoolId}>
                <SelectTrigger><SelectValue placeholder="Choose pool" /></SelectTrigger>
                <SelectContent>
                  {unrestrictedPools.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.donor_accounts?.donor_name ?? "Donor"} · {p.currency} {Number(p.balance_native).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (native currency)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                value={topUpReason}
                onChange={(e) => setTopUpReason(e.target.value)}
                rows={2}
                placeholder="Why is this reallocation needed?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTopUpFor(null)}>Cancel</Button>
              <Button
                onClick={() => topUpMutation.mutate()}
                disabled={topUpMutation.isPending || !topUpPoolId || !topUpAmount || topUpReason.trim().length < 3}
              >
                {topUpMutation.isPending ? "Allocating…" : "Allocate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Funding</p>
              <p className="text-lg font-bold text-foreground">KES {totalFunding.toLocaleString()}</p>
            </div>
            <Badge variant="outline" className="ml-auto">{funding.length} records</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/50">
              <DollarSign className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Program-Level</p>
              <p className="text-lg font-bold text-foreground">KES {programLevelTotal.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <FolderKanban className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project-Level</p>
              <p className="text-lg font-bold text-foreground">KES {(totalFunding - programLevelTotal).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Funding Breakdown */}
      {projectFundingMap.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Funding by Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(projectFundingMap.entries()).map(([projId, info]) => (
              <div key={projId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{info.name}</p>
                  {info.code && <p className="text-xs text-muted-foreground">{info.code}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">KES {info.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{info.count} record{info.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Donor / Funder</TableHead>
              <TableHead className="hidden sm:table-cell">Allocated To</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : funding.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No funding recorded yet. Click "Add Funding" to get started.
                </TableCell>
              </TableRow>
            ) : (
              funding.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(f.transaction_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{f.donor_name || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {f.project_id ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <FolderKanban className="h-3 w-3" />
                        {getProjectName(f.project_id)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Program Level</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm max-w-[180px] truncate">{f.description || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">{f.funding_category || "General"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-success">
                    KES {Number(f.amount).toLocaleString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(f.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}

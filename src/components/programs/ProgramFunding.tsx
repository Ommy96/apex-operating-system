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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, DollarSign, Trash2 } from "lucide-react";
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
  });

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
        transaction_type: "program_grant",
        donor_name: form.donor_name || null,
        amount: parseFloat(form.amount) || 0,
        currency: "KES",
        transaction_date: form.transaction_date,
        description: form.description || `Direct program funding${form.donor_name ? ` from ${form.donor_name}` : ""}`,
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
      toast.success("Program funding added successfully");
      setIsOpen(false);
      setForm({ donor_name: "", amount: "", transaction_date: new Date().toISOString().split("T")[0], description: "", funding_category: "", notes: "" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Program Funding</h3>
          <p className="text-sm text-muted-foreground">
            Direct funding allocated to this program (not tied to individual beneficiaries)
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Funding
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Program Funding</DialogTitle>
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

      {/* Summary */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Direct Program Funding</p>
            <p className="text-lg font-bold text-foreground">KES {totalFunding.toLocaleString()}</p>
          </div>
          <Badge variant="outline" className="ml-auto">{funding.length} record{funding.length !== 1 ? "s" : ""}</Badge>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Donor / Funder</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : funding.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No direct program funding recorded yet. Click "Add Funding" to get started.
                </TableCell>
              </TableRow>
            ) : (
              funding.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(f.transaction_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{f.donor_name || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{f.description || "—"}</TableCell>
                  <TableCell>
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
      </Card>
    </div>
  );
}

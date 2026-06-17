import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { redirectAllocation, formatMoney } from "@/lib/allocationEngine";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  allocationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  currentBeneficiaryId?: string | null;
  amountNative?: number | string;
  nativeCurrency?: string;
  onDone?: () => void;
}

export function RedirectAllocationDialog(p: Props) {
  const { currentOrganization: organization } = useOrganization();
  const qc = useQueryClient();
  const [target, setTarget] = useState<string>("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: candidates = [] } = useQuery({
    queryKey: ["redirect-candidates", organization?.id, p.projectId, p.currentBeneficiaryId],
    enabled: !!organization?.id && p.open,
    queryFn: async () => {
      // Prefer beneficiaries enrolled in the same project; fall back to all org beneficiaries
      if (p.projectId) {
        const { data } = await supabase
          .from("beneficiary_services")
          .select("beneficiary_id, beneficiaries:beneficiary_id(id, first_name, last_name, unique_id, status)")
          .eq("organization_id", organization!.organization_id)
          .eq("project_id", p.projectId)
          .eq("status", "active");
        const rows = (data ?? [])
          .map((r: any) => r.beneficiaries)
          .filter((b: any) => b && b.id !== p.currentBeneficiaryId);
        if (rows.length > 0) return rows;
      }
      const { data } = await supabase
        .from("beneficiaries")
        .select("id, first_name, last_name, unique_id, status")
        .eq("organization_id", organization!.organization_id)
        .is("deleted_at", null)
        .limit(200);
      return (data ?? []).filter((b: any) => b.id !== p.currentBeneficiaryId);
    },
  });

  async function submit() {
    if (!target) return toast.error("Select a target beneficiary");
    if (reason.trim().length < 3) return toast.error("Reason is required");
    setSaving(true);
    const res = await redirectAllocation({ allocationId: p.allocationId, newBeneficiaryId: target, reason: reason.trim() });
    setSaving(false);
    if (!res.success) return toast.error(res.error || "Failed to redirect");
    toast.success("Allocation redirected");
    qc.invalidateQueries({ queryKey: ["allocations"] });
    qc.invalidateQueries({ queryKey: ["donor-pools"] });
    p.onDone?.();
    p.onOpenChange(false);
    setReason("");
    setTarget("");
  }

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redirect allocation</DialogTitle>
          <DialogDescription>
            Move this allocation to a different beneficiary. The original is marked redirected and a child allocation is created.
            {p.amountNative != null && p.nativeCurrency
              ? <span className="block mt-1 text-foreground">Amount: <strong>{formatMoney(p.amountNative, p.nativeCurrency)}</strong></span>
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Target beneficiary</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
              <SelectContent>
                {candidates.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {(b.first_name || "") + " " + (b.last_name || "")} {b.unique_id ? `(${b.unique_id})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => p.onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Redirect</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
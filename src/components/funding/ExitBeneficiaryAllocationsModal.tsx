import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { exitBeneficiary, formatMoney } from "@/lib/allocationEngine";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaryId: string;
  projectId: string;
  onDone?: () => void;
}

export function ExitBeneficiaryAllocationsModal(p: Props) {
  const { currentOrganization: organization } = useOrganization();
  const qc = useQueryClient();
  const [resolution, setResolution] = useState<"redirect" | "hold">("redirect");
  const [target, setTarget] = useState<string>("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: actives, isLoading } = useQuery({
    queryKey: ["exit-allocations", p.beneficiaryId, p.projectId, p.open],
    enabled: p.open && !!p.beneficiaryId && !!p.projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("allocations")
        .select("id, amount_native, native_currency, amount_base, base_currency")
        .eq("beneficiary_id", p.beneficiaryId)
        .eq("project_id", p.projectId)
        .eq("status", "active");
      return data ?? [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["exit-candidates", organization?.id, p.projectId, p.beneficiaryId],
    enabled: p.open && !!organization?.id && resolution === "redirect",
    queryFn: async () => {
      const { data } = await supabase
        .from("beneficiary_services")
        .select("beneficiary_id, beneficiaries:beneficiary_id(id, first_name, last_name, unique_id)")
        .eq("organization_id", organization!.organization_id)
        .eq("project_id", p.projectId)
        .eq("status", "active");
      return (data ?? [])
        .map((r: any) => r.beneficiaries)
        .filter((b: any) => b && b.id !== p.beneficiaryId);
    },
  });

  useEffect(() => { if (!p.open) { setReason(""); setTarget(""); setResolution("redirect"); } }, [p.open]);

  const totalNative = (actives ?? []).reduce((s, a: any) => s + Number(a.amount_native ?? 0), 0);
  const totalBase = (actives ?? []).reduce((s, a: any) => s + Number(a.amount_base ?? 0), 0);
  const cur = (actives ?? [])[0]?.native_currency ?? "KES";
  const baseCur = (actives ?? [])[0]?.base_currency ?? "KES";

  async function submit() {
    if (reason.trim().length < 3) return toast.error("Reason is required");
    if (resolution === "redirect" && !target) return toast.error("Select a beneficiary to redirect to");
    setSaving(true);
    const res: any = await exitBeneficiary({
      beneficiaryId: p.beneficiaryId,
      projectId: p.projectId,
      resolution,
      redirectBeneficiaryId: resolution === "redirect" ? target : undefined,
      reason: reason.trim(),
    });
    setSaving(false);
    if (!res?.success) return toast.error(res?.error || res?.message || "Failed");
    toast.success(`Resolved ${res.affected} allocation${res.affected === 1 ? "" : "s"}`);
    qc.invalidateQueries({ queryKey: ["allocations"] });
    qc.invalidateQueries({ queryKey: ["donor-pools"] });
    p.onDone?.();
    p.onOpenChange(false);
  }

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve sponsor allocations</DialogTitle>
          <DialogDescription>
            {isLoading
              ? <Skeleton className="h-4 w-64" />
              : <>This beneficiary has <strong>{actives?.length ?? 0}</strong> active allocations totalling{" "}
                <strong>{formatMoney(totalNative, cur)}</strong> ({formatMoney(totalBase, baseCur)}).</>}
            <br />Funds will never be refunded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as any)}>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="redirect" id="r1" />
              <Label htmlFor="r1" className="font-normal cursor-pointer">
                <div className="font-medium">Redirect to another beneficiary</div>
                <div className="text-xs text-muted-foreground">Active allocations move to a new beneficiary in this project.</div>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="hold" id="r2" />
              <Label htmlFor="r2" className="font-normal cursor-pointer">
                <div className="font-medium">Hold in the project pool</div>
                <div className="text-xs text-muted-foreground">Funds return to the donor's project pool for future allocation.</div>
              </Label>
            </div>
          </RadioGroup>

          {resolution === "redirect" && (
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
          )}

          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => p.onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Resolve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
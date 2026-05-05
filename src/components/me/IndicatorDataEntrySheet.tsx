import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  indicator: { id: string; name: string; measurement_unit?: string | null } | null;
  programId?: string;
  projectId?: string;
  onSuccess?: () => void;
}

const COLLECTION_METHODS = [
  "Field survey", "Records review", "Focus group", "Observation",
  "Interviews", "Routine reporting", "Other",
];

export function IndicatorDataEntrySheet({ open, onOpenChange, indicator, programId, projectId, onSuccess }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState("Routine reporting");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setValue(""); setDate(today); setMethod("Routine reporting"); setSource(""); setNotes("");
    }
  }, [open, today]);

  const save = useMutation({
    mutationFn: async () => {
      if (!indicator) throw new Error("No indicator");
      const num = Number(value);
      if (Number.isNaN(num)) throw new Error("Value must be a number");
      const noteParts = [
        method ? `Method: ${method}` : null,
        source ? `Source: ${source}` : null,
        notes || null,
      ].filter(Boolean);
      const { error } = await supabase.from("indicator_values").insert({
        indicator_id: indicator.id,
        actual_value: num,
        period_start: date,
        period_end: date,
        notes: noteParts.join(" · ") || null,
        is_manual_override: true,
        created_by: user?.id,
      });
      if (error) throw error;

      // Update last_collected_date on me_data_schedule if exists
      try {
        await (supabase.from("me_data_schedule" as any) as any)
          .update({ last_collected_date: date })
          .eq("indicator_id", indicator.id);
      } catch {}
    },
    onSuccess: () => {
      toast.success(`Data recorded for ${indicator?.name}`);
      qc.invalidateQueries({ queryKey: ["program-indicators"] });
      qc.invalidateQueries({ queryKey: ["indicators"] });
      qc.invalidateQueries({ queryKey: ["dashboard-indicator-status"] });
      qc.invalidateQueries({ queryKey: ["me-schedules"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record indicator data</SheetTitle>
        </SheetHeader>
        {indicator && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="text-xs text-muted-foreground">Indicator</div>
              <div className="font-medium">{indicator.name}</div>
              {indicator.measurement_unit && (
                <div className="text-xs text-muted-foreground mt-1">Unit: {indicator.measurement_unit}</div>
              )}
            </div>
            <div>
              <Label>Value *</Label>
              <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div>
              <Label>Collection date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Collection method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLLECTION_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data source</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Beneficiary database, MoH report" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="w-full" disabled={!value || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving..." : "Record data"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
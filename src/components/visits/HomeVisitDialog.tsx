import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { captureGPS, compressImage } from "@/lib/offlineStorage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaryId: string;
  householdId?: string | null;
  onSaved?: () => void;
}

export function HomeVisitDialog({ open, onOpenChange, beneficiaryId, householdId, onSaved }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { addRecord } = useOfflineSync();
  const [saving, setSaving] = useState(false);
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().slice(0, 10),
    living_conditions: "",
    household_income: "",
    health_status: "",
    risks_observed: "",
    notes: "",
    follow_up_needed: false,
  });

  const captureGps = async () => {
    try {
      const pos = await captureGPS();
      setGps({ latitude: pos.latitude, longitude: pos.longitude });
      toast.success("GPS captured");
    } catch {
      toast.error("Could not capture GPS");
    }
  };

  const submit = async () => {
    if (!currentOrganization?.organization_id) return;
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photo && navigator.onLine) {
        try {
          const blob = await compressImage(photo);
          const path = `${beneficiaryId}/home-visit/${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage.from("beneficiary-documents").upload(path, blob);
          if (!upErr) {
            const { data } = supabase.storage.from("beneficiary-documents").getPublicUrl(path);
            photoUrl = data.publicUrl;
          }
        } catch { /* ignore */ }
      }

      const risk_flags: string[] = [];
      if (form.risks_observed) risk_flags.push("risks_observed");
      if (form.follow_up_needed) risk_flags.push("follow_up_needed");

      const payload: any = {
        beneficiary_id: beneficiaryId,
        household_id: householdId || null,
        visit_date: new Date(form.visit_date).toISOString(),
        living_conditions: form.living_conditions || null,
        household_income: form.household_income ? Number(form.household_income) : null,
        health_status: form.health_status || null,
        risks_observed: form.risks_observed || null,
        risk_flags,
        notes: form.notes || null,
        photo_urls: photoUrl ? [photoUrl] : [],
        gps_lat: gps?.latitude ?? null,
        gps_lng: gps?.longitude ?? null,
        follow_up_needed: form.follow_up_needed,
      };

      if (navigator.onLine) {
        const { error } = await (supabase as any).from("home_visits").insert({
          ...payload,
          organization_id: currentOrganization.organization_id,
          visited_by: user?.id,
        });
        if (error) throw error;

        // Also write a beneficiary_visitations timeline entry
        try {
          await supabase.from("beneficiary_visitations").insert({
            beneficiary_id: beneficiaryId,
            visit_type: "home_visit",
            visit_date: form.visit_date,
            observation_findings: form.notes || form.living_conditions || null,
            recommendations: form.follow_up_needed ? "Follow-up required" : null,
            location: gps ? `${gps.latitude},${gps.longitude}` : null,
            organization_id: currentOrganization.organization_id,
            created_by: user?.id,
          });
        } catch { /* non-fatal */ }

        toast.success("Home visit recorded");
      } else {
        await addRecord("home_visit", payload);
        toast.success("Home visit saved offline — will sync when online");
      }

      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Structured home visit</DialogTitle>
          <DialogDescription>Capture living conditions, income, health and risks. Works offline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Visit date</Label>
              <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
            </div>
            <div>
              <Label>Household income (monthly)</Label>
              <Input type="number" value={form.household_income} onChange={(e) => setForm({ ...form, household_income: e.target.value })} placeholder="e.g. 15000" />
            </div>
          </div>

          <div>
            <Label>Living conditions</Label>
            <Textarea rows={2} value={form.living_conditions} onChange={(e) => setForm({ ...form, living_conditions: e.target.value })} placeholder="Housing type, water, sanitation, safety…" />
          </div>

          <div>
            <Label>Health status</Label>
            <Textarea rows={2} value={form.health_status} onChange={(e) => setForm({ ...form, health_status: e.target.value })} placeholder="Nutrition, illnesses, medications…" />
          </div>

          <div>
            <Label>Risks observed</Label>
            <Textarea rows={2} value={form.risks_observed} onChange={(e) => setForm({ ...form, risks_observed: e.target.value })} placeholder="Any safeguarding, health or economic risks" />
          </div>

          <div>
            <Label>Additional notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="fu" checked={form.follow_up_needed} onCheckedChange={(v) => setForm({ ...form, follow_up_needed: !!v })} />
            <Label htmlFor="fu" className="cursor-pointer">Follow-up needed</Label>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={captureGps}>
              <MapPin className="h-4 w-4 mr-1" />
              {gps ? `GPS: ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : "Capture GPS"}
            </Button>
            <label className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted">
              <Camera className="h-4 w-4" />
              {photo ? photo.name.slice(0, 24) : "Attach photo"}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
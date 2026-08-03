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
  onSaved?: () => void;
}

export function SchoolVisitDialog({ open, onOpenChange, beneficiaryId, onSaved }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { addRecord } = useOfflineSync();
  const [saving, setSaving] = useState(false);
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().slice(0, 10),
    institution_name: "",
    attendance_rate: "",
    academic_average: "",
    current_grade: "",
    academic_performance: "",
    teacher_feedback: "",
    behaviour_report: "",
    notes: "",
    follow_up_needed: false,
  });

  const submit = async () => {
    if (!currentOrganization?.organization_id) return;
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photo && navigator.onLine) {
        try {
          const blob = await compressImage(photo);
          const path = `${beneficiaryId}/school-visit/${Date.now()}.jpg`;
          const { error } = await supabase.storage.from("beneficiary-documents").upload(path, blob);
          if (!error) {
            const { data } = supabase.storage.from("beneficiary-documents").getPublicUrl(path);
            photoUrl = data.publicUrl;
          }
        } catch { /* ignore */ }
      }

      const payload: any = {
        beneficiary_id: beneficiaryId,
        visit_date: new Date(form.visit_date).toISOString(),
        institution_name: form.institution_name || null,
        attendance_rate: form.attendance_rate ? Number(form.attendance_rate) : null,
        academic_average: form.academic_average ? Number(form.academic_average) : null,
        current_grade: form.current_grade || null,
        academic_performance: form.academic_performance || null,
        teacher_feedback: form.teacher_feedback || null,
        behaviour_report: form.behaviour_report || null,
        notes: form.notes || null,
        photo_urls: photoUrl ? [photoUrl] : [],
        gps_lat: gps?.latitude ?? null,
        gps_lng: gps?.longitude ?? null,
        follow_up_needed: form.follow_up_needed,
      };

      if (navigator.onLine) {
        const { error } = await (supabase as any).from("school_visits").insert({
          ...payload,
          organization_id: currentOrganization.organization_id,
          visited_by: user?.id,
        });
        if (error) throw error;

        // Feed the academic history record
        try {
          if (form.academic_average || form.attendance_rate || form.current_grade) {
            await (supabase as any).from("academic_performance").insert({
              beneficiary_id: beneficiaryId,
              organization_id: currentOrganization.organization_id,
              period: form.current_grade || "Visit",
              average_score: form.academic_average ? Number(form.academic_average) : null,
              attendance_percentage: form.attendance_rate ? Number(form.attendance_rate) : null,
              teacher_comments: form.teacher_feedback || null,
              created_by: user?.id,
            });
          }
        } catch { /* non-fatal */ }

        toast.success("School visit recorded");
      } else {
        await addRecord("school_visit", payload);
        toast.success("School visit saved offline — will sync when online");
      }

      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  const captureGpsHandler = async () => {
    try { const p = await captureGPS(); setGps({ latitude: p.latitude, longitude: p.longitude }); toast.success("GPS captured"); }
    catch { toast.error("Could not capture GPS"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Structured school visit</DialogTitle>
          <DialogDescription>Attendance, performance and teacher feedback. Feeds academic history & donor updates.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Visit date</Label>
              <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
            </div>
            <div>
              <Label>School / institution</Label>
              <Input value={form.institution_name} onChange={(e) => setForm({ ...form, institution_name: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label>Attendance %</Label>
              <Input type="number" value={form.attendance_rate} onChange={(e) => setForm({ ...form, attendance_rate: e.target.value })} />
            </div>
            <div>
              <Label>Academic average</Label>
              <Input type="number" value={form.academic_average} onChange={(e) => setForm({ ...form, academic_average: e.target.value })} />
            </div>
            <div>
              <Label>Current grade</Label>
              <Input value={form.current_grade} onChange={(e) => setForm({ ...form, current_grade: e.target.value })} placeholder="e.g. Grade 5" />
            </div>
          </div>

          <div>
            <Label>Academic performance narrative</Label>
            <Textarea rows={2} value={form.academic_performance} onChange={(e) => setForm({ ...form, academic_performance: e.target.value })} />
          </div>

          <div>
            <Label>Teacher feedback</Label>
            <Textarea rows={2} value={form.teacher_feedback} onChange={(e) => setForm({ ...form, teacher_feedback: e.target.value })} />
          </div>

          <div>
            <Label>Behaviour report</Label>
            <Textarea rows={2} value={form.behaviour_report} onChange={(e) => setForm({ ...form, behaviour_report: e.target.value })} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="fu-s" checked={form.follow_up_needed} onCheckedChange={(v) => setForm({ ...form, follow_up_needed: !!v })} />
            <Label htmlFor="fu-s" className="cursor-pointer">Follow-up needed</Label>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={captureGpsHandler}>
              <MapPin className="h-4 w-4 mr-1" />
              {gps ? `GPS captured` : "Capture GPS"}
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
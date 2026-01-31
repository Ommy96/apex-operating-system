import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface HospitalVisitFormProps {
  beneficiaryId?: string;
  visit?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function HospitalVisitForm({ beneficiaryId, visit, onSuccess, onCancel }: HospitalVisitFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: visit?.date || new Date().toISOString().split('T')[0],
    hospital: visit?.hospital || '',
    doctors_report: visit?.doctors_report || '',
    staff: visit?.staff || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.organization_id) {
      toast({ title: "Organization not found", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: formData.date,
        hospital: formData.hospital,
        doctors_report: formData.doctors_report,
        staff: formData.staff,
        // Required fields with defaults
        full_name: 'Hospital Visit',
        medical_condition: 'Hospital Visit Record',
        organization_id: currentOrganization.organization_id,
        linked_child_id: beneficiaryId || null,
      };

      if (visit?.id) {
        const { error } = await supabase
          .from('medical_records')
          .update({
            date: formData.date,
            hospital: formData.hospital,
            doctors_report: formData.doctors_report,
            staff: formData.staff,
          })
          .eq('id', visit.id);
        if (error) throw error;
        toast({ title: "Hospital visit updated successfully" });
      } else {
        const { error } = await supabase
          .from('medical_records')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Hospital visit recorded successfully" });
      }
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error saving visit", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date of Visit *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hospital">Medical Facility *</Label>
          <Input
            id="hospital"
            value={formData.hospital}
            onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
            placeholder="Enter medical facility name"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="staff">Staff *</Label>
        <Input
          id="staff"
          value={formData.staff}
          onChange={(e) => setFormData({ ...formData, staff: e.target.value })}
          placeholder="Enter staff name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="doctors_report">Notes</Label>
        <Textarea
          id="doctors_report"
          value={formData.doctors_report}
          onChange={(e) => setFormData({ ...formData, doctors_report: e.target.value })}
          placeholder="Enter visit notes"
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : visit ? 'Update Visit' : 'Record Visit'}
        </Button>
      </div>
    </form>
  );
}

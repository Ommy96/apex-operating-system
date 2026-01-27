import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    full_name: visit?.full_name || '',
    hospital: visit?.hospital || '',
    date: visit?.date || new Date().toISOString().split('T')[0],
    location: visit?.location || '',
    gender: visit?.gender || '',
    medical_condition: visit?.medical_condition || '',
    doctors_report: visit?.doctors_report || '',
    outcome: visit?.outcome || '',
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
        ...formData,
        organization_id: currentOrganization.organization_id,
        linked_child_id: beneficiaryId || null,
      };

      if (visit?.id) {
        const { error } = await supabase
          .from('medical_records')
          .update(payload)
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
          <Label htmlFor="full_name">Patient Name *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Enter patient name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hospital">Hospital *</Label>
          <Input
            id="hospital"
            value={formData.hospital}
            onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
            placeholder="Enter hospital name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Visit Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Select
          value={formData.location}
          onValueChange={(value) => setFormData({ ...formData, location: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Kibera">Kibera</SelectItem>
            <SelectItem value="Kawangware">Kawangware</SelectItem>
            <SelectItem value="Diaspora">Diaspora</SelectItem>
            <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="medical_condition">Medical Condition *</Label>
        <Textarea
          id="medical_condition"
          value={formData.medical_condition}
          onChange={(e) => setFormData({ ...formData, medical_condition: e.target.value })}
          placeholder="Describe the medical condition"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="doctors_report">Doctor's Report</Label>
        <Textarea
          id="doctors_report"
          value={formData.doctors_report}
          onChange={(e) => setFormData({ ...formData, doctors_report: e.target.value })}
          placeholder="Enter doctor's report"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outcome">Outcome</Label>
        <Textarea
          id="outcome"
          value={formData.outcome}
          onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
          placeholder="Describe the outcome"
          rows={2}
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

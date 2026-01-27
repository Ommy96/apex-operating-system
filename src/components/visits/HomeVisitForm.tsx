import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface HomeVisitFormProps {
  beneficiaryId?: string;
  visit?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function HomeVisitForm({ beneficiaryId, visit, onSuccess, onCancel }: HomeVisitFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    staff: visit?.staff || '',
    visit_date: visit?.visit_date || new Date().toISOString().split('T')[0],
    location: visit?.location || '',
    reason_for_visit: visit?.reason_for_visit || '',
    observation_findings: visit?.observation_findings || '',
    challenges_identified: visit?.challenges_identified || '',
    recommendations: visit?.recommendations || '',
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
        student_id: beneficiaryId || null,
      };

      if (visit?.id) {
        const { error } = await supabase
          .from('home_visit_reports')
          .update(payload)
          .eq('id', visit.id);
        if (error) throw error;
        toast({ title: "Home visit updated successfully" });
      } else {
        const { error } = await supabase
          .from('home_visit_reports')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Home visit recorded successfully" });
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
          <Label htmlFor="staff">Staff Name *</Label>
          <Input
            id="staff"
            value={formData.staff}
            onChange={(e) => setFormData({ ...formData, staff: e.target.value })}
            placeholder="Enter staff name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visit_date">Visit Date *</Label>
          <Input
            id="visit_date"
            type="date"
            value={formData.visit_date}
            onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
            required
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
        <Label htmlFor="reason_for_visit">Reason for Visit</Label>
        <Textarea
          id="reason_for_visit"
          value={formData.reason_for_visit}
          onChange={(e) => setFormData({ ...formData, reason_for_visit: e.target.value })}
          placeholder="Describe the reason for this visit"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observation_findings">Observation Findings *</Label>
        <Textarea
          id="observation_findings"
          value={formData.observation_findings}
          onChange={(e) => setFormData({ ...formData, observation_findings: e.target.value })}
          placeholder="Document your observations"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="challenges_identified">Challenges Identified *</Label>
        <Textarea
          id="challenges_identified"
          value={formData.challenges_identified}
          onChange={(e) => setFormData({ ...formData, challenges_identified: e.target.value })}
          placeholder="Note any challenges observed"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recommendations">Recommendations *</Label>
        <Textarea
          id="recommendations"
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          placeholder="Provide recommendations"
          rows={3}
          required
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

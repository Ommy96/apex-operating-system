import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

interface BusinessVisitFormProps {
  applicantId?: string;
  visit?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BusinessVisitForm({ applicantId, visit, onSuccess, onCancel }: BusinessVisitFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    business_id: visit?.business_id || applicantId || "",
    staff: visit?.staff || "",
    visit_date: visit?.visit_date || new Date().toISOString().split('T')[0],
    location: visit?.location || "",
    reason_for_visit: visit?.reason_for_visit || "",
    observation_findings: visit?.observation_findings || "",
    challenges_identified: visit?.challenges_identified || "",
    recommendations: visit?.recommendations || "",
  });

  // Fetch self-empowerment applicants if no applicant is pre-selected
  const { data: applicants = [] } = useQuery({
    queryKey: ['self-empowerment-applicants', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id || applicantId) return [];
      const { data, error } = await supabase
        .from('self_empowerment')
        .select('id, full_name, business_name')
        .eq('organization_id', currentOrganization.organization_id)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id && !applicantId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentOrganization?.organization_id) {
      toast({ title: "No organization selected", variant: "destructive" });
      return;
    }

    if (!formData.business_id) {
      toast({ title: "Please select an applicant", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        organization_id: currentOrganization.organization_id,
        created_by: user?.id,
      };

      if (visit?.id) {
        const { error } = await supabase
          .from('business_visit_reports')
          .update(payload)
          .eq('id', visit.id);
        if (error) throw error;
        toast({ title: "Visit report updated successfully" });
      } else {
        const { error } = await supabase
          .from('business_visit_reports')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Visit report created successfully" });
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Error saving visit report:', error);
      toast({ 
        title: "Failed to save visit report", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!applicantId && (
        <div className="space-y-2">
          <Label htmlFor="business_id">Applicant / Business *</Label>
          <Select
            value={formData.business_id}
            onValueChange={(value) => setFormData({ ...formData, business_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select applicant" />
            </SelectTrigger>
            <SelectContent>
              {applicants.map((applicant: any) => (
                <SelectItem key={applicant.id} value={applicant.id}>
                  {applicant.full_name} {applicant.business_name ? `(${applicant.business_name})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Business location"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason_for_visit">Reason for Visit</Label>
        <Input
          id="reason_for_visit"
          value={formData.reason_for_visit}
          onChange={(e) => setFormData({ ...formData, reason_for_visit: e.target.value })}
          placeholder="Purpose of the visit"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observation_findings">Observation Findings *</Label>
        <Textarea
          id="observation_findings"
          value={formData.observation_findings}
          onChange={(e) => setFormData({ ...formData, observation_findings: e.target.value })}
          placeholder="What did you observe during the visit?"
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="challenges_identified">Challenges Identified *</Label>
        <Textarea
          id="challenges_identified"
          value={formData.challenges_identified}
          onChange={(e) => setFormData({ ...formData, challenges_identified: e.target.value })}
          placeholder="What challenges did the business face?"
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recommendations">Recommendations *</Label>
        <Textarea
          id="recommendations"
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          placeholder="Your recommendations for the business"
          rows={4}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : visit?.id ? 'Update Visit' : 'Record Visit'}
        </Button>
      </div>
    </form>
  );
}

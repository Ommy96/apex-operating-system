import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type ProgramType = Database["public"]["Enums"]["program_type"];

interface ProgramReportFormProps {
  programType: string;
  report?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProgramReportForm({ programType, report, onSuccess, onCancel }: ProgramReportFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    staff: report?.staff || "",
    reporting_date: report?.reporting_date || new Date().toISOString().split('T')[0],
    executive_summary: report?.executive_summary || "",
    beneficiary_impact: report?.beneficiary_impact || "",
    challenges: report?.challenges || "",
    proposed_recommendations: report?.proposed_recommendations || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentOrganization?.organization_id) {
      toast({ title: "No organization selected", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        program: programType as ProgramType,
        organization_id: currentOrganization.organization_id,
        created_by: user?.id,
      };

      if (report?.id) {
        const { error } = await supabase
          .from('program_reports')
          .update(payload)
          .eq('id', report.id);
        if (error) throw error;
        toast({ title: "Report updated successfully" });
      } else {
        const { error } = await supabase
          .from('program_reports')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Report created successfully" });
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast({ 
        title: "Failed to save report", 
        description: error.message,
        variant: "destructive" 
      });
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
          <Label htmlFor="reporting_date">Report Date *</Label>
          <Input
            id="reporting_date"
            type="date"
            value={formData.reporting_date}
            onChange={(e) => setFormData({ ...formData, reporting_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="executive_summary">Executive Summary *</Label>
        <Textarea
          id="executive_summary"
          value={formData.executive_summary}
          onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })}
          placeholder="Provide a summary of the report period..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="beneficiary_impact">Beneficiary Impact *</Label>
        <Textarea
          id="beneficiary_impact"
          value={formData.beneficiary_impact}
          onChange={(e) => setFormData({ ...formData, beneficiary_impact: e.target.value })}
          placeholder="Describe the impact on beneficiaries..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="challenges">Challenges *</Label>
        <Textarea
          id="challenges"
          value={formData.challenges}
          onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
          placeholder="List challenges encountered..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proposed_recommendations">Proposed Recommendations *</Label>
        <Textarea
          id="proposed_recommendations"
          value={formData.proposed_recommendations}
          onChange={(e) => setFormData({ ...formData, proposed_recommendations: e.target.value })}
          placeholder="Provide recommendations..."
          rows={4}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : report?.id ? 'Update Report' : 'Create Report'}
        </Button>
      </div>
    </form>
  );
}

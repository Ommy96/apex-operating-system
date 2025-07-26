import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send } from "lucide-react";

interface OtherReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingReport?: any;
}

export const OtherReportForm = ({ onSuccess, onCancel, editingReport }: OtherReportFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    program: editingReport?.program || "",
    reportingDate: editingReport?.reporting_date || "",
    staff: editingReport?.staff || "",
    executiveSummary: editingReport?.executive_summary || "",
    beneficiaryImpact: editingReport?.beneficiary_impact || "",
    challenges: editingReport?.challenges || "",
    proposedRecommendations: editingReport?.proposed_recommendations || ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const administrativePrograms = [
    "Communication",
    "Chess",
    "Fundraising",
    "Admin",
    "Content Creation"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.program || !formData.reportingDate || !formData.staff || !formData.executiveSummary) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData = {
        program: formData.program as any,
        reporting_date: formData.reportingDate,
        staff: formData.staff,
        executive_summary: formData.executiveSummary,
        beneficiary_impact: formData.beneficiaryImpact,
        challenges: formData.challenges,
        proposed_recommendations: formData.proposedRecommendations,
        created_by: user?.id
      };

      if (editingReport) {
        const { error } = await supabase
          .from('activity_reports')
          .update(reportData)
          .eq('id', editingReport.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Report updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('activity_reports')
          .insert([reportData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Report submitted successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="max-h-[80vh] pr-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <Select
              value={formData.program}
              onValueChange={(value) => handleInputChange('program', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select administrative program" />
              </SelectTrigger>
              <SelectContent>
                {administrativePrograms.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportingDate">Reporting Date *</Label>
            <Input
              id="reportingDate"
              type="date"
              value={formData.reportingDate}
              onChange={(e) => handleInputChange('reportingDate', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="staff">Staff/Team Members *</Label>
            <Input
              id="staff"
              value={formData.staff}
              onChange={(e) => handleInputChange('staff', e.target.value)}
              placeholder="Enter staff names involved in this program"
              required
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="executiveSummary">Executive Summary *</Label>
            <Textarea
              id="executiveSummary"
              value={formData.executiveSummary}
              onChange={(e) => handleInputChange('executiveSummary', e.target.value)}
              placeholder="Provide a comprehensive overview of the program activities and outcomes"
              className="min-h-32"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiaryImpact">Beneficiary Impact</Label>
            <Textarea
              id="beneficiaryImpact"
              value={formData.beneficiaryImpact}
              onChange={(e) => handleInputChange('beneficiaryImpact', e.target.value)}
              placeholder="Describe the impact on beneficiaries and community"
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenges">Challenges Encountered</Label>
            <Textarea
              id="challenges"
              value={formData.challenges}
              onChange={(e) => handleInputChange('challenges', e.target.value)}
              placeholder="Describe any challenges or obstacles faced during implementation"
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposedRecommendations">Proposed Recommendations</Label>
            <Textarea
              id="proposedRecommendations"
              value={formData.proposedRecommendations}
              onChange={(e) => handleInputChange('proposedRecommendations', e.target.value)}
              placeholder="Provide recommendations for future improvement and sustainability"
              className="min-h-24"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                {editingReport ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {editingReport ? 'Update Report' : 'Submit Report'}
              </>
            )}
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
};
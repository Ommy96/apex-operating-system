import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProgramReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function ProgramReportForm({ onSuccess, onCancel, initialData }: ProgramReportFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    program: initialData?.program || "",
    staff: initialData?.staff || "",
    reporting_date: initialData?.reporting_date || "",
    executive_summary: initialData?.executive_summary || "",
    beneficiary_impact: initialData?.beneficiary_impact || "",
    challenges: initialData?.challenges || "",
    proposed_recommendations: initialData?.proposed_recommendations || "",
  });

  // Predefined programs for the dropdown
  const programs = [
    "Kibera Early dinner",
    "Kawangware Lunch Hour", 
    "Kibera Kipawa Sato",
    "Kawangware Kipawa Sato",
    "Self Empowerment",
    "Support Groups",
    "Family Adoption",
    "Medical",
    "Education",
    "Rongai Sunday Feeding",
    "Kawangware Sunday Feeding",
    "Kibera Sunday Feeding"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      console.log('Auth check:', { user: user?.id, authError });
      
      if (authError) {
        console.error('Authentication error:', authError);
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (!user) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      if (initialData) {
        // Update existing report
        const { error } = await supabase
          .from('program_reports')
          .update({
            program: formData.program,
            staff: formData.staff,
            reporting_date: formData.reporting_date,
            executive_summary: formData.executive_summary,
            beneficiary_impact: formData.beneficiary_impact,
            challenges: formData.challenges,
            proposed_recommendations: formData.proposed_recommendations,
          })
          .eq('id', initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Program report updated successfully",
        });
      } else {
        // Create new report
        const { error } = await supabase
          .from('program_reports')
          .insert({
            program: formData.program,
            staff: formData.staff,
            reporting_date: formData.reporting_date,
            executive_summary: formData.executive_summary,
            beneficiary_impact: formData.beneficiary_impact,
            challenges: formData.challenges,
            proposed_recommendations: formData.proposed_recommendations,
            created_by: user?.id,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Program report created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating program report:', error);
      toast({
        title: "Error",
        description: "Failed to create program report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-[80vh]">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="program">Program *</Label>
            <Select value={formData.program} onValueChange={(value) => handleInputChange('program', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="staff">Staff Member *</Label>
            <Input
              id="staff"
              value={formData.staff}
              onChange={(e) => handleInputChange('staff', e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="reporting_date">Reporting Date *</Label>
            <Input
              id="reporting_date"
              type="date"
              value={formData.reporting_date}
              onChange={(e) => handleInputChange('reporting_date', e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="executive_summary">Executive Summary *</Label>
          <Textarea
            id="executive_summary"
            value={formData.executive_summary}
            onChange={(e) => handleInputChange('executive_summary', e.target.value)}
            placeholder="Provide a high-level summary of the program's performance..."
            required
          />
        </div>

        <div>
          <Label htmlFor="beneficiary_impact">Beneficiary Impact *</Label>
          <Textarea
            id="beneficiary_impact"
            value={formData.beneficiary_impact}
            onChange={(e) => handleInputChange('beneficiary_impact', e.target.value)}
            placeholder="Describe the impact on program beneficiaries..."
            required
          />
        </div>

        <div>
          <Label htmlFor="challenges">Challenges *</Label>
          <Textarea
            id="challenges"
            value={formData.challenges}
            onChange={(e) => handleInputChange('challenges', e.target.value)}
            placeholder="List challenges encountered during the reporting period..."
            required
          />
        </div>

        <div>
          <Label htmlFor="proposed_recommendations">Proposed Recommendations *</Label>
          <Textarea
            id="proposed_recommendations"
            value={formData.proposed_recommendations}
            onChange={(e) => handleInputChange('proposed_recommendations', e.target.value)}
            placeholder="Provide recommendations for program improvement..."
            required
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update Report" : "Create Report")}
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
}
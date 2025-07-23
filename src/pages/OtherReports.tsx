import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, FileText, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OtherReports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    program: "",
    reportingDate: "",
    staff: "",
    executiveSummary: "",
    beneficiaryImpact: "",
    challenges: "",
    proposedRecommendations: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const administrativePrograms = [
    "Education",
    "Kibera Early Dinner", 
    "Kawangware Lunch Hour",
    "Kipawa Sato",
    "Self-Empowerment",
    "Support Groups"
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
      const { error } = await supabase
        .from('activity_reports')
        .insert([
          {
            program: formData.program as "Education" | "Kibera Early Dinner" | "Kawangware Lunch Hour" | "Kipawa Sato" | "Self-Empowerment" | "Support Groups",
            reporting_date: formData.reportingDate,
            staff: formData.staff,
            executive_summary: formData.executiveSummary,
            beneficiary_impact: formData.beneficiaryImpact,
            challenges: formData.challenges,
            proposed_recommendations: formData.proposedRecommendations,
            created_by: user?.id
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Administrative report submitted successfully",
      });

      // Reset form
      setFormData({
        program: "",
        reportingDate: "",
        staff: "",
        executiveSummary: "",
        beneficiaryImpact: "",
        challenges: "",
        proposedRecommendations: ""
      });

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Other Reports</h1>
          <p className="text-muted-foreground">Submit administrative program reports</p>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Administrative Program Report
          </CardTitle>
          <CardDescription>
            Submit reports for Communication, Media, Chess, and Fundraising programs
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OtherReports;
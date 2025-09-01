import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface HomeVisitReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function HomeVisitReportForm({ onSuccess, onCancel }: HomeVisitReportFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    staff: "",
    visit_date: "",
    student_id: "",
    location: "",
    reason_for_visit: "",
    observation_findings: "",
    challenges_identified: "",
    recommendations: "",
  });

  // Fetch students for the dropdown
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });

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
      const { error } = await supabase
        .from('home_visit_reports')
        .insert({
          staff: formData.staff,
          visit_date: formData.visit_date,
          student_id: formData.student_id || null,
          location: formData.location as "Kibera" | "Kawangware" | "Diaspora" | "Outside Nairobi" | null || null,
          reason_for_visit: formData.reason_for_visit || null,
          observation_findings: formData.observation_findings,
          challenges_identified: formData.challenges_identified,
          recommendations: formData.recommendations,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Home visit report created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating home visit report:', error);
      toast({
        title: "Error",
        description: "Failed to create home visit report",
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
            <Label htmlFor="staff">Staff Member *</Label>
            <Input
              id="staff"
              value={formData.staff}
              onChange={(e) => handleInputChange('staff', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="visit_date">Visit Date *</Label>
            <Input
              id="visit_date"
              type="date"
              value={formData.visit_date}
              onChange={(e) => handleInputChange('visit_date', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="student_id">Student Name</Label>
            <Select value={formData.student_id} onValueChange={(value) => handleInputChange('student_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student (optional)" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Select value={formData.location} onValueChange={(value) => handleInputChange('location', value)}>
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
        </div>

        <div>
          <Label htmlFor="reason_for_visit">Reason for Visit</Label>
          <Select value={formData.reason_for_visit} onValueChange={(value) => handleInputChange('reason_for_visit', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason for visit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General Visit">General Visit</SelectItem>
              <SelectItem value="Follow-Up">Follow-Up</SelectItem>
              <SelectItem value="Emergency Visit">Emergency Visit</SelectItem>
              <SelectItem value="New Intake">New Intake</SelectItem>
              <SelectItem value="Information Required">Information Required</SelectItem>
              <SelectItem value="Donor Visit">Donor Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="observation_findings">Observation Findings *</Label>
          <Textarea
            id="observation_findings"
            value={formData.observation_findings}
            onChange={(e) => handleInputChange('observation_findings', e.target.value)}
            placeholder="Document your observations during the visit..."
            required
          />
        </div>

        <div>
          <Label htmlFor="challenges_identified">Challenges Identified *</Label>
          <Textarea
            id="challenges_identified"
            value={formData.challenges_identified}
            onChange={(e) => handleInputChange('challenges_identified', e.target.value)}
            placeholder="List any challenges or concerns identified..."
            required
          />
        </div>

        <div>
          <Label htmlFor="recommendations">Recommendations *</Label>
          <Textarea
            id="recommendations"
            value={formData.recommendations}
            onChange={(e) => handleInputChange('recommendations', e.target.value)}
            placeholder="Provide recommendations for follow-up actions..."
            required
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Report"}
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
}
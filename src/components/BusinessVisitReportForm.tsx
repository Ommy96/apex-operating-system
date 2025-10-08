import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface BusinessVisitReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function BusinessVisitReportForm({ onSuccess, onCancel, initialData }: BusinessVisitReportFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    staff: initialData?.staff || '',
    business_id: initialData?.business_id || '',
    visit_date: initialData?.visit_date || '',
    location: initialData?.location || '',
    reason_for_visit: initialData?.reason_for_visit || '',
    observation_findings: initialData?.observation_findings || '',
    challenges_identified: initialData?.challenges_identified || '',
    recommendations: initialData?.recommendations || '',
  });

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from('self_empowerment')
        .select('id, full_name, business_name')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching businesses:', error);
        toast({
          title: "Error",
          description: "Failed to load businesses",
          variant: "destructive",
        });
      } else {
        setBusinesses(data || []);
      }
    };

    fetchBusinesses();
  }, [toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reportData = {
        ...formData,
        created_by: user?.id,
      };

      let error;
      if (initialData?.id) {
        // Update existing report
        const { error: updateError } = await supabase
          .from('business_visit_reports')
          .update(reportData)
          .eq('id', initialData.id);
        error = updateError;
      } else {
        // Insert new report
        const { error: insertError } = await supabase
          .from('business_visit_reports')
          .insert([reportData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: initialData?.id 
          ? "Business visit report updated successfully" 
          : "Business visit report created successfully",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error saving business visit report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save business visit report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="staff">Staff Name *</Label>
          <Input
            id="staff"
            value={formData.staff}
            onChange={(e) => handleInputChange('staff', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_id">Business/Person *</Label>
          <Select
            value={formData.business_id}
            onValueChange={(value) => handleInputChange('business_id', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select business/person" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.full_name} {business.business_name ? `- ${business.business_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visit_date">Visit Date *</Label>
          <Input
            id="visit_date"
            type="date"
            value={formData.visit_date}
            onChange={(e) => handleInputChange('visit_date', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select
            value={formData.location}
            onValueChange={(value) => handleInputChange('location', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Kibera">Kibera</SelectItem>
              <SelectItem value="Kawangware">Kawangware</SelectItem>
              <SelectItem value="Others">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason_for_visit">Reason for Visit</Label>
        <Textarea
          id="reason_for_visit"
          value={formData.reason_for_visit}
          onChange={(e) => handleInputChange('reason_for_visit', e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observation_findings">Observation Findings *</Label>
        <Textarea
          id="observation_findings"
          value={formData.observation_findings}
          onChange={(e) => handleInputChange('observation_findings', e.target.value)}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="challenges_identified">Challenges Identified *</Label>
        <Textarea
          id="challenges_identified"
          value={formData.challenges_identified}
          onChange={(e) => handleInputChange('challenges_identified', e.target.value)}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recommendations">Recommendations *</Label>
        <Textarea
          id="recommendations"
          value={formData.recommendations}
          onChange={(e) => handleInputChange('recommendations', e.target.value)}
          rows={4}
          required
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Report' : 'Submit Report'}
        </Button>
      </div>
    </form>
  );
}

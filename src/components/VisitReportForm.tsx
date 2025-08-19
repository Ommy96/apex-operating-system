import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VisitReportFormProps {
  childId: string | undefined;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function VisitReportForm({ childId, onSuccess, onCancel }: VisitReportFormProps) {
  const [formData, setFormData] = useState({
    visit_type: '',
    visit_date: '',
    location: '',
    purpose: '',
    findings: '',
    recommendations: '',
    duration_minutes: '',
    next_visit_date: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          child_id: childId,
          visit_type: formData.visit_type,
          visit_date: formData.visit_date,
          location: formData.location,
          purpose: formData.purpose,
          findings: formData.findings,
          recommendations: formData.recommendations,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          next_visit_date: formData.next_visit_date || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Visit report added successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error adding visit report:', error);
      toast({
        title: "Error",
        description: "Failed to add visit report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="visit_type">Visit Type</Label>
          <Select value={formData.visit_type} onValueChange={(value) => handleChange('visit_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select visit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home_visit">Home Visit</SelectItem>
              <SelectItem value="school_visit">School Visit</SelectItem>
              <SelectItem value="medical_visit">Medical Visit</SelectItem>
              <SelectItem value="follow_up">Follow-up Visit</SelectItem>
              <SelectItem value="assessment">Assessment Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="visit_date">Visit Date</Label>
          <Input
            type="date"
            value={formData.visit_date}
            onChange={(e) => handleChange('visit_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="Visit location"
        />
      </div>

      <div>
        <Label htmlFor="purpose">Purpose of Visit</Label>
        <Textarea
          value={formData.purpose}
          onChange={(e) => handleChange('purpose', e.target.value)}
          placeholder="Purpose and objectives of the visit"
        />
      </div>

      <div>
        <Label htmlFor="findings">Findings</Label>
        <Textarea
          value={formData.findings}
          onChange={(e) => handleChange('findings', e.target.value)}
          placeholder="Key findings and observations"
        />
      </div>

      <div>
        <Label htmlFor="recommendations">Recommendations</Label>
        <Textarea
          value={formData.recommendations}
          onChange={(e) => handleChange('recommendations', e.target.value)}
          placeholder="Recommendations and next steps"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration_minutes">Duration (minutes)</Label>
          <Input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => handleChange('duration_minutes', e.target.value)}
            placeholder="Visit duration"
          />
        </div>

        <div>
          <Label htmlFor="next_visit_date">Next Visit Date</Label>
          <Input
            type="date"
            value={formData.next_visit_date}
            onChange={(e) => handleChange('next_visit_date', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Visit Report'}
        </Button>
      </div>
    </form>
  );
}
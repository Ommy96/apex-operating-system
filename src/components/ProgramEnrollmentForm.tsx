import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface ProgramEnrollmentFormProps {
  childId: string | undefined;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ProgramEnrollmentForm({ childId, onSuccess, onCancel }: ProgramEnrollmentFormProps) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [formData, setFormData] = useState({
    program_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Fetch programs from the programs table
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-enrollment-form', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch already enrolled program IDs to filter them out
  const { data: enrolledProgramIds = [] } = useQuery({
    queryKey: ['enrolled-programs', childId],
    queryFn: async () => {
      if (!childId) return [];
      const { data, error } = await supabase
        .from('child_programs')
        .select('program_id')
        .eq('child_id', childId)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map(ep => ep.program_id);
    },
    enabled: !!childId,
  });

  const availablePrograms = programs.filter(p => !enrolledProgramIds.includes(p.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId || !formData.program_id || !orgId) {
      toast({ title: "Error", description: !orgId ? "No organization selected" : "Please select a program", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('child_programs')
        .insert({
          child_id: childId,
          program_id: formData.program_id,
          enrollment_date: formData.enrollment_date,
          notes: formData.notes || null,
          status: 'active',
        });

      if (error) throw error;

      toast({ title: "Success", description: "Child enrolled in program successfully" });
      onSuccess();
    } catch (error) {
      console.error('Error enrolling in program:', error);
      toast({ title: "Error", description: "Failed to enroll child in program", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="program_id">Program</Label>
        <Select value={formData.program_id} onValueChange={(value) => handleChange('program_id', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a program" />
          </SelectTrigger>
          <SelectContent>
            {availablePrograms.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availablePrograms.length === 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            No available programs or child is already enrolled in all active programs.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="enrollment_date">Enrollment Date</Label>
        <Input
          type="date"
          value={formData.enrollment_date}
          onChange={(e) => handleChange('enrollment_date', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any additional notes about the enrollment"
        />
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || !formData.program_id}>
          {loading ? 'Enrolling...' : 'Enroll in Program'}
        </Button>
      </div>
    </form>
  );
}

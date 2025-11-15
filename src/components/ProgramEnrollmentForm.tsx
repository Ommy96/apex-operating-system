import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';

interface ProgramEnrollmentFormProps {
  childId: string | undefined;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ProgramEnrollmentForm({ childId, onSuccess, onCancel }: ProgramEnrollmentFormProps) {
  const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    program_name: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailablePrograms();
  }, [childId]);

  const fetchAvailablePrograms = async () => {
    try {
      // Get all program types from the enum
      const allPrograms = Constants.public.Enums.program_type;

      // Get programs child is already enrolled in
      const { data: enrolledPrograms, error: enrolledError } = await supabase
        .from('child_programs')
        .select('program_id, programs(name)')
        .eq('child_id', childId)
        .eq('status', 'active');

      if (enrolledError) throw enrolledError;

      // Filter out already enrolled programs
      const enrolledProgramNames = enrolledPrograms?.map(ep => (ep.programs as any)?.name) || [];
      const available = allPrograms.filter(program => !enrolledProgramNames.includes(program));
      
      setAvailablePrograms(available);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: "Error",
        description: "Failed to load available programs",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId || !formData.program_name) return;

    setLoading(true);
    try {
      // First, find or create the program in the programs table
      const { data: existingProgram, error: searchError } = await supabase
        .from('programs')
        .select('id')
        .eq('name', formData.program_name)
        .maybeSingle();

      if (searchError) throw searchError;

      let programId = existingProgram?.id;

      // If program doesn't exist, create it
      if (!programId) {
        const { data: newProgram, error: createError } = await supabase
          .from('programs')
          .insert({
            name: formData.program_name,
            is_active: true
          })
          .select('id')
          .single();

        if (createError) throw createError;
        programId = newProgram.id;
      }

      // Now enroll the child in the program
      const { error } = await supabase
        .from('child_programs')
        .insert({
          child_id: childId,
          program_id: programId,
          enrollment_date: formData.enrollment_date,
          notes: formData.notes || null,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Child enrolled in program successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error enrolling in program:', error);
      toast({
        title: "Error",
        description: "Failed to enroll child in program",
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
      <div>
        <Label htmlFor="program_name">Program</Label>
        <Select value={formData.program_name} onValueChange={(value) => handleChange('program_name', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a program" />
          </SelectTrigger>
          <SelectContent>
            {availablePrograms.map((program) => (
              <SelectItem key={program} value={program}>
                {program}
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
        <Button type="submit" disabled={loading || !formData.program_name}>
          {loading ? 'Enrolling...' : 'Enroll in Program'}
        </Button>
      </div>
    </form>
  );
}
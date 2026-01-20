import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

const visitReportSchema = z.object({
  visit_type: z.string().min(1, "Please select a visit type"),
  visit_date: z.string().min(1, "Visit date is required"),
  location: z.string().max(255).optional(),
  purpose: z.string().max(1000).optional(),
  findings: z.string().max(5000).optional(),
  recommendations: z.string().max(5000).optional(),
  duration_minutes: z.string().optional(),
  next_visit_date: z.string().optional()
});

interface VisitReportFormProps {
  childId: string | undefined;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function VisitReportForm({ childId, onSuccess, onCancel }: VisitReportFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const form = useForm<z.infer<typeof visitReportSchema>>({
    resolver: zodResolver(visitReportSchema),
    defaultValues: {
      visit_type: '',
      visit_date: '',
      location: '',
      purpose: '',
      findings: '',
      recommendations: '',
      duration_minutes: '',
      next_visit_date: ''
    },
  });

  const handleSubmit = async (values: z.infer<typeof visitReportSchema>) => {
    if (!childId) return;

    if (!currentOrganization?.organization_id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          child_id: childId,
          ...values,
          duration_minutes: values.duration_minutes ? parseInt(values.duration_minutes) : null,
          next_visit_date: values.next_visit_date || null,
          organization_id: currentOrganization.organization_id,
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
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="visit_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visit Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visit type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="home_visit">Home Visit</SelectItem>
                    <SelectItem value="school_visit">School Visit</SelectItem>
                    <SelectItem value="medical_visit">Medical Visit</SelectItem>
                    <SelectItem value="follow_up">Follow-up Visit</SelectItem>
                    <SelectItem value="assessment">Assessment Visit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visit_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visit Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Visit location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose of Visit</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Purpose and objectives of the visit" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="findings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Findings</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Key findings and observations" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recommendations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recommendations</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Recommendations and next steps" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} placeholder="Visit duration" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="next_visit_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Visit Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Adding...' : 'Add Visit Report'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
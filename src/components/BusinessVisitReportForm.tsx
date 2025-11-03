import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const businessVisitSchema = z.object({
  staff: z.string().trim().min(1, "Staff name is required").max(255),
  business_id: z.string().min(1, "Please select a business/person"),
  visit_date: z.string().min(1, "Visit date is required"),
  location: z.string().optional(),
  reason_for_visit: z.string().max(1000).optional(),
  observation_findings: z.string().trim().min(10, "Observation findings must be at least 10 characters").max(5000),
  challenges_identified: z.string().trim().min(10, "Challenges must be at least 10 characters").max(5000),
  recommendations: z.string().trim().min(10, "Recommendations must be at least 10 characters").max(5000),
});

interface BusinessVisitReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function BusinessVisitReportForm({ onSuccess, onCancel, initialData }: BusinessVisitReportFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  
  const form = useForm<z.infer<typeof businessVisitSchema>>({
    resolver: zodResolver(businessVisitSchema),
    defaultValues: {
      staff: initialData?.staff || '',
      business_id: initialData?.business_id || '',
      visit_date: initialData?.visit_date || '',
      location: initialData?.location || '',
      reason_for_visit: initialData?.reason_for_visit || '',
      observation_findings: initialData?.observation_findings || '',
      challenges_identified: initialData?.challenges_identified || '',
      recommendations: initialData?.recommendations || '',
    },
  });

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from('self_empowerment')
        .select('id, full_name, business_name, is_active')
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

  const handleSubmit = async (values: z.infer<typeof businessVisitSchema>) => {
    try {
      const reportData = {
        ...values,
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
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="staff"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter staff name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="business_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business/Person *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business/person" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.full_name} {business.business_name ? `- ${business.business_name}` : ''}
                      </SelectItem>
                    ))}
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

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Kibera">Kibera</SelectItem>
                    <SelectItem value="Kawangware">Kawangware</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reason_for_visit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Visit</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} placeholder="Describe the reason for this visit" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observation_findings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observation Findings *</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="Document your observations" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="challenges_identified"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Challenges Identified *</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="List challenges encountered" />
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
              <FormLabel>Recommendations *</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="Provide recommendations" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : initialData?.id ? 'Update Report' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

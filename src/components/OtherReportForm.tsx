import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send } from "lucide-react";

const otherReportSchema = z.object({
  program: z.string().trim().min(1, "Program is required").max(255),
  reportingDate: z.string().min(1, "Reporting date is required"),
  staff: z.string().trim().min(1, "Staff name is required").max(500),
  executiveSummary: z.string().trim().min(10, "Executive summary must be at least 10 characters").max(5000),
  beneficiaryImpact: z.string().trim().max(5000).optional().or(z.literal('')),
  challenges: z.string().trim().max(5000).optional().or(z.literal('')),
  proposedRecommendations: z.string().trim().max(5000).optional().or(z.literal('')),
});

interface OtherReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingReport?: any;
}

export const OtherReportForm = ({ onSuccess, onCancel, editingReport }: OtherReportFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof otherReportSchema>>({
    resolver: zodResolver(otherReportSchema),
    defaultValues: {
      program: editingReport?.program || "",
      reportingDate: editingReport?.reporting_date || "",
      staff: editingReport?.staff || "",
      executiveSummary: editingReport?.executive_summary || "",
      beneficiaryImpact: editingReport?.beneficiary_impact || "",
      challenges: editingReport?.challenges || "",
      proposedRecommendations: editingReport?.proposed_recommendations || "",
    },
  });

  // Predefined programs for the dropdown (matching database enum)
  const programs = [
    "Education",
    "Kibera Early Dinner",
    "Kawangware Lunch Hour", 
    "Kipawa Sato",
    "Self-Empowerment",
    "Support Groups",
    "Communication",
    "Chess",
    "Fundraising",
    "Admin",
    "Content Creation"
  ];

  const handleSubmit = async (values: z.infer<typeof otherReportSchema>) => {
    try {
      const reportData = {
        program: values.program as any,
        reporting_date: values.reportingDate,
        staff: values.staff,
        executive_summary: values.executiveSummary,
        beneficiary_impact: values.beneficiaryImpact || null,
        challenges: values.challenges || null,
        proposed_recommendations: values.proposedRecommendations || null,
        created_by: user?.id,
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
    }
  };

  return (
    <ScrollArea className="max-h-[80vh] pr-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="program"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter program name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reportingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reporting Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="staff"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Staff/Team Members *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter staff names involved in this program" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="executiveSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Executive Summary *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Provide a comprehensive overview of the program activities and outcomes"
                      className="min-h-32"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="beneficiaryImpact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiary Impact</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the impact on beneficiaries and community"
                      className="min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="challenges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Challenges Encountered</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe any challenges or obstacles faced during implementation"
                      className="min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proposedRecommendations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Recommendations</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Provide recommendations for future improvement and sustainability"
                      className="min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex items-center gap-2"
            >
              {form.formState.isSubmitting ? (
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
      </Form>
    </ScrollArea>
  );
};